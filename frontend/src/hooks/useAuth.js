import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/router'
import { authAPI } from '../services/api'
import { loginSuccess, logout } from '../redux/authSlice'

export const useAuth = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const { user, token, isAuthenticated, loading } = useSelector(state => state.auth)

  useEffect(() => {
    const validateToken = async () => {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      
      const storedRefreshToken = typeof window !== 'undefined' 
        ? localStorage.getItem('refreshToken') 
        : null
      
      if (storedToken && !user) {
        try {
          const response = await authAPI.getProfile()
          
          // Handle different response structures
          const userData = response?.data?.data?.user || response?.data?.user
          
          if (userData) {
            dispatch(loginSuccess({
              user: userData,
              token: storedToken
            }))
          } else {
            throw new Error('Invalid response structure')
          }
        } catch (error) {
          console.error('Token validation failed:', error)
          // If token validation fails, try to refresh
          if (storedRefreshToken) {
            try {
              const refreshResponse = await authAPI.refreshToken(storedRefreshToken)
              if (refreshResponse.data?.success) {
                const newAccessToken = refreshResponse.data.data.accessToken
                localStorage.setItem('token', newAccessToken)
                // Retry getting profile
                const profileResponse = await authAPI.getProfile()
                const refreshedUserData = profileResponse?.data?.data?.user || profileResponse?.data?.user
                
                if (refreshedUserData) {
                  dispatch(loginSuccess({
                    user: refreshedUserData,
                    token: newAccessToken
                  }))
                } else {
                  throw new Error('Invalid response structure after refresh')
                }
                return
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError)
            }
          }
          // If refresh also fails, logout
          dispatch(logout())
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
          }
        }
      }
    }

    validateToken()
  }, [dispatch, user])

  const login = async (credentials) => {
    try {
      console.log('Login credentials:', credentials)
      const response = await authAPI.login(credentials)
      const raw = response?.data || {}
      
      console.log('Login response:', raw)
      
      if (raw.success && raw.data) {
        const { user, accessToken, refreshToken } = raw.data
        
        // Validate tokens exist
        if (!accessToken) {
          console.error('No access token received')
          return { success: false, error: 'Authentication error: No access token received' }
        }
        
        // Store tokens in localStorage
        if (typeof window !== 'undefined') {
          if (accessToken) {
            localStorage.setItem('token', accessToken)
          }
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken)
          }
        }

        dispatch(loginSuccess({ 
          user: user, 
          token: accessToken 
        }))
        return { success: true }
      }

      // Handle validation errors
      if (raw.errors && Array.isArray(raw.errors)) {
        const errorMessages = raw.errors.map(e => e.msg || e.message).join(', ')
        return { success: false, error: errorMessages || raw.message || 'Login failed' }
      }

      return { success: false, error: raw.message || 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      // Handle different error types
      if (error.response) {
        const errorData = error.response.data || {}
        return { 
          success: false, 
          error: errorData.message || `Login failed: ${error.response.status} ${error.response.statusText}` || 'Login failed'
        }
      } else if (error.request) {
        return { 
          success: false, 
          error: 'Network error. Please check if the server is running.'
        }
      }
      
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      }
    }
  }

  const logoutUser = async () => {
    try {
      const refreshToken = typeof window !== 'undefined' 
        ? localStorage.getItem('refreshToken') 
        : null
      
      // Call logout API to revoke refresh token
      if (refreshToken) {
        try {
          await authAPI.logout({ refreshToken })
        } catch (err) {
          console.error('Logout API error:', err)
          // Continue with logout even if API call fails
        }
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear tokens and state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
      }
      dispatch(logout())
      router.push('/login')
    }
  }

  const hasRole = (requiredRole) => {
    if (!user) return false
    return user.role === requiredRole
  }

  const hasAnyRole = (roles) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  return {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout: logoutUser,
    hasRole,
    hasAnyRole
  }
}