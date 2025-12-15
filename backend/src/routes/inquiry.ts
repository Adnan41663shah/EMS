import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  assignInquiry,
  addFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getMyFollowUps,
  getDashboardStats,
  claimInquiry,
  forwardInquiryToSales,
  reassignInquiryToPresales,
  reassignInquiryToSales,
  getUnattendedInquiryCounts,
  checkPhoneExists,
  moveToUnattended
} from '../controllers/inquiryController';
import { authenticate, authorize } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import OptionSettings from '../models/OptionSettings';

const router = Router();

// Create inquiry validation
const createInquiryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value || value.trim() === '') {
        return true; // Empty email is allowed
      }
      // Validate email format if provided
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Please provide a valid email');
      }
      return true;
    })
    .normalizeEmail(),
  body('phone')
    .trim()
    .custom((value) => {
      // Phone number should start with + and contain country code + 10 digits
      // Format: +[country code][10 digits] (e.g., +911234567890)
      if (!value || typeof value !== 'string') {
        throw new Error('Phone number is required');
      }
      // Check if phone starts with + and has at least 11 characters (e.g., +911234567890)
      if (!value.startsWith('+')) {
        throw new Error('Phone number must include country code (e.g., +91)');
      }
      // Remove + and check if remaining is numeric and has at least 10 digits
      const phoneWithoutPlus = value.substring(1);
      if (!/^[0-9]{10,}$/.test(phoneWithoutPlus)) {
        throw new Error('Please provide a valid phone number with country code (e.g., +911234567890)');
      }
      return true;
    })
    .withMessage('Please provide a valid phone number with country code'),
  body('city')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('City must be between 2 and 30 characters'),
  body('education')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Education must be between 2 and 100 characters'),
  body('course')
    .trim()
    .custom(async (val) => {
      if (!val || typeof val !== 'string') {
        throw new Error('Course selection is required');
      }
      try {
        const o = await OptionSettings.findOne({ key: 'global' });
        if (!o) {
          throw new Error('System configuration not found. Please contact administrator.');
        }
        if (!o.courses || !Array.isArray(o.courses) || !o.courses.includes(val)) {
          throw new Error(`Invalid course selection. Allowed courses: ${o.courses?.join(', ') || 'none'}`);
        }
        return true;
      } catch (error: any) {
        if (error.message.includes('Invalid course') || error.message.includes('System configuration')) {
          throw error;
        }
        throw new Error('Error validating course selection');
      }
    }),
  body('preferredLocation')
    .trim()
    .custom(async (val) => {
      if (!val || typeof val !== 'string') {
        throw new Error('Preferred location is required');
      }
      try {
        const o = await OptionSettings.findOne({ key: 'global' });
        if (!o) {
          throw new Error('System configuration not found. Please contact administrator.');
        }
        if (!o.locations || !Array.isArray(o.locations) || !o.locations.includes(val)) {
          throw new Error(`Invalid preferred location. Allowed locations: ${o.locations?.join(', ') || 'none'}`);
        }
        return true;
      } catch (error: any) {
        if (error.message.includes('Invalid preferred location') || error.message.includes('System configuration')) {
          throw error;
        }
        throw new Error('Error validating preferred location');
      }
    }),
  body('medium')
    .isIn(['IVR', 'Email', 'WhatsApp'])
    .withMessage('Invalid medium'),
  body('message')
    .optional()
    .trim()
    .isLength({ min: 0, max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
  body('status')
    .optional()
    .trim()
    .custom(async (val) => {
      if (!val) return true;
      try {
        const o = await OptionSettings.findOne({ key: 'global' });
        if (!o) {
          throw new Error('System configuration not found. Please contact administrator.');
        }
        if (!o.statuses || !Array.isArray(o.statuses) || !o.statuses.includes(val)) {
          throw new Error(`Invalid status. Allowed statuses: ${o.statuses?.join(', ') || 'none'}`);
        }
        return true;
      } catch (error: any) {
        if (error.message.includes('Invalid status') || error.message.includes('System configuration')) {
          throw error;
        }
        throw new Error('Error validating status');
      }
    })
];

// Update inquiry validation
const updateInquiryValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true; // Optional field
      // Phone number should start with + and contain country code + 10 digits
      // Format: +[country code][10 digits] (e.g., +911234567890)
      if (!value.startsWith('+')) {
        throw new Error('Phone number must include country code (e.g., +91)');
      }
      // Remove + and check if remaining is numeric and has at least 10 digits
      const phoneWithoutPlus = value.substring(1);
      if (!/^[0-9]{10,}$/.test(phoneWithoutPlus)) {
        throw new Error('Please provide a valid phone number with country code (e.g., +911234567890)');
      }
      return true;
    })
    .withMessage('Please provide a valid phone number with country code'),
  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('City must be between 2 and 30 characters'),
  body('education')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Education must be between 2 and 100 characters'),
  body('course')
    .optional()
    .trim()
    .custom(async (val) => {
      if (!val) return true;
      try {
        const o = await OptionSettings.findOne({ key: 'global' });
        if (!o) {
          throw new Error('System configuration not found. Please contact administrator.');
        }
        if (!o.courses || !Array.isArray(o.courses) || !o.courses.includes(val)) {
          throw new Error(`Invalid course selection. Allowed courses: ${o.courses?.join(', ') || 'none'}`);
        }
        return true;
      } catch (error: any) {
        if (error.message.includes('Invalid course') || error.message.includes('System configuration')) {
          throw error;
        }
        throw new Error('Error validating course selection');
      }
    }),
  body('preferredLocation')
    .optional()
    .trim()
    .custom(async (val) => {
      if (!val) return true;
      try {
        const o = await OptionSettings.findOne({ key: 'global' });
        if (!o) {
          throw new Error('System configuration not found. Please contact administrator.');
        }
        if (!o.locations || !Array.isArray(o.locations) || !o.locations.includes(val)) {
          throw new Error(`Invalid preferred location. Allowed locations: ${o.locations?.join(', ') || 'none'}`);
        }
        return true;
      } catch (error: any) {
        if (error.message.includes('Invalid preferred location') || error.message.includes('System configuration')) {
          throw error;
        }
        throw new Error('Error validating preferred location');
      }
    }),
  body('medium')
    .optional()
    .isIn(['IVR', 'Email', 'WhatsApp'])
    .withMessage('Invalid medium'),
  body('message')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  body('status')
    .optional()
    .trim()
    .custom(async (val) => {
      if (!val) return true;
      try {
        const o = await OptionSettings.findOne({ key: 'global' });
        if (!o) {
          throw new Error('System configuration not found. Please contact administrator.');
        }
        if (!o.statuses || !Array.isArray(o.statuses) || !o.statuses.includes(val)) {
          throw new Error(`Invalid status. Allowed statuses: ${o.statuses?.join(', ') || 'none'}`);
        }
        return true;
      } catch (error: any) {
        if (error.message.includes('Invalid status') || error.message.includes('System configuration')) {
          throw error;
        }
        throw new Error('Error validating status');
      }
    })
];

