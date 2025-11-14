'use client'
import { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Calendar, CalendarDays } from 'lucide-react'
import { fixedHolidays, optionalHolidays } from '../../utils/holidays'

export default function HolidaysPage() {
  const [activeTab, setActiveTab] = useState('fixed') // 'fixed' or 'optional'

  // Group holidays by month for better display
  const groupByMonth = (holidays) => {
    return holidays.reduce((acc, holiday) => {
      if (!acc[holiday.month]) {
        acc[holiday.month] = []
      }
      acc[holiday.month].push(holiday)
      return acc
    }, {})
  }

  const fixedByMonth = groupByMonth(fixedHolidays)
  const optionalByMonth = groupByMonth(optionalHolidays)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Holiday List 2025</h1>
            <p className="text-gray-600 mt-1">Lushai Technologies & Consulting Pvt. Ltd.</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CalendarDays size={20} className="text-blue-600" />
            <span>2025</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('fixed')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'fixed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fixed Holidays ({fixedHolidays.length})
              </button>
              <button
                onClick={() => setActiveTab('optional')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'optional'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Optional Holidays ({optionalHolidays.length})
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  2 can be availed
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'fixed' ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="text-blue-600" size={20} />
                <span className="font-semibold text-blue-900">Total Fixed Holidays: {fixedHolidays.length}</span>
              </div>
            </div>

            {/* Holidays by Month */}
            {Object.keys(fixedByMonth).sort((a, b) => {
              const months = ["January", "February", "March", "April", "May", "June", 
                             "July", "August", "September", "October", "November", "December"]
              return months.indexOf(a) - months.indexOf(b)
            }).map(month => (
              <div key={month} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3">
                  <h3 className="text-lg font-semibold text-white">{month}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sl. No.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Holiday Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Day
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fixedByMonth[month].map((holiday, index) => (
                        <tr key={holiday.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {holiday.id}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {holiday.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {holiday.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {holiday.day}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="text-yellow-600" size={20} />
                <span className="font-semibold text-yellow-900">
                  Total Optional Holidays: {optionalHolidays.length}
                </span>
                <span className="ml-4 text-sm text-yellow-800">
                  Note: 2 optional leaves can be availed in a year
                </span>
              </div>
            </div>

            {/* Holidays by Month */}
            {Object.keys(optionalByMonth).sort((a, b) => {
              const months = ["January", "February", "March", "April", "May", "June", 
                             "July", "August", "September", "October", "November", "December"]
              return months.indexOf(a) - months.indexOf(b)
            }).map(month => (
              <div key={month} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3">
                  <h3 className="text-lg font-semibold text-white">{month}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sl. No.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Holiday Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Day
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {optionalByMonth[month].map((holiday) => (
                        <tr key={holiday.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {holiday.id}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {holiday.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {holiday.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {holiday.day}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Company Info Footer */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Aizawl Office</h4>
              <p className="text-sm text-gray-600">
                C/O H. Vanlalchhuanga, S. Hlimen<br />
                Aizawl-796 005
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Bangalore Office</h4>
              <p className="text-sm text-gray-600">
                A301, Gina Living Waters, Kalyan Nagar<br />
                Bangalore-560 043
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-300">
            <p className="text-sm text-gray-600">
              Phone: +91 82598 81121
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

