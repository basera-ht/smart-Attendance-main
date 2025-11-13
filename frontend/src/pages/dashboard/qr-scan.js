'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import DashboardLayout from '../../components/DashboardLayout'
import ProtectedRoute from '../../components/ProtectedRoute'
import { attendanceAPI } from '../../services/api'
import { Camera, AlertCircle, CheckCircle } from 'lucide-react'

// Dynamically import QR Scanner with better error handling
// @yudiel/react-qr-scanner exports QrScanner as a named export
const QrScanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => {
    // Check for named export first (most common)
    if (mod.QrScanner && typeof mod.QrScanner === 'function') {
      return mod.QrScanner
    }
    // Check for default export
    if (mod.default && typeof mod.default === 'function') {
      return mod.default
    }
    // If neither works, throw an error
    throw new Error('QR Scanner component not found in module')
  }),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Loading QR Scanner...</p>
        </div>
      </div>
    )
  }
)

export default function QRScanPage() {
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [scannerError, setScannerError] = useState(null)
  const [cameraPermission, setCameraPermission] = useState(null)

  useEffect(() => {
    // Check camera permissions
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          setCameraPermission('granted')
        })
        .catch((err) => {
          console.error('Camera permission error:', err)
          setCameraPermission('denied')
          setScannerError('Camera access denied. Please enable camera permissions.')
        })
    } else {
      setScannerError('Camera API not supported in this browser')
    }
  }, [])

  const handleDecode = async (text) => {
    if (!text || processing) return
    setProcessing(true)
    setError('')
    setResult('')
    
    try {
      const response = await attendanceAPI.scanQR(text)
      if (response?.data?.success) {
        setResult(response.data.message || 'Attendance recorded successfully!')
        // Clear result after 3 seconds
        setTimeout(() => setResult(''), 3000)
      } else {
        setError(response?.data?.message || 'Scan failed. Please try again.')
      }
    } catch (err) {
      console.error('QR scan error:', err)
      setError(err?.response?.data?.message || 'Invalid or expired QR code. Please ask the employee to generate a new QR code.')
    } finally {
      setProcessing(false)
    }
  }

  const handleScannerError = (err) => {
    if (!processing) {
      console.error('Scanner error:', err)
      setScannerError(err?.message || 'Failed to access camera')
    }
  }

  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraPermission('granted')
      setScannerError(null)
    } catch (err) {
      setCameraPermission('denied')
      setScannerError('Please allow camera access in your browser settings.')
    }
  }

  return (
    <ProtectedRoute requiredRoles={['admin', 'hr']}>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan Employee QR Code</h1>
            <p className="text-gray-600">Point the camera at the employee's QR code to record attendance</p>
          </div>

          {/* Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Messages */}
          {result && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{result}</span>
            </div>
          )}

          {/* Scanner Error */}
          {scannerError && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium mb-1">{scannerError}</p>
                  {cameraPermission === 'denied' && (
                    <button
                      onClick={requestCameraPermission}
                      className="mt-2 text-sm underline hover:no-underline"
                    >
                      Request camera permission again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* QR Scanner */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="relative">
              <div className="bg-black aspect-video flex items-center justify-center min-h-[400px]">
                <QrScanner
                  onDecode={handleDecode}
                  onError={handleScannerError}
                  constraints={{
                    facingMode: { ideal: 'environment' },
                    aspectRatio: { ideal: 1 }
                  }}
                  containerStyle={{
                    width: '100%',
                    height: '100%',
                    maxWidth: '100%'
                  }}
                  videoStyle={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'cover'
                  }}
                />
              </div>
              {processing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-700 font-medium">Processing...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Ask the employee to open their QR code from their dashboard</li>
              <li>Position the QR code within the camera view</li>
              <li>The system will automatically detect and process the QR code</li>
              <li>QR codes expire after 5 minutes for security</li>
            </ul>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
