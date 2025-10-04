/**
 * KYC/AML Compliance API Routes - Production-Ready Compliance Endpoints
 * 
 * This module provides comprehensive KYC/AML compliance API endpoints
 * for regulatory compliance and risk management.
 */

const express = require('express');
const { kycAmlCompliance } = require('../lib/kycAmlCompliance');
const { authenticateToken, requireRole } = require('../lib/auth');
const { logger } = require('../lib/logging');
const { rateLimitByUser } = require('../lib/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply rate limiting
router.use(rateLimitByUser(50, 3600000)); // 50 requests per hour per user

/**
 * POST /api/kyc-aml/validate-document
 * Validate KYC document
 */
router.post('/validate-document', [
  body('type').isIn(['passport', 'drivers_license', 'national_id']).withMessage('Invalid document type'),
  body('number').isLength({ min: 6, max: 20 }).withMessage('Invalid document number'),
  body('issueDate').isISO8601().withMessage('Invalid issue date'),
  body('expiryDate').isISO8601().withMessage('Invalid expiry date'),
  body('userInfo.firstName').isLength({ min: 2, max: 50 }).withMessage('Invalid first name'),
  body('userInfo.lastName').isLength({ min: 2, max: 50 }).withMessage('Invalid last name'),
  body('userInfo.dateOfBirth').isISO8601().withMessage('Invalid date of birth'),
  body('userInfo.country').isLength({ min: 2, max: 3 }).withMessage('Invalid country code')
], async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const document = req.body;

    logger.info(`KYC document validation requested by user ${userId}`, {
      documentType: document.type,
      country: document.userInfo.country
    });

    const validation = await kycAmlCompliance.validateKYCDocument(document);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Document validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
        riskScore: validation.riskScore
      });
    }

    // Save validation result
    await kycAmlCompliance.saveDocumentValidation(userId, document, validation);

    res.json({
      success: true,
      message: 'Document validation successful',
      data: {
        validationId: validation.id,
        riskScore: validation.riskScore,
        warnings: validation.warnings,
        nextSteps: validation.nextSteps || []
      }
    });
  } catch (error) {
    logger.error('KYC document validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/kyc-aml/monitor-transaction
 * Monitor transaction for AML compliance
 */
router.post('/monitor-transaction', [
  body('transactionId').isUUID().withMessage('Invalid transaction ID'),
  body('amount').isFloat({ min: 0 }).withMessage('Invalid amount'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Invalid currency'),
  body('type').isIn(['buy', 'sell', 'transfer', 'withdrawal', 'deposit']).withMessage('Invalid transaction type'),
  body('sourceCountry').isLength({ min: 2, max: 3 }).withMessage('Invalid source country'),
  body('destinationCountry').isLength({ min: 2, max: 3 }).withMessage('Invalid destination country')
], async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const transaction = {
      ...req.body,
      userId,
      timestamp: new Date().toISOString()
    };

    logger.info(`AML transaction monitoring requested by user ${userId}`, {
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      type: transaction.type
    });

    const monitoring = await kycAmlCompliance.monitorTransaction(transaction);

    if (monitoring.isSuspicious) {
      logger.warn(`Suspicious transaction detected: ${transaction.transactionId}`, {
        riskScore: monitoring.riskScore,
        flags: monitoring.flags
      });
    }

    res.json({
      success: true,
      message: 'Transaction monitoring completed',
      data: {
        isSuspicious: monitoring.isSuspicious,
        riskScore: monitoring.riskScore,
        flags: monitoring.flags,
        requiresReview: monitoring.requiresReview,
        recommendations: monitoring.recommendations,
        status: monitoring.isSuspicious ? 'flagged' : 'approved'
      }
    });
  } catch (error) {
    logger.error('AML transaction monitoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to monitor transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/kyc-aml/risk-assessment/:userId
 * Get risk assessment for user
 */
router.get('/risk-assessment/:userId', [
  requireRole(['admin', 'compliance_officer'])
], async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const assessment = await kycAmlCompliance.getRiskAssessment(userId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Risk assessment not found'
      });
    }

    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    logger.error('Risk assessment retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk assessment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/kyc-aml/assess-risk
 * Perform risk assessment for user
 */
router.post('/assess-risk', [
  requireRole(['admin', 'compliance_officer'])
], [
  body('userId').isUUID().withMessage('Invalid user ID'),
  body('includeTransactionHistory').isBoolean().withMessage('Invalid transaction history flag')
], async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, includeTransactionHistory = true } = req.body;

    logger.info(`Risk assessment requested for user ${userId}`, {
      requestedBy: req.user.id,
      includeTransactionHistory
    });

    let transactionHistory = [];
    if (includeTransactionHistory) {
      transactionHistory = await kycAmlCompliance.getUserTransactionHistory(userId);
    }

    const assessment = await kycAmlCompliance.assessRisk(userId, transactionHistory);

    res.json({
      success: true,
      message: 'Risk assessment completed',
      data: assessment
    });
  } catch (error) {
    logger.error('Risk assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assess risk',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/kyc-aml/suspicious-activities
 * Get suspicious activities (admin only)
 */
router.get('/suspicious-activities', [
  requireRole(['admin', 'compliance_officer'])
], async (req, res) => {
  try {
    const { page = 1, limit = 20, riskLevel, startDate, endDate } = req.query;

    const activities = await kycAmlCompliance.getSuspiciousActivities({
      page: parseInt(page),
      limit: parseInt(limit),
      riskLevel,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: {
        activities: activities.activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: activities.total,
          pages: Math.ceil(activities.total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Suspicious activities retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve suspicious activities',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/kyc-aml/compliance-report
 * Generate compliance report (admin only)
 */
router.post('/compliance-report', [
  requireRole(['admin', 'compliance_officer'])
], [
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').isISO8601().withMessage('Invalid end date'),
  body('reportType').isIn(['kyc', 'aml', 'comprehensive']).withMessage('Invalid report type')
], async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { startDate, endDate, reportType = 'comprehensive' } = req.body;

    logger.info(`Compliance report generation requested`, {
      startDate,
      endDate,
      reportType,
      requestedBy: req.user.id
    });

    const report = await kycAmlCompliance.generateComplianceReport(startDate, endDate);

    res.json({
      success: true,
      message: 'Compliance report generated successfully',
      data: {
        reportId: report.id,
        period: report.period,
        generatedAt: report.generatedAt,
        summary: report.summary,
        details: report.details
      }
    });
  } catch (error) {
    logger.error('Compliance report generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/kyc-aml/compliance-status
 * Get compliance status for user
 */
router.get('/compliance-status', async (req, res) => {
  try {
    const userId = req.user.id;

    const status = await kycAmlCompliance.getComplianceStatus(userId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Compliance status retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/kyc-aml/update-compliance-status
 * Update compliance status (admin only)
 */
router.post('/update-compliance-status', [
  requireRole(['admin', 'compliance_officer'])
], [
  body('userId').isUUID().withMessage('Invalid user ID'),
  body('status').isIn(['pending', 'approved', 'rejected', 'requires_review']).withMessage('Invalid status'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long')
], async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, status, reason } = req.body;

    logger.info(`Compliance status update requested`, {
      userId,
      status,
      reason,
      updatedBy: req.user.id
    });

    await kycAmlCompliance.updateComplianceStatus(userId, status, reason, req.user.id);

    res.json({
      success: true,
      message: 'Compliance status updated successfully'
    });
  } catch (error) {
    logger.error('Compliance status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update compliance status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/kyc-aml/audit-trail/:userId
 * Get audit trail for user (admin only)
 */
router.get('/audit-trail/:userId', [
  requireRole(['admin', 'compliance_officer'])
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    const auditTrail = await kycAmlCompliance.getAuditTrail({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: {
        auditTrail: auditTrail.activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: auditTrail.total,
          pages: Math.ceil(auditTrail.total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Audit trail retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit trail',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

