# import cv2
# import os
# from datetime import datetime
# from face_recognition_utils.recognize import recognize_faces_from_image
#
# save_dir = "captured_images"
# os.makedirs(save_dir, exist_ok=True)
#
# cap = cv2.VideoCapture(2)
# if not cap.isOpened():
#     print("[ERROR] Could not access webcam.")
#     exit()
#
# ret, frame = cap.read()
# cap.release()
#
# if not ret:
#     print("[ERROR] Failed to capture frame.")
#     exit()
#
# timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
# img_path = os.path.join(save_dir, f"capture_{timestamp}.jpg")
# cv2.imwrite(img_path, frame)
# print(f"[INFO] Image saved to {img_path}")
#
# # Recognize faces
# image_with_boxes, headcount, known_ids, unknowns = recognize_faces_from_image(img_path)
#
# # Show result
# cv2.imshow("Recognition Result", image_with_boxes)
# cv2.waitKey(0)
# cv2.destroyAllWindows()

import cv2
import os
from face_recognition_utils.recognize import recognize_faces_from_image

img_path = os.path.join(os.path.dirname(__file__), '..','backend', 'img.png')
img_path = os.path.abspath(img_path)

if not os.path.isfile(img_path):
    print(f"[ERROR] Image not found at: {img_path}")
    exit()

# === Run recognition ===
image_with_boxes, headcount, known_ids, unknowns = recognize_faces_from_image(img_path)

# === Display result ===
print(f"[INFO] Headcount: {headcount}")
print(f"[INFO] Known IDs: {known_ids}")
print(f"[INFO] Unknowns: {unknowns} detected")

cv2.imshow("Recognition Result", image_with_boxes)
cv2.waitKey(0)
cv2.destroyAllWindows()


