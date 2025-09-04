# Phase 1: Docker, Redis, and PostgreSQL Setup Guide

## Prerequisites

Before starting, ensure you have the following installed on your Windows machine:

### 1. Install Docker Desktop for Windows

1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
2. Run the installer and follow the setup wizard
3. After installation, restart your computer
4. Launch Docker Desktop from the Start menu
5. Verify installation by opening Command Prompt and running:
   ```cmd
   docker --version
   docker-compose --version
   ```

### 2. Install Node.js

1. Download Node.js LTS from: https://nodejs.org/
2. Run the installer and follow the setup wizard
3. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

### 3. Install Git (if not already installed)

1. Download Git from: https://git-scm.com/download/win
2. Run the installer with default settings
3. Verify installation:
   ```cmd
   git --version
   ```

## Phase 1 Implementation Steps

### Step 1: Initialize Git Repository

Open Command Prompt in your project directory and run:

```cmd
cd "c:\Users\Maverick\Documents\Projects\MERN Stack\Client_Invoice_Management_Portal"
git init
git add .
git commit -m "Initial commit: Project skeleton and configuration"
```

### Step 2: Setup Backend Dependencies

Navigate to the backend directory and install dependencies:

```cmd
cd backend
npm install
```

This will install all the packages defined in the `package.json` file.

### Step 3: Environment Configuration

1. Copy the example environment file:
   ```cmd
   copy .env.example .env
   ```

2. Edit the `.env` file with your specific values:
   ```env
   NODE_ENV=development
   PORT=3001
   DATABASE_URL=postgresql://postgres:password123@localhost:5432/invoice_portal
   REDIS_URL=redis://localhost:6379
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   FRONTEND_URL=http://localhost:3000
   ```

### Step 4: Start Docker Services

1. Ensure Docker Desktop is running
2. From the project root directory, start PostgreSQL and Redis:
   ```cmd
   docker-compose up -d
   ```

3. Verify services are running:
   ```cmd
   docker-compose ps
   ```

   You should see both `postgres` and `redis` containers running.

### Step 5: Database Setup

1. Generate Drizzle migration files:
   ```cmd
   cd backend
   npm run db:generate
   ```

2. Run database migrations:
   ```cmd
   npm run db:migrate
   ```

### Step 6: Test Backend Server

1. Start the development server:
   ```cmd
   npm run dev
   ```

2. Test the health endpoint by opening a browser and navigating to:
   ```
   http://localhost:3001/health
   ```

   You should see a JSON response indicating the server is running.

## Verification and Testing

### Test Database Connection

1. Open a new Command Prompt window
2. Connect to PostgreSQL to verify it's working:
   ```cmd
   docker exec -it invoice_portal_postgres psql -U postgres -d invoice_portal
   ```

3. List tables to verify schema was created:
   ```sql
   \dt
   ```

4. Exit PostgreSQL:
   ```sql
   \q
   ```

### Test Redis Connection

1. Connect to Redis to verify it's working:
   ```cmd
   docker exec -it invoice_portal_redis redis-cli
   ```

2. Test Redis commands:
   ```redis
   ping
   set test "Hello Redis"
   get test
   ```

3. Exit Redis:
   ```redis
   exit
   ```

## Common Troubleshooting

### Docker Issues

1. **Docker Desktop not starting**: 
   - Ensure Hyper-V is enabled in Windows Features
   - Restart Windows after enabling Hyper-V

2. **Port conflicts**:
   - If ports 5432 or 6379 are in use, modify the ports in `docker-compose.yml`

3. **Container startup issues**:
   ```cmd
   docker-compose logs postgres
   docker-compose logs redis
   ```

### Database Connection Issues

1. **Connection refused**:
   - Ensure Docker containers are running: `docker-compose ps`
   - Check if PostgreSQL is ready: `docker-compose logs postgres`

2. **Authentication errors**:
   - Verify credentials in `.env` file match `docker-compose.yml`

### Development Server Issues

1. **Module not found errors**:
   ```cmd
   cd backend
   npm install
   ```

2. **Port already in use**:
   - Change PORT in `.env` file or stop other services using port 3001

## Next Steps

After completing Phase 1, you should have:

✅ Docker Desktop installed and running
✅ PostgreSQL and Redis containers running
✅ Backend server starting successfully
✅ Database schema migrated
✅ Environment variables configured

You're now ready to proceed to Phase 2: Frontend Setup and Component Development.

## Useful Commands for Development

### Docker Management
```cmd
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View running containers
docker-compose ps

# View logs
docker-compose logs [service_name]

# Restart a service
docker-compose restart [service_name]
```

### Database Management
```cmd
# Generate new migration
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### Development
```cmd
# Start backend development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Security Notes

- Never commit the `.env` file to version control
- Change default passwords in production
- Use strong session secrets
- Enable SSL in production environments
