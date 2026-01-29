# Festive Lights CRM - Development Documentation

## Table of Contents
1. [Project Structure](#project-structure)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Backend Development](#backend-development)
5. [Frontend Development](#frontend-development)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [API Conventions](#api-conventions)
9. [Development Setup](#development-setup)
10. [Testing Guidelines](#testing-guidelines)
11. [Common Development Tasks](#common-development-tasks)
12. [Debugging Guide](#debugging-guide)
13. [Code Conventions](#code-conventions)
14. [Adding New Features](#adding-new-features)

---

## Project Structure

```
/app/
├── backend/                    # FastAPI Backend
│   ├── server.py              # Main application (all routes & logic)
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Container configuration
│   ├── .env                   # Environment variables (not in git)
│   └── .env.example           # Environment template
│
├── frontend/                   # React Frontend
│   ├── public/                # Static assets
│   │   └── index.html         # HTML template
│   ├── src/
│   │   ├── index.js           # React entry point
│   │   ├── index.css          # Global styles & Tailwind imports
│   │   ├── App.js             # Main app, routing, contexts
│   │   ├── App.css            # Additional global styles
│   │   ├── pages/             # Page components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── CustomersPage.jsx
│   │   │   ├── CustomerDetailPage.jsx
│   │   │   ├── QuotesPage.jsx
│   │   │   ├── QuoteFormPage.jsx
│   │   │   ├── InvoicesPage.jsx
│   │   │   ├── InvoiceFormPage.jsx
│   │   │   ├── UnpaidInvoicesPage.jsx
│   │   │   ├── CrewsPage.jsx
│   │   │   ├── SchedulePage.jsx
│   │   │   ├── CrewPortalPage.jsx
│   │   │   ├── CrewTrackingPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   └── components/
│   │       ├── DashboardLayout.jsx  # Main layout with sidebar
│   │       └── ui/            # Shadcn UI components
│   │           ├── button.jsx
│   │           ├── card.jsx
│   │           ├── dialog.jsx
│   │           ├── dropdown-menu.jsx
│   │           ├── input.jsx
│   │           ├── label.jsx
│   │           ├── select.jsx
│   │           ├── table.jsx
│   │           ├── textarea.jsx
│   │           ├── checkbox.jsx
│   │           ├── calendar.jsx
│   │           ├── sonner.jsx (toast)
│   │           └── ... (other UI components)
│   ├── package.json           # Node dependencies
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   ├── postcss.config.js      # PostCSS configuration
│   ├── Dockerfile             # Container configuration
│   ├── nginx.conf             # Production nginx config
│   └── .env                   # Frontend environment
│
├── terraform/                  # AWS Infrastructure (optional)
│   ├── main.tf
│   ├── variables.tf
│   └── modules/
│
├── docker-compose.yml         # Local development stack
├── README.md                  # Project overview
├── DEPLOYMENT.md              # Deployment instructions
├── DEVELOPMENT.md             # This file
└── .gitignore
```

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | 0.100+ | Web framework |
| **Uvicorn** | Latest | ASGI server |
| **Motor** | Latest | Async MongoDB driver |
| **Pydantic** | 2.x | Data validation |
| **PyJWT** | Latest | JWT tokens |
| **bcrypt** | Latest | Password hashing |
| **ReportLab** | Latest | PDF generation |
| **python-dotenv** | Latest | Environment management |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI framework |
| **React Router** | 6.x | Client-side routing |
| **Tailwind CSS** | 3.x | Utility-first CSS |
| **Shadcn/UI** | Latest | UI component library |
| **Axios** | Latest | HTTP client |
| **Sonner** | Latest | Toast notifications |
| **Recharts** | Latest | Charts & graphs |
| **date-fns** | Latest | Date utilities |
| **Phosphor Icons** | Latest | Icon library |
| **Framer Motion** | Latest | Animations |
| **Leaflet** | 1.9+ | Interactive maps |
| **React-Leaflet** | 4.x | React wrapper for Leaflet |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| **MongoDB** | 6.0+ | Primary database |
| **Motor** | Latest | Async Python driver |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Local orchestration |
| **Nginx** | Production web server |
| **Terraform** | AWS infrastructure as code |
| **AWS ECS Fargate** | Container hosting |
| **AWS DocumentDB** | Managed MongoDB |

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                           │
│                    (React SPA + GPS API)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx / Load Balancer                         │
│              (Static files + API proxy /api/*)                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│     React Frontend        │   │     FastAPI Backend       │
│     (Port 3000/80)        │   │     (Port 8001)           │
│                           │   │                           │
│  • Pages (14 views)       │   │  • REST API endpoints     │
│  • Shadcn components      │   │  • JWT authentication     │
│  • Context providers      │   │  • PDF generation         │
│  • Axios HTTP client      │   │  • Stripe integration     │
└───────────────────────────┘   └───────────────────────────┘
                                            │
                                            ▼
                                ┌───────────────────────────┐
                                │       MongoDB 6.0         │
                                │     (Port 27017)          │
                                │                           │
                                │  Collections:             │
                                │  • users                  │
                                │  • cities                 │
                                │  • customers              │
                                │  • quotes                 │
                                │  • invoices               │
                                │  • payments               │
                                │  • crews                  │
                                │  • installations          │
                                │  • crew_locations         │
                                └───────────────────────────┘
```

### Data Flow

```
User Action → React Component → Axios Request → FastAPI Endpoint
                                                       │
                                                       ▼
                                               MongoDB Query
                                                       │
                                                       ▼
JSON Response ← React State Update ← Axios Response ←──┘
```

---

## Backend Development

### File Organization (server.py)

The backend is organized in a single `server.py` file with clear sections:

```python
# Section order in server.py:
1. Imports and configuration
2. MongoDB connection setup
3. JWT configuration
4. FastAPI app initialization
5. Utility functions (create_token, verify_token, hash_password, etc.)
6. Pydantic models (Request/Response schemas)
7. Auth routes (/api/auth/*)
8. Cities routes (/api/cities/*)
9. Customers routes (/api/customers/*)
10. Quotes routes (/api/quotes/*)
11. Invoices routes (/api/invoices/*)
12. Payments routes (/api/payments/*)
13. Stripe routes (/api/payments/stripe/*)
14. Crews routes (/api/crews/*)
15. Installations routes (/api/installations/*)
16. GPS Tracking routes (/api/crew-portal/*, /api/tracking/*)
17. PDF generation functions
18. Email routes (/api/email/*)
19. Dashboard routes (/api/dashboard/*)
20. Messaging routes (/api/messaging/*)
21. App middleware and startup/shutdown
```

### Adding a New API Endpoint

```python
# 1. Define Pydantic models for request/response
class NewFeatureCreate(BaseModel):
    name: str
    description: Optional[str] = None
    
class NewFeatureResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: str

# 2. Create the endpoint
@api_router.post("/new-feature", response_model=NewFeatureResponse)
async def create_new_feature(
    data: NewFeatureCreate, 
    current_user: dict = Depends(get_current_user)  # Auth required
):
    # Generate unique ID
    feature_id = str(uuid.uuid4())
    
    # Create document (exclude _id from response)
    doc = {
        "id": feature_id,
        "name": data.name,
        "description": data.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    # Insert into MongoDB
    await db.new_features.insert_one(doc)
    
    # Return without _id field
    return {k: v for k, v in doc.items() if k != "_id"}

# 3. GET endpoint with filtering
@api_router.get("/new-feature", response_model=List[NewFeatureResponse])
async def get_new_features(
    city_id: Optional[str] = None,  # Query parameter
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if city_id:
        query["city_id"] = city_id
    
    # Always exclude _id from MongoDB response
    features = await db.new_features.find(query, {"_id": 0}).to_list(1000)
    return features
```

### MongoDB Best Practices

```python
# ALWAYS exclude _id in projections
await db.collection.find({}, {"_id": 0}).to_list(100)

# ALWAYS use UUIDs for document IDs (stored as "id" field)
doc_id = str(uuid.uuid4())
doc = {"id": doc_id, ...}

# ALWAYS use timezone-aware datetimes
from datetime import datetime, timezone
created_at = datetime.now(timezone.utc).isoformat()

# For counter sequences (quote numbers, invoice numbers)
counter = await db.counters.find_one_and_update(
    {"name": "quote"},
    {"$inc": {"seq": 1}},
    upsert=True,
    return_document=True
)
quote_number = f"Q-{counter['seq']:05d}"  # Q-00001
```

### Authentication Pattern

```python
# Protected endpoint - requires valid JWT
@api_router.get("/protected")
async def protected_route(current_user: dict = Depends(get_current_user)):
    # current_user contains: id, email, name, role, city_id
    return {"user": current_user}

# Role-based access control
@api_router.get("/admin-only")
async def admin_only(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"message": "Admin content"}

# Multi-role access
@api_router.get("/staff-or-admin")
async def staff_or_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return {"message": "Staff/Admin content"}
```

---

## Frontend Development

### Component Structure

```
src/
├── App.js              # Routing, AuthProvider, CityProvider
├── pages/              # Full page components (routed)
│   └── XxxPage.jsx     # Naming convention: PascalCase + Page
└── components/
    ├── DashboardLayout.jsx  # Shared layout with sidebar
    └── ui/                  # Shadcn components (don't modify)
```

### Context Providers (App.js)

```jsx
// Auth Context - manages user session
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Provides: user, token, login(), logout(), register(), loading

// City Context - manages city filtering
const CityContext = createContext(null);
export const useCity = () => useContext(CityContext);

// Provides: cities, selectedCity, setSelectedCity, refreshCities()
```

### Creating a New Page

```jsx
// 1. Create file: src/pages/NewFeaturePage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export default function NewFeaturePage() {
  const { token } = useAuth();
  const { selectedCity } = useCity();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = selectedCity ? `?city_id=${selectedCity.id}` : '';
        const response = await axios.get(`${API}/new-feature${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(response.data);
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, selectedCity]);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="new-feature-page">
      <h1 className="text-3xl font-heading font-bold text-slate-900">
        New Feature
      </h1>
      {/* Content */}
    </div>
  );
}

// 2. Add route in App.js
import NewFeaturePage from './pages/NewFeaturePage';

// Inside Routes:
<Route path="new-feature" element={<NewFeaturePage />} />

// 3. Add navigation link in DashboardLayout.jsx
const navigation = [
  // ... existing items
  { name: 'New Feature', href: '/new-feature', icon: IconName },
];
```

### API Calls Pattern

```jsx
// GET request with auth
const fetchData = async () => {
  const response = await axios.get(`${API}/endpoint`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// POST request
const createItem = async (data) => {
  const response = await axios.post(`${API}/endpoint`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Error handling
try {
  await createItem(formData);
  toast.success('Created successfully');
} catch (error) {
  toast.error(error.response?.data?.detail || 'Operation failed');
}
```

### Styling Conventions

```jsx
// Use Tailwind utilities
<div className="space-y-6 p-4">

// Use CSS variables for theme colors
<div className="bg-primary text-primary-foreground">
<div className="text-slate-900 bg-slate-50">

// Animation classes (defined in index.css)
<div className="animate-fade-in">
<div className="animate-slide-up">
<div className="animate-scale-in">

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Font families
<h1 className="font-heading">  {/* Outfit font */}
<p className="font-sans">      {/* DM Sans font */}
```

### Shadcn UI Components Usage

```jsx
// Import from relative path
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';

// Button variants
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button size="sm">Small</Button>
<Button className="rounded-full">Pill shaped</Button>

// Toast notifications
toast.success('Operation successful');
toast.error('Something went wrong');
toast.info('Information message');
```

---

## Database Schema

### Collections

#### users
```javascript
{
  "id": "uuid",           // Primary key
  "email": "string",      // Unique, indexed
  "password": "string",   // bcrypt hashed
  "name": "string",
  "role": "admin|staff|crew",
  "city_id": "uuid|null", // For crew members
  "phone": "string|null",
  "created_at": "ISO8601"
}
```

#### cities
```javascript
{
  "id": "uuid",
  "name": "string",       // e.g., "Denver"
  "state": "string|null", // e.g., "Colorado"
  "country": "string",    // Default: "USA"
  "created_at": "ISO8601"
}
```

#### customers
```javascript
{
  "id": "uuid",
  "name": "string",
  "email": "string|null",
  "phone": "string",
  "address": "string",
  "city_id": "uuid",      // Reference to cities
  "notes": "string|null",
  "viber_number": "string|null",
  "whatsapp_number": "string|null",
  "created_at": "ISO8601",
  "total_orders": "number" // Denormalized counter
}
```

#### quotes
```javascript
{
  "id": "uuid",
  "quote_number": "string",  // Auto-generated: Q-00001
  "customer_id": "uuid",
  "city_id": "uuid",
  "items": [
    {
      "description": "string",
      "quantity": "number",
      "unit_price": "number"
    }
  ],
  "subtotal": "number",
  "tax": "number",
  "total": "number",
  "status": "draft|sent|accepted|rejected",
  "notes": "string|null",
  "valid_until": "string|null",
  "created_at": "ISO8601",
  "created_by": "uuid"
}
```

#### invoices
```javascript
{
  "id": "uuid",
  "invoice_number": "string",  // Auto-generated: INV-00001
  "customer_id": "uuid",
  "city_id": "uuid",
  "quote_id": "uuid|null",     // Optional link to quote
  "items": [...],              // Same structure as quotes
  "subtotal": "number",
  "tax": "number",
  "total": "number",
  "amount_paid": "number",     // Running total of payments
  "balance_due": "number",     // total - amount_paid
  "status": "pending|partial|paid|overdue",
  "notes": "string|null",
  "due_date": "string|null",
  "created_at": "ISO8601"
}
```

#### payments
```javascript
{
  "id": "uuid",
  "invoice_id": "uuid",
  "amount": "number",
  "payment_method": "cash|check|card|stripe",
  "reference": "string|null",  // Check number, Stripe session ID
  "notes": "string|null",
  "created_at": "ISO8601",
  "created_by": "uuid"
}
```

#### crews
```javascript
{
  "id": "uuid",
  "user_id": "uuid",      // Reference to users collection
  "name": "string",
  "email": "string",
  "phone": "string",
  "city_id": "uuid",
  "skills": ["string"],   // e.g., ["Roofing", "Lighting"]
  "color": "string",      // Hex color for calendar: "#0ea5e9"
  "status": "active|inactive",
  "created_at": "ISO8601"
}
```

#### installations
```javascript
{
  "id": "uuid",
  "customer_id": "uuid",
  "city_id": "uuid",
  "quote_id": "uuid|null",
  "invoice_id": "uuid|null",
  "crew_ids": ["uuid"],       // Array of crew IDs
  "scheduled_date": "YYYY-MM-DD",
  "scheduled_time": "HH:MM|null",
  "estimated_hours": "number",
  "address": "string",
  "notes": "string|null",
  "status": "scheduled|in_progress|completed|cancelled",
  "installation_type": "installation|removal|maintenance",
  "created_at": "ISO8601",
  // GPS tracking fields
  "check_in_time": "ISO8601|null",
  "check_in_location": {
    "latitude": "number",
    "longitude": "number",
    "accuracy": "number"
  } | null,
  "check_out_time": "ISO8601|null",
  "check_out_location": {...} | null
}
```

#### crew_locations
```javascript
{
  "crew_id": "uuid",          // Primary key (upsert)
  "installation_id": "uuid|null",
  "latitude": "number",
  "longitude": "number",
  "accuracy": "number|null",
  "timestamp": "ISO8601",
  "status": "checked_in|en_route|idle"
}
```

#### counters
```javascript
{
  "name": "quote|invoice",    // Counter name
  "seq": "number"             // Current sequence value
}
```

### Indexes to Create

```javascript
// Recommended indexes for production
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "id": 1 })
db.customers.createIndex({ "city_id": 1 })
db.customers.createIndex({ "id": 1 })
db.quotes.createIndex({ "customer_id": 1 })
db.quotes.createIndex({ "city_id": 1 })
db.invoices.createIndex({ "customer_id": 1 })
db.invoices.createIndex({ "city_id": 1 })
db.invoices.createIndex({ "status": 1 })
db.installations.createIndex({ "scheduled_date": 1 })
db.installations.createIndex({ "crew_ids": 1 })
db.installations.createIndex({ "city_id": 1 })
db.crew_locations.createIndex({ "crew_id": 1 }, { unique: true })
```

---

## Authentication & Authorization

### JWT Token Structure

```javascript
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "admin|staff|crew",
  "exp": 1234567890  // Expiration timestamp
}
```

### Role Permissions Matrix

| Feature | Admin | Staff | Crew |
|---------|-------|-------|------|
| Dashboard | ✅ | ✅ | ❌ |
| Customers | ✅ CRUD | ✅ CRUD | ❌ |
| Quotes | ✅ CRUD | ✅ CRUD | ❌ |
| Invoices | ✅ CRUD | ✅ CRUD | ❌ |
| Payments | ✅ | ✅ | ❌ |
| Crews | ✅ CRUD | ✅ Read | ❌ |
| Schedule | ✅ CRUD | ✅ CRUD | ❌ |
| Tracking | ✅ | ✅ | ❌ |
| Settings | ✅ | ❌ | ❌ |
| Crew Portal | ❌ | ❌ | ✅ |

### Frontend Route Protection

```jsx
// In App.js
<Route path="/" element={
  <ProtectedRoute allowedRoles={['admin', 'staff']}>
    <DashboardLayout />
  </ProtectedRoute>
}>

<Route path="/crew-portal" element={
  <ProtectedRoute allowedRoles={['crew']}>
    <CrewPortalPage />
  </ProtectedRoute>
} />
```

---

## API Conventions

### URL Patterns

```
GET    /api/{resource}              - List all
GET    /api/{resource}?city_id=xxx  - List filtered
GET    /api/{resource}/{id}         - Get single
POST   /api/{resource}              - Create new
PUT    /api/{resource}/{id}         - Update
DELETE /api/{resource}/{id}         - Delete
PUT    /api/{resource}/{id}/status  - Update status only
GET    /api/{resource}/{id}/pdf     - Download PDF
```

### Response Formats

```javascript
// Success - Single item
{
  "id": "uuid",
  "name": "...",
  ...
}

// Success - List
[
  { "id": "uuid", ... },
  { "id": "uuid", ... }
]

// Error
{
  "detail": "Error message here"
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created (POST) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 500 | Server error |

---

## Development Setup

### Prerequisites

```bash
# Required software
- Python 3.11+
- Node.js 18+
- MongoDB 6.0+
- Yarn package manager
- Git
```

### Local Development (Without Docker)

```bash
# 1. Clone repository
git clone <repo-url>
cd festive-lights-crm

# 2. Start MongoDB
mongod --dbpath /path/to/data

# 3. Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings
uvicorn server:app --reload --port 8001

# 4. Frontend setup (new terminal)
cd frontend
yarn install
cp .env.example .env
# Edit .env: REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

### Local Development (With Docker)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart after code changes
docker-compose restart backend

# Rebuild after dependency changes
docker-compose up -d --build
```

### Hot Reload

- **Backend**: Uvicorn auto-reloads on Python file changes
- **Frontend**: React dev server auto-reloads on JS/CSS changes
- **Note**: Restart required for .env changes or new dependencies

---

## Testing Guidelines

### Backend API Testing (curl)

```bash
# Set variables
API_URL="http://localhost:8001"

# Register user
curl -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test User","role":"admin"}'

# Login and get token
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Use token for authenticated requests
curl "$API_URL/api/customers" -H "Authorization: Bearer $TOKEN"
```

### Frontend Testing

```bash
# Run linter
cd frontend
yarn lint

# Type checking (if using TypeScript)
yarn tsc --noEmit
```

### Manual Testing Checklist

- [ ] Login/Logout flow
- [ ] Create customer with all fields
- [ ] Create quote with multiple items
- [ ] Download quote PDF
- [ ] Create invoice from quote
- [ ] Record payment (cash/check)
- [ ] Stripe payment flow
- [ ] Schedule installation with crews
- [ ] Crew portal check-in/check-out
- [ ] GPS tracking display
- [ ] City filtering across all pages
- [ ] Mobile responsiveness

---

## Common Development Tasks

### Adding a New Field to Existing Model

```python
# 1. Update Pydantic models in server.py
class CustomerCreate(BaseModel):
    # ... existing fields
    new_field: Optional[str] = None  # Add new field

class CustomerResponse(BaseModel):
    # ... existing fields
    new_field: Optional[str] = None

# 2. Update create endpoint
customer_doc = {
    # ... existing fields
    "new_field": customer.new_field,
}

# 3. No MongoDB migration needed - schema-less!

# 4. Update frontend form and display
```

### Adding a New Status to Workflow

```python
# 1. Update status handling in backend
@api_router.put("/resource/{id}/status")
async def update_status(id: str, status: str, ...):
    valid_statuses = ["draft", "sent", "accepted", "rejected", "new_status"]
    if status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")
    # ...

# 2. Update frontend status colors
const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  new_status: 'bg-purple-100 text-purple-700',  // Add new
};
```

### Adding New Integration

```python
# 1. Add environment variable
# backend/.env
NEW_SERVICE_API_KEY=xxx

# 2. Add to server.py
new_api_key = os.environ.get('NEW_SERVICE_API_KEY')

@api_router.post("/integration/new-service")
async def call_new_service(...):
    if not new_api_key:
        raise HTTPException(500, "New service not configured")
    # Integration logic...

# 3. Update .env.example and documentation
```

---

## Debugging Guide

### Backend Debugging

```python
# Add logging
import logging
logger = logging.getLogger(__name__)

@api_router.get("/debug")
async def debug_endpoint():
    logger.info("Debug endpoint called")
    logger.debug(f"Some debug info: {data}")
    logger.error(f"Error occurred: {error}")

# Check logs
tail -f /var/log/supervisor/backend.err.log
```

### Frontend Debugging

```jsx
// Console logging
console.log('State:', data);
console.log('API Response:', response);

// React DevTools
// Install browser extension for component inspection

// Network tab
// Check request/response in browser DevTools
```

### Common Issues

| Issue | Solution |
|-------|----------|
| CORS error | Check backend CORS config, ensure frontend URL is correct |
| 401 Unauthorized | Token expired - login again |
| 404 on API | Check route has /api prefix |
| MongoDB connection | Verify MONGO_URL in .env |
| PDF not downloading | Check ReportLab installed |
| GPS not working | Requires HTTPS in production |

### MongoDB Debugging

```bash
# Connect to MongoDB shell
mongosh

# Switch to database
use festive_crm

# View collections
show collections

# Query data
db.customers.find().pretty()
db.customers.find({ city_id: "uuid" })

# Check indexes
db.customers.getIndexes()
```

---

## Code Conventions

### Python (Backend)

```python
# Use snake_case for functions and variables
def get_customer_by_id(customer_id: str):
    
# Use PascalCase for classes
class CustomerResponse(BaseModel):

# Use UPPERCASE for constants
JWT_SECRET = "..."
JWT_EXPIRATION_HOURS = 24

# Type hints are required
async def create_customer(
    customer: CustomerCreate,
    current_user: dict = Depends(get_current_user)
) -> CustomerResponse:

# Docstrings for complex functions
async def complex_function():
    """
    Brief description.
    
    Args:
        param1: Description
        
    Returns:
        Description of return value
    """
```

### JavaScript/React (Frontend)

```jsx
// Use PascalCase for components
export default function CustomerDetailPage() {}

// Use camelCase for functions and variables
const [isLoading, setIsLoading] = useState(false);
const handleSubmit = async () => {};

// Use UPPER_SNAKE_CASE for constants
const API_TIMEOUT = 30000;

// data-testid for testable elements
<Button data-testid="submit-btn">Submit</Button>

// Consistent import order
import React, { useState, useEffect } from 'react';  // React first
import axios from 'axios';                            // External libs
import { API, useAuth } from '../App';               // Internal
import { Button } from '../components/ui/button';    // Components
```

### Git Commit Messages

```
feat: Add GPS tracking for crews
fix: Resolve PDF download issue on Safari
refactor: Simplify customer creation flow
docs: Update API documentation
style: Fix button alignment on mobile
test: Add unit tests for auth module
chore: Update dependencies
```

---

## Adding New Features

### Feature Development Workflow

1. **Plan**: Define API endpoints, database changes, UI components
2. **Backend First**: Create models, endpoints, test with curl
3. **Frontend**: Build UI, connect to API, add to navigation
4. **Test**: Manual testing, edge cases, mobile
5. **Document**: Update this guide if needed
6. **Commit**: Use conventional commit messages

### Example: Adding a "Notes" Feature

```python
# Step 1: Backend - Add to server.py

class NoteCreate(BaseModel):
    customer_id: str
    content: str
    
class NoteResponse(BaseModel):
    id: str
    customer_id: str
    content: str
    created_at: str
    created_by: str

@api_router.post("/notes", response_model=NoteResponse)
async def create_note(note: NoteCreate, current_user: dict = Depends(get_current_user)):
    note_id = str(uuid.uuid4())
    doc = {
        "id": note_id,
        "customer_id": note.customer_id,
        "content": note.content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.notes.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/notes", response_model=List[NoteResponse])
async def get_notes(customer_id: str, current_user: dict = Depends(get_current_user)):
    notes = await db.notes.find(
        {"customer_id": customer_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notes
```

```jsx
// Step 2: Frontend - Add Notes section to CustomerDetailPage.jsx

const [notes, setNotes] = useState([]);
const [newNote, setNewNote] = useState('');

const fetchNotes = async () => {
  const response = await axios.get(`${API}/notes?customer_id=${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  setNotes(response.data);
};

const handleAddNote = async () => {
  await axios.post(`${API}/notes`, 
    { customer_id: id, content: newNote },
    { headers: { Authorization: `Bearer ${token}` }}
  );
  setNewNote('');
  fetchNotes();
  toast.success('Note added');
};

// Add to JSX
<Card>
  <CardHeader>
    <CardTitle>Notes</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex gap-2 mb-4">
      <Input 
        value={newNote} 
        onChange={e => setNewNote(e.target.value)}
        placeholder="Add a note..."
      />
      <Button onClick={handleAddNote}>Add</Button>
    </div>
    {notes.map(note => (
      <div key={note.id} className="p-3 bg-slate-50 rounded mb-2">
        <p>{note.content}</p>
        <p className="text-xs text-slate-500">{note.created_at}</p>
      </div>
    ))}
  </CardContent>
</Card>
```

---

## Performance Considerations

### Backend

- Use database indexes for frequently queried fields
- Limit list queries with `.to_list(1000)` max
- Use projections to exclude unnecessary fields
- Consider pagination for large datasets

### Frontend

- Lazy load pages with React.lazy() for large apps
- Memoize expensive computations with useMemo
- Debounce search inputs
- Use skeleton loading states

### Database

- Index foreign keys (customer_id, city_id, etc.)
- Use compound indexes for common query patterns
- Monitor slow queries in production

---

## Security Checklist

- [ ] JWT secret is strong and unique per environment
- [ ] Passwords are hashed with bcrypt
- [ ] API endpoints validate user permissions
- [ ] Input validation on all endpoints
- [ ] CORS configured for production domain only
- [ ] HTTPS enforced in production
- [ ] Environment variables not in git
- [ ] Rate limiting on auth endpoints (TODO)
- [ ] SQL injection N/A (using MongoDB)
- [ ] XSS protection via React's default escaping

---

## Contact & Support

For questions about this codebase:
1. Check this documentation first
2. Review existing code patterns
3. Search closed issues/PRs
4. Create a new issue with details

---

*Last updated: January 2026*
