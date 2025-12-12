import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

// Pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Inquiries from '@/pages/Inquiries';
import PresalesAssigned from '@/pages/PresalesAssigned';
import SalesAssigned from '@/pages/SalesAssigned';
import MyInquiries from '@/pages/MyInquiries';
import MyFollowUps from '@/pages/MyFollowUps';
import SalesMyFollowUps from '@/pages/SalesMyFollowUps';
import Users from '@/pages/Users';
import ManageOptions from '@/pages/ManageOptions';
import InquiryDetails from '@/pages/InquiryDetails';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';
import CenterInquiries from '@/pages/CenterInquiries';
import PresalesInquiries from '@/pages/PresalesInquiries';
import SalesInquiries from '@/pages/SalesInquiries';
import AdmittedStudents from '@/pages/AdmittedStudents';
import AdminMyAttendedInquiries from '@/pages/AdminMyAttendedInquiries';
import AdminMyRaisedInquiries from '@/pages/AdminMyRaisedInquiries';

// Components
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({
  children,
  roles,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inquiries" element={<Inquiries />} />
        <Route path="inquiries/:id" element={<InquiryDetails />} />
        <Route 
          path="admin/presales-inquiries" 
          element={
            <ProtectedRoute roles={['admin']}>
              <PresalesInquiries />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin/sales-inquiries" 
          element={
            <ProtectedRoute roles={['admin']}>
              <SalesInquiries />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admitted-students" 
          element={
            <ProtectedRoute roles={['admin', 'sales']}>
              <AdmittedStudents />
            </ProtectedRoute>
          } 
        />
        <Route path="my-inquiries" element={<MyInquiries />} />
        <Route path="my-follow-ups" element={<ProtectedRoute roles={['presales']}><MyFollowUps /></ProtectedRoute>} />
        <Route path="sales/my-follow-ups" element={<ProtectedRoute roles={['sales']}><SalesMyFollowUps /></ProtectedRoute>} />
        <Route path="presales/assigned" element={<ProtectedRoute roles={['presales']}><PresalesAssigned /></ProtectedRoute>} />
        <Route path="sales/assigned" element={<ProtectedRoute roles={['sales']}><SalesAssigned /></ProtectedRoute>} />
        <Route path="admin/my-attended-inquiries" element={<ProtectedRoute roles={['admin']}><AdminMyAttendedInquiries /></ProtectedRoute>} />
        <Route path="admin/my-raised-inquiries" element={<ProtectedRoute roles={['admin']}><AdminMyRaisedInquiries /></ProtectedRoute>} />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="manage-options"
          element={
            <ProtectedRoute roles={['admin']}>
              <ManageOptions />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route 
          path="centers/:centerLocation" 
          element={
            <ProtectedRoute roles={['presales', 'sales', 'admin']}>
              <CenterInquiries />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const ThemedShell: React.FC = () => {
  const { theme } = useTheme();
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${theme === 'dark' ? 'dark' : ''}`}>
      <AppRoutes />
      <ToastContainer
        position="top-right"
        autoClose={6000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        toastStyle={{
          fontSize: '14px',
          fontWeight: '500',
        }}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <ThemedShell />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
