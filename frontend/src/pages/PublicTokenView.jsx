import React, { useState, useEffect } from 'react';
import { Bike, ShieldCheck, Clock, MapPin, QrCode, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function PublicTokenView({ tokenId, onBackToApp }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showUpiModal, setShowUpiModal] = useState(false);

  useEffect(() => {
    loadToken();
  }, [tokenId]);

  const loadToken = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.getParkingById(tokenId);
      if (res && res.data) {
        setTicket(res.data);
      } else {
        setErrorMsg('Digital parking token not found.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load digital token.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 12px auto' }}></div>
          <h3>Loading Digital Parking Token...</h3>
        </div>
      </div>
    );
  }

  if (errorMsg || !ticket) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: '#ffffff', padding: '36px', borderRadius: '16px', maxWidth: '440px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <AlertCircle size={42} color="#ef4444" style={{ margin: '0 auto 12px auto' }} />
          <h2 style={{ fontSize: '18px', color: '#0f172a' }}>Invalid or Expired Token</h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>{errorMsg}</p>
          {onBackToApp && (
            <button className="btn btn-primary" onClick={onBackToApp} style={{ marginTop: '20px' }}>
              Go to Parking Portal
            </button>
          )}
        </div>
      </div>
    );
  }

  const isParked = ticket.status === 'PARKED' || ticket.vehicleStatus === 'PARKED';
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    `SMARTPARK:${ticket.tokenId || ticket.parkingId}|VEH:${ticket.vehicleNumber}|SLOT:${ticket.parkingSlot || 'General Bay'}`
  )}`;

  const upiPayUri = `upi://pay?pa=smartparking@upi&pn=Smart+Bus+Stand+Parking&am=${(ticket.totalAmount || ticket.currentAmount || 20).toFixed(2)}&tn=${encodeURIComponent(`Parking Token ${ticket.tokenId || ticket.parkingId}`)}`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiPayUri)}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '460px',
          padding: '28px',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#2563eb', marginBottom: '4px' }}>
            <Bike size={24} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>SMART BUS STAND PARKING</h2>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b' }}>Official Customer Digital Parking Pass</p>
        </div>

        {/* QR Code Section */}
        <div
          style={{
            background: '#eff6ff',
            border: '2px solid #bfdbfe',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            DIGITAL TOKEN ID
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
            {ticket.tokenId || ticket.parkingId}
          </div>

          <div
            style={{
              background: '#ffffff',
              padding: '10px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              display: 'inline-block',
              margin: '14px 0 8px 0',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <img src={qrSvgUrl} alt="Parking QR Code" style={{ width: '130px', height: '130px', display: 'block' }} />
          </div>

          <div style={{ fontSize: '12px', color: '#475569' }}>
            Scan at exit gate for automatic validation & barrier opening.
          </div>
        </div>

        {/* Vehicle & Stay Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Vehicle Number:</span>
            <span className="plate-badge" style={{ fontSize: '13px' }}>{ticket.vehicleNumber}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Customer Name:</span>
            <span style={{ fontWeight: 600 }}>{ticket.customerName}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Allocated Slot:</span>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>{ticket.parkingSlot || 'Bay A-01'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Entry Timestamp:</span>
            <span style={{ fontSize: '12px' }}>
              {new Date(ticket.entryTime).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Current Stay Duration:</span>
            <span style={{ fontWeight: 700 }}>{ticket.totalDurationDays || ticket.parkingDurationDays || 1} Days</span>
          </div>
        </div>

        {/* Current Fee Highlight */}
        <div
          style={{
            background: isParked ? '#f0fdf4' : '#f8fafc',
            border: `1.5px solid ${isParked ? '#86efac' : '#cbd5e1'}`,
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
              {isParked ? 'Current Parking Due' : 'Total Amount Paid'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {isParked ? 'Payable via UPI or at Exit' : 'Payment Settled Successfully'}
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#15803d', fontFamily: 'var(--font-mono)' }}>
            ₹{(ticket.totalAmount || ticket.currentAmount || 20).toFixed(0)}
          </div>
        </div>

        {/* Online Pay Button (For Customer) */}
        {isParked && (
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setShowUpiModal(true)}
            style={{ width: '100%', marginBottom: '12px' }}
          >
            <Smartphone size={18} />
            <span>Pay Online via UPI QR</span>
          </button>
        )}

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Paperless Digital Record • Stored in Smart Parking Cloud</span>
        </div>
      </div>

      {/* Online UPI QR Modal for Customer */}
      {showUpiModal && (
        <div className="modal-overlay" onClick={() => setShowUpiModal(false)}>
          <div className="modal-card" style={{ maxWidth: '360px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Scan & Pay via UPI</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Use GPay, PhonePe, Paytm, or BHIM UPI
            </p>

            <div style={{ margin: '18px 0', background: '#f8fafc', padding: '12px', borderRadius: '12px', display: 'inline-block' }}>
              <img src={upiQrUrl} alt="UPI Payment QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
                Amount: ₹{(ticket.totalAmount || ticket.currentAmount || 20).toFixed(0)}
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => setShowUpiModal(false)} style={{ width: '100%' }}>
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
