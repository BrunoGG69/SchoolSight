import os
from datetime import datetime
import cv2
import cloudinary
import cloudinary.api
import cloudinary.uploader
import requests
import uuid
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

# Firestore reference
uploads_ref = db.collection("uploads")

# Query pending uploads
pending_docs = uploads_ref.where("status", "==", "pending").stream()
pending_docs = list(pending_docs)

if not pending_docs:
    print("[✅] No pending uploads found.")
    exit()

# Prepare local directories
fetched_dir = "fetched_images"
os.makedirs(fetched_dir, exist_ok=True)

for doc in pending_docs:
    doc_id = doc.id
    data = doc.to_dict()
    image_url = data.get("image_url")

    if not image_url:
        print(f"[❌] No image_url in document: {doc_id}")
        continue

    print(f"[📥] Processing: {doc_id} | URL: {image_url}")

    # Download image
    response = requests.get(image_url)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    local_path = os.path.join(fetched_dir, f"{uuid.uuid4()}.jpg")
    with open(local_path, 'wb') as f:
        f.write(response.content)
    print(f"[📁] Downloaded to: {local_path}")

    # Run face recognition
    image_with_boxes, headcount, known_ids, unknowns = recognize_faces_from_image(local_path)
    print(f"[🧠] Headcount: {headcount} | Known: {known_ids} | Unknown: {unknowns}")

    # Save processed image
    processed_path = os.path.join(fetched_dir, f"processed_{timestamp}.jpg")
    cv2.imwrite(processed_path, image_with_boxes)

    # Upload processed image to Cloudinary
    upload_result = cloudinary.uploader.upload(processed_path, folder="processed_images", public_id=f"processed_{timestamp}")
    processed_image_url = upload_result.get("secure_url")

    # Log Attendance
    timestamp_for_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for student_id in known_ids:
        doc_ref = db.collection("students").document(student_id)
        student_doc = doc_ref.get()
        if not student_doc.exists:
            print(f"[⚠️] Student {student_id} not found in DB.")
            continue

        doc_ref.update({
            "attendance": firestore.ArrayUnion([{
                "timestamp": timestamp_for_now,
                "present": True,
                "image_url": image_url,
                "processed_image_url": processed_image_url
            }])
        })
        print(f"[✅] Marked present: {student_id}")

    # Mark Absentees
    if known_ids:
        known_ids_str = set(str(k) for k in known_ids)
        first_id = list(known_ids_str)[0]

        class_doc = db.collection("students").document(first_id).get()
        if class_doc.exists:
            student_class = class_doc.to_dict().get("class")
            print(f"[📘] Recognized class: {student_class}")
            students_in_class = db.collection("students").where("class", "==", student_class).stream()

            for student_doc in students_in_class:
                sid = student_doc.id
                if sid not in known_ids_str:
                    db.collection("students").document(sid).update({
                        "attendance": firestore.ArrayUnion([{
                            "timestamp": timestamp_for_now,
                            "present": False,
                            "image_url": image_url,
                            "processed_image_url": processed_image_url
                        }])
                    })
                    print(f"[❌] Marked absent: {sid}")
        else:
            print(f"[⚠️] Could not retrieve class info for {first_id}")
    else:
        print("[ℹ️] No students detected. Skipping absentee marking.")

    # Update upload document status
    uploads_ref.document(doc_id).update({
        "status": "processed",
        "processed_image_url": processed_image_url,
        "headcount": headcount,
        "processed_at": firestore.SERVER_TIMESTAMP
    })
    print(f"[✅] Upload {doc_id} marked as processed.")

    # Clean up local files
    os.remove(local_path)
    os.remove(processed_path)
    print(f"[🧹] Cleaned up local files.\n")

print("[🎉] All pending uploads processed.")
