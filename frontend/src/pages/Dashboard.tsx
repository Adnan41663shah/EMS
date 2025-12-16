import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  Users, 
  FileText, 
  Clock, 
  AlertCircle,
  XCircle,
  Activity,
  BarChart3,
  Download,
  Filter,
  Database,
  GraduationCap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/services/api';
import { DashboardStats, Inquiry } from '@/types';
import { cn } from '@/utils/cn';
import LoadingSpinner from '@/components/LoadingSpinner';
import DataTab from '@/components/DataTab';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { convertInquiriesToCSV, downloadCSV } from '@/utils/exportCSV';

type TabType = 'overview' | 'analytics' | 'reports' | 'data';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');

  const { data, isLoading, error } = useQuery(
    'dashboard-stats',
    () => apiService.inquiries.getDashboardStats(),
    {
      refetchInterval: 60000,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch all inquiries for analytics (only for admin)
  const { data: allInquiriesData, isLoading: isLoadingInquiries } = useQuery(
    ['all-inquiries-analytics', dateRange],
    () => {
      const dateTo = new Date();
      const dateFrom = new Date();
      
      if (dateRange === '7d') {
        dateFrom.setDate(dateFrom.getDate() - 7);
      } else if (dateRange === '30d') {
        dateFrom.setDate(dateFrom.getDate() - 30);
      } else if (dateRange === '90d') {
        dateFrom.setDate(dateFrom.getDate() - 90);
      }
      
      return apiService.inquiries.getAll({
        limit: 1000,
        page: 1,
        ...(dateRange !== 'all' && {
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0]
        })
      });
    },
    {
      enabled: user?.role === 'admin' && activeTab !== 'overview',
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (data?.success && data.data) {
      setStats(data.data);
    }
  }, [data]);

  // Reset activeTab to 'overview' if sales or presales user somehow gets to analytics/reports tab
  useEffect(() => {
    if (user?.role !== 'admin' && (activeTab === 'analytics' || activeTab === 'reports')) {
      setActiveTab('overview');
    }
  }, [user?.role, activeTab]);

  // Process data for charts - must be before early returns
  const inquiries: Inquiry[] = allInquiriesData?.data?.inquiries || [];

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    inquiries.forEach(inq => {
      const status = inq.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  }, [inquiries]);

  // Course distribution for bar chart
  const courseData = useMemo(() => {
    const courseCounts: Record<string, number> = {};
    inquiries.forEach(inq => {
      const course = inq.course || 'Unknown';
      courseCounts[course] = (courseCounts[course] || 0) + 1;
    });
    return Object.entries(courseCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [inquiries]);

  // Location distribution for bar chart
  const locationData = useMemo(() => {
    const locationCounts: Record<string, number> = {};
    inquiries.forEach(inq => {
      const location = inq.preferredLocation || 'Unknown';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });
    return Object.entries(locationCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [inquiries]);

  // Department distribution for bar chart
  const departmentData = useMemo(() => {
    const deptCounts: Record<string, number> = {};
    inquiries.forEach(inq => {
      const dept = inq.department || 'Unknown';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    return Object.entries(deptCounts)
      .map(([name, value]) => ({ 
        name: name === 'presales' ? 'Presales' : name === 'sales' ? 'Sales' : name,
        value 
      }))
      .sort((a, b) => b.value - a.value);
  }, [inquiries]);

  // Time-based data (inquiries over time)
  const timeSeriesData = useMemo(() => {
    if (inquiries.length === 0) return [];
    
    const daysMap: Record<string, number> = {};
    
    if (dateRange === 'all') {
      // For 'all time', group by actual dates from the data
      inquiries.forEach(inq => {
        const dateStr = new Date(inq.createdAt).toISOString().split('T')[0];
        daysMap[dateStr] = (daysMap[dateStr] || 0) + 1;
      });
      
      // Sort by date and return
      return Object.entries(daysMap)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          inquiries: count
        }));
    } else {
      // For specific ranges, initialize all days first
      const today = new Date();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      
      // Initialize all days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        daysMap[dateStr] = 0;
      }
      
      // Count inquiries per day
      inquiries.forEach(inq => {
        const dateStr = new Date(inq.createdAt).toISOString().split('T')[0];
        if (daysMap.hasOwnProperty(dateStr)) {
          daysMap[dateStr]++;
        }
      });
      
      return Object.entries(daysMap)
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          inquiries: count
        }));
    }
  }, [inquiries, dateRange]);

  const COLORS = ['#3b82f6', '#ef4444', '#eab308', '#6b7280', '#10b981', '#8b5cf6'];

  const handleExportReport = () => {
    if (inquiries.length === 0) return;
    const csv = convertInquiriesToCSV(inquiries);
    downloadCSV(csv, `inquiry-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Filter tabs based on user role - sales and presales users don't see analytics/reports/data
  const tabs = useMemo(() => {
    const allTabs = [
      { id: 'overview' as TabType, label: 'Overview', icon: Activity },
      { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
      { id: 'reports' as TabType, label: 'Reports', icon: FileText },
      { id: 'data' as TabType, label: 'Data', icon: Database },
    ];
    
    // For non-admin roles, only show overview tab
    if (user?.role !== 'admin') {
      return allTabs.filter(tab => tab.id === 'overview');
    }
    
    return allTabs;
  }, [user?.role]);

  // Stat cards - different for admin vs other roles
  const statCards = useMemo(() => {
    if (user?.role === 'admin') {
      return [
        {
          title: 'Total Inquiries',
          value: stats?.totalInquiries || 0,
          icon: FileText,
          color: 'bg-blue-500',
        },
        {
          title: 'Presales Inquiries',
          value: stats?.presalesInquiries || 0,
          icon: Users,
          color: 'bg-green-500',
        },
        {
          title: 'Sales Inquiries',
          value: stats?.salesInquiries || 0,
          icon: Activity,
          color: 'bg-purple-500',
        },
        {
          title: 'Admitted Students',
          value: stats?.admittedStudents || 0,
          icon: GraduationCap,
          color: 'bg-orange-500',
        },
      ];
    } else {
      // For non-admin roles, keep the original stats
      return [
        {
          title: 'Total Inquiries',
          value: stats?.totalInquiries || 0,
          icon: FileText,
          color: 'bg-blue-500',
        },
        {
          title: 'Hot Inquiries',
          value: stats?.hotInquiries || 0,
          icon: AlertCircle,
          color: 'bg-red-500',
        },
        {
          title: 'Warm Inquiries',
          value: stats?.warmInquiries || 0,
          icon: Clock,
          color: 'bg-yellow-500',
        },
        {
          title: 'Cold Inquiries',
          value: stats?.coldInquiries || 0,
          icon: XCircle,
          color: 'bg-gray-500',
        },
        {
          title: 'My Raised Inquiries',
          value: stats?.myInquiries || 0,
          icon: Users,
          color: 'bg-green-500',
        },
        {
          title: 'My Attended Inquiries',
          value: stats?.assignedInquiries || 0,
          icon: Activity,
          color: 'bg-purple-500',
        },
      ];
    }
  }, [user?.role, stats]);

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
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          Error loading dashboard
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Analytics Dashboard
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Welcome back! Here's what's happening with your inquiries.
        </p>
        </div>
        {((activeTab === 'analytics' || activeTab === 'reports') && user?.role === 'admin') && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="input text-xs sm:text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 sm:space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="card"
            >
              <div className="card-content">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={cn('p-3 rounded-lg', card.color)}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {card.title}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                          {card.value}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

          {/* Recent Inquiries */}
          {stats?.recentInquiries && stats.recentInquiries.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Inquiries</h2>
              </div>
              <div className="card-content">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Course</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {stats.recentInquiries.slice(0, 5).map((inquiry) => (
                        <tr key={inquiry._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 dark:text-white">{inquiry.name}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 dark:text-white">{inquiry.course}</td>
                          <td className="px-3 py-1 whitespace-nowrap">
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              inquiry.status === 'hot' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              inquiry.status === 'warm' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            )}>
                              {inquiry.status}
                            </span>
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                            {new Date(inquiry.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'analytics' && user?.role === 'admin' && (
        <div className="space-y-4 sm:space-y-6">
          {isLoadingInquiries ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Status Distribution Pie Chart */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Inquiries by Status</h3>
                  </div>
                  <div className="card-content">
                    {statusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        No data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Department Distribution Pie Chart */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Inquiries by Department</h3>
                  </div>
                  <div className="card-content">
                    {departmentData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={departmentData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {departmentData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        No data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Course Distribution Bar Chart */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Inquiries by Course</h3>
                  </div>
                  <div className="card-content">
                    {courseData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={courseData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        No data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Distribution Bar Chart */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Inquiries by Location</h3>
                  </div>
                  <div className="card-content">
                    {locationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={locationData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        No data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Series Chart */}
                <div className="card lg:col-span-2">
                  <div className="card-header">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Inquiries Over Time</h3>
                  </div>
                  <div className="card-content">
                    {timeSeriesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="inquiries" stroke="#8b5cf6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        No data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'reports' && user?.role === 'admin' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Inquiry Reports</h3>
                <button
                  onClick={handleExportReport}
                  disabled={isLoadingInquiries || inquiries.length === 0}
                  className="btn btn-primary btn-sm flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            </div>
            <div className="card-content">
              {isLoadingInquiries ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Inquiries</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{inquiries.length}</div>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Hot Inquiries</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {inquiries.filter(i => i.status === 'hot').length}
                      </div>
                    </div>
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Warm Inquiries</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {inquiries.filter(i => i.status === 'warm').length}
                      </div>
                    </div>
                  </div>
                  
                  {inquiries.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Course</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {inquiries.slice(0, 10).map((inquiry) => (
                            <tr key={inquiry._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 dark:text-white">{inquiry.name}</td>
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 dark:text-white">{inquiry.email || '-'}</td>
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 dark:text-white">{inquiry.phone}</td>
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 dark:text-white">{inquiry.course}</td>
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 dark:text-white">{inquiry.preferredLocation}</td>
                              <td className="px-3 py-1 whitespace-nowrap">
                                <span className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                  inquiry.status === 'hot' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  inquiry.status === 'warm' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                )}>
                                  {inquiry.status}
                                </span>
                              </td>
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                                {new Date(inquiry.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {inquiries.length > 10 && (
                        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Showing 10 of {inquiries.length} inquiries. Export CSV to see all.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No inquiries found for the selected period.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics and Reports are only available for admin */}
      {activeTab === 'analytics' && user?.role !== 'admin' && (
        <div className="card">
          <div className="card-content text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Analytics available for admin only
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Please contact your administrator for access.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'reports' && user?.role !== 'admin' && (
        <div className="card">
          <div className="card-content text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Reports available for admin only
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Please contact your administrator for access.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'data' && user?.role === 'admin' && <DataTab />}
    </div>
  );
};

export default Dashboard;
