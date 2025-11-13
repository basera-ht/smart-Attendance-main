'use client'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../hooks/useAuth'
import { 
  LayoutDashboard, 
  Clock, 
  Users, 
  BarChart3, 
  User,
  Download,
  Search,
  Calendar
} from 'lucide-react'

const Sidebar = () => {
  const router = useRouter()
  const { user, hasRole } = useAuth()

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'hr', 'employee']
    },
    {
      name: 'Attendance',
      href: '/dashboard/attendance',
      icon: Clock,
      roles: ['admin', 'hr', 'employee']
    },
    {
      name: 'Employees',
      href: '/dashboard/employees',
      icon: Users,
      roles: ['admin', 'hr']
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
      roles: ['admin', 'hr']
    },
    {
      name: 'Leaves',
      href: '/dashboard/leaves',
      icon: Calendar,
      roles: ['admin', 'hr', 'employee']
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: User,
      roles: ['admin', 'hr', 'employee']
    },
    {
      name: 'Download QR',
      href: '/dashboard/qr-download',
      icon: Download,
      roles: ['employee']
    },
    {
      name: 'QR Checker',
      href: '/dashboard/qr-checker',
      icon: Search,
      roles: ['admin', 'hr']
    },
  ]

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  )

  return (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Navigation</h2>
        <nav className="space-y-2">
          {filteredMenuItems.map((item) => {
            const isActive = router.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} className="mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default Sidebar