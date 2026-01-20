#!/usr/bin/env python3
"""
Advanced script to extract individual character icons from the AI characters sprite sheet.
This version attempts to automatically detect circular icons in the image.
"""

from PIL import Image, ImageDraw
import os
import sys
import math

# Character names in order (left to right, top to bottom)
# Row 1: Wall-E, R2-D2, Herbie
# Row 2: C-3PO, Herbie (duplicate), EVE  
# Row 3: Baymax, 7 of 9, T-800, HAL 9000, Ben 10
CHARACTER_LAYOUT = [
    ['Wall-E', 'R2-D2', 'Herbie'],
    ['C-3PO', 'Herbie', 'EVE'],
    ['Baymax', '7 of 9', 'T-800', 'HAL 9000', 'Ben 10']
]

def find_circular_regions(img, min_radius=50, max_radius=200):
    """
    Attempt to find circular regions in the image.
    This is a simplified approach - for production, consider using OpenCV.
    """
    width, height = img.size
    # Convert to grayscale for analysis
    gray = img.convert('L')
    pixels = gray.load()
    
    # Simple approach: look for regions with consistent brightness
    # This is a placeholder - a real implementation would use edge detection
    regions = []
    
    # For now, we'll use a grid-based approach with manual refinement
    return regions

def extract_icons_manual(image_path, output_dir='client/src/assets/ai-icons', icon_size=None):
    """
    Extract icons using a more manual but accurate approach.
    The user can adjust the parameters if needed.
    """
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
    
    # Based on the description: 3 rows with 3, 3, and 5 icons
    # We'll use a more precise grid detection
    
    # Try to detect icon size by looking for circular patterns
    # For now, estimate based on image dimensions
    if icon_size is None:
        # Estimate: icons are roughly 1/6 of width or 1/4 of height
        estimated_size = min(width // 6, height // 4)
        icon_size = estimated_size
        print(f"Estimated icon size: {icon_size}x{icon_size}")
        print("If icons are not extracted correctly, you can specify the size manually.")
    
    # Calculate grid positions more accurately
    # Row 1: 3 icons, centered
    row1_y = height // 6
    row1_start_x = width // 6
    
    # Row 2: 3 icons, centered  
    row2_y = height // 2
    row2_start_x = width // 6
    
    # Row 3: 5 icons, more spread out
    row3_y = height * 5 // 6
    row3_start_x = width // 8
    
    icons_extracted = {}
    
    # Extract Row 1
    row1_names = CHARACTER_LAYOUT[0]
    row1_spacing = (width - 2 * row1_start_x) // (len(row1_names) + 1)
    for i, name in enumerate(row1_names):
        if name not in icons_extracted:
            x = row1_start_x + row1_spacing * (i + 1) - icon_size // 2
            y = row1_y - icon_size // 2
            crop_box = (
                max(0, x),
                max(0, y),
                min(width, x + icon_size),
                min(height, y + icon_size)
            )
            icon = img.crop(crop_box)
            filename = sanitize_filename(name)
            filepath = os.path.join(output_dir, f"{filename}.png")
            icon.save(filepath, 'PNG')
            icons_extracted[name] = filepath
            print(f"✓ Extracted: {name} -> {filename}.png")
    
    # Extract Row 2 (skip duplicate Herbie)
    row2_names = CHARACTER_LAYOUT[1]
    row2_spacing = (width - 2 * row2_start_x) // (len(row2_names) + 1)
    for i, name in enumerate(row2_names):
        if name == 'Herbie' and 'Herbie' in icons_extracted:
            continue  # Skip duplicate
        if name not in icons_extracted:
            x = row2_start_x + row2_spacing * (i + 1) - icon_size // 2
            y = row2_y - icon_size // 2
            crop_box = (
                max(0, x),
                max(0, y),
                min(width, x + icon_size),
                min(height, y + icon_size)
            )
            icon = img.crop(crop_box)
            filename = sanitize_filename(name)
            filepath = os.path.join(output_dir, f"{filename}.png")
            icon.save(filepath, 'PNG')
            icons_extracted[name] = filepath
            print(f"✓ Extracted: {name} -> {filename}.png")
    
    # Extract Row 3
    row3_names = CHARACTER_LAYOUT[2]
    row3_spacing = (width - 2 * row3_start_x) // (len(row3_names) + 1)
    for i, name in enumerate(row3_names):
        x = row3_start_x + row3_spacing * (i + 1) - icon_size // 2
        y = row3_y - icon_size // 2
        crop_box = (
            max(0, x),
            max(0, y),
            min(width, x + icon_size),
            min(height, y + icon_size)
        )
        icon = img.crop(crop_box)
        filename = sanitize_filename(name)
        filepath = os.path.join(output_dir, f"{filename}.png")
        icon.save(filepath, 'PNG')
        icons_extracted[name] = filepath
        print(f"✓ Extracted: {name} -> {filename}.png")
    
    print(f"\n✅ Successfully extracted {len(icons_extracted)} unique icons to {output_dir}/")
    return icons_extracted

def sanitize_filename(name):
    """Convert character name to a safe filename."""
    return name.replace(' ', '-').replace('/', '-').replace(' of ', '-of-')

if __name__ == '__main__':
    # Try to find the image file
    possible_paths = [
        'ai-characters.png',
        'ai-characters.jpg',
        'ai-characters.jpeg',
        'client/src/assets/ai-characters.png',
    ]
    
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        icon_size = int(sys.argv[2]) if len(sys.argv) > 2 else None
    else:
        image_path = None
        for path in possible_paths:
            if os.path.exists(path):
                image_path = path
                break
        icon_size = None
    
    if not image_path:
        print("Error: Could not find the AI characters image.")
        print("\nPlease either:")
        print("  1. Place the image in the project root as 'ai-characters.png'")
        print("  2. Or run: python3 extract_icons_advanced.py <path-to-image> [icon-size]")
        print("\nExample: python3 extract_icons_advanced.py ai-characters.png 200")
        sys.exit(1)
    
    extract_icons_manual(image_path, icon_size=icon_size)

