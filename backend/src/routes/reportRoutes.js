import express from 'express';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import moment from 'moment';

const router = express.Router();

// @route   GET /api/reports/dashboard
// @desc    Get dashboard statistics
// @access  Private (Admin/HR only)
router.get('/dashboard', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total employees
    const totalEmployees = await User.countDocuments({ isActive: true });

    // Present today
    const presentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      'checkIn.time': { $exists: true }
    });

    // Late today (check-in after 9:30 AM)
    const lateThreshold = new Date(today);
    lateThreshold.setHours(9, 30, 0, 0);
    
    const lateToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      'checkIn.time': { $gt: lateThreshold }
    });

    // Absent today
    const absentToday = totalEmployees - presentToday;

    // This week's attendance
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Get total active employees (used for absent calculation)
    const totalActiveEmployees = await User.countDocuments({ isActive: true });

    // Get all attendance records for the week (including today)
    const weeklyAttendance = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfWeek, $lt: tomorrow }
        }
      },
      {
        $addFields: {
          hasCheckIn: { $ne: ['$checkIn.time', null] },
          checkInMinutes: {
            $cond: [
              { $ne: ['$checkIn.time', null] },
              {
                $add: [
                  { $multiply: [{ $hour: '$checkIn.time' }, 60] },
                  { $minute: '$checkIn.time' }
                ]
              },
              null
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          present: {
            $sum: {
              $cond: ['$hasCheckIn', 1, 0]
            }
          },
          late: {
            $sum: {
              $cond: [
                {
                  $and: [
                    '$hasCheckIn',
                    { $gt: ['$checkInMinutes', 570] } // 9:30 AM = 570 minutes
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Generate all days of the week to ensure we have data for each day
    const daysOfWeek = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      const dayStr = dayDate.toISOString().split('T')[0];
      
      // Find matching attendance data or create empty entry
      const dayData = weeklyAttendance.find(d => d._id === dayStr) || {
        _id: dayStr,
        present: 0,
        late: 0
      };
      
      // Calculate absent (only for past days and today)
      const isTodayOrPast = dayDate <= today;
      const absent = isTodayOrPast ? Math.max(0, totalActiveEmployees - (dayData.present || 0)) : 0;
      
      daysOfWeek.push({
        ...dayData,
        absent
      });
    }

    const weeklyAttendanceWithAbsent = daysOfWeek;

    // Department-wise attendance
    const departmentAttendance = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow },
          'checkIn.time': { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      { $unwind: '$employeeData' },
      {
        $group: {
          _id: '$employeeData.department',
          present: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees,
        presentToday,
        lateToday,
        absentToday,
        weeklyAttendance: weeklyAttendanceWithAbsent,
        departmentAttendance
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
});

// @route   GET /api/reports/attendance
// @desc    Get attendance report
// @access  Private (Admin/HR only)
router.get('/attendance', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { period = 'weekly', startDate, endDate, department, employeeId, format = 'json' } = req.query;

    let dateFilter = {};
    const now = moment();
    
    // Set date range based on period
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: moment(startDate).startOf('day').toDate(),
          $lte: moment(endDate).endOf('day').toDate()
        }
      };
    } else {
      switch (period) {
        case 'daily':
          dateFilter = {
            date: {
              $gte: now.startOf('day').toDate(),
              $lte: now.endOf('day').toDate()
            }
          };
          break;
        case 'weekly':
          dateFilter = {
            date: {
              $gte: now.startOf('week').toDate(),
              $lte: now.endOf('week').toDate()
            }
          };
          break;
        case 'monthly':
          dateFilter = {
            date: {
              $gte: now.startOf('month').toDate(),
              $lte: now.endOf('month').toDate()
            }
          };
          break;
        case 'yearly':
          dateFilter = {
            date: {
              $gte: now.startOf('year').toDate(),
              $lte: now.endOf('year').toDate()
            }
          };
          break;
        default:
          dateFilter = {
            date: {
              $gte: now.startOf('week').toDate(),
              $lte: now.endOf('week').toDate()
            }
          };
      }
    }

    // Build employee filter
    let employeeFilter = {};
    if (employeeId) {
      employeeFilter.employee = employeeId;
    } else if (department && department !== 'all') {
      const employeesInDept = await User.find({ department, isActive: true }).select('_id');
      employeeFilter.employee = { $in: employeesInDept.map(emp => emp._id) };
    }

    const finalFilter = { ...dateFilter, ...employeeFilter };

    const attendance = await Attendance.find(finalFilter)
      .populate('employee', 'name email employeeId department position')
      .sort({ date: 1 });

    // Get total active employees for absent calculation
    const totalActiveEmployees = await User.countDocuments({ isActive: true });

    // Generate period-specific chart data
    let chartData = [];
    let dateFormat = '%Y-%m-%d';
    let dateLabelFormat = 'MMM DD';

    if (period === 'daily') {
      // For daily, show detailed hourly breakdown with better insights
      const hourlyData = {};
      const timeSlots = {
        early: { start: 0, end: 540 }, // Before 9:00 AM (540 minutes)
        onTime: { start: 540, end: 570 }, // 9:00 AM to 9:30 AM (570 minutes = 9:30 AM)
        late: { start: 570, end: 720 }, // After 9:30 AM
        veryLate: { start: 720, end: 1440 } // After 12:00 PM
      };
      
      // Initialize all work hours (6 AM to 8 PM)
      for (let h = 6; h <= 20; h++) {
        const hourStr = String(h).padStart(2, '0') + ':00';
        hourlyData[hourStr] = { 
          present: 0, 
          late: 0,
          early: 0,
          onTime: 0,
          veryLate: 0,
          checkOuts: 0
        };
      }
      
      // Process attendance records
      attendance.forEach(record => {
        // Process check-ins
        if (record.checkIn && record.checkIn.time) {
          const checkInTime = moment(record.checkIn.time);
          const hour = checkInTime.format('HH:00');
          const minutes = checkInTime.hour() * 60 + checkInTime.minute();
          
          if (!hourlyData[hour]) {
            hourlyData[hour] = { 
              present: 0, 
              late: 0,
              early: 0,
              onTime: 0,
              veryLate: 0,
              checkOuts: 0
            };
          }
          
          hourlyData[hour].present++;
          
          // Categorize by arrival time
          if (minutes < timeSlots.early.end) {
            hourlyData[hour].early++;
          } else if (minutes < timeSlots.onTime.end) {
            hourlyData[hour].onTime++;
          } else if (minutes < timeSlots.late.end) {
            hourlyData[hour].late++;
          } else {
            hourlyData[hour].veryLate++;
          }
        }
        
        // Process check-outs separately by check-out hour
        if (record.checkOut && record.checkOut.time) {
          const checkOutTime = moment(record.checkOut.time);
          const checkOutHour = checkOutTime.format('HH:00');
          
          if (!hourlyData[checkOutHour]) {
            hourlyData[checkOutHour] = { 
              present: 0, 
              late: 0,
              early: 0,
              onTime: 0,
              veryLate: 0,
              checkOuts: 0
            };
          }
          
          hourlyData[checkOutHour].checkOuts++;
        }
      });
      
      // Convert to chart data format with better labels
      chartData = Object.keys(hourlyData).sort().map(hour => {
        const data = hourlyData[hour];
        return {
          name: hour,
          present: data.present,
          late: data.late,
          early: data.early,
          onTime: data.onTime,
          veryLate: data.veryLate,
          checkOuts: data.checkOuts,
          absent: 0
        };
      });
    } else if (period === 'weekly') {
      // For weekly, show daily breakdown with accurate data
      const dailyData = await Attendance.aggregate([
        { $match: finalFilter },
        {
          $addFields: {
            hasCheckIn: { $ne: ['$checkIn.time', null] },
            checkInMinutes: {
              $cond: [
                { $ne: ['$checkIn.time', null] },
                {
                  $add: [
                    { $multiply: [{ $hour: '$checkIn.time' }, 60] },
                    { $minute: '$checkIn.time' }
                  ]
                },
                null
              ]
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            present: {
              $sum: { $cond: ['$hasCheckIn', 1, 0] }
            },
            late: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      '$hasCheckIn',
                      { $gt: ['$checkInMinutes', 570] } // 9:30 AM = 570 minutes
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalRecords: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Fill in all days of the week with proper calculations
      const startOfPeriod = moment(dateFilter.date.$gte);
      const endOfPeriod = moment(dateFilter.date.$lte);
      const daysOfWeek = [];
      const today = moment();
      
      let currentDate = startOfPeriod.clone();
      while (currentDate.isSameOrBefore(endOfPeriod, 'day')) {
        const dayStr = currentDate.format('YYYY-MM-DD');
        const dayData = dailyData.find(d => d._id === dayStr) || { 
          _id: dayStr, 
          present: 0, 
          late: 0,
          totalRecords: 0
        };
        
        // Skip weekends for absent calculation (optional - can be adjusted)
        const dayOfWeek = currentDate.day();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isTodayOrPast = currentDate.isSameOrBefore(today, 'day');
        
        // Calculate absent: only for past/today and workdays
        let absent = 0;
        if (isTodayOrPast && !isWeekend) {
          // Expected attendance = total employees for workdays
          absent = Math.max(0, totalActiveEmployees - (dayData.present || 0));
        }
        
        daysOfWeek.push({
          _id: dayStr,
          present: dayData.present || 0,
          late: dayData.late || 0,
          absent: absent,
          date: currentDate.toDate()
        });
        currentDate.add(1, 'day');
      }
      
      // Format with better labels showing date and day name
      chartData = daysOfWeek.map(day => ({
        name: moment(day._id).format('ddd, MMM D'),
        present: day.present,
        late: day.late,
        absent: day.absent,
        date: day._id
      }));
    } else if (period === 'monthly') {
      // For monthly, show weekly breakdown with accurate data
      const dailyData = await Attendance.aggregate([
        { $match: finalFilter },
        {
          $addFields: {
            hasCheckIn: { $ne: ['$checkIn.time', null] },
            dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            checkInMinutes: {
              $cond: [
                { $ne: ['$checkIn.time', null] },
                {
                  $add: [
                    { $multiply: [{ $hour: '$checkIn.time' }, 60] },
                    { $minute: '$checkIn.time' }
                  ]
                },
                null
              ]
            }
          }
        },
        {
          $group: {
            _id: '$dateStr',
            present: {
              $sum: { $cond: ['$hasCheckIn', 1, 0] }
            },
            late: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$checkIn.time', null] },
                      { $gt: ['$checkInMinutes', 570] } // 9:30 AM = 570 minutes
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalRecords: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Group daily data by week with proper calculations
      const weekMap = {};
      const startOfMonth = moment(dateFilter.date.$gte);
      const endOfMonth = moment(dateFilter.date.$lte);
      const today = moment();
      
      // First, process actual attendance data
      dailyData.forEach(item => {
        const date = moment(item._id);
        const weekStart = date.clone().startOf('week');
        const weekKey = weekStart.format('YYYY-MM-DD');
        
        if (!weekMap[weekKey]) {
          weekMap[weekKey] = { 
            present: 0, 
            late: 0,
            days: [],
            startDate: weekStart,
            endDate: weekStart.clone().endOf('week')
          };
        }
        weekMap[weekKey].present += item.present;
        weekMap[weekKey].late += item.late;
        weekMap[weekKey].days.push(date.format('YYYY-MM-DD'));
      });
      
      // Fill in all weeks of the month and calculate absent
      const allWeeks = [];
      let currentWeekStart = startOfMonth.clone().startOf('week');
      
      while (currentWeekStart.isSameOrBefore(endOfMonth)) {
        const weekKey = currentWeekStart.format('YYYY-MM-DD');
        const weekEnd = currentWeekStart.clone().endOf('week');
        const weekData = weekMap[weekKey] || {
          present: 0,
          late: 0,
          days: [],
          startDate: currentWeekStart,
          endDate: weekEnd
        };
        
        // Count workdays in this week (within month range)
        let workdaysInWeek = 0;
        let workdaysPast = 0;
        let checkDate = currentWeekStart.clone();
        
        while (checkDate.isSameOrBefore(weekEnd) && checkDate.isSameOrBefore(endOfMonth)) {
          if (checkDate.isSameOrAfter(startOfMonth)) {
            const dayOfWeek = checkDate.day();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
              workdaysInWeek++;
              if (checkDate.isSameOrBefore(today, 'day')) {
                workdaysPast++;
              }
            }
          }
          checkDate.add(1, 'day');
        }
        
        // Calculate expected attendance and absent
        const expectedAttendance = totalActiveEmployees * workdaysPast;
        const absent = Math.max(0, expectedAttendance - weekData.present);
        
        allWeeks.push({
          weekKey,
          startDate: weekData.startDate,
          endDate: weekData.endDate,
          present: weekData.present,
          late: weekData.late,
          absent: absent,
          workdays: workdaysInWeek
        });
        
        currentWeekStart.add(1, 'week');
      }

      // Convert to chart data with better labels
      chartData = allWeeks
        .filter(week => week.startDate.isSameOrBefore(endOfMonth) && week.endDate.isSameOrAfter(startOfMonth))
        .map((week, index) => {
          const startStr = week.startDate.format('MMM D');
          const endStr = week.endDate.format('MMM D');
          // Use shorter format for better display
          return {
            name: `W${index + 1}: ${startStr}`,
            fullName: `Week ${index + 1} (${startStr} - ${endStr})`,
            present: week.present,
            late: week.late,
            absent: week.absent,
            weekStart: week.startDate.format('YYYY-MM-DD')
          };
        });
    }

    // Generate department-wise pie chart data
    let pieData = [];
    try {
      const departmentData = await Attendance.aggregate([
        { $match: finalFilter },
        { $match: { 'checkIn.time': { $exists: true } } },
        {
          $lookup: {
            from: 'users',
            localField: 'employee',
            foreignField: '_id',
            as: 'employeeData'
          }
        },
        { $unwind: '$employeeData' },
        {
          $group: {
            _id: '$employeeData.department',
            present: { $sum: 1 }
          }
        }
      ]);

      pieData = departmentData.map(dept => ({
        name: dept._id || 'Unknown',
        value: dept.present || 0
      }));
    } catch (pieError) {
      console.error('Error generating pie chart data:', pieError);
      pieData = [];
    }

    // Calculate summary statistics
    const presentCount = attendance.filter(a => a.checkIn && a.checkIn.time).length;
    const lateCount = attendance.filter(a => a.status === 'late').length;
    
    // Calculate expected attendance days based on period
    let expectedDays = 1;
    if (period === 'weekly') {
      const daysDiff = moment(dateFilter.date.$lte).diff(moment(dateFilter.date.$gte), 'days') + 1;
      expectedDays = Math.min(daysDiff, 7);
    } else if (period === 'monthly') {
      const daysDiff = moment(dateFilter.date.$lte).diff(moment(dateFilter.date.$gte), 'days') + 1;
      expectedDays = daysDiff;
    }
    
    const expectedAttendance = totalActiveEmployees * expectedDays;
    const absentCount = expectedAttendance > presentCount ? expectedAttendance - presentCount : 0;

    const summary = {
      totalRecords: attendance.length,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      totalEmployees: totalActiveEmployees,
      attendanceRate: expectedAttendance > 0 ? (presentCount / expectedAttendance) * 100 : 0
    };

    if (format === 'csv') {
      // Generate CSV format
      const csvData = attendance.map(record => ({
        'Employee Name': record.employee.name,
        'Employee ID': record.employee.employeeId,
        'Department': record.employee.department,
        'Date': record.date.toISOString().split('T')[0],
        'Check In': record.checkIn.time ? record.checkIn.time.toISOString() : '',
        'Check Out': record.checkOut.time ? record.checkOut.time.toISOString() : '',
        'Status': record.status,
        'Working Hours': record.workingHours,
        'Overtime': record.overtime,
        'Notes': record.notes || ''
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
      
      // Simple CSV generation
      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');
      
      res.send(csv);
    } else {
      // Ensure chartData and pieData are always arrays
      const responseData = {
        chartData: Array.isArray(chartData) ? chartData : [],
        pieData: Array.isArray(pieData) ? pieData : [],
        summary: summary || {
          totalRecords: 0,
          present: 0,
          absent: 0,
          late: 0,
          totalEmployees: totalActiveEmployees,
          attendanceRate: 0
        }
      };
      
      // Only include attendance array if format is json and we have data
      if (format === 'json' && attendance && attendance.length > 0) {
        responseData.attendance = attendance;
      }
      
      res.json({
        success: true,
        data: responseData
      });
    }
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating attendance report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/reports/employee/:id
// @desc    Get individual employee report
// @access  Private
router.get('/employee/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user can access this employee's data
    if (req.user.role === 'employee' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = { employee: id };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(100); // Limit to last 100 records

    // Calculate employee statistics
    const stats = {
      totalDays: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length,
      averageWorkingHours: attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0) / attendance.length || 0,
      totalOvertime: attendance.reduce((sum, a) => sum + (a.overtime || 0), 0)
    };

    res.json({
      success: true,
      data: {
        attendance,
        stats
      }
    });
  } catch (error) {
    console.error('Employee report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating employee report'
    });
  }
});

export default router;