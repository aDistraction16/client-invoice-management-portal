# 💼 InvoiceFlow Pro

> A professional full-stack invoice and client management system built with modern web technologies

![Tech Stack](https://img.shields.io/badge/Stack-MERN-green)
![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-blue)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-yellow)
![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)
![Payments](https://img.shields.io/badge/Payments-Stripe-purple)

A modern, web application for managing clients, tracking project hours, and processing invoice payments. Features multi-currency support, real-time payment processing.

## 🚀 **Features**

### 💼 **Business Management**
- **Client Management**: Complete CRUD operations with professional dashboard
- **Project Tracking**: Multi-currency support (PHP ₱, USD $) with hourly rates
- **Time Tracking**: Real-time timer with start/stop functionality and detailed logging
- **Invoice Generation**: Automated invoices from time entries with PDF export

### 💳 **Payment Processing**
- **Stripe Integration**: Secure payment processing with payment links
- **Multi-Currency**: Support for PHP and USD transactions
- **Real-time Updates**: Webhook-driven status synchronization
- **Client-Friendly**: Public payment pages (no account required)

### 🎨 **Professional UI/UX**
- **Modern Design**: Clean, responsive interface with Material-UI
- **Smooth Animations**: Professional hover effects and transitions
- **Mobile-First**: Optimized for all device sizes
- **Branded Experience**: Cohesive "InvoiceFlow Pro" identity

## 🛠️ **Technology Stack**

### **Frontend**
- **React 18** with TypeScript for type-safe development
- **Material-UI (MUI)** for professional component library
- **React Router** for seamless navigation
- **React Hook Form** for optimized form handling
- **Axios** with interceptors for API communication

### **Backend**
- **Node.js** with Express.js for robust API development
- **TypeScript** for enhanced code quality and maintainability
- **PostgreSQL** with Drizzle ORM for efficient data management
- **Redis** for session storage and caching
- **Joi** for comprehensive data validation

### **Integrations & Services**
- **Stripe API** for secure payment processing
- **SendGrid** for reliable email delivery
- **PDFKit** for professional PDF invoice generation

### **DevOps & Development**
- **Docker** with multi-service orchestration
- **Prettier** for consistent code formatting
- **ESLint** for code quality enforcement
- **Environment-based** configuration management

## 🚀 **Quick Start**

### **Prerequisites**
```bash
Node.js 18+ | Docker & Docker Compose | Git
```

### **Installation**

1. **Clone & Setup**
   ```bash
   git clone https://github.com/yourusername/invoiceflow-pro.git
   cd invoiceflow-pro
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend  
   cd ../frontend && npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy and configure environment variables
   cp backend/.env.example backend/.env
   
   # Required configurations:
   # - DATABASE_URL (PostgreSQL)
   # - REDIS_URL  
   # - STRIPE_SECRET_KEY
   # - SENDGRID_API_KEY
   ```

4. **Start Development Environment**
   ```bash
   # Start all services
   docker-compose up -d
   
   # Run database migrations
   cd backend && npm run db:migrate
   
   # Start development servers
   npm run dev        # Backend (Port 3001)
   cd ../frontend && npm start  # Frontend (Port 3000)
   ```

5. **Access Application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:3001  
   - **Database Studio**: http://localhost:4983

## 📱 Usage

### Getting Started
1. Register a new account or login
2. Add your first client from the Clients page
3. Create a project for the client with hourly rate
4. Start tracking time on the project
5. Generate and send invoices
6. Receive payments through Stripe integration

### Payment Flow
1. Create invoice from tracked time entries
2. Generate payment link for the invoice
3. Send payment link to client via email
4. Client pays through secure Stripe checkout
5. Receive real-time payment confirmation
6. Invoice status automatically updates to "Paid"

## 🏗️ Architecture

### Database Schema
- **users**: User accounts and authentication
- **clients**: Client information and contacts
- **projects**: Project details with currency settings
- **time_entries**: Time tracking records
- **invoices**: Invoice records with payment status
- **invoice_items**: Individual line items per invoice

### API Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `GET /clients` - List all clients
- `POST /clients` - Create new client
- `GET /projects` - List all projects
- `POST /invoices` - Create new invoice
- `POST /payments/create-payment-link` - Generate payment link
## 📸 **Screenshots**

### Dashboard Overview
- Modern stats cards with gradient design
- Real-time data visualization
- Professional "InvoiceFlow Pro" branding

### Payment Processing
- Secure Stripe integration
- Multi-currency support (PHP/USD)
- Client-friendly payment pages

## 🏗️ **Project Architecture**

### **Database Schema**
```
users → clients → projects → time_entries → invoices → invoice_items
                            ↓
                         payments (via Stripe webhooks)
```

### **API Endpoints**
- **Authentication**: `/api/auth/*` - Login, register, session management
- **Clients**: `/api/clients/*` - CRUD operations
- **Projects**: `/api/projects/*` - Project management with currency support  
- **Time Entries**: `/api/time-entries/*` - Time tracking and logging
- **Invoices**: `/api/invoices/*` - Invoice generation and management
- **Payments**: `/api/payments/*` - Stripe payment processing
- **Webhooks**: `/api/webhooks/*` - Real-time payment updates

## 🔒 **Security Features**

- **Session-based Authentication** with Redis storage
- **Password Hashing** using bcryptjs
- **Input Validation** with Joi schemas
- **CSRF Protection** and secure headers
- **Webhook Signature Verification** for Stripe
- **Environment-based Configuration** for sensitive data

## 🚀 **Performance Optimizations**

- **Database Indexing** for efficient queries
- **Redis Caching** for session management
- **Component Optimization** with React best practices
- **API Response Optimization** with proper data structure
- **Real-time Updates** via webhook integration

## 📚 **Learning Resources**

This project demonstrates:
- **Full-Stack Development** with MERN stack
- **Payment Integration** with Stripe APIs
- **Email Services** with SendGrid
- **Database Design** with PostgreSQL and Drizzle ORM
- **Modern UI/UX** with Material-UI and TypeScript
- **Professional Code Quality** with Prettier and ESLint

## 🙏 **Acknowledgments**

- [Stripe](https://stripe.com/) for secure payment processing
- [SendGrid](https://sendgrid.com/) for reliable email delivery
- [Material-UI](https://mui.com/) for professional React components
- [Drizzle ORM](https://orm.drizzle.team/) for type-safe database operations

---

**Built with ❤️ using modern web technologies**