export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'user' | 'presales' | 'sales' | 'admin';

export interface Inquiry {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  education: string;
  course: CourseType;
  preferredLocation: LocationType;
  medium: MediumType;
  message: string;
  status: InquiryStatus;
  assignmentStatus: AssignmentStatus;
  department: DepartmentType;
  assignedTo?: User;
  forwardedBy?: User;
  followUps: FollowUp[];
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export type CourseType = 'CDEC' | 'X-DSAAI' | 'DevOps' | 'Full-Stack' | 'Any';
export type LocationType = 'Nagpur' | 'Pune' | 'Nashik' | 'Indore';
export type MediumType = 'IVR' | 'Email' | 'WhatsApp';
export type InquiryStatus = 'hot' | 'warm' | 'cold' | 'walkin' | 'not_interested' | 'online_conversion';
export type AssignmentStatus = 'not_assigned' | 'assigned' | 'reassigned' | 'forwarded_to_sales';
export type DepartmentType = 'presales' | 'sales';

export type FollowUpType = 'call' | 'email' | 'whatsapp';

export type FollowUpStatus = 'completed' | 'cancelled' | 'rescheduled' | 'no_answer' | 'busy';

export type FollowUpOutcome = 'positive' | 'neutral' | 'negative' | 'interested' | 'not_interested' | 'needs_time' | 'requested_info' | 'scheduled_meeting';

export type FollowUpPriority = 'low' | 'medium' | 'high';

export interface FollowUp {
  _id: string;
  type: FollowUpType;
  status: FollowUpStatus;
  title?: string; // Optional for sales follow-ups
  completedDate?: string;
  duration?: number;
  outcome?: FollowUpOutcome;
  nextFollowUpDate?: string;
  inquiryStatus?: InquiryStatus;
  message?: string; // Optional message field
  // Sales-specific fields
  leadStage?: SalesLeadStage;
  subStage?: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export type SalesLeadStage = 'Cold' | 'Warm' | 'Hot' | 'Not Interested' | 'Walkin' | 'Online-Conversion';


export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface InquiryFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: InquiryStatus;
  course?: CourseType;
  location?: LocationType;
  medium?: MediumType;
  assignedTo?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface DashboardStats {
  totalInquiries: number;
  hotInquiries: number;
  warmInquiries: number;
  coldInquiries: number;
  myInquiries: number;
  assignedInquiries: number;
  recentInquiries: Inquiry[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  roles?: UserRole[];
  badge?: number;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'date';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    required?: string;
    minLength?: { value: number; message: string };
    pattern?: { value: RegExp; message: string };
  };
}
