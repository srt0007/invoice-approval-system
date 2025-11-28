# AWS Deployment Guide

Complete guide to deploy the Invoice Approval System on AWS with PostgreSQL database.

---

## 🚀 Deployment Options

### Option 1: AWS Elastic Beanstalk (Easiest - Recommended)
- Managed platform with auto-scaling
- Built-in load balancing
- Easy setup and deployment
- **Best for: Production apps with minimal DevOps**

### Option 2: AWS ECS (Containers)
- Docker-based deployment
- Better resource utilization
- More control over infrastructure
- **Best for: Microservices architecture**

### Option 3: AWS EC2 (Manual)
- Full control over server
- More configuration required
- **Best for: Custom setups**

---

## 📋 Prerequisites

1. AWS Account ([signup here](https://aws.amazon.com/))
2. AWS CLI installed ([installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
3. EB CLI for Elastic Beanstalk ([installation guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html))

---

## 🎯 Option 1: Elastic Beanstalk Deployment

### Step 1: Install EB CLI

```bash
# Using pip
pip install awsebcli --upgrade --user

# Verify installation
eb --version
```

### Step 2: Initialize Elastic Beanstalk

```bash
cd invoice-approval-system

# Initialize EB application
eb init

# Follow prompts:
# - Select region (e.g., us-east-1)
# - Application name: invoice-approval-system
# - Platform: Node.js
# - Platform branch: Node.js 18 running on 64bit Amazon Linux 2
# - CodeCommit: No
# - SSH: Yes (for debugging)
```

### Step 3: Create Database (RDS PostgreSQL)

```bash
# Create environment with RDS PostgreSQL
eb create invoice-prod \
  --database.engine postgres \
  --database.username dbadmin \
  --database.instance db.t3.micro \
  --instance-type t3.small \
  --envvars NODE_ENV=production
```

Or create RDS separately for better control:

1. Go to AWS Console → RDS → Create Database
2. Choose PostgreSQL (version 15+)
3. Template: Free tier (for testing) or Production
4. Instance: db.t3.micro (free tier) or larger
5. Set master username: `dbadmin`
6. Set password (save it!)
7. Public access: No
8. VPC: Same as Elastic Beanstalk environment
9. Create database

### Step 4: Set Environment Variables

```bash
# Set all required environment variables
eb setenv \
  NODE_ENV=production \
  OPENAI_API_KEY=your_openai_key_here \
  OPENAI_MODEL=gpt-4-vision-preview \
  JWT_SECRET=your_secure_jwt_secret_here \
  DATABASE_URL=postgresql://dbadmin:password@rds-endpoint:5432/invoice_processing \
  MAX_FILE_SIZE=10485760 \
  ALLOWED_FILE_TYPES=pdf,png,jpg,jpeg,tiff \
  RATE_LIMIT_WINDOW_MS=900000 \
  RATE_LIMIT_MAX_REQUESTS=100
```

**Get DATABASE_URL from RDS:**
- Format: `postgresql://username:password@endpoint:port/database`
- Example: `postgresql://dbadmin:mypassword@mydb.abc123.us-east-1.rds.amazonaws.com:5432/invoice_processing`

### Step 5: Deploy Application

```bash
# Deploy to Elastic Beanstalk
eb deploy

# Open application in browser
eb open

# View logs
eb logs
```

### Step 6: Configure Auto-Scaling (Optional)

```bash
# Set min/max instances
eb scale 2  # Start with 2 instances

# Or configure in AWS Console:
# Elastic Beanstalk → Configuration → Capacity
# - Min instances: 1
# - Max instances: 4
# - Scaling trigger: CPU > 70%
```

### Step 7: Custom Domain (Optional)

1. Go to Route 53 → Create hosted zone for your domain
2. Elastic Beanstalk → Configuration → Load balancer
3. Add listener for HTTPS (port 443)
4. Request SSL certificate in ACM
5. Point your domain CNAME to EB environment URL

---

## 🐳 Option 2: AWS ECS (Docker)

### Step 1: Create Dockerfile

Already created - verify it exists:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Step 2: Build and Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name invoice-approval-system

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t invoice-approval-system .

# Tag image
docker tag invoice-approval-system:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/invoice-approval-system:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/invoice-approval-system:latest
```

### Step 3: Create ECS Cluster

1. Go to ECS → Create Cluster
2. Cluster name: invoice-cluster
3. Infrastructure: AWS Fargate (serverless)
4. Create

### Step 4: Create Task Definition

1. ECS → Task Definitions → Create new
2. Launch type: Fargate
3. Task memory: 1GB
4. Task CPU: 0.5 vCPU
5. Container definitions:
   - Name: invoice-app
   - Image: YOUR_ECR_IMAGE_URI
   - Port mappings: 3000
   - Environment variables: Add all from .env
6. Create

### Step 5: Create Service

1. ECS → Clusters → invoice-cluster → Create Service
2. Launch type: Fargate
3. Task definition: Select yours
4. Service name: invoice-service
5. Number of tasks: 2
6. Load balancer: Application Load Balancer
7. Create

---

## 💻 Option 3: AWS EC2 (Manual)

### Step 1: Launch EC2 Instance

1. EC2 → Launch Instance
2. AMI: Ubuntu Server 22.04 LTS
3. Instance type: t3.small (or larger)
4. Key pair: Create new or use existing
5. Security group:
   - SSH (22) - Your IP
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - Custom TCP (3000) - 0.0.0.0/0
6. Storage: 20GB
7. Launch

### Step 2: Connect and Setup

```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL client
sudo apt install -y postgresql-client

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### Step 3: Deploy Application

```bash
# Clone your repository
git clone https://github.com/srt0007/invoice-approval-system.git
cd invoice-approval-system

# Install dependencies
npm ci --only=production

# Create .env file
nano .env
# Paste your environment variables
# Save: Ctrl+X, Y, Enter

# Start with PM2
pm2 start src/server.js --name invoice-app

# Make PM2 start on reboot
pm2 startup
pm2 save

# View logs
pm2 logs invoice-app
```

### Step 4: Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/invoice-app

# Paste this configuration:
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/invoice-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is automatically configured
```

---

## 🗄️ Database Options

### Option A: AWS RDS PostgreSQL (Recommended)

**Pros:**
- Fully managed
- Automatic backups
- Multi-AZ for high availability
- Easy scaling

**Setup:**
1. RDS → Create database
2. PostgreSQL 15
3. Template based on use case
4. Note connection details
5. Update DATABASE_URL in environment

### Option B: Self-hosted on EC2

**Pros:**
- Full control
- Lower cost for small deployments

**Setup:**
```bash
# Install PostgreSQL on EC2
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE invoice_processing;
CREATE USER dbadmin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE invoice_processing TO dbadmin;
\q
```

---

## 📊 Cost Estimation

### Elastic Beanstalk (Monthly)
- t3.small instance (2): ~$30
- RDS db.t3.micro: ~$13
- Load balancer: ~$20
- Data transfer: ~$10
- **Total: ~$73/month**

### ECS Fargate (Monthly)
- Fargate tasks (2): ~$25
- RDS: ~$13
- Load balancer: ~$20
- **Total: ~$58/month**

### EC2 Manual (Monthly)
- t3.small instance: ~$15
- PostgreSQL on same instance: $0
- **Total: ~$15/month** (cheapest)

---

## 🔐 Security Checklist

- [ ] Enable HTTPS/SSL
- [ ] Set strong JWT_SECRET
- [ ] Database in private subnet
- [ ] Security groups properly configured
- [ ] API rate limiting enabled
- [ ] Environment variables not in code
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] CloudWatch monitoring enabled
- [ ] WAF for DDoS protection (optional)

---

## 📈 Monitoring & Logging

### CloudWatch Setup

```bash
# Install CloudWatch agent on EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/linux/amd64/latest/AmazonCloudWatchAgent.zip
unzip AmazonCloudWatchAgent.zip
sudo ./install.sh
```

### Application Logs

- Elastic Beanstalk: Built-in CloudWatch integration
- ECS: Container logs automatically sent to CloudWatch
- EC2: Configure CloudWatch agent

---

## 🔄 CI/CD Pipeline (Optional)

### Using GitHub Actions

Create `.github/workflows/deploy-aws.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - name: Deploy to EB
        run: |
          pip install awsebcli
          eb deploy invoice-prod
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 🆘 Troubleshooting

### Application Won't Start
```bash
# Check logs
eb logs  # Elastic Beanstalk
pm2 logs  # EC2

# Common issues:
# - Wrong DATABASE_URL
# - Missing environment variables
# - Port already in use
```

### Database Connection Failed
```bash
# Test connection
psql $DATABASE_URL

# Check security groups allow connection from app servers
```

### Out of Memory
```bash
# Increase instance size
# Or optimize application memory usage
```

---

## 📚 Additional Resources

- [AWS Elastic Beanstalk Docs](https://docs.aws.amazon.com/elasticbeanstalk/)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [PM2 Production Guide](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

## ✅ Post-Deployment Checklist

- [ ] Application accessible via public URL
- [ ] Health check endpoint working: `/api/health`
- [ ] Database connection successful
- [ ] File uploads working
- [ ] AI extraction working (OpenAI API)
- [ ] SSL certificate installed
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented
- [ ] Cost alerts set up
- [ ] Documentation updated with production URL

---

**Need help?** Open an issue on GitHub or contact your DevOps team.
