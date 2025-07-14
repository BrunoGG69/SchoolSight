from face_recognition_utils import enroll_from_webcam, enroll_from_images
from face_recognition_utils import load_models
import os
from firebase_utils import db

img_dir = os.path.join(os.path.dirname(__file__), '..', 'images')
img_dir = os.path.abspath(img_dir)

mode = input("Enroll from (1) Webcam or (2) Images?: ").strip()
sid = input("Enter 4-digit Student ID: ")
name = input("Enter Full Name: ")
cls = input("Enter Class (e.g., 11A): ")

yolo, arcface, _ = load_models()

if __name__ == '__main__':
    if mode == "1":
         enrollment_data = enroll_from_webcam(yolo, arcface, sid, name, cls)
         if enrollment_data:
             data = {
                    "name": enrollment_data["name"],
                    "class": enrollment_data["class"],
                    "embeddings": f"{sid}_{name.replace(' ', '_')}.json",
             }
             db.collection("students").document(sid).set(data)
    elif mode == "2":
        enroll_from_images(yolo, arcface, sid, name, cls, img_dir)
    else:
        print("[ERROR] Invalid selection.")