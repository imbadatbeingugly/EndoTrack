import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import google.generativeai as genai

# Initialize FastAPI Application
app = FastAPI(
    title="EndoTrack API",
    description="Symptom Tracking & AI Clinical Brief Backend Service",
    version="2.0.0"
)

# Configure CORS Middleware for Render deployment and local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini AI Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- Pydantic Data Schemas ---

class SymptomEntry(BaseModel):
    date: str
    cycle_day: int
    pain_level: int = Field(..., ge=1, le=10)
    primary_location: str
    gi_distress: bool
    fatigue_level: int = Field(..., ge=1, le=10)
    notes: Optional[str] = ""

class SummaryRequest(BaseModel):
    patient_id: str
    entries: List[SymptomEntry]

class QARequest(BaseModel):
    question: str

# In-Memory Database
db_symptom_logs = []

# --- API Routes ---

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "EndoTrack Backend",
        "version": "2.0.0"
    }

@app.post("/api/symptoms")
def create_symptom_log(entry: SymptomEntry):
    db_symptom_logs.append(entry.model_dump())
    return {
        "status": "success",
        "message": "Symptom log saved successfully",
        "total_logs": len(db_symptom_logs)
    }

@app.get("/api/symptoms")
def get_symptom_logs():
    return {
        "status": "success",
        "data": db_symptom_logs
    }

@app.post("/api/generate-summary")
def generate_doctor_summary(payload: SummaryRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="Gemini API Key is missing in environment variables."
        )

    if not payload.entries:
        raise HTTPException(
            status_code=400, 
            detail="No symptom logs provided for analysis."
        )

    logs_text = "\n".join([
        f"- Date: {e.date} (Cycle Day {e.cycle_day}): Pain Severity {e.pain_level}/10 [{e.primary_location}], GI Distress: {e.gi_distress}, Fatigue: {e.fatigue_level}/10. Notes: '{e.notes}'"
        for e in payload.entries
    ])

    prompt = f"""
    You are an AI clinical assistant helping synthesize patient symptom history for a gynecologist appointment.
    Analyze the following patient logs and produce a clear, professional 'Doctor Consultation Brief':

    Structure the summary into 3 key sections:
    1. Pain Patterns & Peak Cycles (Correlate pain intensity with cycle days)
    2. Gastrointestinal & Systemic Indicators (Highlight GI distress, fatigue, and pain locations)
    3. Clinical Discussion Key Points (Suggest discussion topics such as pelvic MRI, ultrasound, or laparoscopy)

    Patient Symptom History:
    {logs_text}

    MANDATORY DISCLAIMER: Conclude with an explicit statement that this summary is a tracking synthesis tool intended for communication and does not constitute a formal diagnosis.
    """

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return {
            "status": "success",
            "summary": response.text
        }
    except Exception as err:
        raise HTTPException(
            status_code=500, 
            detail=f"AI Service Error: {str(err)}"
        )

@app.post("/api/chat-qa")
def educational_qa(req: QARequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="Gemini API Key is missing in environment variables."
        )

    system_instruction = (
        "You are an empathetic medical educator specializing in endometriosis. "
        "Answer patient questions using verified evidence-based information. "
        "Emphasize that you cannot diagnose medical conditions and strongly recommend consulting a medical professional."
    )

    try:
        model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_instruction)
        response = model.generate_content(req.question)
        return {
            "status": "success",
            "answer": response.text
        }
    except Exception as err:
        raise HTTPException(
            status_code=500, 
            detail=f"AI Service Error: {str(err)}"
        )

# --- Static Files & Index Redirect Routing ---

# Path to the directory where static assets reside (e.g. frontend root or build output dist directory)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

# Mount compiled assets if dist/assets exists, otherwise fall back to static root directory
assets_path = os.path.join(STATIC_DIR, "dist", "assets")
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    """
    Serves static frontend files or falls back to index.html 
    for root redirects and client-side routing.
    """
    # Exclude API endpoints from static file fallback
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API Endpoint Not Found")

    # Path to index.html (checks dist folder for Vite builds or root directory)
    dist_index = os.path.join(STATIC_DIR, "dist", "index.html")
    root_index = os.path.join(STATIC_DIR, "index.html")

    if os.path.exists(dist_index):
        return FileResponse(dist_index)
    elif os.path.exists(root_index):
        return FileResponse(root_index)
    else:
        raise HTTPException(
            status_code=404, 
            detail="index.html not found. Please ensure the frontend build directory exists."
        )
