# AI Character Icons Extraction Guide

This guide explains how to extract individual character icons from the AI characters sprite sheet image.

## Prerequisites

- Node.js and npm installed
- The AI characters sprite sheet image file

## Step 1: Place the Image File

Place your AI characters image file in the project root directory with one of these names:
- `ai-characters.png`
- `ai-characters.jpg`
- `ai-characters.jpeg`

Or specify the path when running the extraction script.

## Step 2: Extract the Icons

Run the Node.js extraction script:

```bash
node extract_icons.js [path-to-image]
```

For example:
```bash
node extract_icons.js ai-characters.png
```

The script will:
1. Analyze the image dimensions
2. Detect the grid layout (3 rows: 3, 3, and 5 icons)
3. Extract each unique character icon
4. Save them to `client/public/assets/ai-icons/`

## Step 3: Verify Extraction

After extraction, you should have these files in `client/public/assets/ai-icons/`:
- `Wall-E.png`
- `R2-D2.png`
- `Herbie.png`
- `C-3PO.png`
- `EVE.png`
- `Baymax.png`
- `7-of-9.png`
- `T-800.png`
- `HAL-9000.png`
- `Ben-10.png`

## Troubleshooting

If the icons are not extracted correctly:

1. **Check icon size**: The script estimates icon size automatically. If icons are cropped incorrectly, you can manually specify the size:
   ```bash
   # First, check the actual icon size in your image
   # Then run with a specific size (e.g., 200x200 pixels)
   node extract_icons.js ai-characters.png 200
   ```

2. **Adjust grid positions**: If the grid detection is off, you may need to modify the extraction coordinates in `extract_icons.js`.

3. **Manual extraction**: You can also use image editing software to manually crop each icon and save them with the filenames listed above.

## Alternative: Python Script

If you prefer Python, you can use the Python extraction script:

```bash
# First install Pillow in a virtual environment
python3 -m venv venv
source venv/bin/activate
pip install Pillow

# Then run the extraction
python3 extract_icons_advanced.py ai-characters.png
```

## After Extraction

Once the icons are extracted, the game will automatically use them for AI players. The icons will appear next to each AI player's name in the game interface.

