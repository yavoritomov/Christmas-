# Festive Lights CRM - Complete Documentation

## Table of Contents
1. [Application Overview](#application-overview)
2. [User Guide](#user-guide)
3. [Local Linux Server Deployment](#local-linux-server-deployment)
4. [AWS Terraform Deployment](#aws-terraform-deployment)
5. [Environment Variables](#environment-variables)
6. [API Reference](#api-reference)

---

## Application Overview

Festive Lights CRM is a comprehensive customer relationship management system designed for Christmas lights and event decoration installation businesses.

### Key Features
- **Customer Management**: Track customer info, contact details, and order history
- **Quotes & Invoices**: Generate PDFs, send via email, track payments
- **Crew Management**: Manage 10-20+ installation crews with scheduling
- **GPS Tracking**: Real-time crew location tracking via browser
- **Multi-City Support**: Segregate data by city/location
- **Payment Processing**: Stripe integration + manual cash/check tracking
- **Crew Portal**: Mobile-friendly portal for field crews

### Tech Stack
- **Frontend**: React 18, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python 3.11+)
- **Database**: MongoDB 6.0+
- **Authentication**: JWT-based
- **Payments**: Stripe

---

## User Guide

### User Roles

| Role | Access Level |
|------|-------------|
| **Admin** | Full access to all features, settings, crew management |
| **Staff** | Customers, quotes, invoices, scheduling (no settings) |
| **Crew** | Crew Portal only - view assigned jobs, check in/out |

### Getting Started

1. **Login**: Navigate to the app URL and login with your credentials
2. **Select City**: Use the city dropdown in sidebar to filter by location
3. **Dashboard**: View KPIs, revenue, and upcoming installations

### Managing Customers

1. Go to **Customers** in sidebar
2. Click **Add Customer** to create new customer
3. Fill in: Name, Phone, Email, Address, City
4. Optional: Add WhatsApp/Viber numbers for messaging

### Creating Quotes

1. Go to **Quotes** → **New Quote**
2. Select customer (auto-fills city)
3. Add line items with description, quantity, price
4. Click **Create Quote**
5. Use dropdown menu to: Download PDF, Send Email, Send WhatsApp

### Creating Invoices

1. Go to **Invoices** → **New Invoice**
2. Select customer and add line items
3. Set due date (optional)
4. Click **Create Invoice**

### Recording Payments

1. Open an invoice
2. Click **Record Payment** for cash/check
3. Or click **Pay with Stripe** for card payments
4. Invoice status auto-updates (Pending → Partial → Paid)

### Managing Crews

1. Go to **Crews** → **Add Crew Member**
2. Enter name, email, password, phone, city
3. Assign skills (comma-separated)
4. Select a color for calendar display

### Scheduling Installations

1. Go to **Schedule** → **Schedule Installation**
2. Select customer, date, time
3. Assign one or more crews
4. Enter job address and notes
5. View on calendar - click to see details/update status

### GPS Tracking (Admin)

1. Go to **Tracking** page
2. Toggle between **Map View** and **List View**
3. **Map Features:**
   - Crew markers (circles) show real-time locations
   - Job markers (squares) show today's scheduled addresses
   - Color-coded by status (green=on site, blue=scheduled, amber=in progress)
   - Click markers for details and Google Maps links
4. Toggle "Show today's job locations" to display customer addresses
5. View today's schedule with crew assignments below the map
6. Auto-refresh updates every 30 seconds

### Crew Portal (For Field Crews)

1. Crew logs in with their credentials
2. Automatically redirected to Crew Portal
3. View assigned jobs for the day
4. **Check In**: Tap when arriving at job site (captures GPS)
5. **Check Out**: Tap when job complete (captures GPS)
6. Quick buttons: Call customer, Open in Maps

---

## Local Linux Server Deployment

### Prerequisites
- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Domain name (optional, for HTTPS)
- Minimum: 2 CPU, 4GB RAM, 20GB storage

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/festive-lights-crm.git
cd festive-lights-crm
```

### Step 3: Configure Environment

```bash
# Backend environment
cat > backend/.env << 'EOF'
MONGO_URL=mongodb://mongodb:27017
DB_NAME=festive_crm
JWT_SECRET=your-secure-secret-key-change-this
STRIPE_API_KEY=sk_test_your_stripe_key
SENDGRID_API_KEY=your_sendgrid_key
EOF

# Frontend environment
cat > frontend/.env << 'EOF'
REACT_APP_BACKEND_URL=http://your-server-ip:8001
EOF
```

### Step 4: Create Docker Compose File

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: festive-mongodb
    restart: always
    volumes:
      - mongodb_data:/data/db
    networks:
      - festive-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: festive-backend
    restart: always
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=festive_crm
    env_file:
      - ./backend/.env
    depends_on:
      - mongodb
    networks:
      - festive-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: festive-frontend
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - festive-network

volumes:
  mongodb_data:

networks:
  festive-network:
    driver: bridge
EOF
```

### Step 5: Create Dockerfiles

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Nginx config** (`frontend/nginx.conf`):
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 6: Build and Run

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Step 7: Create Admin User

```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"SecurePassword123","name":"Admin User","role":"admin"}'
```

### Step 8: Setup HTTPS (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## AWS Terraform Deployment

### Prerequisites
- AWS Account with appropriate permissions
- Terraform 1.5+ installed
- AWS CLI configured (`aws configure`)

### Step 1: Create Terraform Directory Structure

```bash
mkdir -p terraform/{modules/ecs,modules/rds,modules/vpc}
cd terraform
```

### Step 2: Main Terraform Configuration

**`terraform/main.tf`**:
```hcl
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "festive-crm-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "FestiveLightsCRM"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  environment     = var.environment
  vpc_cidr        = var.vpc_cidr
  azs             = var.availability_zones
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets
}

# DocumentDB (MongoDB-compatible)
module "documentdb" {
  source = "./modules/documentdb"
  
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  instance_class     = var.documentdb_instance_class
  cluster_size       = var.documentdb_cluster_size
  master_username    = var.db_username
  master_password    = var.db_password
}

# ECS Cluster
module "ecs" {
  source = "./modules/ecs"
  
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  
  backend_image      = var.backend_image
  frontend_image     = var.frontend_image
  
  mongodb_url        = module.documentdb.connection_string
  jwt_secret         = var.jwt_secret
  stripe_api_key     = var.stripe_api_key
  
  domain_name        = var.domain_name
  certificate_arn    = var.certificate_arn
}

# Outputs
output "frontend_url" {
  value = module.ecs.alb_dns_name
}

output "backend_url" {
  value = "${module.ecs.alb_dns_name}/api"
}
```

**`terraform/variables.tf`**:
```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "private_subnets" {
  description = "Private subnet CIDRs"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "public_subnets" {
  description = "Public subnet CIDRs"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

variable "documentdb_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "documentdb_cluster_size" {
  description = "Number of DocumentDB instances"
  type        = number
  default     = 2
}

variable "db_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "backend_image" {
  description = "Backend Docker image URI"
  type        = string
}

variable "frontend_image" {
  description = "Frontend Docker image URI"
  type        = string
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "stripe_api_key" {
  description = "Stripe API key"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}
```

### Step 3: VPC Module

**`terraform/modules/vpc/main.tf`**:
```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "${var.environment}-festive-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name = "${var.environment}-festive-igw"
  }
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnets)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnets[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "${var.environment}-public-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = var.azs[count.index]
  
  tags = {
    Name = "${var.environment}-private-${count.index + 1}"
  }
}

resource "aws_eip" "nat" {
  count  = length(var.public_subnets)
  domain = "vpc"
  
  tags = {
    Name = "${var.environment}-nat-eip-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "main" {
  count         = length(var.public_subnets)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = {
    Name = "${var.environment}-nat-${count.index + 1}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = {
    Name = "${var.environment}-public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = length(var.private_subnets)
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  
  tags = {
    Name = "${var.environment}-private-rt-${count.index + 1}"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(var.public_subnets)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(var.private_subnets)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

**`terraform/modules/vpc/variables.tf`**:
```hcl
variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "azs" {
  type = list(string)
}

variable "public_subnets" {
  type = list(string)
}

variable "private_subnets" {
  type = list(string)
}
```

### Step 4: ECS Module

**`terraform/modules/ecs/main.tf`**:
```hcl
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-festive-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ALB
resource "aws_lb" "main" {
  name               = "${var.environment}-festive-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "frontend" {
  name        = "${var.environment}-frontend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  
  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 10
  }
}

resource "aws_lb_target_group" "backend" {
  name        = "${var.environment}-backend-tg"
  port        = 8001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  
  health_check {
    path                = "/api/"
    healthy_threshold   = 2
    unhealthy_threshold = 10
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100
  
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
  
  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "${var.environment}-alb-sg"
  description = "ALB Security Group"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name        = "${var.environment}-ecs-sg"
  description = "ECS Tasks Security Group"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.environment}-ecs-task-execution"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.environment}/backend"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.environment}/frontend"
  retention_in_days = 30
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.environment}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  
  container_definitions = jsonencode([{
    name  = "backend"
    image = var.backend_image
    
    portMappings = [{
      containerPort = 8001
      hostPort      = 8001
      protocol      = "tcp"
    }]
    
    environment = [
      { name = "MONGO_URL", value = var.mongodb_url },
      { name = "DB_NAME", value = "festive_crm" },
      { name = "JWT_SECRET", value = var.jwt_secret },
      { name = "STRIPE_API_KEY", value = var.stripe_api_key }
    ]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.backend.name
        awslogs-region        = "us-east-1"
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.environment}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  
  container_definitions = jsonencode([{
    name  = "frontend"
    image = var.frontend_image
    
    portMappings = [{
      containerPort = 80
      hostPort      = 80
      protocol      = "tcp"
    }]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.frontend.name
        awslogs-region        = "us-east-1"
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ECS Services
resource "aws_ecs_service" "backend" {
  name            = "${var.environment}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8001
  }
}

resource "aws_ecs_service" "frontend" {
  name            = "${var.environment}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 2
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}
```

### Step 5: Deploy to AWS

```bash
# Initialize Terraform
cd terraform
terraform init

# Create terraform.tfvars
cat > terraform.tfvars << 'EOF'
aws_region     = "us-east-1"
environment    = "production"
db_username    = "festiveadmin"
db_password    = "YourSecurePassword123!"
jwt_secret     = "your-production-jwt-secret"
stripe_api_key = "sk_live_your_stripe_key"
backend_image  = "YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/festive-backend:latest"
frontend_image = "YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/festive-frontend:latest"
EOF

# Plan deployment
terraform plan

# Apply deployment
terraform apply

# Get outputs
terraform output
```

### Step 6: Push Docker Images to ECR

```bash
# Create ECR repositories
aws ecr create-repository --repository-name festive-backend
aws ecr create-repository --repository-name festive-frontend

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
cd backend
docker build -t festive-backend .
docker tag festive-backend:latest YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/festive-backend:latest
docker push YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/festive-backend:latest

# Build and push frontend
cd ../frontend
docker build -t festive-frontend .
docker tag festive-frontend:latest YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/festive-frontend:latest
docker push YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/festive-frontend:latest
```

---

## Environment Variables

### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URL` | MongoDB connection string | Yes |
| `DB_NAME` | Database name | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `STRIPE_API_KEY` | Stripe secret key | Yes |
| `SENDGRID_API_KEY` | SendGrid API key | No |

### Frontend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_BACKEND_URL` | Backend API URL | Yes |

---

## API Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Cities
- `GET /api/cities` - List all cities
- `POST /api/cities` - Create city
- `DELETE /api/cities/{id}` - Delete city

### Customers
- `GET /api/customers` - List customers (filter by city_id)
- `POST /api/customers` - Create customer
- `GET /api/customers/{id}` - Get customer
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Delete customer

### Quotes
- `GET /api/quotes` - List quotes
- `POST /api/quotes` - Create quote
- `GET /api/quotes/{id}` - Get quote
- `GET /api/quotes/{id}/pdf` - Download PDF
- `PUT /api/quotes/{id}/status` - Update status
- `DELETE /api/quotes/{id}` - Delete quote

### Invoices
- `GET /api/invoices` - List invoices
- `GET /api/invoices/unpaid` - List unpaid invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/{id}` - Get invoice
- `GET /api/invoices/{id}/pdf` - Download PDF
- `DELETE /api/invoices/{id}` - Delete invoice

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `POST /api/payments/stripe/create-session` - Create Stripe session

### Crews
- `GET /api/crews` - List crews
- `POST /api/crews` - Create crew
- `GET /api/crews/{id}` - Get crew
- `PUT /api/crews/{id}` - Update crew
- `DELETE /api/crews/{id}` - Delete crew

### Installations
- `GET /api/installations` - List installations
- `POST /api/installations` - Create installation
- `GET /api/installations/{id}` - Get installation
- `PUT /api/installations/{id}/status` - Update status
- `DELETE /api/installations/{id}` - Delete installation

### GPS Tracking
- `POST /api/crew-portal/check-in/{id}` - Crew check-in with GPS
- `POST /api/crew-portal/check-out/{id}` - Crew check-out with GPS
- `POST /api/crew-portal/update-location` - Update crew location
- `GET /api/tracking/crew-locations` - Get all crew locations

### Crew Portal
- `GET /api/crew-portal/my-schedule` - Get crew's schedule

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

---

## Estimated AWS Costs (Monthly)

| Service | Configuration | Est. Cost |
|---------|--------------|-----------|
| ECS Fargate | 2 backend + 2 frontend tasks | ~$80 |
| DocumentDB | db.t3.medium x 2 | ~$120 |
| ALB | Application Load Balancer | ~$20 |
| NAT Gateway | 2 AZs | ~$65 |
| Data Transfer | ~50GB | ~$5 |
| CloudWatch | Logs & Metrics | ~$10 |
| **Total** | | **~$300/month** |

For cost optimization:
- Use single NAT Gateway (~$30 savings)
- Use DocumentDB serverless for low traffic
- Use spot instances for non-production
