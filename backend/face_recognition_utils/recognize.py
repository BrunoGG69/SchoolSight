import os
import cv2
import numpy as np
from scipy.spatial.distance import cosine
from backend.face_recognition_utils.load_detectors import load_models
from backend.firebase_utils import db

THRESHOLD = 0.6
ENROLLMENTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'enrollments')
ENROLLMENTS_DIR = os.path.abspath(ENROLLMENTS_DIR)
yolo, arcface, _ = load_models()


def load_enrollments():
    known_faces = []

    students_ref = db.collection("students")
    students_docs = students_ref.stream()

    for student_doc in students_docs:
        student_data = student_doc.to_dict()
        student_id = student_doc.id
        name = student_data.get("name")
        class_name = student_data.get("class")

        encodings_ref = student_doc.reference.collection("encodings").stream()
        for enc_doc in encodings_ref:
            enc_data = enc_doc.to_dict()
            embedding = enc_data.get("vector")
            if embedding:
                known_faces.append({
                    "name": name,
                    "class": class_name,
                    "student_id": student_id,
                    "embedding": embedding
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
