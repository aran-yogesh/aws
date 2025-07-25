from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
import gridfs
import os
from datetime import datetime, timedelta
from typing import Optional

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB setup
client = MongoClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017/'))
db = client['caremate']
users_col = db['users']
patients_col = db['patients']
medicines_col = db['medicines']
appointments_col = db['appointments']
logs_col = db['logs']
fs = gridfs.GridFS(db)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str
    name: str
    email: str

class PatientProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    doctorId: Optional[str] = None
    caregiverId: Optional[str] = None

class OnboardingData(BaseModel):
    textData: Optional[str] = None
    summary: Optional[str] = None

class MedicineModel(BaseModel):
    name: str
    dosage: str
    frequency: str
    time: str
    notes: Optional[str] = None

class AppointmentModel(BaseModel):
    title: str
    date: str
    time: str
    doctor: str
    notes: Optional[str] = None

# Helper functions
def fix_id(doc):
    if not doc: return doc
    doc = dict(doc)
    if '_id' in doc: doc['_id'] = str(doc['_id'])
    return doc

def fix_ids(docs):
    return [fix_id(doc) for doc in docs]

# Seed data
def seed_data():
    if users_col.count_documents({}) == 0:
        users_col.insert_many([
            {"_id": "doctor1", "username": "drsmith", "password": "password123", "role": "doctor", "name": "Dr. Smith", "profileComplete": True},
            {"_id": "doctor2", "username": "drlee", "password": "password123", "role": "doctor", "name": "Dr. Lee", "profileComplete": True},
            {"_id": "caregiver1", "username": "caregiver1", "password": "password123", "role": "caregiver", "name": "John Caregiver", "profileComplete": True},
            {"_id": "patient1", "username": "patjane", "password": "password123", "role": "patient", "name": "Jane Patient", "doctorId": "doctor1", "caregiverId": "caregiver1", "profileComplete": True},
            {"_id": "patient2", "username": "patlee", "password": "password123", "role": "patient", "name": "Lee Patient", "doctorId": "doctor2", "caregiverId": "caregiver1", "profileComplete": True},
        ])
    
    if patients_col.count_documents({}) == 0:
        patients_col.insert_many([
            {"_id": "patient1", "name": "Jane Patient", "age": 65, "address": "123 Main St", "phone": "555-0101", "notes": "Hypertension", "doctorId": "doctor1", "caregiverId": "caregiver1"},
            {"_id": "patient2", "name": "Lee Patient", "age": 72, "address": "456 Oak Ave", "phone": "555-0102", "notes": "Diabetes", "doctorId": "doctor2", "caregiverId": "caregiver1"},
        ])
    
    if medicines_col.count_documents({}) == 0:
        medicines_col.insert_many([
            {"_id": "med1", "patientId": "patient1", "name": "Lisinopril", "dosage": "10mg", "frequency": "Daily", "time": "Morning", "notes": "For blood pressure"},
            {"_id": "med2", "patientId": "patient1", "name": "Metformin", "dosage": "500mg", "frequency": "Twice daily", "time": "Morning, Evening", "notes": "For diabetes"},
            {"_id": "med3", "patientId": "patient2", "name": "Insulin", "dosage": "20 units", "frequency": "Daily", "time": "Evening", "notes": "Type 2 diabetes"},
        ])
    
    if appointments_col.count_documents({}) == 0:
        # Get current date and create appointments for the next few weeks
        today = datetime.now()
        appointments_col.insert_many([
            {"_id": "app1", "patientId": "patient1", "title": "Checkup", "date": (today + timedelta(days=2)).strftime("%Y-%m-%d"), "time": "10:00 AM", "doctor": "Dr. Smith", "notes": "Regular checkup"},
            {"_id": "app2", "patientId": "patient1", "title": "Cardiology", "date": (today + timedelta(days=9)).strftime("%Y-%m-%d"), "time": "2:00 PM", "doctor": "Dr. Lee", "notes": "Heart checkup"},
            {"_id": "app3", "patientId": "patient1", "title": "Blood Test", "date": (today + timedelta(days=16)).strftime("%Y-%m-%d"), "time": "9:00 AM", "doctor": "Dr. Smith", "notes": "Routine blood work"},
            {"_id": "app4", "patientId": "patient2", "title": "Diabetes Review", "date": (today + timedelta(days=5)).strftime("%Y-%m-%d"), "time": "11:00 AM", "doctor": "Dr. Lee", "notes": "Diabetes management"},
            {"_id": "app5", "patientId": "patient2", "title": "Eye Exam", "date": (today + timedelta(days=12)).strftime("%Y-%m-%d"), "time": "3:00 PM", "doctor": "Dr. Lee", "notes": "Annual eye checkup"},
        ])
    
    if logs_col.count_documents({}) == 0:
        logs_col.insert_many([
            {"_id": "log1", "patientId": "patient1", "type": "missed_medicine", "medicine": "Lisinopril", "date": (today - timedelta(days=1)).strftime("%Y-%m-%d"), "time": "Morning"},
            {"_id": "log2", "patientId": "patient1", "type": "missed_appointment", "appointment": "Checkup", "date": (today - timedelta(days=3)).strftime("%Y-%m-%d"), "time": "10:00 AM"},
            {"_id": "log3", "patientId": "patient2", "type": "missed_medicine", "medicine": "Insulin", "date": (today - timedelta(days=2)).strftime("%Y-%m-%d"), "time": "Evening"},
        ])

