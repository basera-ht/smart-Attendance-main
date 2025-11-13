'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../hooks/useAuth'
import { attendanceAPI } from '../../services/api'

const QRCode = dynamic(() => import('qrcode.react'), { ssr: false })

export default function QRPage() {
  const { user, isAuthenticated } = useAuth()
  const [token, setToken] = useState('')
  const [action, setAction] = useState('checkin')
  const [expiresIn, setExpiresIn] = useState(0)
  const [error, setError] = useState('')

  const loadQR = async (selectedAction = action) => {
    try {
      setError('')
      const { data } = await attendanceAPI.generateQR(selectedAction)
      if (data?.success) {
        setToken(data.data.token)
        setAction(selectedAction)
        setExpiresIn(data.data.expiresIn)
      } else {
        setError('Failed to generate QR')
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to generate QR')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadQR('checkin')
    }
  }, [isAuthenticated])

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My QR Code</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
        )}
        <div className="flex space-x-2">
          <button onClick={() => loadQR('checkin')} className={`px-4 py-2 rounded ${action==='checkin'?'bg-blue-600 text-white':'bg-gray-200'}`}>Check In</button>
          <button onClick={() => loadQR('checkout')} className={`px-4 py-2 rounded ${action==='checkout'?'bg-blue-600 text-white':'bg-gray-200'}`}>Check Out</button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
          {token ? (
            <>
              <QRCode value={token} size={240} includeMargin={true} />
              <p className="mt-4 text-sm text-gray-600">Scan to {action}. Expires in ~{Math.ceil(expiresIn/60)} min.</p>
            </>
          ) : (
            <p>Generating QR...</p>
          )}
        </div>
        <p className="text-sm text-gray-500">User: {user?.name} ({user?.employeeId})</p>
      </div>
    </DashboardLayout>
  )
}


