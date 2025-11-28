const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

class WebhookService {
  /**
   * Send webhook notification
   */
  async sendWebhook(url, payload) {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(payload, timestamp);

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
        },
        timeout: 10000,
      });

      logger.info(`Webhook sent to ${url}: ${response.status}`);

      return {
        success: true,
        statusCode: response.status,
        timestamp,
      };
    } catch (error) {
      logger.error(`Webhook failed for ${url}: ${error.message}`);

      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Generate webhook signature for verification
   */
  generateSignature(payload, timestamp) {
    const message = `${timestamp}.${JSON.stringify(payload)}`;
    return crypto
      .createHmac('sha256', config.webhook.secret || 'default-secret')
      .update(message)
      .digest('hex');
  }

  /**
   * Verify incoming webhook signature
   */
  verifySignature(payload, signature, timestamp) {
    const expectedSignature = this.generateSignature(payload, timestamp);
    return crypto.timingSafeEquals(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Send batch completion webhook
   */
  async sendBatchCompleteWebhook(url, batchId, summary) {
    return this.sendWebhook(url, {
      event: 'batch.completed',
      batchId,
      summary,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Register webhook endpoint
   */
  async testWebhook(url) {
    return this.sendWebhook(url, {
      event: 'test',
      message: 'Webhook endpoint verification',
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new WebhookService();
