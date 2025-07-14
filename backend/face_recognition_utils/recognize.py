import os
import cv2
import json
import numpy as np
from scipy.spatial.distance import cosine
from backend.face_recognition_utils.load_detectors import load_models

THRESHOLD = 0.5
ENROLLMENTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'enrollments')
ENROLLMENTS_DIR = os.path.abspath(ENROLLMENTS_DIR)
yolo, arcface, _ = load_models()

def load_enrollments():
    known_faces = []
    for file in os.listdir(ENROLLMENTS_DIR):
        if file.endswith(".json"):
            with open(os.path.join(ENROLLMENTS_DIR, file), 'r') as f:
                data = json.load(f)
                for emb in data["encodings"]:
                    known_faces.append({
                        "name": data["name"],
                        "class": data["class"],
                        "student_id": data["student_id"],
                        "embedding": emb
                    })
    return known_faces

def recognize_faces_from_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Image not found: {image_path}")

    known_faces = load_enrollments()
    seen_ids = set()
    unknown_count = 0

    results = yolo(image, imgsz=max(image.shape[:2]), conf=0.3)[0]
    faces = arcface.get(image)

    for face in faces:
        emb = np.array(face.embedding).flatten()
        f_x1, f_y1, f_x2, f_y2 = map(int, face.bbox)

        matched = False
        for known in known_faces:
            dist = cosine(known["embedding"], emb)
            if dist < THRESHOLD:
                sid = known["student_id"]
                if sid not in seen_ids:
                    print(f"[ATTENDANCE] {known['name']} ({sid}) - Class {known['class']}")
                    seen_ids.add(sid)

                cv2.rectangle(image, (f_x1, f_y1), (f_x2, f_y2), (0, 255, 0), 2)
                cv2.putText(image, known["name"], (f_x1, f_y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                matched = True
                break

        if not matched:
            unknown_count += 1
            cv2.rectangle(image, (f_x1, f_y1), (f_x2, f_y2), (0, 0, 255), 2)
            cv2.putText(image, "Unknown", (f_x1, f_y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

    headcount = len(seen_ids) + unknown_count
    print(f"[SUMMARY] Known: {len(seen_ids)} | Unknown: {unknown_count} | Total In Frame: {headcount}")
    return image, headcount, seen_ids, unknown_count
