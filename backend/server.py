from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from bson import ObjectId
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from fastapi.responses import StreamingResponse
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'festive-crm-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Festive Lights CRM API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Root route
@api_router.get("/")
async def root():
    return {"message": "Festive Lights CRM API", "status": "running"}

# ============== UTILITY FUNCTIONS ==============
def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# ============== PYDANTIC MODELS ==============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "staff"  # admin, staff, crew
    city_id: Optional[str] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    city_id: Optional[str] = None
    phone: Optional[str] = None
    created_at: str

class CityCreate(BaseModel):
    name: str
    state: Optional[str] = None
    country: str = "USA"

class CityResponse(BaseModel):
    id: str
    name: str
    state: Optional[str] = None
    country: str
    created_at: str

class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    address: str
    city_id: str
    notes: Optional[str] = None
    viber_number: Optional[str] = None
    whatsapp_number: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: str
    address: str
    city_id: str
    city_name: Optional[str] = None
    notes: Optional[str] = None
    viber_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    created_at: str
    total_orders: int = 0

class QuoteItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float

class QuoteCreate(BaseModel):
    customer_id: str
    city_id: str
    items: List[QuoteItemCreate]
    notes: Optional[str] = None
    valid_until: Optional[str] = None

class QuoteResponse(BaseModel):
    id: str
    quote_number: str
    customer_id: str
    customer_name: Optional[str] = None
    city_id: str
    city_name: Optional[str] = None
    items: List[dict]
    subtotal: float
    tax: float = 0.0
    total: float
    status: str
    notes: Optional[str] = None
    valid_until: Optional[str] = None
    created_at: str
    created_by: Optional[str] = None

class InvoiceCreate(BaseModel):
    customer_id: str
    city_id: str
    quote_id: Optional[str] = None
    items: List[QuoteItemCreate]
    notes: Optional[str] = None
    due_date: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    city_id: str
    city_name: Optional[str] = None
    quote_id: Optional[str] = None
    items: List[dict]
    subtotal: float
    tax: float = 0.0
    total: float
    amount_paid: float = 0.0
    balance_due: float
    status: str
    notes: Optional[str] = None
    due_date: Optional[str] = None
    created_at: str

class PaymentCreate(BaseModel):
    invoice_id: str
    amount: float
    payment_method: str  # cash, check, card, stripe
    reference: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    invoice_id: str
    amount: float
    payment_method: str
    reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    created_by: Optional[str] = None

class CrewCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str
    city_id: str
    skills: Optional[List[str]] = None
    color: Optional[str] = "#0ea5e9"

