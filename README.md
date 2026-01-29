# Festive Lights CRM

A comprehensive CRM system for Christmas lights and event decoration installation businesses.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- 🏠 **Customer Management** - Track customers, contacts, and order history
- 📄 **Quotes & Invoices** - Generate PDFs, send via email
- 💳 **Payment Processing** - Stripe + manual cash/check tracking
- 👷 **Crew Management** - Manage installation crews and scheduling
- 📍 **GPS Tracking** - Real-time crew location tracking
- 🏙️ **Multi-City Support** - Segregate data by location
- 📱 **Crew Portal** - Mobile-friendly view for field crews

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/festive-lights-crm.git
cd festive-lights-crm

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Start all services
docker-compose up -d

# Create admin user
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123","name":"Admin","role":"admin"}'

# Access the application
open http://localhost:3000
```

### Manual Setup

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python 3.11+)
- **Database**: MongoDB 6.0+
- **Authentication**: JWT
- **Payments**: Stripe

## Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Local & AWS deployment instructions
- [API Reference](./DEPLOYMENT.md#api-reference) - Complete API documentation

## Environment Variables

### Backend
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=festive_crm
JWT_SECRET=your-secret-key
STRIPE_API_KEY=sk_test_xxx
SENDGRID_API_KEY=xxx  # Optional
```

### Frontend
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Project Structure

```
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # UI components
│   │   └── App.js         # Main app
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── terraform/             # AWS infrastructure
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

## License

MIT License - see [LICENSE](./LICENSE) for details.
