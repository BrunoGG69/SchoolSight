import torch
from ultralytics import YOLO
import insightface
import os

def load_models():
    device = 'cuda' if torch.cuda.is_available() else 'cpu'

    model_path = os.path.join(os.path.dirname(__file__), '..', 'yolov8n-face.pt')
    yolo = YOLO(model_path)
    yolo.to(device)

    arcface = insightface.app.FaceAnalysis(name='buffalo_l')
    ctx_id = 0 if torch.cuda.is_available() else -1
    arcface.prepare(ctx_id=ctx_id)

    return yolo, arcface, device