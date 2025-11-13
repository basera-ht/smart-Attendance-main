import express from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { createQRToken, verifyQRToken } from '../utils/qrToken.js';

const router = express.Router();

// @route   POST /api/attendance/checkin
// @desc    Check in for attendance
// @access  Private
router.post('/checkin', authenticate, [
  body('location').optional().trim(),
  body('notes').optional().trim()
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

    const { location, notes } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: req.user._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance && existingAttendance.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today'
      });
    }

    const checkInData = {
      time: new Date(),
      location: location || 'Office',
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    };

    if (existingAttendance) {
      // Update existing record
      existingAttendance.checkIn = checkInData;
      existingAttendance.notes = notes || existingAttendance.notes;
      await existingAttendance.save();
    } else {
      // Create new record
      await Attendance.create({
        employee: req.user._id,
        checkIn: checkInData,
        notes
      });
    }

    res.json({
      success: true,
      message: 'Checked in successfully',
      data: {
        checkInTime: checkInData.time,
        location: checkInData.location
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-in'
    });
  }
});

// @route   POST /api/attendance/checkout
// @desc    Check out for attendance
// @access  Private
router.post('/checkout', authenticate, [
  body('location').optional().trim(),
  body('notes').optional().trim()
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

    const { location, notes } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No check-in record found for today'
      });
    }

    if (attendance.checkOut.time) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out today'
      });
    }

    const checkOutData = {
      time: new Date(),
      location: location || 'Office',
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    };

    attendance.checkOut = checkOutData;
    if (notes) attendance.notes = notes;

    await attendance.save();

    res.json({
      success: true,
      message: 'Checked out successfully',
      data: {
        checkOutTime: checkOutData.time,
        workingHours: attendance.workingHours,
        overtime: attendance.overtime
      }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-out'
    });
  }
});

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private (Admin/HR can see all, employees see only their own)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, employeeId, startDate, endDate, status } = req.query;
    const query = {};

    // If not admin or HR, only show own records
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (employeeId) {
      query.employee = employeeId;
    }

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { date: -1 },
      populate: {
        path: 'employee',
        select: 'name email employeeId department position'
      }
    };

    const attendance = await Attendance.paginate(query, options);

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Attendance fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance'
    });
  }
});

// @route   GET /api/attendance/today
// @desc    Get today's attendance records
// @access  Private (Admin/HR can see all, employees see only their own)
router.get('/today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const query = {
      date: { $gte: today, $lt: tomorrow }
    };

    // If employee, return full record for their dashboard
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
      const record = await Attendance.findOne(query);
      
      if (record) {
        return res.json({
          success: true,
          data: {
            id: record._id,
            checkIn: record.checkIn?.time ? new Date(record.checkIn.time).toISOString() : null,
            checkOut: record.checkOut?.time ? new Date(record.checkOut.time).toISOString() : null,
            status: record.status || (record.checkIn?.time ? 'present' : 'absent'),
            workingHours: record.workingHours || 0,
            overtime: record.overtime || 0,
            date: record.date.toISOString().split('T')[0]
          }
        });
      } else {
        return res.json({
          success: true,
          data: {
            checkIn: null,
            checkOut: null,
            status: 'absent',
            workingHours: 0,
            overtime: 0,
            date: today.toISOString().split('T')[0]
          }
        });
      }
    }

    // Admin/HR see all records
    const records = await Attendance.find(query)
      .populate('employee', 'name email employeeId department position')
      .sort({ 'checkIn.time': 1 });

    // Map to a simplified shape similar to frontend demo data
    const data = records.map(r => ({
      id: r._id,
      employeeId: r.employee?._id || r.employee,
      employeeName: r.employee?.name || 'Unknown',
      employee: r.employee ? {
        _id: r.employee._id,
        name: r.employee.name,
        email: r.employee.email || '',
        employeeId: r.employee.employeeId || '',
        department: r.employee.department || '',
        position: r.employee.position || ''
      } : null,
      checkIn: r.checkIn?.time ? new Date(r.checkIn.time).toLocaleTimeString() : null,
      checkInTime: r.checkIn?.time ? new Date(r.checkIn.time) : null, // Keep original Date for filtering
      checkOut: r.checkOut?.time ? new Date(r.checkOut.time).toLocaleTimeString() : null,
      status: r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : (r.checkIn?.time ? 'Present' : 'Absent'),
      date: r.date.toISOString().split('T')[0]
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Today attendance fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching today\'s attendance' });
  }
});

// @route   GET /api/attendance/employee/:id
// @desc    Get specific employee's attendance
// @access  Private
router.get('/employee/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    // Check if user can access this employee's data
    if (req.user.role === 'employee' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = { employee: id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { date: -1 }
    };

    const attendance = await Attendance.paginate(query, options);

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Employee attendance fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee attendance'
    });
  }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private (Admin/HR only)
router.put('/:id', authenticate, authorize('admin', 'hr'), [
  body('status').optional().isIn(['present', 'absent', 'late', 'half-day', 'leave']),
  body('notes').optional().trim()
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
    const { status, notes } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    if (status) attendance.status = status;
    if (notes) attendance.notes = notes;

    await attendance.save();

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: { attendance }
    });
  } catch (error) {
    console.error('Attendance update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating attendance'
    });
  }
});

