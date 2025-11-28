const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const logger = require('../utils/logger');
const config = require('../config');

class DocumentService {
  constructor() {
    this.supportedFormats = ['pdf', 'png', 'jpg', 'jpeg', 'tiff'];
  }

  /**
   * Process a document and extract image/text content for AI analysis
   */
  async processDocument(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);

    if (!this.supportedFormats.includes(ext)) {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    logger.info(`Processing document: ${filePath}`);

    try {
      switch (ext) {
        case 'pdf':
          return await this.processPdf(filePath);
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'tiff':
          return await this.processImage(filePath);
        default:
          throw new Error(`Unsupported format: ${ext}`);
      }
    } catch (error) {
      logger.error(`Error processing document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process PDF document
   */
  async processPdf(filePath) {
    const dataBuffer = await fs.readFile(filePath);

    // Try to extract text first
    const pdfData = await pdfParse(dataBuffer);

    // Check if PDF has extractable text
    const hasText = pdfData.text && pdfData.text.trim().length > 50;

    if (hasText) {
      logger.info('PDF has extractable text');
      return {
        type: 'text',
        content: pdfData.text,
        pageCount: pdfData.numpages,
        metadata: pdfData.info,
      };
    }

    // If no text, it's likely a scanned document - convert to image
    logger.info('PDF appears to be scanned, converting to image');
    return await this.convertPdfToImage(filePath);
  }

  /**
   * Convert PDF to images for processing
   */
  async convertPdfToImage(filePath) {
    // For production, use pdf-poppler or pdf2pic
    // This is a simplified version that returns base64 of PDF for GPT-4V
    const dataBuffer = await fs.readFile(filePath);

    return {
      type: 'pdf',
      content: dataBuffer.toString('base64'),
      mimeType: 'application/pdf',
    };
  }

  /**
   * Process image document
   */
  async processImage(filePath) {
    const imageBuffer = await fs.readFile(filePath);

    // Optimize image for processing
    const optimizedBuffer = await this.optimizeImage(imageBuffer);

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();

    return {
      type: 'image',
      content: optimizedBuffer.toString('base64'),
      mimeType: `image/${metadata.format}`,
      width: metadata.width,
      height: metadata.height,
    };
  }

  /**
   * Optimize image for API processing
   */
  async optimizeImage(imageBuffer) {
    return sharp(imageBuffer)
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .normalize()
      .sharpen()
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  /**
   * Perform OCR on image (fallback method)
   */
  async performOCR(filePath) {
    logger.info('Performing OCR on image');

    const { data: { text, confidence } } = await Tesseract.recognize(
      filePath,
      'eng',
      {
        logger: m => logger.debug(`OCR: ${m.status}`)
      }
    );

    return {
      text,
      confidence: confidence / 100,
    };
  }

  /**
   * Validate file type and size
   */
  validateFile(file) {
    const errors = [];

    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (!config.upload.allowedTypes.includes(ext)) {
      errors.push(`Invalid file type: ${ext}. Allowed types: ${config.upload.allowedTypes.join(', ')}`);
    }

    if (file.size > config.upload.maxFileSize) {
      errors.push(`File too large: ${file.size} bytes. Maximum: ${config.upload.maxFileSize} bytes`);
    }

    return errors;
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info(`Deleted file: ${filePath}`);
    } catch (error) {
      logger.error(`Error deleting file: ${error.message}`);
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(filePath) {
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);

    return {
      path: filePath,
      size: stats.size,
      type: ext,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  }
}

module.exports = new DocumentService();
