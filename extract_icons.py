#!/usr/bin/env python3
"""
Script to extract individual character icons from the AI characters sprite sheet.
Place the source image in the project root as 'ai-characters.png' or specify the path.
"""

from PIL import Image
import os
import sys

# Character names in order (left to right, top to bottom)
# Row 1: Wall-E, R2-D2, Herbie
# Row 2: C-3PO, Herbie (duplicate), EVE
# Row 3: Baymax, 7 of 9, T-800, HAL 9000, Ben 10
CHARACTER_NAMES = [
    'Wall-E', 'R2-D2', 'Herbie',
    'C-3PO', 'Herbie', 'EVE',
    'Baymax', '7 of 9', 'T-800', 'HAL 9000', 'Ben 10'
]

# Unique character names (removing duplicate Herbie)
UNIQUE_CHARACTERS = [
    'Wall-E', 'R2-D2', 'Herbie', 'C-3PO', 'EVE',
    'Baymax', '7 of 9', 'T-800', 'HAL 9000', 'Ben 10'
]

def extract_icons(image_path, output_dir='client/src/assets/ai-icons'):
    """
    Extract individual icons from the sprite sheet.
    This function will analyze the image and extract each circular icon.
    """
    # Open the image
    try:
        img = Image.open(image_path)
    except FileNotFoundError:
        print(f"Error: Image file '{image_path}' not found.")
        print("Please place the AI characters image in the project root as 'ai-characters.png'")
        sys.exit(1)
    except Exception as e:
        print(f"Error opening image: {e}")
        sys.exit(1)
    
    width, height = img.size
    print(f"Image size: {width}x{height}")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Analyze the grid layout
    # Based on the description: 3 rows, with 3, 3, and 5 icons respectively
    # We need to detect the grid automatically or use estimated positions
    
    # Estimate grid dimensions (will need to be adjusted based on actual image)
    # Assuming roughly equal spacing and circular icons
    rows = 3
    cols_row1 = 3
    cols_row2 = 3
    cols_row3 = 5
    
    # Calculate approximate icon size and spacing
    # This is a rough estimate - we'll refine based on the actual image
    estimated_icon_size = min(width // 6, height // 4)  # Rough estimate
    icon_size = estimated_icon_size
    
    # Calculate positions for each icon
    # We'll need to detect the actual positions, but for now use estimates
    icons_extracted = {}
    
    # Row 1 (3 icons)
    row1_y = height // 6  # Approximate top row position
    row1_spacing = width // 4
    
    # Row 2 (3 icons)
    row2_y = height // 2  # Middle row
    row2_spacing = width // 4
    
    # Row 3 (5 icons)
    row3_y = height * 5 // 6  # Bottom row
    row3_spacing = width // 6
    
    # Extract Row 1 icons
    for i, name in enumerate(['Wall-E', 'R2-D2', 'Herbie']):
        x = row1_spacing * (i + 1) - icon_size // 2
        y = row1_y - icon_size // 2
        if name not in icons_extracted:
            crop_box = (max(0, x), max(0, y), min(width, x + icon_size), min(height, y + icon_size))
            icon = img.crop(crop_box)
            filename = f"{name.replace(' ', '-').replace('/', '-')}.png"
            filepath = os.path.join(output_dir, filename)
            icon.save(filepath)
            icons_extracted[name] = filepath
            print(f"Extracted: {name} -> {filepath}")
    
    # Extract Row 2 icons (skip duplicate Herbie)
    row2_names = ['C-3PO', None, 'EVE']  # Skip Herbie duplicate
    for i, name in enumerate(['C-3PO', 'Herbie', 'EVE']):
        if name == 'Herbie' and 'Herbie' in icons_extracted:
            continue  # Skip duplicate
        x = row2_spacing * (i + 1) - icon_size // 2
        y = row2_y - icon_size // 2
        if name not in icons_extracted:
            crop_box = (max(0, x), max(0, y), min(width, x + icon_size), min(height, y + icon_size))
            icon = img.crop(crop_box)
            filename = f"{name.replace(' ', '-').replace('/', '-')}.png"
            filepath = os.path.join(output_dir, filename)
            icon.save(filepath)
            icons_extracted[name] = filepath
            print(f"Extracted: {name} -> {filepath}")
    
    # Extract Row 3 icons
    for i, name in enumerate(['Baymax', '7 of 9', 'T-800', 'HAL 9000', 'Ben 10']):
        x = row3_spacing * (i + 1) - icon_size // 2
        y = row3_y - icon_size // 2
        crop_box = (max(0, x), max(0, y), min(width, x + icon_size), min(height, y + icon_size))
        icon = img.crop(crop_box)
        filename = f"{name.replace(' ', '-').replace('/', '-')}.png"
        filepath = os.path.join(output_dir, filename)
        icon.save(filepath)
        icons_extracted[name] = filepath
        print(f"Extracted: {name} -> {filepath}")
    
    print(f"\nExtracted {len(icons_extracted)} unique icons to {output_dir}")
    return icons_extracted

if __name__ == '__main__':
    # Try to find the image file
    possible_paths = [
        'ai-characters.png',
        'ai-characters.jpg',
        'client/src/assets/ai-characters.png',
        'client/src/assets/ai-characters.jpg',
    ]
    
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        image_path = None
        for path in possible_paths:
            if os.path.exists(path):
                image_path = path
                break
    
    if not image_path:
        print("Error: Could not find the AI characters image.")
        print("Please either:")
        print("  1. Place the image in the project root as 'ai-characters.png'")
        print("  2. Or run: python3 extract_icons.py <path-to-image>")
        sys.exit(1)
    
    extract_icons(image_path)

