import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")

async def get_all_users():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["muscleguard"]
    
    users = await db["users"].find().to_list(length=100)
    profiles = await db["profiles"].find().to_list(length=100)
    
    print("USERS COLLECTION:")
    for u in users:
        print(f"- {u.get('username')} (ID: {u.get('user_id')}, Password: {u.get('password')})")
        
    print("\nPROFILES COLLECTION:")
    for p in profiles:
        print(f"- {p.get('name')} (ID: {p.get('user_id')}, Age: {p.get('age')}, Weight: {p.get('weight')}kg, Goal Weight: {p.get('goal_weight')}kg)")

if __name__ == "__main__":
    asyncio.run(get_all_users())
