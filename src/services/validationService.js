const logger = require('../utils/logger');

class ValidationService {
  /**
   * Perform comprehensive validation on extracted invoice data
   */
  validateInvoice(invoice) {
    const errors = [];
    const warnings = [];

    // Required field validation
    this.validateRequiredFields(invoice, errors);

    // Mathematical validation
    this.validateCalculations(invoice, errors, warnings);

    // Format validation
    this.validateFormats(invoice, errors, warnings);

    // Business rules validation
    this.validateBusinessRules(invoice, errors, warnings);

    // Anomaly detection
    this.detectAnomalies(invoice, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiresManualReview: errors.length > 0 || warnings.length > 2,
    };
  }

  /**
   * Validate required fields
   */
  validateRequiredFields(invoice, errors) {
    const required = {
      vendorName: 'Vendor name',
      invoiceNumber: 'Invoice number',
      invoiceDate: 'Invoice date',
      totalAmount: 'Total amount',
    };

    for (const [field, label] of Object.entries(required)) {
      if (!invoice[field] && invoice[field] !== 0) {
        errors.push(`${label} is required`);
      }
    }

    // At least one line item or total amount
    if ((!invoice.lineItems || invoice.lineItems.length === 0) && !invoice.totalAmount) {
      errors.push('Invoice must have line items or a total amount');
    }
  }

  /**
   * Validate mathematical calculations
   */
  validateCalculations(invoice, errors, warnings) {
    if (!invoice.lineItems || invoice.lineItems.length === 0) return;

    // Validate each line item
    for (let i = 0; i < invoice.lineItems.length; i++) {
      const item = invoice.lineItems[i];

      if (item.quantity && item.unitPrice && item.amount) {
        const expected = Math.round(item.quantity * item.unitPrice * 100) / 100;
        const actual = Math.round(item.amount * 100) / 100;

        if (Math.abs(expected - actual) > 0.01) {
          errors.push(
            `Line item ${i + 1} calculation error: ${item.quantity} × ${item.unitPrice} = ${expected}, but got ${actual}`
          );
        }
      }

      // Validate positive values
      if (item.quantity <= 0) {
        warnings.push(`Line item ${i + 1} has non-positive quantity: ${item.quantity}`);
      }
      if (item.unitPrice < 0) {
        warnings.push(`Line item ${i + 1} has negative unit price: ${item.unitPrice}`);
      }
    }

    // Calculate subtotal
    const calculatedSubtotal = invoice.lineItems.reduce(
      (sum, item) => sum + (item.amount || 0), 0
    );

    // Validate subtotal
    if (invoice.subtotal) {
      const subtotalDiff = Math.abs(invoice.subtotal - calculatedSubtotal);
      if (subtotalDiff > 0.01) {
        if (subtotalDiff / calculatedSubtotal > 0.05) {
          errors.push(
            `Subtotal mismatch: extracted ${invoice.subtotal}, calculated ${calculatedSubtotal.toFixed(2)}`
          );
        } else {
          warnings.push(
            `Minor subtotal discrepancy: ${invoice.subtotal} vs ${calculatedSubtotal.toFixed(2)}`
          );
        }
      }
    }

    // Validate total
    if (invoice.totalAmount) {
      const subtotal = invoice.subtotal || calculatedSubtotal;
      const expectedTotal = subtotal +
        (invoice.taxAmount || 0) -
        (invoice.discountAmount || 0) +
        (invoice.shippingAmount || 0);

      const totalDiff = Math.abs(invoice.totalAmount - expectedTotal);
      if (totalDiff > 0.01) {
        if (totalDiff / expectedTotal > 0.05) {
          errors.push(
            `Total mismatch: extracted ${invoice.totalAmount}, calculated ${expectedTotal.toFixed(2)}`
          );
        } else {
          warnings.push(
            `Minor total discrepancy: ${invoice.totalAmount} vs ${expectedTotal.toFixed(2)}`
          );
        }
      }
    }

    // Tax calculation validation
    if (invoice.taxRate && invoice.taxAmount && invoice.subtotal) {
      const expectedTax = invoice.subtotal * (invoice.taxRate / 100);
      if (Math.abs(expectedTax - invoice.taxAmount) > 0.01) {
        warnings.push(
          `Tax calculation discrepancy: ${invoice.taxRate}% of ${invoice.subtotal} = ${expectedTax.toFixed(2)}, but got ${invoice.taxAmount}`
        );
      }
    }
  }

