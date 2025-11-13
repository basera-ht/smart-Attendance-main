import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import moment from 'moment';

export const getDashboardStats = async (req, res) => {
  try {
    const today = moment().startOf('day').toDate();
    const tomorrow = moment().endOf('day').toDate();
    
    // Get today's attendance
    const todayAttendance = await Attendance.find({ 
      date: { $gte: today, $lte: tomorrow } 
    }).populate('employee', 'department');

    // Get total active employees
    const totalEmployees = await User.countDocuments({ status: 'active' });
    
    // Calculate today's stats
    const presentToday = todayAttendance.filter(a => a.checkIn).length;
    const lateToday = todayAttendance.filter(a => a.status === 'late').length;
    const absentToday = totalEmployees - presentToday;

    // Get monthly stats
    const monthStart = moment().startOf('month').toDate();
    const monthEnd = moment().endOf('month').toDate();
    
    const monthlyAttendance = await Attendance.find({
      date: { $gte: monthStart, $lte: monthEnd }
    });

    const totalWorkDays = moment().date(); // Days passed in current month
    const expectedAttendanceDays = totalEmployees * totalWorkDays;
    const actualAttendanceDays = monthlyAttendance.filter(a => a.checkIn).length;
    
    const attendanceRate = expectedAttendanceDays > 0 
      ? (actualAttendanceDays / expectedAttendanceDays) * 100 
      : 0;

    // Get department-wise stats
    const departments = await User.distinct('department');
    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const deptEmployees = await User.countDocuments({ 
          department: dept, 
          status: 'active' 
        });
        const deptPresent = todayAttendance.filter(
          a => a.employee?.department === dept && a.checkIn
        ).length;
        
        return {
          department: dept,
          total: deptEmployees,
          present: deptPresent,
          attendanceRate: deptEmployees > 0 ? (deptPresent / deptEmployees) * 100 : 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalEmployees,
        presentToday,
        lateToday,
        absentToday,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        departmentStats
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Fix the report generation function
export const getAttendanceReport = async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate, department } = req.query;
    
    let dateFilter = {};
    const now = moment();
    
    // Set date range based on period
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
      case 'custom':
        if (startDate && endDate) {
          dateFilter = {
            date: {
              $gte: moment(startDate).startOf('day').toDate(),
              $lte: moment(endDate).endOf('day').toDate()
            }
          };
        } else {
          return res.status(400).json({
            success: false,
            message: 'Start date and end date are required for custom period'
          });
        }
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid period specified'
        });
    }

    // Build employee filter if department is specified
    let employeeFilter = {};
    if (department && department !== 'all') {
      const employeesInDept = await User.find({ department, status: 'active' }).select('_id');
      employeeFilter = { employee: { $in: employeesInDept.map(emp => emp._id) } };
    }

    const finalFilter = { ...dateFilter, ...employeeFilter };

    // Get attendance data with proper population
    const attendanceData = await Attendance.find(finalFilter)
      .populate('employee', 'name email employeeId department position')
      .sort({ date: 1, checkIn: 1 });

    // Generate analytics data
    const chartData = generateChartData(attendanceData, period);
    const pieData = generatePieData(attendanceData);
    const detailedReport = generateDetailedReport(attendanceData);

    res.json({
      success: true,
      data: {
        chartData,
        pieData,
        detailedReport,
        summary: {
          totalRecords: attendanceData.length,
          presentCount: attendanceData.filter(a => a.status === 'present' || a.status === 'late').length,
          absentCount: attendanceData.filter(a => a.status === 'absent').length,
          lateCount: attendanceData.filter(a => a.status === 'late').length,
          averageHours: attendanceData.length > 0 
            ? (attendanceData.reduce((sum, a) => sum + (a.totalHours || 0), 0) / attendanceData.length).toFixed(2)
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating attendance report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

