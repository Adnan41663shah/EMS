import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Eye, Filter, X, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import apiService from '@/services/api';
import { Inquiry, InquiryFilters } from '@/types';
import { cn } from '@/utils/cn';
import LoadingSpinner from '@/components/LoadingSpinner';

const AdminMyRaisedInquiries: React.FC = () => {
  const [filters, setFilters] = useState<InquiryFilters>({
    page: 1,
    limit: 10,
    search: '',
    status: undefined,
    course: undefined,
    location: undefined,
    medium: undefined,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  const { data, isLoading } = useQuery(
    ['admin-my-inquiries', filters],
    () => apiService.inquiries.getAll({ ...filters, createdBy: 'me' }),
    {
      keepPreviousData: true,
    }
  );

  const { data: optionsData } = useQuery('options', () => apiService.options.get(), { staleTime: 5 * 60 * 1000 });
  const optCourses: string[] = optionsData?.data?.courses || ['CDEC', 'X-DSAAI', 'DevOps', 'Full-Stack', 'Any'];

  const inquiries = data?.data?.inquiries || [];
  const pagination = data?.data?.pagination;

  const handleFilterChange = (key: keyof InquiryFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const clearFilter = (key: keyof InquiryFilters) => {
    setFilters(prev => ({ ...prev, [key]: undefined, page: 1 }));
  };

  const clearAllFilters = () => {
    setFilters(prev => ({
      ...prev,
      status: undefined,
      course: undefined,
      location: undefined,
      medium: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: 1,
    }));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.course) count++;
    if (filters.location) count++;
    if (filters.medium) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };


  const handleViewInquiry = (inquiryId: string) => {
    navigate(`/inquiries/${inquiryId}`);
  };

  const getRowBg = (inq: Inquiry) => {
    if (!(inq as any).assignedTo) {
      return 'bg-green-100 dark:bg-green-900/30';
    }
    if ((inq as any).assignmentStatus === 'forwarded_to_sales') {
      return 'bg-gray-50 dark:bg-gray-900/40';
    }
    return 'bg-yellow-50 dark:bg-yellow-900/20';
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Raised Inquiries
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and manage inquiries you have created
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your raised inquiries..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>

            {/* Filter Button */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  "btn btn-outline flex items-center gap-2 px-4 py-2",
                  getActiveFilterCount() > 0 && "bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700"
                )}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {getActiveFilterCount() > 0 && (
                  <span className="bg-primary-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {getActiveFilterCount()}
                  </span>
                )}
                <ChevronDown className={cn("h-4 w-4 transition-transform", isFilterOpen && "transform rotate-180")} />
              </button>

              {/* Filter Dropdown */}
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-4">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
                      {getActiveFilterCount() > 0 && (
                        <button
                          onClick={clearAllFilters}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {/* Course Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Course
                      </label>
                      <select
                        value={filters.course || ''}
                        onChange={(e) => handleFilterChange('course', e.target.value || undefined)}
                        className="input text-sm"
                      >
                        <option value="">All Courses</option>
                        {optCourses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Filter Badges */}
          {getActiveFilterCount() > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {filters.course && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  Course: {filters.course}
                  <button onClick={() => clearFilter('course')} className="hover:text-primary-900 dark:hover:text-primary-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="card">
        <div className="card-content p-0">
          {/* Results Count - Top Left */}
          {pagination && (pagination.totalPages > 0 || inquiries.length > 0) && (
            <div className="pt-4 pb-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {inquiries.length} of {pagination.totalItems} results
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {inquiries.map((inquiry: Inquiry, index: number) => (
                  <motion.tr
                    key={inquiry._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={cn(getRowBg(inquiry as any), 'hover:bg-gray-100/70 dark:hover:bg-gray-800')}
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-7 w-7">
                          <div className="h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                              {inquiry.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-2">
                          <div className="text-xs font-medium text-gray-900 dark:text-white">
                            {inquiry.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {inquiry.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {inquiry.phone}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                      {inquiry.course}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                      {inquiry.preferredLocation}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        inquiry.department === 'sales' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      )}>
                        {inquiry.department === 'sales' ? 'Sales' : 'Presales'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(inquiry.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleViewInquiry(inquiry._id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {inquiries.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500">
                <FileText className="mx-auto h-12 w-12" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No raised inquiries found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                You haven't created any inquiries yet.
              </p>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Use the "New Inquiry" button in the top navigation to create your first inquiry.
              </p>
            </div>
          )}
        </div>

        {/* Pagination - Right Side */}
        {pagination && (pagination.totalPages > 0 || inquiries.length > 0) && (
          <div className="card-footer">
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-2 ">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="flex items-center px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                  Page {pagination.currentPage} of {pagination.totalPages || 1}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminMyRaisedInquiries;

