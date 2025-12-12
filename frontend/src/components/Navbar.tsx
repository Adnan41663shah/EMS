import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { User, LogOut, Settings, Plus, Menu, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import apiService from '@/services/api';
import { CourseType, LocationType, MediumType, InquiryStatus, Inquiry } from '@/types';
import CreateInquiryModal from './CreateInquiryModal';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showUserMenu, showSearchResults]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Determine which departments to search based on user role
  const getSearchDepartments = useCallback(() => {
    if (!user) return [];
    if (user.role === 'admin') return ['presales', 'sales'];
    if (user.role === 'presales') return ['presales'];
    if (user.role === 'sales') return ['sales'];
    return [];
  }, [user]);

  // Search inquiries
  const { data: searchResults, isLoading: isSearching } = useQuery(
    ['inquiry-search', debouncedSearchQuery, user?.role],
    () => {
      if (!debouncedSearchQuery.trim() || debouncedSearchQuery.length < 2) {
        return { data: { inquiries: [] } };
      }
      const departments = getSearchDepartments();
      // Search in all departments for admin, or specific department for presales/sales
      const searchPromises = departments.map(dept =>
        apiService.inquiries.getAll({
          search: debouncedSearchQuery,
          department: dept,
          limit: 5, // Limit results per department
          page: 1
        })
      );
      return Promise.all(searchPromises).then(results => {
        const allInquiries: Inquiry[] = [];
        results.forEach(result => {
          if (result?.data?.inquiries) {
            allInquiries.push(...result.data.inquiries);
          }
        });
        return { data: { inquiries: allInquiries.slice(0, 10) } }; // Limit total results to 10
      });
    },
    {
      enabled: !!debouncedSearchQuery && debouncedSearchQuery.length >= 2 && !!user,
      staleTime: 0,
    }
  );

  const inquiries = searchResults?.data?.inquiries || [];

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSearchResults(value.length >= 2);
  };

  const handleInquiryClick = (inquiryId: string) => {
    navigate(`/inquiries/${inquiryId}`);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleSearchFocus = () => {
    if (searchQuery.length >= 2) {
      setShowSearchResults(true);
    }
  };

  const handleCreateInquiry = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateInquirySubmit = async (data: {
    name: string;
    email: string;
    city: string;
    education: string;
    course: CourseType;
    preferredLocation: LocationType;
    medium: MediumType;
    message: string;
    status?: InquiryStatus;
  }) => {
    try {
      // Set default status based on user role
      const inquiryData = {
        ...data,
        status: data.status || (user?.role === 'user' ? 'warm' : 'warm') as InquiryStatus
      };
      
      await apiService.inquiries.create(inquiryData);
      
      // Refresh the appropriate queries based on current page
      queryClient.invalidateQueries(['inquiries']);
      queryClient.invalidateQueries(['my-inquiries']);
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['unattended-counts']); // Refresh badge counts
      
      toast.success('Inquiry created successfully!');
      setIsCreateModalOpen(false);
    } catch (error: any) {
      console.error('Error creating inquiry:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to create inquiry. Please try again.';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleMoveToUnattended = async (inquiryId: string) => {
    try {
      await apiService.inquiries.moveToUnattended(inquiryId);
      
      // Refresh the appropriate queries
      queryClient.invalidateQueries(['inquiries']);
      queryClient.invalidateQueries(['my-inquiries']);
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['unattended-counts']); // Refresh badge counts
      queryClient.invalidateQueries(['sales-assigned']);
      queryClient.invalidateQueries(['presales-assigned']);
    } catch (error: any) {
      console.error('Error moving to unattended:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to move inquiry to unattended. Please try again.';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Gradient colors for light and dark mode
  const lightGradient = 'linear-gradient(to right, #f97316, #ec4899, #8b5cf6)';
  const darkGradient = 'linear-gradient(to right, #c2410c, #be185d, #6d28d9)';
  const gradientStyle = theme === 'dark' ? darkGradient : lightGradient;

  return (
    <header className="shadow-sm border-b border-gray-200 dark:border-gray-700 relative" style={{ background: gradientStyle }}>
      <div className="px-3 sm:px-4 lg:px-6 py-0 min-h-10 sm:min-h-14 flex items-center">
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
          {/* Logo and Mobile Menu Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-0 rounded-lg hover:bg-white/20 transition-colors shrink-0"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </button>
            {/* Logo Text */}
            <h1 className="text-sm sm:text-xl lg:text-2xl font-bold text-white py-0 leading-tight">
              CloudBlitz CRM
            </h1>
          </div>

          {/* Search Bar - Only show for presales, sales, and admin */}
          {(user?.role === 'presales' || user?.role === 'sales' || user?.role === 'admin') && (
            <div className="flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-2 md:mx-4 relative shrink min-w-0" ref={searchRef}>
              <div className="relative w-full">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 dark:text-gray-400 z-10" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={handleSearchFocus}
                  className="w-full pl-7 sm:pl-10 pr-7 sm:pr-10 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-2 border-white/40 dark:border-gray-600/40 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-white/80 dark:focus:ring-gray-500 dark:focus:border-gray-500 transition-all hover:bg-white dark:hover:bg-gray-800"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && debouncedSearchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Searching...
                    </div>
                  ) : inquiries.length > 0 ? (
                    <div className="py-2">
                      {inquiries.map((inquiry) => (
                        <button
                          key={inquiry._id}
                          onClick={() => handleInquiryClick(inquiry._id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                {inquiry.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                                {inquiry.email && (
                                  <div className="truncate">{inquiry.email}</div>
                                )}
                                {inquiry.phone && (
                                  <div className="truncate">{inquiry.phone}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                  {inquiry.department === 'presales' ? 'Presales' : 'Sales'}
                                </span>
                                {inquiry.course && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                    {inquiry.course}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No inquiries found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            {/* Create Inquiry Button */}
            <button
              onClick={handleCreateInquiry}
              className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 btn-sm text-xs sm:text-sm px-2 sm:px-3 py-0 sm:py-0 flex items-center gap-1 sm:gap-2 rounded-lg font-medium shadow-sm hover:shadow-md"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">New Inquiry</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 sm:gap-2 p-0 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 bg-white/20 rounded-full flex items-center justify-center shrink-0 border border-white/30">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
                <span className="hidden sm:inline text-xs sm:text-sm font-medium text-white">{user?.name}</span>
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <button className="flex items-center w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg">
                      <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 sm:mr-3" />
                      Profile Settings
                    </button>
                    <button
                      onClick={logout}
                      className="flex items-center w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-lg"
                    >
                      <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 sm:mr-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {showUserMenu && (
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
          )}
        </div>
      </div>

      {/* Create Inquiry Modal */}
      <CreateInquiryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateInquirySubmit}
        hideStatus={user?.role === 'user'}
        onMoveToUnattended={(user?.role === 'sales' || user?.role === 'presales' || user?.role === 'admin') ? handleMoveToUnattended : undefined}
      />
    </header>
  );
};

export default Navbar;