// Reassign validation
const reassignValidation = [
  body('targetUserId')
    .isMongoId()
    .withMessage('Invalid target user ID')
];

// Assign inquiry validation
const assignInquiryValidation = [
  body('assignedTo')
    .isMongoId()
    .withMessage('Invalid user ID')
];

// Add follow-up validation
const addFollowUpValidation = [
  body('type')
    .optional()
    .isIn(['call', 'email', 'whatsapp'])
    .withMessage('Invalid follow-up type'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('nextFollowUpDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid next follow-up date'),
  body('inquiryStatus')
    .optional()
    .isIn(['hot', 'warm', 'cold'])
    .withMessage('Invalid inquiry status'),
  // Sales-specific fields
  body('leadStage')
    .optional()
    .isIn(['Cold', 'Warm', 'Hot', 'Not Interested', 'Walkin', 'Online-Conversion'])
    .withMessage('Invalid lead stage'),
  body('subStage')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      if (!value || value.trim() === '') {
        return true; // Empty subStage is allowed
      }
      if (value.length < 1 || value.length > 200) {
        throw new Error('Sub-stage must be between 1 and 200 characters');
      }
      return true;
    }),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned user ID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

// Update follow-up validation (same as add but all optional)
const updateFollowUpValidation = [
  body('type')
    .optional()
    .isIn(['call', 'email', 'whatsapp'])
    .withMessage('Invalid follow-up type'),
  body('status')
    .optional()
    .isIn(['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_answer', 'busy'])
    .withMessage('Invalid follow-up status'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('completedDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid completed date'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be between 1 and 1440 minutes'),
  body('outcome')
    .optional()
    .isIn(['positive', 'neutral', 'negative', 'interested', 'not_interested', 'needs_time', 'requested_info', 'scheduled_meeting'])
    .withMessage('Invalid outcome'),
  body('nextFollowUpDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid next follow-up date'),
  body('inquiryStatus')
    .optional()
    .isIn(['hot', 'warm', 'cold'])
    .withMessage('Invalid inquiry status'),
  // Sales-specific fields
  body('leadStage')
    .optional()
    .isIn(['Cold', 'Warm', 'Hot', 'Not Interested', 'Walkin', 'Online-Conversion'])
    .withMessage('Invalid lead stage'),
  body('subStage')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      if (!value || value.trim() === '') {
        return true; // Empty subStage is allowed
      }
      if (value.length < 1 || value.length > 200) {
        throw new Error('Sub-stage must be between 1 and 200 characters');
      }
      return true;
    }),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned user ID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

// Follow-up ID validation
const followUpIdValidation = [
  param('followUpId')
    .isMongoId()
    .withMessage('Invalid follow-up ID')
];

// ID validation
const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid inquiry ID')
];

