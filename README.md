# Client & Invoice Management Portal

A modern, full-stack web application for managing clients, tracking project hours, and processing invoice payments. Built with React, Node.js, PostgreSQL, and integrated with Stripe for payment processing.

## ✨ Features

### 🏢 Client Management
- Complete CRUD operations for client records
- Contact information management
- Client search and filtering
- Professional client dashboard

### 📊 Project & Time Tracking
- Multi-currency project support (PHP ₱, USD $)
- Real-time time tracking with start/stop functionality
- Hourly rate management per project
- Project status tracking (Active, Completed, Paused)

### 🧾 Invoice Management
- Automated invoice generation from time entries
- Multi-currency invoice support
- Professional PDF invoice generation
- Invoice status tracking (Draft, Sent, Paid, Overdue)

### 💳 Payment Processing
- Stripe payment integration
- Payment link generation for clients
- Real-time payment status updates via webhooks
- Multi-currency payment support
- Public payment pages (no login required for clients)

### 📧 Email Notifications
- Automated invoice delivery via SendGrid
- Payment confirmation emails
- Professional email templates

### 🔐 Security & Authentication
- Session-based authentication with Redis
- Secure password hashing
- Protected API routes
- CSRF protection

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for component library
- **React Router** for navigation
- **Axios** for API communication
- **React Hook Form** for form handling

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **PostgreSQL** database
- **Redis** for session storage
- **bcryptjs** for password hashing

### Integrations
- **Stripe API** for payment processing
- **SendGrid** for email delivery
- **PDFKit** for PDF generation

### DevOps
- **Docker** for containerization
- **Docker Compose** for multi-service orchestration
- Environment-based configuration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Client_Invoice_Management_Portal
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend && npm install
   
   # Frontend dependencies
   cd ../frontend && npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp backend/.env.example backend/.env
   
   # Edit backend/.env with your configuration:
   # - Database connection string
   # - Redis connection string
   # - Stripe API keys
   # - SendGrid API key
   ```

4. **Start services with Docker**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**
   ```bash
   cd backend
   npm run db:migrate
   ```

6. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   cd backend && npm run dev
   
   # Frontend (Terminal 2)
   cd frontend && npm start
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database Studio: http://localhost:4983

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
- `POST /webhooks/stripe` - Handle Stripe webhooks

### Security Features
- Session-based authentication
- Password hashing with bcryptjs
- CSRF protection
- Input validation and sanitization
- Secure webhook signature verification

## 🔧 Configuration

### Environment Variables
See `backend/.env.example` for all required environment variables:

- **Database**: PostgreSQL connection string
- **Redis**: Redis connection for sessions
- **Stripe**: API keys for payment processing
- **SendGrid**: API key for email delivery
- **Session**: Secret key for session encryption

### Docker Services
- **PostgreSQL**: Database server (port 5432)
- **Redis**: Session storage (port 6379)
- **Backend**: Express API server (port 3001)
- **Frontend**: React development server (port 3000)

## 📊 Performance

- **Database**: Optimized queries with proper indexing
- **Frontend**: Component-based architecture with efficient state management
- **Caching**: Redis session storage for fast authentication
- **Real-time Updates**: Webhook-driven status synchronization

## 🙏 Acknowledgments

- [Stripe](https://stripe.com/) for payment processing
- [SendGrid](https://sendgrid.com/) for email delivery
- [Material-UI](https://mui.com/) for React components
- [Drizzle ORM](https://orm.drizzle.team/) for database operations

---