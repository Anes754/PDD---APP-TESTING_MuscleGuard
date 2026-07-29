from database import get_profile, get_history

RISK_LABELS = {"0": "Low", "1": "Moderate", "2": "High"}

async def ask_bot(user_id: str, question: str) -> str:
    """Analyze client data and generate high-quality personalized coaching answers using local heuristics."""
    profile = await get_profile(user_id)
    history = await get_history(user_id)
    
    if not profile:
        return "I don't have your profile data yet. Please complete your profile setup first."
    
    q = question.lower()
    latest = history[0] if history else {}
    
    # Build context
    name = profile.get("name", "there")
    weight = profile.get("weight", 0)
    goal = profile.get("goal_weight", 0)
    height = profile.get("height", 170)
    age = profile.get("age", 25)
    bmi = latest.get("bmi", weight / ((height/100)**2) if height else 0)
    risk_label = latest.get("risk_label", "Unknown")
    protein = latest.get("protein_intake", weight * 1.6)
    wlr = latest.get("weight_loss_rate", 0)
    avg_cal = latest.get("avg_calories", 0)
    avg_int = latest.get("avg_intensity", 0)
    avg_hr = latest.get("avg_heart_rate", 0)
    avg_dur = latest.get("avg_duration", 0)
    
    # Protein questions
    if any(kw in q for kw in ["protein", "eat", "diet", "nutrition", "food", "meal"]):
        protein_per_kg = protein / weight if weight else 0
        if protein_per_kg >= 1.8:
            return f"Hi {name}! Your protein intake is {protein:.0f}g/day ({protein_per_kg:.1f}g/kg). This is excellent for muscle preservation! Keep it up. Make sure to spread it across 4-5 meals for optimal absorption."
        elif protein_per_kg >= 1.4:
            return f"Hi {name}! You're consuming {protein:.0f}g/day ({protein_per_kg:.1f}g/kg). This is adequate but could be better. For your weight loss goal ({weight}kg → {goal}kg), I'd recommend increasing to 1.8-2.0g/kg ({weight*1.8:.0f}-{weight*2:.0f}g/day) to maximize muscle retention."
        else:
            return f"Hi {name}, your protein intake of {protein:.0f}g/day ({protein_per_kg:.1f}g/kg) is below the recommended range. You should aim for at least 1.6g/kg ({weight*1.6:.0f}g/day). Good sources: chicken breast, eggs, Greek yogurt, whey protein, lentils."
    
    # Risk questions
    if any(kw in q for kw in ["risk", "danger", "safe", "muscle loss", "losing muscle"]):
        probs = latest.get("probabilities", [0.33, 0.33, 0.33])
        if risk_label == "Low":
            return f"Great news, {name}! Your muscle loss risk is LOW ({probs[0]*100:.0f}% confidence). You're in a safe zone. Keep maintaining your current routine and protein intake of {protein:.0f}g/day."
        elif risk_label == "Moderate":
            return f"{name}, your muscle loss risk is MODERATE ({probs[1]*100:.0f}% confidence). This means you should pay attention to: 1) Keep protein at {weight*1.8:.0f}g+ daily, 2) Maintain strength training intensity, 3) Don't cut calories too aggressively. Your current weight loss rate is {abs(wlr):.2f}kg/day."
        else:
            return f"⚠️ {name}, your muscle loss risk is HIGH ({probs[2]*100:.0f}% confidence). Immediate recommendations: 1) Increase protein to {weight*2:.0f}g/day, 2) Reduce cardio and focus on strength training, 3) Slow your weight loss rate (currently {abs(wlr):.2f}kg/day — aim for <0.14kg/day), 4) Consider consulting a nutritionist."
    
    # Workout / exercise questions
    if any(kw in q for kw in ["workout", "exercise", "training", "gym", "cardio", "strength", "intensity"]):
        if avg_int < 4:
            return f"{name}, your average workout intensity is {avg_int:.1f}/10 — this is quite low. To preserve muscle during weight loss, aim for intensity 5-7/10. Include compound movements (squats, deadlifts, bench press) at least 3x/week. You're burning {avg_cal:.0f} calories per session on average."
        elif avg_int > 7:
            return f"{name}, your average intensity is {avg_int:.1f}/10 — that's high! While this is great for fitness, make sure you're recovering properly. Your average heart rate is {avg_hr:.0f}bpm. Consider adding 1-2 rest days per week and ensure you're sleeping 7-9 hours."
        else:
            return f"Your workout routine looks solid, {name}! Intensity: {avg_int:.1f}/10, Avg Calories: {avg_cal:.0f}/session, Avg Duration: {avg_dur:.0f}min, Avg HR: {avg_hr:.0f}bpm. Keep this consistency for best muscle preservation results."
    
    # Weight / BMI questions
    if any(kw in q for kw in ["weight", "bmi", "fat", "body", "overweight", "underweight", "goal"]):
        diff = weight - goal
        if diff > 0:
            weeks = diff / (abs(wlr) * 7) if wlr != 0 else 0
            return f"{name}, you're currently {weight}kg with a goal of {goal}kg (need to lose {diff:.1f}kg). Your BMI is {bmi:.1f}. At your current rate ({abs(wlr):.2f}kg/day), you'll reach your goal in approximately {weeks:.0f} weeks. {'This pace is safe for muscle preservation.' if abs(wlr) <= 0.14 else 'Consider slowing down to preserve more muscle.'}"
        else:
            return f"{name}, you're at {weight}kg with a goal of {goal}kg. Your BMI is {bmi:.1f}. You're already at or below your goal! Focus on maintenance and body recomposition rather than further weight loss."
    
    # Progress questions  
    if any(kw in q for kw in ["progress", "improve", "better", "worse", "trend", "how am i"]):
        if len(history) >= 2:
            prev_risk = history[-1].get("risk_label", "Unknown")
            curr_risk = risk_label
            prev_cal = history[-1].get("avg_calories", 0)
            return f"""Here's your progress summary, {name}:
• Current Risk: {curr_risk} (was {prev_risk})
• Calories: {avg_cal:.0f}/session (started at {prev_cal:.0f})
• Intensity: {avg_int:.1f}/10
• BMI: {bmi:.1f}
• Protein: {protein:.0f}g/day
Overall: {"You're improving! Keep it up!" if curr_risk <= prev_risk else "Some areas need attention. Focus on protein and intensity."}"""
        return f"Hi {name}! Current stats — Risk: {risk_label}, BMI: {bmi:.1f}, Protein: {protein:.0f}g/day, Intensity: {avg_int:.1f}/10. Log more workouts to see trends!"
    
    # Coach questions
    if any(kw in q for kw in ["coach", "trainer", "help", "advice", "suggest"]):
        return f"I'm your AI assistant, {name}! While your coach can give personalized advice, here's what I can tell from your data: Risk Level: {risk_label}, BMI: {bmi:.1f}, Protein: {protein:.0f}g/day. Ask me about your diet, workouts, risk level, weight goals, or progress!"
    
    # Sleep / recovery
    if any(kw in q for kw in ["sleep", "recovery", "rest", "tired", "fatigue"]):
        return f"{name}, recovery is crucial for muscle preservation! Based on your intensity ({avg_int:.1f}/10) and heart rate ({avg_hr:.0f}bpm), I recommend: 1) 7-9 hours of sleep, 2) At least 2 rest days per week, 3) Post-workout protein within 30 minutes, 4) Stay hydrated (aim for {weight*0.035:.1f}L of water daily)."
    
    # Default response
    return f"Hi {name}! I can help you with questions about:\n• 🥩 Protein & diet\n• ⚠️ Muscle loss risk\n• 🏋️ Workout advice\n• ⚖️ Weight & BMI goals\n• 📊 Your progress\n• 😴 Recovery & sleep\n\nJust ask me anything about these topics! Your current stats: Risk={risk_label}, BMI={bmi:.1f}, Weight={weight}kg."
