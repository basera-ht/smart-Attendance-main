import express from 'express';
import { body, validationResult } from 'express-validator';
import Leave from '../models/Leave.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/leaves
// @desc    Get leave requests
// @access  Private (Admin/HR can see all, employees see only their own)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, leaveType, startDate, endDate, employeeId } = req.query;
    
    // Get all active employee IDs to filter out deactivated users
    const activeEmployees = await User.find({ isActive: true }).select('_id');
    const activeEmployeeIds = activeEmployees.map(emp => emp._id);
    
    const query = {
      employee: { $in: activeEmployeeIds } // Only include leaves from active employees
    };

    // If employee, only show their own leaves
    if (req.user.role === 'employee') {
      // Ensure the user is active before allowing them to see their leaves
      if (!activeEmployeeIds.some(id => id.toString() === req.user._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Your account is deactivated'
        });
      }
      query.employee = req.user._id;
    } else if (employeeId) {
      // Admin/HR can filter by employee - ensure the employee is active
      if (!activeEmployeeIds.some(id => id.toString() === employeeId)) {
        return res.status(400).json({
          success: false,
          message: 'Employee is deactivated'
        });
      }
      query.employee = employeeId;
    }

    // Filters
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    
    if (startDate || endDate) {
      query.$or = [];
      if (startDate) {
        query.$or.push({ startDate: { $gte: new Date(startDate) } });
      }
      if (endDate) {
        query.$or.push({ endDate: { $lte: new Date(endDate) } });
      }
      if (query.$or.length === 0) delete query.$or;
    }

    // Build populate options - use single populate for main field
    const populateOptions = {
      path: 'employee',
      select: 'name email employeeId department position'
    }; 

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { appliedDate: -1 },
      populate: populateOptions
    };

    const leaves = await Leave.paginate(query, options);

    res.json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leaves'
    });
  }
});

// @route   POST /api/leaves
// @desc    Create a new leave request
// @access  Private (Employee)
router.post('/', authenticate, [
  body('leaveType').isIn(['sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'bereavement', 'marriage', 'funeral', 'other']).withMessage('Invalid leave type'),
  body('startDate').custom((value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Start date must be a valid date');
    }
    return true;
  }),
  body('endDate').custom((value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('End date must be a valid date');
    }
    return true;
  }),
  body('reason').notEmpty().withMessage('Reason is required').isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { leaveType, startDate, endDate, reason, attachments, isPaid } = req.body;

    // Log incoming data for debugging
    console.log('Received leave request data:', { leaveType, startDate, endDate, reasonLength: reason?.length });

    // Validate dates - handle both ISO strings and YYYY-MM-DD format
    let start, end;
    
    try {
      // If date is in YYYY-MM-DD format, convert to Date
      if (typeof startDate === 'string' && startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        start = new Date(startDate + 'T00:00:00');
      } else {
        start = new Date(startDate);
      }
      
      if (typeof endDate === 'string' && endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        end = new Date(endDate + 'T00:00:00');
      } else {
        end = new Date(endDate);
      }
      
      // Check if dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please provide valid dates.',
          received: { startDate, endDate }
        });
      }
    } catch (dateError) {
      console.error('Date parsing error:', dateError);
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please provide valid dates.'
      });
    }
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before or equal to end date'
      });
    }

    // Check if start date is in the past (allow today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot apply for leave in the past'
      });
    }

    // Check for overlapping leaves
    const overlappingLeaves = await Leave.findOne({
      employee: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlappingLeaves) {
      return res.status(400).json({
        success: false,
        message: 'You have an overlapping leave request that is pending or approved'
      });
    }

    // Create leave with proper date handling
    // Trim reason in case of whitespace
    const trimmedReason = reason ? reason.trim() : '';
    
    if (!trimmedReason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }

    const leaveData = {
      employee: req.user._id,
      leaveType,
      startDate: start,
      endDate: end,
      reason: trimmedReason,
      attachments: attachments || [],
      isPaid: isPaid !== undefined ? isPaid : true // Default to paid leave if not specified
    };

    try {
      const leave = await Leave.create(leaveData);
      
      // Populate employee data - only if employee is active
      await leave.populate({
        path: 'employee',
        select: 'name email employeeId department position',
        match: { isActive: true }
      });
      
      // If employee is deactivated, return error
      if (!leave.employee) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create leave request for deactivated user'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Leave request submitted successfully',
        data: leave
      });
    } catch (createError) {
      console.error('Mongoose create error:', createError);
      // Handle specific mongoose errors
      if (createError.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: Object.values(createError.errors).map(err => err.message)
        });
      }
      throw createError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Create leave error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while creating leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/leaves/:id
