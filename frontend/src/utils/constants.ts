import { UserRole, CourseType, LocationType, MediumType, InquiryStatus, FollowUpType, FollowUpStatus, FollowUpOutcome, SalesLeadStage } from '@/types';

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'presales', label: 'Presales' },
  { value: 'sales', label: 'Sales' },
  { value: 'admin', label: 'Admin' },
];

// Roles available for signup (excluding admin)
export const SIGNUP_ROLES: { value: UserRole; label: string }[] = [
  { value: 'presales', label: 'Presales' },
  { value: 'sales', label: 'Sales' },
];

export const COURSES: { value: CourseType; label: string }[] = [
  { value: 'CDEC', label: 'CDEC' },
  { value: 'X-DSAAI', label: 'X-DSAAI' },
  { value: 'DevOps', label: 'DevOps' },
  { value: 'Full-Stack', label: 'Full-Stack' },
];

export const LOCATIONS: { value: LocationType; label: string }[] = [
  { value: 'Nagpur', label: 'Nagpur' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Nashik', label: 'Nashik' },
  { value: 'Indore', label: 'Indore' },
];

export const MEDIUMS: { value: MediumType; label: string }[] = [
  { value: 'IVR', label: 'IVR' },
  { value: 'Email', label: 'Email' },
  { value: 'WhatsApp', label: 'WhatsApp' },
];

export const INQUIRY_STATUSES: { value: InquiryStatus; label: string; color: string }[] = [
  { value: 'hot', label: 'Hot', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'warm', label: 'Warm', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'cold', label: 'Cold', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'walkin', label: 'Walkin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  { value: 'online_conversion', label: 'Online-Conversion', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
];

// Helper function to get status color
export const getStatusColor = (status: InquiryStatus): string => {
  const statusObj = INQUIRY_STATUSES.find(s => s.value === status);
  return statusObj?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

// Helper function to get status label
export const getStatusLabel = (status: InquiryStatus): string => {
  const statusObj = INQUIRY_STATUSES.find(s => s.value === status);
  return statusObj?.label || status;
};

export const FOLLOW_UP_TYPES: { value: FollowUpType; label: string; icon: string; color: string }[] = [
  { value: 'call', label: 'Call', icon: 'Phone', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'email', label: 'Email', icon: 'Mail', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'MessageSquare', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
];

export const FOLLOW_UP_STATUSES: { value: FollowUpStatus; label: string; color: string; icon: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: 'Calendar' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: 'CheckCircle' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: 'X' },
  { value: 'rescheduled', label: 'Rescheduled', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: 'RefreshCw' },
  { value: 'no_answer', label: 'No Answer', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: 'PhoneOff' },
  { value: 'busy', label: 'Busy', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: 'Clock' },
];

export const FOLLOW_UP_OUTCOMES: { value: FollowUpOutcome; label: string; color: string }[] = [
  { value: 'positive', label: 'Positive', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'neutral', label: 'Neutral', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  { value: 'negative', label: 'Negative', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'interested', label: 'Interested', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'needs_time', label: 'Needs Time', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'requested_info', label: 'Requested Info', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'scheduled_meeting', label: 'Scheduled Meeting', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
];

// Sales Lead Stages and Sub-Stages
export const SALES_LEAD_STAGES: { value: SalesLeadStage; label: string; subStages: string[] }[] = [
  {
    value: 'Cold',
    label: 'Cold',
    subStages: [
      'Closure Timeline is Unknown',
      'Duplicate Enquiry',
      'Switch Off',
      'School Student',
      'Already Enrolled with Other Institute',
      'Financial Issue',
      'Invalid Number',
      'Call Back',
      'Join Later',
      'Planning After 1 Month',
      'Planning After 2 Months',
      'Planning After 5 Months',
      'Planning For Next Year'
    ]
  },
  {
    value: 'Warm',
    label: 'Warm',
    subStages: [
      'Follow-up',
      'In Conversation'
    ]
  },
  {
    value: 'Hot',
    label: 'Hot',
    subStages: [
      'Confirmed Admission'
    ]
  },
  {
    value: 'Not Interested',
    label: 'Not Interested',
    subStages: [
      'Joined Somewhere Else',
      'Dropped The Plan',
      'Financial Issue',
      'Time Constraint'
    ]
  },
  {
    value: 'Walkin',
    label: 'Walkin',
    subStages: [
      'Walked-in to Center',
      'Attended Demo',
      'Not Interested After Demo',
      'Converted After Walk-in',
      'Follow-up Needed After Walk-in'
    ]
  },
  {
    value: 'Online-Conversion',
    label: 'Online-Conversion',
    subStages: [
      'Attended Online Demo',
      'Interested Post Demo',
      'Confirmed Admission',
      'Did Not Respond After Demo',
      'Need Follow-up After Demo'
    ]
  }
];

