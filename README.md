# AI-Powered Invoice Processing System

An intelligent invoice processing system that leverages the ChatGPT API to automate invoice data extraction, validation, and processing workflows.

## Features

### Document Ingestion
- Support for multiple formats: PDF, PNG, JPG, TIFF
- Handle scanned documents and digital invoices
- Batch processing capabilities (up to 50 files per batch)

### Data Extraction
- Extract key fields: vendor name, invoice number, date, line items, subtotal, tax, total amount
- Handle various invoice layouts and formats
- Confidence scoring for extracted information
- Anomaly detection and flagging

### Validation & Quality Control
- Mathematical validation of line items and totals
- Business rule validation
- Date and format validation
- Automatic flagging for manual review

### API Integration
- RESTful API endpoints
- JWT and API key authentication
- Webhook support for status updates
- Export capabilities (CSV, JSON, XML)

### Web Dashboard
- Invoice upload and review interface
- Data correction capabilities
- Bulk processing queue management
- Real-time status updates

## Prerequisites

- Node.js 18+
- MongoDB 5+
- OpenAI API key (GPT-4 Vision access)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd invoice-processing-system
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Start the application:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

6. Access the dashboard at http://localhost:3000

## Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `OPENAI_MODEL` | GPT model to use | gpt-4-vision-preview |
| `PORT` | Server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/invoice_processing |
| `JWT_SECRET` | JWT signing secret | Required |
| `MAX_FILE_SIZE` | Maximum upload size in bytes | 10485760 (10MB) |
| `MAX_CONCURRENT_PROCESSING` | Concurrent processing limit | 10 |

## API Endpoints

### Authentication

```
POST /api/auth/register    - Register new user
POST /api/auth/login       - User login
GET  /api/auth/me          - Get current user
```

### Invoices

```
POST   /api/invoices/upload        - Upload single invoice
POST   /api/invoices/batch         - Batch upload
GET    /api/invoices               - List invoices
GET    /api/invoices/:id           - Get invoice details
PATCH  /api/invoices/:id           - Update invoice
DELETE /api/invoices/:id           - Delete invoice
POST   /api/invoices/:id/retry     - Retry failed invoice
GET    /api/invoices/batch/:batchId - Get batch status
POST   /api/invoices/export        - Export invoices
GET    /api/invoices/stats/summary - Get statistics
```

## Usage Examples

### Upload Invoice
```bash
curl -X POST http://localhost:3000/api/invoices/upload \
  -H "Authorization: Bearer <token>" \
  -F "invoice=@invoice.pdf" \
  -F "webhookUrl=https://your-server.com/webhook"
```

### Batch Upload
```bash
curl -X POST http://localhost:3000/api/invoices/batch \
  -H "Authorization: Bearer <token>" \
  -F "invoices=@invoice1.pdf" \
  -F "invoices=@invoice2.pdf"
```

### Export to CSV
```bash
curl -X POST http://localhost:3000/api/invoices/export \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"format": "csv", "filter": {"status": "completed"}}'
```

## Webhook Events

The system sends webhooks for the following events:

- `invoice.processed` - Invoice successfully processed
- `invoice.failed` - Invoice processing failed
- `batch.completed` - Batch processing completed
- `test` - Webhook verification

Webhook payload includes signature verification in headers:
- `X-Webhook-Signature` - HMAC-SHA256 signature
- `X-Webhook-Timestamp` - Unix timestamp

## Architecture

```
invoice-processing-system/
├── src/
│   ├── api/                 # API routes
│   ├── config/              # Configuration
│   ├── middleware/          # Express middleware
│   ├── models/              # MongoDB models
│   ├── services/            # Business logic
│   └── utils/               # Utilities
├── public/                  # Web dashboard
├── uploads/                 # Uploaded files
├── exports/                 # Export files
└── logs/                    # Application logs
```

## Services

- **DocumentService**: Handles file processing and OCR
- **ExtractionService**: GPT-4 Vision integration for data extraction
- **ValidationService**: Data validation and quality control
- **ProcessingService**: Queue management and orchestration
- **WebhookService**: Webhook delivery
- **ExportService**: Export generation (CSV, JSON, XML)

## Performance Targets

- 95%+ accuracy in data extraction
- Processing time under 30 seconds per invoice
- Support for 100+ invoices per hour
- Concurrent processing up to 10 invoices

## Security

- JWT-based authentication
- API key support for integrations
- Rate limiting (100 requests per 15 minutes)
- Helmet.js security headers
- Input validation and sanitization
- Secure file upload handling

## Integration

### QuickBooks
```javascript
const result = await exportService.exportForQuickBooks(invoices);
```

### Xero
```javascript
const result = await exportService.exportForXero(invoices);
```

## Cost Optimization

- Confidence-based retry (avoid re-processing high-confidence results)
- Image optimization before API calls
- Caching for repeated requests
- Batch processing for efficiency

## Troubleshooting

### Common Issues

1. **Low confidence scores**
   - Ensure document quality is good
   - Check for unusual invoice formats

2. **Processing timeout**
   - Increase `PROCESSING_TIMEOUT_MS`
   - Check OpenAI API status

3. **Upload failures**
   - Verify file type and size limits
   - Check upload directory permissions

## License

MIT License

## Support

For issues and feature requests, please open a GitHub issue.
