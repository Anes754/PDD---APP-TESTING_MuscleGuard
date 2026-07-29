from datetime import datetime
from schemas import SaveResultRequest
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid

# Load env vars
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    # Fallback for local testing if env is missing
    MONGO_URL = "mongodb://localhost:27017"

client = AsyncIOMotorClient(MONGO_URL)
db = client["muscleguard"]

# Collections
predictions_col = db["predictions"]
profiles_col = db["profiles"]
users_col = db["users"]
coach_clients_col = db["coach_clients"]
messages_col = db["messages"]

async def create_user(username, password, role="client") -> dict:
    """Create a new user with a specified role and return the user object."""
    # Check if user exists
    existing = await users_col.find_one({"username": username})
    if existing:
        return None
    
    user_id = str(uuid.uuid4())[:8] # Simple short ID
    user_doc = {
        "user_id": user_id,
        "username": username,
        "password": password, # In production, use hashing
        "role": role,
        "created_at": datetime.utcnow().isoformat()
    }
    if role == "coach":
        user_doc["coach_code"] = str(uuid.uuid4())[:6].upper()
        
    await users_col.insert_one(user_doc)
    result = {"user_id": user_id, "name": username, "role": role}
    if role == "coach":
        result["coach_code"] = user_doc["coach_code"]
    return result

async def authenticate_user(username, password) -> dict:
    """Check credentials and return user object with role or None."""
    user = await users_col.find_one({"username": username, "password": password})
    if user:
        result = {
            "user_id": user["user_id"], 
            "name": user["username"],
            "role": user.get("role", "client")
        }
        if user.get("coach_code"):
            result["coach_code"] = user["coach_code"]
        return result
    return None

async def save_prediction(data: SaveResultRequest) -> str:
    """Save a single prediction result."""
    payload = data.dict()
    payload["timestamp"] = datetime.utcnow().isoformat()
    result = await predictions_col.insert_one(payload)
    return str(result.inserted_id)

async def save_many_predictions(records: list):
    """Save multiple records (for onboarding)."""
    if not records:
        return
    for r in records:
        r["timestamp"] = datetime.utcnow().isoformat()
    await predictions_col.insert_many(records)

async def get_history(user_id: str) -> list:
    """Get the last 10 predictions for a user."""
    cursor = predictions_col.find({"user_id": str(user_id)}).sort("timestamp", -1).limit(10)
    history = await cursor.to_list(length=10)
    # Convert ObjectId to string if necessary
    for doc in history:
        doc["_id"] = str(doc["_id"])
    return history

async def upsert_profile(profile: dict):
    """Update or insert a user profile."""
    user_id = str(profile.get("user_id"))
    await profiles_col.update_one(
        {"user_id": user_id},
        {"$set": profile},
        upsert=True
    )

async def get_profile(user_id: str):
    """Retrieve a user profile."""
    doc = await profiles_col.find_one({"user_id": str(user_id)})
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ── Coach Client Linking ──

async def get_coach_by_code(coach_code: str) -> dict:
    """Find a coach by their unique coach code."""
    user = await users_col.find_one({"coach_code": coach_code.upper(), "role": "coach"})
    if user:
        return {"user_id": user["user_id"], "name": user["username"]}
    return None

async def add_client_to_coach(coach_id: str, client_id: str) -> bool:
    """Link a client to a coach."""
    existing = await coach_clients_col.find_one({"coach_id": coach_id, "client_id": client_id})
    if existing:
        return False
    
    # We enforce 1 client -> 1 coach by unlinking the client from any previous coach first
    await coach_clients_col.delete_many({"client_id": client_id})
    
    await coach_clients_col.insert_one({
        "coach_id": coach_id,
        "client_id": client_id,
        "linked_at": datetime.utcnow().isoformat()
    })
    
    # Also update the client's profile with coach_id
    await profiles_col.update_one({"user_id": client_id}, {"$set": {"coach_id": coach_id}}, upsert=False)
    return True

async def remove_client_from_coach(coach_id: str, client_id: str) -> bool:
    """Unlink a client from a coach."""
    result = await coach_clients_col.delete_one({"coach_id": coach_id, "client_id": client_id})
    if result.deleted_count > 0:
        await profiles_col.update_one({"user_id": client_id}, {"$unset": {"coach_id": ""}})
        return True
    return False

async def get_coach_clients(coach_id: str) -> list:
    """Get list of clients linked to a coach with their profiles and latest predictions."""
    cursor = coach_clients_col.find({"coach_id": coach_id})
    links = await cursor.to_list(length=100)
    clients = []
    for link in links:
        profile = await profiles_col.find_one({"user_id": link["client_id"]})
        # Get latest prediction for risk info
        latest_pred = await predictions_col.find_one({"user_id": link["client_id"]}, sort=[("timestamp", -1)])
        client_info = {
            "client_id": link["client_id"],
            "linked_at": link.get("linked_at", ""),
            "profile": None,
            "latest_prediction": None
        }
        if profile:
            profile.pop("_id", None)
            client_info["profile"] = profile
        if latest_pred:
            latest_pred["_id"] = str(latest_pred["_id"])
            client_info["latest_prediction"] = latest_pred

        # Check unread messages from this client to the coach
        unread_count = await messages_col.count_documents({
            "receiver_id": str(coach_id),
            "sender_id": str(link["client_id"]),
            "read": False
        })
        client_info["unread_count"] = int(unread_count)

        clients.append(client_info)
    return clients

async def get_client_coach(client_id: str) -> dict:
    """Get the coach of a specific client."""
    link = await coach_clients_col.find_one({"client_id": client_id})
    if link:
        coach = await users_col.find_one({"user_id": link["coach_id"]})
        if coach:
            return {"coach_id": coach["user_id"], "name": coach["username"], "coach_code": coach.get("coach_code", "")}
    return None

# ── Messaging System ──

async def send_message(sender_id: str, receiver_id: str, content: str, msg_type: str = "message") -> str:
    """Send a message/suggestion between client and coach/bot."""
    doc = {
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "content": content,
        "msg_type": msg_type,
        "timestamp": datetime.utcnow().isoformat(),
        "read": False
    }
    result = await messages_col.insert_one(doc)
    return str(result.inserted_id)

async def get_messages(user_id: str, other_id: str, limit: int = 50) -> list:
    """Get the conversation history between two users."""
    cursor = messages_col.find({
        "$or": [
            {"sender_id": user_id, "receiver_id": other_id},
            {"sender_id": other_id, "receiver_id": user_id}
        ]
    }).sort("timestamp", 1).limit(limit)
    msgs = await cursor.to_list(length=limit)
    for m in msgs:
        m["_id"] = str(m["_id"])
    return msgs

async def get_unread_count(user_id: str) -> int:
    """Count unread messages for a user."""
    count = await messages_col.count_documents({"receiver_id": user_id, "read": False})
    return count

async def mark_messages_read(user_id: str, sender_id: str):
    """Mark all messages from sender_id to user_id as read."""
    await messages_col.update_many(
        {"receiver_id": user_id, "sender_id": sender_id, "read": False},
        {"$set": {"read": True}}
    )
