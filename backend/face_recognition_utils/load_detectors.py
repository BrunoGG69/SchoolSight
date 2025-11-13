import torch
from ultralytics import YOLO
import insightface
import os

def load_models():
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"[INFO] Using device: {device.upper()}")

    model_path = os.path.join(os.path.dirname(__file__), '..', 'yolov8n-face.pt')

    yolo = YOLO(model_path)
    yolo.to(device)

    try:
        yolo.fuse()
    except Exception:
        pass

    print(f"[INFO] YOLO model loaded on {device.upper()}")

    arcface = insightface.app.FaceAnalysis(
        name='buffalo_l',
        providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
    )

    # ctx_id = 0 means GPU, -1 means CPU
    ctx_id = 0 if device == 'cuda' else -1
    arcface.prepare(ctx_id=ctx_id)

    print(f"[INFO] ArcFace model prepared on {'GPU' if ctx_id == 0 else 'CPU'}")

    if device == 'cuda':
        print(f"[INFO] GPU: {torch.cuda.get_device_name(0)}")
        print(f"[INFO] CUDA version (PyTorch runtime): {torch.version.cuda}")

    return yolo, arcface, device
