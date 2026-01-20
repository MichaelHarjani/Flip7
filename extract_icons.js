/**
 * Node.js script to extract icons using sharp (if available) or canvas
 * Run: node extract_icons.js <image-path> [icon-size]
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Character layout
const CHARACTER_LAYOUT = [
  ['Wall-E', 'R2-D2', 'Herbie'],
  ['C-3PO', 'Herbie', 'EVE'],
  ['Baymax', '7 of 9', 'T-800', 'HAL 9000', 'Ben 10']
];

function sanitizeFilename(name) {
  return name.replace(/\s+/g, '-').replace(/\//g, '-').replace(/ of /g, '-of-');
}

async function extractWithSharp(imagePath, outputDir) {
  try {
    const img = sharp(imagePath);
    const metadata = await img.metadata();
    
    console.log(`Image size: ${metadata.width}x${metadata.height}`);
    
    const width = metadata.width;
    const height = metadata.height;
    
    // Estimate icon size - icons appear to be roughly circular and take up about 1/5 to 1/6 of the width
    // Based on the image description, icons are circular with glows
    const estimatedIconSize = Math.floor(width / 5.5);
    const iconSize = estimatedIconSize;
    
    console.log(`Using icon size: ${iconSize}x${iconSize}`);
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const iconsExtracted = {};
    
    // Row 1: 3 icons centered
    // Icons are roughly centered vertically in their row, with text below
    // Based on 3 rows, each row takes about 1/3 of height, but icons are in upper portion
    const row1Y = Math.floor(height * 0.15); // Top row, icons near top
    const row1StartX = Math.floor(width * 0.08); // Left margin
    const row1EndX = width - row1StartX; // Right margin
    const row1Spacing = Math.floor((row1EndX - row1StartX) / (CHARACTER_LAYOUT[0].length + 1));
    
    for (let i = 0; i < CHARACTER_LAYOUT[0].length; i++) {
      const name = CHARACTER_LAYOUT[0][i];
      if (!iconsExtracted[name]) {
        const centerX = row1StartX + row1Spacing * (i + 1);
        const centerY = row1Y;
        let left = Math.floor(centerX - iconSize / 2);
        let top = Math.floor(centerY - iconSize / 2);
        
        // Clamp to image bounds
        left = Math.max(0, left);
        top = Math.max(0, top);
        
        // Calculate actual extract dimensions (ensure we don't go outside bounds)
        const extractWidth = Math.min(iconSize, width - left);
        const extractHeight = Math.min(iconSize, height - top);
        
        // Validate extraction area
        if (extractWidth <= 0 || extractHeight <= 0 || left + extractWidth > width || top + extractHeight > height) {
          console.error(`⚠ Skipping ${name}: Invalid extraction area (left: ${left}, top: ${top}, width: ${extractWidth}, height: ${extractHeight}, image: ${width}x${height})`);
          continue;
        }
        
        const filename = `${sanitizeFilename(name)}.png`;
        const filepath = path.join(outputDir, filename);
        
        // Create a fresh instance for each extraction to avoid issues
        const extractImg = sharp(imagePath);
        await extractImg
          .extract({
            left: left,
            top: top,
            width: extractWidth,
            height: extractHeight
          })
          .toFile(filepath);
        
        iconsExtracted[name] = filepath;
        console.log(`✓ Extracted: ${name} -> ${filename} (${left}, ${top}, ${extractWidth}x${extractHeight})`);
      }
    }
    
    // Row 2 (skip duplicate Herbie): 3 icons
    const row2Y = Math.floor(height * 0.48); // Middle row
    const row2StartX = Math.floor(width * 0.08);
    const row2EndX = width - row2StartX;
    const row2Spacing = Math.floor((row2EndX - row2StartX) / (CHARACTER_LAYOUT[1].length + 1));
    
    for (let i = 0; i < CHARACTER_LAYOUT[1].length; i++) {
      const name = CHARACTER_LAYOUT[1][i];
      if (name === 'Herbie' && iconsExtracted['Herbie']) continue;
      if (!iconsExtracted[name]) {
        const centerX = row2StartX + row2Spacing * (i + 1);
        const centerY = row2Y;
        const left = Math.max(0, centerX - Math.floor(iconSize / 2));
        const top = Math.max(0, centerY - Math.floor(iconSize / 2));
        const extractWidth = Math.min(iconSize, width - left);
        const extractHeight = Math.min(iconSize, height - top);
        
        if (extractWidth <= 0 || extractHeight <= 0 || left >= width || top >= height) {
          console.error(`⚠ Skipping ${name}: Invalid extraction area`);
          continue;
        }
        
        const filename = `${sanitizeFilename(name)}.png`;
        const filepath = path.join(outputDir, filename);
        
        // Create a fresh instance for each extraction
        const extractImg = sharp(imagePath);
        await extractImg
          .extract({
            left: left,
            top: top,
            width: extractWidth,
            height: extractHeight
          })
          .toFile(filepath);
        
        iconsExtracted[name] = filepath;
        console.log(`✓ Extracted: ${name} -> ${filename} (${left}, ${top}, ${extractWidth}x${extractHeight})`);
      }
    }
    
    // Row 3: 5 icons (more spread out)
    const row3Y = Math.floor(height * 0.72); // Bottom row (adjusted up a bit)
    const row3StartX = Math.floor(width * 0.08); // Left margin
    const row3EndX = width - row3StartX; // Right margin
    const row3Spacing = Math.floor((row3EndX - row3StartX) / (CHARACTER_LAYOUT[2].length + 1));
    
    for (let i = 0; i < CHARACTER_LAYOUT[2].length; i++) {
      const name = CHARACTER_LAYOUT[2][i];
      const centerX = row3StartX + row3Spacing * (i + 1);
      const centerY = row3Y;
      let left = Math.floor(centerX - iconSize / 2);
      let top = Math.floor(centerY - iconSize / 2);
      
      // Clamp to image bounds
      left = Math.max(0, left);
      top = Math.max(0, top);
      
      // Calculate actual extract dimensions (ensure we don't go outside bounds)
      const extractWidth = Math.min(iconSize, width - left);
      const extractHeight = Math.min(iconSize, height - top);
      
      // Validate extraction area
      if (extractWidth <= 0 || extractHeight <= 0 || left + extractWidth > width || top + extractHeight > height) {
        console.error(`⚠ Skipping ${name}: Invalid extraction area (left: ${left}, top: ${top}, width: ${extractWidth}, height: ${extractHeight}, image: ${width}x${height})`);
        continue;
      }
      
      const filename = `${sanitizeFilename(name)}.png`;
      const filepath = path.join(outputDir, filename);
      
      // Create a fresh instance for each extraction
      const extractImg = sharp(imagePath);
      await extractImg
        .extract({
          left: left,
          top: top,
          width: extractWidth,
          height: extractHeight
        })
        .toFile(filepath);
      
      iconsExtracted[name] = filepath;
      console.log(`✓ Extracted: ${name} -> ${filename} (${left}, ${top}, ${extractWidth}x${extractHeight})`);
    }
    
    console.log(`\n✅ Successfully extracted ${Object.keys(iconsExtracted).length} unique icons to ${outputDir}/`);
    return iconsExtracted;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('Error: sharp module not found.');
      console.error('Install it with: npm install sharp');
      return null;
    }
    throw error;
  }
}

// Main
const imagePath = process.argv[2] || 'ai-characters.png';
const outputDir = 'client/public/assets/ai-icons';

if (!fs.existsSync(imagePath)) {
  console.error(`Error: Image file '${imagePath}' not found.`);
  console.error('Please place the AI characters image in the project root as "ai-characters.png"');
  console.error('Or run: node extract_icons.js <path-to-image>');
  process.exit(1);
}

extractWithSharp(imagePath, outputDir)
  .then(() => {
    console.log('Done!');
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });

