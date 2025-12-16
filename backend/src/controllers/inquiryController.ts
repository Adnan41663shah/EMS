import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Inquiry from '../models/Inquiry';
import Activity from '../models/Activity';
import User from '../models/User';
import OptionSettings from '../models/OptionSettings';
import logger from '../utils/logger';
import { ApiResponse, InquiryFilters, DashboardStats, InquiryStatus } from '../types';
import { notifyUsers } from '../utils/notify';

export const createInquiry = async (req: Request, res: Response) => {
  try {
    const inquiryData: any = {
      ...req.body,
      createdBy: req.user?._id
    };

    // Convert empty strings to undefined for optional fields
    if (inquiryData.email === '') {
      inquiryData.email = undefined;
    }
    if (inquiryData.message === '') {
      inquiryData.message = undefined;
    }

    // Set department based on user role
    // Sales users create inquiries in Sales department
    // All other users (presales, user, admin) create inquiries in Presales department
    const userRole = req.user?.role;
    if (userRole === 'sales') {
      inquiryData.department = 'sales';
    } else {
      inquiryData.department = 'presales';
    }
    
    if (!inquiryData.assignedTo) {
      inquiryData.assignmentStatus = 'not_assigned';
    }

    const inquiry = new Inquiry(inquiryData);
    await inquiry.save();

    // Populate the inquiry with user details
    await inquiry.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' }
    ]);


    const response: ApiResponse = {
      success: true,
      message: 'Inquiry created successfully',
      data: { inquiry }
    };

    res.status(201).json(response);

    // Activity log (non-blocking)
    try {
      await Activity.create({
        inquiry: inquiry._id,
        action: 'created',
        actor: req.user?._id!
      });
      await notifyUsers([], `Inquiry ${inquiry._id.toString()} created`);
    } catch (e) {
      logger.warn('Activity log failed (create):', e);
    }
  } catch (error) {
    logger.error('Create inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating inquiry'
    });
     return;
 }
};

