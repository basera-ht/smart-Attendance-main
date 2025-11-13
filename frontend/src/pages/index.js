import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../hooks/useAuth'

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">CS</span>
          </div>
          <h1 className="mt-6 text-4xl font-extrabold text-gray-900">
            Smart Attendance System
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Modern attendance management for corporations
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push('/login')}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Sign In
          </button>
          
          <button
            onClick={() => router.push('/register')}
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Create Account
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Track attendance, manage employees, and generate reports
          </p>
        </div>
      </div>
    </div>
  )
}