// @desc    Update leave request (employee can update pending, admin can approve/reject)
// @access  Private
router.put('/:id', authenticate, [
  body('leaveType').optional().isIn(['sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'bereavement', 'other']),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('reason').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']),
  body('reviewComments').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check permissions
    const isEmployee = req.user.role === 'employee';
    const isAdmin = ['admin', 'hr'].includes(req.user.role);
    
    if (isEmployee && leave.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { leaveType, startDate, endDate, reason, status, reviewComments, attachments, isPaid } = req.body;

    // Employees can only update pending leaves
    if (isEmployee) {
      if (leave.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Can only update pending leave requests'
        });
      }
      
      // Employees can only cancel, not approve/reject
      if (status && status !== 'cancelled' && status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'You can only cancel your leave requests'
        });
      }

      // Update fields
      if (leaveType) leave.leaveType = leaveType;
      if (startDate) leave.startDate = new Date(startDate);
      if (endDate) leave.endDate = new Date(endDate);
      if (reason) leave.reason = reason;
      if (attachments) leave.attachments = attachments;
      if (isPaid !== undefined) leave.isPaid = isPaid;
      if (status === 'cancelled') leave.status = 'cancelled';
    }

    // Admin/HR can approve/reject
    if (isAdmin) {
      if (status && ['approved', 'rejected'].includes(status)) {
        leave.status = status;
        leave.reviewedBy = req.user._id;
        leave.reviewedAt = new Date();
        if (reviewComments) leave.reviewComments = reviewComments;
      }
      // Admin can also update other fields if needed
      if (leaveType) leave.leaveType = leaveType;
      if (startDate) leave.startDate = new Date(startDate);
      if (endDate) leave.endDate = new Date(endDate);
      if (reason) leave.reason = reason;
      if (isPaid !== undefined) leave.isPaid = isPaid;
    }

    // Recalculate total days if dates changed
    if (startDate || endDate) {
      const start = leave.startDate;
      const end = leave.endDate;
      const diffTime = Math.abs(end - start);
      leave.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    await leave.save();
    await leave.populate({
      path: 'employee',
      select: 'name email employeeId department position',
      match: { isActive: true }
    });
    if (leave.reviewedBy) {
      await leave.populate({
        path: 'reviewedBy',
        select: 'name email',
        match: { isActive: true }
      });
    }
    
    // If employee was deactivated, return error
    if (!leave.employee) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update leave request for deactivated user'
      });
    }

    res.json({
      success: true,
      message: 'Leave request updated successfully',
      data: leave
    });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating leave request'
    });
  }
});

// @route   DELETE /api/leaves/:id
// @desc    Delete leave request (only pending leaves can be deleted)
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee' && leave.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow deletion of pending leaves
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete pending leave requests'
      });
    }

    await leave.deleteOne();

    res.json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting leave request'
    });
  }
});

// @route   GET /api/leaves/stats
// @desc    Get leave statistics
// @access  Private
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Get all active employee IDs
    const activeEmployees = await User.find({ isActive: true }).select('_id');
    const activeEmployeeIds = activeEmployees.map(emp => emp._id);
    
    const query = {
      employee: { $in: activeEmployeeIds }
    };
    
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    }

    const stats = {
      total: await Leave.countDocuments(query),
      pending: await Leave.countDocuments({ ...query, status: 'pending' }),
      approved: await Leave.countDocuments({ ...query, status: 'approved' }),
      rejected: await Leave.countDocuments({ ...query, status: 'rejected' }),
      thisYear: await Leave.countDocuments({
        ...query,
        appliedDate: {
          $gte: new Date(new Date().getFullYear(), 0, 1),
          $lt: new Date(new Date().getFullYear() + 1, 0, 1)
        }
      })
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get leave stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leave statistics'
    });
  }
});

export default router;

