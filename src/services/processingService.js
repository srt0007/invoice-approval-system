const { v4: uuidv4 } = require('uuid');
const Invoice = require('../models/Invoice');
const documentService = require('./documentService');
const extractionService = require('./extractionService');
const validationService = require('./validationService');
const webhookService = require('./webhookService');
const logger = require('../utils/logger');
const config = require('../config');

class ProcessingService {
  constructor() {
    this.processingQueue = [];
    this.activeProcessing = 0;
  }

  /**
   * Add invoice to processing queue
   */
  async queueInvoice(invoice) {
    this.processingQueue.push(invoice.id);
    logger.info(`Invoice ${invoice.id} added to queue. Queue length: ${this.processingQueue.length}`);

    // Start processing if capacity available
    this.processQueue();

    return invoice;
  }

  /**
   * Process queue items
   */
  async processQueue() {
    while (
      this.processingQueue.length > 0 &&
      this.activeProcessing < config.processing.maxConcurrent
    ) {
      const invoiceId = this.processingQueue.shift();
      this.processInvoice(invoiceId).catch(err => {
        logger.error(`Queue processing error: ${err.message}`);
      });
    }
  }

  /**
   * Process a single invoice
   */
  async processInvoice(invoiceId) {
    this.activeProcessing++;
    const startTime = Date.now();

    try {
      const invoice = await Invoice.findByPk(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      // Update status to processing
      await invoice.update({
        status: 'processing',
        processingStartedAt: new Date()
      });

      logger.info(`Processing invoice ${invoiceId}`);

      // Step 1: Process document
      const documentData = await documentService.processDocument(invoice.filePath);

      // Step 2: Extract data using ChatGPT
      const extractedData = await this.extractWithRetry(documentData, invoice);

      // Step 3: Validate extracted data
      const validationResult = validationService.validateInvoice(extractedData);

      // Step 4: Update invoice with extracted data
      await this.updateInvoiceWithExtraction(invoice, extractedData, validationResult);

      // Step 5: Calculate processing time
      invoice.processingTimeMs = Date.now() - startTime;
      invoice.processingCompletedAt = new Date();

      // Step 6: Determine final status
      const finalStatus = validationResult.errors.length > 0 ? 'review_required' : 'completed';
      invoice.status = finalStatus;

      // Save all extracted data to database
      await invoice.save();

      // Step 7: Send webhook notification
      if (invoice.webhookUrl) {
        await webhookService.sendWebhook(invoice.webhookUrl, {
          event: 'invoice.processed',
          invoiceId: invoice.id,
          status: invoice.status,
          confidenceScore: invoice.confidenceScore,
          processingTimeMs: invoice.processingTimeMs,
        });
        await invoice.update({
          webhookSent: true,
          webhookSentAt: new Date()
        });
      }

      logger.info(`Invoice ${invoiceId} processed successfully in ${invoice.processingTimeMs}ms`);

      return invoice;

    } catch (error) {
      logger.error(`Error processing invoice ${invoiceId}: ${error.message}`);

      // Update invoice with error
      const invoice = await Invoice.findByPk(invoiceId);
      if (invoice) {
        await invoice.update({
          status: 'failed',
          lastError: error.message,
          retryCount: (invoice.retryCount || 0) + 1,
          processingTimeMs: Date.now() - startTime
        });

        // Send failure webhook
        if (invoice.webhookUrl) {
          await webhookService.sendWebhook(invoice.webhookUrl, {
            event: 'invoice.failed',
            invoiceId: invoice.id,
            error: error.message,
          });
        }
      }

      throw error;
    } finally {
      this.activeProcessing--;
      this.processQueue();
    }
  }

  /**
   * Extract with retry logic
   */
  async extractWithRetry(documentData, invoice) {
    let lastError;

    for (let attempt = 1; attempt <= config.processing.retryAttempts; attempt++) {
      try {
        return await extractionService.extractInvoiceData(documentData);
      } catch (error) {
        lastError = error;
        logger.warn(`Extraction attempt ${attempt} failed: ${error.message}`);

        if (attempt < config.processing.retryAttempts) {
          await this.delay(config.processing.retryDelayMs * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Update invoice document with extracted data
   */
  async updateInvoiceWithExtraction(invoice, extractedData, validationResult) {
    // Map extracted fields to invoice
    const fieldMappings = [
      'vendorName', 'vendorAddress', 'vendorEmail', 'vendorPhone',
      'invoiceNumber', 'purchaseOrderNumber',
      'customerName', 'customerAddress',
      'lineItems', 'subtotal', 'taxRate', 'taxAmount',
      'discountAmount', 'shippingAmount', 'totalAmount', 'currency',
      'paymentTerms', 'paymentMethod', 'bankDetails'
    ];

    for (const field of fieldMappings) {
      if (extractedData[field] !== undefined) {
        invoice[field] = extractedData[field];
      }
    }

    // Handle dates specially
    if (extractedData.invoiceDate) {
      invoice.invoiceDate = new Date(extractedData.invoiceDate);
    }
    if (extractedData.dueDate) {
      invoice.dueDate = new Date(extractedData.dueDate);
    }

    // Store raw extraction data
    invoice.rawExtractionData = extractedData;

    // Set validation results
    invoice.validationErrors = validationResult.errors;
    invoice.validationWarnings = validationResult.warnings;
    invoice.isValidated = true;
    invoice.requiresManualReview = validationResult.requiresManualReview;

    // Set anomalies
    if (extractedData.anomalies) {
      invoice.anomalies = extractedData.anomalies;
    }

    // Calculate final confidence score
    const baseConfidence = extractedData.confidenceScore ||
      extractionService.calculateConfidenceScore(extractedData);
    invoice.confidenceScore = validationService.adjustConfidenceScore(
      baseConfidence, validationResult
    );
  }

  /**
   * Batch process multiple invoices
   */
  async processBatch(files, userId, options = {}) {
    const batchId = uuidv4();
    const invoices = [];

    for (const file of files) {
      const invoice = await Invoice.create({
        originalFileName: file.originalname,
        filePath: file.path,
        fileType: file.mimetype.split('/')[1] || 'unknown',
        fileSize: file.size,
        batchId,
        createdBy: userId,
        webhookUrl: options.webhookUrl,
        tags: options.tags,
      });

      invoices.push(invoice);
    }

    // Queue all invoices
    for (const invoice of invoices) {
      await this.queueInvoice(invoice);
    }

    return {
      batchId,
      invoiceCount: invoices.length,
      invoiceIds: invoices.map(inv => inv.id),
    };
  }

  /**
   * Get batch processing status
   */
  async getBatchStatus(batchId) {
    const invoices = await Invoice.findAll({
      where: { batchId },
      attributes: ['id', 'status', 'confidenceScore', 'processingTimeMs']
    });

    return {
      batchId,
      invoices,
      totalCount: invoices.length,
      completedCount: invoices.filter(inv => inv.status === 'completed').length,
      failedCount: invoices.filter(inv => inv.status === 'failed').length,
      pendingCount: invoices.filter(inv => ['pending', 'processing'].includes(inv.status)).length,
    };
  }

  /**
   * Retry failed invoice
   */
  async retryInvoice(invoiceId) {
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'failed') {
      throw new Error('Can only retry failed invoices');
    }

    await invoice.update({
      status: 'pending',
      lastError: null
    });

    await this.queueInvoice(invoice);

    return invoice;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.processingQueue.length,
      activeProcessing: this.activeProcessing,
      maxConcurrent: config.processing.maxConcurrent,
    };
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ProcessingService();
