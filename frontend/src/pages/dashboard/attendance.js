'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { attendanceAPI, employeesAPI } from '../../services/api'
import DashboardLayout from '../../components/DashboardLayout'
import MonthlyCalendarView from '../../components/MonthlyCalendarView'

export default function Attendance() {
  const { user, hasRole, hasAnyRole } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [actionLoading, setActionLoading] = useState({})
  const [activeTab, setActiveTab] = useState('today') // 'today' or 'calendar'
  const [todayRecord, setTodayRecord] = useState(null)
  const [quickActionLoading, setQuickActionLoading] = useState(false)
  const isAdmin = hasAnyRole(['admin', 'hr'])

  // Helper function to retry API calls on 429 errors
  const retryApiCall = async (apiCall, retryCount = 0, maxRetries = 2) => {
    try {
      return await apiCall()
    } catch (error) {
      if (error.response?.status === 429 && retryCount < maxRetries) {
        const retryAfter = error.response.headers['retry-after']
        const waitTime = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : Math.min(2000 * Math.pow(2, retryCount), 10000) // Max 10 seconds
        
        console.log(`Rate limited. Retrying after ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries})`)
        
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return retryApiCall(apiCall, retryCount + 1, maxRetries)
      }
      throw error
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch attendance with retry logic
        const attendanceResponse = await retryApiCall(() => attendanceAPI.getTodayAttendance())
        if (attendanceResponse.data && attendanceResponse.data.success) {
          const data = attendanceResponse.data.data
          // Handle both array and single object responses
          const attendanceList = Array.isArray(data) ? data : [data]
          setAttendance(attendanceList)
          
          // For employees, get their own record for quick action button
          if (hasRole('employee')) {
            if (attendanceList.length > 0) {
              const myRecord = attendanceList.find(r => {
                const empId = r.employee?._id || r.employee || r.employeeId
                const userId = user?._id || user?.id
                return empId && userId && (empId.toString() === userId.toString())
              })
              if (myRecord) {
                setTodayRecord(myRecord)
              } else if (attendanceList.length > 0) {
                // If no match found but we have records, check if it's a single employee record
                setTodayRecord(attendanceList[0])
              }
            } else if (!Array.isArray(data) && data) {
              setTodayRecord(data)
            }
          }
        } else {
          setError('Failed to fetch attendance data')
        }

        // Fetch employees if admin with retry logic
        if (isAdmin) {
          try {
            const employeesResponse = await retryApiCall(() => employeesAPI.getEmployees())
            if (employeesResponse.data && employeesResponse.data.success) {
              const employeesData = employeesResponse.data.data
              // Handle paginated response
              const employeesList = employeesData.docs || employeesData.data || employeesData || []
              setEmployees(employeesList)
            }
          } catch (err) {
            console.error('Error fetching employees:', err)
          }
        }
      } catch (err) {
        console.error('Error fetching attendance:', err)
        if (err.response?.status === 429) {
          const retryAfter = err.response.headers['retry-after']
          const waitTime = retryAfter ? `${retryAfter} seconds` : 'a few minutes'
          setError(`Rate limit exceeded. Please wait ${waitTime} and refresh the page.`)
        } else {
          setError(err.response?.data?.message || 'Error loading attendance data')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAdmin, user])

  const handleCheckIn = async () => {
    try {
      const response = await attendanceAPI.checkIn({
        employeeId: user.employeeId,
        location: 'Office',
        notes: 'Checked in via web portal'
      })
      
      if (response.data && response.data.success) {
        alert('Check-in successful!')
        // Refresh attendance data
        window.location.reload()
      }
    } catch (err) {
      console.error('Check-in error:', err)
      alert('Check-in failed. Please try again.')
    }
  }

  const handleCheckOut = async () => {
    try {
      const response = await attendanceAPI.checkOut({
        employeeId: user.employeeId,
        location: 'Office',
        notes: 'Checked out via web portal'
      })
      
      if (response.data && response.data.success) {
        alert('Check-out successful!')
        // Refresh attendance data
        window.location.reload()
      }
    } catch (err) {
      console.error('Check-out error:', err)
      alert('Check-out failed. Please try again.')
    }
  }

  const handleQuickCheckIn = async () => {
    if (quickActionLoading) return
    
    try {
      setQuickActionLoading(true)
      const response = await attendanceAPI.checkIn({
        employeeId: user.employeeId,
        location: 'Office',
        notes: 'Quick check-in'
      })
      
      if (response.data && response.data.success) {
        // Refresh data with retry logic
        const attendanceResponse = await retryApiCall(() => attendanceAPI.getTodayAttendance())
        if (attendanceResponse.data && attendanceResponse.data.success) {
          const data = attendanceResponse.data.data
          const attendanceList = Array.isArray(data) ? data : [data]
          setAttendance(attendanceList)
          if (attendanceList.length > 0) {
            const myRecord = attendanceList.find(r => {
              const empId = r.employee?._id || r.employee
              return empId === user?._id || empId === user?.id
            }) || attendanceList[0]
            setTodayRecord(myRecord)
          }
        }
        alert('✓ Check-in successful!')
      }
    } catch (err) {
      console.error('Quick check-in error:', err)
      alert(err.response?.data?.message || 'Check-in failed. Please try again.')
    } finally {
      setQuickActionLoading(false)
    }
  }

  const handleQuickCheckOut = async () => {
    if (quickActionLoading) return
    
    try {
      setQuickActionLoading(true)
      const response = await attendanceAPI.checkOut({
        employeeId: user.employeeId,
        location: 'Office',
        notes: 'Quick check-out'
      })
      
      if (response.data && response.data.success) {
        // Refresh data with retry logic
        const attendanceResponse = await retryApiCall(() => attendanceAPI.getTodayAttendance())
        if (attendanceResponse.data && attendanceResponse.data.success) {
          const data = attendanceResponse.data.data
          const attendanceList = Array.isArray(data) ? data : [data]
          setAttendance(attendanceList)
          if (attendanceList.length > 0) {
            const myRecord = attendanceList.find(r => {
              const empId = r.employee?._id || r.employee
              return empId === user?._id || empId === user?.id
            }) || attendanceList[0]
            setTodayRecord(myRecord)
          }
        }
        alert('✓ Check-out successful!')
      }
    } catch (err) {
      console.error('Quick check-out error:', err)
      alert(err.response?.data?.message || 'Check-out failed. Please try again.')
    } finally {
      setQuickActionLoading(false)
    }
  }

  // Determine current status for quick action button
  const isEmployee = hasRole('employee')
  const hasCheckedIn = todayRecord?.checkIn || todayRecord?.checkInTime || todayRecord?.checkIn?.time
  const hasCheckedOut = todayRecord?.checkOut || todayRecord?.checkOutTime || todayRecord?.checkOut?.time
  const canCheckIn = isEmployee && !hasCheckedIn
  const canCheckOut = isEmployee && hasCheckedIn && !hasCheckedOut

  const handleAdminCheckIn = async (employeeId) => {
    if (!employeeId) {
      alert('Please select an employee')
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, [`checkin-${employeeId}`]: true }))
      const response = await attendanceAPI.adminCheckIn({
        employeeId,
        location: 'Office',
        notes: `Checked in by admin: ${user.name}`
      })
      
      if (response.data && response.data.success) {
        alert(response.data.message || 'Check-in successful!')
        // Refresh attendance data
        const attendanceResponse = await attendanceAPI.getTodayAttendance()
        if (attendanceResponse.data && attendanceResponse.data.success) {
          const data = attendanceResponse.data.data
          setAttendance(Array.isArray(data) ? data : [data])
        }
      } else {
        alert(response.data?.message || 'Check-in failed')
      }
    } catch (err) {
      console.error('Admin check-in error:', err)
      const errorMessage = err.response?.data?.message || 'Check-in failed. Please try again.'
      alert(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [`checkin-${employeeId}`]: false }))
    }
  }

  const handleAdminCheckOut = async (employeeId) => {
    if (!employeeId) {
      alert('Please select an employee')
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, [`checkout-${employeeId}`]: true }))
      const response = await attendanceAPI.adminCheckOut({
        employeeId,
        location: 'Office',
        notes: `Checked out by admin: ${user.name}`
      })
      
      if (response.data && response.data.success) {
        alert(response.data.message || 'Check-out successful!')
        // Refresh attendance data
        const attendanceResponse = await attendanceAPI.getTodayAttendance()
        if (attendanceResponse.data && attendanceResponse.data.success) {
          const data = attendanceResponse.data.data
          setAttendance(Array.isArray(data) ? data : [data])
        }
      } else {
        alert(response.data?.message || 'Check-out failed')
      }
    } catch (err) {
      console.error('Admin check-out error:', err)
      const errorMessage = err.response?.data?.message || 'Check-out failed. Please try again.'
      alert(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [`checkout-${employeeId}`]: false }))
    }
  }

  const getEmployeeIdFromRecord = (record) => {
    // Handle different record structures
    if (record.employee?._id) return record.employee._id
    if (record.employee) return record.employee
    if (record.employeeId) {
      // Find employee by employeeId
      const emp = employees.find(e => e.employeeId === record.employeeId)
      return emp?._id
    }
    return null
  }

  const getEmployeeName = (record) => {
    if (record.employeeName) return record.employeeName
    if (record.employee?.name) return record.employee.name
    return 'Unknown'
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
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <div className="flex space-x-4">
            {hasRole('employee') && (
              <>
                <button
                  onClick={handleCheckIn}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Check In
                </button>
                <button
                  onClick={handleCheckOut}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Check Out
                </button>
              </>
            )}
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.employeeId || 'N/A'})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleAdminCheckIn(selectedEmployee)}
                  disabled={!selectedEmployee || actionLoading[`checkin-${selectedEmployee}`]}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {actionLoading[`checkin-${selectedEmployee}`] ? 'Processing...' : 'Check In Employee'}
                </button>
                <button
                  onClick={() => handleAdminCheckOut(selectedEmployee)}
                  disabled={!selectedEmployee || actionLoading[`checkout-${selectedEmployee}`]}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {actionLoading[`checkout-${selectedEmployee}`] ? 'Processing...' : 'Check Out Employee'}
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('today')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'today'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Today's Attendance
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'calendar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Monthly Calendar
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'today' ? (
          <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Today's Attendance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance.length > 0 ? (
                  attendance.map((record, index) => {
                    const employeeId = getEmployeeIdFromRecord(record)
                    const employeeName = getEmployeeName(record)
                    const checkInTime = record.checkIn 
                      ? (typeof record.checkIn === 'string' ? record.checkIn : new Date(record.checkIn).toLocaleTimeString())
                      : (record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString() : null)
                    const checkOutTime = record.checkOut
                      ? (typeof record.checkOut === 'string' ? record.checkOut : new Date(record.checkOut).toLocaleTimeString())
                      : (record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString() : null)
                    const status = record.status || (checkInTime ? 'Present' : 'Absent')
                    
                    return (
                      <tr key={record.id || record._id || index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employeeName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {checkInTime || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {checkOutTime || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            status === 'Present' || status === 'present'
                              ? 'bg-green-100 text-green-800' 
                              : status === 'Late' || status === 'late'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.date || new Date().toISOString().split('T')[0]}
                        </td>
                        {isAdmin && employeeId && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              {!checkInTime && (
                                <button
                                  onClick={() => handleAdminCheckIn(employeeId)}
                                  disabled={actionLoading[`checkin-${employeeId}`]}
                                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  {actionLoading[`checkin-${employeeId}`] ? '...' : 'Check In'}
                                </button>
                              )}
                              {checkInTime && !checkOutTime && (
                                <button
                                  onClick={() => handleAdminCheckOut(employeeId)}
                                  disabled={actionLoading[`checkout-${employeeId}`]}
                                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  {actionLoading[`checkout-${employeeId}`] ? '...' : 'Check Out'}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No attendance records found for today
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          <MonthlyCalendarView isAdmin={isAdmin} />
        )}

        {/* Floating Quick Action Button for Employees */}
        {isEmployee && (canCheckIn || canCheckOut) && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={canCheckIn ? handleQuickCheckIn : handleQuickCheckOut}
              disabled={quickActionLoading}
              className={`${
                canCheckIn 
                  ? 'bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl' 
                  : 'bg-red-500 hover:bg-red-600 shadow-lg hover:shadow-xl'
              } disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 flex items-center space-x-3`}
            >
              {quickActionLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {canCheckIn ? (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Quick Check In</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Quick Check Out</span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
