import joblib
import numpy as np
import pandas as pd
from schemas import PredictionRequest

# Load model once at startup
try:
    model = joblib.load("muscle_loss_model.pkl")
    print("[SUCCESS] Model loaded successfully")
except Exception as e:
    model = None
    print(f"[WARNING] Model not found: {e}")

EXERCISE_MAP = {"Cardio": 0, "Strength": 1, "Mixed": 2}
GENDER_MAP   = {"Male": 0, "Female": 1}
WEATHER_MAP  = {"Sunny": 0, "Cloudy": 1, "Rainy": 2}
RISK_LABELS  = {0: "Low", 1: "Moderate", 2: "High"}

def predict_risk(data: PredictionRequest) -> dict:
    weekly = data.weekly_data

    avg_cal  = float(np.mean([d.calories   for d in weekly]))
    avg_dur  = float(np.mean([d.duration   for d in weekly]))
    avg_hr   = float(np.mean([d.heart_rate for d in weekly]))
    avg_int  = float(np.mean([d.intensity  for d in weekly]))

    bmi      = data.weight / ((data.height / 100) ** 2)
    wlr      = (data.weight - data.goal_weight) / 7
    protein  = data.weight * 1.6

    input_df = pd.DataFrame({
        "id":                 [int(data.user_id) if data.user_id.isdigit() else 0],
        "exercise":           [EXERCISE_MAP.get(data.exercise, 2)],
        "calories_burn":      [avg_cal],
        "dream_weight":       [data.goal_weight],
        "actual_weight":      [data.weight],
        "age":                [data.age],
        "gender":             [GENDER_MAP.get(data.gender, 0)],
        "duration":           [avg_dur],
        "heart_rate":         [avg_hr],
        "bmi":                [bmi],
        "weather_conditions": [WEATHER_MAP.get(data.weather, 0)],
        "exercise_intensity": [avg_int],
        "weight_loss_rate":   [wlr],
        "protein_intake":     [protein],
    })

    if model is None:
        # Demo mode
        prediction   = 1
        probability  = [0.10, 0.65, 0.25]
    else:
        prediction  = int(model.predict(input_df)[0])
        probability = model.predict_proba(input_df)[0].tolist()

    return {
        "risk_level":        str(prediction),
        "risk_label":        RISK_LABELS[prediction],
        "probabilities":     probability,
        "bmi":               round(bmi, 2),
        "weight_loss_rate":  round(wlr, 4),
        "protein_intake":    round(protein, 2),
        "avg_calories":      round(avg_cal, 2),
        "avg_duration":      round(avg_dur, 2),
        "avg_heart_rate":    round(avg_hr, 2),
        "avg_intensity":     round(avg_int, 2),
    }

