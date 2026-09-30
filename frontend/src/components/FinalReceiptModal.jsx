import React, { useState } from 'react';
import { Check, Copy, CheckCircle2, ShieldCheck, FileText, Share2, Ban } from 'lucide-react';

export default function FinalReceiptModal({ receipt, onClose }) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!receipt) return null;

  const tokenId = receipt.tokenId || receipt.parkingId || receipt.bookingId || receipt.id;
  const passUrl = typeof window !== 'undefined' ? `${window.location.origin}/pass/${tokenId}` : '';

  const handleCopyId = () => {
    navigator.clipboard.writeText(tokenId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPassLink = () => {
    if (passUrl) {
      navigator.clipboard.writeText(passUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatDateTime = (ts) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    return `${day} ${month} ${year}, ${timeStr}`;
  };

  const formattedEntry = formatDateTime(receipt.entryTime || receipt.startTime);
  const formattedExit = formatDateTime(receipt.exitTime || new Date());

  const totalAmount = Number(receipt.finalAmount || receipt.totalAmount || receipt.currentAmount || 20);
  const dailyRate = Number(receipt.dailyRate || 20);
  const durationDays = Number(receipt.parkingDurationDays || receipt.totalDurationDays || 1);

  // Clean phone number
  const cleanPhone = (receipt.mobileNumber || receipt.customerPhone || receipt.mobile || '9994346680').replace(/[^0-9]/g, '');
  const waTarget = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const whatsappMessage =
    `*ParkingSpot - Digital Parking Bill*\n\n` +
    `Vehicle: ${receipt.vehicleNumber}\n` +
    `Token ID: ${tokenId}\n` +
    `Customer Name: ${receipt.customerName || 'Vigas'}\n` +
    `Mobile: ${cleanPhone}\n` +
    `Entry Time: ${formattedEntry}\n` +
    `Exit Time: ${formattedExit}\n` +
    `Duration: ${durationDays} Day${durationDays === 1 ? '' : 's'}\n` +
    `Daily Rate: ₹${dailyRate}/Day\n` +
    `Total Amount Settled: ₹${totalAmount}\n` +
    `Status: PAID & EXITED\n` +
    `Barrier Gate: OPEN\n\n` +
    `View Digital Receipt:\n${passUrl}`;

  const whatsappUrl = waTarget
    ? `https://wa.me/${waTarget}?text=${encodeURIComponent(whatsappMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '480px',
          width: '100%',
          padding: '28px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              borderRadius: '9999px',
              padding: '4px 14px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            <FileText size={13} />
            <span>OFFICIAL DIGITAL PAYMENT PROOF</span>
          </div>
        </div>

        {/* Dashed Separator */}
        <div style={{ borderTop: '1px dashed #cbd5e1', margin: '14px 0 16px 0' }} />

        {/* Settled Token Spotlight Box */}
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderRadius: '16px',
            padding: '14px',
            textAlign: 'center',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: '#16a34a',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            SETTLED TOKEN ID
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '26px',
              fontWeight: 900,
              color: '#15803d',
              letterSpacing: '1px',
              marginTop: '3px',
            }}
          >
            {tokenId}
          </div>
        </div>

        {/* Structured Detail Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Vehicle Number</span>
            <span style={{ fontFamily: 'monospace', fontSize: '15px', color: '#1e40af', fontWeight: 800, letterSpacing: '1px' }}>
              {receipt.vehicleNumber}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Customer Name</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.customerName || 'Vigas'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Mobile Number</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
              {cleanPhone || '9994346680'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Entry Time</span>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>{formattedEntry}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Exit Time</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>{formattedExit}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Duration</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{durationDays} Days</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Daily Rate Applied</span>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>₹{dailyRate} / Days</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Status</span>
            <span
              style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                borderRadius: '9999px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={12} color="#15803d" />
              <span>PAID</span>
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Active Parking</span>
            <span
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '9999px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Ban size={11} color="#475569" />
              <span>EXITED</span>
            </span>
          </div>
        </div>

        {/* Total Box */}
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
              Total Amount Paid & Settled
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Transaction complete. Barrier gate open.
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#15803d', fontFamily: 'monospace' }}>
            ₹{totalAmount.toFixed(0)}
          </div>
        </div>

        {/* Verified Shield Note */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#16a34a',
            fontWeight: 600,
            marginTop: '14px',
          }}
        >
          <ShieldCheck size={14} color="#16a34a" />
          <span>Digital receipt verified & archived in database</span>
        </div>

        {/* Bottom Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleCopyId}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '11px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              background: '#ffffff',
            }}
          >
            {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Token ID'}</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '11px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '10px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>Done & Return</span>
          </button>
        </div>

        {/* WhatsApp Share Link */}
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#15803d',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <Share2 size={13} />
            <span>Share on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
