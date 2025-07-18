import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Database setup
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agromaq_enhanced.db")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enhanced Models
def get_base():
    return Base

class Machine(Base):
    __tablename__ = "machines"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    name = Column(String)
    price = Column(Float)
    category = Column(String)
    description = Column(Text)
    active = Column(Boolean, default=True)

class Quotation(Base):
    __tablename__ = "quotations"
    id = Column(Integer, primary_key=True, index=True)
    machine_code = Column(String)
    client_cuit = Column(String)
    client_name = Column(String)
    client_phone = Column(String)
    client_email = Column(String, nullable=True)
    client_company = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    discount_applied = Column(Boolean, default=False)
    final_price = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# Machinery catalog
MACHINERY_CATALOG = [
    {
        "categoria": "Acoplados rurales",
        "productos": [
            "Acoplado rural playo",
            "Acoplado rural vaquero desmontable",
            "Acoplado rural vaquero desmontable 2",
            "Acoplado rural vaquero fijo",
            "Acoplado totalmente desmontable",
            "Acoplado volcador manual o hidráulico",
            "Acoplado volcador trivuelo de uso rural"
        ]
    },
    {
        "categoria": "Acoplados tanque",
        "productos": [
            "Acoplado tanque 3000 Lts.",
            "Acoplado tanque de 1500 Lts.",
            "Acoplado tanque de plástico 12.000 Lts.",
            "Acoplado tanque de plástico 1500 Lts.",
            "Acoplado tanque de plástico 3500 Lts.",
            "Acoplado tanque de plástico 7000 Lts.",
            "Acoplado tanques rurales"
        ]
    },
    {
        "categoria": "Tolvas",
        "productos": [
            "Acoplado tolva cerealero 4 TT.",
            "Acoplado tolva cerealero 8 TT.",
            "Acoplado Tolva para semillas y fertilizantes de uso rural",
            "Acoplado Tolva Para Semillas Y Fertilizantes De Uso Rural",
            "Acoplado tolva para semillas y fertilizantes modelo A.T.F. 10",
            "Acoplado tolva para semillas y fertilizantes modelo A.T.F. 14",
            "Acoplado tolva para semillas y fertilizantes Modelo A.T.F. 24",
            "Acoplados tolvas para semillas y fertilizantes Modelo A.T.F. 12"
        ]
    },
    {
        "categoria": "Cargadores y elevadores",
        "productos": [
            "Cargador y transportador de rollos hidráulico T.R.A. 6000",
            "Elevador de rollos",
            "Grúa giratoria hidráulica multipropósito de uso rural"
        ]
    },
] 