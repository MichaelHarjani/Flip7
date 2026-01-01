import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function updateImportsInFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Replace ../../../shared with ../shared (since shared is now in src/shared)
  content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/shared\//g, "from '../shared/");
  
  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated imports in ${filePath}`);
    return true;
  }
  return false;
}

function processDirectory(dir) {
  const entries = readdirSync(dir);
  let updated = 0;
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist' && entry !== 'shared') {
      updated += processDirectory(fullPath);
    } else if (stat.isFile() && entry.endsWith('.ts')) {
      if (updateImportsInFile(fullPath)) {
        updated++;
      }
    }
  }
  
  return updated;
}

const srcDir = join(__dirname, 'src');
console.log('Updating import paths in source files...');
const count = processDirectory(srcDir);
console.log(`Updated ${count} file(s)`);

