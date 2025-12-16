import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { 
  ArrowLeft, 
  User as UserIcon, 
  Mail, 
  Phone,
  MapPin, 
  BookOpen, 
  Building, 
  MessageSquare, 
  Thermometer, 
  Clock,
  FileText,
  UserCheck,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiService from '@/services/api';
import { toast } from 'react-toastify';
import { Inquiry, FollowUp, InquiryStatus } from '@/types';
import type { User as AppUser } from '@/types';
import { getStatusColor as getStatusColorHelper } from '@/utils/constants';
import { cn } from '@/utils/cn';
import LoadingSpinner from '@/components/LoadingSpinner';
import FollowUpModal from '@/components/FollowUpModal';
import SalesFollowUpModal from '@/components/SalesFollowUpModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const InquiryDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isSalesFollowUpModalOpen, setIsSalesFollowUpModalOpen] = useState(() => {
    // Initialize from localStorage to persist modal after refresh (only for sales inquiries)
    if (typeof window !== 'undefined' && id) {
      const pendingInquiryId = localStorage.getItem('pendingSalesFollowUp');
      return pendingInquiryId === id;
    }
    return false;
  });
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [salesUsers, setSalesUsers] = useState<AppUser[]>([]);
  const [selectedSales, setSelectedSales] = useState<string>('');
  const [showReassignSalesModal, setShowReassignSalesModal] = useState(false);
  const [reassignSalesSearch, setReassignSalesSearch] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);
  const [showForwardConfirm, setShowForwardConfirm] = useState(false);

  const { data, isLoading, error, refetch } = useQuery(
    ['inquiry', id],
    () => apiService.inquiries.getById(id!),
    {
      enabled: !!id,
    }
  );

  const inquiry: Inquiry | undefined = data?.data?.inquiry;

  const getId = (u: any | undefined | null): string | undefined => {
    if (!u) return undefined;
    // Support both API shapes: { id } and { _id }
    // Handle ObjectId, string, and populated object cases
    if (typeof u === 'string') return u;
    // Try id first (Mongoose virtual), then _id, then $oid (MongoDB extended JSON)
    const id = (u as any).id || (u as any)._id || (u as any).$oid;
    if (!id) return undefined;
    // Handle nested ObjectId format and convert to string
    if (typeof id === 'object' && id.$oid) return String(id.$oid);
    return String(id);
  };

  // Helper to compare two IDs (handles various formats)
  const idsMatch = (id1: any, id2: any): boolean => {
    const str1 = getId(id1);
    const str2 = getId(id2);
    if (!str1 || !str2) return false;
    return str1 === str2;
  };

  // Only assigned Presales user can create/edit follow-ups
  // But only after they have attended the inquiry (assigned to them via Attend button)
  const canAddFollowUp = !!(
    user &&
    user.role === 'presales' &&
    idsMatch(inquiry?.assignedTo, user.id || (user as any)._id) &&
    inquiry?.department === 'presales'
  );

  // Helper to check if the current user has created at least one follow-up
  // Using a function call instead of useMemo to ensure it recalculates on every render
  const checkUserHasCreatedFollowUp = (): boolean => {
    if (!user || !inquiry?.followUps || inquiry.followUps.length === 0) return false;
    
    const userId = String(user.id || (user as any)._id);
    return inquiry.followUps.some((fu: any) => {
      const followUpCreatedById = getId(fu.createdBy);
      // Compare as strings after normalizing
      return followUpCreatedById && String(followUpCreatedById) === userId;
    });
  };

  const userHasCreatedFollowUp = checkUserHasCreatedFollowUp();
  
  // Check if the inquiry has any follow-ups (fallback for when user ID comparison fails)
  const inquiryHasFollowUps = inquiry?.followUps && inquiry.followUps.length > 0;

  // Only assigned Sales user or Admin (for sales inquiries) can create/edit sales follow-ups
  // But only after they have attended the inquiry (created at least one follow-up)
  // Use inquiryHasFollowUps as a fallback if user ID comparison fails
  const canAddSalesFollowUp = !!(
    user &&
    inquiry?.department === 'sales' &&
    idsMatch(inquiry?.assignedTo, user.id || (user as any)._id) &&
    (user.role === 'sales' || user.role === 'admin') &&
    (userHasCreatedFollowUp || inquiryHasFollowUps)
  );

  // Check if user can attend (claim) the inquiry
  // For admin: only allow attending sales inquiries (not presales)
  // Admin can attend sales inquiries even if there's a pending follow-up for another inquiry
  const canAttend = useMemo(() => {
    // Early return if data not loaded
    if (!user || !inquiry) {
      return false;
    }
    
    // Inquiry must not be assigned - use getId helper to check if assignedTo has an ID
    const assignedToId = getId(inquiry.assignedTo);
    if (assignedToId) {
      return false;
    }
    
    // Check role and department match
    const userRole = user.role;
    const inquiryDepartment = inquiry.department;
    
    const isAdminViewingSales = userRole === 'admin' && inquiryDepartment === 'sales';
    const isPresalesViewingPresales = userRole === 'presales' && inquiryDepartment === 'presales';
    const isSalesViewingSales = userRole === 'sales' && inquiryDepartment === 'sales';
    
    const roleDepartmentMatch = isAdminViewingSales || isPresalesViewingPresales || isSalesViewingSales;
    
    if (!roleDepartmentMatch) {
      return false;
    }
    
    // For sales users: Check if there's no pending follow-up for another inquiry
    // Admin can attend sales inquiries even if there's a pending follow-up (more flexibility)
    if (userRole === 'sales') {
      const pendingInquiryId = localStorage.getItem('pendingSalesFollowUp');
      if (pendingInquiryId && pendingInquiryId !== inquiry._id) {
        return false; // There's a pending follow-up for another inquiry
      }
    }
    // Admin can always attend unassigned sales inquiries (no pending follow-up check)
    
    return true;
  }, [user, inquiry, inquiry?.assignedTo, inquiry?.department, inquiry?._id]);

  const handleClaim = async () => {
    if (!inquiry || !id) return;
    
    // For sales users only: Check if there's already a pending follow-up
    // Admin can attend even if there's a pending follow-up for another inquiry
    if (user?.role === 'sales' && inquiry.department === 'sales') {
      const pendingInquiryId = localStorage.getItem('pendingSalesFollowUp');
      if (pendingInquiryId && pendingInquiryId !== id) {
        toast.error('Please complete the follow-up for the previously attended inquiry before attending a new one.');
        return;
      }
    }
    
    try {
      await apiService.inquiries.claim(id);
      toast.success('Inquiry claimed successfully!');
      
      // For sales users and admin (for sales inquiries): Store inquiry ID and follow-up count, then open follow-up modal
      if ((user?.role === 'sales' || user?.role === 'admin') && inquiry.department === 'sales') {
        localStorage.setItem('pendingSalesFollowUp', id);
        // Store the current follow-up count to track if a new follow-up is created
        const currentFollowUpCount = inquiry.followUps ? inquiry.followUps.length : 0;
        localStorage.setItem(`followUpCount_${id}`, currentFollowUpCount.toString());
        setEditingFollowUp(null);
        // Open modal immediately before refetch
        setIsSalesFollowUpModalOpen(true);
      }
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries(['inquiry', id]);
      queryClient.invalidateQueries(['inquiries']);
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['unattended-counts']);
      queryClient.invalidateQueries(['sales-assigned']);
      queryClient.invalidateQueries(['presales-assigned']);
      
      // For sales inquiries, ensure modal stays open after refetch
      if ((user?.role === 'sales' || user?.role === 'admin') && inquiry.department === 'sales') {
        // Refetch the inquiry to get updated data
        await refetch();
        
        // Ensure modal stays open after refetch
        const pendingInquiryId = localStorage.getItem('pendingSalesFollowUp');
        if (pendingInquiryId === id) {
          setIsSalesFollowUpModalOpen(true);
        }
      } else {
        // For non-sales inquiries, just refetch normally
        await refetch();
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to claim inquiry. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleFollowUpSuccess = async () => {
    await refetch();
    setIsFollowUpModalOpen(false);
    setEditingFollowUp(null);
    
    queryClient.invalidateQueries(['inquiry', id]);
    queryClient.invalidateQueries(['inquiries']);
    queryClient.invalidateQueries(['my-follow-ups']);
    queryClient.invalidateQueries(['sales-assigned']);
    queryClient.invalidateQueries(['presales-assigned']);
    
    queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    
    setTimeout(() => {
      queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    }, 1000);
    
    setTimeout(() => {
      queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    }, 2000);
  };

  const handleSalesFollowUpSuccess = async () => {
    // Clear pending follow-up from localStorage when successfully created
    if (id && localStorage.getItem('pendingSalesFollowUp') === id) {
      localStorage.removeItem('pendingSalesFollowUp');
      localStorage.removeItem(`followUpCount_${id}`);
    }
    
    // Close the modal first
    setIsSalesFollowUpModalOpen(false);
    setEditingFollowUp(null);
    
    // Wait a bit to ensure backend has processed the follow-up
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Invalidate all related queries first to force fresh data
    await queryClient.invalidateQueries(['inquiry', id]);
    await queryClient.invalidateQueries(['inquiries']);
    await queryClient.invalidateQueries(['my-follow-ups']);
    await queryClient.invalidateQueries(['sales-assigned']);
    await queryClient.invalidateQueries(['presales-assigned']);
    
    // Refetch the inquiry to get updated data with the new follow-up
    // This is critical for the buttons to appear
    await refetch();
    
    // Refetch sales-assigned queries to update "My Attended Inquiries" page
    await queryClient.refetchQueries(['sales-assigned'], { active: true, exact: false });
    await queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    
    // Additional refetches to ensure data is synced
    setTimeout(async () => {
      await queryClient.invalidateQueries(['inquiry', id]);
      await refetch();
      await queryClient.refetchQueries(['sales-assigned'], { active: true, exact: false });
      await queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    }, 1000);
  };

  // Prevent navigation/refresh when there's a pending follow-up
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const pendingInquiryId = localStorage.getItem('pendingSalesFollowUp');
      if (pendingInquiryId && id === pendingInquiryId && inquiry && inquiry.department === 'sales' && (user?.role === 'sales' || user?.role === 'admin')) {
        const storedCount = localStorage.getItem(`followUpCount_${id}`);
        if (storedCount) {
          const storedCountNum = parseInt(storedCount, 10);
          const currentCount = inquiry.followUps ? inquiry.followUps.length : 0;
          if (currentCount <= storedCountNum) {
            e.preventDefault();
            e.returnValue = 'You have a pending follow-up that must be completed. Are you sure you want to leave?';
            return e.returnValue;
          }
        } else {
          e.preventDefault();
          e.returnValue = 'You have a pending follow-up that must be completed. Are you sure you want to leave?';
          return e.returnValue;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [id, inquiry, user?.role]);

  useEffect(() => {
    if (user?.role === 'sales') {
      apiService.users.getAll({ role: 'sales', isActive: true, limit: 100 }).then((res) => {
        const list = res.data?.users || [];
        setSalesUsers(list.filter((u: AppUser) => getId(u) !== user.id));
      }).catch(() => {
        // Silently handle error - user list is optional
      });
    }
  }, [user?.role, user?.id]); // Only depend on role and id to prevent duplicate calls

  // Check for pending follow-up on mount and when inquiry loads (for sales users and admin for sales inquiries)
  // This ensures the modal persists after refresh, tab close, logout, and after login
  useEffect(() => {
    if (!id || !user) return;
    
    const pendingInquiryId = localStorage.getItem('pendingSalesFollowUp');
    
    // Only process if there's a pending follow-up for this inquiry and user is sales/admin
    if (pendingInquiryId === id && (user.role === 'sales' || user.role === 'admin')) {
      // If inquiry is loaded, verify it's a sales inquiry and user is assigned
      if (inquiry) {
        if (inquiry.department === 'sales' && inquiry.assignedTo && idsMatch(inquiry.assignedTo, user.id || (user as any)._id)) {
          const storedCount = localStorage.getItem(`followUpCount_${id}`);
          const currentCount = inquiry.followUps ? inquiry.followUps.length : 0;
          
          // If no stored count, this is a fresh claim - store the current count and open modal
          if (!storedCount) {
            localStorage.setItem(`followUpCount_${id}`, currentCount.toString());
            setIsSalesFollowUpModalOpen(true);
          } else {
            // Check if a new follow-up was created (current count > stored count)
            const storedCountNum = parseInt(storedCount, 10);
            
            if (currentCount > storedCountNum) {
              // New follow-up was created, clear the pending flag
              localStorage.removeItem('pendingSalesFollowUp');
              localStorage.removeItem(`followUpCount_${id}`);
              setIsSalesFollowUpModalOpen(false);
            } else {
              // No new follow-up yet, ensure modal is open
              setIsSalesFollowUpModalOpen(true);
            }
          }
        } else if (inquiry.department === 'sales') {
          // Sales inquiry but user not assigned yet (might be right after claim, before refetch completes)
          // Keep modal open if pending flag exists
          const storedCount = localStorage.getItem(`followUpCount_${id}`);
          if (storedCount !== null) {
            setIsSalesFollowUpModalOpen(true);
          }
        } else {
          // Inquiry doesn't match conditions, but pending flag exists - clear it
          localStorage.removeItem('pendingSalesFollowUp');
          localStorage.removeItem(`followUpCount_${id}`);
          setIsSalesFollowUpModalOpen(false);
        }
      } else {
        // Inquiry not loaded yet, but pending flag exists - keep modal state as initialized
        // Modal will be verified when inquiry loads
      }
    } else if (pendingInquiryId !== id) {
      // No pending follow-up for this inquiry - ensure modal is closed
      setIsSalesFollowUpModalOpen(false);
    }
  }, [inquiry, user?.role, user?.id, id]);

  // Forward to Sales button - only show for presales users (not admin)
  // Show right after they have attended the inquiry (assigned to them)
  const canForward = !!(
    user && 
    inquiry && 
    inquiry.department === 'presales' && 
    idsMatch(inquiry.assignedTo, user.id || (user as any)._id) &&
    user.role === 'presales' // Only presales users can forward, not admin
  );
  // Reassign to Sales User button should only show after the inquiry has been attended
  // (assigned user has created at least one follow-up)
  // Use inquiryHasFollowUps as a fallback if user ID comparison fails
  const canReassignSales = !!(
    user &&
    inquiry &&
    inquiry.department === 'sales' &&
    idsMatch(inquiry.assignedTo, user.id || (user as any)._id) &&
    (user.role === 'sales' || user.role === 'admin') &&
    (userHasCreatedFollowUp || inquiryHasFollowUps)
  );

  const handleForwardToSales = async () => {
    if (!inquiry) return;
    try {
      setIsForwarding(true);
      await apiService.inquiries.forwardToSales(inquiry._id);
      toast.success('Inquiry forwarded to sales successfully!');
      setShowForwardConfirm(false);
      queryClient.invalidateQueries(['inquiries']);
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['unattended-counts']); // Refresh badge counts
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to forward inquiry to sales. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsForwarding(false);
    }
  };

  const handleReassignToSales = async () => {
    if (!inquiry || !selectedSales) return;
    try {
      setIsForwarding(true);
      await apiService.inquiries.reassignToSales(inquiry._id, selectedSales);
      const newUser = salesUsers.find(u => getId(u) === selectedSales);
      toast.success(`Inquiry reassigned to ${newUser?.name || 'selected user'} successfully!`);
      setSelectedSales('');
      setShowReassignSalesModal(false);
      queryClient.invalidateQueries(['inquiries']);
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['unattended-counts']); // Refresh badge counts
      navigate('/inquiries');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to reassign inquiry. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsForwarding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/inquiries')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Inquiry Not Found
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The inquiry you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Use helper function from constants for status color
  const getStatusColor = (status: InquiryStatus) => {
    return getStatusColorHelper(status);
  };

  // Check if inquiry is forwarded to sales (for presales users)
  const isForwardedToSales = inquiry.assignmentStatus === 'forwarded_to_sales' && inquiry.department === 'sales';

  // Gradient colors matching sidebar
  const lightGradient = 'linear-gradient(to bottom, #ffedd5, #e7e0ff)';
  const darkGradient = 'linear-gradient(to bottom, #78350f, #5b21b6)';
  const cardGradient = theme === 'dark' ? darkGradient : lightGradient;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/inquiries')}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inquiry Details
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View details for inquiry #{inquiry._id.slice(-8)}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Forwarded to Sales Badge */}
          {isForwardedToSales && user?.role === 'presales' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              Forwarded to Sales
            </span>
          )}
          {/* Display status or lead stage based on department */}
          {inquiry.department === 'sales' && inquiry.followUps && inquiry.followUps.length > 0 ? (
            (() => {
              // Sort follow-ups by createdAt (most recent first) to get the latest
              const sortedFollowUps = [...inquiry.followUps].sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA; // Most recent first
              });
              const latestFollowUp = sortedFollowUps[0];
              const leadStage = latestFollowUp.leadStage;
              const subStage = latestFollowUp.subStage;
              return (
                <div className="flex items-center gap-2">
                  {leadStage && (
                    <span
                      className={cn(
                        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                        leadStage === 'Hot' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        leadStage === 'Warm' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        leadStage === 'Cold' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        leadStage === 'Not Interested' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                        leadStage === 'Walkin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        leadStage === 'Online-Conversion' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      )}
                    >
                      {leadStage}
                    </span>
                  )}
                  {subStage && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                      {subStage}
                    </span>
                  )}
                </div>
              );
            })()
          ) : (
            <span
              className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                getStatusColor(inquiry.status)
              )}
            >
              <Thermometer className="h-10 w-6 mr-1" />
              {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
            </span>
          )}
          {canAttend && (
            <button
              onClick={handleClaim}
              className="btn btn-primary btn-sm py-5"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Attend
            </button>
          )}
          {canAddFollowUp && (
            <button
              onClick={() => {
                setEditingFollowUp(null);
                setIsFollowUpModalOpen(true);
              }}
              className="btn btn-primary btn-sm py-5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Follow-Up
            </button>
          )}
          {canAddSalesFollowUp && (
            <button
              onClick={() => {
                setEditingFollowUp(null);
                setIsSalesFollowUpModalOpen(true);
              }}
              className="btn btn-primary btn-sm py-5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Follow-Up
            </button>
          )}
          {canForward && (
            <button
              className="btn btn-warning btn-sm py-5"
              onClick={() => setShowForwardConfirm(true)}
              disabled={isForwarding}
            >
              Forward to Sales
            </button>
          )}
          {canReassignSales && (
            <button
              className="btn btn-secondary btn-sm py-5"
              onClick={() => setShowReassignSalesModal(true)}
              disabled={isForwarding}
            >
              Reassign to Sales User
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ background: cardGradient }}
          >
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Basic Information
              </h2>
            </div>
            <div className="card-content space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <UserIcon className="h-4 w-4 inline mr-1" />
                    Full Name
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    {inquiry.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email Address
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {inquiry.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Phone Number
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {inquiry.phone}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    City
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {inquiry.city}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Education
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {inquiry.education}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <BookOpen className="h-4 w-4 inline mr-1" />
                    Course
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    {inquiry.course}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Building className="h-4 w-4 inline mr-1" />
                    Preferred Location
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {inquiry.preferredLocation}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    Medium
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {inquiry.medium}
                  </p>
                </div>
                <div className='mt-6'>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <UserCheck className="h-4 w-4 inline mr-1" />
                    Assigned To
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {inquiry.assignedTo?.name || 'Unassigned'}
                  </p>
                </div>
                <div className='mt-6'>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <UserIcon className="h-4 w-4 inline mr-1" />
                    Created By
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {inquiry.createdBy.name}
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
          
          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
            style={{ background: cardGradient }}
          >
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FileText className="h-5 w-5 inline mr-2" />
                Inquiry Message
              </h2>
            </div>
            <div className="card-content">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {inquiry.message}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Follow-Ups (List) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card"
            style={{ background: cardGradient }}
          >
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <Clock className="h-5 w-5 inline mr-2" />
                Follow-Ups
              </h2>
            </div>
            <div className="card-content p-0">
              {inquiry.followUps && inquiry.followUps.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        {inquiry.department === 'sales' && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Lead Stage
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Sub Stage
                            </th>
                          </>
                        )}
                        {inquiry.department === 'presales' && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Next Follow-Up
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Message
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {[...inquiry.followUps].sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return dateB - dateA; // Most recent first (descending order)
                      }).map((fu) => (
                        <tr key={fu._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                              {fu.type}
                            </span>
                          </td>
                          {inquiry.department === 'sales' && (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {fu.leadStage && (
                                  <span
                                    className={cn(
                                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                      fu.leadStage === 'Hot' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                      fu.leadStage === 'Warm' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                      fu.leadStage === 'Cold' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                      fu.leadStage === 'Not Interested' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                                      fu.leadStage === 'Walkin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                      fu.leadStage === 'Online-Conversion' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                    )}
                                  >
                                    {fu.leadStage}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {fu.subStage && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                    {fu.subStage}
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                          {inquiry.department === 'presales' && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={cn(
                                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                  inquiry.status === 'hot' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  inquiry.status === 'warm' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  inquiry.status === 'cold' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                )}
                              >
                                {inquiry.status ? inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1) : '-'}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {fu.createdAt ? new Date(fu.createdAt).toLocaleString() : 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {fu.nextFollowUpDate ? new Date(fu.nextFollowUpDate).toLocaleString() : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900 dark:text-white line-clamp-1">
                              {fu.message || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No follow-ups yet</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {(canAddFollowUp || canAddSalesFollowUp) ? 'Use the Add Follow-Up button above to create one.' : 'No follow-ups have been added to this inquiry.'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Follow-Up Modal */}
      {inquiry && canAddFollowUp && (
        <FollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => {
            setIsFollowUpModalOpen(false);
            setEditingFollowUp(null);
          }}
          inquiryId={inquiry._id}
          followUp={editingFollowUp || undefined}
          onSuccess={handleFollowUpSuccess}
          inquiryStatus={inquiry.status}
        />
      )}

      {/* Sales Follow-Up Modal */}
      {inquiry && id && (canAddSalesFollowUp || ((user?.role === 'sales' || user?.role === 'admin') && inquiry.department === 'sales' && localStorage.getItem('pendingSalesFollowUp') === id)) && (
        <SalesFollowUpModal
          isOpen={isSalesFollowUpModalOpen}
          onClose={() => {
            const pendingInquiryId = localStorage.getItem('pendingSalesFollowUp');
            if (pendingInquiryId === id && inquiry.department === 'sales' && (user?.role === 'sales' || user?.role === 'admin')) {
              const storedCount = localStorage.getItem(`followUpCount_${id}`);
              const currentCount = inquiry?.followUps ? inquiry.followUps.length : 0;
              
              if (!storedCount || currentCount <= parseInt(storedCount, 10)) {
                toast.error('Please create a follow-up before closing. This is required to complete the attendance.');
                return;
              }
            }
            setIsSalesFollowUpModalOpen(false);
            setEditingFollowUp(null);
          }}
          inquiryId={inquiry._id}
          followUp={editingFollowUp || undefined}
          onSuccess={handleSalesFollowUpSuccess}
          isRequired={!!((user?.role === 'sales' || user?.role === 'admin') && id && inquiry.department === 'sales' && localStorage.getItem('pendingSalesFollowUp') === id && (inquiry.assignedTo && idsMatch(inquiry.assignedTo, user.id || (user as any)._id) || !inquiry.assignedTo))}
        />
      )}


      {/* Reassign to Sales Modal */}
      {showReassignSalesModal && canReassignSales && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reassign to Sales User</h3>
              <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={() => setShowReassignSalesModal(false)}>✕</button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={reassignSalesSearch}
                onChange={(e) => setReassignSalesSearch(e.target.value)}
                placeholder="Search by name or email"
                className="input w-full"
              />
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 rounded-md border border-gray-200 dark:border-gray-700">
              {salesUsers
                .filter(u => u.name.toLowerCase().includes(reassignSalesSearch.toLowerCase()) || u.email.toLowerCase().includes(reassignSalesSearch.toLowerCase()))
                .map(u => (
                  <label key={getId(u)!} className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                    </div>
                    <input
                      type="radio"
                      name="reassignSalesUser"
                      className="h-4 w-4"
                      checked={selectedSales === (getId(u) as string)}
                      onChange={() => setSelectedSales(getId(u)!)}
                    />
                  </label>
                ))}
              {salesUsers.length === 0 && (
                <div className="p-3 text-sm text-gray-500 dark:text-gray-400">No sales users found.</div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="btn btn-cancel px-2 py-2" onClick={() => setShowReassignSalesModal(false)}>Cancel</button>
              <button className="btn btn-secondary px-2 py-2" disabled={!selectedSales || isForwarding} onClick={handleReassignToSales}>Reassign</button>
            </div>
          </div>
        </div>
      )}

      {/* Forward to Sales Confirm Modal */}
      {showForwardConfirm && canForward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Forward to Sales</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to forward this inquiry to Sales?
              You will no longer be able to update it in Presales.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                className="btn btn-cancel px-2 py-2"
                onClick={() => setShowForwardConfirm(false)}
                disabled={isForwarding}
              >
                Cancel
              </button>
              <button
                className="btn btn-warning px-2 py-2"
                onClick={handleForwardToSales}
                disabled={isForwarding}
              >
                {isForwarding ? 'Forwarding...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiryDetails;
