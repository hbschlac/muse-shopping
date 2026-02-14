#!/usr/bin/env python3
"""Convert SVG mockups to PNG files"""

import cairosvg
import os

# SVG files to convert
svg_files = [
    '01-all-your-favorites-one-cart.svg',
    '02-we-show-you-where-to-buy.svg',
    '03-shop-with-ease.svg'
]

print('🎨 Converting SVG mockups to PNG...\n')

for svg_file in svg_files:
    if not os.path.exists(svg_file):
        print(f'❌ File not found: {svg_file}')
        continue

    png_file = svg_file.replace('.svg', '.png')

    print(f'📄 Converting {svg_file}...')

    try:
        cairosvg.svg2png(
            url=svg_file,
            write_to=png_file,
            output_width=1242,
            output_height=2208,
            dpi=144  # 2x for retina quality
        )

        # Get file size
        size_mb = os.path.getsize(png_file) / (1024 * 1024)
        print(f'   ✅ Created {png_file} ({size_mb:.2f} MB)')

    except Exception as e:
        print(f'   ❌ Error: {e}')

print('\n🎉 Conversion complete!')
print('\n📦 PNG files ready for Figma upload:')
for svg_file in svg_files:
    png_file = svg_file.replace('.svg', '.png')
    if os.path.exists(png_file):
        print(f'   - {png_file}')
