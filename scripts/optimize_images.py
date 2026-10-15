from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
hero=root/'public/images/leather-study.webp'
with Image.open(hero) as image:
    image.save(hero,'WEBP',quality=76,method=6)
    image.thumbnail((900,900))
    image.save(root/'public/images/leather-study-small.webp','WEBP',quality=74,method=6)
data=json.loads((root/'src/data/materials.json').read_text(encoding='utf-8'))
target=root/'public/material-thumbnails';target.mkdir(exist_ok=True)
for material in data:
    with Image.open(root/material['origin']) as image:
        image=image.convert('RGB');image.thumbnail((360,360));image.save(target/f"{material['id']}.webp",'WEBP',quality=74,method=6)
    material['thumbnail']=f"/material-thumbnails/{material['id']}.webp"
(root/'src/data/materials.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
