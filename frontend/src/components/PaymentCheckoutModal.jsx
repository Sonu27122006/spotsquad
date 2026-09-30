import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Lock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';

export default function PaymentCheckoutModal({
  booking,
  onClose,
  onPaymentSuccess,
}) {
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const amount = booking.amount || 50;
  const upiId = 'smartparking@upi';
  const upiPayUri = `upi://pay?pa=${upiId}&pn=ParkingSpot&am=${amount}&tn=Booking_${booking.bookingId}`;

  const handlePayment = async () => {
    setProcessing(true);
    setErrorMsg('');

    try {
      // Step 1: Create payment order on backend
      const orderRes = await api.createPaymentOrder(booking.bookingId, amount, paymentMethod);
      const orderData = orderRes?.data || {};

      // Step 2: If Razorpay SDK is loaded in browser and method is RAZORPAY
      if (paymentMethod === 'RAZORPAY' && window.Razorpay) {
        const options = {
          key: orderData.key || 'rzp_test_parkingspot_demo',
          amount: Math.round(Number(amount) * 100),
          currency: orderData.currency || 'INR',
          name: 'ParkingSpot',
          description: `Slot Reservation for Booking ${booking.bookingId}`,
          image: 'https://cdn-icons-png.flaticon.com/512/2830/2830312.png',
          order_id: orderData.orderId.startsWith('order_') && orderData.orderId.length > 18 ? orderData.orderId : undefined,
          handler: async function (response) {
            try {
              const verifyRes = await api.verifyPayment({
                bookingId: booking.bookingId,
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || 'sig_valid',
                paymentMethod: 'RAZORPAY',
              });

              if (verifyRes && verifyRes.success) {
                onPaymentSuccess({
                  ...booking,
                  paymentStatus: 'PAID',
                  bookingStatus: 'CONFIRMED',
                  transactionId: verifyRes.data?.transactionId || response.razorpay_payment_id,
                });
              }
            } catch (err) {
              setErrorMsg(err.message || 'Payment signature verification failed.');
            } finally {
              setProcessing(false);
            }
          },
          prefill: {
            name: booking.customerName || 'Commuter',
            contact: booking.customerPhone || '9876543210',
          },
          theme: {
            color: '#2563eb',
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setErrorMsg(`Payment Failed: ${response.error?.description || 'Transaction declined'}`);
          setProcessing(false);
        });
        rzp.open();
        return;
      }

      // Step 3: Instant UPI QR / Simulated verification fallback
      const verifyRes = await api.verifyPayment({
        bookingId: booking.bookingId,
        razorpay_order_id: orderData.orderId || `order_${Date.now()}`,
        razorpay_payment_id: `pay_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        razorpay_signature: 'sig_valid',
        paymentMethod,
      });

      if (verifyRes && verifyRes.success) {
        onPaymentSuccess({
          ...booking,
          paymentStatus: 'PAID',
          bookingStatus: 'CONFIRMED',
          transactionId: verifyRes.data?.transactionId,
        });
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMsg(err.message || 'Payment processing failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Complete Payment
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                Ref: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{booking.bookingId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#e2e8f0',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount Callout */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              TOTAL PARKING AMOUNT
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#15803d', fontFamily: 'monospace', marginTop: '2px' }}>
              ₹{amount}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Slot {booking.slotId?.slotNumber || 'Selected Slot'} • Vehicle {booking.vehicleNumber}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Select Payment Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('RAZORPAY')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '12px',
                  border: paymentMethod === 'RAZORPAY' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                  background: paymentMethod === 'RAZORPAY' ? '#eff6ff' : '#ffffff',
                  color: paymentMethod === 'RAZORPAY' ? '#1d4ed8' : '#475569',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CreditCard size={18} />
                <span>Razorpay Gateway</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI_QR')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '12px',
                  border: paymentMethod === 'UPI_QR' ? '2px solid #059669' : '1.5px solid #cbd5e1',
                  background: paymentMethod === 'UPI_QR' ? '#ecfdf5' : '#ffffff',
                  color: paymentMethod === 'UPI_QR' ? '#047857' : '#475569',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Smartphone size={18} />
                <span>Instant UPI QR</span>
              </button>
            </div>
          </div>

          {/* UPI QR Display if selected */}
          {paymentMethod === 'UPI_QR' && (
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px',
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'inline-block', padding: '8px', background: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <QRCodeSVG value={upiPayUri} size={120} level="M" />
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginTop: '6px' }}>
                Scan with GPay, PhonePe, Paytm, or BHIM
              </div>
            </div>
          )}

          {/* Secure Guarantee */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#64748b',
              marginBottom: '16px',
            }}
          >
            <Lock size={12} color="#10b981" />
            <span>256-Bit Encrypted & Verified on Backend</span>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePayment}
            disabled={processing}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {processing ? (
              <span>Verifying Payment on Backend...</span>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Pay ₹{amount} & Confirm Reservation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
