from firebase_utils import db

data = [
    {
        "student_id": "7610",
        "name": "Prathamesh Prabhakar",
        "class": "12D",
        "attendance": []
    },
    {
        "student_id": "7611",
        "name": "Aarav Deshmukh",
        "class": "12D",
        "attendance": []
    },
    {
        "student_id": "7612",
        "name": "Saanvi Kulkarni",
        "class": "12D",
        "attendance": []
    },
    {
        "student_id": "7613",
        "name": "Rohan Patil",
        "class": "12D",
        "attendance": []
    },
    {
        "student_id": "7614",
        "name": "Isha Joshi",
        "class": "12D",
        "attendance": []
    }
]

for i in data:
    student_id = i["student_id"]
    name = i["name"]
    student_class = i["class"]

    # Check if the student already exists
    doc_ref = db.collection("students").document(student_id)
    if doc_ref.get().exists:
        print(f"[INFO] Student {student_id} already exists. Skipping.")
        continue

    # Add new student data
    doc_ref.set({
        "name": name,
        "class": student_class,
        "attendance": []
    })
    print(f"[INFO] Added student {student_id}: {name} in class {student_class}.")
