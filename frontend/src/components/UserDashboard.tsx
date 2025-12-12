import React from 'react';
import { useQuery } from 'react-query';
import { 
  FileText, 
  Clock, 
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiService from '@/services/api';
import { Inquiry } from '@/types';
import { cn } from '@/utils/cn';
import LoadingSpinner from '@/components/LoadingSpinner';

const UserDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: inquiriesData, isLoading: inquiriesLoading } = useQuery(
    'user-inquiries',
    () => apiService.inquiries.getAll({ page: 1, limit: 5 }),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const inquiries = inquiriesData?.data?.inquiries || [];
  const totalInquiries = inquiriesData?.data?.pagination?.totalItems || 0;

  const recentInquiries = inquiries.slice(0, 5);

  const statCards = [
    {
      title: 'My Total Inquiries',
      value: totalInquiries,
      icon: FileText,
      color: 'bg-blue-500',
      description: 'All inquiries you created'
    },
    {
      title: 'Recent Activity',
      value: recentInquiries.length,
      icon: Clock,
      color: 'bg-green-500',
      description: 'Inquiries from last 5 entries'
    },
  ];

  if (inquiriesLoading) {
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
          My Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track and manage your inquiries
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/my-inquiries')}
        >
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-lg bg-green-500">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  View My Raised Inquiries
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage inquiries you created
                </p>
              </div>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {card.title}
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {card.value}
                      </dd>
                      <dd className="text-xs text-gray-500 dark:text-gray-400">
                        {card.description}
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="card"
      >
        <div className="card-header">
          <h3 className="card-title">Recent Inquiries</h3>
          <p className="card-description">
            Your latest inquiries
          </p>
        </div>
        <div className="card-content">
          <div className="space-y-4">
            {recentInquiries.length ? (
              recentInquiries.map((inquiry, index) => (
                <div
                  key={inquiry._id}
                  className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                          {inquiry.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {inquiry.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {inquiry.course} • {inquiry.preferredLocation}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(inquiry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No inquiries yet
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating your first inquiry.
                </p>
                <button
                  onClick={() => navigate('/my-inquiries')}
                  className="mt-4 btn btn-primary btn-sm"
                >
                  View My Inquiries
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserDashboard;