export const getInquiries = async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      search,
      status,
      course,
      location,
      medium,
      assignedTo,
      createdBy,
      dateFrom,
      dateTo,
      sort = 'createdAt',
      order = 'desc'
    } = req.query as InquiryFilters;
    
    // If page/limit are not provided, return all results (for admin all inquiries page)
    const usePagination = page !== undefined && limit !== undefined;
    const pageNum = page ? (typeof page === 'string' ? parseInt(page, 10) : Number(page)) : 1;
    const limitNum = limit ? (typeof limit === 'string' ? parseInt(limit, 10) : Number(limit)) : 10;

    const query: any = {};
    const userRole = req.user?.role;
    const userId = req.user?._id;

    // Handle specific createdBy filter
    if (createdBy === 'me') {
      // Show only inquiries created by the current user
      query.createdBy = userId;
    } else {
      // Role-based filtering
      if (userRole === 'user') {
        // Users can only see inquiries they created
        query.createdBy = userId;
      } else if (userRole === 'presales') {
        // Presales can see all inquiries in Presales department (assigned or unassigned)
        // But exclude inquiries they forwarded to sales (those appear in "My Attended Inquiries")
        query.$and = [
          { department: 'presales' },
          {
            $or: [
              { forwardedBy: { $exists: false } },
              { forwardedBy: { $ne: userId } },
              { forwardedBy: null }
            ]
          }
        ];
      } else if (userRole === 'sales') {
        // Sales can see all inquiries in Sales department
        // This includes inquiries they created, assigned to them, and all other sales inquiries
        query.department = 'sales';
      }
      // Admin can see all inquiries - no additional filtering needed
    }

    // Apply filters
    if (search) {
      // Escape special regex characters in search query to prevent regex errors
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // For phone number search, search for both with and without the + prefix
      // This allows users to search with or without the + operator
      const phoneSearchQueries = [];
      
      // Always search for the exact escaped search term in phone
      phoneSearchQueries.push({ phone: { $regex: escapedSearch, $options: 'i' } });
      
      // If search starts with +, also search without +
      if (search.startsWith('+')) {
        const phoneWithoutPlus = escapedSearch.substring(2); // Remove \+
        if (phoneWithoutPlus) {
          phoneSearchQueries.push({ phone: { $regex: phoneWithoutPlus, $options: 'i' } });
        }
      } else {
        // If search doesn't start with +, also search with +
        phoneSearchQueries.push({ phone: { $regex: '\\+' + escapedSearch, $options: 'i' } });
      }
      
      // If there's already a role-based $or query, we need to combine them
      if (query.$or) {
        const searchQuery = {
          $or: [
            { name: { $regex: escapedSearch, $options: 'i' } },
            { email: { $regex: escapedSearch, $options: 'i' } },
            { city: { $regex: escapedSearch, $options: 'i' } },
            ...phoneSearchQueries
          ]
        };
        query.$and = [
          { $or: query.$or },
          searchQuery
        ];
        delete query.$or;
      } else {
        query.$or = [
          { name: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
          { city: { $regex: escapedSearch, $options: 'i' } },
          ...phoneSearchQueries
        ];
      }
    }

    if (status) query.status = status;
    
    // Handle assignedTo filter - for presales "My Attended Inquiries", include forwarded inquiries
    // This must completely override role-based filtering to allow forwarded inquiries in sales department
    if (assignedTo) {
      // Convert assignedTo to ObjectId for proper MongoDB comparison
      const assignedToObjectId = mongoose.Types.ObjectId.isValid(assignedTo) 
        ? new mongoose.Types.ObjectId(assignedTo) 
        : assignedTo;
        
      if (userRole === 'presales') {
        // For presales "My Attended Inquiries", we need to completely rebuild the query
        // to show both assigned inquiries (presales) and forwarded inquiries (sales)
        
        // Completely rebuild query, ignoring role-based filtering
        const newQuery: any = {};
        
        // Build the base query with assigned and forwarded inquiries
        const assignedQuery = { 
          assignedTo: assignedToObjectId,
          department: 'presales'
        };
        const forwardedQuery = {
          forwardedBy: assignedToObjectId,
          assignmentStatus: 'forwarded_to_sales',
          department: 'sales'
        };
        
        // Combine both in $or
        newQuery.$or = [
          assignedQuery,  // Inquiries assigned to user in presales department
          forwardedQuery  // Inquiries forwarded by user in sales department
        ];
        
        // Apply other filters
        if (status) newQuery.status = status;
        if (course) newQuery.course = course;
        if (location) newQuery.preferredLocation = location;
        if (medium) newQuery.medium = medium;
        if ((req.query as any).assignmentStatus) newQuery.assignmentStatus = (req.query as any).assignmentStatus;
        
        // Handle search - wrap in $and with $or query
        if (search) {
          const searchQuery = {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { city: { $regex: search, $options: 'i' } }
            ]
          };
          newQuery.$and = [
            { $or: newQuery.$or },
            searchQuery
          ];
          delete newQuery.$or;
        }
        
        // Handle date filters
        if (dateFrom || dateTo) {
          newQuery.createdAt = {};
          if (dateFrom) newQuery.createdAt.$gte = new Date(dateFrom);
          if (dateTo) newQuery.createdAt.$lte = new Date(dateTo);
        }
        
        // Replace query completely
        Object.keys(query).forEach(key => delete query[key]);
        Object.assign(query, newQuery);
      } else if (userRole === 'sales') {
        // For sales users, rebuild query completely to override role-based filtering
        const newQuery: any = {};
        
        // Build query for sales user's attended inquiries
        newQuery.assignedTo = assignedToObjectId;
        newQuery.department = 'sales';
        
        // Apply other filters
        if (status) newQuery.status = status;
        if (course) newQuery.course = course;
        if (location) newQuery.preferredLocation = location;
        if (medium) newQuery.medium = medium;
        if ((req.query as any).assignmentStatus) newQuery.assignmentStatus = (req.query as any).assignmentStatus;
        
        // Handle search
        if (search) {
          const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          newQuery.$or = [
            { name: { $regex: escapedSearch, $options: 'i' } },
            { email: { $regex: escapedSearch, $options: 'i' } },
            { city: { $regex: escapedSearch, $options: 'i' } }
          ];
        }
        
        // Handle date filters
        if (dateFrom || dateTo) {
          newQuery.createdAt = {};
          if (dateFrom) newQuery.createdAt.$gte = new Date(dateFrom);
          if (dateTo) newQuery.createdAt.$lte = new Date(dateTo);
        }
        
        // Replace query completely
        Object.keys(query).forEach(key => delete query[key]);
        Object.assign(query, newQuery);
      } else {
        // For admin users, use ObjectId for assignedTo
        query.assignedTo = assignedToObjectId;
        if ((req.query as any).department) query.department = (req.query as any).department;
        
        // Apply other filters for admin users
        if ((req.query as any).assignmentStatus) query.assignmentStatus = (req.query as any).assignmentStatus;
        if (course) query.course = course;
        if (location) query.preferredLocation = location;
        if (medium) query.medium = medium;
      }
    } else {
      // Only apply department filter if assignedTo is not set (normal filtering)
      if ((req.query as any).department) query.department = (req.query as any).department;
      if ((req.query as any).assignmentStatus) query.assignmentStatus = (req.query as any).assignmentStatus;
      if (course) query.course = course;
      if (location) query.preferredLocation = location;
      if (medium) query.medium = medium;
    }

    // Only apply date filters if not already handled in rebuilt query (for presales assignedTo case)
    if (!(assignedTo && userRole === 'presales') && (dateFrom || dateTo)) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj: any = {};
    sortObj[sort] = sortOrder;

    let inquiries;
    let total = await Inquiry.countDocuments(query);

    if (usePagination) {
      // Use pagination if page/limit are provided
      inquiries = await Inquiry.find(query)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('forwardedBy', 'name email')
        .sort(sortObj)
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);
    } else {
      // Return all results if pagination is not requested
      inquiries = await Inquiry.find(query)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('forwardedBy', 'name email')
        .sort(sortObj);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Inquiries retrieved successfully',
      data: {
        inquiries,
        ...(usePagination && {
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalItems: total,
            hasNext: pageNum < Math.ceil(total / limitNum),
            hasPrev: pageNum > 1
          }
        })
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Get inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inquiries'
    });
     return;
 }
};

