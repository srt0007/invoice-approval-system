# MySQL Setup Guide

## Step 1: Create the Database

Open MySQL command line or MySQL Workbench and run:

```sql
CREATE DATABASE invoice_processing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or use the provided SQL file:
```bash
mysql -u root -p < database-setup.sql
```

## Step 2: Configure Database Connection

Update the `.env` file with your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=invoice_processing
DB_USER=root
DB_PASSWORD=your_mysql_password
```

**Important:** Replace `your_mysql_password` with your actual MySQL root password.

## Step 3: Add OpenAI API Key

You also need to add your OpenAI API key to the `.env` file:

```env
OPENAI_API_KEY=sk-your-actual-openai-api-key
```

## Step 4: Start the Application

```bash
npm run dev
```

The application will:
1. Connect to MySQL
2. Automatically create all required tables
3. Start the server on http://localhost:3000

## Troubleshooting

### Error: "Access denied for user"
- Check your MySQL username and password in `.env`
- Make sure MySQL server is running

### Error: "Unknown database"
- Run the database creation SQL command from Step 1

### Error: "connect ECONNREFUSED"
- Make sure MySQL server is running
- Check if MySQL is running on the correct port (default: 3306)

### Check MySQL Status (Windows)
```bash
# Check if MySQL service is running
net start | findstr MySQL

# Start MySQL service if needed
net start MySQL80
```

## Database Tables

The following tables will be created automatically:
- `users` - User accounts and authentication
- `invoices` - Invoice data and processing status

## Next Steps

After the server starts successfully:
1. Open http://localhost:3000 in your browser
2. Register a new account
3. Start uploading invoices!
