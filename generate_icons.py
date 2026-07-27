import os
from PIL import Image, ImageDraw, ImageFilter

def create_aetheris_icon():
    os.makedirs('build', exist_ok=True)
    
    # 512x512 canvas for high quality
    size = 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    
    # Outer Glow Ring
    for r in range(220, 180, -2):
        alpha = int(120 * (1 - (220 - r) / 40))
        draw.ellipse([center - r, center - r, center + r, center + r], outline=(0, 255, 170, alpha), width=3)
    
    # Core Alien HUD Base Circle
    r_base = 180
    draw.ellipse([center - r_base, center - r_base, center + r_base, center + r_base], fill=(6, 24, 34, 240), outline=(0, 255, 170, 255), width=6)
    
    # Inner Cyber Cyan Ring
    r_cyan = 140
    draw.ellipse([center - r_cyan, center - r_cyan, center + r_cyan, center + r_cyan], outline=(0, 229, 255, 255), width=4)
    
    # Secondary Accent Plasma Ring
    r_plasma = 100
    draw.ellipse([center - r_plasma, center - r_plasma, center + r_plasma, center + r_plasma], outline=(176, 38, 255, 200), width=3)
    
    # Center Disc Platter Core
    r_core = 50
    draw.ellipse([center - r_core, center - r_core, center + r_core, center + r_core], fill=(0, 255, 170, 255), outline=(255, 255, 255, 255), width=4)
    
    # Sci-Fi Crosshairs
    draw.line([center - 210, center, center - 170, center], fill=(0, 255, 170, 255), width=4)
    draw.line([center + 170, center, center + 210, center], fill=(0, 255, 170, 255), width=4)
    draw.line([center, center - 210, center, center - 170], fill=(0, 255, 170, 255), width=4)
    draw.line([center, center + 170, center, center + 210], fill=(0, 255, 170, 255), width=4)
    
    # Save PNG
    png_path = os.path.join('build', 'icon.png')
    img.save(png_path, 'PNG')
    print(f"Generated {png_path}")
    
    # Save ICO with multiple standard icon sizes
    ico_path = os.path.join('build', 'icon.ico')
    img.save(ico_path, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    print(f"Generated {ico_path}")

if __name__ == '__main__':
    create_aetheris_icon()
