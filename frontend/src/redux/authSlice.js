import { createSlice } from '@reduxjs/toolkit'

const getInitialState = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return {
    user: null,
    token,
    isAuthenticated: !!token,
    loading: false,
    error: null
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    loginStart: (state) => {
      state.loading = true
      state.error = null
    },
    loginSuccess: (state, action) => {
      state.loading = false
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      state.error = null
      if (typeof window !== 'undefined' && action.payload.token) {
        localStorage.setItem('token', action.payload.token)
      }
    },
    loginFailure: (state, action) => {
      state.loading = false
      state.error = action.payload
      state.isAuthenticated = false
      state.user = null
      state.token = null
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
    },
    clearError: (state) => {
      state.error = null
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
    }
  }
})

export const { loginStart, loginSuccess, loginFailure, logout, clearError, updateUser } = authSlice.actions
export default authSlice.reducer