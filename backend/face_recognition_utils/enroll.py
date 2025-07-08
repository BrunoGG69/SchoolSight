from backend.face_recognition_utils.load_detectors import load_models
from backend.face_recognition_utils.utils import save_embeddings
import cv2
import numpy as np
import os
import time  # for delay

def enroll_from_webcam(yolo, arcface, student_id, name, student_class, required=18):
    cap = cv2.VideoCapture(2)
    if not cap.isOpened():
        print("[ERROR] Could not open webcam.")
        return

    embeddings = []
    print("[INFO] Press 'c' to start capturing. Press 'q' to quit.")
    capturing = False

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Failed to grab frame.")
            break

        frame_display = frame.copy()

        if capturing and len(embeddings) < required:
            results = yolo(frame, conf=0.3)[0]
            faces = arcface.get(frame)

            if results.boxes is not None:
                for det in results.boxes.data:
                    x1, y1, x2, y2 = map(int, det[:4].tolist())

                    for face in faces:
                        fx1, fy1, fx2, fy2 = map(int, face.bbox)
                        if abs(fx1 - x1) < 30 and abs(fy1 - y1) < 30:
                            emb = face.embedding
                            embeddings.append(np.array(emb).flatten().tolist())

                            cv2.rectangle(frame_display, (fx1, fy1), (fx2, fy2), (0, 255, 0), 2)
                            cv2.putText(frame_display, f"Captured {len(embeddings)}", (fx1, fy1 - 10),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                            break

            if len(embeddings) % 3 == 0 and len(embeddings) < required:
                print(f"[INFO] {len(embeddings)} embeddings captured. Waiting 5 seconds...")
                time.sleep(5)

            if len(embeddings) >= required:
                print("[INFO] Required number of embeddings captured.")
                break

        cv2.putText(frame_display, "Press 'c' to start capture | 'q' to quit",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.imshow("Enroll Student", frame_display)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('c') and not capturing:
            capturing = True
            print("[INFO] Capture started...")
        elif key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

    if embeddings:
        enrollment_dir = os.path.join(os.path.dirname(__file__), '..', 'enrollments')
        enrollment_dir = os.path.abspath(enrollment_dir)
        path = save_embeddings(student_id, name, student_class, embeddings, enrollment_dir)
        print(f"[SUCCESS] Enrolled {name} ({student_id}) with {len(embeddings)} embeddings.")
        print(f"[INFO] Saved to {path}")
    else:
        print("[ERROR] No embeddings captured.")


def enroll_from_images(yolo, arcface, student_id, name, student_class, image_dir):
    if not os.path.exists(image_dir):
        print(f"[ERROR] Image directory '{image_dir}' not found.")
        return

    image_files = [os.path.join(image_dir, f) for f in os.listdir(image_dir)
                   if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    if len(image_files) < 3:
        print("[ERROR] At least 3 images required.")
        return

    embeddings = []

    for img_path in sorted(image_files)[:3]:
        img = cv2.imread(img_path)
        if img is None:
            print(f"[WARNING] Couldn't read image: {img_path}")
            continue

        results = yolo(img, conf=0.3)[0]
        faces = arcface.get(img)

        if not faces:
            print(f"[WARNING] No faces found in {img_path}")
            continue

        for face in faces[:3]:
            emb = face.embedding
            embeddings.append(np.array(emb).flatten().tolist())

        print(f"[INFO] Collected embeddings from {img_path} | Total: {len(embeddings)}")

    if embeddings:
        enrollment_dir = os.path.join(os.path.dirname(__file__), '..', 'enrollments')
        enrollment_dir = os.path.abspath(enrollment_dir)
        path = save_embeddings(student_id, name, student_class, embeddings, enrollment_dir)
        print(f"[SUCCESS] Enrolled {name} ({student_id}) with {len(embeddings)} embeddings.")
        print(f"[INFO] Saved to {path}")
    else:
        print("[ERROR] No embeddings captured.")

if __name__ == "__main__":
    img_dir = os.path.join(os.path.dirname(__file__), '..', 'images')
    img_dir = os.path.abspath(img_dir)

    mode = input("Enroll from (1) Webcam or (2) Images? [1/2]: ").strip()
    sid = input("Enter 4-digit Student ID: ")
    name = input("Enter Full Name: ")
    cls = input("Enter Class (e.g., 11A): ")

    yolo, arcface, _ = load_models()

    if mode == "1":
        enroll_from_webcam(yolo, arcface, sid, name, cls)
    elif mode == "2":
        enroll_from_images(yolo, arcface, sid, name, cls, img_dir)
    else:
        print("[ERROR] Invalid selection.")
