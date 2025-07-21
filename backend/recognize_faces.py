import os
from datetime import datetime
import cv2
import cloudinary
import cloudinary.api
import cloudinary.uploader
import requests
from google.cloud import firestore
from face_recognition_utils.recognize import recognize_faces_from_image
from firebase_utils import db
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUD_API_KEY"),
    api_secret=os.getenv("CLOUD_API_SECRET")
)

# Create directory to save fetched images
fetched_dir = "fetched_images"
os.makedirs(fetched_dir, exist_ok=True)

# Fetch latest image from Cloudinary folder "captured_images"
print("[📥] Fetching latest image from Cloudinary...")
resources = cloudinary.api.resources(type="upload", prefix="captured_images/", max_results=1, direction="desc")
if not resources['resources']:
    print("[❌] No images found in Cloudinary folder 'captured_images/'")
    exit()

image_data = resources['resources'][0]
image_url = image_data['secure_url']
image_public_id = image_data['public_id']

# Download the image
image_resp = requests.get(image_url)
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
local_path = os.path.join(fetched_dir, f"{timestamp}.jpg")
with open(local_path, 'wb') as f:
    f.write(image_resp.content)
print(f"[📁] Downloaded: {local_path}")

# Run face recognition
image_with_boxes, headcount, known_ids, unknowns = recognize_faces_from_image(local_path)

# Save image with boxes (optional)
processed_path = os.path.join(fetched_dir, f"processed_{timestamp}.jpg")
cv2.imwrite(processed_path, image_with_boxes)

# Log Attendance on Firestore
timestamp_for_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
print(f"[🧠] Headcount: {headcount} | Known: {known_ids} | Unknowns: {unknowns}")

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

# Show the image
cv2.imshow("Recognition Result", image_with_boxes)
cv2.waitKey(5000)
cv2.destroyAllWindows()
