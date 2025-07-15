import os
from datetime import datetime
import cv2
import cloudinary.uploader
from google.cloud import firestore
from face_recognition_utils.recognize import recognize_faces_from_image
from firebase_utils import db
from dotenv import load_dotenv

load_dotenv()
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv('CLOUD_API_KEY'),
    api_secret=os.getenv('CLOUD_API_SECRET')
)

# Create directory to save images
save_dir = "captured_images"
os.makedirs(save_dir, exist_ok=True)

# Capture image from webcam
cap = cv2.VideoCapture(2)
if not cap.isOpened():
    print("[ERROR] Could not access webcam.")
    exit()

ret, frame = cap.read()
cap.release()

if not ret:
    print("[ERROR] Failed to capture frame.")
    exit()

# Save temporary image
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
temp_path = os.path.join(save_dir, "temp.jpg")
cv2.imwrite(temp_path, frame)

# Face recognition using custom-made package
image_with_boxes, headcount, known_ids, unknowns = recognize_faces_from_image(temp_path)

# Save final processed image
final_img_path = os.path.join(save_dir, f"attendance_{timestamp}.jpg")
cv2.imwrite(final_img_path, image_with_boxes)
os.remove(temp_path)  # remove temporary image

# Upload Image to Cloudinary
upload_result = cloudinary.uploader.upload(final_img_path, folder="attendance_logs")
image_url = upload_result.get("secure_url")
print(f"[☁️] Uploaded to Cloudinary: {image_url}")

# Log Attendance on Firestore
timestamp_for_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Mark Present Students
for student_id in known_ids:
    doc_ref = db.collection("students").document(student_id)
    doc = doc_ref.get()
    if not doc.exists:
        print(f"[⚠️] Student ID {student_id} not found in DB. Skipping.")
        continue

    doc_ref.update({
        "attendance": firestore.ArrayUnion([{
            "timestamp": timestamp_for_now,
            "present": True,
            "image_url": image_url
        }])
    })
    print(f"[✅] Marked present: {student_id}")

# Mark Absentees
if known_ids:
    known_ids_str = set(str(kid) for kid in known_ids)
    first_id = list(known_ids_str)[0]

    class_doc = db.collection("students").document(first_id).get()
    if class_doc.exists:
        student_class = class_doc.to_dict().get("class")
        print(f"[INFO] Recognized class: {student_class}")

        students_in_class = list(db.collection("students").where("class", "==", student_class).stream())
        total = len(students_in_class)
        absentees = 0

        for student_doc in students_in_class:
            sid = student_doc.id
            if sid not in known_ids_str:
                db.collection("students").document(sid).update({
                    "attendance": firestore.ArrayUnion([{
                        "timestamp": timestamp_for_now,
                        "present": False,
                        "image_url": image_url
                    }])
                })
                print(f"[❌] Marked absent: {sid}")
                absentees += 1

        print(f"[📊] SUMMARY | Class: {student_class} | Total: {total} | Present: {len(known_ids)} | Absent: {absentees}")
    else:
        print(f"[ERROR] Could not retrieve class info for student ID: {first_id}")
else:
    print("[INFO] No students detected. Skipping absentee marking.")

# Display the processed images for 5 seconds
cv2.imshow("Recognition Result", image_with_boxes)
cv2.waitKey(5000)
cv2.destroyAllWindows()
