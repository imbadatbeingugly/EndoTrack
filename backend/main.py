import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
    allow_origins=["*"],  # In production, replace with your specific frontend domain on Render
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

# In-Memory Database (Mock storage for rapid development & testing)
db_symptom_logs = []

# --- API Routes ---

@app.get("/api/health")
def health_check():
    """Health check endpoint to verify backend service status on Render."""
    return {
        "status": "online",
        "service": "EndoTrack Backend",
        "version": "2.0.0"
    }

@app.post("/api/symptoms")
def create_symptom_log(entry: SymptomEntry):
    """Logs a daily symptom entry from the React frontend."""
    db_symptom_logs.append(entry.model_dump())
    return {
        "status": "success",
        "message": "Symptom log saved successfully",
        "total_logs": len(db_symptom_logs)
    }

@app.get("/api/symptoms")
def get_symptom_logs():
    """Retrieves all logged symptom entries for charting and history."""
    return {
        "status": "success",
        "data": db_symptom_logs
    }

@app.post("/api/generate-summary")
def generate_doctor_summary(payload: SummaryRequest):
    """
    Synthesizes historical symptom logs into a structured 
    'Doctor Consultation Brief' using Gemini 1.5 Flash.
    """
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

    # Format entries into structured text for LLM prompting
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
    """
    Provides evidence-based educational Q&A regarding endometriosis 
    with medical disclaimers and safety guardrails.
    """
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