import { Request, Response } from 'express';
import User from '../models/User';
import logger from '../utils/logger';
import { ApiResponse } from '../types';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      sort = 'createdAt',
      order = 'desc'
    } = req.query as any;

    const query: any = {};

    // Apply filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Restrict presales to only view active presales users list
    if (req.user?.role === 'presales') {
      query.role = 'presales';
      query.isActive = true;
    }
    
    // Restrict sales to only view active sales users list
    if (req.user?.role === 'sales') {
      query.role = 'sales';
      query.isActive = true;
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj: any = {};
    sortObj[sort] = sortOrder;

    const users = await User.find(query)
      .select((req.user?.role === 'presales' || req.user?.role === 'sales') ? 'name email role isActive' : '-password')
      .sort(sortObj)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    const response: ApiResponse = {
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'User retrieved successfully',
      data: { user }
    };

    res.json(response);
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role, isActive } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user - only include phone if it's provided and not empty
    const userData: any = {
      name,
      email,
      password,
      role: role || 'presales',
      isActive: isActive !== undefined ? isActive : true
    };
    
    if (phone && phone.trim() !== '') {
      userData.phone = phone.trim();
    }

    const user = new User(userData);

    await user.save();

    const response: ApiResponse = {
      success: true,
      message: 'User created successfully',
      data: { user }
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating user'
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, role, isActive } = req.body;
    const userId = req.params.id;

    // Get the user being updated to check current role
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if trying to change role of the first admin
    if (role && currentUser.role === 'admin' && role !== 'admin') {
      // Find the first admin (admin with earliest createdAt)
      const firstAdmin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
      
      if (firstAdmin && firstAdmin._id.toString() === userId) {
        return res.status(403).json({
          success: false,
          message: 'The first admin cannot change their own role. The first admin account must remain as admin.'
        });
      }
    }

    // Check if email is being changed and if it already exists
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists for another user'
        });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) {
      // Allow empty string to clear phone number
      updateData.phone = phone && phone.trim() !== '' ? phone.trim() : undefined;
    }
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'User updated successfully',
      data: { user }
    };

    res.json(response);
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
};

export const deleteUser = async (req: Request, res: Response)=> {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user?._id?.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Prevent deleting admin account
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin account. Only one admin account is allowed in the system.'
      });
    }

    await User.findByIdAndDelete(userId);

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deactivating themselves
    if (userId === req.user?._id?.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deactivating admin account
    if (user.role === 'admin' && user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cannot deactivate admin account. Admin account must remain active.'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    const response: ApiResponse = {
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    };

    res.json(response);
  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling user status'
    });
  }
};
