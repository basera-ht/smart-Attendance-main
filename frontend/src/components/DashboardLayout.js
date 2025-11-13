'use client'
import { useAuth } from '../hooks/useAuth'
import ProtectedRoute from './ProtectedRoute'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children }) {
  const { user } = useAuth()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user?.name}!
                </h1>
                <p className="text-gray-600 mt-1">
                  {user?.role === 'admin' && 'Manage your organization attendance system'}
                  {user?.role === 'hr' && 'Monitor attendance and generate reports'}
                  {user?.role === 'employee' && 'Track your attendance and view records'}
                </p>
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
