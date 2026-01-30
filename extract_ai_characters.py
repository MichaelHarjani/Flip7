#!/usr/bin/env python3
"""
Extract individual AI character icons from the ai-characters.png sprite sheet.
Each character has a circular icon with their name underneath.

This version detects the actual non-black content and preserves the glow effects,
while completely excluding the text labels at the bottom.
"""

from PIL import Image, ImageDraw, ImageChops
from pathlib import Path
import numpy as np

# Character positions based on visual inspection of the image
CHARACTER_INFO = [
    # Row 1
    {"name": "Wall-E", "row": 0, "col": 0},
    {"name": "R2-D2", "row": 0, "col": 1},
    {"name": "Herbie", "row": 0, "col": 2},
    # Row 2
    {"name": "C-3PO", "row": 1, "col": 0},
    {"name": "Herbie", "row": 1, "col": 1},
    {"name": "EVE", "row": 1, "col": 2},
    # Row 3
    {"name": "Baymax", "row": 2, "col": 0},
    {"name": "7 of 9", "row": 2, "col": 1},
    {"name": "T-800", "row": 2, "col": 2},
    {"name": "HAL 9000", "row": 2, "col": 3},
    {"name": "Ben 10", "row": 2, "col": 4},
]

def find_circle_center_and_radius(img_array, threshold=15):
    """
    Find the center and approximate radius of the circular icon.
    Returns (center_x, center_y, radius)
    """
    # Calculate brightness (max of RGB channels)
    if len(img_array.shape) == 3:
        brightness = np.max(img_array[:, :, :3], axis=2)
    else:
        brightness = img_array

    # Find pixels that are not black (brightness > threshold)
    non_black = brightness > threshold

    # Get coordinates of non-black pixels
    y_coords, x_coords = np.where(non_black)

    if len(x_coords) == 0 or len(y_coords) == 0:
        return None

    # Find center (median of coordinates)
    center_x = int(np.median(x_coords))
    center_y = int(np.median(y_coords))

    # Calculate approximate radius (distance to furthest point from center)
    distances = np.sqrt((x_coords - center_x)**2 + (y_coords - center_y)**2)
    # Use 90th percentile to avoid outliers (like Wall-E's plant)
    radius = int(np.percentile(distances, 90))

    return (center_x, center_y, radius)

def create_smooth_circular_mask(size, center_x, center_y, radius, feather=5):
    """Create a circular mask with smooth edges (feathering)."""
    # Create numpy array for smooth gradient
    y, x = np.ogrid[:size[1], :size[0]]

    # Calculate distance from center
    dist_from_center = np.sqrt((x - center_x)**2 + (y - center_y)**2)

    # Create smooth mask with feathering
    mask_array = np.zeros(size[::-1], dtype=np.uint8)

    # Full opacity inside radius
    mask_array[dist_from_center <= radius] = 255

    # Feathered edge
    feather_zone = (dist_from_center > radius) & (dist_from_center <= radius + feather)
    feather_alpha = 255 * (1 - (dist_from_center[feather_zone] - radius) / feather)
    mask_array[feather_zone] = feather_alpha.astype(np.uint8)

    mask = Image.fromarray(mask_array, mode='L')
    return mask

