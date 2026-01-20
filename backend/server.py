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
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from enum import Enum
import base64

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

# ===================== ENUMS =====================
class UserRole(str, Enum):
    CUSTOMER = "customer"
    DELIVERY_PARTNER = "delivery_partner"
    ADMIN = "admin"

class SubscriptionPattern(str, Enum):
    DAILY = "daily"
    ALTERNATE = "alternate"
    CUSTOM = "custom"
    BUY_ONCE = "buy_once"

class OrderStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
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
    address: Optional[Dict[str, Any]] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    zone: Optional[str] = None  # For delivery partners

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str]
    role: UserRole
    address: Optional[Dict[str, Any]]
    is_active: bool
    zone: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Product Models
# class ProductBase(BaseModel):
#     name: str
#     description: Optional[str] = None
#     category: ProductCategory
#     price: float
#     unit: str  # e.g., "500ml", "1L", "1kg"
#     image: Optional[str] = None  # base64
    
#     nutritional_info: Optional[Dict[str, Any]] = None
#     stock: int = 100
#     is_available: bool = True

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
    modifications: List[Dict[str, Any]] = []  # Date-specific quantity changes
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
    transactions: List[WalletTransaction] = []

# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float
    subscription_id: Optional[str] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[OrderItem]
    total_amount: float
    status: OrderStatus = OrderStatus.PENDING
    delivery_date: str  # YYYY-MM-DD
    delivery_slot: str = "5:00 AM - 7:00 AM"
    address: Dict[str, Any]
    delivery_partner_id: Optional[str] = None
    delivery_proof: Optional[str] = None  # base64 image
    delivered_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

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

class ProcurementItem(BaseModel):
    product_id: str
    product_name: str
    total_quantity: int
    category: str

# ===================== AUTH HELPERS =====================

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
        
        return User(**user_data)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_delivery_partner(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.DELIVERY_PARTNER:
        raise HTTPException(status_code=403, detail="Delivery partner access required")
    return user

# ===================== AUTH ENDPOINTS =====================

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

@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[ProductCategory] = None):
    query = {}
    if category:
        query["category"] = category
    products = await db.products.find(query).to_list(100)
    return [Product(**p) for p in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

# @api_router.post("/products", response_model=Product)
# async def create_product(product: ProductCreate, admin: User = Depends(get_admin_user)):
#     product_dict = product.dict()
#     product_dict["id"] = str(uuid.uuid4())
#     product_dict["created_at"] = datetime.utcnow()
#     await db.products.insert_one(product_dict)
#     return Product(**product_dict)

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, admin: User = Depends(get_admin_user)):
        
    product_dict = product.dict()

    # ✅ ADD THIS BLOCK (VERY IMPORTANT)
    if product_dict.get("image") and not product_dict.get("image_type"):
        product_dict["image_type"] = "url"

    # Validate image if URL
    if product_dict.get("image") and product_dict.get("image_type") == "url":
        if not is_valid_image_url(product_dict["image"]):
            raise HTTPException(status_code=400, detail="Invalid image URL")

    product_dict["id"] = str(uuid.uuid4())
    product_dict["created_at"] = datetime.utcnow()

    await db.products.insert_one(product_dict)
    return Product(**product_dict)



# @api_router.put("/products/{product_id}", response_model=Product)
# async def update_product(product_id: str, update_data: Dict[str, Any], admin: User = Depends(get_admin_user)):
#     await db.products.update_one({"id": product_id}, {"$set": update_data})
#     product = await db.products.find_one({"id": product_id})
#     if not product:
#         raise HTTPException(status_code=404, detail="Product not found")
#     return Product(**product)

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

@api_router.get("/subscriptions", response_model=List[SubscriptionResponse])
async def get_subscriptions(user: User = Depends(get_current_user)):
    subscriptions = await db.subscriptions.find({"user_id": user.id, "is_active": True}).to_list(100)
    result = []
    for sub in subscriptions:
        product = await db.products.find_one({"id": sub["product_id"]})
        sub_response = SubscriptionResponse(**sub, product=Product(**product) if product else None)
        result.append(sub_response)
    return result

