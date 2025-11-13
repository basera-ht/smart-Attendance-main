import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private (Admin/HR only)
router.get('/', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, role, isActive } = req.query;
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    // Department filter
    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    // Role filter
    if (role) {
      query.role = role;
    }

    // Active status filter - by default, only show active employees
    // Only show deactivated if explicitly requested with isActive=false
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else {
      // Default: only show active employees
      query.isActive = true; 
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      select: '-password'
    };

    const employees = await User.paginate(query, options);

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Employees fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employees'
    });
  }
});

// @route   GET /api/employees/:id
// @desc    Get single employee
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user can access this employee's data
    if (req.user.role === 'employee' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const employee = await User.findById(id).select('-password');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: { employee }
    });
  } catch (error) {
    console.error('Employee fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee'
    });
  }
});

// @route   POST /api/employees
// @desc    Create new employee
// @access  Private (Admin/HR only)
router.post('/', authenticate, authorize('admin', 'hr'), [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'hr', 'employee']).withMessage('Invalid role'),
  body('department').optional().trim(),
  body('position').optional().trim(),
  body('phone').optional().trim(),
  body('address').optional().trim()
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

    const { name, email, password, role, department, position, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Employee already exists with this email'
      });
    }

    const employee = await User.create({
      name,
      email,
      password,
      role,
      department,
      position,
      phone,
      address
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        employee: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          employeeId: employee.employeeId,
          department: employee.department,
          position: employee.position,
          phone: employee.phone,
          address: employee.address,
          isActive: employee.isActive
        }
      }
    });
  } catch (error) {
    console.error('Employee creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during employee creation'
    });
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private (Admin/HR only)
router.put('/:id', authenticate, authorize('admin', 'hr'), [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('role').optional().isIn(['admin', 'hr', 'employee']).withMessage('Invalid role'),
  body('department').optional().trim(),
  body('position').optional().trim(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
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

    const { id } = req.params;
    const updateData = req.body;

    // Remove password from update data if present
    delete updateData.password;

    const employee = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: { employee }
    });
  } catch (error) {
    console.error('Employee update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during employee update'
    });
  }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee (soft delete)
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee deactivated successfully',
      data: { employee }
    });
  } catch (error) {
    console.error('Employee deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during employee deletion'
    });
  }
});

// @route   GET /api/employees/stats/overview
// @desc    Get employee statistics
// @access  Private (Admin/HR only)
router.get('/stats/overview', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({ isActive: true });
    const employeesByRole = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const employeesByDepartment = await User.aggregate([
      { $match: { isActive: true, department: { $exists: true, $ne: '' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees,
        employeesByRole,
        employeesByDepartment
      }
    });
  } catch (error) {
    console.error('Employee stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee statistics'
    });
  }
});

export default router;