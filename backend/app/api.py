from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.cash_service import CashService

class ConfigRequest(BaseModel):
    risk_tolerance: str

# Global
SERVICE = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global SERVICE
    print("Initializing CashCycle Service...")
    SERVICE = CashService()
    yield

app = FastAPI(title="CashCycle Ops API", version="3.0", lifespan=lifespan)

# Enable CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "System Operational", "service": "CashCycle Ops Command Center"}

@app.get("/network-status")
def get_network_status():
    """Returns high-level stats AND chart history."""
    if SERVICE is None: return {"error": "System initializing"}
    return SERVICE.get_status()

@app.post("/predict")
def predict_forecast():
    """Generates forecast based on CURRENT config."""
    if SERVICE is None: raise HTTPException(status_code=503)
    return SERVICE.get_forecast()

@app.post("/simulate/advance")
def advance_simulation():
    if SERVICE is None: raise HTTPException(status_code=503)
    new_date = SERVICE.advance_simulation()
    return {"message": "Simulation Advanced", "new_date": str(new_date.date())}

@app.post("/simulate/reset")
def reset_simulation():
    if SERVICE is None: raise HTTPException(status_code=503)
    SERVICE.reset_simulation()
    return {"message": "Simulation Reset"}

class EventRequest(BaseModel):
    type: str

@app.post("/simulate/event")
def inject_event(event: EventRequest):
    """Schedules a shock event (FESTIVAL, STORM) for the next day."""
    if SERVICE is None: raise HTTPException(status_code=503)
    return SERVICE.inject_event(event.type)

@app.post("/config")
def update_config(config: ConfigRequest):
    """Updates operational thresholds."""
    if SERVICE is None: raise HTTPException(status_code=503)
    new_settings = SERVICE.update_config(config.dict())
    return {"message": "Config Updated", "config": new_settings}

@app.get("/atm/{atm_id}")
def get_atm_detail(atm_id: int):
    """Returns detailed data for a specific ATM."""
    if SERVICE is None: raise HTTPException(status_code=503)
    result = SERVICE.get_atm_detail(atm_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
