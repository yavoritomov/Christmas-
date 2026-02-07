# Festive Lights CRM - Product Requirements Document

## Overview
A CRM for small businesses dealing with Christmas lights and event decoration installation and sales.

## Core Requirements
1. Record customer information and previous orders/installations
2. Manage full sales cycle: quote → installation → invoice
3. Generate quotes and invoices (PDF downloadable, email/WhatsApp/Viber sendable)
4. Handle payments: cash/check + Stripe/Apple Pay integration
5. Dedicated unpaid invoices page with bulk email feature
6. Manage 10-20 installation crews and their schedules
7. Crew member login for viewing work orders/schedules
8. Multi-city support with data segregation
9. Light theme UI

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Leaflet.js
- **Backend**: FastAPI, Pydantic, Motor
- **Database**: MongoDB
- **Auth**: JWT (email/password)
- **Deployment**: Docker, Docker Compose

## Completed Features (as of Feb 2026)
- [x] User authentication (admin, staff, crew roles)
- [x] Multi-city management
- [x] Customer CRUD with contact info
- [x] Quote management (create, view, delete, status updates)
- [x] Invoice management (create, view, delete)
- [x] Convert Quote to Invoice workflow
- [x] Payment recording (cash, check, card)
- [x] Crew management
- [x] Installation scheduling
- [x] GPS crew tracking with Leaflet.js map
- [x] **Edit Quotes** - Add/remove items, update notes (locked if converted)
- [x] **Edit Invoices** - Add/remove items, update notes (locked if paid)
- [x] Removed Emergent branding

## In Progress / Pending
- [ ] **P1**: Dynamic PDF generation (currently uses static sample)
- [ ] **P1**: SendGrid email integration for sending quotes/invoices
- [ ] **P1**: Email all unpaid customers feature
- [ ] **P2**: Stripe payment integration (frontend flow)
- [ ] **P2**: Backend refactoring (split server.py into routers)
- [ ] **P3**: WhatsApp/Viber messaging integration
- [ ] **P3**: Auto-geocode customer addresses

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Cities
- GET/POST /api/cities
- GET/DELETE /api/cities/{id}

### Customers
- GET/POST /api/customers
- GET/PUT/DELETE /api/customers/{id}

### Quotes
- GET/POST /api/quotes
- GET/PUT/DELETE /api/quotes/{id}
- PUT /api/quotes/{id}/status
- POST /api/quotes/{id}/convert-to-invoice
- GET /api/quotes/{id}/pdf

### Invoices
- GET/POST /api/invoices
- GET/PUT/DELETE /api/invoices/{id}
- GET /api/invoices/unpaid
- GET /api/invoices/{id}/pdf

### Payments
- GET/POST /api/payments
- POST /api/payments/stripe/create-session

### Crews & Installations
- GET/POST /api/crews
- GET/PUT/DELETE /api/crews/{id}
- GET/POST /api/installations
- PUT /api/installations/{id}/status

### Crew Tracking
- POST /api/crew-locations
- GET /api/crew-locations

## Database Collections
- users, customers, cities, quotes, invoices, payments, crews, installations, crew_locations, counters

## Test Credentials
- **Admin**: admin@festive.com / admin123

## Docker Setup
- Use `docker compose up --build` (standard)
- Use `docker compose -f docker-compose.arm.yml up --build` for ARM Macs
- Node 20+ required for frontend (updated in Dockerfile)
