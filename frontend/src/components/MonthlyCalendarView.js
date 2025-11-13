'use client'
import { useEffect, useState } from 'react'
import { attendanceAPI, employeesAPI, leavesAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'

export default function MonthlyCalendarView({ isAdmin }) {
  const { user } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [attendanceData, setAttendanceData] = useState({})
  const [leaveData, setLeaveData] = useState({})
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [actionLoading, setActionLoading] = useState({})
  const [todayAttendance, setTodayAttendance] = useState({})

  useEffect(() => {
    if (user || isAdmin) {
      fetchData()
    }
  }, [selectedMonth, isAdmin, user])

  const fetchData = async () => {
    try {
      setLoading(true)
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth()
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)

      // Fetch employees
      if (isAdmin) {
        const empResponse = await employeesAPI.getEmployees()
        if (empResponse.data?.success) {
          const empData = empResponse.data.data
          const empList = empData.docs || empData.data || empData || []
          setEmployees(empList)
        }
      } else if (user) {
        // For employees, show only their own data
        setEmployees([user])
      }

      // Fetch leaves for the month
      const leavesResponse = await leavesAPI.getLeaves({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        status: 'approved',
        limit: 1000
      })

      if (leavesResponse.data?.success) {
        const leaves = leavesResponse.data.data?.docs || leavesResponse.data.data?.data || leavesResponse.data.data || []
        
        // Organize leaves by employee and date
        const organized = {}
        leaves.forEach(leave => {
          const empId = leave.employee?._id || leave.employee || 'unknown'
          const start = new Date(leave.startDate)
          const end = new Date(leave.endDate)
          
          if (!organized[empId]) {
            organized[empId] = {}
          }
          
          // Mark all days in leave range
          const currentDate = new Date(start)
          while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0]
            // Map leave types to abbreviations
            let leaveCode = 'UL' // Default to Unpaid Leave
            if (leave.leaveType === 'vacation') leaveCode = 'PL' // Paid Leave
            if (leave.leaveType === 'sick') leaveCode = 'ML' // Medical Leave
            if (leave.leaveType === 'emergency') leaveCode = 'E' // Emergency
            
            organized[empId][dateStr] = leaveCode
            currentDate.setDate(currentDate.getDate() + 1)
          }
        })
        
        setLeaveData(organized)
      }

      // Fetch today's attendance for quick actions
      if (isAdmin) {
        try {
          const todayResponse = await attendanceAPI.getTodayAttendance()
          if (todayResponse.data?.success) {
            const todayData = todayResponse.data.data
            const todayList = Array.isArray(todayData) ? todayData : [todayData]
            const todayMap = {}
            todayList.forEach(record => {
              const empId = record.employee?._id || record.employee || record.employeeId
              if (empId) {
                todayMap[empId] = record
              }
            })
            setTodayAttendance(todayMap)
          }
        } catch (err) {
          console.error('Error fetching today attendance:', err)
        }
      }

      // Fetch attendance for the month
      const attendanceResponse = await attendanceAPI.getAttendance({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        limit: 1000
      })

      if (attendanceResponse.data?.success) {
        const data = attendanceResponse.data.data
        const attendanceList = data.docs || data.data || data || []
        
        // Organize attendance by employee and date
        const organized = {}
        attendanceList.forEach(record => {
          const empId = record.employee?._id || record.employee || 'unknown'
          const dateStr = new Date(record.date).toISOString().split('T')[0]
          
          if (!organized[empId]) {
            organized[empId] = {}
          }
          
          organized[empId][dateStr] = {
            status: record.status || (record.checkIn?.time ? 'present' : 'absent'),
            checkIn: record.checkIn?.time,
            checkOut: record.checkOut?.time,
            notes: record.notes
          }
        })
        
        setAttendanceData(organized)
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeClick = (employee) => {
    if (isAdmin) {
      setSelectedEmployee(selectedEmployee?._id === employee._id ? null : employee)
    }
  }

  const handleCheckIn = async (employeeId) => {
    if (!employeeId) return

    try {
      setActionLoading(prev => ({ ...prev, [`checkin-${employeeId}`]: true }))
      const response = await attendanceAPI.adminCheckIn({
        employeeId,
        location: 'Office',
        notes: `Checked in from calendar by ${user?.name || 'Admin'}`
      })

      if (response.data?.success) {
        alert('✓ Check-in successful!')
        // Refresh today's attendance
        const todayResponse = await attendanceAPI.getTodayAttendance()
        if (todayResponse.data?.success) {
          const todayData = todayResponse.data.data
          const todayList = Array.isArray(todayData) ? todayData : [todayData]
          const todayMap = {}
          todayList.forEach(record => {
            const empId = record.employee?._id || record.employee || record.employeeId
            if (empId) {
              todayMap[empId] = record
            }
          })
          setTodayAttendance(todayMap)
        }
        // Refresh calendar data
        fetchData()
      } else {
        alert(response.data?.message || 'Check-in failed')
      }
    } catch (err) {
      console.error('Check-in error:', err)
      alert(err.response?.data?.message || 'Check-in failed. Please try again.')
    } finally {
      setActionLoading(prev => ({ ...prev, [`checkin-${employeeId}`]: false }))
    }
  }

  const handleCheckOut = async (employeeId) => {
    if (!employeeId) return

    try {
      setActionLoading(prev => ({ ...prev, [`checkout-${employeeId}`]: true }))
      const response = await attendanceAPI.adminCheckOut({
        employeeId,
        location: 'Office',
        notes: `Checked out from calendar by ${user?.name || 'Admin'}`
      })

      if (response.data?.success) {
        alert('✓ Check-out successful!')
        // Refresh today's attendance
        const todayResponse = await attendanceAPI.getTodayAttendance()
        if (todayResponse.data?.success) {
          const todayData = todayResponse.data.data
          const todayList = Array.isArray(todayData) ? todayData : [todayData]
          const todayMap = {}
          todayList.forEach(record => {
            const empId = record.employee?._id || record.employee || record.employeeId
            if (empId) {
              todayMap[empId] = record
            }
          })
          setTodayAttendance(todayMap)
        }
        // Refresh calendar data
        fetchData()
      } else {
        alert(response.data?.message || 'Check-out failed')
      }
    } catch (err) {
      console.error('Check-out error:', err)
      alert(err.response?.data?.message || 'Check-out failed. Please try again.')
    } finally {
      setActionLoading(prev => ({ ...prev, [`checkout-${employeeId}`]: false }))
    }
  }

  const getTodayStatus = (employeeId) => {
    const record = todayAttendance[employeeId]
    if (!record) return { hasCheckedIn: false, hasCheckedOut: false }
    
    const hasCheckedIn = record.checkIn || record.checkInTime || record.checkIn?.time
    const hasCheckedOut = record.checkOut || record.checkOutTime || record.checkOut?.time
    
    return { hasCheckedIn: !!hasCheckedIn, hasCheckedOut: !!hasCheckedOut }
  }

  const getDaysInMonth = () => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    
    const days = []
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const getDayName = (dayIndex) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[dayIndex]
  }

  const getDateString = (day) => {
    if (!day) return null
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const date = new Date(year, month, day)
    return date.toISOString().split('T')[0]
  }

  const getAttendanceStatus = (employeeId, day) => {
    if (!day) return null
    const dateStr = getDateString(day)
    
    // Check leave first (leaves override attendance)
    const empLeaveData = leaveData[employeeId]
    if (empLeaveData && empLeaveData[dateStr]) {
      return empLeaveData[dateStr]
    }
    
    // Check attendance
    const empData = attendanceData[employeeId]
    if (empData && empData[dateStr]) {
      const status = empData[dateStr].status
      // Map status to abbreviations
      if (status === 'present') return 'P'
      if (status === 'leave') return 'UL' // Unpaid Leave
      if (status === 'half-day') return 'HD'
      return status?.toUpperCase().substring(0, 2) || null
    }
    
    return null
  }

  const getCellColor = (day, status) => {
    if (!day) return 'bg-white'
    
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day)
    const dayOfWeek = date.getDay()
    
    // Weekend (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'bg-orange-100' // Office close
    }
    
    // Holiday (you can add holiday logic here)
    // if (isHoliday(date)) {
    //   return 'bg-yellow-100'
    // }
    
    // Status-based colors
    if (status === 'P') {
      return 'bg-green-100' // Present
    }
    if (status === 'PL' || status === 'UL' || status === 'ML') {
      return 'bg-red-100' // Leave types - Red color
    }
    if (status === 'E') {
      return 'bg-blue-100' // Emergency
    }
    if (status === 'H') {
      return 'bg-yellow-100' // Holiday
    }
    
    return 'bg-white'
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December']

  const days = getDaysInMonth()
  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth()
  const monthName = monthNames[month]

  // Get all dates in month for header
  const monthDates = []
  for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
    const date = new Date(year, month, day)
    monthDates.push({
      day,
      dayName: getDayName(date.getDay()),
      date
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header with month selector */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{monthName} {year}</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              const newDate = new Date(selectedMonth)
              newDate.setMonth(month - 1)
              setSelectedMonth(newDate)
            }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
          >
            Previous
          </button>
          <button
            onClick={() => setSelectedMonth(new Date())}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            Current Month
          </button>
          <button
            onClick={() => {
              const newDate = new Date(selectedMonth)
              newDate.setMonth(month + 1)
              setSelectedMonth(newDate)
            }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
          >
            Next
          </button>
        </div>
      </div>

      {/* Calendar Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-50 p-2 text-left font-semibold text-sm sticky left-0 z-10 bg-gray-50">
                Employee
              </th>
              {monthDates.map(({ day, dayName, date }) => {
                const dayOfWeek = date.getDay()
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                return (
                  <th
                    key={day}
                    className={`border border-gray-300 p-2 text-center text-xs font-semibold ${
                      isWeekend ? 'bg-orange-100' : 'bg-gray-50'
                    }`}
                  >
                    <div>{dayName}</div>
                    <div className="font-bold">{day}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map((employee) => {
                const employeeId = employee._id
                const isSelected = selectedEmployee?._id === employeeId
                const todayStatus = getTodayStatus(employeeId)
                return (
                  <tr key={employeeId} className="relative">
                    <td 
                      className={`border border-gray-300 bg-gray-50 p-3 font-medium text-sm sticky left-0 z-10 ${
                        isAdmin ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''
                      } ${isSelected ? 'bg-blue-100' : ''}`}
                      onClick={() => handleEmployeeClick(employee)}
                      title={isAdmin ? 'Click to check in/out' : ''}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>{employee.name}</span>
                          {isAdmin && (
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          )}
                        </div>
                        {isAdmin && isSelected && (
                          <div className="ml-2 flex space-x-2">
                            {!todayStatus.hasCheckedIn ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCheckIn(employeeId)
                                }}
                                disabled={actionLoading[`checkin-${employeeId}`]}
                                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors shadow-sm hover:shadow"
                                title="Check In Employee"
                              >
                                {actionLoading[`checkin-${employeeId}`] ? (
                                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  '✓ Check In'
                                )}
                              </button>
                            ) : null}
                            {todayStatus.hasCheckedIn && !todayStatus.hasCheckedOut ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCheckOut(employeeId)
                                }}
                                disabled={actionLoading[`checkout-${employeeId}`]}
                                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors shadow-sm hover:shadow"
                                title="Check Out Employee"
                              >
                                {actionLoading[`checkout-${employeeId}`] ? (
                                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  '✗ Check Out'
                                )}
                              </button>
                            ) : null}
                            {todayStatus.hasCheckedIn && todayStatus.hasCheckedOut && (
                              <span className="text-xs text-gray-500 italic">Completed</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    {monthDates.map(({ day, date }) => {
                      const status = getAttendanceStatus(employeeId, day)
                      const cellColor = getCellColor(day, status)
                      return (
                        <td
                          key={day}
                          className={`border border-gray-300 p-2 text-center text-sm font-semibold ${cellColor}`}
                        >
                          {status || ''}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={monthDates.length + 1} className="text-center p-4 text-gray-500">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-300">
        <h3 className="font-semibold text-sm mb-3">Abbreviation</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-semibold mb-1">Attendance:</p>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-100 border border-gray-300"></div>
              <span>P - Present</span>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-1">Leave:</p>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-red-100 border border-gray-300"></div>
                <span>PL - Paid</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-red-100 border border-gray-300"></div>
                <span>UL - Unpaid</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-red-100 border border-gray-300"></div>
                <span>ML - Medical</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-1">Other:</p>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 border border-gray-300"></div>
                <span>E - Emergency</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-yellow-100 border border-gray-300"></div>
                <span>H - Holiday</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-1">Office:</p>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-orange-100 border border-gray-300"></div>
              <span>Office close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

