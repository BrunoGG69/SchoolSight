import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

import cv2
import cloudinary
import cloudinary.uploader
import requests
from dotenv import load_dotenv
from google.cloud import firestore
from google.cloud.firestore_v1 import FieldFilter
from tqdm import tqdm

from face_recognition_utils.recognize import recognize_faces_from_image
from firebase_utils import db

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUD_API_KEY"),
    api_secret=os.getenv("CLOUD_API_SECRET"),
)

TEMP_DIR = Path("tempStore")
TEMP_DIR.mkdir(exist_ok=True)

UPLOADS_COLLECTION = db.collection("uploads")
STUDENT_COLLECTION = db.collection("students")

def get_pending_uploads():
    return list(UPLOADS_COLLECTION.where(filter=FieldFilter("status", "==", "pending")).stream())

def download_image(session: requests.Session, url: str, dest_dir: Path) -> Path:
    response = session.get(url, timeout=30)
    response.raise_for_status()

    local_path = dest_dir / f"{uuid.uuid4()}.jpg"
    local_path.write_bytes(response.content)
    return local_path

def process_image(local_path: Path) -> Tuple:
    image_with_boxes, headcount, known_ids, unknowns = recognize_faces_from_image(str(local_path))
    return image_with_boxes, headcount, known_ids, unknowns


def save_processed_image(image_with_boxes, dest_dir: Path, timestamp: str) -> Path:
    processed_path = dest_dir / f"processed_{timestamp}.jpg"
    cv2.imwrite(str(processed_path), image_with_boxes)
    return processed_path


def upload_to_cloudinary(processed_path: Path, timestamp: str) -> str:
    upload_result = cloudinary.uploader.upload(
        str(processed_path),
        folder="processed_images",
        public_id=f"processed_{timestamp}",
    )
    return upload_result.get("secure_url")


def mark_attendance(
    items_id: str,
    image_url: str,
    processed_image_url: str,
    known_ids: List[str],
    timestamp_for_now: str,
) -> None:
    base_attendance_entry = {
        "id": items_id,
        "timestamp": timestamp_for_now,
        "image_url": image_url,
        "processed_image_url": processed_image_url,
    }

    present_batch = db.batch()
    present_docs_cache = {}

    for student_id in known_ids:
        doc_ref = STUDENT_COLLECTION.document(student_id)
        student_doc = doc_ref.get()

        if not student_doc.exists:
            print(f"WARNING: Student {student_id} not found in DB.")
            continue

        present_docs_cache[student_id] = student_doc

        present_entry = {
            **base_attendance_entry,
            "present": True,
        }

        present_batch.update(
            doc_ref,
            {
                "attendance": firestore.ArrayUnion([present_entry])
            },
        )

        print(f"ACTION: Marked present: {student_id}")

    if present_docs_cache:
        present_batch.commit()
    else:
        print("INFO: No valid known students found. Skipping absentee marking.")
        return

    student_class = None
    for doc in present_docs_cache.values():
        data = doc.to_dict() or {}
        student_class = data.get("class")
        if student_class:
            break

    if not student_class:
        print("WARNING: Could not determine class from recognized students.")
        return

    print(f"INFO: Recognized class: {student_class}")

    students_in_class = STUDENT_COLLECTION.where(filter=FieldFilter("class", "==", student_class)).stream()
    known_ids_str = set(str(sid) for sid in known_ids)

    absent_batch = db.batch()
    absent_count = 0

    for student_doc in students_in_class:
        sid = student_doc.id
        if sid in known_ids_str:
            continue

        absent_entry = {
            **base_attendance_entry,
            "present": False,
        }

        std_ref = STUDENT_COLLECTION.document(sid)
        absent_batch.update(
            std_ref,
            {
                "attendance": firestore.ArrayUnion([absent_entry])
            },
        )
        absent_count += 1
        print(f"ACTION: Marked absent: {sid}")

    if absent_count > 0:
        absent_batch.commit()
        print(f"INFO: Total absentees marked: {absent_count}")
    else:
        print("INFO: No absentees to mark.")


def update_upload_document(
    items_id: str,
    processed_image_url: str,
    headcount: int,
) -> None:
    UPLOADS_COLLECTION.document(items_id).update(
        {
            "status": "processed",
            "processed_image_url": processed_image_url,
            "headcount": headcount,
            "processed_at": firestore.SERVER_TIMESTAMP,
        }
    )
    print(f"ACTION: Upload {items_id} marked as processed.")


def cleanup_files(*paths: Path) -> None:
    for p in paths:
        if not p:
            continue
        try:
            if p.exists():
                p.unlink()
        except Exception as e:
            print(f"WARNING: Failed to delete {p}: {e}")


def process_pending_uploads() -> None:
    pending_images = get_pending_uploads()

    if not pending_images:
        print("INFO: No pending uploads found.")
        return

    print(f"INFO: Found {len(pending_images)} pending uploads.\n")

    with requests.Session() as session:
        for doc in pending_images:
            items_id = doc.id
            data = doc.to_dict() or {}
            image_url = data.get("imageUrl")

            if not image_url:
                print(f"WARNING: No imageUrl in document: {items_id}")
                continue

            print(f"PROCESSING: {items_id} | URL: {image_url}")

            now = datetime.now()
            timestamp_file = now.strftime("%Y-%m-%d_%H-%M-%S")
            timestamp_for_now = now.strftime("%Y-%m-%d %H:%M:%S")

            local_path = None
            processed_path = None

            try:
                # 1. Download
                local_path = download_image(session, image_url, TEMP_DIR)
                print(f"INFO: Downloaded to: {local_path.as_posix()}")

                # 2. Face recognition
                image_with_boxes, headcount, known_ids, unknowns = process_image(local_path)
                print(f"INFO: Headcount: {headcount} | Known: {known_ids} | Unknown: {unknowns}")

                # 3. Save processed image
                processed_path = save_processed_image(image_with_boxes, TEMP_DIR, timestamp_file)

                # 4. Upload processed image
                processed_image_url = upload_to_cloudinary(processed_path, timestamp_file)

                # 5. Attendance
                if known_ids:
                    mark_attendance(
                        items_id=items_id,
                        image_url=image_url,
                        processed_image_url=processed_image_url,
                        known_ids=[str(k) for k in known_ids],
                        timestamp_for_now=timestamp_for_now,
                    )
                else:
                    print("INFO: No students detected, skipping attendance marking.")

                # 6. Update upload document
                update_upload_document(
                    items_id=items_id,
                    processed_image_url=processed_image_url,
                    headcount=headcount,
                )

            except Exception as e:
                print(f"ERROR: Failed to process upload {items_id}: {e}")

            finally:
                cleanup_files(local_path, processed_path)
                print("INFO: Cleaned up local files.\n")

    print("DONE: All pending uploads processed.")


if __name__ == "__main__":
    process_pending_uploads()
