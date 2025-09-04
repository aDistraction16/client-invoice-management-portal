# SMA PH NewCo - Client & Invoice Management Portal

A secure, user-friendly SaaS platform for managing client information, tracking project hours, and generating/sending invoices.

## Tech Stack

- **Frontend**: React 18, TypeScript, Material-UI, React Hook Form, TanStack Query
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Session-based with Redis
- **Integrations**: Stripe API, SendGrid API
- **Development**: Docker, VS Code, Git

## Project Structure

```
Client_Invoice_Management_Portal/
├── backend/                 # Node.js/Express API
├── frontend/               # React TypeScript App
├── docs/                   # Documentation
├── docker-compose.yml      # Docker services
└── README.md              # This file
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Start services with Docker:
   ```bash
   docker-compose up -d
   ```
4. Run development servers:
   ```bash
   # Backend (in backend directory)
   npm run dev
   
   # Frontend (in frontend directory)
   npm start
   ```

## Environment Variables

Copy `.env.example` files in both backend and frontend directories and update with your values.

## Development Process

This project follows a phased development approach:

1. **Phase 1**: Project Skeleton Setup
2. **Phase 2**: Database Setup (PostgreSQL + Drizzle ORM)
3. **Phase 3**: Backend Development (Express API + Authentication)
4. **Phase 4**: Frontend Development (React + Material-UI)
5. **Phase 5**: Integrations (Stripe + SendGrid + PDF)
6. **Phase 6**: Testing Strategy
7. **Phase 7**: Deployment & DevOps
8. **Phase 8**: Iteration & Monitoring

## License

Private - SMA PH NewCo, Inc.
