# PostgreSQL Setup Guide

This application uses PostgreSQL as its database. Follow the instructions below based on your environment.

## Option 1: Railway (Production/Staging) - Recommended

Railway provides managed PostgreSQL with automatic backups and scaling.

### Steps:
1. Go to [railway.app](https://railway.app)
2. Create/select your project
3. Click "New" → "Database" → "PostgreSQL"
4. Railway will automatically provide `DATABASE_URL` environment variable
5. Your app will automatically connect using this URL

**No manual configuration needed!**

---

## Option 2: Local Development (Windows/Mac/Linux)

### Windows Installation:

**Method 1: Using Docker (Recommended)**
```bash
# Install Docker Desktop from docker.com
# Then run PostgreSQL in a container:
docker run --name postgres-invoice -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres:15

# Create database:
docker exec -it postgres-invoice psql -U postgres -c "CREATE DATABASE invoice_processing;"
```

**Method 2: Native Installation**
1. Download PostgreSQL from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Run the installer
3. Set password for `postgres` user during installation
4. Add PostgreSQL to PATH: `C:\Program Files\PostgreSQL\15\bin`

### Mac Installation:
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb invoice_processing
```

### Linux (Ubuntu/Debian):
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb invoice_processing
```

---

## Create .env File

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Update the PostgreSQL credentials in `.env`:

```env
# PostgreSQL Configuration (Local Development)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invoice_processing
DB_USER=postgres
DB_PASSWORD=your_actual_password
```

---

## Initialize Database Tables

The application will automatically create tables on first run using Sequelize.

To manually sync database:

```bash
# This will create all tables
npm run db:sync
```

Or connect manually:

```bash
# Connect to PostgreSQL
psql -U postgres -d invoice_processing

# List tables
\dt

# Exit
\q
```

---

## Verify Connection

Start the application:

```bash
npm run dev
```

You should see:
```
✓ Database connected successfully
✓ Tables synchronized
🚀 Server running on port 3000
```

---

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Ensure PostgreSQL service is running
- Windows: Check Services app
- Mac: `brew services list`
- Linux: `sudo systemctl status postgresql`

### Authentication Failed
```
Error: password authentication failed for user "postgres"
```
**Solution**: Update password in `.env` file or reset PostgreSQL password

### Database Doesn't Exist
```
Error: database "invoice_processing" does not exist
```
**Solution**: Create the database:
```bash
# Using psql
createdb invoice_processing

# Or using SQL
psql -U postgres -c "CREATE DATABASE invoice_processing;"
```

---

## Migration from MySQL

If you're migrating from MySQL:

1. Export data from MySQL
2. Convert to PostgreSQL format (syntax differences)
3. Import to PostgreSQL
4. Update app to use PostgreSQL (already done!)

---

## Useful PostgreSQL Commands

```bash
# List all databases
psql -U postgres -l

# Connect to database
psql -U postgres -d invoice_processing

# Inside psql:
\dt                 # List tables
\d table_name       # Describe table
\du                 # List users
\q                  # Quit

# Backup database
pg_dump -U postgres invoice_processing > backup.sql

# Restore database
psql -U postgres invoice_processing < backup.sql
```

---

## Production Best Practices

1. **Use CONNECTION_STRING** instead of individual credentials
2. **Enable SSL** for production connections (automatic on Railway)
3. **Set proper connection pool** (already configured in code)
4. **Regular backups** (automatic on Railway)
5. **Monitor performance** using Railway dashboard or pg_stat_statements

---

## Need Help?

- PostgreSQL Docs: [postgresql.org/docs](https://www.postgresql.org/docs/)
- Railway Docs: [docs.railway.app/databases/postgresql](https://docs.railway.app/databases/postgresql)
- Sequelize Docs: [sequelize.org/docs/v6/](https://sequelize.org/docs/v6/)