  /**
   * Validate data formats
   */
  validateFormats(invoice, errors, warnings) {
    // Date validation
    if (invoice.invoiceDate) {
      const date = new Date(invoice.invoiceDate);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid invoice date format: ${invoice.invoiceDate}`);
      } else {
        // Check for reasonable date range (not too old or in future)
        const now = new Date();
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const oneMonthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (date < oneYearAgo) {
          warnings.push(`Invoice date is more than 1 year old: ${invoice.invoiceDate}`);
        }
        if (date > oneMonthAhead) {
          warnings.push(`Invoice date is in the future: ${invoice.invoiceDate}`);
        }
      }
    }

    if (invoice.dueDate) {
      const date = new Date(invoice.dueDate);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid due date format: ${invoice.dueDate}`);
      }
    }

    // Email validation
    if (invoice.vendorEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(invoice.vendorEmail)) {
        warnings.push(`Invalid vendor email format: ${invoice.vendorEmail}`);
      }
    }

    // Currency validation
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];
    if (invoice.currency && !validCurrencies.includes(invoice.currency)) {
      warnings.push(`Unusual currency code: ${invoice.currency}`);
    }
  }

  /**
   * Validate business rules
   */
  validateBusinessRules(invoice, errors, warnings) {
    // Due date should be after invoice date
    if (invoice.invoiceDate && invoice.dueDate) {
      const invoiceDate = new Date(invoice.invoiceDate);
      const dueDate = new Date(invoice.dueDate);

      if (dueDate < invoiceDate) {
        errors.push('Due date is before invoice date');
      }
    }

    // Discount should not exceed subtotal
    if (invoice.discountAmount && invoice.subtotal) {
      if (invoice.discountAmount > invoice.subtotal) {
        errors.push('Discount amount exceeds subtotal');
      }
      if (invoice.discountAmount / invoice.subtotal > 0.5) {
        warnings.push('Discount is more than 50% of subtotal');
      }
    }

    // Tax rate validation
    if (invoice.taxRate) {
      if (invoice.taxRate < 0 || invoice.taxRate > 50) {
        warnings.push(`Unusual tax rate: ${invoice.taxRate}%`);
      }
    }

    // Total amount validation
    if (invoice.totalAmount) {
      if (invoice.totalAmount <= 0) {
        errors.push('Total amount must be positive');
      }
      if (invoice.totalAmount > 1000000) {
        warnings.push(`Very high invoice amount: ${invoice.totalAmount}`);
      }
    }
  }

  /**
   * Detect potential anomalies
   */
  detectAnomalies(invoice, warnings) {
    // Duplicate detection hints
    if (invoice.invoiceNumber) {
      // This would typically check against database
      // For now, just flag suspicious patterns
      if (/^0+$/.test(invoice.invoiceNumber)) {
        warnings.push('Invoice number appears to be all zeros');
      }
    }

    // Round number detection (might indicate estimated values)
    if (invoice.totalAmount) {
      if (invoice.totalAmount % 100 === 0 && invoice.totalAmount > 1000) {
        warnings.push('Total amount is a round number - may be estimated');
      }
    }

    // Missing tax on high amounts
    if (invoice.totalAmount > 1000 && !invoice.taxAmount && !invoice.taxRate) {
      warnings.push('High invoice amount without tax information');
    }

    // Check for identical quantities across all items
    if (invoice.lineItems && invoice.lineItems.length > 3) {
      const quantities = invoice.lineItems.map(item => item.quantity);
      if (quantities.every(q => q === quantities[0])) {
        warnings.push('All line items have identical quantities');
      }
    }
  }

  /**
   * Calculate confidence adjustments based on validation
   */
  adjustConfidenceScore(baseConfidence, validationResult) {
    let adjustment = 0;

    // Reduce confidence for each error
    adjustment -= validationResult.errors.length * 0.1;

    // Slightly reduce for warnings
    adjustment -= validationResult.warnings.length * 0.02;

    // Ensure score stays in valid range
    const adjustedScore = Math.max(0, Math.min(1, baseConfidence + adjustment));

    return adjustedScore;
  }

  /**
   * Cross-validate with external data (placeholder for integration)
   */
  async crossValidate(invoice, externalData = {}) {
    const results = [];

    // Vendor name validation
    if (externalData.knownVendors && invoice.vendorName) {
      const isKnown = externalData.knownVendors.some(
        v => v.toLowerCase() === invoice.vendorName.toLowerCase()
      );
      results.push({
        field: 'vendorName',
        valid: isKnown,
        message: isKnown ? 'Known vendor' : 'New vendor',
      });
    }

    // Duplicate invoice check
    if (externalData.existingInvoices && invoice.invoiceNumber) {
      const isDuplicate = externalData.existingInvoices.includes(invoice.invoiceNumber);
      results.push({
        field: 'invoiceNumber',
        valid: !isDuplicate,
        message: isDuplicate ? 'Possible duplicate invoice' : 'Unique invoice number',
      });
    }

    return results;
  }
}

module.exports = new ValidationService();