// --- Admin check-in/check-out ---
// @route   POST /api/attendance/admin/checkin
// @desc    Admin check in an employee
// @access  Private (Admin/HR only)
router.post('/admin/checkin', authenticate, authorize('admin', 'hr'), [
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('location').optional().trim(),
  body('notes').optional().trim()
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

    const { employeeId, location, notes } = req.body;
    
    // Find employee
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance && existingAttendance.checkIn?.time) {
      return res.status(400).json({
        success: false,
        message: 'Employee already checked in today'
      });
    }

    const checkInData = {
      time: new Date(),
      location: location || 'Office',
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    };

    if (existingAttendance) {
      // Update existing record
      existingAttendance.checkIn = checkInData;
      existingAttendance.notes = notes || existingAttendance.notes;
      await existingAttendance.save();
    } else {
      // Create new record
      await Attendance.create({
        employee: employeeId,
        checkIn: checkInData,
        notes,
        status: 'present'
      });
    }

    // Populate employee details for response
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('employee', 'name email employeeId department position');

    res.json({
      success: true,
      message: `Checked in ${employee.name} successfully`,
      data: {
        attendance,
        checkInTime: checkInData.time,
        location: checkInData.location
      }
    });
  } catch (error) {
    console.error('Admin check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-in'
    });
  }
});

// @route   POST /api/attendance/admin/checkout
// @desc    Admin check out an employee
// @access  Private (Admin/HR only)
router.post('/admin/checkout', authenticate, authorize('admin', 'hr'), [
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('location').optional().trim(),
  body('notes').optional().trim()
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

    const { employeeId, location, notes } = req.body;
    
    // Find employee
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No check-in record found for today'
      });
    }

    if (attendance.checkOut?.time) {
      return res.status(400).json({
        success: false,
        message: 'Employee already checked out today'
      });
    }

    const checkOutData = {
      time: new Date(),
      location: location || 'Office',
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    };

    attendance.checkOut = checkOutData;
    if (notes) attendance.notes = notes;

    await attendance.save();

    // Populate employee details for response
    await attendance.populate('employee', 'name email employeeId department position');

    res.json({
      success: true,
      message: `Checked out ${employee.name} successfully`,
      data: {
        attendance,
        checkOutTime: checkOutData.time,
        workingHours: attendance.workingHours,
        overtime: attendance.overtime
      }
    });
  } catch (error) {
    console.error('Admin check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-out'
    });
  }
});

// --- QR-based attendance ---
// @route   GET /api/attendance/qr/generate
// @desc    Generate short-lived QR token for check-in or check-out
// @access  Private (employee)
router.get('/qr/generate', authenticate, async (req, res) => {
  try {
    const { action = 'checkin' } = req.query; // 'checkin' | 'checkout'
    if (!['checkin', 'checkout'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    const token = createQRToken({ userId: req.user._id.toString(), action }, 300);
    res.json({ success: true, data: { token, action, expiresIn: 300 } });
  } catch (error) {
    console.error('QR generate error:', error);
    res.status(500).json({ success: false, message: 'Server error generating QR' });
  }
});

export default router;

// @route   POST /api/attendance/qr/scan
// @desc    Validate QR token and perform attendance action
// @access  Private (Admin/HR or kiosk)
router.post('/qr/scan', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });
    const decoded = verifyQRToken(token);
    const { userId, action } = decoded;
    if (!userId || !['checkin', 'checkout'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid token payload' });
    }

    // Impersonate the employee securely for this action only
    req.user = await User.findById(userId).select('-password');
    if (!req.user) return res.status(404).json({ success: false, message: 'User not found' });

    if (action === 'checkin') {
      // Reuse check-in logic
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existing = await Attendance.findOne({
        employee: req.user._id,
        date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      });
      const checkInData = {
        time: new Date(),
        location: 'QR Point',
        ipAddress: req.ip,
        deviceInfo: req.get('User-Agent')
      };
      if (existing) {
        if (existing.checkIn?.time) {
          return res.status(400).json({ success: false, message: 'Already checked in today' });
        }
        existing.checkIn = checkInData;
        await existing.save();
      } else {
        await Attendance.create({ employee: req.user._id, checkIn: checkInData });
      }
      return res.json({ success: true, message: 'Checked in via QR' });
    }

    if (action === 'checkout') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const attendance = await Attendance.findOne({
        employee: req.user._id,
        date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      });
      if (!attendance) return res.status(400).json({ success: false, message: 'No check-in record found for today' });
      if (attendance.checkOut?.time) return res.status(400).json({ success: false, message: 'Already checked out today' });
      attendance.checkOut = {
        time: new Date(),
        location: 'QR Point',
        ipAddress: req.ip,
        deviceInfo: req.get('User-Agent')
      };
      await attendance.save();
      return res.json({ success: true, message: 'Checked out via QR' });
    }

    res.status(400).json({ success: false, message: 'Unsupported action' });
  } catch (error) {
    console.error('QR scan error:', error);
    res.status(400).json({ success: false, message: 'Invalid or expired QR token' });
  }
});