export const getInquiryById = async (req: Request, res: Response) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('followUps.createdBy', 'name email');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check access permissions
    const userRole = req.user?.role;
    const createdById = typeof inquiry.createdBy === 'string' ? inquiry.createdBy : inquiry.createdBy._id;
    const assignedToId = typeof inquiry.assignedTo === 'string' ? inquiry.assignedTo : inquiry.assignedTo?._id;
    
    // Presales and admin can see all inquiries
    // Users can only see inquiries they created
    // Sales can see:
    // 1. Inquiries assigned to them
    // 2. Inquiries they created
    // 3. All inquiries in Sales department (e.g., forwarded from Presales)
    // This matches the logic in getInquiries function
    const canAccess = 
      userRole === 'admin' ||
      userRole === 'presales' ||
      (userRole === 'user' && createdById.toString() === req.user?._id?.toString()) ||
      (userRole === 'sales' && (
        assignedToId?.toString() === req.user?._id?.toString() || 
        createdById.toString() === req.user?._id?.toString() ||
        inquiry.department === 'sales'
      ));

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Inquiry retrieved successfully',
      data: { inquiry }
    };

    return res.json(response);
  } catch (error) {
    logger.error('Get inquiry by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching inquiry'
    });
  }
};

export const updateInquiry = async (req: Request, res: Response) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check permissions
    const userRole = req.user?.role;
    const canUpdate = 
      userRole === 'admin' ||
      userRole === 'presales' ||
      inquiry.createdBy.toString() === req.user?._id?.toString() ||
      inquiry.assignedTo?.toString() === req.user?._id?.toString();

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('assignedTo', 'name email');

    const response: ApiResponse = {
      success: true,
      message: 'Inquiry updated successfully',
      data: { inquiry: updatedInquiry }
    };

    res.json(response);
  } catch (error) {
    logger.error('Update inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating inquiry'
    });
     return;
 }
};

export const deleteInquiry = async (req: Request, res: Response) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Admin, presales, or creator can delete
    const canDelete = 
      req.user?.role === 'admin' ||
      req.user?.role === 'presales' ||
      inquiry.createdBy.toString() === req.user?._id?.toString();

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Inquiry.findByIdAndDelete(req.params.id);

    const response: ApiResponse = {
      success: true,
      message: 'Inquiry deleted successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Delete inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting inquiry'
    });
     return;
 }
};

export const assignInquiry = async (req: Request, res: Response) => {
  try {
    const { assignedTo } = req.body;
    const inquiryId = req.params.id;

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check if user exists
    const user = await User.findById(assignedTo);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    inquiry.assignedTo = assignedTo;
    inquiry.assignmentStatus = 'assigned';
    inquiry.department = 'presales';
    await inquiry.save();

    // Activity
    try {
      await Activity.create({
        inquiry: inquiry._id,
        action: 'assigned',
        actor: req.user?._id!,
        targetUser: assignedTo
      });
      await notifyUsers([String(assignedTo)], `Inquiry ${inquiry._id.toString()} assigned to you`);
    } catch (e) {
      logger.warn('Activity log failed (assign):', e);
    }


    const response: ApiResponse = {
      success: true,
      message: 'Inquiry assigned successfully',
      data: { inquiry }
    };

    res.json(response);
  } catch (error) {
    logger.error('Assign inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning inquiry'
    });
     return;
 }
};

export const claimInquiry = async (req: Request, res: Response) => {
  try {
    const inquiryId = req.params.id;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Presales can only claim presales department inquiries
    // Sales can only claim sales department inquiries
    if (userRole === 'presales' && inquiry.department !== 'presales') {
      return res.status(400).json({ success: false, message: 'Inquiry not in Presales' });
    }
    if (userRole === 'sales' && inquiry.department !== 'sales') {
      return res.status(400).json({ success: false, message: 'Inquiry not in Sales' });
    }

    if (inquiry.assignedTo) {
      return res.status(409).json({ success: false, message: 'Inquiry already assigned' });
    }

    inquiry.assignedTo = userId as any;
    inquiry.assignmentStatus = 'assigned';
    // Use validateBeforeSave: false to prevent full document validation
    // This avoids issues with old phone number formats or other validation errors
    await inquiry.save({ validateBeforeSave: false });

    // Activity
    try {
      await Activity.create({
        inquiry: inquiry._id,
        action: 'claimed',
        actor: req.user?._id!
      });
      if (inquiry.createdBy) {
        await notifyUsers([String(inquiry.createdBy)], `Inquiry ${inquiry._id.toString()} claimed`);
      }
    } catch (e) {
      logger.warn('Activity log failed (claim):', e);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Inquiry claimed successfully',
      data: { inquiry }
    };
    return res.json(response);
  } catch (error: any) {
    logger.error('Claim inquiry error:', error);
    // Log the actual error message for debugging
    const errorMessage = error?.message || 'Unknown error';
    logger.error('Claim inquiry error details:', { errorMessage, stack: error?.stack });
    return res.status(500).json({ 
      success: false, 
      message: errorMessage.includes('validation') 
        ? 'Validation error while claiming inquiry' 
        : 'Server error while claiming inquiry' 
    });
  }
};

