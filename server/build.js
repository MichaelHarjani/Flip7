import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Copy shared directory into src/shared so TypeScript can find it
const sharedSrc = join(__dirname, '..', 'shared');
const sharedDest = join(__dirname, 'src', 'shared');

if (existsSync(sharedSrc)) {
  console.log('Copying shared directory to src/shared...');
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
} else {
  console.warn('Warning: Shared directory not found at', sharedSrc);
  // Check if it's already copied
  if (!existsSync(sharedDest)) {
    console.error('Error: Shared directory not found and not already copied');
    process.exit(1);
  }
}

