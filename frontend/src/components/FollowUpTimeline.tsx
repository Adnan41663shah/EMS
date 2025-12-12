import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, Mail, Calendar, Play, FileText, DollarSign, 
  Users, CheckCircle, ArrowRight, Bell, Clock, 
  Edit, Trash2, Search, X, AlertCircle, User, RefreshCw, PhoneOff
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { FollowUp, FollowUpType, FollowUpStatus, FollowUpOutcome } from '@/types';
import { 
  FOLLOW_UP_TYPES, 
  FOLLOW_UP_STATUSES, 
  FOLLOW_UP_OUTCOMES
} from '@/utils/constants';
import apiService from '@/services/api';
import { toast } from 'react-toastify';

interface FollowUpTimelineProps {
  followUps: FollowUp[];
  inquiryId: string;
  onUpdate: () => void;
  onEdit?: (followUp: FollowUp) => void;
  canEdit?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Phone, Mail, Calendar, Play, FileText, DollarSign,
  Users, CheckCircle, ArrowRight, Bell, X, RefreshCw, PhoneOff, Clock,
};

const FollowUpTimeline: React.FC<FollowUpTimelineProps> = ({
  followUps,
  inquiryId,
  onUpdate,
  onEdit,
  canEdit = true,
}) => {
  const [filters, setFilters] = useState<{
    status?: FollowUpStatus;
    type?: FollowUpType;
    search: string;
  }>({
    search: '',
  });

  const handleDelete = async (followUpId: string) => {
    if (!window.confirm('Are you sure you want to delete this follow-up?')) {
      return;
    }

    try {
      await apiService.inquiries.deleteFollowUp(inquiryId, followUpId);
      toast.success('Follow-up deleted successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete follow-up');
    }
  };

  const getTypeIcon = (type: FollowUpType) => {
    const typeConfig = FOLLOW_UP_TYPES.find(t => t.value === type);
    const Icon = typeConfig ? iconMap[typeConfig.icon] || FileText : FileText;
    return Icon;
  };

  const getTypeColor = (type: FollowUpType) => {
    const typeConfig = FOLLOW_UP_TYPES.find(t => t.value === type);
    return typeConfig?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getStatusColor = (status: FollowUpStatus) => {
    const statusConfig = FOLLOW_UP_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };


  const getOutcomeColor = (outcome?: FollowUpOutcome) => {
    if (!outcome) return '';
    const outcomeConfig = FOLLOW_UP_OUTCOMES.find(o => o.value === outcome);
    return outcomeConfig?.color || '';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  const filteredFollowUps = followUps.filter((followUp) => {
    if (filters.status && followUp.status !== filters.status) return false;
    if (filters.type && followUp.type !== filters.type) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        followUp.message?.toLowerCase().includes(searchLower) ||
        followUp.title?.toLowerCase().includes(searchLower) ||
        (followUp as any).description?.toLowerCase().includes(searchLower) ||
        (followUp as any).tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const sortedFollowUps = [...filteredFollowUps].sort((a, b) => {
    // Sort by createdAt (most recent first)
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Most recent first
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search follow-ups..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as FollowUpStatus || undefined })}
                className="input"
              >
                <option value="">All Statuses</option>
                {FOLLOW_UP_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as FollowUpType || undefined })}
                className="input"
              >
                <option value="">All Types</option>
                {FOLLOW_UP_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {sortedFollowUps.length === 0 ? (
          <div className="card">
            <div className="card-content text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No follow-ups found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filters.search || filters.status || filters.type
                  ? 'Try adjusting your filters'
                  : 'Get started by adding a follow-up'}
              </p>
            </div>
          </div>
        ) : (
          sortedFollowUps.map((followUp, index) => {
            const TypeIcon = getTypeIcon(followUp.type);
            const statusConfig = FOLLOW_UP_STATUSES.find(s => s.value === followUp.status);

            return (
              <motion.div
                key={followUp._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'card relative',
                  followUp.status === 'completed' && 'bg-gray-50 dark:bg-gray-800/50'
                )}
              >
                <div className="card-content">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn('p-2 rounded-lg', getTypeColor(followUp.type))}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {followUp.message || followUp.title || '-'}
                            </h3>
                            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(followUp.status))}>
                              {statusConfig?.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Message/Description */}
                      {followUp.message && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {followUp.message}
                        </p>
                      )}

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        {/* Created At */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>
                            <strong>Created At:</strong> {followUp.createdAt ? formatDateTime(followUp.createdAt) : 'N/A'}
                          </span>
                        </div>

                        {/* Completed */}
                        {followUp.completedDate && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>
                              <strong>Completed:</strong> {formatDateTime(followUp.completedDate)}
                            </span>
                          </div>
                        )}

                        {/* Duration */}
                        {followUp.duration && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>
                              <strong>Duration:</strong> {followUp.duration} minutes
                            </span>
                          </div>
                        )}

                        {/* Outcome */}
                        {followUp.outcome && (
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getOutcomeColor(followUp.outcome))}>
                              <strong>Outcome:</strong> {FOLLOW_UP_OUTCOMES.find(o => o.value === followUp.outcome)?.label}
                            </span>
                          </div>
                        )}

                        {/* Next Follow-up */}
                        {followUp.nextFollowUpDate && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span>
                              <strong>Next:</strong> {formatDateTime(followUp.nextFollowUpDate)}
                            </span>
                          </div>
                        )}

                        {/* Created By */}
                        {followUp.createdBy && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="h-4 w-4" />
                            <span>
                              <strong>Created By:</strong> {followUp.createdBy.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                          <span>Created by {followUp.createdBy.name}</span>
                          <span>•</span>
                          <span>{getTimeAgo(followUp.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {canEdit && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => onEdit && onEdit(followUp)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Edit follow-up"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(followUp._id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Delete follow-up"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FollowUpTimeline;

