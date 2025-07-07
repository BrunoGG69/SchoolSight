from ultralytics import YOLO
import cv2
import numpy as np
import insightface
import os
import json
import torch
import sys

# Check for GPU availability
if not torch.cuda.is_available():
    print("[FATAL] GPU not available. Please run this script on a CUDA-enabled system.")
    sys.exit(1)

# YOLO (force to GPU)
yolo = YOLO("yolov8n-face.pt")
yolo.to('cuda')  # Explicitly move YOLO model to GPU
print(f"[INFO] YOLO is using: {yolo.device}")

# ArcFace (force to GPU)
arcface = insightface.app.FaceAnalysis(name='buffalo_l')
arcface.prepare(ctx_id=0)  # ctx_id=0 maps to first CUDA device when available
print(f"[INFO] ArcFace is using: GPU")

def enroll_student(student_id, name, student_class):
    cap = cv2.VideoCapture(2)

    if not cap.isOpened():
        print("[ERROR] Could not open webcam.")
        return

    embeddings = []
    print("[INFO] Press 'c' to capture a face. Press 'q' to finish.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Failed to grab frame.")
            break

        frame_resized = cv2.resize(frame, (640, 640))
        results = yolo(frame_resized, imgsz=640, conf=0.3)[0]

        if results.boxes is not None:
            for det in results.boxes.data:
                x1, y1, x2, y2 = map(int, det[:4].tolist())

                arcface_faces = arcface.get(frame_resized)

                for face in arcface_faces:
                    f_x1, f_y1, f_x2, f_y2 = map(int, face.bbox)

                    if abs(f_x1 - x1) < 30 and abs(f_y1 - y1) < 30:
                        emb = face.embedding
                        flat_emb = [float(val) for val in np.array(emb).flatten()]
                        embeddings.append(flat_emb)

                        cv2.rectangle(frame_resized, (f_x1, f_y1), (f_x2, f_y2), (0, 255, 0), 2)
                        cv2.putText(frame_resized, f"Captured {len(embeddings)}", (f_x1, f_y1 - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                        break

        cv2.imshow("Enroll Face", frame_resized)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('c'):
            print(f"[INFO] Captures so far: {len(embeddings)}")
        elif key == ord('q') or len(embeddings) >= 3:
            break

    cap.release()
    cv2.destroyAllWindows()

    if embeddings:
        os.makedirs("enrollments", exist_ok=True)
        filepath = f"enrollments/{student_id}_{name.replace(' ', '_')}.json"
        with open(filepath, 'w') as f:
            json.dump({
                "student_id": student_id,
                "name": name,
                "class": student_class,
                "encodings": embeddings
            }, f, indent=2)

        print(f"[SUCCESS] Enrolled {name} ({student_id}) with {len(embeddings)} encodings.")
        print(f"[INFO] Saved to {filepath}")
    else:
        print("[ERROR] No encodings captured.")

if __name__ == "__main__":
    sid = input("Enter 4-digit Student ID: ")
    name = input("Enter Full Name: ")
    cls = input("Enter Class (e.g., 11A): ")
    enroll_student(sid, name, cls)