export const forwardInquiryToSales = async (req: Request, res: Response) => {
  try {
    const inquiryId = req.params.id;
    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Only current assignee, presales, or admin can forward
    const isOwner = inquiry.assignedTo?.toString() === req.user?._id?.toString();
    const canForward = isOwner || req.user?.role === 'presales' || req.user?.role === 'admin';
    if (!canForward) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Store who forwarded it before clearing assignedTo
    const forwardedByUserId = inquiry.assignedTo || req.user?._id;
    
    inquiry.department = 'sales';
    inquiry.assignmentStatus = 'forwarded_to_sales';
    inquiry.forwardedBy = forwardedByUserId as any; // Store the presales user who forwarded it
    inquiry.assignedTo = undefined; // Clear assignment so it shows as new/unattended for sales
    await inquiry.save();

    // Activity
    try {
      await Activity.create({
        inquiry: inquiry._id,
        action: 'forwarded_to_sales',
        actor: req.user?._id!
      });
      if (inquiry.assignedTo) {
        await notifyUsers([String(inquiry.assignedTo)], `Inquiry ${inquiry._id.toString()} forwarded to Sales`);
      }
    } catch (e) {
      logger.warn('Activity log failed (forward_to_sales):', e);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Inquiry forwarded to Sales',
      data: { inquiry }
    };
    return res.json(response);
  } catch (error) {
    logger.error('Forward to sales error:', error);
    return res.status(500).json({ success: false, message: 'Server error while forwarding inquiry' });
  }
};

export const reassignInquiryToPresales = async (req: Request, res: Response) => {
  try {
    const inquiryId = req.params.id;
    const { targetUserId } = req.body as { targetUserId: string };

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }
    if (inquiry.department !== 'presales') {
      return res.status(400).json({ success: false, message: 'Inquiry is not in Presales' });
    }

    // Only current assignee, presales, or admin can reassign
    const isOwner = inquiry.assignedTo?.toString() === req.user?._id?.toString();
    const canReassign = isOwner || req.user?.role === 'presales' || req.user?.role === 'admin';
    if (!canReassign) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findById(targetUserId);
    if (!user || user.role !== 'presales' || !user.isActive) {
      return res.status(400).json({ success: false, message: 'Target user must be an active presales user' });
    }

    inquiry.assignedTo = targetUserId as any;
    inquiry.assignmentStatus = 'reassigned';
    await inquiry.save();

    // Activity
    try {
      await Activity.create({
        inquiry: inquiry._id,
        action: 'reassigned',
        actor: req.user?._id!,
        targetUser: targetUserId
      });
      await notifyUsers([String(targetUserId)], `Inquiry ${inquiry._id.toString()} reassigned to you`);
    } catch (e) {
      logger.warn('Activity log failed (reassign):', e);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Inquiry reassigned to presales user',
      data: { inquiry }
    };
    return res.json(response);
  } catch (error) {
    logger.error('Reassign inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Server error while reassigning inquiry' });
  }
};

export const reassignInquiryToSales = async (req: Request, res: Response) => {
  try {
    const inquiryId = req.params.id;
    const { targetUserId } = req.body as { targetUserId: string };

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }
    if (inquiry.department !== 'sales') {
      return res.status(400).json({ success: false, message: 'Inquiry is not in Sales' });
    }

    // Only current assignee, sales, or admin can reassign
    const isOwner = inquiry.assignedTo?.toString() === req.user?._id?.toString();
    const canReassign = isOwner || req.user?.role === 'sales' || req.user?.role === 'admin';
    if (!canReassign) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findById(targetUserId);
    if (!user || user.role !== 'sales' || !user.isActive) {
      return res.status(400).json({ success: false, message: 'Target user must be an active sales user' });
    }

    inquiry.assignedTo = targetUserId as any;
    inquiry.assignmentStatus = 'reassigned';
    await inquiry.save({ validateBeforeSave: false });

    // Activity
    try {
      await Activity.create({
        inquiry: inquiry._id,
        action: 'reassigned',
        actor: req.user?._id!,
        targetUser: targetUserId
      });
      await notifyUsers([String(targetUserId)], `Inquiry ${inquiry._id.toString()} reassigned to you`);
    } catch (e) {
      logger.warn('Activity log failed (reassign):', e);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Inquiry reassigned to sales user',
      data: { inquiry }
    };
    return res.json(response);
  } catch (error) {
    logger.error('Reassign inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Server error while reassigning inquiry' });
  }
};

