import os
import json

def load_enrollments(directory = 'enrollments'):
    known_faces = []
    for file in os.listdir(directory):
        if file.endswith(".json"):
            with open(os.path.join(directory, file), 'r') as f:
                data = json.load(f)
                for emb in data.get("encodings", []):
                    known_faces.append({
                        "name": data.get("name", ""),
                        "class": data.get("class", ""),
                        "student_id": data.get("student_id", ""),
                        "embedding": emb
                    })
    return known_faces

def save_embeddings(student_id, name, student_class, embeddings, directory):
    os.makedirs(directory, exist_ok=True)
    filename = f"{student_id}_{name.replace(' ', '_')}.json"
    filepath = os.path.join(directory, filename)

    with open(filepath, 'w') as f:
        json.dump({
            "student_id": student_id,
            "name": name,
            "class": student_class,
            "encodings": embeddings
        }, f, indent=2)

    return filepath