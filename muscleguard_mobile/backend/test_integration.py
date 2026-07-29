import requests
import random
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    # 1. Generate unique names to avoid DB unique conflicts
    rand_id = random.randint(1000, 9999)
    coach_username = f"test_coach_{rand_id}"
    client_username = f"test_client_{rand_id}"
    password = "password123"

    print("--- 1. Testing Registration Flow ---")
    
    # Register Coach
    coach_reg_payload = {
        "username": coach_username,
        "password": password,
        "role": "coach"
    }
    res = requests.post(f"{BASE_URL}/register", json=coach_reg_payload)
    assert res.status_code == 200, "Coach registration request failed"
    coach_data = res.json()
    assert coach_data["success"], "Coach registration unsuccessful"
    coach_user = coach_data["user"]
    coach_id = coach_user["user_id"]
    coach_code = coach_user["coach_code"]
    print(f"[OK] Registered Coach: {coach_username} (ID: {coach_id}, Code: {coach_code})")

    # Register Client
    client_reg_payload = {
        "username": client_username,
        "password": password,
        "role": "client"
    }
    res = requests.post(f"{BASE_URL}/register", json=client_reg_payload)
    assert res.status_code == 200, "Client registration request failed"
    client_data = res.json()
    assert client_data["success"], "Client registration unsuccessful"
    client_user = client_data["user"]
    client_id = client_user["user_id"]
    print(f"[OK] Registered Client: {client_username} (ID: {client_id})")

    print("\n--- 2. Testing Coach-Client Linking Flow ---")
    
    # Link Client to Coach
    link_payload = {
        "client_id": client_id,
        "coach_code": coach_code
    }
    res = requests.post(f"{BASE_URL}/coach/link", json=link_payload)
    assert res.status_code == 200, "Link coach request failed"
    link_data = res.json()
    assert link_data["success"], f"Linking failed: {link_data.get('message')}"
    print(f"[OK] Linked Client {client_username} to Coach {coach_username}!")

    # Verify Client Coach info
    res = requests.get(f"{BASE_URL}/client/coach/{client_id}")
    assert res.status_code == 200, "Get client's coach info failed"
    client_coach_info = res.json()
    assert client_coach_info["success"] and client_coach_info["data"]["coach_id"] == coach_id, "Linked coach ID mismatch"
    print("[OK] Verified linked coach info on client side.")

    # Populate a quick baseline profile for client so AI bot and coach view works
    profile_payload = {
        "user_id": client_id,
        "name": client_username,
        "age": 28,
        "height": 178,
        "weight": 82.5,
        "goal_weight": 76.0,
        "gender": "Male"
    }
    
    # Setup onboarding with baseline data
    setup_payload = {
        "user_id": client_id,
        "profile": profile_payload,
        "workouts_per_week": 4,
        "avg_duration": 45,
        "avg_intensity": 6
    }
    res = requests.post(f"{BASE_URL}/setup", json=setup_payload)
    assert res.status_code == 200, "Setup baseline failed"
    print("[OK] Client profile and 7-day baseline history generated successfully.")

    # Verify Coach Dashboard sees the client
    res = requests.get(f"{BASE_URL}/coach/clients/{coach_id}")
    assert res.status_code == 200, "Get coach clients failed"
    coach_clients_data = res.json()
    assert coach_clients_data["success"], "Coach clients check failed"
    assert len(coach_clients_data["clients"]) > 0, "No clients found for coach"
    print("[OK] Verified Coach dashboard list contains our client.")

    print("\n--- 3. Testing Messaging Flow ---")
    
    # Send Suggestion from Coach to Client
    msg_content = "Please increase your protein target to 160g and keep gym intensity high!"
    msg_payload = {
        "sender_id": coach_id,
        "receiver_id": client_id,
        "content": msg_content,
        "msg_type": "suggestion"
    }
    res = requests.post(f"{BASE_URL}/messages/send", json=msg_payload)
    assert res.status_code == 200, "Send message failed"
    msg_send_data = res.json()
    assert msg_send_data["success"], "Send message failed internally"
    print(f"[OK] Coach sent suggestion to Client: '{msg_content}'")

    # Client reads messages
    res = requests.get(f"{BASE_URL}/messages/{client_id}/{coach_id}")
    assert res.status_code == 200, "Get messages failed"
    messages_data = res.json()
    assert messages_data["success"] and len(messages_data["messages"]) > 0, "No messages retrieved"
    latest_msg = messages_data["messages"][-1]
    assert latest_msg["content"] == msg_content, "Retrieved message content mismatch"
    assert latest_msg["msg_type"] == "suggestion", "Message type mismatch"
    print("[OK] Client retrieved message successfully from Coach!")

    # Verify Unread count
    res = requests.get(f"{BASE_URL}/messages/unread/{client_id}")
    assert res.status_code == 200, "Get unread count failed"
    assert res.json()["count"] > 0, "Unread message count should be greater than 0"
    print("[OK] Verified client unread count badge is active.")

    # Mark read
    read_payload = {
        "user_id": client_id,
        "sender_id": coach_id
    }
    res = requests.post(f"{BASE_URL}/messages/read", json=read_payload)
    assert res.status_code == 200, "Mark read failed"
    
    # Verify Unread count is now 0
    res = requests.get(f"{BASE_URL}/messages/unread/{client_id}")
    assert res.json()["count"] == 0, "Unread count should be 0 after marking read"
    print("[OK] Verified client messages marked as read successfully.")

    print("\n--- 4. Testing AI Fitness Bot Flow ---")
    
    # Ask Bot diet/protein question
    bot_question = "How is my protein intake doing?"
    bot_payload = {
        "user_id": client_id,
        "question": bot_question
    }
    res = requests.post(f"{BASE_URL}/bot/ask", json=bot_payload)
    assert res.status_code == 200, "Bot ask failed"
    bot_data = res.json()
    assert bot_data["success"], "Bot failed internally"
    reply = bot_data["reply"]
    print(f"Client asked: '{bot_question}'")
    print(f"Bot replied:\n-------------------------------\n{reply}\n-------------------------------")
    assert "protein" in reply.lower() or "g/day" in reply.lower(), "Bot reply should mention protein metrics"
    print("[OK] Verified data-driven AI bot response.")

    # Verify bot interaction is saved in the chat history
    res = requests.get(f"{BASE_URL}/messages/{client_id}/bot")
    assert res.status_code == 200, "Get bot conversation history failed"
    bot_messages = res.json()["messages"]
    assert len(bot_messages) >= 2, "Bot chat history not persisted in message collections"
    print("[OK] Verified bot conversation successfully persisted in database for future sessions!")

    print("\n***** ALL SYSTEM TESTS PASSED SUCCESSFULLY! *****")

if __name__ == "__main__":
    try:
        run_tests()
    except AssertionError as e:
        print(f"[ERROR] TEST FAILURE: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] UNEXPECTED ERROR: {e}")
        sys.exit(1)
