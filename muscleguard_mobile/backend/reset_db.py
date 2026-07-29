import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def reset_database(mode="history"):
    load_dotenv()
    mongo_url = os.getenv('MONGO_URL')
    if not mongo_url:
        print("Error: MONGO_URL not found in environment.")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client['muscleguard']

    collections_to_clear = []
    if mode == "history":
        # Keep accounts (users), delete all activity data
        collections_to_clear = ['predictions', 'profiles', 'messages', 'coach_clients']
        print("Mode: Reset History Only (accounts will be preserved)")
    elif mode == "full":
        # Delete absolutely everything
        collections_to_clear = ['predictions', 'profiles', 'messages', 'coach_clients', 'users']
        print("Mode: Full Database Reset (all accounts and history will be deleted)")
    else:
        print("Invalid mode. Choose 'history' or 'full'.")
        return

    print(f"Connecting to MongoDB Atlas...")
    for coll_name in collections_to_clear:
        coll = db[coll_name]
        count = await coll.count_documents({})
        if count > 0:
            result = await coll.delete_many({})
            print(f"Cleared collection '{coll_name}': Deleted {result.deleted_count} documents.")
        else:
            print(f"Collection '{coll_name}' is already empty.")

    print("\nDatabase reset process complete!")

if __name__ == "__main__":
    # Default to history reset if no arg provided
    selected_mode = sys.argv[1] if len(sys.argv) > 1 else "history"
    asyncio.run(reset_database(selected_mode))