def extract_character_icons(input_path: str, output_dir: str):
    """
    Extract individual character icons from the sprite sheet.
    Detects circular content and preserves glow effects while excluding text.
    """
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Open the image
    img = Image.open(input_path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    print(f"Image size: {img.size}")
    width, height = img.size

    # Grid configuration based on visual inspection
    # Only use top 65% of each cell to completely exclude text labels
    rows_config = [
        {"count": 3, "y_start": 0, "y_end": height * 0.30, "text_cutoff": 0.65},      # Top row
        {"count": 3, "y_start": height * 0.30, "y_end": height * 0.65, "text_cutoff": 0.65},  # Middle row
        {"count": 5, "y_start": height * 0.65, "y_end": height, "text_cutoff": 0.62},          # Bottom row
    ]

    extracted = []

    for char_info in CHARACTER_INFO:
        row = char_info["row"]
        col = char_info["col"]
        name = char_info["name"]

        if row >= len(rows_config):
            continue

        row_config = rows_config[row]
        num_cols = row_config["count"]
        text_cutoff = row_config["text_cutoff"]

        # Calculate the rough grid cell
        col_width = width / num_cols
        x_start = int(col * col_width)
        x_end = int((col + 1) * col_width)
        y_start = int(row_config["y_start"])
        y_end = int(row_config["y_end"])

        # Apply text cutoff - only use top portion to exclude text labels
        cell_height = y_end - y_start
        y_end = int(y_start + cell_height * text_cutoff)

        # Extract the grid cell (without text area)
        cell = img.crop((x_start, y_start, x_end, y_end))
        cell_array = np.array(cell)

        # Find the circle center and radius
        circle_info = find_circle_center_and_radius(cell_array, threshold=15)

        if circle_info is None:
            print(f"Warning: No content found for {name}, skipping")
            continue

        center_x, center_y, radius = circle_info

        # Add padding to preserve glow effects
        glow_padding = 20
        crop_radius = radius + glow_padding

        # Calculate crop bounds centered on the circle
        min_x = max(0, center_x - crop_radius)
        min_y = max(0, center_y - crop_radius)
        max_x = min(cell.width, center_x + crop_radius)
        max_y = min(cell.height, center_y + crop_radius)

        # Crop to circular area with glow
        content = cell.crop((min_x, min_y, max_x, max_y))

        # Make it square
        content_width = max_x - min_x
        content_height = max_y - min_y
        square_size = max(content_width, content_height)

        # Create a square canvas
        square_img = Image.new('RGBA', (square_size, square_size), (0, 0, 0, 0))

        # Paste content in the center
        paste_x = (square_size - content_width) // 2
        paste_y = (square_size - content_height) // 2
        square_img.paste(content, (paste_x, paste_y))

        # Create a smooth circular mask
        center = square_size // 2
        mask_radius = square_size // 2 - 5
        mask = create_smooth_circular_mask((square_size, square_size), center, center, mask_radius, feather=4)

        # Apply the mask
        square_array = np.array(square_img)
        mask_array = np.array(mask)

        # Multiply existing alpha by mask
        if square_array.shape[2] == 4:
            square_array[:, :, 3] = (square_array[:, :, 3].astype(float) * mask_array.astype(float) / 255).astype(np.uint8)

        result = Image.fromarray(square_array, mode='RGBA')

        # Save the extracted icon
        safe_name = name.replace(' ', '-').replace('/', '-')
        output_file = output_path / f"{safe_name}.png"
        result.save(str(output_file), 'PNG')

        print(f"Extracted: {name:12} -> circle at ({center_x:3},{center_y:3}) r={radius:3} -> {square_size}x{square_size}px -> {output_file.name}")
        extracted.append(name)

    return extracted

def main():
    """Main extraction function."""
    input_file = "/Users/michael/Projects/flip7-webapp/ai-characters.png"

    # Output to multiple directories
    output_dirs = [
        "/Users/michael/Projects/flip7-webapp/client/public/assets/ai-icons",
        "/Users/michael/Projects/flip7-webapp/client/src/assets/ai-icons",
    ]

    print("Starting AI character icon extraction...")
    print("Detecting circular content and preserving glow effects (excluding text)\n")
    print(f"Input: {input_file}\n")

    all_extracted = []
    for output_dir in output_dirs:
        print(f"Extracting to: {output_dir}")
        try:
            extracted = extract_character_icons(input_file, output_dir)
            all_extracted = extracted
            print(f"✓ Successfully extracted {len(extracted)} icons to {output_dir}\n")
        except Exception as e:
            print(f"✗ Error extracting to {output_dir}: {e}\n")
            import traceback
            traceback.print_exc()

    print(f"\n✓ Extraction complete! Extracted characters: {', '.join(set(all_extracted))}")

if __name__ == "__main__":
    main()
