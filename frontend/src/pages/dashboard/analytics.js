'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { analyticsAPI } from '../../services/api'
import { AttendanceBarChart, StatusPieChart } from '../../components/AnalyticsChart'
import DashboardLayout from '../../components/DashboardLayout'

export default function Analytics() {
  const { user, hasRole } = useAuth()
  const [analytics, setAnalytics] = useState({})
  const [chartData, setChartData] = useState([])
  const [pieData, setPieData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('weekly')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError('')
        
        const [statsResponse, chartResponse] = await Promise.all([
          analyticsAPI.getDashboardStats(),
          analyticsAPI.getAttendanceReport({ period: selectedPeriod })
        ])
        
        console.log('Stats Response:', statsResponse?.data)
        console.log('Chart Response:', chartResponse?.data)
        
        // Use period-specific data from attendance report
        if (chartResponse?.data?.success && chartResponse.data.data) {
          const reportData = chartResponse.data.data
          
          console.log('Report Data:', reportData)
          
          // Set chart data from the report (already formatted for the period)
          if (reportData.chartData && Array.isArray(reportData.chartData)) {
            setChartData(reportData.chartData)
          } else {
            setChartData([])
          }
          
          // Set pie chart data from the report
          if (reportData.pieData && Array.isArray(reportData.pieData)) {
            setPieData(reportData.pieData)
          } else {
            setPieData([])
          }
          
          // Set period-specific analytics from the report summary
          if (reportData.summary) {
            setAnalytics({
              totalEmployees: reportData.summary.totalEmployees || 0,
              presentToday: reportData.summary.present || 0,
              lateToday: reportData.summary.late || 0,
              absentToday: reportData.summary.absent || 0,
              attendanceRate: reportData.summary.attendanceRate || 0,
              totalRecords: reportData.summary.totalRecords || 0
            })
          } else if (statsResponse?.data?.success && statsResponse.data.data) {
            // Fallback to dashboard stats if report doesn't have summary
            setAnalytics(statsResponse.data.data)
          }
        } else if (statsResponse?.data?.success && statsResponse.data.data) {
          // Fallback to dashboard stats
          console.log('Using fallback dashboard stats')
          setAnalytics(statsResponse.data.data)
          
          // Transform weekly attendance data for charts (fallback)
          const weeklyData = statsResponse.data.data.weeklyAttendance || []
          const chartData = weeklyData.map(day => ({
            name: new Date(day._id).toLocaleDateString('en-US', { weekday: 'short' }),
            present: day.present,
            absent: day.absent || 0,
            late: day.late || 0
          }))
          setChartData(chartData)
          
          // Transform department attendance for pie chart (fallback)
          const deptData = statsResponse.data.data.departmentAttendance || []
          const pieData = deptData.map(dept => ({
            name: dept._id,
            value: dept.present
          }))
          setPieData(pieData)
        } else {
          const errorMsg = chartResponse?.data?.message || statsResponse?.data?.message || 'Failed to fetch analytics data'
          console.error('API Error:', errorMsg)
          setError(errorMsg)
        }
      } catch (err) {
        console.error('Error fetching analytics:', err)
        console.error('Error details:', err.response?.data || err.message)
        setError(err.response?.data?.message || err.message || 'Error loading analytics data')
        // Set some sample data for demo
        setAnalytics({
          totalEmployees: 25,
          presentToday: 22,
          lateToday: 3,
          absentToday: 0,
          weeklyAttendance: [
            { _id: '2024-01-01', present: 20, absent: 5, late: 2 },
            { _id: '2024-01-02', present: 22, absent: 3, late: 1 },
            { _id: '2024-01-03', present: 24, absent: 1, late: 0 },
            { _id: '2024-01-04', present: 23, absent: 2, late: 1 },
            { _id: '2024-01-05', present: 25, absent: 0, late: 0 }
          ],
          departmentAttendance: [
            { _id: 'IT', present: 8 },
            { _id: 'HR', present: 5 },
            { _id: 'Finance', present: 6 },
            { _id: 'Marketing', present: 4 }
          ]
        })
        
        const chartData = [
          { name: 'Mon', present: 20, absent: 5, late: 2 },
          { name: 'Tue', present: 22, absent: 3, late: 1 },
          { name: 'Wed', present: 24, absent: 1, late: 0 },
          { name: 'Thu', present: 23, absent: 2, late: 1 },
          { name: 'Fri', present: 25, absent: 0, late: 0 }
        ]
        setChartData(chartData)
        
        const pieData = [
          { name: 'IT', value: 8 },
          { name: 'HR', value: 5 },
          { name: 'Finance', value: 6 },
          { name: 'Marketing', value: 4 }
        ]
        setPieData(pieData)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [selectedPeriod])

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePeriodChange('daily')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === 'daily'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => handlePeriodChange('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === 'weekly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => handlePeriodChange('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === 'monthly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-lg">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.totalEmployees || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-lg">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Present {selectedPeriod === 'daily' ? 'Today' : selectedPeriod === 'weekly' ? 'This Week' : 'This Month'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.presentToday || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-yellow-600 text-lg">⏰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Late {selectedPeriod === 'daily' ? 'Today' : selectedPeriod === 'weekly' ? 'This Week' : 'This Month'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.lateToday || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-red-600 text-lg">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Absent {selectedPeriod === 'daily' ? 'Today' : selectedPeriod === 'weekly' ? 'This Week' : 'This Month'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.absentToday || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Attendance Trend - {selectedPeriod === 'daily' ? 'Today (Hourly)' : selectedPeriod === 'weekly' ? 'This Week (Daily)' : 'This Month (Weekly)'}
            </h3>
            <AttendanceBarChart data={chartData} period={selectedPeriod} />
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Department Distribution</h3>
            <StatusPieChart data={pieData} />
          </div>
        </div>

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Rate</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Overall Attendance Rate</span>
                  <span>{analytics.attendanceRate ? Math.round(analytics.attendanceRate) : (analytics.totalEmployees ? Math.round((analytics.presentToday / analytics.totalEmployees) * 100) : 0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${analytics.attendanceRate ? Math.min(analytics.attendanceRate, 100) : (analytics.totalEmployees ? Math.min((analytics.presentToday / analytics.totalEmployees) * 100, 100) : 0)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Punctuality Rate</span>
                  <span>{analytics.presentToday ? Math.round(((analytics.presentToday - analytics.lateToday) / analytics.presentToday) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${analytics.presentToday ? Math.min(((analytics.presentToday - analytics.lateToday) / analytics.presentToday) * 100, 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Average {selectedPeriod === 'daily' ? 'Hourly' : selectedPeriod === 'weekly' ? 'Daily' : 'Weekly'} Attendance
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {chartData.length > 0 ? Math.round(chartData.reduce((sum, day) => sum + day.present, 0) / chartData.length) : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Best {selectedPeriod === 'daily' ? 'Hour' : selectedPeriod === 'weekly' ? 'Day' : 'Week'}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {chartData.length > 0 ? chartData.reduce((max, day) => day.present > max.present ? day : max, chartData[0])?.name : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Total {selectedPeriod === 'daily' ? 'Hours' : selectedPeriod === 'weekly' ? 'Days' : 'Weeks'}
                </span>
                <span className="text-sm font-medium text-gray-900">{chartData.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
