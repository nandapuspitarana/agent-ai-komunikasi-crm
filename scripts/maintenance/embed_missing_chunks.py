"""
embed_missing_chunks.py

Fills in embeddings for knowledge base chunks that were stored without one.

scripts/docker/sync-knowledge.js loads the CS knowledge base into public.crm_document_chunks and
public.documents with embedding = NULL. The AI proxy's RAG search (match_document_chunks) skips rows
without an embedding, so until this runs the assistant answers "I don't have enough information" to
every knowledge base question.

It runs INSIDE the ai-agent-proxy container, so it uses the proxy's own embedding model, dimensions,
API key and Supabase connection (the same ones RAG search uses):

    docker cp scripts/maintenance/embed_missing_chunks.py ai-agent-proxy:/tmp/
    docker exec ai-agent-proxy python /tmp/embed_missing_chunks.py --flow-id <flow id> --dry-run
    docker exec ai-agent-proxy python /tmp/embed_missing_chunks.py --flow-id <flow id>

--flow-id limits it to one flow's chunks (metadata.flow_id); without it every chunk missing an
embedding is filled. Run it again after a start-up sync that reloaded the knowledge base (the log
says "knowledge base synced: N documents"). It only touches rows whose embedding is NULL, so it is
safe to repeat.
"""
import argparse
import asyncio
import sys

sys.path.insert(0, '/app')

from data.supabase_client import get_supabase  # noqa: E402
from rag.embedder import Embedder  # noqa: E402

CHUNKS = 'crm_document_chunks'
LEGACY = 'documents'
PAGE = 500


async def missing_chunks(db, flow_id):
    rows, start = [], 0
    while True:
        q = db.table(CHUNKS).select('id, document_id, chunk_index, content').is_('embedding', 'null')
        if flow_id:
            q = q.eq('metadata->>flow_id', flow_id)
        res = await q.order('id').range(start, start + PAGE - 1).execute()
        rows += res.data
        if len(res.data) < PAGE:
            return rows
        start += PAGE


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--flow-id', help='only chunks of this flow (metadata.flow_id)')
    ap.add_argument('--batch', type=int, default=100, help='texts per embedding request')
    ap.add_argument('--dry-run', action='store_true', help='count what would be embedded, change nothing')
    args = ap.parse_args()

    db = await get_supabase()
    rows = [r for r in await missing_chunks(db, args.flow_id) if (r.get('content') or '').strip()]
    print(f'chunks without an embedding: {len(rows)}' + (f' (flow {args.flow_id})' if args.flow_id else ''))
    if args.dry_run or not rows:
        return

    embedder = Embedder()
    done = legacy = 0
    for i in range(0, len(rows), args.batch):
        batch = rows[i:i + args.batch]
        vectors = await embedder.embed_batch([r['content'] for r in batch])
        if len(vectors) != len(batch):
            raise SystemExit(f'embedding count mismatch: {len(vectors)} for {len(batch)} texts')
        for row, vec in zip(batch, vectors):
            await db.table(CHUNKS).update({'embedding': vec}).eq('id', row['id']).execute()
            # The same chunk in the legacy table (written by sync-knowledge.js with the same metadata)
            res = await (db.table(LEGACY).update({'embedding': vec})
                         .eq('metadata->>document_id', str(row['document_id']))
                         .eq('metadata->>chunk_index', str(row['chunk_index']))
                         .is_('embedding', 'null').execute())
            legacy += len(res.data or [])
        done += len(batch)
        print(f'embedded {done}/{len(rows)}', flush=True)

    left = await missing_chunks(db, args.flow_id)
    print(f'done: {done} chunks embedded, {legacy} legacy rows updated, {len(left)} still without an embedding')


if __name__ == '__main__':
    asyncio.run(main())
