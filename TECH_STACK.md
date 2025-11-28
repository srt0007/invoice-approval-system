# Invoice Processing System - Tech Stack

## 📋 Complete Technology Stack

### **Backend**

#### Core Framework
- **Node.js** v18+ - JavaScript runtime
- **Express.js** v4.18.2 - Web application framework
- **Sequelize** v6.37.7 - ORM (Object-Relational Mapping) for MySQL

#### Database
- **MySQL** v8.0 - Primary relational database
- **mysql2** v3.15.3 - MySQL driver for Node.js

#### AI & OCR
- **OpenAI API** v4.20.1 - GPT-4 Vision for invoice data extraction
- **Tesseract.js** v5.0.3 - OCR (Optical Character Recognition) for text extraction
- **pdf-parse** v1.1.1 - PDF parsing and text extraction

#### Authentication & Security
- **jsonwebtoken** v9.0.2 - JWT token generation and validation
- **bcryptjs** v2.4.3 - Password hashing
- **helmet** v7.1.0 - Security headers middleware
- **express-rate-limit** v7.1.5 - Rate limiting to prevent abuse
- **cors** v2.8.5 - Cross-Origin Resource Sharing
- **express-validator** v7.0.1 - Request validation

#### File Processing
- **multer** v1.4.5 - File upload handling
- **sharp** v0.33.0 - Image processing and optimization
- **uuid** v9.0.1 - Unique identifier generation

#### Data Export
- **json2csv** v6.0.0 - CSV export functionality
- **xml2js** v0.6.2 - XML export functionality

#### Utilities
- **axios** v1.6.2 - HTTP client for external API calls
- **compression** v1.7.4 - Response compression (gzip)
- **winston** v3.11.0 - Logging framework
- **dotenv** v16.3.1 - Environment variable management

---

### **Frontend**

#### UI Framework
- **Vanilla JavaScript** - No framework dependencies (lightweight)
- **Bootstrap 5.3.2** - Responsive CSS framework
- **Bootstrap Icons** v1.11.1 - Icon library

#### Frontend Features
- **HTML5** - Semantic markup
- **CSS3** - Custom styling
- **Responsive Design** - Mobile-first approach
- **SPA-like Navigation** - Dynamic section loading without page refresh

---

### **Infrastructure & DevOps**

#### Process Management
- **PM2** - Production process manager (clustering, auto-restart)

#### Web Server
- **Nginx** - Reverse proxy, SSL termination, static file serving

#### SSL/TLS
- **Let's Encrypt** (Certbot) - Free SSL certificates

#### Environment Management
- Separate configurations for:
  - Development
  - Staging
  - Production

---

## 🏗️ Architecture

### System Architecture
```
                                 Internet
                                    ↓
                              [DNS - printo.in]
                                    ↓
                           [Nginx - Port 443 (HTTPS)]
                                    ↓
                    [SSL Termination & Reverse Proxy]
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
          [Node.js App - Port 3000]    [Node.js App - Port 3001]
           (Production)                  (Staging)
                    ↓                               ↓
          [PM2 Cluster Mode]            [PM2 Single Instance]
                    ↓                               ↓
                    └───────────────┬───────────────┘
                                    ↓
                            [MySQL Database]
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
        [invoice_processing_production]  [invoice_processing_staging]
```

### Data Flow
```
User → Upload Invoice (PDF/Image)
  ↓
Express API receives file
  ↓
Multer saves file to /uploads
  ↓
Sharp processes image (if needed)
  ↓
Tesseract.js extracts text (OCR)
  ↓
OpenAI GPT-4 Vision analyzes & extracts structured data
  ↓
Data validation & confidence calculation
  ↓
Sequelize saves to MySQL
  ↓
Return processed data to frontend
  ↓
User reviews & can export (CSV/JSON/XML)
```

---

## 🔧 Key Features

### Invoice Processing
- ✅ Multi-format support (PDF, PNG, JPG, JPEG, TIFF)
- ✅ AI-powered data extraction (GPT-4 Vision)
- ✅ OCR fallback (Tesseract.js)
- ✅ Automatic field detection:
  - Invoice number
  - Date
  - Vendor name
  - Customer name
  - Line items (description, quantity, price, amount)
  - Subtotal, tax, total
  - Currency (INR focus)

### Data Management
- ✅ Real-time validation
- ✅ Confidence scoring
- ✅ Manual review & editing
- ✅ Bulk operations
- ✅ Search & filtering

### Export Options
- ✅ CSV export
- ✅ JSON export
- ✅ XML export
- ✅ Bulk export

### Security
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation
- ✅ SQL injection prevention (Sequelize)
- ✅ XSS protection

### Performance
- ✅ Response compression (gzip)
- ✅ PM2 clustering
- ✅ Database indexing
- ✅ Image optimization
- ✅ Rate limiting

---

## 📊 Database Schema

### Users Table
- id (Primary Key)
- name
- email (Unique)
- password (Hashed)
- createdAt
- updatedAt

### Invoices Table
- id (Primary Key)
- userId (Foreign Key)
- fileName
- fileUrl
- invoiceNumber
- invoiceDate
- vendorName
- customerName
- subtotal
- taxAmount
- totalAmount
- currency
- lineItems (JSON)
- rawData (JSON)
- validationErrors (JSON)
- validationWarnings (JSON)
- confidence
- status (pending/approved/rejected)
- createdAt
- updatedAt

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Invoices
- `POST /api/invoices/upload` - Upload invoice
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get single invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/export/csv` - Export to CSV
- `GET /api/invoices/export/json` - Export to JSON
- `GET /api/invoices/export/xml` - Export to XML
- `GET /api/invoices/stats` - Dashboard statistics

### System
- `GET /api/health` - Health check

---

## 💾 Storage & File Handling

### File Storage
- **Location**: `/uploads` directory
- **Max Size**: 10MB per file
- **Supported Formats**: PDF, PNG, JPG, JPEG, TIFF
- **File Naming**: UUID-based unique names
- **Security**: Validated file types, size limits

### Database
- **Type**: MySQL 8.0
- **Character Set**: utf8mb4 (full Unicode support including emojis)
- **Collation**: utf8mb4_unicode_ci
- **Backup**: Manual mysqldump scripts (automated backups recommended)

---

## 🔐 Environment Variables

### Required Environment Variables
```
# OpenAI
OPENAI_API_KEY=sk-...

# Server
PORT=3000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=invoice_processing_production
DB_USER=invoice_user
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_random_secret
JWT_EXPIRES_IN=7d

# Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

---

## 📦 Dependencies Summary

### Production Dependencies (16)
- express, sequelize, mysql2 (Core framework)
- openai, tesseract.js, pdf-parse (AI/OCR)
- helmet, cors, express-rate-limit (Security)
- multer, sharp (File handling)
- bcryptjs, jsonwebtoken (Auth)
- json2csv, xml2js (Export)
- winston, dotenv, compression (Utilities)

### Dev Dependencies (3)
- nodemon (Development server)
- eslint (Code linting)
- jest (Testing framework)

---

## 🚀 Deployment Options

### Option 1: Cloud Platforms
- **DigitalOcean** - $24-36/month (Recommended)
- **AWS EC2** - $30-50/month
- **Azure** - $30-50/month
- **Google Cloud** - $30-50/month

### Option 2: Platform as a Service (PaaS)
- **Heroku** - Free to $25/month (easiest)
- **Railway** - $5-20/month
- **Render** - Free to $25/month

### What You Need
1. Linux server (Ubuntu 20.04/22.04)
2. Node.js 18+
3. MySQL 8.0
4. Nginx
5. PM2
6. Domain name (for printo.in subdomain)

---

## 📈 Scalability

### Current Capacity
- Single server: 100-500 invoices/day
- PM2 cluster: Scales with CPU cores

### Future Scaling Options
- Load balancer + multiple app servers
- Read replicas for MySQL
- Redis caching layer
- AWS S3 for file storage
- Message queue (RabbitMQ/Redis) for async processing
- Microservices architecture

---

## 🛠️ Development Tools

### Recommended Tools
- **VS Code** - Code editor
- **Postman** - API testing
- **MySQL Workbench** - Database management
- **Git** - Version control
- **GitHub** - Code repository

---

## 📝 License
MIT License

---

## 🎯 System Requirements

### Server Requirements
- **OS**: Ubuntu 20.04/22.04 LTS
- **RAM**: 2GB minimum (4GB recommended)
- **CPU**: 1 core minimum (2 cores recommended)
- **Storage**: 20GB SSD minimum
- **Bandwidth**: Unlimited preferred

### Client Requirements (Users)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Internet connection
- No mobile app required (responsive web design)

---

This is a **full-stack Node.js application** with:
- **Backend**: Node.js + Express + MySQL
- **Frontend**: Vanilla JS + Bootstrap
- **AI**: OpenAI GPT-4 Vision + Tesseract OCR
- **Infrastructure**: Nginx + PM2 + Let's Encrypt SSL
