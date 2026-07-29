import pytest
import random
import os
import sys
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from model import predict_risk
from schemas import UserProfile

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_model_prediction():
    """Test the Machine Learning risk prediction model with high risk inputs."""
    from schemas import PredictionRequest, WorkoutDay
    req = PredictionRequest(
        user_id="123",
        name="John",
        age=45,
        height=175.0,
        weight=85.0,
        goal_weight=75.0,
        gender="Male",
        exercise="Mixed",
        weather="Sunny",
        weekly_data=[WorkoutDay(calories=400, duration=30, heart_rate=130, intensity=5)] * 7
    )
    result = predict_risk(req)
    assert "risk_score" in result or "risk_level" in result
    assert "risk_level" in result
    if "risk_score" in result:
        assert 0 <= result["risk_score"] <= 100
    assert result["risk_label"] in ["Low", "Moderate", "High"]

def test_registration_and_login_flow(client):
    """Test registering coach and client users and authenticating."""
    rand_id = random.randint(10000, 99999)
    coach_uname = f"pytest_coach_{rand_id}"
    client_uname = f"pytest_client_{rand_id}"
    password = "pass_pytest_123"

    # Register Coach
    res_coach = client.post("/register", json={"username": coach_uname, "password": password, "role": "coach"})
    assert res_coach.status_code == 200
    c_data = res_coach.json()
    assert c_data["success"] is True
    assert "user_id" in c_data["user"]
    assert "coach_code" in c_data["user"]

    # Register Client
    res_client = client.post("/register", json={"username": client_uname, "password": password, "role": "client"})
    assert res_client.status_code == 200
    cl_data = res_client.json()
    assert cl_data["success"] is True
    assert "user_id" in cl_data["user"]

    # Login Coach
    res_login = client.post("/login", json={"username": coach_uname, "password": password})
    assert res_login.status_code == 200
    assert res_login.json()["success"] is True

    # Invalid Login
    res_bad = client.post("/login", json={"username": coach_uname, "password": "wrongpassword"})
    assert res_bad.status_code == 200
    assert res_bad.json()["success"] is False

def test_coach_client_linking_and_setup(client):
    """Test linking client to coach via coach code and running user setup."""
    rand_id = random.randint(10000, 99999)
    coach_uname = f"link_coach_{rand_id}"
    client_uname = f"link_client_{rand_id}"
    password = "password123"

    # Register both
    c_user = client.post("/register", json={"username": coach_uname, "password": password, "role": "coach"}).json()["user"]
    cl_user = client.post("/register", json={"username": client_uname, "password": password, "role": "client"}).json()["user"]

    coach_id = c_user["user_id"]
    coach_code = c_user["coach_code"]
    client_id = cl_user["user_id"]

    # Link client to coach
    res_link = client.post("/coach/link", json={"client_id": client_id, "coach_code": coach_code})
    assert res_link.status_code == 200
    assert res_link.json()["success"] is True

    # Check client's coach info
    res_info = client.get(f"/client/coach/{client_id}")
    assert res_info.status_code == 200
    assert res_info.json()["success"] is True
    assert res_info.json()["data"]["coach_id"] == coach_id

    # Onboarding setup
    setup_payload = {
        "user_id": client_id,
        "profile": {
            "user_id": client_id,
            "name": client_uname,
            "age": 29,
            "height": 180,
            "weight": 80.0,
            "goal_weight": 75.0,
            "gender": "Male"
        },
        "workouts_per_week": 4,
        "avg_duration": 45,
        "avg_intensity": 7
    }
    res_setup = client.post("/setup", json=setup_payload)
    assert res_setup.status_code == 200
    assert res_setup.json()["success"] is True

def test_messaging_and_unread_counts(client):
    """Test coach sending message to client, unread counts, and marking read."""
    rand_id = random.randint(10000, 99999)
    c_user = client.post("/register", json={"username": f"msg_coach_{rand_id}", "password": "pwd", "role": "coach"}).json()["user"]
    cl_user = client.post("/register", json={"username": f"msg_client_{rand_id}", "password": "pwd", "role": "client"}).json()["user"]

    coach_id = c_user["user_id"]
    client_id = cl_user["user_id"]

    msg_text = "Keep up the great workout progress!"
    res_send = client.post("/messages/send", json={
        "sender_id": coach_id,
        "receiver_id": client_id,
        "content": msg_text,
        "msg_type": "suggestion"
    })
    assert res_send.status_code == 200
    assert res_send.json()["success"] is True

    # Retrieve messages
    res_get = client.get(f"/messages/{client_id}/{coach_id}")
    assert res_get.status_code == 200
    msgs = res_get.json()["messages"]
    assert len(msgs) > 0
    assert msgs[-1]["content"] == msg_text

    # Check unread
    res_unread = client.get(f"/messages/unread/{client_id}")
    assert res_unread.status_code == 200
    assert res_unread.json()["count"] > 0

    # Mark read
    res_read = client.post("/messages/read", json={"user_id": client_id, "sender_id": coach_id})
    assert res_read.status_code == 200

    # Verify unread clear
    res_unread_clear = client.get(f"/messages/unread/{client_id}")
    assert res_unread_clear.json()["count"] == 0

def test_ai_fitness_bot_query(client):
    """Test AI Bot responding to user questions."""
    rand_id = random.randint(10000, 99999)
    cl_user = client.post("/register", json={"username": f"bot_user_{rand_id}", "password": "pwd", "role": "client"}).json()["user"]
    client_id = cl_user["user_id"]

    bot_res = client.post("/bot/ask", json={
        "user_id": client_id,
        "question": "What is my recommended protein intake?"
    })
    assert bot_res.status_code == 200
    bot_json = bot_res.json()
    assert bot_json["success"] is True
    assert "reply" in bot_json
    assert len(bot_json["reply"]) > 0
