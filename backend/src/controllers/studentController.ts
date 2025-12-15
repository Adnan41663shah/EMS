import { Request, Response } from 'express';
import Student, { IStudent } from '../models/Student';
import * as XLSX from 'xlsx';

/* -----------------------------------------
   Excel Column Mapping
------------------------------------------ */
const mapExcelColumnToField = (columnName: string): string | null => {
  const normalized = columnName.toLowerCase().trim();

  const mapping: Record<string, string> = {
    'student name': 'studentName',
    'studentname': 'studentName',
    'name': 'studentName',

    'mobile number': 'mobileNumber',
    'mobile number with country code': 'mobileNumber',
    'mobilenumber': 'mobileNumber',
    'phone': 'mobileNumber',
    'phone number': 'mobileNumber',

    'email': 'email',
    'course': 'course',
    'center': 'center',
    'status': 'status',

    'attended by': 'attendedBy',
    'attendedby': 'attendedBy',
    'attended': 'attendedBy',

    'created by': 'createdBy',
    'createdby': 'createdBy',

    'attended at': 'attendedAt',
    'attendedat': 'attendedAt',

    'notes': 'notes',
    'note': 'notes',
  };

  return mapping[normalized] || null;
};

/* -----------------------------------------
   Normalize Cell Value - Simple: Just convert to string, no conversions
------------------------------------------ */
const normalizeValue = (value: any, field?: string): string => {
  if (value === null || value === undefined || value === '') return '-';
  
  // Convert to string and trim - that's it, no special handling
  return String(value).trim() || '-';
};

/* -----------------------------------------
   IMPORT STUDENTS (FINAL FIX)
------------------------------------------ */
export const importStudents = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded',
      });
    }

    // Read Excel file - simple: just get the values as they are
    const workbook = XLSX.read(req.file.buffer, {
      type: 'buffer',
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get rows data - get values as strings (what Excel displays)
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false, // Get formatted values (what Excel shows)
    });

    if (rows.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Excel must contain header and data',
      });
    }

    const headers = rows[0].map(h => String(h).trim());
    const columnMap: Record<string, number> = {};

    headers.forEach((header, index) => {
      const field = mapExcelColumnToField(header);
      if (field) columnMap[field] = index;
    });

    const students: Partial<IStudent>[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.every(cell => !cell)) continue;

      const student: Partial<IStudent> = {
        studentName: '-',
        mobileNumber: '-',
        email: '-',
        course: '-',
        center: '-',
        status: '-',
        attendedBy: '-',
        createdBy: '-',
        attendedAt: '-',
        notes: '-',
      };

      Object.keys(columnMap).forEach((field) => {
        const index = columnMap[field];
        // Get cell value as-is from Excel
        const cellValue = row[index];
        
        // Store value exactly as it is in Excel (no conversions)
        student[field as keyof IStudent] = normalizeValue(cellValue, field);
      });

      if (student.mobileNumber !== '-') {
        students.push(student);
      }
    }

    if (!students.length) {
      return res.status(400).json({
        success: false,
        message: 'No valid students found',
      });
    }

    await Student.insertMany(students, { ordered: false });

    res.status(200).json({
      success: true,
      message: `Imported ${students.length} students successfully`,
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import students',
    });
  }
};

/* -----------------------------------------
   GET STUDENTS
------------------------------------------ */
export const getStudents = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const search = String(req.query.search || '');
    const skip = (page - 1) * limit;

    const query: any = {};

    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } },
        { center: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
    });
  }
};
