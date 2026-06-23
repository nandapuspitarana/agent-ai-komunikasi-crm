const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
let count = 0;

for (const file of files) {
    if (file === './src/lib/prisma.ts') continue; // Skip the singleton itself
    
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('new PrismaClient()')) {
        // Remove the import line
        content = content.replace(/import\s+{\s*PrismaClient\s*}\s+from\s+['"]@prisma\/client['"];?\r?\n/g, '');
        // Replace instantiation with import
        content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);?/g, "import { prisma } from '@/lib/prisma';");
        
        fs.writeFileSync(file, content);
        count++;
    }
}

console.log(`Updated ${count} files.`);
