'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../hooks/useAuth'

const ProtectedRoute = ({ children, requiredRole, requiredRoles }) => {
  const { isAuthenticated, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('ProtectedRoute - Auth state:', { isAuthenticated, user, loading })
    
    if (!loading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to login')
      router.push('/login')
      return
    }

    if (!loading && isAuthenticated) {
      console.log('Authenticated, checking role requirements')
      if (requiredRole && user?.role !== requiredRole) {
        console.log('Role mismatch, redirecting to dashboard')
        router.push('/dashboard')
        return
      }
      
      if (Array.isArray(requiredRoles) && user?.role && !requiredRoles.includes(user.role)) {
        console.log('Role not in required roles, redirecting to dashboard')
        router.push('/dashboard')
        return
      }
    }
  }, [isAuthenticated, loading, router, user, requiredRole, requiredRoles])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return children
}

export default ProtectedRoute