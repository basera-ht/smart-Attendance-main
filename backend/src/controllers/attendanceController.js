import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import moment from 'moment';

export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const today = moment().startOf('day').toDate();
    
    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: today
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in for today'
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      employee: employeeId,
      date: today,
      checkIn: new Date(),
      ipAddress: req.ip
    });

    // Populate employee details
    await attendance.populate('employee', 'name email employeeId department position');

    res.status(201).json({
      success: true,
      message: 'Check-in successful',
      data: attendance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during check-in',
      error: error.message
    });
  }
};

// @desc    Check-out employee
// @route   POST /api/attendance/checkout
// @access  Private/Employee
export const checkOut = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const today = moment().startOf('day').toDate();
    
    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No check-in record found for today'
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out for today'
      });
    }

    // Update check-out time
    attendance.checkOut = new Date();
    await attendance.save();

    // Populate employee details
    await attendance.populate('employee', 'name email employeeId department position');

    res.json({
      success: true,
      message: 'Check-out successful',
      data: attendance
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during check-out',
      error: error.message
    });
  }
};

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private/Admin/HR
export const getAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 20, employee, startDate, endDate, department } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (employee) filter.employee = employee;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = moment(startDate).startOf('day').toDate();
      if (endDate) filter.date.$lte = moment(endDate).endOf('day').toDate();
    }

    // If department filter is provided, we need to join with User collection
    if (department) {
      const employeesInDept = await User.find({ department }).select('_id');
      filter.employee = { $in: employeesInDept.map(emp => emp._id) };
    }

    // Execute query with pagination
    const attendance = await Attendance.find(filter)
      .populate('employee', 'name email employeeId department position')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: -1, checkIn: -1 });

    // Get total count for pagination
    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
};

// @desc    Get employee's own attendance
// @route   GET /api/attendance/employee/:id
// @access  Private
export const getEmployeeAttendance = async (req, res) => {
  try {
    const employeeId = req.params.id || req.user.id;
    const { page = 1, limit = 30, startDate, endDate } = req.query;
    
    // Build filter object
    let filter = { employee: employeeId };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = moment(startDate).startOf('day').toDate();
      if (endDate) filter.date.$lte = moment(endDate).endOf('day').toDate();
    }

    // Execute query with pagination
    const attendance = await Attendance.find(filter)
      .populate('employee', 'name email employeeId department position')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: -1 });

    // Get total count for pagination
    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee attendance',
      error: error.message
    });
  }
};

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private/Admin/HR
export const updateAttendance = async (req, res) => {
  try {
    const { checkIn, checkOut, status, notes } = req.body;
    
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { checkIn, checkOut, status, notes },
      { new: true, runValidators: true }
    ).populate('employee', 'name email employeeId department position');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating attendance record',
      error: error.message
    });
  }
};

// @desc    Get today's attendance
// @route   GET /api/attendance/today
// @access  Private/Admin/HR
export const getTodayAttendance = async (req, res) => {
  try {
    const today = moment().startOf('day').toDate();
    
    const attendance = await Attendance.find({ date: today })
      .populate('employee', 'name email employeeId department position')
      .sort({ checkIn: 1 });

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching today\'s attendance',
      error: error.message
    });
  }
};