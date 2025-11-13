import firebase_admin
from firebase_admin import credentials, firestore
import os

# Use absolute path for the JSON
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
cred_path = os.path.join(BASE_DIR, "firebase_config.json")

# Initialize app only once
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()
