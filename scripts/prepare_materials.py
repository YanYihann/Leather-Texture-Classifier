"""Export optimized reference thumbnails from the local dataset; no invented labels."""
from pathlib import Path
from PIL import Image
import json
import sys

root = Path(__file__).resolve().parents[1]
target = root / 'public' / 'materials'
target.mkdir(parents=True, exist_ok=True)
manifest = []
dataset = root / 'dataset_train'
if dataset.exists():
    for directory in sorted(p for p in dataset.iterdir() if p.is_dir()):
        files = sorted(p for p in directory.iterdir() if p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.bmp', '.webp'))
        if not files:
            continue
        with Image.open(files[0]) as image:
            image = image.convert('RGB')
            image.thumbnail((640, 640))
            image.save(target / f'{directory.name}.webp', 'WEBP', quality=82)
        manifest.append({'id': directory.name, 'image': f'/materials/{directory.name}.webp', 'samples': len(files), 'origin': files[0].relative_to(root).as_posix()})
    data_dir = root / 'src' / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / 'materials.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
if len(sys.argv) > 1:
    with Image.open(sys.argv[1]) as image:
        image.convert('RGB').save(root / 'public' / 'images' / 'leather-study.webp', 'WEBP', quality=88)
print(f'Prepared {len(manifest)} real reference classes.')
