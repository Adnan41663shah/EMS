import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/utils/cn';
import LoadingSpinner from '@/components/LoadingSpinner';
import { SIGNUP_ROLES } from '@/utils/constants';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  role: string;
}

const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      role: 'user',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      const { confirmPassword, ...userData } = data;
      await registerUser(userData as any);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF9F3] relative overflow-hidden">
      {/* Background dot pattern */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, #FFB88C 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />
      
      {/* Top orange border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF6B35]" />

      {/* Header */}
      <header className="relative z-10 bg-white px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/login"
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-medium text-gray-700 bg-white border border-[#FF6B35] rounded-lg hover:bg-[#FFF5F0] transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-medium text-white bg-[#FF6B35] rounded-lg hover:bg-[#E55A2B] transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-8 sm:mb-10">
            SIGN UP
          </h1>

          {/* Form */}
          <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Name */}
            <div>
              <label 
                htmlFor="name" 
                className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
              >
                Full Name
              </label>
              <input
                {...register('name', {
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
                type="text"
                autoComplete="name"
                className={cn(
                  'w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all',
                  errors.name && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                )}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                autoComplete="email"
                className={cn(
                  'w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all',
                  errors.email && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                )}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label 
                htmlFor="phone" 
                className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
              >
                Phone Number (Optional)
              </label>
              <input
                {...register('phone', {
                  validate: (value) => {
                    if (!value || value.trim() === '') return true; // Allow empty
                    return /^[0-9]{10}$/.test(value) || 'Please enter a valid 10-digit phone number';
                  },
                })}
                type="tel"
                autoComplete="tel"
                className={cn(
                  'w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all',
                  errors.phone && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                )}
                placeholder="Enter your phone number"
              />
              {errors.phone && (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label 
                htmlFor="role" 
                className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
              >
                Role
              </label>
              <select
                {...register('role', { required: 'Role is required' })}
                className={cn(
                  'w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all',
                  errors.role && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                )}
              >
                {SIGNUP_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn(
                    'w-full px-4 py-3 sm:py-3.5 pr-12 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all',
                    errors.password && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  )}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === password || 'Passwords do not match',
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn(
                    'w-full px-4 py-3 sm:py-3.5 pr-12 text-sm sm:text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all',
                    errors.confirmPassword && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  )}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: theme === 'dark' 
                  ? 'linear-gradient(to right, #c2410c, #be185d, #6d28d9)'
                  : 'linear-gradient(to right, #f97316, #ec4899, #8b5cf6)'
              }}
              className={cn(
                'w-full py-3 sm:py-3.5 text-sm sm:text-base font-medium text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2',
                isLoading && 'opacity-50 cursor-not-allowed',
                !isLoading && (theme === 'dark' 
                  ? 'hover:opacity-90' 
                  : 'hover:opacity-90')
              )}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = theme === 'dark'
                    ? 'linear-gradient(to right, #9a3412, #9f1239, #5b21b6)'
                    : 'linear-gradient(to right, #ea580c, #db2777, #7c3aed)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = theme === 'dark'
                    ? 'linear-gradient(to right, #c2410c, #be185d, #6d28d9)'
                    : 'linear-gradient(to right, #f97316, #ec4899, #8b5cf6)';
                }
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating account...
                </div>
              ) : (
                'Sign Up'
              )}
            </button>
          </div>

          {/* Legal text */}
          <p className="text-xs sm:text-sm text-gray-600 text-center px-2">
            By SignUp, you accept our{' '}
            <Link to="#" className="text-blue-600 hover:text-blue-700 underline">
              Terms of use
            </Link>
            ,{' '}
            <Link to="#" className="text-blue-600 hover:text-blue-700 underline">
              Privacy policy
            </Link>
            {' '}and{' '}
            <Link to="#" className="text-blue-600 hover:text-blue-700 underline">
              Refund policy
            </Link>
          </p>

          {/* Sign in link */}
          <p className="text-sm sm:text-base text-center">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Sign in
            </Link>
          </p>
        </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
