import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, Edit3, Sparkles, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function CameraFeedSimulator({ onPlateAccepted, initialPlate = '' }) {
  const { t } = useLanguage();
  const [cameraStatus, setCameraStatus] = useState('CONNECTED');
  const [detectedPlate, setDetectedPlate] = useState(initialPlate || 'TN 30 AB 1234');
  const [confidence, setConfidence] = useState(94.5);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchLatestHardwareDetection();
  }, []);

  const fetchLatestHardwareDetection = async () => {
    try {
      const res = await api.getLatestDetection();
      if (res && res.data && res.data.vehicleNumber) {
        setDetectedPlate(res.data.vehicleNumber);
        setConfidence(res.data.confidence || 93);
        setCameraStatus('DETECTED');
      }
    } catch (err) {
      console.log('No recent hardware detection:', err.message);
    }
  };

  const handleSimulateDetection = async () => {
    setLoading(true);
    setCameraStatus('SCANNING');
    setErrorMsg('');

    try {
      const res = await api.scanOcr({});
      if (res && res.vehicleNumber) {
        setDetectedPlate(res.vehicleNumber);
        setConfidence(res.confidence || 94.0);
        setCameraStatus('DETECTED');
        setIsEditing(false);
        setUploadedImageName('');
      }
    } catch (err) {
      console.error('Scan OCR error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedImageName(file.name);
    setLoading(true);
    setCameraStatus('SCANNING');
    setErrorMsg('');

    try {
      // Simulate OCR processing from uploaded image
      const res = await api.scanOcr({ filename: file.name });
      if (res && res.vehicleNumber) {
        setDetectedPlate(res.vehicleNumber);
        setConfidence(res.confidence || 95.5);
        setCameraStatus('DETECTED');
        setIsEditing(false);
      }
    } catch (err) {
      setErrorMsg('Failed to process image OCR.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!detectedPlate || detectedPlate.trim().length < 4) {
      setErrorMsg(t('vehicleNumberRequired'));
      return;
    }
    onPlateAccepted(detectedPlate.trim().toUpperCase());
  };

  return (
    <div className="camera-card">
      <div className="camera-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Camera size={22} color="#60a5fa" />
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('cameraHeader')}</h3>
        </div>

        <div className={`cam-status-pill ${cameraStatus === 'DETECTED' ? 'cam-status-connected' : 'cam-status-waiting'}`}>
          <span className="pulse-dot"></span>
          <span>
            {cameraStatus === 'SCANNING' && t('scanningPlate')}
            {cameraStatus === 'DETECTED' && t('vehicleDetected')}
            {cameraStatus === 'CONNECTED' && t('cameraConnected')}
          </span>
        </div>
      </div>

      <div className="camera-feed-area">
        {/* Camera Viewport */}
        <div className="camera-viewport">
          <div className="scan-line"></div>
          <div style={{ textAlign: 'center', color: '#94a3b8', zIndex: 2 }}>
            <Camera size={38} color="#475569" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>
              {t('cameraSub')}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {uploadedImageName ? `Uploaded: ${uploadedImageName}` : 'Live ANPR Camera Feed • 1080p 30 FPS'}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              border: '2px solid #3b82f6',
              padding: '4px 12px',
              borderRadius: '6px',
              background: 'rgba(15, 23, 42, 0.85)',
              color: '#60a5fa',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></span>
            ROI: [ANPR OCR Bounding Box]
          </div>
        </div>

        {/* OCR Result & Controls */}
        <div className="camera-detection-info">
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live OCR Result
            </div>

            {isEditing ? (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  className="form-control mono-input"
                  value={detectedPlate}
                  onChange={(e) => setDetectedPlate(e.target.value.toUpperCase())}
                  placeholder="e.g. TN 30 AB 1234"
                  style={{ color: '#2563eb', background: '#0f172a', border: '2px solid #3b82f6' }}
                  autoFocus
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  {t('manualCorrection')} active.
                </span>
              </div>
            ) : (
              <div className="detected-plate-display" style={{ marginTop: '8px' }}>
                <div className="plate-label">{t('detectedVehicleNumber')}</div>
                <div className="plate-value">{detectedPlate || '---'}</div>
              </div>
            )}
          </div>

          <div className="confidence-meter">
            <span style={{ color: '#94a3b8' }}>{t('ocrConfidence')}:</span>
            <span style={{ color: confidence >= 90 ? '#34d399' : '#fbbf24', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {confidence.toFixed(1)}%
            </span>
          </div>

          {errorMsg && (
            <div style={{ color: '#f87171', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSimulateDetection}
              disabled={loading}
            >
              <Sparkles size={14} />
              <span>{loading ? t('searching') : t('simulateDetection')}</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            <button
              className="btn btn-outline btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ color: 'white', borderColor: '#475569', background: 'transparent' }}
              disabled={loading}
              title="Upload photo of vehicle number plate"
            >
              <Upload size={14} />
              <span>{t('uploadPlateImage')}</span>
            </button>

            <button
              className="btn btn-outline btn-sm"
              onClick={() => setIsEditing(!isEditing)}
              style={{ color: 'white', borderColor: '#475569', background: 'transparent' }}
            >
              <Edit3 size={14} />
              <span>{isEditing ? t('saveEdit') : t('manualCorrection')}</span>
            </button>

            <button
              className="btn btn-success btn-sm"
              onClick={handleAccept}
              style={{ marginLeft: 'auto' }}
            >
              <CheckCircle2 size={14} />
              <span>{t('acceptAndAutoFill')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
