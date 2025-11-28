const fs = require('fs').promises;
const path = require('path');
const { Parser } = require('json2csv');
const { Builder } = require('xml2js');
const config = require('../config');
const logger = require('../utils/logger');

class ExportService {
  constructor() {
    this.exportDir = config.export.dir;
  }

  /**
   * Export invoices to specified format
   */
  async exportInvoices(invoices, format, options = {}) {
    const timestamp = Date.now();
    const filename = options.filename || `invoices_${timestamp}`;

    switch (format.toLowerCase()) {
      case 'csv':
        return this.exportToCsv(invoices, filename);
      case 'json':
        return this.exportToJson(invoices, filename);
      case 'xml':
        return this.exportToXml(invoices, filename);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to CSV format
   */
  async exportToCsv(invoices, filename) {
    const fields = [
      'invoiceNumber',
      'vendorName',
      'invoiceDate',
      'dueDate',
      'subtotal',
      'taxAmount',
      'totalAmount',
      'currency',
      'status',
      'confidenceScore',
    ];

    const opts = { fields };
    const parser = new Parser(opts);

    const data = invoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber || '',
      vendorName: inv.vendorName || '',
      invoiceDate: inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : '',
      dueDate: inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : '',
      subtotal: inv.subtotal || 0,
      taxAmount: inv.taxAmount || 0,
      totalAmount: inv.totalAmount || 0,
      currency: inv.currency || 'USD',
      status: inv.status,
      confidenceScore: inv.confidenceScore || 0,
    }));

    const csv = parser.parse(data);
    const filePath = path.join(this.exportDir, `${filename}.csv`);

    await fs.writeFile(filePath, csv);
    logger.info(`Exported ${invoices.length} invoices to CSV: ${filePath}`);

    return {
      format: 'csv',
      filePath,
      filename: `${filename}.csv`,
      recordCount: invoices.length,
    };
  }

  /**
   * Export to JSON format
   */
  async exportToJson(invoices, filename) {
    const data = invoices.map(inv => this.formatInvoiceForExport(inv));

    const json = JSON.stringify({
      exportDate: new Date().toISOString(),
      totalInvoices: invoices.length,
      invoices: data,
    }, null, 2);

    const filePath = path.join(this.exportDir, `${filename}.json`);

    await fs.writeFile(filePath, json);
    logger.info(`Exported ${invoices.length} invoices to JSON: ${filePath}`);

    return {
      format: 'json',
      filePath,
      filename: `${filename}.json`,
      recordCount: invoices.length,
    };
  }

  /**
   * Export to XML format
   */
  async exportToXml(invoices, filename) {
    const builder = new Builder({
      rootName: 'invoices',
      headless: false,
    });

    const data = {
      exportDate: new Date().toISOString(),
      invoice: invoices.map(inv => this.formatInvoiceForExport(inv)),
    };

    const xml = builder.buildObject(data);
    const filePath = path.join(this.exportDir, `${filename}.xml`);

    await fs.writeFile(filePath, xml);
    logger.info(`Exported ${invoices.length} invoices to XML: ${filePath}`);

    return {
      format: 'xml',
      filePath,
      filename: `${filename}.xml`,
      recordCount: invoices.length,
    };
  }

  /**
   * Format invoice for export
   */
  formatInvoiceForExport(invoice) {
    return {
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      vendor: {
        name: invoice.vendorName,
        address: invoice.vendorAddress,
        email: invoice.vendorEmail,
        phone: invoice.vendorPhone,
      },
      customer: {
        name: invoice.customerName,
        address: invoice.customerAddress,
      },
      dates: {
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
      },
      lineItems: invoice.lineItems,
      amounts: {
        subtotal: invoice.subtotal,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        discount: invoice.discountAmount,
        shipping: invoice.shippingAmount,
        total: invoice.totalAmount,
        currency: invoice.currency,
      },
      payment: {
        terms: invoice.paymentTerms,
        method: invoice.paymentMethod,
      },
      metadata: {
        status: invoice.status,
        confidenceScore: invoice.confidenceScore,
        processingTimeMs: invoice.processingTimeMs,
        createdAt: invoice.createdAt,
      },
    };
  }

  /**
   * Export for QuickBooks integration
   */
  async exportForQuickBooks(invoices) {
    const data = invoices.map(inv => ({
      InvoiceNumber: inv.invoiceNumber,
      CustomerName: inv.customerName || inv.vendorName,
      InvoiceDate: inv.invoiceDate,
      DueDate: inv.dueDate,
      Amount: inv.totalAmount,
      Tax: inv.taxAmount,
      Items: inv.lineItems.map(item => ({
        Description: item.description,
        Quantity: item.quantity,
        Rate: item.unitPrice,
        Amount: item.amount,
      })),
    }));

    const filename = `quickbooks_${Date.now()}`;
    return this.exportToJson(data, filename);
  }

  /**
   * Export for Xero integration
   */
  async exportForXero(invoices) {
    const data = invoices.map(inv => ({
      Type: 'ACCREC',
      Contact: { Name: inv.vendorName },
      Date: inv.invoiceDate,
      DueDate: inv.dueDate,
      InvoiceNumber: inv.invoiceNumber,
      LineItems: inv.lineItems.map(item => ({
        Description: item.description,
        Quantity: item.quantity,
        UnitAmount: item.unitPrice,
        LineAmount: item.amount,
      })),
      Total: inv.totalAmount,
      TotalTax: inv.taxAmount,
    }));

    const filename = `xero_${Date.now()}`;
    return this.exportToJson(data, filename);
  }

  /**
   * Get export file
   */
  async getExportFile(filename) {
    const filePath = path.join(this.exportDir, filename);
    const content = await fs.readFile(filePath);
    return content;
  }

  /**
   * Delete export file
   */
  async deleteExportFile(filename) {
    const filePath = path.join(this.exportDir, filename);
    await fs.unlink(filePath);
    logger.info(`Deleted export file: ${filename}`);
  }

  /**
   * List export files
   */
  async listExports() {
    const files = await fs.readdir(this.exportDir);
    const exports = [];

    for (const file of files) {
      const filePath = path.join(this.exportDir, file);
      const stats = await fs.stat(filePath);
      exports.push({
        filename: file,
        size: stats.size,
        created: stats.birthtime,
      });
    }

    return exports;
  }
}

module.exports = new ExportService();
