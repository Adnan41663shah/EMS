import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// Create user validation
const createUserValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value || value.trim() === '') return true;
      return /^[0-9]{10}$/.test(value);
    })
    .withMessage('Please provide a valid 10-digit phone number'),
  body('role')
    .isIn(['user', 'presales', 'sales', 'admin'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Update user validation
const updateUserValidation = [
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
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value || value.trim() === '') return true;
      return /^[0-9]{10}$/.test(value);
    })
    .withMessage('Please provide a valid 10-digit phone number'),
  body('role')
    .optional()
    .isIn(['user', 'presales', 'sales', 'admin'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// ID validation
const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID')
];

// Routes
router.get('/', authenticate, authorize('admin', 'presales', 'sales'), getAllUsers);
router.get('/:id', authenticate, authorize('admin'), idValidation, handleValidationErrors, getUserById);
router.post('/', authenticate, authorize('admin'), createUserValidation, handleValidationErrors, createUser);
router.put('/:id', authenticate, authorize('admin'), idValidation, updateUserValidation, handleValidationErrors, updateUser);
router.delete('/:id', authenticate, authorize('admin'), idValidation, handleValidationErrors, deleteUser);
router.patch('/:id/toggle-status', authenticate, authorize('admin'), idValidation, handleValidationErrors, toggleUserStatus);

export default router;
