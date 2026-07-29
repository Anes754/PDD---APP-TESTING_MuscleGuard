from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from schemas import (
    UserProfile, PredictionRequest, SaveResultRequest, UserLogin, OnboardRequest, UserRegister,
    LinkCoachRequest, UnlinkClientRequest, SendMessageRequest, MarkReadRequest, BotQueryRequest
)
import os

from model import predict_risk
from database import (
    save_prediction, get_history, upsert_profile, get_profile, save_many_predictions, authenticate_user, create_user,
    get_coach_by_code, add_client_to_coach, remove_client_from_coach, get_coach_clients, get_client_coach,
    send_message as db_send_message, get_messages as db_get_messages, get_unread_count, mark_messages_read
)
from bot import ask_bot
import uvicorn

app = FastAPI(title="MuscleGuard AI API", version="1.0.0")

# Mount frontend static files
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=frontend_path, html=True), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return RedirectResponse(url="/static/login.html")

@app.post("/login")
async def login(data: UserLogin):
    user = await authenticate_user(data.username, data.password)
    if not user:
        return {"success": False, "message": "Invalid username or password"}
    
    # Check if profile exists
    profile = await get_profile(user["user_id"])
    return {"success": True, "user": user, "profile_exists": profile is not None}

@app.post("/register")
async def register(data: UserRegister):
    user = await create_user(data.username, data.password, data.role)
    if not user:
        return {"success": False, "message": "Username already exists"}
    
    return {"success": True, "user": user}

@app.get("/profile/{user_id}")
async def get_user_profile(user_id: str):
    profile = await get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True, "data": profile}

@app.post("/profile")
async def update_profile(data: UserProfile):
    try:
        await upsert_profile(data.dict())
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/setup")
async def setup_onboarding(data: dict):
    """
    Expects: { user_id, profile, workouts_per_week, avg_duration, avg_intensity }
    Generates 7 baseline days.
    """
    try:
        user_id = data["user_id"]
        # Save profile
        await upsert_profile(data["profile"])
        
        # Generate baseline
        num_workouts = int(data.get("workouts_per_week", 3))
        avg_dur = float(data.get("avg_duration", 30))
        avg_int = int(data.get("avg_intensity", 5))
        
        baseline_records = []
        # Distribute workouts across 7 days
        for i in range(7):
            is_workout = i < num_workouts
            record = {
                "user_id": user_id,
                "name": data["profile"]["name"],
                "age": data["profile"]["age"],
                "weight": data["profile"]["weight"],
                "goal_weight": data["profile"]["goal_weight"],
                "bmi": data["profile"]["weight"] / ((data["profile"]["height"]/100)**2),
                "risk_level": "1", # Default moderate
                "risk_label": "Moderate",
                "probabilities": [0.1, 0.7, 0.2],
                "protein_intake": data["profile"]["weight"] * 1.6,
                "weight_loss_rate": (data["profile"]["weight"] - data["profile"]["goal_weight"]) / 7,
                "avg_calories": 400 if is_workout else 0,
                "avg_duration": avg_dur if is_workout else 0,
                "avg_heart_rate": 130 if is_workout else 70,
                "avg_intensity": avg_int if is_workout else 1,
                "exercise": "Mixed",
                "weather": "Sunny"
            }
            baseline_records.append(record)
        
        await save_many_predictions(baseline_records)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/onboard")
async def onboard_full(data: OnboardRequest):
    """
    Manual 7-day onboarding.
    """
    try:
        # 1. Save Profile
        await upsert_profile(data.profile.dict())
        
        # 2. Generate History from the 7 days
        # We'll save 7 historical records, each representing the state at that day
        records = []
        for i in range(1, 8):
            current_window = data.weekly_data[:i]
            # Pad with zeros if less than 7 for prediction, but for history we just want stats
            avg_cal = sum(d.calories for d in current_window) / i
            avg_dur = sum(d.duration for d in current_window) / i
            avg_hr  = sum(d.heart_rate for d in current_window) / i
            avg_int = sum(d.intensity for d in current_window) / i
            
            # For the 7th day, we run a real prediction
            if i == 7:
                pred_req = PredictionRequest(
                    user_id=data.user_id,
                    name=data.profile.name,
                    age=data.profile.age,
                    height=data.profile.height,
                    weight=data.profile.weight,
                    goal_weight=data.profile.goal_weight,
                    gender=data.profile.gender,
                    exercise=data.exercise,
                    weather=data.weather,
                    weekly_data=data.weekly_data
                )
                res = predict_risk(pred_req)
                record = {
                    "user_id": data.user_id,
                    "name": data.profile.name,
                    "age": data.profile.age,
                    "weight": data.profile.weight,
                    "goal_weight": data.profile.goal_weight,
                    "bmi": res["bmi"],
                    "risk_level": res["risk_level"],
                    "risk_label": res["risk_label"],

                    "probabilities": res["probabilities"],
                    "protein_intake": res["protein_intake"],
                    "weight_loss_rate": res["weight_loss_rate"],
                    "avg_calories": res["avg_calories"],
                    "avg_duration": res["avg_duration"],
                    "avg_heart_rate": res["avg_heart_rate"],
                    "avg_intensity": res["avg_intensity"],
                    "exercise": data.exercise,
                    "weather": data.weather
                }
            else:
                # Placeholder history for days 1-6
                record = {
                    "user_id": data.user_id,
                    "name": data.profile.name,
                    "age": data.profile.age,
                    "weight": data.profile.weight,
                    "goal_weight": data.profile.goal_weight,
                    "bmi": data.profile.weight / ((data.profile.height/100)**2),
                    "risk_level": "1",
                    "risk_label": "Moderate",
                    "probabilities": [0.1, 0.7, 0.2],
                    "protein_intake": data.profile.weight * 1.6,
                    "weight_loss_rate": (data.profile.weight - data.profile.goal_weight) / 7,
                    "avg_calories": avg_cal,
                    "avg_duration": avg_dur,
                    "avg_heart_rate": avg_hr,
                    "avg_intensity": avg_int,
                    "exercise": data.exercise,
                    "weather": data.weather
                }
            records.append(record)
            
        await save_many_predictions(records)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/predict")
def predict(data: PredictionRequest):
    try:
        result = predict_risk(data)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save")
async def save(data: SaveResultRequest):
    try:
        doc_id = await save_prediction(data)
        return {"success": True, "doc_id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history/{user_id}")
async def history(user_id: str):
    try:
        records = await get_history(user_id)
        return {"success": True, "data": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Coach Client Management Endpoints ──

@app.get("/coach/clients/{coach_id}")
async def get_clients(coach_id: str):
    try:
        clients = await get_coach_clients(coach_id)
        return {"success": True, "clients": clients}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/coach/client-progress/{client_id}")
async def client_progress(client_id: str):
    try:
        profile = await get_profile(client_id)
        history = await get_history(client_id)
        return {"success": True, "profile": profile, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/coach/link")
async def link_coach(data: LinkCoachRequest):
    try:
        coach = await get_coach_by_code(data.coach_code)
        if not coach:
            return {"success": False, "message": "Invalid Coach Code or coach does not exist"}
        
        success = await add_client_to_coach(coach["user_id"], data.client_id)
        if success:
            return {"success": True, "message": f"Successfully linked to Coach {coach['name']}", "coach": coach}
        return {"success": False, "message": "Already linked to this coach"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/coach/unlink")
async def unlink_coach(data: UnlinkClientRequest):
    try:
        success = await remove_client_from_coach(data.coach_id, data.client_id)
        if success:
            return {"success": True, "message": "Successfully unlinked client"}
        return {"success": False, "message": "Client-Coach relationship not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/client/coach/{client_id}")
async def client_coach(client_id: str):
    try:
        coach = await get_client_coach(client_id)
        return {"success": True, "data": coach}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Message System Endpoints ──

@app.post("/messages/send")
async def send_msg(data: SendMessageRequest):
    try:
        msg_id = await db_send_message(data.sender_id, data.receiver_id, data.content, data.msg_type)
        return {"success": True, "message_id": msg_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/messages/unread/{user_id}")
async def get_unread(user_id: str):
    try:
        count = await get_unread_count(user_id)
        return {"success": True, "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/messages/{user_id}/{other_id}")
async def get_msgs(user_id: str, other_id: str):
    try:
        messages = await db_get_messages(user_id, other_id)
        return {"success": True, "messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/messages/read")
async def mark_read(data: MarkReadRequest):
    try:
        await mark_messages_read(data.user_id, data.sender_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Local Data-Driven AI Bot Endpoint ──

@app.post("/bot/ask")
async def ask_bot_endpoint(data: BotQueryRequest):
    try:
        reply = await ask_bot(data.user_id, data.question)
        # Auto-save query and response in message history for convenience
        await db_send_message(sender_id=data.user_id, receiver_id="bot", content=data.question, msg_type="question")
        await db_send_message(sender_id="bot", receiver_id=data.user_id, content=reply, msg_type="bot_reply")
        return {"success": True, "reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
