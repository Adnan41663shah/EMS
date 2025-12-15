import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { importStudents, getStudents } from '../controllers/studentController';

const router = express.Router();

// Configure multer for file uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) and CSV files are allowed.'));
    }
  },
});

// All routes require authentication and admin role
router.use(authenticate);

// Check admin role middleware
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.user && (req.user as any).role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }
  next();
};

router.use(requireAdmin);

// Import students from Excel
router.post('/import', upload.single('file'), importStudents);

// Get all students with pagination
router.get('/', getStudents);


export default router;