class CrewResponse(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    phone: str
    city_id: str
    city_name: Optional[str] = None
    skills: Optional[List[str]] = None
    color: str
    status: str
    created_at: str

class InstallationCreate(BaseModel):
    customer_id: str
    city_id: str
    quote_id: Optional[str] = None
    invoice_id: Optional[str] = None
    crew_ids: List[str]
    scheduled_date: str
    scheduled_time: Optional[str] = None
    estimated_hours: float = 2.0
    address: str
    notes: Optional[str] = None
    installation_type: str = "installation"  # installation, removal, maintenance

class InstallationResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    city_id: str
    city_name: Optional[str] = None
    quote_id: Optional[str] = None
    invoice_id: Optional[str] = None
    crew_ids: List[str]
    crews: Optional[List[dict]] = None
    scheduled_date: str
    scheduled_time: Optional[str] = None
    estimated_hours: float
    address: str
    notes: Optional[str] = None
    status: str
    installation_type: str
    created_at: str
    # GPS tracking fields
    check_in_time: Optional[str] = None
    check_in_location: Optional[dict] = None
    check_out_time: Optional[str] = None
    check_out_location: Optional[dict] = None

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class CrewLocationResponse(BaseModel):
    crew_id: str
    crew_name: str
    crew_color: str
    installation_id: Optional[str] = None
    customer_name: Optional[str] = None
    address: Optional[str] = None
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: str
    status: str  # checked_in, en_route, idle

class EmailSendRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    attachment_type: Optional[str] = None  # quote, invoice
    attachment_id: Optional[str] = None

# ============== AUTH ROUTES ==============
@api_router.post("/auth/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "role": user.role,
        "city_id": user.city_id,
        "phone": user.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    del user_doc["password"]
    del user_doc["_id"]
    return user_doc

@api_router.post("/auth/login")
async def login_user(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "city_id": user.get("city_id")
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ============== CITIES ROUTES ==============
@api_router.post("/cities", response_model=CityResponse)
async def create_city(city: CityCreate, current_user: dict = Depends(get_current_user)):
    city_id = str(uuid.uuid4())
    city_doc = {
        "id": city_id,
        "name": city.name,
        "state": city.state,
        "country": city.country,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cities.insert_one(city_doc)
    return {k: v for k, v in city_doc.items() if k != "_id"}

@api_router.get("/cities", response_model=List[CityResponse])
async def get_cities(current_user: dict = Depends(get_current_user)):
    cities = await db.cities.find({}, {"_id": 0}).to_list(100)
    return cities

@api_router.delete("/cities/{city_id}")
async def delete_city(city_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.cities.delete_one({"id": city_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="City not found")
    return {"message": "City deleted"}

# ============== CUSTOMERS ROUTES ==============
@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer_id = str(uuid.uuid4())
    city = await db.cities.find_one({"id": customer.city_id}, {"_id": 0})
    customer_doc = {
        "id": customer_id,
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "address": customer.address,
        "city_id": customer.city_id,
        "notes": customer.notes,
        "viber_number": customer.viber_number,
        "whatsapp_number": customer.whatsapp_number,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_orders": 0
    }
    await db.customers.insert_one(customer_doc)
    response = {k: v for k, v in customer_doc.items() if k != "_id"}
    response["city_name"] = city["name"] if city else None
    return response

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(city_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if city_id:
        query["city_id"] = city_id
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    
    # Get city names
    cities = {c["id"]: c["name"] for c in await db.cities.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)}
    for c in customers:
        c["city_name"] = cities.get(c.get("city_id"))
    return customers

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    city = await db.cities.find_one({"id": customer.get("city_id")}, {"_id": 0})
    customer["city_name"] = city["name"] if city else None
    return customer

@api_router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    update_data = customer.model_dump(exclude_unset=True)
    result = await db.customers.update_one({"id": customer_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    city = await db.cities.find_one({"id": updated.get("city_id")}, {"_id": 0})
    updated["city_name"] = city["name"] if city else None
    return updated

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}

# ============== QUOTES ROUTES ==============
async def get_next_quote_number():
    counter = await db.counters.find_one_and_update(
        {"name": "quote"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return f"Q-{counter['seq']:05d}"

@api_router.post("/quotes", response_model=QuoteResponse)
async def create_quote(quote: QuoteCreate, current_user: dict = Depends(get_current_user)):
    quote_id = str(uuid.uuid4())
    quote_number = await get_next_quote_number()
    
    items = [item.model_dump() for item in quote.items]
    subtotal = sum(item["quantity"] * item["unit_price"] for item in items)
    tax = subtotal * 0.0  # Can be configured
    total = subtotal + tax
    
    customer = await db.customers.find_one({"id": quote.customer_id}, {"_id": 0})
    city = await db.cities.find_one({"id": quote.city_id}, {"_id": 0})
    
    quote_doc = {
        "id": quote_id,
        "quote_number": quote_number,
        "customer_id": quote.customer_id,
        "city_id": quote.city_id,
        "items": items,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "status": "draft",
        "notes": quote.notes,
        "valid_until": quote.valid_until,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.quotes.insert_one(quote_doc)
    
    response = {k: v for k, v in quote_doc.items() if k != "_id"}
    response["customer_name"] = customer["name"] if customer else None
    response["city_name"] = city["name"] if city else None
    return response

@api_router.get("/quotes", response_model=List[QuoteResponse])
async def get_quotes(city_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if city_id:
        query["city_id"] = city_id
    if status:
        query["status"] = status
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    customers = {c["id"]: c for c in await db.customers.find({}, {"_id": 0}).to_list(1000)}
    cities = {c["id"]: c["name"] for c in await db.cities.find({}, {"_id": 0}).to_list(100)}
    
    for q in quotes:
        customer = customers.get(q.get("customer_id"))
        q["customer_name"] = customer["name"] if customer else None
        q["city_name"] = cities.get(q.get("city_id"))
    return quotes

@api_router.get("/quotes/{quote_id}", response_model=QuoteResponse)
async def get_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    customer = await db.customers.find_one({"id": quote.get("customer_id")}, {"_id": 0})
    city = await db.cities.find_one({"id": quote.get("city_id")}, {"_id": 0})
    quote["customer_name"] = customer["name"] if customer else None
    quote["city_name"] = city["name"] if city else None
    return quote

@api_router.put("/quotes/{quote_id}/status")
async def update_quote_status(quote_id: str, status: str, current_user: dict = Depends(get_current_user)):
    result = await db.quotes.update_one({"id": quote_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": f"Quote status updated to {status}"}

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.quotes.delete_one({"id": quote_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote deleted"}

# ============== INVOICES ROUTES ==============
async def get_next_invoice_number():
    counter = await db.counters.find_one_and_update(
        {"name": "invoice"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return f"INV-{counter['seq']:05d}"

@api_router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(invoice: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    invoice_id = str(uuid.uuid4())
    invoice_number = await get_next_invoice_number()
    
    items = [item.model_dump() for item in invoice.items]
    subtotal = sum(item["quantity"] * item["unit_price"] for item in items)
    tax = subtotal * 0.0
    total = subtotal + tax
    
    customer = await db.customers.find_one({"id": invoice.customer_id}, {"_id": 0})
    city = await db.cities.find_one({"id": invoice.city_id}, {"_id": 0})
    
    invoice_doc = {
        "id": invoice_id,
        "invoice_number": invoice_number,
        "customer_id": invoice.customer_id,
        "city_id": invoice.city_id,
        "quote_id": invoice.quote_id,
        "items": items,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "amount_paid": 0.0,
        "balance_due": total,
        "status": "pending",
        "notes": invoice.notes,
        "due_date": invoice.due_date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(invoice_doc)
    
    # Update customer order count
    await db.customers.update_one({"id": invoice.customer_id}, {"$inc": {"total_orders": 1}})
    
    response = {k: v for k, v in invoice_doc.items() if k != "_id"}
    response["customer_name"] = customer["name"] if customer else None
    response["customer_email"] = customer["email"] if customer else None
    response["city_name"] = city["name"] if city else None
    return response

@api_router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(city_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if city_id:
        query["city_id"] = city_id
    if status:
        query["status"] = status
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    customers = {c["id"]: c for c in await db.customers.find({}, {"_id": 0}).to_list(1000)}
    cities = {c["id"]: c["name"] for c in await db.cities.find({}, {"_id": 0}).to_list(100)}
    
    for inv in invoices:
        customer = customers.get(inv.get("customer_id"))
        inv["customer_name"] = customer["name"] if customer else None
        inv["customer_email"] = customer.get("email") if customer else None
        inv["city_name"] = cities.get(inv.get("city_id"))
    return invoices

@api_router.get("/invoices/unpaid", response_model=List[InvoiceResponse])
async def get_unpaid_invoices(city_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"status": {"$in": ["pending", "partial", "overdue"]}}
    if city_id:
        query["city_id"] = city_id
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    customers = {c["id"]: c for c in await db.customers.find({}, {"_id": 0}).to_list(1000)}
    cities = {c["id"]: c["name"] for c in await db.cities.find({}, {"_id": 0}).to_list(100)}
    
    for inv in invoices:
        customer = customers.get(inv.get("customer_id"))
        inv["customer_name"] = customer["name"] if customer else None
        inv["customer_email"] = customer.get("email") if customer else None
        inv["city_name"] = cities.get(inv.get("city_id"))
    return invoices

@api_router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    customer = await db.customers.find_one({"id": invoice.get("customer_id")}, {"_id": 0})
    city = await db.cities.find_one({"id": invoice.get("city_id")}, {"_id": 0})
    invoice["customer_name"] = customer["name"] if customer else None
    invoice["customer_email"] = customer.get("email") if customer else None
    invoice["city_name"] = city["name"] if city else None
    return invoice

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted"}

# ============== PAYMENTS ROUTES ==============
@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(payment: PaymentCreate, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": payment.invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "invoice_id": payment.invoice_id,
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "reference": payment.reference,
        "notes": payment.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.payments.insert_one(payment_doc)
    
    # Update invoice
    new_amount_paid = invoice["amount_paid"] + payment.amount
    new_balance = invoice["total"] - new_amount_paid
    new_status = "paid" if new_balance <= 0 else "partial"
    
    await db.invoices.update_one(
        {"id": payment.invoice_id},
        {"$set": {"amount_paid": new_amount_paid, "balance_due": max(0, new_balance), "status": new_status}}
    )
    
    return {k: v for k, v in payment_doc.items() if k != "_id"}

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(invoice_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if invoice_id:
        query["invoice_id"] = invoice_id
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return payments

# ============== STRIPE PAYMENT ==============
@api_router.post("/payments/stripe/create-session")
async def create_stripe_session(invoice_id: str, origin_url: str, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    stripe_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    webhook_url = f"{origin_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)
    
    success_url = f"{origin_url}/invoices/{invoice_id}?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/invoices/{invoice_id}"
    
    request = CheckoutSessionRequest(
        amount=float(invoice["balance_due"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"invoice_id": invoice_id, "invoice_number": invoice["invoice_number"]}
    )
    
    session = await stripe_checkout.create_checkout_session(request)
    
    # Create pending transaction
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "invoice_id": invoice_id,
        "session_id": session.session_id,
        "amount": invoice["balance_due"],
        "currency": "usd",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/stripe/status/{session_id}")
async def get_stripe_status(session_id: str, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction if paid
    if status.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if transaction and transaction.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid"}}
            )
            # Create payment record
            await create_payment(
                PaymentCreate(
                    invoice_id=transaction["invoice_id"],
                    amount=transaction["amount"],
                    payment_method="stripe",
                    reference=session_id
                ),
                current_user
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook():
    return {"received": True}

# ============== CREWS ROUTES ==============
@api_router.post("/crews", response_model=CrewResponse)
async def create_crew(crew: CrewCreate, current_user: dict = Depends(get_current_user)):
    # First create user account for crew
    existing = await db.users.find_one({"email": crew.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": crew.email,
        "password": hash_password(crew.password),
        "name": crew.name,
        "role": "crew",
        "city_id": crew.city_id,
        "phone": crew.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    crew_id = str(uuid.uuid4())
    city = await db.cities.find_one({"id": crew.city_id}, {"_id": 0})
    
    crew_doc = {
        "id": crew_id,
        "user_id": user_id,
        "name": crew.name,
        "email": crew.email,
        "phone": crew.phone,
        "city_id": crew.city_id,
        "skills": crew.skills or [],
        "color": crew.color or "#0ea5e9",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.crews.insert_one(crew_doc)
    
    response = {k: v for k, v in crew_doc.items() if k != "_id"}
    response["city_name"] = city["name"] if city else None
    return response

@api_router.get("/crews", response_model=List[CrewResponse])
async def get_crews(city_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if city_id:
        query["city_id"] = city_id
    crews = await db.crews.find(query, {"_id": 0}).to_list(100)
    
    cities = {c["id"]: c["name"] for c in await db.cities.find({}, {"_id": 0}).to_list(100)}
    for c in crews:
        c["city_name"] = cities.get(c.get("city_id"))
    return crews

@api_router.get("/crews/{crew_id}", response_model=CrewResponse)
async def get_crew(crew_id: str, current_user: dict = Depends(get_current_user)):
    crew = await db.crews.find_one({"id": crew_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    city = await db.cities.find_one({"id": crew.get("city_id")}, {"_id": 0})
    crew["city_name"] = city["name"] if city else None
    return crew

@api_router.put("/crews/{crew_id}")
async def update_crew(crew_id: str, name: str = None, phone: str = None, skills: List[str] = None, color: str = None, status: str = None, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if name:
        update_data["name"] = name
    if phone:
        update_data["phone"] = phone
    if skills is not None:
        update_data["skills"] = skills
    if color:
        update_data["color"] = color
    if status:
        update_data["status"] = status
    
    if update_data:
        await db.crews.update_one({"id": crew_id}, {"$set": update_data})
    return {"message": "Crew updated"}

@api_router.delete("/crews/{crew_id}")
async def delete_crew(crew_id: str, current_user: dict = Depends(get_current_user)):
    crew = await db.crews.find_one({"id": crew_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    await db.crews.delete_one({"id": crew_id})
    await db.users.delete_one({"id": crew["user_id"]})
    return {"message": "Crew deleted"}

# ============== INSTALLATIONS ROUTES ==============
@api_router.post("/installations", response_model=InstallationResponse)
async def create_installation(installation: InstallationCreate, current_user: dict = Depends(get_current_user)):
    installation_id = str(uuid.uuid4())
    
    customer = await db.customers.find_one({"id": installation.customer_id}, {"_id": 0})
    city = await db.cities.find_one({"id": installation.city_id}, {"_id": 0})
    crews = await db.crews.find({"id": {"$in": installation.crew_ids}}, {"_id": 0}).to_list(20)
    
    installation_doc = {
        "id": installation_id,
        "customer_id": installation.customer_id,
        "city_id": installation.city_id,
        "quote_id": installation.quote_id,
        "invoice_id": installation.invoice_id,
        "crew_ids": installation.crew_ids,
        "scheduled_date": installation.scheduled_date,
        "scheduled_time": installation.scheduled_time,
        "estimated_hours": installation.estimated_hours,
        "address": installation.address,
        "notes": installation.notes,
        "status": "scheduled",
        "installation_type": installation.installation_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.installations.insert_one(installation_doc)
    
    response = {k: v for k, v in installation_doc.items() if k != "_id"}
    response["customer_name"] = customer["name"] if customer else None
    response["customer_phone"] = customer["phone"] if customer else None
    response["city_name"] = city["name"] if city else None
    response["crews"] = [{"id": c["id"], "name": c["name"], "color": c["color"]} for c in crews]
    return response

@api_router.get("/installations", response_model=List[InstallationResponse])
async def get_installations(
    city_id: Optional[str] = None,
    crew_id: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if city_id:
        query["city_id"] = city_id
    if crew_id:
        query["crew_ids"] = crew_id
    if status:
        query["status"] = status
    if date_from:
        query["scheduled_date"] = {"$gte": date_from}
    if date_to:
        if "scheduled_date" in query:
            query["scheduled_date"]["$lte"] = date_to
        else:
            query["scheduled_date"] = {"$lte": date_to}
    
    installations = await db.installations.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(1000)
    
    customers = {c["id"]: c for c in await db.customers.find({}, {"_id": 0}).to_list(1000)}
    cities = {c["id"]: c["name"] for c in await db.cities.find({}, {"_id": 0}).to_list(100)}
    crews = {c["id"]: c for c in await db.crews.find({}, {"_id": 0}).to_list(100)}
    
    for inst in installations:
        customer = customers.get(inst.get("customer_id"))
        inst["customer_name"] = customer["name"] if customer else None
        inst["customer_phone"] = customer["phone"] if customer else None
        inst["city_name"] = cities.get(inst.get("city_id"))
        inst["crews"] = [{"id": c, "name": crews[c]["name"], "color": crews[c]["color"]} for c in inst.get("crew_ids", []) if c in crews]
    return installations

@api_router.get("/installations/{installation_id}", response_model=InstallationResponse)
async def get_installation(installation_id: str, current_user: dict = Depends(get_current_user)):
    installation = await db.installations.find_one({"id": installation_id}, {"_id": 0})
    if not installation:
        raise HTTPException(status_code=404, detail="Installation not found")
    
    customer = await db.customers.find_one({"id": installation.get("customer_id")}, {"_id": 0})
    city = await db.cities.find_one({"id": installation.get("city_id")}, {"_id": 0})
    crews = await db.crews.find({"id": {"$in": installation.get("crew_ids", [])}}, {"_id": 0}).to_list(20)
    
    installation["customer_name"] = customer["name"] if customer else None
    installation["customer_phone"] = customer["phone"] if customer else None
    installation["city_name"] = city["name"] if city else None
    installation["crews"] = [{"id": c["id"], "name": c["name"], "color": c["color"]} for c in crews]
    return installation

@api_router.put("/installations/{installation_id}/status")
async def update_installation_status(installation_id: str, status: str, current_user: dict = Depends(get_current_user)):
    result = await db.installations.update_one({"id": installation_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Installation not found")
    return {"message": f"Installation status updated to {status}"}

@api_router.delete("/installations/{installation_id}")
async def delete_installation(installation_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.installations.delete_one({"id": installation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Installation not found")
    return {"message": "Installation deleted"}

# ============== CREW PORTAL ROUTES ==============
@api_router.get("/crew-portal/my-schedule", response_model=List[InstallationResponse])
async def get_crew_schedule(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "crew":
        raise HTTPException(status_code=403, detail="Access denied")
    
    crew = await db.crews.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew profile not found")
    
    installations = await db.installations.find(
        {"crew_ids": crew["id"], "status": {"$in": ["scheduled", "in_progress"]}},
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(100)
    
    customers = {c["id"]: c for c in await db.customers.find({}, {"_id": 0}).to_list(1000)}
    cities = {c["id"]: c["name"] for c in await db.cities.find({}, {"_id": 0}).to_list(100)}
    crews = {c["id"]: c for c in await db.crews.find({}, {"_id": 0}).to_list(100)}
    
    for inst in installations:
        customer = customers.get(inst.get("customer_id"))
        inst["customer_name"] = customer["name"] if customer else None
        inst["customer_phone"] = customer["phone"] if customer else None
        inst["city_name"] = cities.get(inst.get("city_id"))
        inst["crews"] = [{"id": c, "name": crews[c]["name"], "color": crews[c]["color"]} for c in inst.get("crew_ids", []) if c in crews]
    return installations

# ============== PDF GENERATION ==============
def generate_quote_pdf(quote: dict, customer: dict, company_name: str = "Festive Lights & Decorations"):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    elements = []
    
    # Header
    header_style = ParagraphStyle('Header', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#164e63'))
    elements.append(Paragraph(company_name, header_style))
    elements.append(Spacer(1, 0.25*inch))
    
    # Quote info
    elements.append(Paragraph(f"<b>Quote #{quote['quote_number']}</b>", styles['Heading2']))
    elements.append(Paragraph(f"Date: {quote['created_at'][:10]}", styles['Normal']))
    if quote.get('valid_until'):
        elements.append(Paragraph(f"Valid Until: {quote['valid_until']}", styles['Normal']))
    elements.append(Spacer(1, 0.25*inch))
    
    # Customer info
    elements.append(Paragraph("<b>Bill To:</b>", styles['Heading3']))
    elements.append(Paragraph(customer['name'], styles['Normal']))
    elements.append(Paragraph(customer['address'], styles['Normal']))
    if customer.get('phone'):
        elements.append(Paragraph(f"Phone: {customer['phone']}", styles['Normal']))
    if customer.get('email'):
        elements.append(Paragraph(f"Email: {customer['email']}", styles['Normal']))
    elements.append(Spacer(1, 0.25*inch))
    
    # Items table
    table_data = [['Description', 'Qty', 'Unit Price', 'Total']]
    for item in quote['items']:
        table_data.append([
            item['description'],
            str(item['quantity']),
            f"${item['unit_price']:.2f}",
            f"${item['quantity'] * item['unit_price']:.2f}"
        ])
    
    table_data.append(['', '', 'Subtotal:', f"${quote['subtotal']:.2f}"])
    if quote['tax'] > 0:
        table_data.append(['', '', 'Tax:', f"${quote['tax']:.2f}"])
    table_data.append(['', '', 'Total:', f"${quote['total']:.2f}"])
    
    table = Table(table_data, colWidths=[4*inch, 0.75*inch, 1*inch, 1*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#164e63')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -4), 0.5, colors.grey),
        ('FONTNAME', (2, -3), (-1, -1), 'Helvetica-Bold'),
    ]))
    elements.append(table)
    
    # Notes
    if quote.get('notes'):
        elements.append(Spacer(1, 0.25*inch))
        elements.append(Paragraph("<b>Notes:</b>", styles['Heading3']))
        elements.append(Paragraph(quote['notes'], styles['Normal']))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_invoice_pdf(invoice: dict, customer: dict, company_name: str = "Festive Lights & Decorations"):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    elements = []
    
    # Header
    header_style = ParagraphStyle('Header', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#164e63'))
    elements.append(Paragraph(company_name, header_style))
    elements.append(Spacer(1, 0.25*inch))
    
    # Invoice info
    elements.append(Paragraph(f"<b>Invoice #{invoice['invoice_number']}</b>", styles['Heading2']))
    elements.append(Paragraph(f"Date: {invoice['created_at'][:10]}", styles['Normal']))
    if invoice.get('due_date'):
        elements.append(Paragraph(f"Due Date: {invoice['due_date']}", styles['Normal']))
    elements.append(Spacer(1, 0.25*inch))
    
    # Customer info
    elements.append(Paragraph("<b>Bill To:</b>", styles['Heading3']))
    elements.append(Paragraph(customer['name'], styles['Normal']))
    elements.append(Paragraph(customer['address'], styles['Normal']))
    if customer.get('phone'):
        elements.append(Paragraph(f"Phone: {customer['phone']}", styles['Normal']))
    if customer.get('email'):
        elements.append(Paragraph(f"Email: {customer['email']}", styles['Normal']))
    elements.append(Spacer(1, 0.25*inch))
    
    # Items table
    table_data = [['Description', 'Qty', 'Unit Price', 'Total']]
    for item in invoice['items']:
        table_data.append([
            item['description'],
            str(item['quantity']),
            f"${item['unit_price']:.2f}",
            f"${item['quantity'] * item['unit_price']:.2f}"
        ])
    
    table_data.append(['', '', 'Subtotal:', f"${invoice['subtotal']:.2f}"])
    if invoice['tax'] > 0:
        table_data.append(['', '', 'Tax:', f"${invoice['tax']:.2f}"])
    table_data.append(['', '', 'Total:', f"${invoice['total']:.2f}"])
    table_data.append(['', '', 'Amount Paid:', f"${invoice['amount_paid']:.2f}"])
    table_data.append(['', '', 'Balance Due:', f"${invoice['balance_due']:.2f}"])
    
    table = Table(table_data, colWidths=[4*inch, 0.75*inch, 1*inch, 1*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#164e63')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -5), 0.5, colors.grey),
        ('FONTNAME', (2, -5), (-1, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (2, -1), (-1, -1), colors.HexColor('#ef4444') if invoice['balance_due'] > 0 else colors.HexColor('#22c55e')),
    ]))
    elements.append(table)
    
    # Notes
    if invoice.get('notes'):
        elements.append(Spacer(1, 0.25*inch))
        elements.append(Paragraph("<b>Notes:</b>", styles['Heading3']))
        elements.append(Paragraph(invoice['notes'], styles['Normal']))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

@api_router.get("/quotes/{quote_id}/pdf")
async def download_quote_pdf(quote_id: str, current_user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    customer = await db.customers.find_one({"id": quote["customer_id"]}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    pdf_buffer = generate_quote_pdf(quote, customer)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=quote_{quote['quote_number']}.pdf"}
    )

@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    customer = await db.customers.find_one({"id": invoice["customer_id"]}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    pdf_buffer = generate_invoice_pdf(invoice, customer)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{invoice['invoice_number']}.pdf"}
    )

# ============== EMAIL ROUTES ==============
@api_router.post("/email/send-quote/{quote_id}")
async def send_quote_email(quote_id: str, current_user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    customer = await db.customers.find_one({"id": quote["customer_id"]}, {"_id": 0})
    if not customer or not customer.get("email"):
        raise HTTPException(status_code=400, detail="Customer email not found")
    
    # For now, return success with mock - SendGrid needs API key
    return {"message": f"Quote sent to {customer['email']}", "status": "mocked"}

@api_router.post("/email/send-invoice/{invoice_id}")
async def send_invoice_email(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    customer = await db.customers.find_one({"id": invoice["customer_id"]}, {"_id": 0})
    if not customer or not customer.get("email"):
        raise HTTPException(status_code=400, detail="Customer email not found")
    
    return {"message": f"Invoice sent to {customer['email']}", "status": "mocked"}

@api_router.post("/email/send-bulk-reminders")
async def send_bulk_reminders(invoice_ids: List[str], current_user: dict = Depends(get_current_user)):
    sent_count = 0
    for invoice_id in invoice_ids:
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if invoice:
            customer = await db.customers.find_one({"id": invoice["customer_id"]}, {"_id": 0})
            if customer and customer.get("email"):
                sent_count += 1
    
    return {"message": f"Reminders sent to {sent_count} customers", "status": "mocked"}

# ============== DASHBOARD STATS ==============
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(city_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if city_id:
        query["city_id"] = city_id
    
    total_customers = await db.customers.count_documents(query)
    total_quotes = await db.quotes.count_documents(query)
    pending_quotes = await db.quotes.count_documents({**query, "status": "draft"})
    total_invoices = await db.invoices.count_documents(query)
    unpaid_invoices = await db.invoices.count_documents({**query, "status": {"$in": ["pending", "partial", "overdue"]}})
    
    # Calculate revenue
    invoices = await db.invoices.find(query, {"_id": 0, "total": 1, "amount_paid": 1, "balance_due": 1}).to_list(10000)
    total_revenue = sum(inv.get("amount_paid", 0) for inv in invoices)
    outstanding = sum(inv.get("balance_due", 0) for inv in invoices)
    
    # Scheduled installations
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    scheduled_today = await db.installations.count_documents({**query, "scheduled_date": today, "status": "scheduled"})
    total_scheduled = await db.installations.count_documents({**query, "status": "scheduled"})
    
    return {
        "total_customers": total_customers,
        "total_quotes": total_quotes,
        "pending_quotes": pending_quotes,
        "total_invoices": total_invoices,
        "unpaid_invoices": unpaid_invoices,
        "total_revenue": total_revenue,
        "outstanding": outstanding,
        "scheduled_today": scheduled_today,
        "total_scheduled": total_scheduled
    }

# ============== WHATSAPP/VIBER ROUTES (MOCK) ==============
@api_router.post("/messaging/whatsapp/{quote_or_invoice_id}")
async def send_whatsapp(quote_or_invoice_id: str, message_type: str = "quote", current_user: dict = Depends(get_current_user)):
    # This would integrate with WhatsApp Business API
    return {"message": "WhatsApp message queued", "status": "mocked", "note": "WhatsApp integration requires business API setup"}

@api_router.post("/messaging/viber/{quote_or_invoice_id}")
async def send_viber(quote_or_invoice_id: str, message_type: str = "quote", current_user: dict = Depends(get_current_user)):
    # This would integrate with Viber Business API
    return {"message": "Viber message queued", "status": "mocked", "note": "Viber integration requires business API setup"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
