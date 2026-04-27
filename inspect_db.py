import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def inspect_db():
    # Load .env from backend directory
    env_path = os.path.join("backend", ".env")
    load_dotenv(env_path)
    
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("DB_NAME", "ppm")
    
    print(f"Connecting to: {uri[:20]}...")
    client = AsyncIOMotorClient(uri)
    db = client[db_name]
    
    try:
        collections = await db.list_collection_names()
        print(f"Collections in '{db_name}': {collections}\n")
        
        for coll_name in collections:
            print(f"--- Collection: {coll_name} ---")
            doc = await db[coll_name].find_one()
            if doc:
                # Convert ObjectId to string for printing
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                import json
                from datetime import datetime
                
                # Helper to handle datetime in json
                def default(obj):
                    if isinstance(obj, datetime):
                        return obj.isoformat()
                    return str(obj)
                
                print(json.dumps(doc, indent=2, default=default))
            else:
                print("No documents found.")
            print()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(inspect_db())
