import React, { useState } from 'react';
import { X, Check, Copy, ShieldCheck, Bike, FileX, Smartphone, MessageSquare, Send, ExternalLink, CreditCard } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { getParkingDuration } from '../utils/parkingUtils';

export default function DigitalTicketModal({ ticket, onClose }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [smsStatus, setSmsStatus] = useState('');

  if (!ticket) return null;

  const tokenId = ticket.tokenId || ticket.parkingId || ticket.bookingId;
  const tokenUrl = `${window.location.origin}/pass/${tokenId}`;
  const formattedEntryTime = ticket.entryTime
    ? new Date(ticket.entryTime).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  const durationInfo = getParkingDuration(
    ticket.entryTime,
    new Date(),
    ticket.demoAddedDays ?? 0,
    ticket.dailyRate ?? 20
  );

  const handleCopyId = () => {
    navigator.clipboard.writeText(tokenId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyTokenLink = () => {
    navigator.clipboard.writeText(tokenUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const rateValue = Number(ticket.dailyRate || ticket.totalAmount || 20);
  const rateDisplay = `Rs. ${rateValue}/day`;
  const rawPaid = Number(ticket.paidAmount ?? 0);
  const isPaid = Boolean(ticket.paymentStatus === 'PAID' && rawPaid >= rateValue && rawPaid > 0);
  const paidAmount = isPaid ? rateValue : rawPaid;
  const amountDue = ticket.amountDue !== undefined
    ? Number(ticket.amountDue)
    : (isPaid ? 0 : Math.max(0, rateValue - paidAmount));
  const displayBay = ticket.parkingSlot || ticket.parkingBay || 'General Bay';

  // WhatsApp click-to-send direct link
  const cleanMobile = (ticket.mobileNumber || ticket.customerPhone || ticket.mobile || '').replace(/[^0-9]/g, '');
  const waMobile = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;

  // Standardized WhatsApp & SMS notification message format
  const shareMessage = isPaid
    ? `*ParkingSpot - Digital Parking Pass*\n` +
      `Customer Name: ${ticket.customerName || 'Customer'}\n` +
      `Mobile Number: ${cleanMobile || ticket.mobileNumber || ticket.customerPhone || 'N/A'}\n` +
      `Vehicle: ${ticket.vehicleNumber}\n` +
      `Parking Bay: ${displayBay}\n` +
      `Token ID: ${tokenId}\n` +
      `Entry Time: ${formattedEntryTime}\n` +
      `Parking Rate: ${rateDisplay}\n` +
      `Status: ${ticket.status || ticket.vehicleStatus || 'PARKED'}\n` +
      `Payment Status: PAID - Rs. ${rateValue}\n` +
      `Amount Due: Rs. 0\n` +
      `View Pass:\n${tokenUrl}`
    : `*ParkingSpot - Digital Parking Pass*\n` +
      `Customer Name: ${ticket.customerName || 'Customer'}\n` +
      `Mobile Number: ${cleanMobile || ticket.mobileNumber || ticket.customerPhone || 'N/A'}\n` +
      `Vehicle: ${ticket.vehicleNumber}\n` +
      `Parking Bay: ${displayBay}\n` +
      `Token ID: ${tokenId}\n` +
      `Entry Time: ${formattedEntryTime}\n` +
      `Parking Rate: ${rateDisplay}\n` +
      `Status: ${ticket.status || ticket.vehicleStatus || 'PARKED'}\n` +
      `Payment Status: PAYMENT PENDING\n` +
      `Amount Due: Rs. ${amountDue}\n` +
      `Pay Online / View Pass:\n${tokenUrl}`;

  const whatsappUrl = waMobile
    ? `https://wa.me/${waMobile}?text=${encodeURIComponent(shareMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const [smsNotice, setSmsNotice] = useState('');

  const handleSendRealSms = async () => {
    setSmsStatus('SENDING');
    setSmsNotice('');
    try {
      const response = await fetch('/api/notifications/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: cleanMobile,
          message: shareMessage,
          tokenId: tokenId,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (data.status === 'RECHARGE_REQUIRED') {
        setSmsStatus('NOTICE');
        setSmsNotice('Fast2SMS Notice: Live API SMS requires account credits. Click "Send WhatsApp" for free instant delivery!');
        setTimeout(() => setSmsStatus(''), 7000);
      } else if (data.success) {
        setSmsStatus('SENT');
        setTimeout(() => setSmsStatus(''), 4000);
      } else {
        setSmsStatus('FAILED');
        setSmsNotice(data.message || 'SMS dispatch failed. Use WhatsApp to share.');
        setTimeout(() => setSmsStatus(''), 6000);
      }
    } catch (e) {
      setSmsStatus('FAILED');
      setSmsNotice('Could not connect to SMS service. Use WhatsApp to share.');
      setTimeout(() => setSmsStatus(''), 5000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="ticket-wrapper">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-10px' }}>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={22} />
            </button>
          </div>

          <div className="ticket-header">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#2563eb', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px' }}>🅿️</span>
              <h2>ParkingSpot</h2>
            </div>
            <p>Digital Parking Pass & Entry Confirmation</p>
            <div className="ticket-badge-pill">
              <FileX size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Paperless Digital Record
            </div>
          </div>

          {/* Plain Text Token ID Spotlight Box - NO Verification QR Code */}
          <div
            style={{
              background: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              borderRadius: '14px',
              padding: '16px 20px',
              margin: '14px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TOKEN ID / PARKING ID
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '1px', marginTop: '3px' }}>
                {tokenId}
              </div>
              <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, marginTop: '4px' }}>
                Bay: {displayBay}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCopyId}
              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy ID'}</span>
            </button>
          </div>

          {/* Ticket Details Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div className="ticket-row">
              <span className="label">Vehicle Number</span>
              <span className="val" style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: '#2563eb', fontWeight: 800 }}>
                {ticket.vehicleNumber}
              </span>
            </div>

            <div className="ticket-row">
              <span className="label">Vehicle Type</span>
              <span className="val" style={{ fontWeight: 600 }}>{ticket.vehicleType || 'Two-Wheeler'}</span>
            </div>

            <div className="ticket-row">
              <span className="label">Customer Name</span>
              <span className="val">{ticket.customerName || 'Customer'}</span>
            </div>

            <div className="ticket-row">
              <span className="label">Mobile Number</span>
              <span className="val" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {cleanMobile || ticket.mobileNumber || ticket.customerPhone || 'N/A'}
              </span>
            </div>

            <div className="ticket-row">
              <span className="label">Entry Timestamp</span>
              <span className="val">{formattedEntryTime}</span>
            </div>

            <div className="ticket-row">
              <span className="label">Parking Rate</span>
              <span className="val font-semibold">{rateDisplay}</span>
            </div>

            <div className="ticket-row">
              <span className="label">Status</span>
              <span className="val">
                <StatusBadge status={ticket.status || ticket.vehicleStatus || 'PARKED'} />
              </span>
            </div>
          </div>

          {/* Amount Due Box */}
          <div className="ticket-total-box" style={{ marginTop: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, display: 'block' }}>
                Amount Due
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {isPaid ? 'Payment Status: PAID' : 'Payable Online / via UPI'}
              </span>
            </div>
            <div className="total-amount" style={{ color: isPaid ? '#15803d' : '#2563eb' }}>
              ₹{amountDue}
            </div>
          </div>

          {/* WhatsApp & Actions Section */}
          <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Send Parking Details to Customer:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm"
                style={{
                  background: '#25d366',
                  color: 'white',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  padding: '9px',
                }}
              >
                <MessageSquare size={14} />
                <span>Share via WhatsApp</span>
              </a>

              <a
                href={tokenUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
                style={{
                  fontSize: '12px',
                  padding: '9px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  borderRadius: '8px',
                }}
              >
                <CreditCard size={14} />
                <span>View Bill & Pay</span>
              </a>
            </div>

            {smsNotice && (
              <div
                style={{
                  marginTop: '8px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '11px',
                  color: '#1e40af',
                  lineHeight: '1.4',
                }}
              >
                {smsNotice}
              </div>
            )}

            <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleCopyTokenLink}
                style={{ fontSize: '11px', padding: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                {copiedLink ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span>{copiedLink ? '✓ Link Copied!' : 'Copy Bill Link'}</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${smsStatus === 'SENT' ? 'btn-success' : smsStatus === 'NOTICE' ? 'btn-outline' : 'btn-outline'}`}
                onClick={handleSendRealSms}
                style={{ fontSize: '11px', padding: '6px' }}
              >
                <Smartphone size={13} />
                <span>{smsStatus === 'SENDING' ? 'Sending...' : smsStatus === 'SENT' ? 'SMS Sent!' : smsStatus === 'NOTICE' ? 'Fast2SMS Info' : 'Send Fast2SMS'}</span>
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" onClick={onClose} style={{ width: '100%', marginTop: '14px' }}>
            Done & Return
          </button>
        </div>
      </div>
    </div>
  );
}
