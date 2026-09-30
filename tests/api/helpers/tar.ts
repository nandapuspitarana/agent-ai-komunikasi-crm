import zlib from 'node:zlib';

export interface TarEntry {
  name: string;
  data: Buffer;
}

/**
 * Independent ustar reader used to verify the archives we build: checks every
 * header checksum and returns the files. Deliberately not sharing code with the
 * writer in scripts/build-sdk-package.js.
 */
export function readTarGz(archive: Buffer): TarEntry[] {
  const tar = zlib.gunzipSync(archive);
  const entries: TarEntry[] = [];
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break; // end-of-archive

    const str = (from: number, len: number) => header.toString('utf8', from, from + len).replace(/\0[\s\S]*$/, '');
    const name = str(0, 100);
    const prefix = str(345, 155);
    const size = parseInt(str(124, 12).trim() || '0', 8);
    const stored = parseInt(str(148, 8).trim(), 8);

    let sum = 0;
    for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 0x20 : header[i];
    if (sum !== stored) throw new Error(`bad tar checksum for ${name}`);
    if (str(257, 5) !== 'ustar') throw new Error(`missing ustar magic for ${name}`);

    const start = offset + 512;
    entries.push({ name: prefix ? `${prefix}/${name}` : name, data: Buffer.from(tar.subarray(start, start + size)) });
    offset = start + Math.ceil(size / 512) * 512;
  }
  return entries;
}
