import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Mail, Phone, MapPin, BookOpen, Building, MessageSquare, Thermometer, FileText, GraduationCap, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { cn } from '@/utils/cn';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CourseType, LocationType, MediumType, InquiryStatus } from '@/types';
import { useQuery } from 'react-query';
import apiService from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface CreateInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInquiryData) => Promise<void>;
  hideStatus?: boolean; // New prop to hide status field
  onMoveToUnattended?: (inquiryId: string) => Promise<void>; // New prop for move to unattended action
}

interface CreateInquiryData {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  city: string;
  education: string;
  course: CourseType;
  preferredLocation: LocationType;
  medium: MediumType;
  message: string;
  status?: InquiryStatus; // Made optional for users
}

const CreateInquiryModal: React.FC<CreateInquiryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  hideStatus = false,
  onMoveToUnattended,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [duplicateInquiryId, setDuplicateInquiryId] = useState<string | null>(null);
  const [isAssigned, setIsAssigned] = useState(false);
  const [isMovingToUnattended, setIsMovingToUnattended] = useState(false);

  // Country codes list
  const countryCodes = [
    { code: '+91', country: 'India' },
    { code: '+92', country: 'Pakistan' },
    { code: '+1', country: 'USA/Canada' },
    { code: '+44', country: 'UK' },
    { code: '+61', country: 'Australia' },
    { code: '+971', country: 'UAE' },
    { code: '+966', country: 'Saudi Arabia' },
    { code: '+65', country: 'Singapore' },
    { code: '+60', country: 'Malaysia' },
    { code: '+880', country: 'Bangladesh' },
    { code: '+94', country: 'Sri Lanka' },
    { code: '+977', country: 'Nepal' },
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    trigger,
    setError,
    clearErrors,
    setValue,
  } = useForm<CreateInquiryData>({
    defaultValues: {
      status: 'warm',
      countryCode: '+91', // Default to India
    },
    mode: 'onChange',
  });

  // Watch all fields for real-time validation
  const watchedValues = watch();

  // Function to check if phone number exists
  const checkPhoneNumber = async (phone: string, countryCode: string): Promise<boolean> => {
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      setPhoneExists(false);
      setDuplicateInquiryId(null);
      setIsAssigned(false);
      clearErrors('phone');
      return false;
    }

    // Combine country code and phone number
    const fullPhoneNumber = `${countryCode}${phone}`;

    try {
      setCheckingPhone(true);
      const response = await apiService.inquiries.checkPhoneExists(fullPhoneNumber);
      const exists = response.data?.exists || false;
      const inquiryId = response.data?.inquiryId || null;
      const assigned = response.data?.isAssigned || false;
      
      setPhoneExists(exists);
      setDuplicateInquiryId(inquiryId);
      setIsAssigned(assigned);
      
      if (exists) {
        setError('phone', {
          type: 'manual',
          message: 'This phone number already exists',
        });
      } else {
        clearErrors('phone');
      }
      return exists;
    } catch (error) {
      console.error('Error checking phone number:', error);
      // Don't block submission if check fails
      setPhoneExists(false);
      setDuplicateInquiryId(null);
      setIsAssigned(false);
      return false;
    } finally {
      setCheckingPhone(false);
    }
  };

  const { data: optionsData } = useQuery('options', () => apiService.options.get(), { staleTime: 5 * 60 * 1000 });
  const dynCourses: string[] = optionsData?.data?.courses || ['CDEC', 'X-DSAAI', 'DevOps', 'Full-Stack', 'Any'];
  const dynLocations: string[] = optionsData?.data?.locations || ['Nagpur', 'Pune', 'Nashik', 'Indore'];
  const dynStatuses: string[] = optionsData?.data?.statuses || ['hot', 'warm', 'cold'];

  const handleFormSubmit = async (data: CreateInquiryData) => {
    // Check phone number one more time before submission
    if (data.phone && /^[0-9]{10}$/.test(data.phone)) {
      const exists = await checkPhoneNumber(data.phone, data.countryCode || '+91');
      if (exists) {
        toast.error('This phone number already exists. Please use a different number.');
        return; // Don't submit if phone exists
      }
    }

    try {
      setIsLoading(true);
      // Combine country code and phone number before submitting
      const fullPhoneNumber = data.countryCode 
        ? `${data.countryCode}${data.phone}` 
        : `+91${data.phone}`;
      
      const submitData = {
        ...data,
        phone: fullPhoneNumber,
      };
      
      await onSubmit(submitData);
      reset();
      setPhoneExists(false);
      setDuplicateInquiryId(null);
      setIsAssigned(false);
      onClose();
    } catch (error: any) {
      console.error('Error creating inquiry:', error);
      // Error toast is handled in parent component (Navbar.tsx), but show additional error if needed
      if (error?.response?.data?.message && !error?.response?.data?.message.includes('already exists')) {
        toast.error(error.response.data.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveToUnattended = async () => {
    if (!duplicateInquiryId || !onMoveToUnattended) {
      return;
    }

    try {
      setIsMovingToUnattended(true);
      await onMoveToUnattended(duplicateInquiryId);
      // Reset form and close modal after successful move
      reset();
      setPhoneExists(false);
      setDuplicateInquiryId(null);
      setIsAssigned(false);
      onClose();
      toast.success('Inquiry moved to unattended successfully!');
    } catch (error: any) {
      console.error('Error moving to unattended:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to move inquiry to unattended. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsMovingToUnattended(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isMovingToUnattended) {
      reset();
      setPhoneExists(false);
      setDuplicateInquiryId(null);
      setIsAssigned(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-xs"
              onClick={handleClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-black rounded-t-lg">
                <h2 className="text-xl font-semibold text-white">
                  Create New Inquiry
                </h2>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-white disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(handleFormSubmit)} className="px-6 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('name', {
                          required: 'Name is required',
                          minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters',
                          },
                          maxLength: {
                            value: 50,
                            message: 'Name cannot exceed 50 characters',
                          },
                        })}
                        type="text"
                        onBlur={() => trigger('name')}
                        className={cn(
                          'input pl-10 pr-10',
                          errors.name && watchedValues.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '',
                          !errors.name && watchedValues.name && watchedValues.name.length >= 2 ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''
                        )}
                        placeholder="Enter full name"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {errors.name && watchedValues.name && (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        {!errors.name && watchedValues.name && watchedValues.name.length >= 2 && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('email', {
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'The email address must include @',
                          },
                        })}
                        type="email"
                        onBlur={() => trigger('email')}
                        className={cn(
                          'input pl-10 pr-10',
                          errors.email && watchedValues.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '',
                          !errors.email && watchedValues.email && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(watchedValues.email) ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''
                        )}
                        placeholder="Enter email address"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {errors.email && watchedValues.email && (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        {!errors.email && watchedValues.email && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(watchedValues.email) && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number *
                    </label>
                    <div className="flex gap-2">
                      {/* Country Code Selector */}
                      <div className="relative w-32">
                        <select
                          {...register('countryCode', {
                            required: 'Country code is required',
                          })}
                          onChange={async (e) => {
                            setValue('countryCode', e.target.value);
                            // Re-check phone if phone number is already entered
                            if (watchedValues.phone && /^[0-9]{10}$/.test(watchedValues.phone)) {
                              await checkPhoneNumber(watchedValues.phone, e.target.value);
                            }
                          }}
                          className={cn(
                            'input',
                            errors.countryCode && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          )}
                        >
                          {countryCodes.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.code} ({country.country})
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Phone Number Input */}
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...(() => {
                            const { onChange: registerOnChange, onBlur: registerOnBlur, ...rest } = register('phone', {
                              required: 'Phone number is required',
                              pattern: {
                                value: /^[0-9]{10}$/,
                                message: 'Please enter a valid 10-digit phone number',
                              },
                            });
                            return {
                              ...rest,
                              onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value;
                                // Only allow digits
                                const digitsOnly = value.replace(/\D/g, '');
                                // Update the input value to only digits
                                e.target.value = digitsOnly;
                                // Update form value using setValue - this will trigger validation
                                setValue('phone', digitsOnly, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                                // Check phone number if valid
                                if (digitsOnly && /^[0-9]{10}$/.test(digitsOnly)) {
                                  await checkPhoneNumber(digitsOnly, watchedValues.countryCode || '+91');
                                } else {
                                  setPhoneExists(false);
                                  if (digitsOnly.length === 0) {
                                    clearErrors('phone');
                                  }
                                }
                              },
                              onBlur: async (e: React.FocusEvent<HTMLInputElement>) => {
                                // Call register's onBlur first
                                registerOnBlur(e);
                                // Trigger validation
                                await trigger('phone');
                                const value = e.target.value.replace(/\D/g, '');
                                if (value && /^[0-9]{10}$/.test(value)) {
                                  await checkPhoneNumber(value, watchedValues.countryCode || '+91');
                                }
                              },
                            };
                          })()}
                          type="tel"
                          className={cn(
                            'input pl-10 pr-10',
                            (errors.phone || phoneExists) && watchedValues.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '',
                            !errors.phone && !phoneExists && watchedValues.phone && /^[0-9]{10}$/.test(watchedValues.phone) ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''
                          )}
                          placeholder="Ex: 1234567890"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          {checkingPhone && (
                            <LoadingSpinner size="sm" />
                          )}
                          {!checkingPhone && (errors.phone || phoneExists) && watchedValues.phone && (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          {!checkingPhone && !errors.phone && !phoneExists && watchedValues.phone && /^[0-9]{10}$/.test(watchedValues.phone) && (
                            <Check className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                    {(errors.phone || phoneExists) && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {phoneExists ? 'This phone number already exists' : errors.phone?.message}
                      </p>
                    )}
                    {errors.countryCode && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.countryCode.message}
                      </p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('city', {
                          required: 'City is required',
                          minLength: {
                            value: 2,
                            message: 'City must be at least 2 characters',
                          },
                          maxLength: {
                            value: 30,
                            message: 'City cannot exceed 30 characters',
                          },
                        })}
                        type="text"
                        onBlur={() => trigger('city')}
                        className={cn(
                          'input pl-10 pr-10',
                          errors.city && watchedValues.city ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '',
                          !errors.city && watchedValues.city && watchedValues.city.length >= 2 ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''
                        )}
                        placeholder="Enter city name"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {errors.city && watchedValues.city && (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        {!errors.city && watchedValues.city && watchedValues.city.length >= 2 && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.city.message}
                      </p>
                    )}
                  </div>

              {/* Education */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Education *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <GraduationCap className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('education', {
                      required: 'Education is required',
                      minLength: { value: 2, message: 'Education must be at least 2 characters' },
                      maxLength: { value: 100, message: 'Education cannot exceed 100 characters' }
                    })}
                    type="text"
                    onBlur={() => trigger('education')}
                    className={cn(
                      'input pl-10 pr-10',
                      errors.education && watchedValues.education ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '',
                      !errors.education && watchedValues.education && watchedValues.education.length >= 2 ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''
                    )}
                    placeholder="e.g., B.Sc. Computer Science"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {errors.education && watchedValues.education && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    {!errors.education && watchedValues.education && watchedValues.education.length >= 2 && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
                {errors.education && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.education.message}
                  </p>
                )}
              </div>

                  {/* Course */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preffered Course *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BookOpen className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        {...register('course', { required: 'Course selection is required' })}
                        className={cn(
                          'input pl-10',
                          errors.course && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        )}
                      >
                        <option value="">Select a course</option>
                        {dynCourses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    {errors.course && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.course.message}
                      </p>
                    )}
                  </div>

                  {/* Preferred Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Location *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        {...register('preferredLocation', { required: 'Preferred location is required' })}
                        className={cn(
                          'input pl-10',
                          errors.preferredLocation && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        )}
                      >
                        <option value="">Select location</option>
                        {dynLocations.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    {errors.preferredLocation && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.preferredLocation.message}
                      </p>
                    )}
                  </div>

                  {/* Medium */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Enquiry Source *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MessageSquare className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        {...register('medium', { required: 'Medium is required' })}
                        className={cn(
                          'input pl-10',
                          errors.medium && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        )}
                      >
                        <option value="">Select Source</option>
                        <option value="IVR">IVR</option>
                        <option value="Email">Email</option>
                        <option value="WhatsApp">WhatsApp</option>
                      </select>
                    </div>
                    {errors.medium && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.medium.message}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Message
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                        <FileText className="h-5 w-5 text-gray-400" />
                      </div>
                      <textarea
                        {...register('message', {
                          maxLength: {
                            value: 1000,
                            message: 'Message cannot exceed 1000 characters',
                          },
                        })}
                        rows={4}
                        onBlur={() => trigger('message')}
                        className={cn(
                          'input pl-10 pr-10 resize-none',
                          errors.message && watchedValues.message ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '',
                          !errors.message && watchedValues.message && watchedValues.message.length > 0 ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''
                        )}
                        placeholder="Enter your inquiry message..."
                      />
                      <div className="absolute top-3 right-3 flex items-start pointer-events-none">
                        {errors.message && watchedValues.message && (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        {!errors.message && watchedValues.message && watchedValues.message.length > 0 && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  {/* Status - Hidden for regular users */}
                  {!hideStatus && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Thermometer className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          {...register('status')}
                          className="input pl-10"
                        >
                          {dynStatuses.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading || isMovingToUnattended}
                    className="btn btn-cancel px-2"
                  >
                    Cancel
                  </button>
                  {/* Show Move to Unattended button only if duplicate found, inquiry is assigned, and user has permission */}
                  {phoneExists && duplicateInquiryId && isAssigned && onMoveToUnattended && 
                   (user?.role === 'sales' || user?.role === 'presales' || user?.role === 'admin') && (
                    <button
                      type="button"
                      onClick={handleMoveToUnattended}
                      disabled={isLoading || isMovingToUnattended}
                      className={cn(
                        'btn btn-outline px-4 py-2',
                        (isLoading || isMovingToUnattended) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isMovingToUnattended ? (
                        <div className="flex items-center">
                          <LoadingSpinner size="sm" className="mr-2" />
                          Moving...
                        </div>
                      ) : (
                        'Move to Unattended'
                      )}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || isMovingToUnattended}
                    className={cn(
                      'btn btn-primary px-4 py-2',
                      (isLoading || isMovingToUnattended) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <LoadingSpinner size="sm" className="mr-2" />
                        Creating...
                      </div>
                    ) : (
                      'Create Inquiry'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateInquiryModal;
