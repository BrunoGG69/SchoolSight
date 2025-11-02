from backend.face_recognition_utils import load_models
from backend.face_recognition_utils.enroll import enroll_from_webcam

if __name__ == "__main__":
    sid = input("Enter 4-digit Student ID: ")
    name = input("Enter Full Name: ")
    cls = input("Enter Class (e.g., 11A): ")

    yolo, arcface, _ = load_models()
    enroll_from_webcam(yolo, arcface, sid, name, cls)
