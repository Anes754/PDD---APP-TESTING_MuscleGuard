import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
from schemas import SaveResultRequest
import os

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    key_path = os.path.join(os.path.dirname(__file__), "firebase_key.json")
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

async def save_prediction(data: SaveResultRequest) -> str:
    """Save prediction result to Firestore."""
    doc_ref = db.collection("predictions").document()
    payload = {
        "user_id":           data.user_id,
        "name":              data.name,
        "age":               data.age,
        "weight":            data.weight,
        "goal_weight":       data.goal_weight,
        "bmi":               data.bmi,
        "risk_level":        data.risk_level,
        "risk_label":        data.risk_label,
        "probabilities":     data.probabilities,
        "protein_intake":    data.protein_intake,
        "weight_loss_rate":  data.weight_loss_rate,
        "avg_calories":      data.avg_calories,
        "avg_heart_rate":    data.avg_heart_rate,
        "avg_intensity":     data.avg_intensity,
        "exercise":          data.exercise,
        "weather":           data.weather,
        "timestamp":         datetime.utcnow().isoformat(),
    }
    doc_ref.set(payload)
    return doc_ref.id

async def get_history(user_id: str) -> list:
    """Get all predictions for a user."""
    docs = (
        db.collection("predictions")
        .where("user_id", "==", user_id)
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(10)
        .stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]
