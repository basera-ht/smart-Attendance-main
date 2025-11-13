import User from '../models/User.js';

export const getEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, status, search } = req.query;
    
    // Build filter object
    let filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const employees = await User.find(filter)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: employees,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private/Admin/HR
export const getEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id).select('-password');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee',
      error: error.message
    });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private/Admin/HR
export const updateEmployee = async (req, res) => {
  try {
    const { name, email, role, department, position, phone, status } = req.body;
    
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, department, position, phone, status },
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
      data: employee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee',
      error: error.message
    });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
export const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee deactivated successfully'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating employee',
      error: error.message
    });
  }
};

// @desc    Update employee status
// @route   PATCH /api/employees/:id/status
// @access  Private/Admin
export const updateEmployeeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      { status },
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
      message: 'Employee status updated successfully',
      data: employee
    });
  } catch (error) {
    console.error('Update employee status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee status',
      error: error.message
    });
  }
};