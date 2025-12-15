import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Clock, Eye, FileText, Trash2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import apiService from '@/services/api';
import { FollowUp, InquiryStatus } from '@/types';
import { getStatusColor, getStatusLabel } from '@/utils/constants';
import { cn } from '@/utils/cn';
import LoadingSpinner from '@/components/LoadingSpinner';

interface FollowUpWithInquiry extends FollowUp {
  inquiry: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    course: string;
    preferredLocation: string;
    status: string;
    department: string;
  };
}

const MyFollowUps: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'today'>('all');
  
  // Load removed follow-up IDs from localStorage on mount
  const [removedFollowUpIds, setRemovedFollowUpIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('removedFollowUpIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const { data, isLoading, error, refetch } = useQuery(
    ['my-follow-ups'],
    () => apiService.inquiries.getMyFollowUps(),
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0, // Always consider data stale to ensure fresh data
      cacheTime: 0, // Don't cache to ensure fresh data
    }
  );

  // Refetch when component mounts to ensure we have the latest data
  useEffect(() => {
    refetch();
  }, []); // Only run on mount

  // Helper function to check if a date is today
  const isToday = (dateString: string | undefined): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Filter and sort follow-ups
  const allFollowUps: FollowUpWithInquiry[] = (data?.data?.followUps || []).sort((a: FollowUpWithInquiry, b: FollowUpWithInquiry) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA; // Most recent first
  });

  // Filter follow-ups based on selected filter and removed items
  const followUps: FollowUpWithInquiry[] = (filter === 'today'
    ? allFollowUps.filter((fu) => isToday(fu.nextFollowUpDate))
    : allFollowUps
  ).filter((fu) => !removedFollowUpIds.has(fu._id));

  const handleViewInquiry = (inquiryId: string) => {
    navigate(`/inquiries/${inquiryId}`);
  };

  const handleRemoveFollowUp = (followUpId: string) => {
    setRemovedFollowUpIds((prev) => {
      const newSet = new Set(prev).add(followUpId);
      // Save to localStorage
      localStorage.setItem('removedFollowUpIds', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const handleExport = () => {
    // Prepare CSV data with only required columns
    const headers = [
      'Name',
      'Phone',
      'Preferred Location',
      'Preferred Course',
      'Address',
      'Message'
    ];

    const rows = followUps.map((followUp) => {
      return [
        followUp.inquiry?.name || '',
        followUp.inquiry?.phone || '',
        followUp.inquiry?.preferredLocation || '',
        followUp.inquiry?.course || '',
        followUp.inquiry?.city || '',
        followUp.message || ''
      ];
    });

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `my-follow-ups-${filter}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 dark:text-red-500">
          <FileText className="mx-auto h-12 w-12" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          Error loading follow-ups
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Follow-Ups
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View all follow-ups you have created
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Buttons */}
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter('today')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              filter === 'today'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            )}
          >
            Today
          </button>
          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={followUps.length === 0}
            className={cn(
              'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              followUps.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800'
            )}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Follow-Ups List */}
      <div className="card">
        <div className="card-content p-0">
          {followUps.length > 0 && (
            <div className="pt-4 pb-4 px-6">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {followUps.length} follow-up{followUps.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Inquiry Status
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Next Follow-up
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Preferred Location
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {followUps.map((followUp: FollowUpWithInquiry, index: number) => (
                  <motion.tr
                    key={followUp._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-3 sm:px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {followUp.inquiry?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {followUp.inquiry?.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 whitespace-nowrap">
                      {followUp.inquiryStatus ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit',
                            getStatusColor(followUp.inquiryStatus as InquiryStatus)
                          )}>
                            {getStatusLabel(followUp.inquiryStatus as InquiryStatus)}
                          </span>
                          {followUp.subStage && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {followUp.subStage}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2 whitespace-nowrap">
                      {followUp.nextFollowUpDate ? (
                        <div className="flex flex-col">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {new Date(followUp.nextFollowUpDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(followUp.nextFollowUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 dark:text-gray-500 italic">
                          Not scheduled
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {followUp.inquiry?.course || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {followUp.inquiry?.preferredLocation || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => handleViewInquiry(followUp.inquiry?._id)}
                          className="inline-flex items-center justify-center p-1.5 sm:p-2 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="View Inquiry"
                        >
                          <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          onClick={() => handleRemoveFollowUp(followUp._id)}
                          className="inline-flex items-center justify-center p-1.5 sm:p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {followUps.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500">
                <Clock className="mx-auto h-12 w-12" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No follow-ups found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                You haven't created any follow-ups yet.
              </p>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Create follow-ups from the inquiry details page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyFollowUps;