export const addFollowUp = async (req: Request, res: Response) => {
  try {
    const {
      type,
      title,
      nextFollowUpDate,
      inquiryStatus,
      // Sales-specific fields
      leadStage,
      subStage,
      message
    } = req.body;
    const inquiryId = req.params.id;

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check permissions
    const userRole = req.user?.role;
    const canAddFollowUp = 
      userRole === 'admin' ||
      userRole === 'presales' ||
      userRole === 'sales' ||
      inquiry.createdBy.toString() === req.user?._id?.toString() ||
      inquiry.assignedTo?.toString() === req.user?._id?.toString();

    if (!canAddFollowUp) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const followUp: any = {
      type: type || 'call', // Default to 'call' if not provided (for sales follow-ups)
      inquiryStatus: inquiryStatus || 'warm',
      createdBy: req.user?._id!
    };

    // Presales follow-up fields
    if (title) followUp.title = title;
    if (nextFollowUpDate) followUp.nextFollowUpDate = new Date(nextFollowUpDate);

    // Sales follow-up fields
    if (leadStage) followUp.leadStage = leadStage;
    if (subStage) followUp.subStage = subStage;
    if (message) followUp.message = message;

    // Update inquiry status based on lead stage (for sales) or inquiryStatus (for presales)
    if (leadStage && inquiry.department === 'sales') {
      // Map lead stage to inquiry status (use lowercase with underscores for consistency)
      const leadStageToStatus: { [key: string]: InquiryStatus } = {
        'Hot': 'hot',
        'Warm': 'warm',
        'Cold': 'cold',
        'Not Interested': 'not_interested',
        'Walkin': 'walkin',
        'Online-Conversion': 'online_conversion'
      };
      const mappedStatus = leadStageToStatus[leadStage];
      if (mappedStatus) {
        inquiry.status = mappedStatus;
      }
    } else if (inquiryStatus && ['hot', 'warm', 'cold'].includes(inquiryStatus)) {
      // Update inquiry status if inquiryStatus is provided (for presales)
      inquiry.status = inquiryStatus;
    }

    inquiry.followUps.push(followUp);
    // Save without validating the entire document (only validate the follow-up subdocument)
    await inquiry.save({ validateBeforeSave: false });

    // Populate the inquiry with user details
    await inquiry.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'followUps.createdBy', select: 'name email' }
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Follow-up added successfully',
      data: { inquiry }
    };

    res.json(response);
  } catch (error) {
    logger.error('Add follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding follow-up'
    });
     return;
 }
};

export const updateFollowUp = async (req: Request, res: Response) => {
  try {
    const inquiryId = req.params.id;
    const followUpId = req.params.followUpId;
    const {
      type,
      title,
      nextFollowUpDate,
      inquiryStatus,
      // Sales-specific fields
      leadStage,
      subStage,
      message
    } = req.body;

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    const followUp = (inquiry.followUps as any).id(followUpId);
    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    // Check permissions
    const userRole = req.user?.role;
    const canUpdate = 
      userRole === 'admin' ||
      userRole === 'presales' ||
      userRole === 'sales' ||
      followUp.createdBy.toString() === req.user?._id?.toString();

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update fields
    if (type !== undefined) followUp.type = type;
    if (title !== undefined) followUp.title = title;
    if (nextFollowUpDate !== undefined) {
      followUp.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : undefined;
    }

    // Sales follow-up fields
    if (leadStage !== undefined) followUp.leadStage = leadStage;
    if (subStage !== undefined) followUp.subStage = subStage;
    if (message !== undefined) followUp.message = message;

    // Update inquiry status based on lead stage (for sales) or inquiryStatus (for presales)
    // Priority: leadStage for sales inquiries, inquiryStatus for presales inquiries
    if (leadStage !== undefined && inquiry.department === 'sales') {
      // Map lead stage to inquiry status for sales inquiries (use lowercase with underscores for consistency)
      const leadStageToStatus: { [key: string]: InquiryStatus } = {
        'Hot': 'hot',
        'Warm': 'warm',
        'Cold': 'cold',
        'Not Interested': 'not_interested',
        'Walkin': 'walkin',
        'Online-Conversion': 'online_conversion'
      };
      const mappedStatus = leadStageToStatus[leadStage];
      if (mappedStatus) {
        inquiry.status = mappedStatus;
      }
    } else if (inquiryStatus && ['hot', 'warm', 'cold'].includes(inquiryStatus)) {
      // Update inquiry status when follow-up inquiryStatus changes (for presales)
      followUp.inquiryStatus = inquiryStatus;
      inquiry.status = inquiryStatus;
    }

    // Save without validating the entire document (only validate the follow-up subdocument)
    await inquiry.save({ validateBeforeSave: false });

    // Populate the inquiry
    await inquiry.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'followUps.createdBy', select: 'name email' }
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Follow-up updated successfully',
      data: { inquiry }
    };

    res.json(response);
  } catch (error) {
    logger.error('Update follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating follow-up'
    });
     return;
 }
};

