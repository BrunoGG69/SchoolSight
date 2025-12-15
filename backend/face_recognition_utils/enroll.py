import os
import cv2
import time
import numpy as np
from backend.firebase_utils import db
from backend.face_recognition_utils.utils import save_embeddings

def enroll_from_webcam(yolo, arcface, student_id, name, student_class, total_cycles=2, captures_per_cycle=100):
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("[ERROR] Could not open webcam.")
        return

    all_embeddings = []
    cycle = 1

    print(f"Starting enrollment for {name} ({student_id})")
    print(f"You will go through {total_cycles} capture cycles.")
    print("Press 'c' to start capture when ready, 'q' to quit.")

    while cycle <= total_cycles:
        embeddings = []
        frame_count = 0
        capturing = False

        print(f"\nCycle {cycle}/{total_cycles}: Get ready...")
        print("Move your head slowly in all directions — left, right, up, down.")
        print("Press 'c' to start automatic capture.")

        while True:
            ret, frame = cap.read()
            if not ret:
                print("[ERROR] Frame capture failed.")
                break

            frame_display = frame.copy()

            # Show info on preview window
            cv2.putText(frame_display, f"Cycle {cycle}/{total_cycles}", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
            if not capturing:
                cv2.putText(frame_display, "Press 'C' to start capture | 'Q' to quit",
                            (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
            else:
                cv2.putText(frame_display, f"Capturing... {frame_count}/{captures_per_cycle}",
                            (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

            cv2.imshow("Enrollment Preview", frame_display)
            key = cv2.waitKey(1) & 0xFF

            # Start capture
            if key == ord('c') and not capturing:
                print(f"[INFO] Starting Cycle {cycle} capture...")
                capturing = True
                time.sleep(1)

            # Quit
            if key == ord('q'):
                print("[INFO] Quitting enrollment.")
                cap.release()
                cv2.destroyAllWindows()
                return

            if capturing:
                results = yolo(frame, conf=0.3)[0]
                faces = arcface.get(frame)

                if results.boxes is not None and faces:
                    for face in faces[:1]:
                        emb = face.embedding
                        embeddings.append(np.array(emb).flatten().tolist())
                        frame_count += 1

                        # Display progress of stuff
                        cv2.rectangle(frame_display, (50, 50), (350, 120), (0, 255, 0), 2)
                        cv2.putText(frame_display, f"Captured: {frame_count}/{captures_per_cycle}",
                                    (60, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                        cv2.imshow("Enrollment Preview", frame_display)
                        cv2.waitKey(1)

                        if frame_count >= captures_per_cycle:
                            capturing = False
                            break

                # Gentle delay between frames
                time.sleep(0.25)

            # Stop when enough frames collected
            if frame_count >= captures_per_cycle:
                break

        all_embeddings.extend(embeddings)
        print(f"[INFO] Cycle {cycle} complete with {len(embeddings)} embeddings.")

        if cycle < total_cycles:
            print("\nNow step back and reposition yourself.")
            print("Press 'c' to start next cycle or 'q' to quit.")
            time.sleep(1)

        cycle += 1

    cap.release()
    cv2.destroyAllWindows()

    if all_embeddings:
        # Save locally for records
        enrollment_dir = os.path.join(os.path.dirname(__file__), '..', 'enrollments')
        enrollment_dir = os.path.abspath(enrollment_dir)
        save_path = save_embeddings(student_id, name, student_class, all_embeddings, enrollment_dir)

        # Upload to Firestore
        student_ref = db.collection("students").document(student_id)
        student_ref.set({
            "name": name,
            "class": student_class
        })

        encodings_ref = student_ref.collection("encodings")
        for idx, emb in enumerate(all_embeddings, start=1):
            enc_id = f"enc_{idx}"
            encodings_ref.document(enc_id).set({"vector": emb})

        print(f"\nCONFIRM: Enrollment complete for {name} ({student_id})")
        print(f"FILE: Local file saved to: {save_path}")
        print(f"FIREBASE: {len(all_embeddings)} embeddings uploaded to Firestore.")
    else:
        print("ERROR: No embeddings captured.")

    return {
        "student_id": student_id,
        "name": name,
        "class": student_class,
        "embeddings": all_embeddings
    }
