from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    price: float
    availability: bool = True
    image: str
    description: str
    vegType: str = "veg"  # veg, non-veg, starter, breakfast

class MenuItemCreate(BaseModel):
    name: str
    category: str
    price: float
    description: str
    image: str = ""
    vegType: str = "veg"

class MenuItemUpdateFull(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    image: Optional[str] = None
    availability: Optional[bool] = None
    vegType: Optional[str] = None

class MenuItemUpdate(BaseModel):
    availability: bool

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tableNumber: int
    waiterName: str
    status: str = "available"

class OrderItem(BaseModel):
    id: str
    name: str
    price: float
    quantity: int

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    orderId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tableNumber: int
    items: List[OrderItem]
    totalAmount: float
    status: str = "ordered"
    waiterName: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    isPaid: bool = False

class OrderCreate(BaseModel):
    tableNumber: int
    items: List[OrderItem]
    totalAmount: float
    waiterName: str

class OrderStatusUpdate(BaseModel):
    status: str

class Rating(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    orderId: str
    tableNumber: int
    rating: int
    feedback: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RatingCreate(BaseModel):
    orderId: str
    tableNumber: int
    rating: int
    feedback: str

# Menu endpoints
@api_router.get("/menu", response_model=List[MenuItem])
async def get_menu():
    menu_items = await db.menu_items.find({}, {"_id": 0}).to_list(1000)
    for item in menu_items:
        if isinstance(item.get('timestamp'), str):
            item['timestamp'] = datetime.fromisoformat(item['timestamp'])
    return menu_items

@api_router.put("/menu/{item_id}/availability")
async def update_menu_availability(item_id: str, update: MenuItemUpdate):
    result = await db.menu_items.update_one(
        {"id": item_id},
        {"$set": {"availability": update.availability}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Availability updated successfully"}

# Admin CRUD endpoints
@api_router.post("/admin/menu", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate):
    menu_item = MenuItem(**item.model_dump())
    doc = menu_item.model_dump()
    await db.menu_items.insert_one(doc)
    return menu_item

@api_router.put("/admin/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, update: MenuItemUpdateFull):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.menu_items.update_one(
        {"id": item_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    return item

@api_router.delete("/admin/menu/{item_id}")
async def delete_menu_item(item_id: str):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}

# Image upload endpoint
@api_router.post("/admin/upload-image")
async def upload_image(file: UploadFile = File(...)):
    # Create uploads directory if it doesn't exist
    upload_dir = Path("/app/backend/uploads")
    upload_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save file
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return URL path
    return {"imageUrl": f"/api/images/{unique_filename}"}

# Serve uploaded images
@api_router.get("/images/{filename}")
async def get_image(filename: str):
    file_path = Path("/app/backend/uploads") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

# Tables endpoints
@api_router.get("/tables", response_model=List[Table])
async def get_tables():
    tables = await db.tables.find({}, {"_id": 0}).to_list(1000)
    return tables

@api_router.get("/tables/{table_number}", response_model=Table)
async def get_table(table_number: int):
    table = await db.tables.find_one({"tableNumber": table_number}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table

# Orders endpoints
@api_router.post("/orders", response_model=Order)
async def create_order(order_input: OrderCreate):
    order = Order(**order_input.model_dump())
    doc = order.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.orders.insert_one(doc)
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_all_orders():
    orders = await db.orders.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    for order in orders:
        if isinstance(order.get('timestamp'), str):
            order['timestamp'] = datetime.fromisoformat(order['timestamp'])
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"orderId": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if isinstance(order.get('timestamp'), str):
        order['timestamp'] = datetime.fromisoformat(order['timestamp'])
    return order

@api_router.get("/orders/table/{table_number}", response_model=List[Order])
async def get_table_orders(table_number: int):
    orders = await db.orders.find({"tableNumber": table_number}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    for order in orders:
        if isinstance(order.get('timestamp'), str):
            order['timestamp'] = datetime.fromisoformat(order['timestamp'])
    return orders

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate):
    result = await db.orders.update_one(
        {"orderId": order_id},
        {"$set": {"status": status_update.status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order status updated successfully"}

@api_router.put("/orders/{order_id}/payment")
async def mark_order_paid(order_id: str):
    result = await db.orders.update_one(
        {"orderId": order_id},
        {"$set": {"isPaid": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order marked as paid"}

# Kitchen endpoints
@api_router.get("/kitchen/orders", response_model=List[Order])
async def get_kitchen_orders():
    orders = await db.orders.find(
        {"status": {"$in": ["ordered", "accepted", "preparing", "ready"]}},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    for order in orders:
        if isinstance(order.get('timestamp'), str):
            order['timestamp'] = datetime.fromisoformat(order['timestamp'])
    return orders

# Ratings endpoints
@api_router.post("/ratings", response_model=Rating)
async def create_rating(rating_input: RatingCreate):
    rating = Rating(**rating_input.model_dump())
    doc = rating.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.ratings.insert_one(doc)
    return rating

@api_router.get("/ratings", response_model=List[Rating])
async def get_ratings():
    ratings = await db.ratings.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    for rating in ratings:
        if isinstance(rating.get('timestamp'), str):
            rating['timestamp'] = datetime.fromisoformat(rating['timestamp'])
    return ratings

# Initialize sample data
@api_router.post("/init-data")
async def initialize_data():
    # Check if data already exists
    existing_menu = await db.menu_items.count_documents({})
    if existing_menu > 0:
        return {"message": "Data already initialized"}
    
    # Sample menu items with INR pricing
    menu_items = [
        # Pizzas
        {"id": str(uuid.uuid4()), "name": "Margherita Pizza", "category": "Pizza", "price": 249, "availability": True, "image": "https://images.unsplash.com/photo-1693609929769-169a70ebd994?q=80&w=800&auto=format&fit=crop", "description": "Classic pizza with fresh mozzarella and basil", "vegType": "veg"},
        {"id": str(uuid.uuid4()), "name": "Pepperoni Pizza", "category": "Pizza", "price": 299, "availability": True, "image": "https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=800&auto=format&fit=crop", "description": "Loaded with pepperoni and cheese", "vegType": "non-veg"},
        {"id": str(uuid.uuid4()), "name": "Veggie Supreme", "category": "Pizza", "price": 269, "availability": True, "image": "https://images.unsplash.com/photo-1571066811602-716837d681de?q=80&w=800&auto=format&fit=crop", "description": "Fresh vegetables and herbs", "vegType": "veg"},
        {"id": str(uuid.uuid4()), "name": "BBQ Chicken Pizza", "category": "Pizza", "price": 329, "availability": True, "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop", "description": "Grilled chicken with BBQ sauce", "vegType": "non-veg"},
        
        # Burgers
        {"id": str(uuid.uuid4()), "name": "Classic Burger", "category": "Burgers", "price": 179, "availability": True, "image": "https://images.unsplash.com/photo-1619810816144-223f5b027aea?q=80&w=800&auto=format&fit=crop", "description": "Juicy beef patty with fresh toppings", "vegType": "non-veg"},
        {"id": str(uuid.uuid4()), "name": "Cheese Burger", "category": "Burgers", "price": 199, "availability": True, "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop", "description": "Double cheese with special sauce", "vegType": "veg"},
        {"id": str(uuid.uuid4()), "name": "Chicken Burger", "category": "Burgers", "price": 219, "availability": True, "image": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?q=80&w=800&auto=format&fit=crop", "description": "Crispy chicken with lettuce", "vegType": "non-veg"},
        {"id": str(uuid.uuid4()), "name": "Veggie Burger", "category": "Burgers", "price": 159, "availability": True, "image": "https://images.unsplash.com/photo-1520072959219-c595dc870360?q=80&w=800&auto=format&fit=crop", "description": "Plant-based patty with fresh veggies", "vegType": "veg"},
        
        # Indian
        {"id": str(uuid.uuid4()), "name": "Butter Chicken", "category": "Indian", "price": 279, "availability": True, "image": "https://images.unsplash.com/photo-1708184528306-f75a0a5118ee?q=80&w=800&auto=format&fit=crop", "description": "Creamy tomato curry with chicken"},
        {"id": str(uuid.uuid4()), "name": "Paneer Tikka", "category": "Indian", "price": 229, "availability": True, "image": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=800&auto=format&fit=crop", "description": "Grilled cottage cheese with spices"},
        {"id": str(uuid.uuid4()), "name": "Biryani", "category": "Indian", "price": 299, "availability": True, "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop", "description": "Aromatic rice with chicken and spices"},
        
        # Odisha Special
        {"id": str(uuid.uuid4()), "name": "Pakhala Bhata", "category": "Odisha Special", "price": 149, "availability": True, "image": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=800&auto=format&fit=crop", "description": "Traditional fermented rice with curd"},
        {"id": str(uuid.uuid4()), "name": "Dalma", "category": "Odisha Special", "price": 169, "availability": True, "image": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop", "description": "Lentils with vegetables and mild spices"},
        {"id": str(uuid.uuid4()), "name": "Santula", "category": "Odisha Special", "price": 139, "availability": True, "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800&auto=format&fit=crop", "description": "Mixed vegetable curry without oil"},
        {"id": str(uuid.uuid4()), "name": "Machha Besara", "category": "Odisha Special", "price": 249, "availability": True, "image": "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?q=80&w=800&auto=format&fit=crop", "description": "Fish curry with mustard paste"},
        {"id": str(uuid.uuid4()), "name": "Chingudi Malai Curry", "category": "Odisha Special", "price": 329, "availability": True, "image": "https://images.unsplash.com/photo-1633504581786-316c8002b1b9?q=80&w=800&auto=format&fit=crop", "description": "Prawn curry with coconut milk"},
        {"id": str(uuid.uuid4()), "name": "Chuda Mixture", "category": "Odisha Special", "price": 89, "availability": True, "image": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=800&auto=format&fit=crop", "description": "Flattened rice snack mix"},
        {"id": str(uuid.uuid4()), "name": "Enduri Pitha", "category": "Odisha Special", "price": 119, "availability": True, "image": "https://images.unsplash.com/photo-1626777639573-3f7cb1e83f50?q=80&w=800&auto=format&fit=crop", "description": "Rice cake with coconut and jaggery"},
        {"id": str(uuid.uuid4()), "name": "Chhena Poda", "category": "Odisha Special", "price": 159, "availability": True, "image": "https://images.unsplash.com/photo-1612182062366-efe3dd8c6c11?q=80&w=800&auto=format&fit=crop", "description": "Baked cottage cheese dessert"},
        {"id": str(uuid.uuid4()), "name": "Rasabali", "category": "Odisha Special", "price": 139, "availability": True, "image": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?q=80&w=800&auto=format&fit=crop", "description": "Fried cheese patties in sweet syrup"},
        
        # Desserts
        {"id": str(uuid.uuid4()), "name": "Chocolate Cake", "category": "Desserts", "price": 129, "availability": True, "image": "https://images.unsplash.com/photo-1673551490243-f29547426841?q=80&w=800&auto=format&fit=crop", "description": "Rich chocolate layer cake"},
        {"id": str(uuid.uuid4()), "name": "Cheesecake", "category": "Desserts", "price": 149, "availability": True, "image": "https://images.unsplash.com/photo-1524351199678-941a58a3df50?q=80&w=800&auto=format&fit=crop", "description": "Creamy New York style cheesecake"},
        {"id": str(uuid.uuid4()), "name": "Ice Cream", "category": "Desserts", "price": 99, "availability": True, "image": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=800&auto=format&fit=crop", "description": "Assorted flavors"},
        {"id": str(uuid.uuid4()), "name": "Gulab Jamun", "category": "Desserts", "price": 109, "availability": True, "image": "https://images.unsplash.com/photo-1645177628172-a94c30a67536?q=80&w=800&auto=format&fit=crop", "description": "Traditional Indian sweet"},
        
        # Drinks
        {"id": str(uuid.uuid4()), "name": "Fresh Juice", "category": "Drinks", "price": 79, "availability": True, "image": "https://images.unsplash.com/photo-1676105797000-323c37de780c?q=80&w=800&auto=format&fit=crop", "description": "Freshly squeezed juice"},
        {"id": str(uuid.uuid4()), "name": "Soft Drink", "category": "Drinks", "price": 59, "availability": True, "image": "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?q=80&w=800&auto=format&fit=crop", "description": "Chilled soft drinks"},
        {"id": str(uuid.uuid4()), "name": "Lassi", "category": "Drinks", "price": 79, "availability": True, "image": "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?q=80&w=800&auto=format&fit=crop", "description": "Traditional yogurt drink"},
        {"id": str(uuid.uuid4()), "name": "Masala Chai", "category": "Drinks", "price": 49, "availability": True, "image": "https://images.unsplash.com/photo-1597318112874-629d369a9b87?q=80&w=800&auto=format&fit=crop", "description": "Spiced Indian tea", "vegType": "veg"},
        
        # Starters
        {"id": str(uuid.uuid4()), "name": "Paneer Tikka", "category": "Starters", "price": 189, "availability": True, "image": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=800&auto=format&fit=crop", "description": "Grilled cottage cheese with spices", "vegType": "starter"},
        {"id": str(uuid.uuid4()), "name": "Chicken Wings", "category": "Starters", "price": 229, "availability": True, "image": "https://images.unsplash.com/photo-1608039755401-742074f0548d?q=80&w=800&auto=format&fit=crop", "description": "Crispy fried chicken wings", "vegType": "starter"},
        {"id": str(uuid.uuid4()), "name": "Veg Spring Rolls", "category": "Starters", "price": 149, "availability": True, "image": "https://images.unsplash.com/photo-1625398407796-82650a8c135f?q=80&w=800&auto=format&fit=crop", "description": "Crispy vegetable spring rolls", "vegType": "starter"},
        {"id": str(uuid.uuid4()), "name": "Fish Fingers", "category": "Starters", "price": 249, "availability": True, "image": "https://images.unsplash.com/photo-1580959375944-2c303cc0ffb7?q=80&w=800&auto=format&fit=crop", "description": "Golden fried fish fingers", "vegType": "starter"},
        
        # Breakfast
        {"id": str(uuid.uuid4()), "name": "Masala Dosa", "category": "Breakfast", "price": 119, "availability": True, "image": "https://images.unsplash.com/photo-1694672749170-b37c10e1a935?q=80&w=800&auto=format&fit=crop", "description": "Crispy rice crepe with potato filling", "vegType": "breakfast"},
        {"id": str(uuid.uuid4()), "name": "Idli Sambar", "category": "Breakfast", "price": 99, "availability": True, "image": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?q=80&w=800&auto=format&fit=crop", "description": "Steamed rice cakes with lentil soup", "vegType": "breakfast"},
        {"id": str(uuid.uuid4()), "name": "Poha", "category": "Breakfast", "price": 89, "availability": True, "image": "https://images.unsplash.com/photo-1626132647523-66f5bf380027?q=80&w=800&auto=format&fit=crop", "description": "Flattened rice with spices", "vegType": "breakfast"},
        {"id": str(uuid.uuid4()), "name": "Upma", "category": "Breakfast", "price": 79, "availability": True, "image": "https://images.unsplash.com/photo-1598511757337-fe2cafc31ba1?q=80&w=800&auto=format&fit=crop", "description": "Semolina porridge with vegetables", "vegType": "breakfast"}
    ]
    
    await db.menu_items.insert_many(menu_items)
    
    # Sample tables with waiters
    waiter_names = ["John Smith", "Sarah Johnson", "Michael Brown", "Emily Davis", "David Wilson", 
                   "Jessica Martinez", "Daniel Anderson", "Ashley Taylor", "Christopher Thomas"]
    
    tables = []
    for i in range(1, 26):
        waiter_index = (i - 1) % len(waiter_names)
        tables.append({
            "tableNumber": i,
            "waiterName": waiter_names[waiter_index],
            "status": "available"
        })
    
    await db.tables.insert_many(tables)
    
    return {"message": "Sample data initialized successfully"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
