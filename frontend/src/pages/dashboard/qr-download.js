'use client'
import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../hooks/useAuth'
import { attendanceAPI } from '../../services/api'
import { Download, QrCode, RefreshCw, CheckCircle } from 'lucide-react'

const QRCode = dynamic(() => import('qrcode.react'), { ssr: false })

export default function QRDownloadPage() {
  const { user, isAuthenticated } = useAuth()
  const [token, setToken] = useState('')
  const [action, setAction] = useState('checkin')
  const [expiresIn, setExpiresIn] = useState(0)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const qrRef = useRef(null)

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

  const downloadQR = async () => {
    if (!token) return

    try {
      setDownloading(true)
      
      // Use qrcode library to generate QR code directly to canvas
      const QRCodeLib = await import('qrcode')
      const canvas = document.createElement('canvas')
      
      // Generate QR code to canvas (qrcode uses default export)
      const qrcode = QRCodeLib.default || QRCodeLib
      await qrcode.toCanvas(canvas, token, {
        width: 500,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob')
        }
        
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `QR-${action}-${user?.employeeId || 'code'}-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up
        setTimeout(() => {
          URL.revokeObjectURL(url)
        }, 100)
        
        setDownloading(false)
      }, 'image/png', 1.0)
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download QR code: ' + (err.message || 'Unknown error'))
      setDownloading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Download QR Code</h1>
          <p className="text-gray-600">Generate and download your QR code for attendance</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Selection */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => loadQR('checkin')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                action === 'checkin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Check In QR
            </button>
            <button
              onClick={() => loadQR('checkout')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                action === 'checkout'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Check Out QR
            </button>
            <button
              onClick={() => loadQR(action)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              title="Refresh QR Code"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div ref={qrRef} className="flex flex-col items-center">
            {token ? (
              <>
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200 mb-4">
                  <QRCode value={token} size={300} includeMargin={true} />
                </div>
                <div className="text-center mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {action === 'checkin' ? 'Check In' : 'Check Out'} QR Code
                  </p>
                  <p className="text-xs text-gray-500">
                    Expires in ~{Math.ceil(expiresIn / 60)} minutes
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Employee: {user?.name} ({user?.employeeId})
                  </p>
                </div>
                <button
                  onClick={downloadQR}
                  disabled={downloading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  {downloading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Download QR Code</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center py-12">
                <QrCode className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-600">Generating QR code...</p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>How to use:</span>
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Select whether you want Check In or Check Out QR code</li>
            <li>Click "Download QR Code" to save it to your device</li>
            <li>Show the downloaded QR code to your admin/HR for scanning</li>
            <li>QR codes expire after 5 minutes for security - generate a new one if needed</li>
            <li>You can also use the live QR code from the "My QR" page</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}

