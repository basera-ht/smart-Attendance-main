'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { employeesAPI } from '../../services/api'
import DashboardLayout from '../../components/DashboardLayout'

export default function Employees() {
  const { user, hasRole } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    position: '',
    phone: ''
  })

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true)
        const response = await employeesAPI.getEmployees()
        
        if (response.data && response.data.success) {
          // Backend returns a paginated object { docs, ... }
          const payload = response.data.data
          setEmployees(Array.isArray(payload) ? payload : (payload?.docs || []))
        } else {
          setError('Failed to fetch employees data')
        }
      } catch (err) {
        console.error('Error fetching employees:', err)
        setError('Error loading employees data')
        // Set some sample data for demo
        setEmployees([
          {
            id: 1,
            name: 'John Doe',
            email: 'john@company.com',
            role: 'employee',
            department: 'IT',
            position: 'Developer',
            employeeId: 'EMP001',
            isActive: true
          },
          {
            id: 2,
            name: 'Jane Smith',
            email: 'jane@company.com',
            role: 'hr',
            department: 'HR',
            position: 'HR Manager',
            employeeId: 'EMP002',
            isActive: true
          },
          {
            id: 3,
            name: 'Mike Johnson',
            email: 'mike@company.com',
            role: 'admin',
            department: 'IT',
            position: 'System Administrator',
            employeeId: 'EMP003',
            isActive: true
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [])

  const handleDelete = async (employeeId) => {
    if (!hasRole('admin')) return
    const confirmed = window.confirm('Are you sure you want to deactivate this employee?')
    if (!confirmed) return
    try {
      await employeesAPI.deleteEmployee(employeeId)
      // Optimistically update UI: mark employee as inactive
      setEmployees((prev) => prev.map((e) => {
        const id = e._id || e.id
        if (id === employeeId) {
          return { ...e, isActive: false, status: 'inactive' }
        }
        return e
      }))
    } catch (err) {
      console.error('Error deleting employee:', err)
      alert('Failed to delete employee. Please try again.')
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!formData.password || formData.password.length < 6) {
        alert('Password must be at least 6 characters')
        return
      }
      const response = await employeesAPI.createEmployee({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: formData.department,
        position: formData.position,
        phone: formData.phone
      })
      
      if (response.data && response.data.success) {
        alert('Employee created successfully!')
        setShowForm(false)
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'employee',
          department: '',
          position: '',
          phone: ''
        })
        // Refresh employees list
        window.location.reload()
      }
    
    } catch (err) {
      console.error('Error creating employee:', err)
      alert('Failed to create employee. Please try again.')
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          {hasRole('admin') && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {showForm ? 'Cancel' : 'Add Employee'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {showForm && hasRole('admin') && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Employee</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="Min 6 characters"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="hr">HR Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">All Employees</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {hasRole('admin') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.length > 0 ? (
                  employees.map((employee) => (
                    <tr key={(employee && (employee._id || employee.id)) || Math.random()}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {employee.employeeId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {employee.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          employee.role === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : employee.role === 'hr'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          employee.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {hasRole('admin') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleDelete(employee._id || employee.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                            disabled={employee.isActive === false}
                          >
                            {employee.isActive === false ? 'Deactivated' : 'Delete'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={hasRole('admin') ? 8 : 7} className="px-6 py-4 text-center text-sm text-gray-500">
                      No employees found
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
