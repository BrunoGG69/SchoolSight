import cv2
import os
from datetime import datetime
from face_recognition_utils.recognize import recognize_faces_from_image
from firebase_utils import db
from google.cloud import firestore

save_dir = "captured_images"
os.makedirs(save_dir, exist_ok=True)

cap = cv2.VideoCapture(2)
if not cap.isOpened():
    print("[ERROR] Could not access webcam.")
    exit()

ret, frame = cap.read()
cap.release()

if not ret:
    print("[ERROR] Failed to capture frame.")
    exit()

timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
img_path = os.path.join(save_dir, f"capture_{timestamp}.jpg")
cv2.imwrite(img_path, frame)
print(f"[INFO] Image saved to {img_path}")

# === Face Recognition ===
image_with_boxes, headcount, known_ids, unknowns = recognize_faces_from_image(img_path)

# === Firestore Attendance Logging ===
now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# 1. Mark present students
for student_id in known_ids:
    doc_ref = db.collection("students").document(student_id)
    if not doc_ref.get().exists:
        print(f"[WARNING] Student ID {student_id} not found in DB. Skipping.")
        continue

    doc_ref.update({
        "attendance": firestore.ArrayUnion([{
            "timestamp": now_str,
            "present": True
        }])
    })
    print(f"[✅] Marked present: {student_id}")

if known_ids:
    known_ids_str = set(str(kid) for kid in known_ids)

    first_id = list(known_ids_str)[0]
    class_doc = db.collection("students").document(first_id).get()

    if class_doc.exists:
        student_class = class_doc.to_dict().get("class")
        print(f"[INFO] Recognized class: {student_class}")

        students_in_class_list = list(db.collection("students").where("class", "==", student_class).stream())
        total_students = len(students_in_class_list)

        absentees_found = False
        for student_doc in students_in_class_list:
            sid = student_doc.id
            if sid not in known_ids_str:
                db.collection("students").document(sid).update({
                    "attendance": firestore.ArrayUnion([{
                        "timestamp": now_str,
                        "present": False
                    }])
                })
                print(f"[❌] Marked absent: {sid}")
                absentees_found = True

        print(f"[SUMMARY] Class: {student_class} | Total Enrolled: {total_students} | Present: {len(known_ids)} | Absent: {total_students - len(known_ids)}")

        if not absentees_found:
            print("[INFO] No absentees found or all students present.")
    else:
        print(f"[ERROR] Could not retrieve class info for student ID: {first_id}")


# === Show Result ===
cv2.imshow("Recognition Result", image_with_boxes)
cv2.waitKey(5000)
cv2.destroyAllWindows()
