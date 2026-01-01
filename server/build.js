import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Copy shared directory if it doesn't exist
const sharedSrc = join(__dirname, '..', 'shared');
const sharedDest = join(__dirname, 'shared');

if (!existsSync(sharedDest) && existsSync(sharedSrc)) {
  console.log('Copying shared directory...');
  mkdirSync(sharedDest, { recursive: true });
  
  // Copy types directory
  const typesSrc = join(sharedSrc, 'types');
  const typesDest = join(sharedDest, 'types');
  if (existsSync(typesSrc)) {
    cpSync(typesSrc, typesDest, { recursive: true });
    console.log('Copied types directory');
  }
  
  // Copy utils directory
  const utilsSrc = join(sharedSrc, 'utils');
  const utilsDest = join(sharedDest, 'utils');
  if (existsSync(utilsSrc)) {
    cpSync(utilsSrc, utilsDest, { recursive: true });
    console.log('Copied utils directory');
  }
  
  console.log('Shared directory copied successfully');
} else if (!existsSync(sharedSrc)) {
  console.warn('Warning: Shared directory not found at', sharedSrc);
}

