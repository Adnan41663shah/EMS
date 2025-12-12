import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Download, GraduationCap, Filter, ChevronDown, X } from 'lucide-react';
import { motion } from 'framer-motion';
import apiService from '@/services/api';
import { Inquiry, InquiryFilters } from '@/types';
import { cn } from '@/utils/cn';
import LoadingSpinner from '@/components/LoadingSpinner';
import { convertInquiriesToCSV, downloadCSV } from '@/utils/exportCSV';

// Helper function to check if an inquiry is admitted
const isAdmitted = (inquiry: Inquiry): boolean => {
  if (!inquiry.followUps || inquiry.followUps.length === 0) {
    return false;
  }
  
  // Get the latest follow-up (most recent by createdAt)
  const latestFollowUp = [...inquiry.followUps].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  
  // Check if leadStage is "Hot" and subStage is "Confirmed Admission"
  return latestFollowUp.leadStage === 'Hot' && latestFollowUp.subStage === 'Confirmed Admission';
};

const AdmittedStudents: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<InquiryFilters>({
    page: 1,
    limit: 50,
    search: '',
    course: undefined,
    location: undefined,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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
    ['admitted-students', filters],
    () => apiService.inquiries.getAll({ ...filters, limit: 1000 } as any), // Get more to filter client-side
    {
      keepPreviousData: true,
      refetchInterval: 30000,
      refetchOnWindowFocus: false,
    }
  );

  // Filter inquiries to only show admitted students
  const admittedStudents = useMemo(() => {
    const allInquiries = data?.data?.inquiries || [];
    return allInquiries.filter((inquiry: Inquiry) => isAdmitted(inquiry));
  }, [data?.data?.inquiries]);

  // Get admission date (date when follow-up with "Confirmed Admission" was created)
  const getAdmissionDate = (inquiry: Inquiry): string => {
    if (!inquiry.followUps || inquiry.followUps.length === 0) {
      return '-';
    }
    
    const latestFollowUp = [...inquiry.followUps]
      .filter(fu => fu.leadStage === 'Hot' && fu.subStage === 'Confirmed Admission')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    if (!latestFollowUp) {
      return '-';
    }
    
    return new Date(latestFollowUp.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get counselor name (assignedTo or createdBy)
  const getCounselorName = (inquiry: Inquiry): string => {
    if (inquiry.assignedTo) {
      return inquiry.assignedTo.name;
    }
    if (inquiry.createdBy) {
      return inquiry.createdBy.name;
    }
    return '-';
  };

  const handleViewInquiry = (inquiryId: string) => {
    navigate(`/inquiries/${inquiryId}`);
  };

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
      course: undefined,
      location: undefined,
      page: 1,
    }));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.course) count++;
    if (filters.location) count++;
    return count;
  };

  const handleExport = async () => {
    if (admittedStudents.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      // Create CSV with admitted students data
      const csvData = admittedStudents.map((inquiry: Inquiry) => ({
        Name: inquiry.name,
        Email: inquiry.email || '',
        Phone: inquiry.phone,
        Course: inquiry.course,
        Center: inquiry.preferredLocation,
        Counselor: getCounselorName(inquiry),
        'Admission Date': getAdmissionDate(inquiry),
        'Created Date': new Date(inquiry.createdAt).toLocaleDateString(),
      }));

      const csv = convertInquiriesToCSV(csvData as any);
      downloadCSV(csv, `admitted-students-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Apply search filter
  const filteredStudents = useMemo(() => {
    if (!filters.search) {
      return admittedStudents;
    }
    
    const searchLower = filters.search.toLowerCase();
    return admittedStudents.filter((inquiry: Inquiry) => {
      return (
        inquiry.name.toLowerCase().includes(searchLower) ||
        inquiry.email?.toLowerCase().includes(searchLower) ||
        inquiry.phone.toLowerCase().includes(searchLower) ||
        inquiry.course.toLowerCase().includes(searchLower) ||
        inquiry.preferredLocation.toLowerCase().includes(searchLower) ||
        getCounselorName(inquiry).toLowerCase().includes(searchLower)
      );
    });
  }, [admittedStudents, filters.search]);

  // Apply course and location filters
  const finalFilteredStudents = useMemo(() => {
    let filtered = filteredStudents;
    
    if (filters.course) {
      filtered = filtered.filter((inquiry: Inquiry) => inquiry.course === filters.course);
    }
    
    if (filters.location) {
      filtered = filtered.filter((inquiry: Inquiry) => inquiry.preferredLocation === filters.location);
    }
    
    return filtered;
  }, [filteredStudents, filters.course, filters.location]);

  // Dynamic options
  const { data: optionsData } = useQuery('options', () => apiService.options.get(), { staleTime: 5 * 60 * 1000 });
  const optCourses: string[] = optionsData?.data?.courses || ['CDEC', 'X-DSAAI', 'DevOps', 'Full-Stack', 'Any'];
  const optLocations: string[] = optionsData?.data?.locations || ['Nagpur', 'Pune', 'Nashik', 'Indore'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admitted Students
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View all confirmed admitted students
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting || finalFilteredStudents.length === 0}
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
                  placeholder="Search by name, email, or phone..."
                  value={filters.search || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('search', e.target.value)}
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
              {filters.location && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  Location: {filters.location}
                  <button onClick={() => clearFilter('location')} className="hover:text-primary-900 dark:hover:text-primary-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      {!isLoading && finalFilteredStudents.length > 0 && (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing {finalFilteredStudents.length} admitted {finalFilteredStudents.length === 1 ? 'student' : 'students'}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : finalFilteredStudents.length === 0 ? (
        <div className="card">
          <div className="card-content text-center py-12">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No admitted students found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filters.search || filters.course || filters.location
                ? 'Try adjusting your filters'
                : 'Students will appear here once they are confirmed for admission'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-content p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Mobile
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Center
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Counselor
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Admission Date
                    </th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {finalFilteredStudents.map((inquiry: Inquiry, index: number) => (
                    <motion.tr
                      key={inquiry._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-gray-100/70 dark:hover:bg-gray-800"
                    >
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="text-xs font-medium text-gray-900 dark:text-white">
                          {inquiry.name}
                        </div>
                        {inquiry.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {inquiry.email}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="text-xs text-gray-900 dark:text-white">
                          {inquiry.phone}
                        </div>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="text-xs text-gray-900 dark:text-white">
                          {inquiry.course}
                        </div>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="text-xs text-gray-900 dark:text-white">
                          {inquiry.preferredLocation}
                        </div>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="text-xs text-gray-900 dark:text-white">
                          {getCounselorName(inquiry)}
                        </div>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="text-xs text-gray-900 dark:text-white">
                          {getAdmissionDate(inquiry)}
                        </div>
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap text-right text-xs font-medium">
                        <button 
                          onClick={() => handleViewInquiry(inquiry._id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmittedStudents;

