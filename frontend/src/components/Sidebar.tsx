import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  User, 
  Users, 
  Settings,
  ChevronLeft, 
  ChevronRight,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from 'react-query';
import apiService from '@/services/api';
import { cn } from '@/utils/cn';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileMenuOpen, onMobileMenuClose }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  // Check if we're on a centers page
  const isCentersPage = location.pathname.startsWith('/centers/');
  const [centersOpen, setCentersOpen] = React.useState(isCentersPage);

  // Auto-open centers menu if on centers page
  React.useEffect(() => {
    if (isCentersPage) {
      setCentersOpen(true);
    }
  }, [isCentersPage]);

  // Fetch locations for Centers submenu
  const { data: optionsData } = useQuery(
    'options',
    () => apiService.options.get(),
    { staleTime: 5 * 60 * 1000, enabled: user?.role === 'presales' || user?.role === 'sales' || user?.role === 'admin' }
  );
  const locations: string[] = optionsData?.data?.locations || ['Nagpur', 'Pune', 'Nashik', 'Indore'];

  // Fetch unattended inquiry counts
  const { data: countsData } = useQuery(
    'unattended-counts',
    () => apiService.inquiries.getUnattendedCounts(),
    {
      staleTime: 10000, // 10 seconds
      refetchInterval: 15000, // Refetch every 15 seconds
      enabled: user?.role === 'presales' || user?.role === 'sales' || user?.role === 'admin'
    }
  );
  const unattendedCounts = countsData?.data || { total: 0, byLocation: {} };

  const sidebarItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      roles: ['user', 'presales', 'sales', 'admin'],
    },
    {
      label: 'All Inquiries',
      href: '/inquiries',
      icon: FileText,
      roles: ['presales', 'sales', 'admin'],
    },
    {
      label: 'Presales Inquiries',
      href: '/admin/presales-inquiries',
      icon: FileText,
      roles: ['admin'],
    },
    {
      label: 'Sales Inquiries',
      href: '/admin/sales-inquiries',
      icon: FileText,
      roles: ['admin'],
    },
    {
      label: 'My Attended Inquiries',
      href: '/presales/assigned',
      icon: Users,
      roles: ['presales'],
    },
    {
      label: 'My Attended Inquiries',
      href: '/sales/assigned',
      icon: Users,
      roles: ['sales'],
    },
    {
      label: 'My Follow-Ups',
      href: '/my-follow-ups',
      icon: Clock,
      roles: ['presales'],
    },
    {
      label: 'My Follow-Ups',
      href: '/sales/my-follow-ups',
      icon: Clock,
      roles: ['sales'],
    },
    {
      label: 'My Raised Inquiries',
      href: '/my-inquiries',
      icon: User,
      roles: ['user', 'presales', 'sales'],
    },
    {
      label: 'My Attended Inquiries',
      href: '/admin/my-attended-inquiries',
      icon: Users,
      roles: ['admin'],
    },
    {
      label: 'My Raised Inquiries',
      href: '/admin/my-raised-inquiries',
      icon: User,
      roles: ['admin'],
    },
    {
      label: 'Users',
      href: '/users',
      icon: Users,
      roles: ['admin'],
    },
    {
      label: 'Manage Options',
      href: '/manage-options',
      icon: Settings,
      roles: ['admin'],
    },
    {
      label: 'Admitted Students',
      href: '/admitted-students',
      icon: GraduationCap,
      roles: ['admin', 'sales'],
    },
  ];

  const filteredItems = sidebarItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  // Close mobile menu when a link is clicked
  const handleLinkClick = () => {
    onMobileMenuClose();
  };

  // Gradient colors for sidebar
  const lightGradient = 'linear-gradient(to bottom, #ffedd5, #e7e0ff)';
  const darkGradient = 'linear-gradient(to bottom, #78350f, #5b21b6)';
  const sidebarGradient = theme === 'dark' ? darkGradient : lightGradient;

  return (
    <>
      {/* Mobile Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col w-64 lg:hidden',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: sidebarGradient }}
      >
        {/* Mobile Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end">
          <button
            onClick={onMobileMenuClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Welcome Message - Mobile */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
            Welcome, {user?.name || 'User'}! 👋
          </h1>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <React.Fragment key={item.href}>
                <NavLink
                  to={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-colors relative',
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 mr-3" />
                  <span className="flex-1">{item.label}</span>
                  {/* Badge for "All Inquiries" */}
                  {item.href === '/inquiries' && unattendedCounts.total > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 dark:from-orange-600 dark:via-pink-600 dark:to-purple-600">
                      {unattendedCounts.total}
                    </span>
                  )}
                </NavLink>

                {/* Centers Menu - Right after "All Inquiries" */}
                {item.href === '/inquiries' && (user?.role === 'presales' || user?.role === 'sales' || user?.role === 'admin') && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setCentersOpen(!centersOpen)}
                      className={cn(
                        'flex items-center justify-between w-full px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-colors',
                        isCentersPage
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      )}
                    >
                      <div className="flex items-center flex-1">
                        <MapPin className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                        Centers
                      </div>
                      {/* Badge for Centers total */}
                      {(() => {
                        const totalCenterCount = locations.reduce((sum, loc) => sum + (unattendedCounts.byLocation[loc] || 0), 0);
                        return totalCenterCount > 0 ? (
                          <span className="mr-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 dark:from-orange-600 dark:via-pink-600 dark:to-purple-600">
                            {totalCenterCount}
                          </span>
                        ) : null;
                      })()}
                      {centersOpen ? (
                        <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                    
                    {centersOpen && (
                      <div className="ml-4 sm:ml-6 space-y-1">
                        {locations.map((locationName) => {
                          const locationPath = `/centers/${encodeURIComponent(locationName)}`;
                          const isLocationActive = location.pathname === locationPath;
                          
                          return (
                            <NavLink
                              key={locationName}
                              to={locationPath}
                              onClick={handleLinkClick}
                              className={cn(
                                'flex items-center px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base transition-colors relative',
                                isLocationActive
                                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200 font-medium'
                                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                              )}
                            >
                              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                              <span className="flex-1">{locationName}</span>
                              {/* Badge for each location */}
                              {(() => {
                                const locationCount = unattendedCounts.byLocation[locationName] || 0;
                                return locationCount > 0 ? (
                                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 dark:from-orange-600 dark:via-pink-600 dark:to-purple-600">
                                    {locationCount}
                                  </span>
                                ) : null;
                              })()}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Mobile Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {user?.name}
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - Hidden on mobile, visible on desktop */}
      <aside 
        className={cn(
          'shadow-lg transition-all duration-300 flex-col h-full',
          'hidden', // Hidden by default (mobile)
          'lg:flex', // Flex on large screens (desktop)
          isCollapsed ? 'w-16' : 'w-64'
        )}
        style={{ background: sidebarGradient }}
      >
        {/* Header - Welcome Message and Collapse Button */}
        <div className="px-4 xl:px-6 py-3 xl:py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-base xl:text-lg font-bold text-gray-900 dark:text-white truncate flex-1 min-w-0">
              Welcome, {user?.name || 'User'}! 👋
            </h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 xl:p-4 space-y-1 xl:space-y-2 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <React.Fragment key={item.href}>
                <NavLink
                  to={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                    isCollapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className={cn(
                    'flex-shrink-0',
                    isCollapsed ? 'h-7 w-7' : 'h-5 w-5',
                    !isCollapsed && 'mr-3'
                  )} />
                  {!isCollapsed && (
                    <span className="flex-1">{item.label}</span>
                  )}
                  {/* Badge for "All Inquiries" */}
                  {item.href === '/inquiries' && !isCollapsed && unattendedCounts.total > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 dark:from-orange-600 dark:via-pink-600 dark:to-purple-600">
                      {unattendedCounts.total}
                    </span>
                  )}
                </NavLink>

                {/* Centers Menu - Right after "All Inquiries" */}
                {item.href === '/inquiries' && (user?.role === 'presales' || user?.role === 'sales' || user?.role === 'admin') && (
                  <div className="space-y-1">
                    {isCollapsed ? (
                      // Collapsed state: Show just the Centers icon
                      <button
                        onClick={() => setCentersOpen(!centersOpen)}
                        className={cn(
                          'flex items-center justify-center w-full px-0 py-2 rounded-lg text-sm font-medium transition-colors relative',
                          isCentersPage
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        )}
                        title="Centers"
                      >
                        <MapPin className={cn(
                          'flex-shrink-0 h-7 w-7',
                          isCentersPage ? 'text-primary-700 dark:text-primary-200' : ''
                        )} />
                      </button>
                    ) : (
                      // Expanded state: Show full Centers menu
                      <>
                        <button
                          onClick={() => setCentersOpen(!centersOpen)}
                          className={cn(
                            'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            isCentersPage
                              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          )}
                        >
                          <div className="flex items-center flex-1">
                            <MapPin className="h-5 w-5 mr-3" />
                            Centers
                          </div>
                          {/* Badge for Centers total */}
                          {(() => {
                            const totalCenterCount = locations.reduce((sum, loc) => sum + (unattendedCounts.byLocation[loc] || 0), 0);
                            return totalCenterCount > 0 ? (
                              <span className="mr-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 dark:from-orange-600 dark:via-pink-600 dark:to-purple-600">
                                {totalCenterCount}
                              </span>
                            ) : null;
                          })()}
                          {centersOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        
                        {centersOpen && (
                          <div className="ml-4 space-y-1">
                            {locations.map((locationName) => {
                              const locationPath = `/centers/${encodeURIComponent(locationName)}`;
                              const isLocationActive = location.pathname === locationPath;
                              
                              return (
                                <NavLink
                                  key={locationName}
                                  to={locationPath}
                                  className={cn(
                                    'flex items-center px-3 py-2 rounded-lg text-sm transition-colors relative',
                                    isLocationActive
                                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200 font-medium'
                                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                                  )}
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  <span className="flex-1">{locationName}</span>
                                  {/* Badge for each location */}
                                  {(() => {
                                    const locationCount = unattendedCounts.byLocation[locationName] || 0;
                                    return locationCount > 0 ? (
                                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 dark:from-orange-600 dark:via-pink-600 dark:to-purple-600">
                                        {locationCount}
                                      </span>
                                    ) : null;
                                  })()}
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 xl:p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 truncate">
                {user?.name}
              </div>
            )}
            <button
              onClick={toggleTheme}
              className={cn(
                'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                isCollapsed && 'w-full'
              )}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
