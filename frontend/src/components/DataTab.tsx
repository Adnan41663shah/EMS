import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Upload, Search, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'react-toastify';
import apiService from '@/services/api';
import { Student } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

const DataTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useQuery(
    ['students', search, page, limit],
    () => apiService.students.getAll({ search, page, limit }),
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  const students: Student[] = data?.data?.students || [];
  const pagination = data?.data?.pagination;

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file.');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit.');
      return;
    }

    setIsImporting(true);
    try {
      const response = await apiService.students.import(file);
      
      if (response.success) {
        toast.success(`Successfully imported ${response.data?.imported || 0} students!`);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Refetch students data
        queryClient.invalidateQueries(['students']);
        refetch();
      } else {
        toast.error(response.message || 'Failed to import students');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to import students. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const formatValue = (value: string | null | undefined, _isDate: boolean = false): string => {
    // Simple: just return the value as-is, no conversions
    if (value === null || value === undefined || value === '' || value === '-') {
      return '-';
    }
    
    return String(value).trim() || '-';
  };

  return (
    <div className="space-y-4">
      {/* Header with Import Button */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Student Data</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Import and manage student records from Excel files
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
                className="hidden"
                id="file-upload"
                disabled={isImporting}
              />
              <label
                htmlFor="file-upload"
                className={`btn btn-primary flex items-center gap-2 px-2 py-2 ${
                  isImporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Import</span>
                    <span className="sm:hidden">Import</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="card-content">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, mobile, email, course, or center..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card">
        <div className="card-content">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {search ? 'No students found matching your search.' : 'No student data imported yet. Click Import to upload an Excel file.'}
              </p>
            </div>
          ) : (
            <>
              {/* Results Count */}
              {pagination && (
                <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                  Showing {students.length} of {pagination.total || 0} students
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12 whitespace-nowrap">
                        Sr. No.
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Student Name
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Mobile Number
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Email
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Course
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Center
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Attended By
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Created By
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Attended At
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {students.map((student, index) => {
                      const rowNumber = (page - 1) * limit + index + 1;
                      return (
                        <tr
                          key={student._id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {rowNumber}
                          </td>
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatValue(student.studentName)}
                          </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatValue(student.mobileNumber)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatValue(student.email)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatValue(student.course)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatValue(student.center)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatValue(student.status)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatValue(student.attendedBy)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatValue(student.createdBy)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatValue(student.attendedAt, true)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                          {formatValue(student.notes)}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Page {pagination.page || page} of {pagination.pages || 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange((pagination.page || page) - 1)}
                      disabled={(pagination.page || page) === 1}
                      className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange((pagination.page || page) + 1)}
                      disabled={(pagination.page || page) >= (pagination.pages || 1)}
                      className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataTab;

