import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Eye, Download, Filter, X, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import apiService from '@/services/api';
import { useQuery as useRQ } from 'react-query';
import { Inquiry, InquiryFilters, InquiryStatus } from '@/types';
import { getStatusColor, getStatusLabel } from '@/utils/constants';
import { cn } from '@/utils/cn';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { convertInquiriesToCSV, downloadCSV } from '@/utils/exportCSV';

const PresalesInquiries: React.FC = () => {
  const [filters, setFilters] = useState<InquiryFilters>({
    search: '',
    status: undefined,
    course: undefined,
    location: undefined,
    medium: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
    ['presales-inquiries', filters],
    () => apiService.inquiries.getAll({ ...filters, department: 'presales' } as any),
    {
      keepPreviousData: true,
      refetchInterval: 30000,
      refetchOnWindowFocus: false,
    }
  );

  // Dynamic options (courses, locations, statuses)
  const { data: optionsData } = useRQ('options', () => apiService.options.get(), { staleTime: 5 * 60 * 1000 });
  const optCourses: string[] = optionsData?.data?.courses || ['CDEC', 'X-DSAAI', 'DevOps', 'Full-Stack', 'Any'];
  const optLocations: string[] = optionsData?.data?.locations || ['Nagpur', 'Pune', 'Nashik', 'Indore'];
  const optStatuses: string[] = optionsData?.data?.statuses || ['hot', 'warm', 'cold'];

  const allInquiries = data?.data?.inquiries || [];
  
  // Helper function to check if an inquiry is admitted (Hot + Confirmed Admission)
  const isAdmitted = (inq: Inquiry): boolean => {
    if (!inq.followUps || inq.followUps.length === 0) {
      return false;
    }
    
    // Get the latest follow-up (most recent by createdAt)
    const latestFollowUp = [...inq.followUps].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    // Check if leadStage is "Hot" and subStage is "Confirmed Admission"
    return latestFollowUp.leadStage === 'Hot' && latestFollowUp.subStage === 'Confirmed Admission';
  };
  
  // Filter out admitted students
  const inquiries = allInquiries.filter((inq: Inquiry) => !isAdmitted(inq));

  const handleFilterChange = (key: keyof InquiryFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilter = (key: keyof InquiryFilters) => {
    setFilters(prev => ({ ...prev, [key]: undefined }));
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


  const getRowBg = (inq: Inquiry) => {
    // New/unattended inquiries (unassigned) show green background
    if (!inq.assignedTo) {
      return 'bg-green-100 dark:bg-green-900/30';
    }
    // Assigned inquiries show yellow background
    return 'bg-yellow-50 dark:bg-yellow-900/20';
  };

  const handleViewInquiry = (inquiryId: string) => {
    navigate(`/inquiries/${inquiryId}`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Build export filters
      const exportFilters: InquiryFilters = {
        ...filters,
      };
      
      // Fetch all inquiries matching the filters
      const response = await apiService.inquiries.getAll({ ...exportFilters, department: 'presales' } as any);
      
      const allInquiries = response?.data?.inquiries || [];
      
      if (allInquiries.length === 0) {
        alert('No inquiries found to export with the current filters.');
        setIsExporting(false);
        return;
      }
      
      // Convert to CSV
      const csvContent = convertInquiriesToCSV(allInquiries);
      
      // Generate filename with filters
      const dateStr = filters.dateFrom || filters.dateTo
        ? `_${(filters.dateFrom || 'start').replace(/-/g, '')}_to_${(filters.dateTo || 'end').replace(/-/g, '')}`
        : '';
      const statusStr = filters.status ? `_${filters.status}` : '';
      const locationStr = filters.location ? `_${filters.location.replace(/\s+/g, '_')}` : '';
      const courseStr = filters.course ? `_${filters.course.replace(/\s+/g, '_')}` : '';
      const filename = `Presales_Inquiries${dateStr}${statusStr}${locationStr}${courseStr}_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Download CSV
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export inquiries. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Presales Inquiries
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and track all presales inquiries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn btn-primary btn-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
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
                  placeholder="Search inquiries..."
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

                    {/* Status Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Status
                      </label>
                      <select
                        value={filters.status || ''}
                        onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                        className="input text-sm"
                      >
                        <option value="">All Status</option>
                        {optStatuses.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
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

                    {/* Location Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Location
                      </label>
                      <select
                        value={filters.location || ''}
                        onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                        className="input text-sm"
                      >
                        <option value="">All Locations</option>
                        {optLocations.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date From Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Date From
                      </label>
                      <input
                        type="date"
                        className="input text-sm"
                        value={filters.dateFrom || ''}
                        onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                      />
                    </div>

                    {/* Date To Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Date To
                      </label>
                      <input
                        type="date"
                        className="input text-sm"
                        value={filters.dateTo || ''}
                        onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                        min={filters.dateFrom || undefined}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Filter Badges */}
          {getActiveFilterCount() > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {filters.status && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  Status: {filters.status}
                  <button onClick={() => clearFilter('status')} className="hover:text-primary-900 dark:hover:text-primary-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.course && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  Course: {filters.course}
                  <button onClick={() => clearFilter('course')} className="hover:text-primary-900 dark:hover:text-primary-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.location && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  Location: {filters.location}
                  <button onClick={() => clearFilter('location')} className="hover:text-primary-900 dark:hover:text-primary-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.medium && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  Medium: {filters.medium}
                  <button onClick={() => clearFilter('medium')} className="hover:text-primary-900 dark:hover:text-primary-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.dateFrom && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  From: {new Date(filters.dateFrom).toLocaleDateString()}
                  <button onClick={() => clearFilter('dateFrom')} className="hover:text-primary-900 dark:hover:text-primary-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.dateTo && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  To: {new Date(filters.dateTo).toLocaleDateString()}
                  <button onClick={() => clearFilter('dateTo')} className="hover:text-primary-900 dark:hover:text-primary-100">
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
        <div className="card-content border-5">
          {/* Results Count - Top Left */}
          {inquiries.length > 0 && (
            <div className="pt-1 pb-2">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {inquiries.length} results
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
                    Status
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created By
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
                    className={cn(getRowBg(inquiry), 'hover:bg-gray-100/70 dark:hover:bg-gray-800')}
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white">
                          {inquiry.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {inquiry.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="text-xs text-gray-900 dark:text-white">
                        {inquiry.phone}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="text-xs text-gray-900 dark:text-white">
                        {inquiry.course}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="text-xs text-gray-900 dark:text-white">
                        {inquiry.preferredLocation}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          getStatusColor(inquiry.status as InquiryStatus)
                        )}
                      >
                        {getStatusLabel(inquiry.status as InquiryStatus)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="text-xs text-gray-900 dark:text-white">
                        {inquiry.assignedTo?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="text-xs text-gray-900 dark:text-white">
                        {inquiry.createdBy?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="text-xs text-gray-900 dark:text-white">
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(inquiry.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-2">
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
                No inquiries found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No presales inquiries found.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PresalesInquiries;

