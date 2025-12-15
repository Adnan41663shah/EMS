import { Inquiry } from '@/types';

/**
 * Escapes a CSV field value by wrapping it in quotes if necessary
 */
const escapeCSVField = (field: string | null | undefined): string => {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Converts an array of inquiries to CSV format
 */
export const convertInquiriesToCSV = (inquiries: Inquiry[]): string => {
  if (inquiries.length === 0) {
    return '';
  }

  // CSV Headers
  const headers = [
    'Name',
    'Email',
    'Phone',
    'City',
    'Education',
    'Course',
    'Location',
    'Medium',
    'Status',
    'Department',
    'Assignment Status',
    'Assigned To',
    'Created By',
    'Created Date',
    'Created Time',
    'Message'
  ];

  // Create CSV rows
  const rows = inquiries.map((inquiry) => {
    return [
      escapeCSVField(inquiry.name),
      escapeCSVField(inquiry.email),
      formatPhoneNumber(inquiry.phone), // Use formatted phone number to prevent scientific notation
      escapeCSVField(inquiry.city),
      escapeCSVField(inquiry.education),
      escapeCSVField(inquiry.course),
      escapeCSVField(inquiry.preferredLocation),
      escapeCSVField(inquiry.medium),
      escapeCSVField(inquiry.status),
      escapeCSVField(inquiry.department),
      escapeCSVField((inquiry as any).assignmentStatus || 'not_assigned'),
      escapeCSVField(inquiry.assignedTo?.name || 'Unassigned'),
      escapeCSVField(inquiry.createdBy?.name || 'Unknown'),
      escapeCSVField(new Date(inquiry.createdAt).toLocaleDateString()),
      escapeCSVField(new Date(inquiry.createdAt).toLocaleTimeString()),
      escapeCSVField(inquiry.message || '')
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
};

/**
 * Formats phone number to prevent Excel from converting it to scientific notation
 * Ensures phone number is always treated as text and formatted correctly
 */
const formatPhoneNumber = (phone: string | number | null | undefined): string => {
  if (phone === null || phone === undefined || phone === '') return '';
  
  // Handle both string and number types
  let phoneStr: string;
  if (typeof phone === 'number') {
    // If it's a number, convert to string without scientific notation
    // For large numbers, use toFixed(0) to avoid scientific notation
    phoneStr = phone.toFixed(0);
  } else {
    phoneStr = String(phone).trim();
    
    // If it's already in scientific notation string format (like "9.19847E+11"), convert it back
    if (phoneStr.includes('E+') || phoneStr.includes('e+') || phoneStr.includes('E-') || phoneStr.includes('e-')) {
      const num = parseFloat(phoneStr);
      if (!isNaN(num)) {
        phoneStr = num.toFixed(0);
      }
    }
  }
  
  // Extract only digits (and + for country codes)
  const digits = phoneStr.replace(/[^\d+]/g, '');
  
  if (!digits || digits.length === 0) return '';
  
  // Format phone numbers with country code and 10 digits
  // Expected format: +[country code][10 digits] or [country code][10 digits]
  let countryCode = '';
  let number = '';
  
  // Check if it starts with +
  if (digits.startsWith('+')) {
    // Format: +[country code][10 digits]
    const withoutPlus = digits.substring(1);
    if (withoutPlus.length >= 10) {
      countryCode = withoutPlus.slice(0, withoutPlus.length - 10);
      number = withoutPlus.slice(withoutPlus.length - 10);
    } else {
      // Less than 10 digits, treat all as number
      number = withoutPlus;
    }
  } else {
    // Format: [country code][10 digits] or just [10 digits]
    if (digits.length === 10) {
      // Just 10 digits, no country code
      number = digits;
    } else if (digits.length > 10 && digits.length <= 13) {
      // Has country code
      countryCode = digits.slice(0, digits.length - 10);
      number = digits.slice(digits.length - 10);
    } else {
      // Other format, return as-is
      number = digits;
    }
  }
  
  // Format the number: country code + space + 5 digits + space + 5 digits
  // The spaces and quotes ensure Excel treats it as text
  if (countryCode && number.length === 10) {
    return `"${countryCode} ${number.slice(0, 5)} ${number.slice(5)}"`;
  } else if (number.length === 10) {
    return `"${number.slice(0, 5)} ${number.slice(5)}"`;
  } else {
    // For other formats, prefix with space and quote to ensure Excel treats as text
    const fullNumber = countryCode ? `${countryCode}${number}` : number;
    return `" ${fullNumber}"`;
  }
};

/**
 * Converts an array of inquiries to CSV format for Sales My Attended Inquiries
 * Excludes: Medium, Department, Assigned To, Assignment Status, Created Time, and Message
 */
export const convertInquiriesToCSVForSales = (inquiries: Inquiry[]): string => {
  if (inquiries.length === 0) {
    return '';
  }

  // CSV Headers (excluding the 6 columns: Medium, Department, Assigned To, Assignment Status, Created Time, Message)
  const headers = [
    'Name',
    'Email',
    'Phone',
    'City',
    'Education',
    'Course',
    'Location',
    'Status',
    'Created By',
    'Created Date'
  ];

  // Create CSV rows
  const rows = inquiries.map((inquiry) => {
    return [
      escapeCSVField(inquiry.name),
      escapeCSVField(inquiry.email),
      formatPhoneNumber(inquiry.phone), // Use formatted phone number
      escapeCSVField(inquiry.city),
      escapeCSVField(inquiry.education),
      escapeCSVField(inquiry.course),
      escapeCSVField(inquiry.preferredLocation),
      escapeCSVField(inquiry.status),
      escapeCSVField(inquiry.createdBy?.name || 'Unknown'),
      escapeCSVField(new Date(inquiry.createdAt).toLocaleDateString())
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
};

/**
 * Converts admitted students data to CSV format
 * Columns: Name, Mobile, Course, Center, Admission Date, Counselor
 */
export const convertAdmittedStudentsToCSV = (students: Array<{
  name: string;
  phone: string;
  course: string;
  center: string;
  admissionDate: string;
  counselor: string;
}>): string => {
  if (students.length === 0) {
    return '';
  }

  // CSV Headers
  const headers = [
    'Name',
    'Mobile',
    'Course',
    'Center',
    'Admission Date',
    'Counselor'
  ];

  // Create CSV rows
  const rows = students.map((student) => {
    return [
      escapeCSVField(student.name),
      formatPhoneNumber(student.phone), // Use formatted phone number
      escapeCSVField(student.course),
      escapeCSVField(student.center),
      escapeCSVField(student.admissionDate),
      escapeCSVField(student.counselor)
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
};

/**
 * Downloads a CSV file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  // Create blob with BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up URL
  URL.revokeObjectURL(url);
};

