'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../hooks/useAuth'
import { User, LogOut, Menu } from 'lucide-react'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">LAIT</span>
              </div>
              <span className="font-semibold text-gray-800 text-lg">LushAITech Attendance</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            
            <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gray-50">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                <span className="text-xs text-gray-500 capitalize">{user?.role}</span>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <div className="px-3 py-2 flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                <span className="text-xs text-gray-500 capitalize">{user?.role}</span>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar