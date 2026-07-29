from pydantic import BaseModel
from typing import List, Optional

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str
    role: str = "client"  # "coach" or "client"



class UserProfile(BaseModel):
    user_id: str
    name: str
    age: int
    height: float
    weight: float
    goal_weight: float
    gender: str  # "Male" or "Female"

class WorkoutDay(BaseModel):
    calories: float
    duration: float
    heart_rate: float
    intensity: float


class PredictionRequest(BaseModel):
    user_id: str
    name: str
    age: int
    height: float
    weight: float
    goal_weight: float
    gender: str
    exercise: str       # "Cardio", "Strength", "Mixed"
    weather: str        # "Sunny", "Cloudy", "Rainy"
    weekly_data: List[WorkoutDay]  # 7 days

class SaveResultRequest(BaseModel):
    user_id: str
    name: str
    age: int
    weight: float
    goal_weight: float
    bmi: float
    risk_level: str
    risk_label: str
    probabilities: List[float]
    protein_intake: float
    weight_loss_rate: float
    avg_calories: float
    avg_duration: float
    avg_heart_rate: float
    avg_intensity: float
    exercise: str
    weather: str

class OnboardRequest(BaseModel):
    user_id: str
    profile: UserProfile
    weekly_data: List[WorkoutDay]
    exercise: str
    weather: str

class LinkCoachRequest(BaseModel):
    client_id: str
    coach_code: str

class UnlinkClientRequest(BaseModel):
    coach_id: str
    client_id: str

class SendMessageRequest(BaseModel):
    sender_id: str
    receiver_id: str
    content: str
    msg_type: str = "message"  # "suggestion", "question", "bot_reply", "message"

class MarkReadRequest(BaseModel):
    user_id: str
    sender_id: str

class BotQueryRequest(BaseModel):
    user_id: str
    question: str