# Seed data on startup
seed_data()

# API endpoints
@app.post("/signup")
def signup(req: SignupRequest):
    # Check if username already exists
    existing_user = users_col.find_one({"username": req.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create new user with profileComplete: false
    new_user = {
        "_id": f"patient_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "username": req.username,
        "password": req.password,
        "name": req.name,
        "email": req.email,
        "role": "patient",
        "profileComplete": False,
        "createdAt": datetime.now().isoformat()
    }
    
    users_col.insert_one(new_user)
    
    return {
        "_id": new_user["_id"],
        "username": new_user["username"],
        "role": new_user["role"],
        "name": new_user["name"],
        "profileComplete": new_user["profileComplete"]
    }

@app.post("/login")
def login(req: LoginRequest):
    user = users_col.find_one({"username": req.username, "password": req.password})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "_id": user["_id"],
        "username": user["username"],
        "role": user["role"],
        "name": user["name"],
        "profileComplete": user.get("profileComplete", True)  # Default to True for existing users
    }

@app.get("/me/{user_id}")
def get_user(user_id: str):
    user = users_col.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return fix_id(user)

@app.get("/patients/{user_id}")
def get_patients(user_id: str):
    user = users_col.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["role"] == "patient":
        # Return self as patient
        patient = patients_col.find_one({"_id": user_id})
        return [fix_id(patient)] if patient else []
    else:
        # Return patients assigned to this doctor/caregiver
        field = "doctorId" if user["role"] == "doctor" else "caregiverId"
        patients = patients_col.find({field: user_id})
        return fix_ids(patients)

@app.get("/patient/{patient_id}")
def get_patient(patient_id: str):
    patient = patients_col.find_one({"_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return fix_id(patient)

@app.patch("/patient/{patient_id}")
def update_patient(patient_id: str, update: PatientProfileUpdate):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if update_data:
        result = patients_col.update_one({"_id": patient_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found")
    
    # Mark user as profile complete
    users_col.update_one({"_id": patient_id}, {"$set": {"profileComplete": True}})
    
    return {"message": "Patient updated successfully"}

@app.post("/patient/{patient_id}/onboarding")
def complete_onboarding(patient_id: str, data: OnboardingData):
    # Process the onboarding data and create/update patient profile
    # For now, we'll use the text data as the summary
    summary = data.summary or data.textData or "Patient information provided during onboarding"
    
    # Create or update patient profile
    patient_data = {
        "_id": patient_id,
        "name": "New Patient",  # Will be updated from summary later
        "age": None,
        "address": "",
        "phone": "",
        "notes": summary,
        "doctorId": None,
        "caregiverId": None
    }
    
    # Try to extract basic info from summary (simple parsing)
    if data.textData:
        lines = data.textData.split('\n')
        for line in lines:
            line = line.strip().lower()
            if 'name:' in line:
                patient_data["name"] = line.split('name:')[-1].strip()
            elif 'age:' in line:
                try:
                    patient_data["age"] = int(line.split('age:')[-1].strip())
                except:
                    pass
            elif 'phone:' in line or 'contact:' in line:
                patient_data["phone"] = line.split(':')[-1].strip()
            elif 'address:' in line:
                patient_data["address"] = line.split('address:')[-1].strip()
    
    # Upsert patient profile
    patients_col.replace_one({"_id": patient_id}, patient_data, upsert=True)
    
    # Mark user as profile complete
    users_col.update_one({"_id": patient_id}, {"$set": {"profileComplete": True}})
    
    return {"message": "Onboarding completed successfully"}

@app.post("/patient/{patient_id}/reports")
def upload_report(patient_id: str, file: UploadFile = File(...)):
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    
    # Store file in GridFS
    file_id = fs.put(file.file, filename=file.filename, patientId=patient_id)
    
    return {"file_id": str(file_id), "filename": file.filename}

@app.get("/patient/{patient_id}/reports")
def get_reports(patient_id: str):
    files = fs.find({"patientId": patient_id})
    reports = []
    for file in files:
        reports.append({
            "file_id": str(file._id),
            "filename": file.filename,
            "upload_date": file.upload_date.isoformat()
        })
    return reports

@app.get("/patient/{patient_id}/reports/{file_id}")
def download_report(patient_id: str, file_id: str):
    try:
        file_obj = fs.get(ObjectId(file_id))
        return StreamingResponse(
            iter([file_obj.read()]),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={file_obj.filename}"}
        )
    except:
        raise HTTPException(status_code=404, detail="File not found")

@app.delete("/patient/{patient_id}/reports/{file_id}")
def delete_report(patient_id: str, file_id: str):
    try:
        fs.delete(ObjectId(file_id))
        return {"message": "Report deleted successfully"}
    except:
        raise HTTPException(status_code=404, detail="File not found")

@app.post("/medicines/{patient_id}")
def add_medicine(patient_id: str, medicine: MedicineModel):
    med_data = medicine.dict()
    med_data["patientId"] = patient_id
    med_data["_id"] = f"med_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    medicines_col.insert_one(med_data)
    return fix_id(med_data)

@app.patch("/medicines/{med_id}")
def update_medicine(med_id: str, medicine: MedicineModel):
    update_data = medicine.dict()
    result = medicines_col.update_one({"_id": med_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    return {"message": "Medicine updated successfully"}

@app.delete("/medicines/{med_id}")
def delete_medicine(med_id: str):
    result = medicines_col.delete_one({"_id": med_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    return {"message": "Medicine deleted successfully"}

@app.get("/medicines/{patient_id}")
def get_medicines(patient_id: str):
    medicines = medicines_col.find({"patientId": patient_id})
    return fix_ids(medicines)

@app.post("/appointments/{patient_id}")
def add_appointment(patient_id: str, appointment: AppointmentModel):
    app_data = appointment.dict()
    app_data["patientId"] = patient_id
    app_data["_id"] = f"app_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    appointments_col.insert_one(app_data)
    return fix_id(app_data)

@app.patch("/appointments/{app_id}")
def update_appointment(app_id: str, appointment: AppointmentModel):
    update_data = appointment.dict()
    result = appointments_col.update_one({"_id": app_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"message": "Appointment updated successfully"}

@app.delete("/appointments/{app_id}")
def delete_appointment(app_id: str):
    result = appointments_col.delete_one({"_id": app_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"message": "Appointment deleted successfully"}

@app.get("/appointments/{patient_id}")
def get_appointments(patient_id: str):
    appointments = appointments_col.find({"patientId": patient_id})
    return fix_ids(appointments)

@app.get("/logs/{patient_id}")
def get_logs(patient_id: str):
    logs = logs_col.find({"patientId": patient_id})
    return fix_ids(logs)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 