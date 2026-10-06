const fs = require('fs');
const path = require('path');

const kbDir = path.join(__dirname, '../../userjourney/knowledge base');
const files = fs.readdirSync(kbDir).filter(f => fs.statSync(path.join(kbDir, f)).isFile());

console.log(`Found ${files.length} knowledge base files.`);

function getCategory(filename) {
  if (filename.startsWith('L1-faq-')) return 'FAQ';
  if (filename.startsWith('L1-playbook-')) return 'Playbook';
  if (filename.startsWith('L1-workflow-')) return 'Workflow';
  if (filename.startsWith('L2-centre-')) return 'Centres';
  if (filename.startsWith('L2-policy-')) return 'Policies';
  if (filename.startsWith('L2-product-')) return 'Products';
  if (filename.startsWith('L2-region-')) return 'Regions';
  if (filename.startsWith('L2-services-')) return 'Services';
  return 'Knowledge Base';
}

function chunkMarkdown(content, maxChars = 1200) {
  // Split on markdown H2 or H3
  const sections = content.split(/\n(?=##?#?\s)/);
  const chunks = [];

  for (const sec of sections) {
    const trimmed = sec.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      chunks.push(trimmed);
    } else {
      // Split into sub-chunks by paragraphs
      const paras = trimmed.split(/\n\n+/);
      let cur = '';
      for (const p of paras) {
        if ((cur + '\n\n' + p).length <= maxChars) {
          cur = cur ? cur + '\n\n' + p : p;
        } else {
          if (cur) chunks.push(cur);
          if (p.length > maxChars) {
            // Cut by character length
            for (let i = 0; i < p.length; i += maxChars - 100) {
              chunks.push(p.slice(i, i + maxChars));
            }
            cur = '';
          } else {
            cur = p;
          }
        }
      }
      if (cur) chunks.push(cur);
    }
  }

  return chunks.length > 0 ? chunks : [content.trim()];
}

let totalChunks = 0;
const report = [];

for (const file of files) {
  const filePath = path.join(kbDir, file);
  const ext = path.extname(file).toLowerCase();
  const cat = getCategory(file);

  if (ext === '.md' || ext === '.xml') {
    const content = fs.readFileSync(filePath, 'utf8');
    const chunks = chunkMarkdown(content);
    totalChunks += chunks.length;
    report.push({ file, cat, size: content.length, chunks: chunks.length });
  } else {
    report.push({ file, cat, size: fs.statSync(filePath).size, chunks: 'binary/excel' });
  }
}

console.log('Sample report:');
console.table(report.slice(0, 15));
console.log(`Total text files processed: ${report.filter(r => typeof r.chunks === 'number').length}`);
console.log(`Total text chunks to create: ${totalChunks}`);
