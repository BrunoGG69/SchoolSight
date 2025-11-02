import os
import json

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