// Routes
router.post('/', authenticate, createInquiryValidation, handleValidationErrors, createInquiry);
router.get('/check-phone', authenticate, checkPhoneExists);
router.get('/', authenticate, getInquiries);
router.get('/dashboard', authenticate, getDashboardStats);
router.get('/unattended-counts', authenticate, getUnattendedInquiryCounts);
router.get('/my-follow-ups', authenticate, getMyFollowUps);
router.get('/:id', authenticate, idValidation, handleValidationErrors, getInquiryById);
router.put('/:id', authenticate, idValidation, updateInquiryValidation, handleValidationErrors, updateInquiry);
router.delete('/:id', authenticate, idValidation, handleValidationErrors, deleteInquiry);
router.post('/:id/assign', authenticate, authorize('presales', 'admin'), idValidation, assignInquiryValidation, handleValidationErrors, assignInquiry);
router.post('/:id/claim', authenticate, authorize('presales', 'sales', 'admin'), idValidation, handleValidationErrors, claimInquiry);
router.post('/:id/move-to-unattended', authenticate, authorize('presales', 'sales', 'admin'), idValidation, handleValidationErrors, moveToUnattended);
router.post('/:id/forward-to-sales', authenticate, authorize('presales', 'admin'), idValidation, handleValidationErrors, forwardInquiryToSales);
router.post('/:id/reassign', authenticate, authorize('presales', 'admin'), idValidation, reassignValidation, handleValidationErrors, reassignInquiryToPresales);
router.post('/:id/reassign-sales', authenticate, authorize('sales', 'admin'), idValidation, reassignValidation, handleValidationErrors, reassignInquiryToSales);
router.post('/:id/follow-up', authenticate, idValidation, addFollowUpValidation, handleValidationErrors, addFollowUp);
router.put('/:id/follow-up/:followUpId', authenticate, idValidation, followUpIdValidation, updateFollowUpValidation, handleValidationErrors, updateFollowUp);
router.delete('/:id/follow-up/:followUpId', authenticate, idValidation, followUpIdValidation, handleValidationErrors, deleteFollowUp);

export default router;