@api_router.post("/subscriptions", response_model=Subscription)
async def create_subscription(subscription: SubscriptionCreate, user: User = Depends(get_current_user)):
    # Verify product exists
    product = await db.products.find_one({"id": subscription.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    sub_dict = subscription.dict()
    sub_dict["id"] = str(uuid.uuid4())
    sub_dict["user_id"] = user.id
    sub_dict["is_active"] = True
    sub_dict["modifications"] = []
    sub_dict["created_at"] = datetime.utcnow()
    
    # For buy_once, set end_date same as start_date
    if subscription.pattern == SubscriptionPattern.BUY_ONCE:
        sub_dict["end_date"] = subscription.start_date
    
    await db.subscriptions.insert_one(sub_dict)
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
    user: User = Depends(get_current_user)
):
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
async def cancel_subscription(subscription_id: str, user: User = Depends(get_current_user)):
    result = await db.subscriptions.update_one(
        {"id": subscription_id, "user_id": user.id},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription cancelled"}

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
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
    
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
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    existing = await db.checkins.find_one({"partner_id": partner.id, "date": today})
    if existing:
        return {"message": "Already checked in", "checkin": existing}
    
    checkin = {
        "id": str(uuid.uuid4()),
        "partner_id": partner.id,
        "checkin_time": datetime.utcnow().isoformat(),
        "checkout_time": None,
        "date": today
    }
    await db.checkins.insert_one(checkin)
    return {"message": "Checked in successfully", "checkin": checkin}

@api_router.post("/delivery/checkout")
async def delivery_checkout(partner: User = Depends(get_delivery_partner)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    result = await db.checkins.update_one(
        {"partner_id": partner.id, "date": today},
        {"$set": {"checkout_time": datetime.utcnow().isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="No active checkin found")
    
    return {"message": "Checked out successfully"}

@api_router.get("/delivery/today")
async def get_today_deliveries(partner: User = Depends(get_delivery_partner)):
    """Get all deliveries assigned to this partner for today"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    orders = await db.orders.find({
        "delivery_partner_id": partner.id,
        "delivery_date": today,
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
        "status": OrderStatus.DELIVERED,
        "delivered_at": datetime.utcnow().isoformat()
    }
    
    if delivery.proof_image:
        update_data["delivery_proof"] = delivery.proof_image
    
    await db.orders.update_one({"id": delivery.order_id}, {"$set": update_data})
    return {"message": "Delivery marked as complete"}

@api_router.get("/delivery/status")
async def get_checkin_status(partner: User = Depends(get_delivery_partner)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    checkin = await db.checkins.find_one({"partner_id": partner.id, "date": today})
    
    if not checkin:
        return {"checked_in": False, "checked_out": False}
    
    return {
        "checked_in": True,
        "checked_out": checkin.get("checkout_time") is not None,
        "checkin_time": checkin.get("checkin_time"),
        "checkout_time": checkin.get("checkout_time")
    }

# ===================== ADMIN ENDPOINTS =====================

@api_router.get("/admin/dashboard")
async def admin_dashboard(admin: User = Depends(get_admin_user)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
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
        "today_revenue": today_revenue
    }

@api_router.get("/admin/procurement")
async def get_procurement_list(admin: User = Depends(get_admin_user)):
    """Generate procurement list for tomorrow based on subscriptions"""
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
    tomorrow_date = datetime.strptime(tomorrow, "%Y-%m-%d")
    day_of_week = tomorrow_date.weekday()
    
    # Get all active subscriptions
    subscriptions = await db.subscriptions.find({"is_active": True}).to_list(10000)
    
    # Group by product
    product_quantities = {}
    
    for sub in subscriptions:
        # Check vacation
        vacations = await db.vacations.find({"user_id": sub["user_id"]}).to_list(100)
        is_vacation = any(v["start_date"] <= tomorrow <= v["end_date"] for v in vacations)
        if is_vacation:
            continue
        
        # Check dates
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
            quantity = sub["quantity"]
            for mod in sub.get("modifications", []):
                if mod["date"] == tomorrow:
                    quantity = mod["quantity"]
                    break
            
            if quantity > 0:
                pid = sub["product_id"]
                product_quantities[pid] = product_quantities.get(pid, 0) + quantity
    
    # Get product details
    result = []
    for pid, qty in product_quantities.items():
        product = await db.products.find_one({"id": pid})
        if product:
            result.append({
                "product_id": pid,
                "product_name": product["name"],
                "category": product["category"],
                "total_quantity": qty,
                "unit": product["unit"]
            })
    
    return {"date": tomorrow, "items": result}

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
    status: Optional[OrderStatus] = None,
    date: Optional[str] = None,
    admin: User = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status.value
    if date:
        query["delivery_date"] = date
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(1000)
    return [Order(**o) for o in orders]

@api_router.put("/admin/orders/{order_id}/assign")
async def assign_delivery_partner(order_id: str, partner_id: str, admin: User = Depends(get_admin_user)):
    partner = await db.users.find_one({"id": partner_id, "role": "delivery_partner"})
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"delivery_partner_id": partner_id, "status": OrderStatus.ASSIGNED}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Delivery partner assigned"}

@api_router.get("/admin/finance")
async def get_finance_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: User = Depends(get_admin_user)
):
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
        "by_date": by_date
    }

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
            "$push": {"transactions": transaction}
        }
    )
    
    return {"message": "Refund processed", "new_balance": new_balance}

# ===================== MIDNIGHT RUN - ORDER GENERATION =====================

@api_router.post("/admin/generate-orders")
async def generate_tomorrow_orders(admin: User = Depends(get_admin_user)):
    """Generate orders for tomorrow based on subscriptions - The Midnight Run"""
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
    tomorrow_date = datetime.strptime(tomorrow, "%Y-%m-%d")
    day_of_week = tomorrow_date.weekday()
    
    # Get all customers with active subscriptions
    subscriptions = await db.subscriptions.find({"is_active": True}).to_list(10000)
    
    # Group subscriptions by user
    user_subs = {}
    for sub in subscriptions:
        uid = sub["user_id"]
        if uid not in user_subs:
            user_subs[uid] = []
        user_subs[uid].append(sub)
    
    orders_created = 0
    orders_skipped = 0
    
    for user_id, subs in user_subs.items():
        # Check vacation
        vacations = await db.vacations.find({"user_id": user_id}).to_list(100)
        is_vacation = any(v["start_date"] <= tomorrow <= v["end_date"] for v in vacations)
        if is_vacation:
            orders_skipped += 1
            continue
        
        # Get user details
        user = await db.users.find_one({"id": user_id})
        if not user:
            continue
        
        # Calculate order items
        items = []
        total = 0.0
        
        for sub in subs:
            # Check dates
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
                    quantity = sub["quantity"]
                    for mod in sub.get("modifications", []):
                        if mod["date"] == tomorrow:
                            quantity = mod["quantity"]
                            break
                    
                    if quantity > 0:
                        item_total = product["price"] * quantity
                        items.append(OrderItem(
                            product_id=product["id"],
                            product_name=product["name"],
                            quantity=quantity,
                            price=product["price"],
                            subscription_id=sub["id"]
                        ))
                        total += item_total
        
        if not items:
            continue
        
        # Check wallet balance
        wallet = await db.wallets.find_one({"user_id": user_id})
        balance = wallet.get("balance", 0.0) if wallet else 0.0
        
        if balance < total:
            # Skip order due to insufficient balance
            orders_skipped += 1
            # In real app, would send SMS notification here
            continue
        
        # Deduct from wallet
        new_balance = balance - total
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": total,
            "type": "debit",
            "description": f"Order for {tomorrow}",
            "balance_after": new_balance,
            "created_at": datetime.utcnow().isoformat()
        }
        
        await db.wallets.update_one(
            {"user_id": user_id},
            {
                "$set": {"balance": new_balance},
                "$push": {"transactions": transaction}
            }
        )
        
        # Create order
        order = Order(
            user_id=user_id,
            items=[item.dict() for item in items],
            total_amount=total,
            delivery_date=tomorrow,
            address=user.get("address", {})
        )
        
        await db.orders.insert_one(order.dict())
        orders_created += 1
    
    return {
        "message": "Midnight run completed",
        "orders_created": orders_created,
        "orders_skipped": orders_skipped
    }

# ===================== SEED DATA =====================

@api_router.post("/seed")
async def seed_data():
    """Seed initial product data"""
    # Check if products already exist
    existing = await db.products.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    # products = [
    #     # Milk
    #     {"name": "Fresh Cow Milk", "category": "milk", "price": 60, "unit": "1L", "description": "Farm-fresh whole cow milk", "stock": 500, "is_available": True},
    #     {"name": "Toned Milk", "category": "milk", "price": 52, "unit": "1L", "description": "Low-fat toned milk", "stock": 400, "is_available": True},
    #     {"name": "Buffalo Milk", "category": "milk", "price": 70, "unit": "1L", "description": "Rich and creamy buffalo milk", "stock": 300, "is_available": True},
    #     {"name": "Organic A2 Milk", "category": "milk", "price": 90, "unit": "1L", "description": "Premium organic A2 cow milk", "stock": 200, "is_available": True},
    #     {"name": "Skimmed Milk", "category": "milk", "price": 48, "unit": "1L", "description": "Fat-free skimmed milk", "stock": 250, "is_available": True},
        
    #     # Dairy
    #     {"name": "Fresh Curd", "category": "dairy", "price": 45, "unit": "500g", "description": "Homemade style fresh curd", "stock": 300, "is_available": True},
    #     {"name": "Paneer", "category": "dairy", "price": 120, "unit": "250g", "description": "Fresh cottage cheese", "stock": 150, "is_available": True},
    #     {"name": "Butter", "category": "dairy", "price": 55, "unit": "100g", "description": "Fresh unsalted butter", "stock": 200, "is_available": True},
    #     {"name": "Ghee", "category": "dairy", "price": 180, "unit": "250ml", "description": "Pure desi ghee", "stock": 100, "is_available": True},
    #     {"name": "Cheese Slices", "category": "dairy", "price": 85, "unit": "200g", "description": "Processed cheese slices", "stock": 150, "is_available": True},
        
    #     # Bakery
    #     {"name": "White Bread", "category": "bakery", "price": 40, "unit": "400g", "description": "Soft white sandwich bread", "stock": 200, "is_available": True},
    #     {"name": "Brown Bread", "category": "bakery", "price": 45, "unit": "400g", "description": "Healthy whole wheat bread", "stock": 180, "is_available": True},
    #     {"name": "Milk Bread", "category": "bakery", "price": 50, "unit": "400g", "description": "Soft and fluffy milk bread", "stock": 150, "is_available": True},
    #     {"name": "Butter Croissant", "category": "bakery", "price": 35, "unit": "1pc", "description": "Flaky butter croissant", "stock": 100, "is_available": True},
        
    #     # Fruits
    #     {"name": "Bananas", "category": "fruits", "price": 50, "unit": "1 dozen", "description": "Fresh ripe bananas", "stock": 200, "is_available": True},
    #     {"name": "Apples",  "category": "fruits", "price": 180, "unit": "1kg", "description": "Fresh red apples", "stock": 150, "is_available": True},
    #     {"name": "Oranges", "category": "fruits", "price": 80, "unit": "1kg", "description": "Juicy sweet oranges", "stock": 120, "is_available": True},
        
    #     # Essentials
    #     {"name": "Farm Eggs", "category": "essentials", "price": 80, "unit": "12 pcs", "description": "Free-range farm eggs", "stock": 300, "is_available": True},
    #     {"name": "Organic Eggs", "category": "essentials", "price": 120, "unit": "12 pcs", "description": "Certified organic eggs", "stock": 150, "is_available": True},
    # ]
    
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
            "created_at": datetime.utcnow()
        }
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