export const deleteFollowUp = async (req: Request, res: Response) => {
  try {
    const inquiryId = req.params.id;
    const followUpId = req.params.followUpId;

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    const followUp = (inquiry.followUps as any).id(followUpId);
    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    // Check permissions
    const userRole = req.user?.role;
    const canDelete = 
      userRole === 'admin' ||
      userRole === 'presales' ||
      followUp.createdBy.toString() === req.user?._id?.toString();

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    followUp.deleteOne();
    await inquiry.save();

    // Populate the inquiry
    await inquiry.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'followUps.createdBy', select: 'name email' }
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Follow-up deleted successfully',
      data: { inquiry }
    };

    res.json(response);
  } catch (error) {
    logger.error('Delete follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting follow-up'
    });
     return;
}
};

export const getMyFollowUps = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    // Only presales and sales users can access this endpoint
    if (userRole !== 'presales' && userRole !== 'sales') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only presales and sales users can view their follow-ups.'
      });
    }

    // Find all inquiries that have follow-ups created by this user
    // Don't use .lean() to ensure proper population of nested fields
    const inquiries = await Inquiry.find({
      'followUps.createdBy': userId
    })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('followUps.createdBy', 'name email')
      .select('name email phone city course preferredLocation status department assignedTo followUps');
    
    // Convert to plain objects after population
    const inquiriesPlain = inquiries.map(inq => inq.toObject());

    // Extract follow-ups created by this user with inquiry information
    // Group by inquiry and keep only the latest follow-up per inquiry
    const inquiryFollowUpMap = new Map<string, any>();
    
    inquiriesPlain.forEach((inquiry: any) => {
      const followUps = inquiry.followUps || [];
      const inquiryId = inquiry._id.toString();
      
      // Find the latest follow-up for this inquiry created by this user
      let latestFollowUp: any = null;
      let latestTimestamp: number | null = null;
      
      followUps.forEach((followUp: any) => {
        // Handle both ObjectId and populated user object cases
        const followUpCreatedById = followUp.createdBy?._id 
          ? followUp.createdBy._id.toString() 
          : followUp.createdBy?.toString();
        
        if (followUpCreatedById && followUpCreatedById === userId?.toString()) {
          // Use createdAt timestamp to determine the latest follow-up
          // createdAt is when the follow-up was actually created
          const followUpCreatedAt = followUp.createdAt 
            ? new Date(followUp.createdAt).getTime() 
            : 0; // If no createdAt, use 0 (oldest)
          
          // Use the most recent follow-up (by createdAt timestamp)
          if (latestTimestamp === null || followUpCreatedAt > latestTimestamp) {
            latestTimestamp = followUpCreatedAt;
            latestFollowUp = {
              ...followUp,
              inquiry: {
                _id: inquiry._id,
                name: inquiry.name,
                email: inquiry.email,
                phone: inquiry.phone,
                city: inquiry.city,
                course: inquiry.course,
                preferredLocation: inquiry.preferredLocation,
                status: inquiry.status,
                department: inquiry.department,
                assignedTo: inquiry.assignedTo,
                createdBy: inquiry.createdBy
              }
            };
          }
        }
      });
      
      // Store only the latest follow-up for this inquiry
      if (latestFollowUp) {
        inquiryFollowUpMap.set(inquiryId, latestFollowUp);
      }
    });

    // Convert map to array and sort by createdAt (most recent first)
    const myFollowUps = Array.from(inquiryFollowUpMap.values());
    myFollowUps.sort((a, b) => {
      // Sort by createdAt (most recent first)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Most recent first
    });

    const response: ApiResponse = {
      success: true,
      message: 'Follow-ups retrieved successfully',
      data: { followUps: myFollowUps }
    };

    res.json(response);
  } catch (error) {
    logger.error('Get my follow-ups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving follow-ups'
    });
  }
};

