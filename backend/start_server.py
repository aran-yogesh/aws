import uvicorn
from api import app, seed_data

if __name__ == "__main__":
    # Seed the database with initial data
    print("Seeding database...")
    seed_data()
    print("Database seeded successfully!")
    
    # Start the server
    print("Starting AWS Backend Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 