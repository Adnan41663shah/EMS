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

    const students: Array<Partial<IStudent> & { _rowIndex?: number }> = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.every(cell => !cell)) continue;

      const student: Partial<IStudent> & { _rowIndex?: number } = {
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
        _rowIndex: i + 1, // Store row number (1-indexed, +1 for header row)
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

    // Check for duplicates and filter them out
    const existingMobileNumbers = await Student.find({
      mobileNumber: { $in: students.map(s => s.mobileNumber).filter(m => m !== '-') }
    }).select('mobileNumber').lean();

    const existingMobiles = new Set(existingMobileNumbers.map(s => s.mobileNumber).filter((m): m is string => m !== undefined && m !== '-'));
    const newStudents = students.filter(s => {
      const mobile = s.mobileNumber;
      // Keep if mobile is '-' or undefined (these are not duplicates)
      if (mobile === '-' || !mobile) return true;
      // Check if mobile exists in the set of existing mobiles
      return !existingMobiles.has(mobile);
    });
    const duplicatesCount = students.length - newStudents.length;
    
    // Remove _rowIndex before bulk insert attempt
    const studentsToInsert = newStudents.map(({ _rowIndex, ...student }) => student);

    if (!newStudents.length) {
      return res.status(400).json({
        success: false,
        message: `All ${students.length} students already exist in the database (duplicate mobile numbers)`,
        data: {
          imported: 0,
          duplicates: duplicatesCount,
          total: students.length,
        },
      });
    }

    let importedCount = 0;
    let errors: string[] = [];

    try {
      // Try to insert all at once first
      await Student.insertMany(studentsToInsert, { ordered: false });
      importedCount = newStudents.length;
    } catch (error: any) {
      // If bulk insert fails, try inserting one by one to get detailed errors
      console.warn('Bulk insert failed, trying individual inserts:', error.message);
      
      for (const student of newStudents) {
        try {
          // Remove _rowIndex before inserting
          const { _rowIndex, ...studentData } = student;
          await Student.create(studentData);
          importedCount++;
        } catch (err: any) {
          const rowNum = student._rowIndex || 'unknown';
          const errorMsg = `Row ${rowNum}: ${err.message || 'Failed to insert'}`;
          errors.push(errorMsg);
          console.error('Failed to insert student:', errorMsg);
        }
      }
    }

    const responseMessage = duplicatesCount > 0
      ? `Imported ${importedCount} students. ${duplicatesCount} duplicates skipped.`
      : `Imported ${importedCount} students successfully`;

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        imported: importedCount,
        duplicates: duplicatesCount,
        total: students.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to import students',
      data: {
        imported: 0,
      },
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