// Helper function to check if an inquiry is admitted
// An inquiry is admitted if its latest follow-up has leadStage='Hot' and subStage='Confirmed Admission'
const isAdmittedStudent = (inquiry: any): boolean => {
  if (!inquiry.followUps || inquiry.followUps.length === 0) {
    return false;
  }
  
  // Sort follow-ups by createdAt descending to get the latest one
  const sortedFollowUps = [...inquiry.followUps].sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latestFollowUp = sortedFollowUps[0];
  
  return latestFollowUp.leadStage === 'Hot' && latestFollowUp.subStage === 'Confirmed Admission';
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    let query: any = {};
    let myInquiriesQuery: any = {};

    // Role-based queries
    if (userRole === 'user') {
      query.createdBy = userId;
      myInquiriesQuery.createdBy = userId;
    } else if (userRole === 'presales') {
      // Presales can see all inquiries in Presales department (assigned or unassigned)
      // This matches the logic in getInquiries function
      query.department = 'presales';
      myInquiriesQuery.createdBy = userId;
    } else if (userRole === 'sales') {
      // Sales can see:
      // 1. Inquiries assigned to them
      // 2. Inquiries they created
      // 3. All inquiries in Sales department (e.g., forwarded from Presales)
      // This matches the logic in getInquiries function
      query.$or = [
        { assignedTo: userId },
        { createdBy: userId },
        { department: 'sales' }
      ];
      myInquiriesQuery.createdBy = userId;
    } else if (userRole === 'admin') {
      // Admin can see all inquiries, but "My Raised Inquiries" should only count inquiries they created
      // query remains empty {} to count all inquiries for total stats
      myInquiriesQuery.createdBy = userId;
    }

    // For "My Attended Inquiries", count inquiries that are:
    // 1. Currently assigned to the user, OR
    // 2. Forwarded by the user (even if forwarded to sales)
    const attendedInquiriesQuery = userRole !== 'user' 
      ? { 
          $or: [
            { assignedTo: userId },
            { forwardedBy: userId }
          ]
        }
      : { assignedTo: userId };

    // Fetch all inquiries with followUps to filter out admitted students
    const [
      allInquiriesForFiltering,
      myInquiriesList,
      attendedInquiriesList,
      presalesInquiriesList,
      salesInquiriesList,
      recentInquiries
    ] = await Promise.all([
      // Get all inquiries matching the base query with followUps populated
      Inquiry.find(query).select('followUps status department').lean(),
      // Get my inquiries for filtering
      Inquiry.find(myInquiriesQuery).select('followUps').lean(),
      // Get attended inquiries for filtering
      userRole !== 'user' ? Inquiry.find(attendedInquiriesQuery).select('followUps').lean() : [],
      // Get presales inquiries for filtering
      Inquiry.find({ department: 'presales' }).select('followUps').lean(),
      // Get sales inquiries for filtering
      Inquiry.find({ department: 'sales' }).select('followUps').lean(),
      // Get recent inquiries (we'll filter and populate after)
      Inquiry.find(query)
        .select('followUps')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    // Filter out admitted students from all lists
    const nonAdmittedInquiries = allInquiriesForFiltering.filter((inq: any) => !isAdmittedStudent(inq));
    const nonAdmittedMyInquiries = myInquiriesList.filter((inq: any) => !isAdmittedStudent(inq));
    const nonAdmittedAttendedInquiries = attendedInquiriesList.filter((inq: any) => !isAdmittedStudent(inq));
    const nonAdmittedPresalesInquiries = presalesInquiriesList.filter((inq: any) => !isAdmittedStudent(inq));
    const nonAdmittedSalesInquiries = salesInquiriesList.filter((inq: any) => !isAdmittedStudent(inq));
    const nonAdmittedRecentInquiries = recentInquiries.filter((inq: any) => !isAdmittedStudent(inq)).slice(0, 5);

    // Calculate counts excluding admitted students
    const totalInquiries = nonAdmittedInquiries.length;
    const hotInquiries = nonAdmittedInquiries.filter((inq: any) => inq.status === 'hot').length;
    const warmInquiries = nonAdmittedInquiries.filter((inq: any) => inq.status === 'warm').length;
    const coldInquiries = nonAdmittedInquiries.filter((inq: any) => inq.status === 'cold').length;
    const myInquiries = nonAdmittedMyInquiries.length;
    const assignedInquiries = nonAdmittedAttendedInquiries.length;
    const presalesInquiries = nonAdmittedPresalesInquiries.length;
    const salesInquiries = nonAdmittedSalesInquiries.length;

    // Calculate admitted students count (all inquiries, not filtered by query)
    const allInquiriesForAdmitted = await Inquiry.find({ followUps: { $exists: true, $ne: [] } })
      .select('followUps')
      .lean();
    const admittedStudentsCount = allInquiriesForAdmitted.filter((inq: any) => isAdmittedStudent(inq)).length;

    // Populate recent inquiries (filtered, now populate)
    const recentInquiriesIds = nonAdmittedRecentInquiries.map((inq: any) => inq._id);
    const recentInquiriesPopulated = recentInquiriesIds.length > 0
      ? await Inquiry.find({ _id: { $in: recentInquiriesIds } })
          .populate('createdBy', 'name email')
          .populate('assignedTo', 'name email')
          .populate('forwardedBy', 'name email')
          .sort({ createdAt: -1 })
          .limit(5)
      : [];

    const stats: DashboardStats = {
      totalInquiries,
      hotInquiries,
      warmInquiries,
      coldInquiries,
      myInquiries,
      assignedInquiries,
      presalesInquiries,
      salesInquiries,
      admittedStudents: admittedStudentsCount,
      recentInquiries: recentInquiriesPopulated
    };

    const response: ApiResponse = {
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: stats
    };

    res.json(response);
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard stats'
    });
     return;
 }
};

