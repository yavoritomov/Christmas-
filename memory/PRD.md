# Festive Lights CRM - Product Requirements Document

## Original Problem Statement
Build a CRM for small business dealing with installation and sales of Christmas lights and event decorations. The system needs to have record for each customer information and previous orders/installations. The complete sales cycle includes quote, installation and invoice to the customer. So the system needs to be able to generate quotes and invoices track payments. Also needs to be able to manage multiple crews for the installation scheduling. There should be a clear dashboard/page for all installations and crew assignments.

## User Choices & Requirements
- JWT email/password authentication
- PDF quotes downloadable with email integration
- WhatsApp/Viber integration (MOCKED - requires business API setup)
- Cash/check payment tracking + Stripe integration
- 10-20 crews with their own login to view work orders/schedules
- Multi-city segregation
- Light theme UI

## Architecture
- **Backend:** FastAPI + MongoDB
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Authentication:** JWT-based
- **Payments:** Stripe integration (active)
- **PDF Generation:** ReportLab

## Core Features Implemented (Date: 2026-01-29)
1. ✅ User Authentication (admin, staff, crew roles)
2. ✅ Multi-city management with filtering
3. ✅ Customer Management (CRUD, WhatsApp/Viber fields)
4. ✅ Quotes (create, PDF download, email send)
5. ✅ Invoices (create, PDF download, payment tracking)
6. ✅ Payment recording (cash, check, card, Stripe)
7. ✅ Unpaid Invoices page with bulk email reminders
8. ✅ Crew Management (with color-coded assignments)
9. ✅ Installation Scheduling with Calendar view
10. ✅ Crew Portal (separate mobile-friendly view)
11. ✅ Dashboard with KPIs and charts

## User Personas
1. **Admin:** Full access to all features, manages cities, crews, settings
2. **Staff:** Can manage customers, quotes, invoices, schedule installations
3. **Crew:** Mobile access to their assigned work orders via Crew Portal

## Database Collections
- users, cities, customers, quotes, invoices, payments, payment_transactions, crews, installations, counters

## API Endpoints
- /api/auth/* (login, register, me)
- /api/cities/* (CRUD)
- /api/customers/* (CRUD)
- /api/quotes/* (CRUD, PDF, email)
- /api/invoices/* (CRUD, PDF, unpaid)
- /api/payments/* (create, list, stripe)
- /api/crews/* (CRUD)
- /api/installations/* (CRUD, status)
- /api/crew-portal/* (my-schedule)
- /api/dashboard/stats
- /api/email/* (send quote, invoice, bulk)
- /api/messaging/* (whatsapp, viber - mocked)

## MOCKED Integrations
- Email (SendGrid) - requires API key for production
- WhatsApp Business API - requires business account setup
- Viber Business API - requires business account setup

## Prioritized Backlog
### P0 (Next)
- None (MVP complete)

### P1 (Important)
- SendGrid email integration with actual API key
- WhatsApp Business API integration
- Quote editing after creation
- Invoice editing

### P2 (Nice to have)
- Customer import from CSV
- Recurring installation scheduling
- Report generation (monthly, yearly)
- Crew availability management
- GPS tracking for crews

## GPS Tracking Feature (Added 2026-01-29)
Browser-based GPS tracking for installation crews:

### Features Implemented:
- **Check-In**: Crew captures GPS when arriving at job site
- **Check-Out**: Crew captures GPS when completing job
- **Live Tracking**: Optional continuous location updates
- **Admin Tracking View**: Real-time dashboard showing all crew locations
- **Status indicators**: On Site (green), Available (gray)

### API Endpoints Added:
- POST /api/crew-portal/check-in/{installation_id} - Check in with GPS
- POST /api/crew-portal/check-out/{installation_id} - Check out with GPS  
- POST /api/crew-portal/update-location - Live location updates
- GET /api/tracking/crew-locations - Admin view of all crew locations

### Database Collections Added:
- crew_locations (stores real-time crew GPS data)

### Installation Fields Added:
- check_in_time, check_in_location
- check_out_time, check_out_location
