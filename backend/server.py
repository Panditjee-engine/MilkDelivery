from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta ,date
from passlib.context import CryptContext
from jose import JWTError, jwt
from enum import Enum
from typing import Optional, Union
from fastapi import APIRouter, Depends
from bson import ObjectId
import pytz
import random
import base64

#30-jan- status all finen after updates at 318-324(add new dependency)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'milk_delivery_db')]

# Create the main app
app = FastAPI(title="Milk Delivery App API")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "milk-delivery-secret-key-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

IST = pytz.timezone("Asia/Kolkata")
# ===================== ENUMS =====================
class UserRole(str, Enum):
    CUSTOMER = "customer"
    DELIVERY_PARTNER = "delivery_partner"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"

class SubscriptionPattern(str, Enum):
    DAILY = "daily"
    ALTERNATE = "alternate"
    CUSTOM = "custom"
    BUY_ONCE = "buy_once"

class OrderStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    UNASSIGNED = "unassigned" ##
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"

class DeliveryStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class ProductCategory(str, Enum):
    MILK = "milk"
    DAIRY = "dairy"
    BAKERY = "bakery"
    FRUITS = "fruits"
    VEGETABLES = "vegetables"
    ESSENTIALS = "essentials"

# ===================== MODELS =====================

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER

class UserCreate(UserBase):
    password: str
    address: Optional[Dict[str, Any]] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assigned_admin_ids: List[str] = Field(default_factory=list) #------> 6th feb
    address: Optional[Dict[str, Any]] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    zone: Optional[str] = None  # For delivery partners

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: UserRole
    address: Optional[Union[str, dict]] = None
    is_active: bool
    zone: Optional[str] = None
    assigned_admin_ids: List[str] = []  
    assigned_rider_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: ProductCategory
    price: float
    unit: str
    image: Optional[str] = None  # base64 OR URL
    image_type: Optional[str] = "base64"  # "base64" | "url"
    nutritional_info: Optional[Dict[str, Any]] = None
    stock: int = 100
    is_available: bool = True

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str 
    admin_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Subscription Models
class SubscriptionBase(BaseModel):
    product_id: str
    quantity: int = 1
    pattern: SubscriptionPattern
    custom_days: Optional[List[int]] = None  # 0=Mon, 6=Sun for custom pattern
    start_date: str  # YYYY-MM-DD
    end_date: Optional[str] = None  # For buy_once this equals start_date

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionModification(BaseModel):
    date: str  # YYYY-MM-DD
    quantity: int

