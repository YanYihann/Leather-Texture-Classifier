import sys
import json
import base64
import io
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os

# Load classes
def load_class_names():
    dataset_dir = os.getenv("DATASET_DIR", "dataset_train")
    if os.path.isdir(dataset_dir):
        # Match class index mapping used by app_leather.py and common ImageFolder behavior.
        names = sorted(
            [d for d in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, d))]
        )
        if names:
            return names

    try:
        with open("classes.json", "r") as f:
            return json.load(f)
    except Exception:
        # Final fallback if both dataset folder and classes.json are unavailable.
        return [f"Leather_{i}" for i in range(203)]

class_names = load_class_names()

def get_model(num_classes):
    model = models.resnet50(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, num_classes)
    return model

def predict(base64_str):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    num_classes = len(class_names)
    
    model = get_model(num_classes)
    model_path = os.getenv("MODEL_PATH", "best_leather_model_val.pth")
    
    if not os.path.exists(model_path):
        return {"error": "Model file not found"}

    try:
        state_dict = torch.load(model_path, map_location=device, weights_only=True)
    except TypeError:
        # Compatibility fallback for older torch versions without weights_only.
        state_dict = torch.load(model_path, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    # Preprocessing
    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
    ])

    # Decode image
    img_data = base64.b64decode(base64_str.split(',')[1] if ',' in base64_str else base64_str)
    img = Image.open(io.BytesIO(img_data)).convert('RGB')
    img_t = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(img_t)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        top_probs, top_indices = torch.topk(probabilities, 3)

    results = []
    for i in range(3):
        idx = top_indices[i].item()
        label = class_names[idx]
        
        # Find a reference image in dataset_train
        ref_path = None
        class_dir = os.path.join(os.getenv("DATASET_DIR", "dataset_train"), label)
        if os.path.exists(class_dir):
            files = [f for f in os.listdir(class_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))]
            if files:
                ref_path = f"{label}/{files[0]}"

        results.append({
            "label": label,
            "confidence": round(top_probs[i].item() * 100, 2),
            "referencePath": ref_path
        })

    return {"matches": results}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        base64_input = sys.argv[1]
        print(json.dumps(predict(base64_input)))
    else:
        stdin_input = sys.stdin.read().strip()
        if stdin_input:
            print(json.dumps(predict(stdin_input)))
        else:
            print(json.dumps({"error": "No input provided"}))
