"""Export unchanged float32 weights and verify ONNX against PyTorch on real samples."""
from pathlib import Path
import sys, json
import numpy as np
import torch
from PIL import Image
from torchvision import transforms
import onnxruntime as ort

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
import inference

target = root / 'output' / 'browser-model'
target.mkdir(parents=True, exist_ok=True)
inference.initialize_model()
model = inference._model.cpu()
export = target / 'leather-resnet50-v1.onnx'
torch.onnx.export(model, torch.zeros(1, 3, 224, 224), str(export), input_names=['image'], output_names=['logits'], opset_version=17, dynamo=False)
session = ort.InferenceSession(str(export), providers=['CPUExecutionProvider'])
transform = transforms.Compose([transforms.Resize(256), transforms.CenterCrop(224), transforms.ToTensor(), transforms.Normalize((.485,.456,.406),(.229,.224,.225))])
records = []
for index, name in enumerate(inference.class_names):
    files = sorted(p for p in (root / 'dataset_train' / name).iterdir() if p.suffix.lower() in ('.png','.jpg','.jpeg','.webp','.bmp'))
    tensor = transform(Image.open(files[0]).convert('RGB')).unsqueeze(0)
    with torch.inference_mode(): original = torch.softmax(model(tensor)[0], 0).numpy()
    logits = session.run(None, {'image': tensor.numpy()})[0][0]
    probability = np.exp(logits - logits.max()); probability /= probability.sum()
    old = np.argsort(-original)[:3]; new = np.argsort(-probability)[:3]
    records.append({'class':name,'sameTop1':bool(old[0]==new[0]),'sameTop3Order':bool(np.array_equal(old,new)),'maxProbabilityDifference':float(np.max(np.abs(original-probability)))})
    if (index+1)%25==0: print(f'Validated {index+1} samples',flush=True)
report = {'format':'float32','samples':len(records),'top1Matches':sum(r['sameTop1'] for r in records),'top3OrderMatches':sum(r['sameTop3Order'] for r in records),'maxProbabilityDifference':max(r['maxProbabilityDifference'] for r in records),'bytes':export.stat().st_size,'records':records}
(target / 'validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
(target / 'classes.json').write_text(json.dumps(inference.class_names),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='records'}),flush=True)