export const checkPhoneExists = async (req: Request, res: Response) => {
  try {
    const { phone } = req.query;
    const userRole = req.user?.role;
    
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone format - should start with + and have country code + 10 digits
    const trimmedPhone = phone.trim();
    if (!trimmedPhone.startsWith('+')) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must include country code (e.g., +91)'
      });
    }
    
    const phoneWithoutPlus = trimmedPhone.substring(1);
    if (!/^[0-9]{10,}$/.test(phoneWithoutPlus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Expected format: +[country code][10 digits]'
      });
    }

    // Build query based on user role scope
    // Pre-Sales users: check both presales and sales inquiries
    // Sales users: check only sales inquiries
    // Admin: check both
    const query: any = { phone: trimmedPhone };
    
    if (userRole === 'sales') {
      query.department = 'sales';
    } else if (userRole === 'presales') {
      // Presales can see both presales and sales inquiries
      query.department = { $in: ['presales', 'sales'] };
    }
    // Admin and other roles check all inquiries (no department filter)

    const existingInquiry = await Inquiry.findOne(query).select('_id assignedTo assignmentStatus department');
    
    const response: ApiResponse = {
      success: true,
      message: existingInquiry ? 'Phone number already exists' : 'Phone number is available',
      data: { 
        exists: !!existingInquiry,
        inquiryId: existingInquiry?._id?.toString(),
        isAssigned: !!existingInquiry?.assignedTo,
        assignmentStatus: existingInquiry?.assignmentStatus,
        department: existingInquiry?.department
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Check phone exists error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking phone number'
    });
  }
};

export const moveToUnattended = async (req: Request, res: Response) => {
  try {
    const inquiryId = req.params.id;
    const userRole = req.user?.role;

    // Only allow sales, presales, and admin
    if (userRole !== 'sales' && userRole !== 'presales' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Sales, Pre-Sales, and Admin users can perform this action.'
      });
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check department access
    if (userRole === 'sales' && inquiry.department !== 'sales') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Sales users can only move Sales inquiries to unattended.'
      });
    }

    // Only move if inquiry is currently assigned
    if (!inquiry.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry is already unattended'
      });
    }

    // Move to unattended: clear assignment but keep all data intact
    inquiry.assignedTo = undefined;
    inquiry.assignmentStatus = 'not_assigned';
    await inquiry.save();

    // Activity log
    try {
      await Activity.create({
        inquiry: inquiry._id,
        action: 'moved_to_unattended',
        actor: req.user?._id!
      });
      await notifyUsers([], `Inquiry ${inquiry._id.toString()} moved to unattended`);
    } catch (e) {
      logger.warn('Activity log failed (move_to_unattended):', e);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Inquiry moved to unattended successfully',
      data: { inquiry }
    };

    res.json(response);
  } catch (error) {
    logger.error('Move to unattended error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while moving inquiry to unattended'
    });
  }
};

export const getUnattendedInquiryCounts = async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?._id;

    let baseQuery: any = {};

    // Role-based filtering for unattended inquiries (assignedTo is null or doesn't exist)
    const unattendedCondition = {
      $or: [
        { assignedTo: { $exists: false } },
        { assignedTo: null }
      ]
    };

    if (userRole === 'presales') {
      baseQuery.$and = [
        { department: 'presales' },
        unattendedCondition
      ];
    } else if (userRole === 'sales') {
      baseQuery.$and = [
        { department: 'sales' },
        unattendedCondition
      ];
    } else if (userRole === 'admin') {
      // Admin sees all unattended inquiries
      baseQuery = unattendedCondition;
    } else {
      // Regular users don't see this
      return res.json({
        success: true,
        message: 'Unattended inquiry counts retrieved successfully',
        data: {
          total: 0,
          byLocation: {}
        }
      });
    }

    // Get total unattended count
    const totalCount = await Inquiry.countDocuments(baseQuery);

    // Get counts by location
    const locationCounts: { [key: string]: number } = {};
    
    // Get all locations from options or use default
    const optionSettings = await OptionSettings.findOne({ key: 'global' });
    const locations = optionSettings?.locations || ['Nagpur', 'Pune', 'Nashik', 'Indore'];

    for (const location of locations) {
      let locationQuery: any = {};
      
      if (baseQuery.$and) {
        // If baseQuery has $and, add location to it
        locationQuery.$and = [
          ...baseQuery.$and,
          { preferredLocation: location }
        ];
      } else {
        // If baseQuery is the unattended condition (for admin)
        locationQuery.$and = [
          baseQuery,
          { preferredLocation: location }
        ];
      }
      
      const count = await Inquiry.countDocuments(locationQuery);
      locationCounts[location] = count;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Unattended inquiry counts retrieved successfully',
      data: {
        total: totalCount,
        byLocation: locationCounts
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Get unattended inquiry counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching unattended inquiry counts'
    });
     return;
 }
};
