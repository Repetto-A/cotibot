import sys
import os
sys.path.append(os.path.dirname(__file__))
from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import os
import secrets
from typing import List, Optional
import asyncio
from telegram_bot import TelegramBot
from pdf_generator import PDFGenerator
import json
from db import engine, SessionLocal, Base, Machine, Quotation, MACHINERY_CATALOG
from dotenv import load_dotenv
load_dotenv()

# Pydantic models
class MachineCreate(BaseModel):
    code: str
    name: str
    price: float
    category: str
    description: str

class MachineUpdate(BaseModel):
    price: float

class QuotationCreate(BaseModel):
    machineCode: str
    clientCuit: str
    clientName: str
    clientPhone: str
    clientAddress: Optional[str] = None
    clientEmail: Optional[str] = None
    clientCompany: Optional[str] = None
    notes: Optional[str] = None
    discountPercent: float = 0.0  # Nuevo campo para porcentaje de descuento

# FastAPI app
app = FastAPI(title="Agromaq Enhanced Quotation System", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBasic()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_admin(credentials: HTTPBasicCredentials = Depends(security)):
    admin_user = os.getenv("ADMIN_USER")
    admin_pass = os.getenv("ADMIN_PASS")
    if not admin_user or not admin_pass:
        raise RuntimeError("ADMIN_USER y ADMIN_PASS deben estar definidos en las variables de entorno")
    correct_username = secrets.compare_digest(credentials.username, admin_user)
    correct_password = secrets.compare_digest(credentials.password, admin_pass)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# Initialize components
pdf_generator = PDFGenerator()
telegram_bot = TelegramBot()


MACHINERY_CATALOG = None

@app.on_event("startup")
async def startup_event():
    # Initialize machinery catalog in database
    db = SessionLocal()
    if db.query(Machine).count() == 0:
        # Leer el catálogo desde el backup JSON
        backup_path = os.path.join(os.path.dirname(__file__), "data_machinery_backup.json")
        with open(backup_path, "r", encoding="utf-8") as f:
            MACHINERY_CATALOG = json.load(f)
        id_counter = 1
        for category in MACHINERY_CATALOG:
            for producto in category["productos"]:
                code = f"{category['categoria'][:3].upper()}{str(id_counter).zfill(3)}"
                machine = Machine(
                    code=code,
                    name=producto,
                    price=float(10000 + (id_counter * 1000)),  # Sample pricing
                    category=category["categoria"],
                    description=f"Descripción de {producto}",
                    active=True
                )
                db.add(machine)
                id_counter += 1
        db.commit()
    db.close()
    
    # Start Telegram bot
    asyncio.create_task(telegram_bot.start())

@app.get("/")
def read_root():
    return {"message": "Agromaq Enhanced Quotation System API", "version": "2.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/machines")
def get_machines(db: Session = Depends(get_db)):
    return db.query(Machine).filter(Machine.active == True).all()

@app.get("/admin/machines")
def get_machines_admin(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Machine).filter(Machine.active == True).all()

@app.get("/machines/catalog")
def get_machinery_catalog():
    return MACHINERY_CATALOG

@app.get("/machines/{machine_code}")
def get_machine_by_code(machine_code: str, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.code == machine_code, Machine.active == True).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

@app.put("/machines/{machine_code}")
def update_machine_price(machine_code: str, machine_update: MachineUpdate, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.code == machine_code).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    machine.price = machine_update.price
    db.commit()
    db.refresh(machine)
    return machine

@app.post("/generate-quote")
async def generate_quote(quotation: QuotationCreate, db: Session = Depends(get_db)):
    # Get machine details
    machine = db.query(Machine).filter(Machine.code == quotation.machineCode, Machine.active == True).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    # Calcular precio final con descuento variable
    final_price = machine.price
    discount_percent = getattr(quotation, 'discountPercent', 0.0) or 0.0
    if discount_percent > 0:
        final_price = machine.price * (1 - discount_percent / 100)
    
    # Save quotation to database
    db_quotation = Quotation(
        machine_code=quotation.machineCode,
        client_cuit=quotation.clientCuit,
        client_name=quotation.clientName,
        client_phone=quotation.clientPhone,
        client_email=quotation.clientEmail,
        client_company=quotation.clientCompany,
        notes=quotation.notes,
        discount_applied=discount_percent > 0,
        final_price=final_price
    )
    db.add(db_quotation)
    db.commit()
    
    # Generate PDF
    pdf_path = await pdf_generator.generate_quotation_pdf(machine, quotation, final_price)
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"cotizacion-{quotation.clientName.replace(' ', '-')}-{quotation.machineCode}.pdf"
    )

@app.get("/quotations")
def get_quotations(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Quotation).order_by(Quotation.created_at.desc()).all()

@app.get("/quotations/stats")
def get_quotation_stats(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    total_quotations = db.query(Quotation).count()
    total_with_discount = db.query(Quotation).filter(Quotation.discount_applied == True).count()
    
    return {
        "total_quotations": total_quotations,
        "quotations_with_discount": total_with_discount,
        "discount_percentage": (total_with_discount / total_quotations * 100) if total_quotations > 0 else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
