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
      escapeCSVField(inquiry.phone),
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
 * Ensures phone number is always treated as text
 */
const formatPhoneNumber = (phone: string | number | null | undefined): string => {
  if (phone === null || phone === undefined) return '';
  
  // Handle both string and number types
  let phoneStr: string;
  if (typeof phone === 'number') {
    // If it's a number, convert to string without scientific notation
    // For large numbers, use toFixed(0) to avoid scientific notation
    phoneStr = phone.toFixed(0);
  } else {
    phoneStr = String(phone);
    
    // If it's already in scientific notation string format, convert it back
    if (phoneStr.includes('E+') || phoneStr.includes('e+') || phoneStr.includes('E-') || phoneStr.includes('e-')) {
      const num = parseFloat(phoneStr);
      phoneStr = num.toFixed(0);
    }
  }
  
  // Extract only digits (and + for country codes)
  const digits = phoneStr.replace(/[^\d+]/g, '');
  
  // Format Indian phone numbers (10 digits) or with country code
  if (digits.length === 10) {
    // Format as: 12345 67890 (with space to ensure Excel treats as text)
    return `"${digits.slice(0, 5)} ${digits.slice(5)}"`;
  } else if (digits.length > 10 && digits.length <= 13) {
    // Format with country code: 91 12345 67890
    const countryCode = digits.slice(0, digits.length - 10);
    const number = digits.slice(digits.length - 10);
    return `"${countryCode} ${number.slice(0, 5)} ${number.slice(5)}"`;
  }
  
  // For other formats, return as-is but ensure it's quoted with a space prefix
  // The space ensures Excel treats it as text
  return `" ${digits}"`;
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

