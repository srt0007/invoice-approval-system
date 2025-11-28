const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // File Information
  originalFileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileType: {
    type: DataTypes.ENUM('pdf', 'png', 'jpg', 'jpeg', 'tiff'),
    allowNull: false,
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  // Processing Status
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'review_required'),
    defaultValue: 'pending',
  },
  processingStartedAt: DataTypes.DATE,
  processingCompletedAt: DataTypes.DATE,
  processingTimeMs: DataTypes.INTEGER,

  // Extracted Data
  vendorName: DataTypes.STRING,
  vendorAddress: DataTypes.TEXT,
  vendorEmail: DataTypes.STRING,
  vendorPhone: DataTypes.STRING,

  invoiceNumber: DataTypes.STRING,
  invoiceDate: DataTypes.DATE,
  dueDate: DataTypes.DATE,
  purchaseOrderNumber: DataTypes.STRING,

  // Customer Information
  customerName: DataTypes.STRING,
  customerAddress: DataTypes.TEXT,

  // Financial Data
  lineItems: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('lineItems');
      if (!rawValue) return [];
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    }
  },
  subtotal: DataTypes.DECIMAL(10, 2),
  taxRate: DataTypes.DECIMAL(5, 2),
  taxAmount: DataTypes.DECIMAL(10, 2),
  discountAmount: DataTypes.DECIMAL(10, 2),
  shippingAmount: DataTypes.DECIMAL(10, 2),
  totalAmount: DataTypes.DECIMAL(10, 2),
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR',
  },

  // Payment Information
  paymentTerms: DataTypes.STRING,
  paymentMethod: DataTypes.STRING,
  bankDetails: DataTypes.TEXT,

  // Validation & Quality
  confidenceScore: DataTypes.DECIMAL(3, 2),
  validationErrors: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('validationErrors');
      if (!rawValue) return [];
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    }
  },
  validationWarnings: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('validationWarnings');
      if (!rawValue) return [];
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    }
  },
  isValidated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  requiresManualReview: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // Anomalies & Flags
  anomalies: {
    type: DataTypes.JSON,
    defaultValue: [],
  },

  // Raw Extraction Data
  rawExtractionData: DataTypes.JSON,

  // User Corrections
  corrections: {
    type: DataTypes.JSON,
    defaultValue: [],
  },

  // Batch Processing
  batchId: DataTypes.STRING,

  // Integration
  exportedTo: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  externalIds: DataTypes.JSON,

  // Webhook
  webhookUrl: DataTypes.STRING,
  webhookSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  webhookSentAt: DataTypes.DATE,

  // Retry Information
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lastError: DataTypes.TEXT,

  // Metadata
  createdBy: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  notes: DataTypes.TEXT,
}, {
  tableName: 'invoices',
  timestamps: true,
  indexes: [
    { fields: ['status', 'createdAt'] },
    { fields: ['invoiceNumber'] },
    { fields: ['vendorName'] },
    { fields: ['batchId'] },
    { fields: ['createdBy'] },
  ],
});

// Instance method to validate calculations
Invoice.prototype.validateCalculations = function() {
  const errors = [];

  if (!this.lineItems || this.lineItems.length === 0) return errors;

  // Check line items
  for (let i = 0; i < this.lineItems.length; i++) {
    const item = this.lineItems[i];
    const expectedAmount = item.quantity * item.unitPrice;
    if (Math.abs(item.amount - expectedAmount) > 0.01) {
      errors.push(`Line item ${i + 1}: Amount mismatch (expected ${expectedAmount}, got ${item.amount})`);
    }
  }

  // Check subtotal
  const calculatedSubtotal = this.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  if (this.subtotal && Math.abs(this.subtotal - calculatedSubtotal) > 0.01) {
    errors.push(`Subtotal mismatch (expected ${calculatedSubtotal}, got ${this.subtotal})`);
  }

  // Check total
  const expectedTotal = (parseFloat(this.subtotal) || 0) + (parseFloat(this.taxAmount) || 0) -
    (parseFloat(this.discountAmount) || 0) + (parseFloat(this.shippingAmount) || 0);
  if (this.totalAmount && Math.abs(this.totalAmount - expectedTotal) > 0.01) {
    errors.push(`Total mismatch (expected ${expectedTotal}, got ${this.totalAmount})`);
  }

  return errors;
};

// Static method for batch processing stats
Invoice.getBatchStats = async function(batchId) {
  const { Op, fn, col, literal } = require('sequelize');

  return Invoice.findAll({
    where: { batchId },
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'count'],
      [fn('AVG', col('confidenceScore')), 'avgConfidence'],
      [fn('AVG', col('processingTimeMs')), 'avgProcessingTime'],
    ],
    group: ['status'],
    raw: true,
  });
};

module.exports = Invoice;
