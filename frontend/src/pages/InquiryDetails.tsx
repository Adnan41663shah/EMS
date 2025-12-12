import React, { useState, useEffect } from 'react';
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
  const [isSalesFollowUpModalOpen, setIsSalesFollowUpModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [presalesUsers, setPresalesUsers] = useState<AppUser[]>([]);
  const [salesUsers, setSalesUsers] = useState<AppUser[]>([]);
  const [selectedPresales, setSelectedPresales] = useState<string>('');
  const [selectedSales, setSelectedSales] = useState<string>('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showReassignSalesModal, setShowReassignSalesModal] = useState(false);
  const [reassignSearch, setReassignSearch] = useState('');
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
    return (u as any).id || (u as any)._id;
  };

  // Deprecated canEdit flag (follow-ups now restricted to assigned presales)

  // Only assigned Presales user can create/edit follow-ups
  const canAddFollowUp = !!(
    user &&
    user.role === 'presales' &&
    getId(inquiry?.assignedTo) === user.id &&
    inquiry?.department === 'presales'
  );

  // Only assigned Sales user or Admin (for sales inquiries) can create/edit sales follow-ups
  const canAddSalesFollowUp = !!(
    user &&
    inquiry?.department === 'sales' &&
    getId(inquiry?.assignedTo) === user.id &&
    (user.role === 'sales' || user.role === 'admin')
  );

  // Check if user can attend (claim) the inquiry
  const canAttend = !!(
    user &&
    inquiry &&
    !inquiry.assignedTo && // Inquiry is not assigned
    (
      (user.role === 'presales' && inquiry.department === 'presales') ||
      (user.role === 'sales' && inquiry.department === 'sales') ||
      user.role === 'admin'
    ) &&
    // For sales users and admin (for sales inquiries): Check if there's no pending follow-up for another inquiry
    !((user.role === 'sales' || (user.role === 'admin' && inquiry.department === 'sales')) && (() => {
      const pendingInquiryId = localStorage.getItem('pendingSalesFollowUp');
      return pendingInquiryId && pendingInquiryId !== inquiry._id;
    })())
  );

  const handleClaim = async () => {
    if (!inquiry || !id) return;
    
    // For sales users and admin (for sales inquiries): Check if there's already a pending follow-up
    if ((user?.role === 'sales' || (user?.role === 'admin' && inquiry.department === 'sales'))) {
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
        setIsSalesFollowUpModalOpen(true);
      }
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries(['inquiry', id]);
      queryClient.invalidateQueries(['inquiries']);
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['unattended-counts']);
      queryClient.invalidateQueries(['sales-assigned']);
      queryClient.invalidateQueries(['presales-assigned']);
      // Refetch the inquiry to get updated data
      await refetch();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to claim inquiry. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleFollowUpSuccess = async () => {
    await refetch();
    setIsFollowUpModalOpen(false);
    setEditingFollowUp(null);
    
    // Invalidate and refetch queries to refresh the list
    // Use a longer delay to ensure backend has fully processed the follow-up
    queryClient.invalidateQueries(['inquiry', id]);
    queryClient.invalidateQueries(['inquiries']); // Invalidate all inquiry lists
    queryClient.invalidateQueries(['my-follow-ups']);
    queryClient.invalidateQueries(['sales-assigned']); // Invalidate sales assigned inquiries
    queryClient.invalidateQueries(['presales-assigned']); // Invalidate presales assigned inquiries
    
    // Refetch immediately and also after a delay to catch any timing issues
    queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    
    setTimeout(() => {
      queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    }, 1000);
    
    setTimeout(() => {
      queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    }, 2000);
    
    // Toast notification is handled in FollowUpModal component
  };

  const handleSalesFollowUpSuccess = async () => {
    // Clear pending follow-up from localStorage when successfully created
    if (id && localStorage.getItem('pendingSalesFollowUp') === id) {
      localStorage.removeItem('pendingSalesFollowUp');
      localStorage.removeItem(`followUpCount_${id}`);
    }
    
    await refetch();
    setIsSalesFollowUpModalOpen(false);
    setEditingFollowUp(null);
    
    // Invalidate and refetch queries to refresh the list
    queryClient.invalidateQueries(['inquiry', id]);
    queryClient.invalidateQueries(['inquiries']);
    queryClient.invalidateQueries(['my-follow-ups']);
    queryClient.invalidateQueries(['sales-assigned']);
    queryClient.invalidateQueries(['presales-assigned']);
    
    // Refetch immediately and also after a delay
    queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    
    setTimeout(() => {
      queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    }, 1000);
    
    setTimeout(() => {
      queryClient.refetchQueries(['my-follow-ups'], { active: true, exact: false });
    }, 2000);
  };

  // Quick actions removed; only "Add Follow-Up" kept in header

  useEffect(() => {
    if (user?.role === 'presales') {
      apiService.users.getAll({ role: 'presales', isActive: true, limit: 100 }).then((res) => {
        const list = res.data?.users || [];
        setPresalesUsers(list.filter((u: AppUser) => getId(u) !== user.id));
      }).catch(() => {
        // Silently handle error - user list is optional
      });
    }
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
  useEffect(() => {
    if ((user?.role === 'sales' || user?.role === 'admin') && inquiry && id && inquiry.department === 'sales') {
      const pendingInquiryId = localStorage.getItem('pendingSalesFollowUp');
      
      // If there's a pending follow-up for this inquiry, open the modal
      // Always require a follow-up when there's a pending flag, regardless of existing follow-ups
      // This ensures inquiries moved to unattended and then attended require a new follow-up
      if (pendingInquiryId === inquiry._id && inquiry.assignedTo && getId(inquiry.assignedTo) === user.id) {
        // Store the follow-up count when the inquiry was claimed
        const followUpCountAtClaim = inquiry.followUps ? inquiry.followUps.length : 0;
        const storedCount = localStorage.getItem(`followUpCount_${id}`);
        
        // If no stored count, this is a fresh claim - store the current count and open modal
        if (!storedCount) {
          localStorage.setItem(`followUpCount_${id}`, followUpCountAtClaim.toString());
          setIsSalesFollowUpModalOpen(true);
        } else {
          // Check if a new follow-up was created (current count > stored count)
          const storedCountNum = parseInt(storedCount, 10);
          const currentCount = inquiry.followUps ? inquiry.followUps.length : 0;
          
          if (currentCount > storedCountNum) {
            // New follow-up was created, clear the pending flag
            localStorage.removeItem('pendingSalesFollowUp');
            localStorage.removeItem(`followUpCount_${id}`);
          } else {
            // No new follow-up yet, keep modal open
            setIsSalesFollowUpModalOpen(true);
          }
        }
      }
    }
  }, [inquiry, user?.role, user?.id, id]);

  const canForward = !!(user && inquiry && inquiry.department === 'presales' && getId(inquiry.assignedTo) === user.id);
  const canReassignSales = !!(
    user && 
    inquiry && 
    inquiry.department === 'sales' && 
    getId(inquiry.assignedTo) === user.id &&
    (user.role === 'sales' || user.role === 'admin')
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

  const handleReassignToPresales = async () => {
    if (!inquiry || !selectedPresales) return;
    try {
      setIsForwarding(true);
      await apiService.inquiries.reassignToPresales(inquiry._id, selectedPresales);
      const newUser = presalesUsers.find(u => getId(u) === selectedPresales);
      toast.success(`Inquiry reassigned to ${newUser?.name || 'selected user'} successfully!`);
      setSelectedPresales('');
      setShowReassignModal(false);
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
            <div className="flex items-center gap-2">
              <button
                className="btn btn-warning btn-sm py-5"
                onClick={() => setShowForwardConfirm(true)}
                disabled={isForwarding}
              >
                Forward to Sales
              </button>
              <button
                className="btn btn-secondary btn-sm py-5"
                onClick={() => setShowReassignModal(true)}
                disabled={isForwarding}
              >
                Reassign to Presales User
              </button>
            </div>
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

              {/* Forward buttons moved to header */}
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

        {/* Sidebar (quick actions removed) */}
        <div className="space-y-6" />
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
      {inquiry && (canAddSalesFollowUp || ((user?.role === 'sales' || user?.role === 'admin') && id && inquiry.department === 'sales' && localStorage.getItem('pendingSalesFollowUp') === id)) && (
        <SalesFollowUpModal
          isOpen={isSalesFollowUpModalOpen}
          onClose={() => {
            // For sales users and admin (for sales inquiries): Prevent closing if there's a pending follow-up (regardless of existing follow-ups)
            // This ensures inquiries moved to unattended and then attended require a new follow-up
            if ((user?.role === 'sales' || user?.role === 'admin') && id && inquiry.department === 'sales' && localStorage.getItem('pendingSalesFollowUp') === id) {
              // Check if a new follow-up was created after claiming
              const storedCount = localStorage.getItem(`followUpCount_${id}`);
              if (storedCount) {
                const storedCountNum = parseInt(storedCount, 10);
                const currentCount = inquiry?.followUps ? inquiry.followUps.length : 0;
                
                // If no new follow-up was created, prevent closing
                if (currentCount <= storedCountNum) {
                  toast.error('Please create a follow-up before closing. This is required to complete the attendance.');
                  return;
                }
              } else {
                // No stored count means this is a fresh claim, require follow-up
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
          isRequired={(user?.role === 'sales' || user?.role === 'admin') && id && inquiry.department === 'sales' && localStorage.getItem('pendingSalesFollowUp') === id && inquiry.assignedTo && getId(inquiry.assignedTo) === user.id}
        />
      )}

      {/* Reassign Modal */}
      {showReassignModal && canForward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reassign to Presales User</h3>
              <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={() => setShowReassignModal(false)}>✕</button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={reassignSearch}
                onChange={(e) => setReassignSearch(e.target.value)}
                placeholder="Search by name or email"
                className="input w-full"
              />
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 rounded-md border border-gray-200 dark:border-gray-700">
              {presalesUsers
                .filter(u => u.name.toLowerCase().includes(reassignSearch.toLowerCase()) || u.email.toLowerCase().includes(reassignSearch.toLowerCase()))
                .map(u => (
                  <label key={getId(u)!} className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                    </div>
                    <input
                      type="radio"
                      name="reassignUser"
                      className="h-4 w-4"
                      checked={selectedPresales === (getId(u) as string)}
                      onChange={() => setSelectedPresales(getId(u)!)}
                    />
                  </label>
                ))}
              {presalesUsers.length === 0 && (
                <div className="p-3 text-sm text-gray-500 dark:text-gray-400">No presales users found.</div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="btn btn-cancel px-2 py-2" onClick={() => setShowReassignModal(false)}>Cancel</button>
              <button className="btn btn-secondary px-2 py-2" disabled={!selectedPresales || isForwarding} onClick={handleReassignToPresales}>Reassign</button>
            </div>
          </div>
        </div>
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