class Subscription(SubscriptionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    is_active: bool = True
    admin_id: Optional[str] = None
    admin_name: Optional[str] = None
    modifications: List[Dict[str, Any]] = Field(default_factory=list)  # Date-specific quantity changes
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SubscriptionResponse(Subscription):
    product: Optional[Product] = None

# Vacation Models
class VacationCreate(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD

class Vacation(VacationCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Wallet Models
class WalletTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    type: str  # "credit" or "debit"
    description: str
    balance_after: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WalletRecharge(BaseModel):
    amount: float

class Wallet(BaseModel):
    user_id: str
    balance: float = 0.0
    transactions: List[WalletTransaction] = Field(default_factory=list)

# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float
    subscription_id: Optional[str] = None

class Order(BaseModel):
    id: str
    user_id: str
    admin_id: Optional[str]
    admin_name: Optional[str]
    items: List[OrderItem]
    total_amount: float
    status: str
    delivery_date: str
    delivery_slot: str
    address: Dict[str, Any]

    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

    delivery_partner_id: Optional[str]
    delivery_partner_name: Optional[str] = None
    delivery_partner_phone: Optional[str] = None
    delivery_otp: Optional[str] = None
    admin_otp: Optional[str] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime


# Delivery Partner Models
class DeliveryCheckin(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    checkin_time: datetime = Field(default_factory=datetime.utcnow)
    checkout_time: Optional[datetime] = None
    date: str  # YYYY-MM-DD

class DeliveryComplete(BaseModel):
    order_id: str
    proof_image: Optional[str] = None  # base64

# Admin Models
class ZoneAssignment(BaseModel):
    partner_id: str
    zone: str

class StockUpdate(BaseModel):
    product_id: str
    quantity: int
    
 # procumrement item base model erased

class UserStatusUpdate(BaseModel):
    is_active: bool

class VerifyUserRequest(BaseModel):
    is_verified: bool = True

class ProductStatusUpdate(BaseModel):
    is_available: bool

class RiderAdminAssign(BaseModel):
    admin_ids: List[str]

class AssignAdminsRequest(BaseModel):
    assigned_admin_ids: List[str]

class AssignZoneRequest(BaseModel):
    zone: str

class CreateRiderRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str


# ===================== AUTH HELPERS =====================

def generate_otp():
    return f"{random.randint(1000, 9999)}"

def now_ist():
    return datetime.now(IST)

def serialize_doc(doc):
    if not doc:
        return doc
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def serialize_order_admin(order: dict):
    order = dict(order)
    if "_id" in order:
        order["id"] = str(order["_id"])
        order.pop("_id")
    return order

def serialize_order_public(order: dict):
    order = dict(order)
    order.pop("admin_otp", None)
    if "_id" in order:
        order["id"] = str(order["_id"])
        order.pop("_id")
    return order


def serialize_order(order: dict):
    # Ensure it's a dict
    order = dict(order)
    order.pop("admin_otp", None)
    # Convert MongoDB ObjectId to string
    if "_id" in order:
        order["id"] = str(order["_id"])
        order.pop("_id")
    else:
        order["id"] = str(order.get("id", ""))
    # If you have nested ObjectIds (like user_id or delivery_partner_id)
    for key in ["user_id", "delivery_partner_id"]:
        if key in order and isinstance(order[key], ObjectId):
            order[key] = str(order[key])
    return order

def serialize_product(product):
    product = dict(product)
    #product["id"] = str(product["_id"])
    product.pop("_id", None)
    return product

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_data = await db.users.find_one({"id": user_id})
        if user_data is None:
            raise HTTPException(status_code=401, detail="User not found")        
        # 🔥 THIS IS THE IMPORTANT FIX
        if not user_data.get("is_active", True):
            raise HTTPException(
                status_code=403,
                detail="Account is blocked"
            )
        return User(**user_data)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_admin_or_superadmin_user(
    user: User = Depends(get_current_user)
) -> User:
    if user.role not in [UserRole.ADMIN, UserRole.SUPERADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return user

@app.on_event("startup")
async def create_superadmin():
    superadmin_exists = await db.users.find_one(
        {"email": "superadmin@milkapp.com"}
    )

    if not superadmin_exists:
        superadmin = {
            "id": str(uuid.uuid4()),
            "email": "superadmin@milkapp.com",
            "name": "Super Admin",
            "password": get_password_hash("superadmin123"),
            "role": UserRole.SUPERADMIN.value,  # ✅ FIXED
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(superadmin)
        logger.info("✅ Superadmin created")

async def get_delivery_partner(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.DELIVERY_PARTNER:
        raise HTTPException(status_code=403, detail="Delivery partner access required")
    return user

# ===================== AUTH ENDPOINTS =====================

async def get_superadmin_user(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin access required"
        )
    return user

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")   
    # Create user
    user_dict = user_data.dict()
    user_dict["password"] = get_password_hash(user_data.password)
    user_dict["id"] = str(uuid.uuid4())
    user_dict["is_active"] = True
    user_dict["created_at"] = datetime.utcnow()
    
    await db.users.insert_one(user_dict)
    # Create wallet for customers
    if user_data.role == UserRole.CUSTOMER:
        wallet = {"user_id": user_dict["id"], "balance": 0.0, "transactions": []}
        await db.wallets.insert_one(wallet)
    # Create token
    access_token = create_access_token({"sub": user_dict["id"]})
    
    user_response = UserResponse(
        id=user_dict["id"],
        email=user_dict["email"],
        name=user_dict["name"],
        phone=user_dict.get("phone"),
        role=user_dict["role"],
        address=user_dict.get("address"),
        is_active=user_dict["is_active"],
        zone=user_dict.get("zone")
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(
        status_code=403,
        detail="Account is blocked. Contact superadmin."
    )
    access_token = create_access_token({"sub": user["id"]})   
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user.get("phone"),
        role=user["role"],
        address=user.get("address"),
        is_active=user["is_active"],
        zone=user.get("zone")
    )
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        role=user.role,
        address=user.address,
        is_active=user.is_active,
        zone=user.zone
    )

@api_router.put("/auth/profile")
async def update_profile(
    update_data: Dict[str, Any],
    user: User = Depends(get_current_user)
):
    allowed_fields = ["name", "phone", "address"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if update_dict:
        await db.users.update_one({"id": user.id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": user.id})
    return UserResponse(**updated_user)

def is_valid_image_url(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")

# ===================== PRODUCT ENDPOINTS =====================

@api_router.get("/catalog/admins")
async def get_admin_catalog():
    admins = await db.users.find(
        {"role": "admin"},
        {"password": 0}
    ).to_list(100)

    return [ {"id": a["id"],"name": a["name"] }
        for a in admins ]

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[ProductCategory] = None,
    admin_id: Optional[str] = None,
    admin: User = Depends(get_admin_user)  # add dependency
):
    query = {}
    if category:
        query["category"] = category.value
    # If admin_id not provided, default to current admin
    query["admin_id"] = admin_id or admin.id

    products = await db.products.find(query).to_list(100)
    return [Product(**p) for p in products]

@api_router.get("/catalog/products", response_model=List[Product])
async def public_catalog(admin_id: Optional[str] = None, category: Optional[ProductCategory] = None):
    query = {}
    if admin_id:
        query["admin_id"] = admin_id
    if category:
        query["category"] = category.value

    products = await db.products.find(query).to_list(100)
    return [Product(**p) for p in products]


@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, admin: User = Depends(get_admin_user)):

    product_dict = product.dict()

    product_dict["admin_id"] = admin.id  # ✅ ADD


    # ✅ ENSURE image_type EXISTS
    if product_dict.get("image") and not product_dict.get("image_type"):
        product_dict["image_type"] = "base64"  # frontend sending base64

    # ✅ OPTIONAL URL validation (only if image_type = url)
    if product_dict.get("image_type") == "url":
        if not is_valid_image_url(product_dict["image"]):
            raise HTTPException(status_code=400, detail="Invalid image URL")

    # ✅ ADD REQUIRED FIELDS
    product_dict["id"] = str(uuid.uuid4())
    product_dict["created_at"] = datetime.utcnow()

    # ✅ THIS LINE ACTUALLY SAVES TO MONGO
    await db.products.insert_one(product_dict)

    return Product(**product_dict)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, update_data: Dict[str, Any], admin: User = Depends(get_admin_user)):

    # ✅ ADD THIS BLOCK
    if "image" in update_data and "image_type" not in update_data:
        update_data["image_type"] = "url"

    if "image" in update_data and update_data.get("image_type") == "url":
        if not is_valid_image_url(update_data["image"]):
            raise HTTPException(status_code=400, detail="Invalid image URL")

    await db.products.update_one({"id": product_id}, {"$set": update_data})

    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return Product(**product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: User = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

@api_router.get("/categories")
async def get_categories():
    return [{"value": c.value, "label": c.value.replace("_", " ").title()} for c in ProductCategory]

# ===================== SUBSCRIPTION ENDPOINTS =====================

@api_router.get("/subscriptions")
async def get_subscriptions(user: User = Depends(get_current_user)):
    subs = await db.subscriptions.find(
        {"user_id": user.id, "is_active": True}
    ).sort("created_at", -1).to_list(100)

    result = []

    for sub in subs:
        product = await db.products.find_one({"id": sub["product_id"]})

        sub["product"] = {
            "name": product["name"],
            "price": product["price"],
            "unit": product.get("unit"),
        } if product else None

        # 🚫 prevent ObjectId crash
        sub["_id"] = str(sub["_id"])

        result.append(sub)

    return result

@api_router.post("/subscriptions", response_model=Subscription)
async def create_subscription(subscription: SubscriptionCreate, user: User = Depends(get_current_user)):

    product = await db.products.find_one({"id": subscription.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not product.get("is_available", True):
        raise HTTPException(status_code=400, detail="Product unavailable")

    user_otp = generate_otp()
    admin_otp = generate_otp()
    
    # ---------------- SUBSCRIPTION ----------------
    sub_dict = subscription.dict()
    sub_dict["id"] = str(uuid.uuid4())
    sub_dict["user_id"] = user.id
    sub_dict["is_active"] = True
    sub_dict["modifications"] = []
    sub_dict["created_at"] = datetime.utcnow()
    sub_dict["admin_id"] = product["admin_id"]
    sub_dict["admin_name"] = product.get("admin_name")
    sub_dict["delivery_otp"] = user_otp

    if subscription.pattern == SubscriptionPattern.BUY_ONCE:
        sub_dict["end_date"] = subscription.start_date

    await db.subscriptions.insert_one(sub_dict)

    # ---------------- ORDER (🔥 NEW) ----------------
    delivery_date = (
        datetime.strptime(subscription.start_date, "%Y-%m-%d").strftime("%Y-%m-%d")
    )

    order = {
        "id": str(uuid.uuid4()),
        "subscription_id": sub_dict["id"],
        "user_id": user.id,
        "admin_id": product["admin_id"],
        "admin_name": product.get("admin_name"),
        "items": [{
            "product_id": product["id"],
            "product_name": product["name"],
            "quantity": subscription.quantity,
            "price": product["price"],
            "subscription_id": sub_dict["id"]
        }],
        "delivery_otp": user_otp,
        "admin_otp": admin_otp,

        "total_amount": subscription.quantity * product["price"],
        "status": OrderStatus.UNASSIGNED.value,
        "delivery_date": delivery_date,
        "delivery_slot": "5:00 AM - 7:00 AM",
        "address": user.address or {},
        "delivery_partner_id": None,
        "created_at": datetime.utcnow()
    }

    await db.orders.insert_one(order)

    return Subscription(**sub_dict)
    

@api_router.put("/subscriptions/{subscription_id}")
async def update_subscription(subscription_id: str, update_data: Dict[str, Any], user: User = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": user.id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    allowed_fields = ["quantity", "pattern", "custom_days", "is_active"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    await db.subscriptions.update_one({"id": subscription_id}, {"$set": update_dict})
    updated = await db.subscriptions.find_one({"id": subscription_id})
    return Subscription(**updated)

@api_router.post("/subscriptions/{subscription_id}/modify")
async def modify_subscription_date(
    subscription_id: str,
    modification: SubscriptionModification,
    user: User = Depends(get_current_user)):
    """Modify quantity for a specific date"""
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": user.id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    # Update or add modification
    modifications = sub.get("modifications", [])
    existing_idx = next((i for i, m in enumerate(modifications) if m["date"] == modification.date), None)
    
    if existing_idx is not None:
        modifications[existing_idx]["quantity"] = modification.quantity
    else:
        modifications.append({"date": modification.date, "quantity": modification.quantity})
    
    await db.subscriptions.update_one({"id": subscription_id}, {"$set": {"modifications": modifications}})
    return {"message": "Modification saved", "modifications": modifications}

@api_router.delete("/subscriptions/{subscription_id}")
async def cancel_subscription(
    subscription_id: str,
    user: User = Depends(get_current_user),
):
    # 1️⃣ Cancel subscription
    result = await db.subscriptions.update_one(
        {
            "id": subscription_id,
            "user_id": user.id,
            "is_active": True,
        },
        {
            "$set": {"is_active": False}
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Active subscription not found",
        )

    # 2️⃣ DELETE related orders
    await db.orders.delete_many(
        {
            "subscription_id": subscription_id,
            "user_id": user.id,
        }
    )

    return {
        "success": True,
        "message": "Subscription cancelled and orders deleted",
    }

@api_router.get("/superadmin/products")
async def get_all_products_superadmin(
    superadmin: User = Depends(get_superadmin_user)
):
    products = await db.products.find().to_list(1000)

    for p in products:
        if "_id" in p:
            p["_id"] = str(p["_id"])

    return products


# ===================== VACATION ENDPOINTS =====================

@api_router.get("/vacations", response_model=List[Vacation])
async def get_vacations(user: User = Depends(get_current_user)):
    vacations = await db.vacations.find({"user_id": user.id}).to_list(100)
    return [Vacation(**v) for v in vacations]

@api_router.post("/vacations", response_model=Vacation)
async def create_vacation(vacation: VacationCreate, user: User = Depends(get_current_user)):
    vacation_dict = vacation.dict()
    vacation_dict["id"] = str(uuid.uuid4())
    vacation_dict["user_id"] = user.id
    vacation_dict["created_at"] = datetime.utcnow()
    await db.vacations.insert_one(vacation_dict)
    return Vacation(**vacation_dict)

@api_router.delete("/vacations/{vacation_id}")
async def delete_vacation(vacation_id: str, user: User = Depends(get_current_user)):
    result = await db.vacations.delete_one({"id": vacation_id, "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vacation not found")
    return {"message": "Vacation deleted"}

# ===================== WALLET ENDPOINTS =====================

@api_router.get("/wallet")
async def get_wallet(user: User = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": user.id})
    if not wallet:
        wallet = {"user_id": user.id, "balance": 0.0, "transactions": []}
        await db.wallets.insert_one(wallet)
    return {"balance": wallet.get("balance", 0.0)}

@api_router.get("/wallet/transactions")
async def get_wallet_transactions(user: User = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": user.id})
    if not wallet:
        return []
    return wallet.get("transactions", [])[-50:]  # Last 50 transactions

@api_router.post("/wallet/recharge")
async def recharge_wallet(recharge: WalletRecharge, user: User = Depends(get_current_user)):
    if recharge.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    wallet = await db.wallets.find_one({"user_id": user.id})
    if not wallet:
        wallet = {"user_id": user.id, "balance": 0.0, "transactions": []}
        await db.wallets.insert_one(wallet)
    
    new_balance = wallet.get("balance", 0.0) + recharge.amount
    
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "amount": recharge.amount,
        "type": "credit",
        "description": "Wallet recharge",
        "balance_after": new_balance,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.wallets.update_one(
        {"user_id": user.id},
        {
            "$set": {"balance": new_balance},
            "$push": {"transactions": transaction}
        }
    )
    
    return {"message": "Recharge successful", "new_balance": new_balance}

# ===================== ORDER ENDPOINTS =====================

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user: User = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user.id}).sort("created_at", -1).to_list(100)
    return [Order(**o) for o in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": user.id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.get("/orders/tomorrow/preview")
async def preview_tomorrow_order(user: User = Depends(get_current_user)):
    """Preview what tomorrow's order will look like based on active subscriptions"""
    tomorrow = (now_ist() + timedelta(days=1)).strftime("%Y-%m-%d")

    # Get active subscriptions
    subscriptions = await db.subscriptions.find({"user_id": user.id, "is_active": True}).to_list(100)
    
    # Check vacation dates
    vacations = await db.vacations.find({"user_id": user.id}).to_list(100)
    is_vacation = any(v["start_date"] <= tomorrow <= v["end_date"] for v in vacations)
    
    if is_vacation:
        return {"message": "You're on vacation tomorrow", "items": [], "total": 0}
    
    items = []
    total = 0.0
    tomorrow_date = datetime.strptime(tomorrow, "%Y-%m-%d")
    day_of_week = tomorrow_date.weekday()  # 0=Monday, 6=Sunday
    
    for sub in subscriptions:
        # Check if subscription is valid for tomorrow
        if sub.get("end_date") and sub["end_date"] < tomorrow:
            continue
        if sub["start_date"] > tomorrow:
            continue
            
        # Check pattern
        should_deliver = False
        if sub["pattern"] == "daily":
            should_deliver = True
        elif sub["pattern"] == "alternate":
            start = datetime.strptime(sub["start_date"], "%Y-%m-%d")
            days_diff = (tomorrow_date - start).days
            should_deliver = days_diff % 2 == 0
        elif sub["pattern"] == "custom":
            should_deliver = day_of_week in (sub.get("custom_days") or [])
        elif sub["pattern"] == "buy_once":
            should_deliver = sub["start_date"] == tomorrow
        
        if should_deliver:
            product = await db.products.find_one({"id": sub["product_id"]})
            if product:
                # Check for date-specific modifications
                quantity = sub["quantity"]
                for mod in sub.get("modifications", []):
                    if mod["date"] == tomorrow:
                        quantity = mod["quantity"]
                        break
                
                if quantity > 0:
                    item_total = product["price"] * quantity
                    items.append({
                        "product_id": product["id"],
                        "product_name": product["name"],
                        "quantity": quantity,
                        "price": product["price"],
                        "total": item_total
                    })
                    total += item_total
    
    # Check wallet balance
    wallet = await db.wallets.find_one({"user_id": user.id})
    balance = wallet.get("balance", 0.0) if wallet else 0.0
    
    return {
        "date": tomorrow,
        "items": items,
        "total": total,
        "wallet_balance": balance,
        "sufficient_balance": balance >= total
    }

# ===================== DELIVERY PARTNER ENDPOINTS =====================

@api_router.post("/delivery/checkin")
async def delivery_checkin(partner: User = Depends(get_delivery_partner)):
    today = now_ist().strftime("%Y-%m-%d")
    
    existing = await db.checkins.find_one({
    "partner_id": partner.id,
    "date": today,
    "checkout_time": None  })

    if existing:
        return {"message": "Already checked in", "checkin": serialize_doc(existing)}

    checkin = {
        "id": str(uuid.uuid4()),
        "partner_id": partner.id,
        "checkin_time": now_ist().isoformat(),
        "checkout_time": None,
        "date": today
    }
    await db.checkins.insert_one(checkin)
    return {"message": "Checked in successfully", "checkin": serialize_doc(checkin)}

@api_router.post("/delivery/checkout")
async def delivery_checkout(partner: User = Depends(get_delivery_partner)):
    today = now_ist().strftime("%Y-%m-%d")
    
    result = await db.checkins.update_one(
    {
        "partner_id": partner.id,
        "date": today,
        "checkout_time": None   # ⭐ VERY IMPORTANT
    },
    {
        "$set": {
            "checkout_time": now_ist().isoformat()
        }
    }
)
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="No active checkin found")
    
    return {"message": "Checked out successfully"}

@api_router.get("/delivery/today")
async def get_today_deliveries(partner: User = Depends(get_delivery_partner)):
    """Get all deliveries assigned to this partner for today"""
    today = now_ist().strftime("%Y-%m-%d")
    
    assigned_admins = getattr(partner, "assigned_admin_ids", [])

    if not assigned_admins:
         return []

    orders = await db.orders.find({
        "delivery_partner_id": partner.id,
        "delivery_date": today,
        "admin_id": {"$in": assigned_admins},
        "status": {"$in": ["pending", "assigned", "out_for_delivery"]}
    }).to_list(100)
    
    # Get customer details for each order
    result = []
    for order in orders:
        customer = await db.users.find_one({"id": order["user_id"]})
        result.append({
            **order,
            "customer_name": customer["name"] if customer else "Unknown",
            "customer_phone": customer.get("phone", "N/A") if customer else "N/A"
        })
    
    return result

@api_router.post("/delivery/complete")
async def complete_delivery(delivery: DeliveryComplete, partner: User = Depends(get_delivery_partner)):
    order = await db.orders.find_one({"id": delivery.order_id, "delivery_partner_id": partner.id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not assigned to you")
    
    update_data = {
         "status": OrderStatus.DELIVERED.value,
        "delivered_at": now_ist().isoformat()
    }
    
    if delivery.proof_image:
        update_data["delivery_proof"] = delivery.proof_image
    
    await db.orders.update_one({"id": delivery.order_id}, {"$set": update_data})
    return {"message": "Delivery marked as complete"}

@api_router.get("/delivery/status")
async def get_delivery_shift_status(partner: User = Depends(get_delivery_partner)):
    today = now_ist().strftime("%Y-%m-%d")
    checkin = await db.checkins.find_one(
    {
        "partner_id": partner.id,
        "date": today
    },
    sort=[("checkin_time", -1)]   # ⭐ MOST IMPORTANT
)
    
    if not checkin:
        return {"checked_in": False, "checked_out": False}
    
    checkout_time = checkin.get("checkout_time")
    return {
    "checked_in": True,
    "checked_out": checkout_time is not None, 
    "checkin_time": checkin.get("checkin_time"),
    "checked_out": checkout_time is not None
}

@api_router.post("/delivery/orders/{order_id}/accept")
async def accept_order(
    order_id: str,
    partner: User = Depends(get_delivery_partner)
):
    result = await db.orders.find_one_and_update(
        {
            "id": order_id,
            "status": OrderStatus.UNASSIGNED.value,
            "admin_id": {"$in": partner.assigned_admin_ids}  # 🔒 IMPORTANT
        },
        {
            "$set": {
                "delivery_partner_id": partner.id,
                "status": OrderStatus.ASSIGNED.value,
                "accepted_at": now_ist().isoformat()
            }
        }
    )

    if not result:
        raise HTTPException(
            status_code=400,
            detail="Order already accepted or not available for you"
        )

    return {"message": "Order accepted"}


@api_router.post("/delivery/orders/{order_id}/reject")
async def reject_order(
    order_id: str,
    partner: User = Depends(get_delivery_partner)
):
    order = await db.orders.find_one(
        {
            "id": order_id,
            "admin_id": {"$in": partner.assigned_admin_ids}
        }
    )

    if not order:
        raise HTTPException(404, "Order not found")
    if order["status"] != OrderStatus.UNASSIGNED.value:
        raise HTTPException(400, "Cannot reject an active order")

    await db.rider_rejections.update_one(
        {
            "delivery_partner_id": partner.id,
            "admin_id": order["admin_id"]
        },
        {
            "$addToSet": {"order_ids": order_id}
        },
        upsert=True
    )

    return {"message": "Order hidden from rider"}

@api_router.get("/delivery/available")
async def get_available_orders(partner: User = Depends(get_delivery_partner)):

    today = now_ist().strftime("%Y-%m-%d")

    assigned_admins = getattr(partner, "assigned_admin_ids", [])
    if not assigned_admins:
        return []

    checkin = await db.checkins.find_one({
    "partner_id": partner.id,
    "date": today,
    "checkout_time": None
})

    if not checkin:
        return []

    orders = await db.orders.find({
        "admin_id": {"$in": assigned_admins},
        "status": OrderStatus.UNASSIGNED.value,
        "delivery_date": today   # ⭐ ADD THIS
    }).to_list(100)

    return [serialize_order_public(o) for o in orders]

# ===================== SUPERADMIN ENDPOINTS =====================

@api_router.get("/superadmin/users")
async def get_users_for_superadmin(
    role: Optional[UserRole] = None,
    superadmin: User = Depends(get_superadmin_user)
):
    query = {}
    if role:
        query["role"] = role.value

    users = await db.users.find(query, {"password": 0}).to_list(1000)
    return [
        UserResponse(**u)
        for u in users
    ]

@api_router.get("/superadmin/dashboard")
async def superadmin_dashboard(
    superadmin: User = Depends(get_superadmin_user)
):
    total_customers = await db.users.count_documents({"role": "customer"})
    total_admins = await db.users.count_documents({"role": "admin" })
    total_delivery_partners = await db.users.count_documents({"role": "delivery_partner" })
    active_delivery_partners = await db.users.count_documents({"role": "delivery_partner","is_active": True })
    total_orders = await db.orders.count_documents({})

    return {
        "total_customers": total_customers,
        "total_admins": total_admins,
        "total_delivery_partners": total_delivery_partners,
        "active_delivery_partners": active_delivery_partners,
        "total_orders": total_orders,
        # frontend safety
        "today_orders": 0,
        "pending_orders": 0,
        "delivered_today": 0,
        "total_revenue": 0,
        "today_revenue": 0,
        "week_revenue": 0,
        "month_revenue": 0,
        "revenue_trend": [],
        "orders_by_status": []
    }

@api_router.put("/superadmin/products/{product_id}/status")
async def update_product_status(
    product_id: str,
    payload: ProductStatusUpdate,
    superadmin: User = Depends(get_superadmin_user)
):
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"is_available": payload.is_available}} )

    if result.matched_count == 0:
        raise HTTPException(404, "Product not found")

    product = await db.products.find_one({"id": product_id})
    return serialize_product(product)

@api_router.put("/superadmin/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    body: UserStatusUpdate,
    superadmin: User = Depends(get_superadmin_user)
):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": body.is_active}} )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User status updated"}

@api_router.put("/superadmin/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: UserRole,
    superadmin: User = Depends(get_superadmin_user)):
    if role == UserRole.SUPERADMIN:
        raise HTTPException(status_code=400, detail="Cannot assign superadmin")

    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role.value}})

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User role updated"}

@api_router.get("/superadmin/orders")
async def get_all_orders_for_superadmin(
    admin_id: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None,
    superadmin: User = Depends(get_superadmin_user)):
    query = {}

    # ✅ Filter by Admin
    if admin_id:
        query["admin_id"] = admin_id
    # ✅ Filter by Status
    if status:
        query["status"] = status
    # ✅ Filter by Delivery Date
    if date:
        query["delivery_date"] = date

    orders = await db.orders.find(query).to_list(1000)

    return [serialize_order(o) for o in orders]

#----- superadmin order genarte erased

@api_router.get("/superadmin/revenue")
async def get_revenue_for_superadmin(
    start_date: date,
    end_date: date,
    superadmin: User = Depends(get_superadmin_user)
):
    pipeline = [
        {
            "$match": {
                "created_at": {
                    "$gte": datetime.combine(start_date, datetime.min.time()),
                    "$lte": datetime.combine(end_date, datetime.max.time())
                }
            }
        },
        {
            "$group": {
                "_id": None,
                "total_revenue": {"$sum": "$total_amount"}
            }
        }
    ]

    result = await db.orders.aggregate(pipeline).to_list(1)
    return {
        "total_revenue": result[0]["total_revenue"] if result else 0
    }

@api_router.put("/superadmin/riders/{rider_id}/assign-admins")
async def assign_rider_admins(
    rider_id: str,
    body: AssignAdminsRequest,
    superadmin: User = Depends(get_superadmin_user)):
    result = await db.users.update_one(
        {"id": rider_id, "role": "delivery_partner"},
        {"$set": {"assigned_admin_ids": body.assigned_admin_ids}})

    if result.matched_count == 0:
        raise HTTPException(404, "Rider not found")

    return {"message": "Admins assigned successfully"}

@api_router.put("/superadmin/users/{user_id}/zone")
async def assign_zone(
    user_id: str,
    body: AssignZoneRequest,
    superadmin: User = Depends(get_superadmin_user)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"zone": body.zone}})

    if result.matched_count == 0:
        raise HTTPException(404, "User not found")

    return {"message": "Zone assigned"}

@api_router.get("/superadmin/admins-with-riders")
async def get_admins_with_riders(
    superadmin: User = Depends(get_superadmin_user)):
    # Get all admins
    admins = await db.users.find(
        {"role": "admin"},
        {"password": 0}
    ).to_list(1000)
    # Get all riders
    riders = await db.users.find(
        {"role": "delivery_partner"},
        {"password": 0}
    ).to_list(1000)

    result = []

    for admin in admins:
        assigned_rider = next(
            (
                r for r in riders
                if admin["id"] in r.get("assigned_admin_ids", [])
            ),
            None )

        admin["assigned_rider_name"] = (
            assigned_rider["name"] if assigned_rider else None
        )

        result.append(admin)

        for admin in result:
         admin.pop("_id", None)

    return result

@api_router.put("/superadmin/users/{user_id}/verify")
async def verify_user(
    user_id: str,
    body: VerifyUserRequest,
    superadmin: User = Depends(get_superadmin_user)
):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_verified": body.is_verified}}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "User not found")

    return {"message": "User verification updated"}

@api_router.delete("/superadmin/users/{user_id}")
async def delete_user(
    user_id: str,
    superadmin: User = Depends(get_superadmin_user)
):
    user = await db.users.find_one({"id": user_id})

    if not user:
        raise HTTPException(404, "User not found")

    if user.get("role") == "superadmin":
        raise HTTPException(400, "Cannot delete superadmin")

    await db.users.delete_one({"id": user_id})

    return {"message": "User deleted"}

@api_router.post("/superadmin/users/create-rider")
async def create_rider(
    rider: CreateRiderRequest,
    superadmin: User = Depends(get_superadmin_user)
):
    existing = await db.users.find_one({"email": rider.email})
    if existing:
        raise HTTPException(400, "Email already exists")

    rider_dict = rider.dict()
    rider_dict["id"] = str(uuid.uuid4())
    rider_dict["password"] = get_password_hash(rider.password)
    rider_dict["role"] = UserRole.DELIVERY_PARTNER.value
    rider_dict["is_active"] = True
    rider_dict["is_verified"] = False
    rider_dict["assigned_admin_ids"] = []
    rider_dict["created_at"] = datetime.utcnow()

    await db.users.insert_one(rider_dict)

    return {"message": "Rider created successfully"}


# ===================== ADMIN ENDPOINTS =====================

@api_router.get("/admin/dashboard")
async def admin_dashboard(admin: User = Depends(get_admin_user)):
    today = now_ist().strftime("%Y-%m-%d")
    
    # Get stats
    total_customers = await db.users.count_documents({"role": "customer"})
    total_partners = await db.users.count_documents({"role": "delivery_partner"})
    active_subscriptions = await db.subscriptions.count_documents({"is_active": True})
    today_orders = await db.orders.count_documents({"delivery_date": today})
    delivered_today = await db.orders.count_documents({"delivery_date": today, "status": "delivered"})
    
    # Calculate today's revenue
    today_orders_list = await db.orders.find({"delivery_date": today, "status": "delivered"}).to_list(1000)
    today_revenue = sum(o.get("total_amount", 0) for o in today_orders_list)
    
    return {
        "total_customers": total_customers,
        "total_delivery_partners": total_partners,
        "active_subscriptions": active_subscriptions,
        "today_orders": today_orders,
        "delivered_today": delivered_today,
        "today_revenue": today_revenue }

#admin procurement erased 

@api_router.get("/admin/users")
async def get_all_users(role: Optional[UserRole] = None, admin: User = Depends(get_admin_user)):
    query = {}
    if role:
        query["role"] = role.value
    users = await db.users.find(query).to_list(1000)
    return [UserResponse(**{k: v for k, v in u.items() if k != "password"}) for u in users]

@api_router.put("/admin/users/{user_id}/zone")
async def assign_zone(user_id: str, assignment: ZoneAssignment, admin: User = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id, "role": "delivery_partner"})
    if not user:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    
    await db.users.update_one({"id": user_id}, {"$set": {"zone": assignment.zone}})
    return {"message": "Zone assigned successfully"}

@api_router.put("/admin/products/{product_id}/stock")
async def update_stock(product_id: str, stock: StockUpdate, admin: User = Depends(get_admin_user)):
    result = await db.products.update_one({"id": product_id}, {"$set": {"stock": stock.quantity}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Stock updated"}

@api_router.get("/admin/orders")
async def get_all_orders(
    status: Optional[str] = None,
    date: Optional[str] = None,
    admin: User = Depends(get_admin_user),
):
    query = {"admin_id": admin.id}

    if status:
        query["status"] = status.lower()  # matches DB
    if date:
        query["delivery_date"] = date

    orders = await db.orders.find(query).sort("created_at", -1).to_list(1000)

    result = []

    for o in orders:
        # ✅ CUSTOMER
        user = await db.users.find_one({"id": o.get("user_id")})
        o["customer_name"] = user["name"] if user else "Unknown Customer"
        o["customer_phone"] = user["phone"] if user and user.get("phone") else None

        # ✅ RIDER
        if o.get("delivery_partner_id"):
            rider = await db.users.find_one({"id": o["delivery_partner_id"]})
            o["delivery_partner_name"] = rider["name"] if rider else None
            o["delivery_partner_phone"] = rider["phone"] if rider and rider.get("phone") else None
        else:
            o["delivery_partner_name"] = None
            o["delivery_partner_phone"] = None

        result.append(Order(**o))

    return result



@api_router.put("/admin/orders/{order_id}/assign")
async def assign_delivery_partner(order_id: str, partner_id: str, admin: User = Depends(get_admin_user)):
    partner = await db.users.find_one({"id": partner_id, "role": "delivery_partner"})
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"delivery_partner_id": partner_id, "status": OrderStatus.ASSIGNED.value}} )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Delivery partner assigned"}

@api_router.get("/admin/finance")
async def get_finance_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: User = Depends(get_admin_user)):
    query = {"status": "delivered"}
    if start_date:
        query["delivery_date"] = {"$gte": start_date}
    if end_date:
        if "delivery_date" in query:
            query["delivery_date"]["$lte"] = end_date
        else:
            query["delivery_date"] = {"$lte": end_date}
    
    orders = await db.orders.find(query).to_list(10000)
    
    total_revenue = sum(o.get("total_amount", 0) for o in orders)
    total_orders = len(orders)
    
    # Group by date
    by_date = {}
    for o in orders:
        date = o.get("delivery_date", "unknown")
        if date not in by_date:
            by_date[date] = {"revenue": 0, "orders": 0}
        by_date[date]["revenue"] += o.get("total_amount", 0)
        by_date[date]["orders"] += 1
    
    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "by_date": by_date  }

@api_router.post("/admin/refund")
async def process_refund(user_id: str, amount: float, reason: str, admin: User = Depends(get_admin_user)):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        raise HTTPException(status_code=404, detail="User wallet not found")
    
    new_balance = wallet.get("balance", 0.0) + amount
    
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "amount": amount,
        "type": "credit",
        "description": f"Refund: {reason}",
        "balance_after": new_balance,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.wallets.update_one(
        {"user_id": user_id},
          {
            "$set": {"balance": new_balance},
            "$push": {"transactions": transaction}})
    
    return {"message": "Refund processed", "new_balance": new_balance}

# ===================== MIDNIGHT RUN - ORDER GENERATION =====================

#--- erased  admin order genarete

# ===================== SEED DATA =====================

@api_router.post("/seed")
async def seed_data():
    """Seed initial product data"""
    # Check if products already exist
    existing = await db.products.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    products = [] # ----> U can hardcode product in brackets whichh will never can be deleted 
    
    for p in products:
        p["id"] = str(uuid.uuid4())
        p["created_at"] = datetime.utcnow()
    
    await db.products.insert_many(products)
    
    # Create admin user
    admin_exists = await db.users.find_one({"email": "admin@milkapp.com"})
    if not admin_exists:
        admin = {
            "id": str(uuid.uuid4()),
            "email": "admin@milkapp.com",
            "name": "Admin User",
            "password": get_password_hash("admin123"),
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow() }
        await db.users.insert_one(admin)
    
    return {"message": "Data seeded successfully", "products_count": len(products)}

# Include router
app.include_router(api_router)

# CORS middleware
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
