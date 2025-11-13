'use client'
import { useState, useRef } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import ProtectedRoute from '../../components/ProtectedRoute'
import { attendanceAPI } from '../../services/api'
import { Upload, FileImage, X, CheckCircle, AlertCircle, Camera, Search } from 'lucide-react'

export default function QRCheckerPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [qrResult, setQrResult] = useState(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [attendanceResult, setAttendanceResult] = useState(null)
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setSelectedFile(file)
    setError('')
    setQrResult(null)
    setAttendanceResult(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
      // Auto-scan QR code from image
      setTimeout(() => scanQRFromImage(e.target.result), 100)
    }
    reader.readAsDataURL(file)
  }

  const scanQRFromImage = async (imageSrc) => {
    try {
      setProcessing(true)
      setError('')
      
      // Dynamically import jsQR
      const { default: jsQR } = await import('jsqr')
      
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code && code.data) {
          const qrData = code.data.trim()
          setQrResult({
            data: qrData,
            location: code.location
          })
          // Auto-process the QR code
          // Use setTimeout to ensure state is updated first
          setTimeout(() => {
            handleQRProcess(qrData)
          }, 100)
        } else {
          setError('No QR code found in the image')
          setProcessing(false)
        }
      }
      img.onerror = () => {
        setError('Failed to load image')
        setProcessing(false)
      }
      img.src = imageSrc
    } catch (err) {
      console.error('QR scan error:', err)
      setError('Failed to scan QR code from image')
      setProcessing(false)
    }
  }

  const startCameraScan = async () => {
    try {
      setScanning(true)
      setError('')
      setQrResult(null)
      setAttendanceResult(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // Start scanning loop
      scanFromVideo()
    } catch (err) {
      console.error('Camera error:', err)
      setError('Failed to access camera. Please allow camera permissions.')
      setScanning(false)
    }
  }

  const stopCameraScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }

  const scanFromVideo = async () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return

    // Dynamically import jsQR once
    if (!window.jsQRLoaded) {
      try {
        const jsQRModule = await import('jsqr')
        window.jsQR = jsQRModule.default
        window.jsQRLoaded = true
      } catch (err) {
        console.error('Failed to load jsQR:', err)
        setError('Failed to load QR scanner library')
        stopCameraScan()
        return
      }
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = window.jsQR(imageData.data, imageData.width, imageData.height)

      if (code && code.data) {
        const qrData = code.data.trim()
        setQrResult({
          data: qrData,
          location: code.location
        })
        stopCameraScan()
        // Auto-process the QR code
        setTimeout(() => {
          handleQRProcess(qrData)
        }, 100)
      }
    }

    if (scanning) {
      requestAnimationFrame(scanFromVideo)
    }
  }

  const handleQRProcess = async (qrData) => {
    if (!qrData || processing) return
    
    try {
      setProcessing(true)
      setError('')
      setAttendanceResult(null)

      // Clean the QR data - remove any whitespace or newlines
      const cleanToken = qrData.trim()

      // Try to process as QR token
      const response = await attendanceAPI.scanQR(cleanToken)
      
      if (response?.data?.success) {
        setAttendanceResult({
          success: true,
          message: response.data.message || 'Attendance recorded successfully!'
        })
        // Clear QR result after successful processing
        setTimeout(() => {
          setQrResult(null)
        }, 3000)
      } else {
        setAttendanceResult({
          success: false,
          message: response?.data?.message || 'Failed to process QR code'
        })
      }
    } catch (err) {
      console.error('Process QR error:', err)
      const errorMessage = err?.response?.data?.message || 'Invalid or expired QR code'
      setAttendanceResult({
        success: false,
        message: errorMessage
      })
      setError(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  const handleManualQR = () => {
    const qrText = prompt('Enter QR code token:')
    if (qrText && qrText.trim()) {
      handleQRProcess(qrText.trim())
    }
  }

  const clearAll = () => {
    setSelectedFile(null)
    setPreview(null)
    setQrResult(null)
    setError('')
    setAttendanceResult(null)
    stopCameraScan()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <ProtectedRoute requiredRoles={['admin', 'hr']}>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">QR Code Checker & Approval</h1>
            <p className="text-gray-600">Upload or scan QR codes to verify and approve employee attendance</p>
          </div>

          {/* Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success/Result Messages */}
          {attendanceResult && (
            <div className={`border rounded-lg px-4 py-3 flex items-center space-x-2 ${
              attendanceResult.success
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            }`}>
              {attendanceResult.success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span>{attendanceResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>Upload QR Image</span>
              </button>
              <button
                onClick={scanning ? stopCameraScan : startCameraScan}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span>{scanning ? 'Stop Camera' : 'Scan with Camera'}</span>
              </button>
              <button
                onClick={handleManualQR}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Search className="w-5 h-5" />
                <span>Enter QR Manually</span>
              </button>
              {(selectedFile || scanning || qrResult) && (
                <button
                  onClick={clearAll}
                  className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <X className="w-5 h-5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Preview Area */}
          {(preview || scanning) && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {scanning ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-auto"
                    playsInline
                    muted
                  />
                  {processing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-700 font-medium">Scanning...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : preview ? (
                <div className="p-4">
                  <div className="relative inline-block">
                    <img
                      src={preview}
                      alt="QR Code Preview"
                      className="max-w-full h-auto rounded-lg"
                    />
                    {qrResult && qrResult.location && (
                      <div
                        className="absolute border-2 border-green-500"
                        style={{
                          top: `${qrResult.location.topLeftCorner.y}px`,
                          left: `${qrResult.location.topLeftCorner.x}px`,
                          width: `${qrResult.location.dimension}px`,
                          height: `${qrResult.location.dimension}px`,
                        }}
                      />
                    )}
                  </div>
                  {selectedFile && (
                    <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
                      <FileImage className="w-4 h-4" />
                      <span>{selectedFile.name}</span>
                      <span className="text-gray-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* QR Result Info */}
          {qrResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">QR Code Detected:</h3>
              <div className="bg-white rounded p-3 font-mono text-sm text-gray-800 break-all">
                {qrResult.data}
              </div>
              {processing && (
                <div className="mt-3 flex items-center space-x-2 text-blue-700">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Processing attendance...</span>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">How to use:</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li><strong>Upload QR Image:</strong> Click "Upload QR Image" to select a QR code image file</li>
              <li><strong>Camera Scan:</strong> Use "Scan with Camera" to scan QR codes in real-time</li>
              <li><strong>Manual Entry:</strong> Use "Enter QR Manually" to paste QR code tokens directly</li>
              <li>The system will automatically detect and process valid QR codes</li>
              <li>Attendance is automatically recorded when a valid QR code is processed</li>
            </ul>
          </div>

          {/* Hidden canvas for QR processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

