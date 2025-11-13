'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { attendanceAPI, employeesAPI } from '../../services/api'
import DashboardLayout from '../../components/DashboardLayout'

export default function Attendance() {
  const { user, hasRole, hasAnyRole } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [actionLoading, setActionLoading] = useState({})
  const isAdmin = hasAnyRole(['admin', 'hr'])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch attendance
        const attendanceResponse = await attendanceAPI.getTodayAttendance()
        if (attendanceResponse.data && attendanceResponse.data.success) {
          const data = attendanceResponse.data.data
          // Handle both array and single object responses
          setAttendance(Array.isArray(data) ? data : [data])
        } else {
          setError('Failed to fetch attendance data')
        }

        // Fetch employees if admin
        if (isAdmin) {
          try {
            const employeesResponse = await employeesAPI.getEmployees()
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
        setError('Error loading attendance data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAdmin])

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
      </div>
    </DashboardLayout>
  )
}
