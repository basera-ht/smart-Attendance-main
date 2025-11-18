'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../hooks/useAuth'
import { leavesAPI } from '../../services/api'
import { Calendar, Plus, Edit, Trash2, CheckCircle, X, Clock, FileText } from 'lucide-react'

export default function LeavesPage() {
  const { user, hasRole } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLeave, setEditingLeave] = useState(null)
  const [formData, setFormData] = useState({
    leaveType: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
    isPaid: true // Default to paid leave
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isEmployee = hasRole('employee')
  const isAdmin = hasRole('admin') || hasRole('hr')

  useEffect(() => {
    fetchLeaves()
    if (isEmployee) {
      fetchStats()
    }
  }, [])

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      const response = await leavesAPI.getLeaves()
      if (response?.data?.success) {
        const leavesData = response.data.data.docs || response.data.data || []
        setLeaves(leavesData)
      }
    } catch (err) {
      console.error('Error fetching leaves:', err)
      setError('Failed to fetch leave requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await leavesAPI.getLeaveStats()
      if (response?.data?.success) {
        setStats(response.data.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    // Validate form data before submission
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason?.trim()) {
      setError('Please fill in all required fields')
      setSubmitting(false)
      return
    }

    // Ensure dates are in ISO format
    const submitData = {
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason.trim(),
      isPaid: formData.isPaid,
      ...(formData.attachments && { attachments: formData.attachments })
    }

    console.log('Submitting leave data:', submitData)

    try {
      if (editingLeave) {
        const response = await leavesAPI.updateLeave(editingLeave._id, submitData)
        if (response?.data?.success) {
          await fetchLeaves()
          resetForm()
        } else {
          setError(response?.data?.message || 'Failed to update leave request')
        }
      } else {
        const response = await leavesAPI.createLeave(submitData)
        if (response?.data?.success) {
          await fetchLeaves()
          if (isEmployee) await fetchStats()
          resetForm()
        } else {
          setError(response?.data?.message || 'Failed to create leave request')
        }
      }
    } catch (err) {
      console.error('Submit error:', err)
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      })
      
      // Handle different error types
      if (err.response) {
        // Server responded with error
        const errorData = err.response.data
        if (errorData?.errors && Array.isArray(errorData.errors)) {
          // Validation errors
          setError(errorData.errors.map(e => e.msg || e.message).join(', ') || errorData.message || 'Validation failed')
        } else {
          setError(errorData?.message || `Error ${err.response.status}: ${err.response.statusText}` || 'An error occurred')
        }
      } else if (err.request) {
        // Request was made but no response received
        setError('Network error. Please check if the server is running.')
      } else {
        // Error setting up the request
        setError(err.message || 'An error occurred. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (leave) => {
    setEditingLeave(leave)
    setFormData({
      leaveType: leave.leaveType,
      startDate: leave.startDate.split('T')[0],
      endDate: leave.endDate.split('T')[0],
      reason: leave.reason,
      isPaid: leave.isPaid !== undefined ? leave.isPaid : true
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this leave request?')) return

    try {
      const response = await leavesAPI.deleteLeave(id)
      if (response?.data?.success) {
        await fetchLeaves()
        if (isEmployee) await fetchStats()
      } else {
        setError(response?.data?.message || 'Failed to delete leave request')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError(err?.response?.data?.message || 'Failed to delete leave request')
    }
  }

  const handleApproveReject = async (id, status, comments = '') => {
    try {
      const response = await leavesAPI.updateLeave(id, {
        status,
        reviewComments: comments || undefined
      })
      if (response?.data?.success) {
        await fetchLeaves()
      } else {
        setError(response?.data?.message || 'Failed to update leave request')
      }
    } catch (err) {
      console.error('Approve/reject error:', err)
      setError(err?.response?.data?.message || 'Failed to update leave request')
    }
  }

  const resetForm = () => {
    setFormData({
      leaveType: 'vacation',
      startDate: '',
      endDate: '',
      reason: '',
      isPaid: true
    })
    setEditingLeave(null)
    setShowForm(false)
    setError('')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getLeaveTypeLabel = (type) => {
    const labels = {
      sick: 'Sick Leave',
      vacation: 'Vacation',
      personal: 'Personal',
      emergency: 'Emergency',
      maternity: 'Maternity',
      paternity: 'Paternity',
      bereavement: 'Bereavement',
      other: 'Other'
    }
    return labels[type] || type
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600 mt-1">
              {isEmployee ? 'Manage your leave requests' : 'Review and manage employee leave requests'}
            </p>
          </div>
          {isEmployee && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Apply for Leave</span>
            </button>
          )}
        </div>

        {/* Stats for Employees */}
        {isEmployee && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Leaves</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
              <p className="text-sm text-yellow-700">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pending || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
              <p className="text-sm text-green-700">Approved</p>
              <p className="text-2xl font-bold text-green-900">{stats.approved || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">This Year</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisYear || 0}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Leave Request Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {editingLeave ? 'Edit Leave Request' : 'Apply for Leave'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type
                  </label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="vacation">Vacation</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal</option>
                    <option value="emergency">Emergency</option>
                    <option value="maternity">Maternity</option>
                    <option value="paternity">Paternity</option>
                    <option value="bereavement">Bereavement</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Days
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    {formData.startDate && formData.endDate ? (
                      (() => {
                        const start = new Date(formData.startDate)
                        const end = new Date(formData.endDate)
                        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
                        return `${days} day${days !== 1 ? 's' : ''}`
                      })()
                    ) : (
                      '-'
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Payment Type
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPaid: true })}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        formData.isPaid
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Paid Leave
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPaid: false })}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        !formData.isPaid
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Unpaid Leave
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Please provide a reason for your leave request..."
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium"
                >
                  {submitting ? 'Submitting...' : editingLeave ? 'Update Request' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Leaves List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {isEmployee ? 'My Leave Requests' : 'All Leave Requests'}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {!isEmployee && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Applied Date
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  )}
                  {isEmployee && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={isEmployee ? 8 : 9} className="px-6 py-8 text-center text-gray-500">
                      No leave requests found
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-gray-50">
                      {!isEmployee && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {leave.employee?.name || 'Unknown'}
                          <br />
                          <span className="text-gray-500 text-xs">{leave.employee?.employeeId}</span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getLeaveTypeLabel(leave.leaveType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(leave.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(leave.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          leave.isPaid !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {leave.isPaid !== false ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(leave.appliedDate)}
                      </td>
                      {isAdmin && leave.status === 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => {
                              const comments = prompt('Approval comments (optional):')
                              if (comments !== null) {
                                handleApproveReject(leave._id, 'approved', comments)
                              }
                            }}
                            className="text-green-600 hover:text-green-700"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              const comments = prompt('Rejection reason (optional):')
                              if (comments !== null) {
                                handleApproveReject(leave._id, 'rejected', comments)
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                            title="Reject"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </td>
                      )}
                      {isEmployee && leave.status === 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleEdit(leave)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(leave._id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      )}
                      {(isAdmin && leave.status !== 'pending') || (isEmployee && leave.status !== 'pending') ? (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          -
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

