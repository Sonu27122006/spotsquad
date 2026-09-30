import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Bike,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  FileX,
  MapPin,
  Car,
  Upload
} from 'lucide-react';
import CameraFeedSimulator from '../components/CameraFeedSimulator';
import DigitalTicketModal from '../components/DigitalTicketModal';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function NewParkingEntry({ setCurrentPage }) {
  const { t } = useLanguage();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Two-Wheeler');
  const [parkingSlot, setParkingSlot] = useState('Auto-Assign');
  const [dailyRate, setDailyRate] = useState(20);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successTicket, setSuccessTicket] = useState(null);

  useEffect(() => {
    loadSettings();
  }, [vehicleType]);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res && res.data) {
        if (vehicleType === 'Four-Wheeler') {
          setDailyRate(res.data.fourWheelerDailyRate || 50);
        } else {
          setDailyRate(res.data.dailyRate || 20);
        }
      }
    } catch (err) {
      setDailyRate(vehicleType === 'Four-Wheeler' ? 50 : 20);
    }
  };

  const handlePlateAccepted = (plate) => {
    setVehicleNumber(plate);
    setErrorMessage('');
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!vehicleNumber || vehicleNumber.trim().length < 4) {
      setErrorMessage(t('vehicleNumberRequired'));
      return;
    }
    if (!customerName || customerName.trim().length < 2) {
      setErrorMessage(t('customerNameRequired'));
      return;
    }
    const cleanMobile = mobileNumber.replace(/[^0-9]/g, '');
    if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createParking({
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        customerName: customerName.trim(),
        mobileNumber: cleanMobile,
        vehicleType: vehicleType,
        parkingSlot: parkingSlot.trim() || 'General Bay',
        customDailyRate: dailyRate,
      });

      if (res && res.data) {
        setSuccessTicket(res.data);
        setVehicleNumber('');
        setCustomerName('');
        setMobileNumber('');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create parking record.');
    } finally {
      setLoading(false);
    }
  };

  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="content-area">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
          {t('newVehicleEntryTitle')}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          {t('customerInfoSub')}
        </p>
      </div>

      {/* Step 1: ANPR Camera & Image Upload Scanner */}
      <CameraFeedSimulator
        onPlateAccepted={handlePlateAccepted}
        initialPlate={vehicleNumber}
      />

      {/* Step 2: Customer, Vehicle & Slot Registration */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2>
              <User size={18} color="#2563eb" />
              <span>{t('customerAndVehicleInfo')}</span>
            </h2>
            <p>{t('customerInfoSub')}</p>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            <Calendar size={14} color="#2563eb" />
            <span>{t('entryTimestamp')}: {currentDateStr}, {currentTimeStr}</span>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              color: '#991b1b',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
            }}
          >
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleCreateRecord}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="form-group">
              <label>
                {t('vehicleNumber')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control mono-input"
                  placeholder="e.g. TN 30 AB 1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  required
                  style={{ color: '#1e3a8a', letterSpacing: '0.8px', paddingLeft: '38px', height: '46px', fontSize: '15px' }}
                />
                <Bike size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#64748b' }} />
              </div>
            </div>

            <div className="form-group">
              <label>{t('vehicleType')} <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <select
                  className="form-control"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  style={{ paddingLeft: '38px', height: '46px' }}
                >
                  <option value="Two-Wheeler">Two-Wheeler (Bike / Scooter)</option>
                  <option value="Four-Wheeler">Four-Wheeler (Car / Van)</option>
                  <option value="Auto-Rickshaw">Auto-Rickshaw / Three-Wheeler</option>
                  <option value="Bicycle">Bicycle / Cycle</option>
                </select>
                {vehicleType === 'Four-Wheeler' ? (
                  <Car size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#64748b' }} />
                ) : (
                  <Bike size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#64748b' }} />
                )}
              </div>
            </div>

            <div className="form-group">
              <label>
                {t('customerName')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Karthik Raja"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  style={{ paddingLeft: '38px', height: '46px' }}
                />
                <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#64748b' }} />
              </div>
            </div>

            <div className="form-group">
              <label>
                {t('mobileNumber')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  className="form-control mono-input"
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  maxLength="10"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  style={{ paddingLeft: '38px', height: '46px' }}
                />
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#64748b' }} />
              </div>
            </div>

            <div className="form-group">
              <label>{t('parkingSlot')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Auto-Assign or Custom (e.g. A-01)"
                  value={parkingSlot}
                  onChange={(e) => setParkingSlot(e.target.value)}
                  style={{ paddingLeft: '38px', height: '46px' }}
                />
                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#64748b' }} />
              </div>
            </div>

            <div className="form-group">
              <label>{t('dailyRate')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control mono-input"
                  value={`₹${dailyRate} / 24 Hours`}
                  readOnly
                  style={{ background: '#f8fafc', fontWeight: 700, paddingLeft: '38px', color: '#15803d', height: '46px' }}
                />
                <IndianRupee size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#15803d' }} />
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#eff6ff',
              border: '1.5px dashed #93c5fd',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileX size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>
                  {t('paperlessBadge')}
                </h4>
                <p style={{ fontSize: '12px', color: '#3b82f6' }}>
                  {t('paperlessBadgeSub')}
                </p>
              </div>
            </div>

            <span className="badge badge-parked" style={{ padding: '6px 12px', fontSize: '12px' }}>
              {t('badgeParked')}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setVehicleNumber('');
                setCustomerName('');
                setMobileNumber('');
              }}
            >
              {t('resetForm')}
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ minWidth: '260px' }}
            >
              <CheckCircle2 size={18} />
              <span>{loading ? t('creatingRecord') : t('createRecord')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Digital QR Ticket Modal */}
      {successTicket && (
        <DigitalTicketModal
          ticket={successTicket}
          onClose={() => setSuccessTicket(null)}
        />
      )}
    </div>
  );
}
