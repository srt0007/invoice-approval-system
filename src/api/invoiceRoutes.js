const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const processingService = require('../services/processingService');
const exportService = require('../services/exportService');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/upload');
const logger = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticate);

/**
 * Upload single invoice
 * POST /api/invoices/upload
 */
router.post('/upload',
  uploadSingle,
  handleUploadError,
  [
    body('webhookUrl').optional().isURL(),
    body('tags').optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Create invoice record
      const invoice = await Invoice.create({
        originalFileName: req.file.originalname,
        filePath: req.file.path,
        fileType: req.file.mimetype.split('/')[1],
        fileSize: req.file.size,
        createdBy: req.user.id,
        webhookUrl: req.body.webhookUrl,
        tags: req.body.tags,
      });

      // Queue for processing
      await processingService.queueInvoice(invoice);

      res.status(201).json({
        success: true,
        data: {
          invoiceId: invoice.id,
          status: invoice.status,
          message: 'Invoice uploaded and queued for processing',
        },
      });
    } catch (error) {
      logger.error(`Upload error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Batch upload invoices
 * POST /api/invoices/batch
 */
router.post('/batch',
  uploadMultiple,
  handleUploadError,
  [
    body('webhookUrl').optional().isURL(),
    body('tags').optional().isArray(),
  ],
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
        });
      }

      const result = await processingService.processBatch(
        req.files,
        req.user.id,
        {
          webhookUrl: req.body.webhookUrl,
          tags: req.body.tags,
        }
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Batch upload error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Get invoice by ID
 * GET /api/invoices/:id
 */
router.get('/:id',
  param('id').isUUID(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await Invoice.findByPk(req.params.id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      logger.error(`Get invoice error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * List invoices with filtering
 * GET /api/invoices
 */
router.get('/',
  [
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'review_required']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['createdAt', 'invoiceDate', 'totalAmount', 'confidenceScore']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

      // Build filter
      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.vendorName) {
        where.vendorName = { [require('sequelize').Op.like]: `%${req.query.vendorName}%` };
      }
      if (req.query.batchId) where.batchId = req.query.batchId;
      if (req.query.fromDate || req.query.toDate) {
        where.createdAt = {};
        if (req.query.fromDate) where.createdAt[require('sequelize').Op.gte] = new Date(req.query.fromDate);
        if (req.query.toDate) where.createdAt[require('sequelize').Op.lte] = new Date(req.query.toDate);
      }

      const { count: total, rows: invoices } = await Invoice.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        offset,
        limit,
        attributes: { exclude: ['rawExtractionData'] },
      });

      res.json({
        success: true,
        data: {
          invoices,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error(`List invoices error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Update invoice (manual corrections)
 * PATCH /api/invoices/:id
 */
router.patch('/:id',
  param('id').isUUID(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await Invoice.findByPk(req.params.id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      // Track corrections
      const allowedUpdates = [
        'vendorName', 'vendorAddress', 'invoiceNumber', 'invoiceDate',
        'dueDate', 'lineItems', 'subtotal', 'taxAmount', 'totalAmount',
        'customerName', 'customerAddress', 'notes', 'tags'
      ];

      const updates = {};
      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          // Store correction history
          if (invoice[field] !== req.body[field]) {
            const corrections = Array.isArray(invoice.corrections) ? invoice.corrections : [];
            corrections.push({
              field,
              originalValue: invoice[field],
              correctedValue: req.body[field],
              correctedBy: req.user.id,
            });
            updates.corrections = corrections;
          }
          updates[field] = req.body[field];
        }
      }

      // Re-validate after corrections
      if (invoice.status === 'review_required') {
        updates.status = 'completed';
        updates.requiresManualReview = false;
      }

      await invoice.update(updates);

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      logger.error(`Update invoice error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Delete invoice
 * DELETE /api/invoices/:id
 */
router.delete('/:id',
  param('id').isUUID(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await Invoice.findByPk(req.params.id);
      if (invoice) {
        await invoice.destroy();
      }

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      res.json({
        success: true,
        message: 'Invoice deleted',
      });
    } catch (error) {
      logger.error(`Delete invoice error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Retry failed invoice
 * POST /api/invoices/:id/retry
 */
router.post('/:id/retry',
  param('id').isUUID(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await processingService.retryInvoice(req.params.id);

      res.json({
        success: true,
        data: {
          invoiceId: invoice.id,
          status: invoice.status,
          message: 'Invoice queued for reprocessing',
        },
      });
    } catch (error) {
      logger.error(`Retry invoice error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Get batch status
 * GET /api/invoices/batch/:batchId
 */
router.get('/batch/:batchId',
  async (req, res) => {
    try {
      const status = await processingService.getBatchStatus(req.params.batchId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error(`Get batch status error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Export invoices
 * POST /api/invoices/export
 */
router.post('/export',
  [
    body('format').isIn(['csv', 'json', 'xml']),
    body('invoiceIds').optional().isArray(),
    body('filter').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      let invoices;

      if (req.body.invoiceIds && req.body.invoiceIds.length > 0) {
        invoices = await Invoice.findAll({
          where: {
            id: { [require('sequelize').Op.in]: req.body.invoiceIds }
          }
        });
      } else {
        const filter = req.body.filter || { status: 'completed' };
        invoices = await Invoice.findAll({ where: filter });
      }

      if (invoices.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No invoices found for export',
        });
      }

      const result = await exportService.exportInvoices(invoices, req.body.format);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Export error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Get processing queue status
 * GET /api/invoices/queue/status
 */
router.get('/queue/status',
  authorize('admin'),
  async (req, res) => {
    try {
      const status = processingService.getQueueStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error(`Queue status error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Get invoice statistics
 * GET /api/invoices/stats/summary
 */
router.get('/stats/summary',
  async (req, res) => {
    try {
      const { sequelize } = require('../models/Invoice');
      const { Op } = require('sequelize');

      // Get stats grouped by status
      const stats = await Invoice.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalAmount'],
          [sequelize.fn('AVG', sequelize.col('confidenceScore')), 'avgConfidence'],
          [sequelize.fn('AVG', sequelize.col('processingTimeMs')), 'avgProcessingTime'],
        ],
        group: ['status'],
        raw: true,
      });

      // Calculate totals
      const totalInvoices = stats.reduce((sum, s) => sum + parseInt(s.count || 0), 0);
      const totalValue = stats.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0);

      res.json({
        success: true,
        data: {
          totalInvoices,
          totalValue,
          byStatus: stats.map(s => ({
            _id: s.status,
            count: parseInt(s.count || 0),
            totalAmount: parseFloat(s.totalAmount || 0),
            avgConfidence: parseFloat(s.avgConfidence || 0),
            avgProcessingTime: parseFloat(s.avgProcessingTime || 0),
          })),
        },
      });
    } catch (error) {
      logger.error(`Stats error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

module.exports = router;
