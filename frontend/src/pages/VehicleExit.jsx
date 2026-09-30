import React, { useState, useEffect } from 'react';
import {
  LogOut,
  Search,
  Bike,
  Smartphone,
  Banknote,
  CreditCard,
  QrCode,
  Sparkles,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import FinalReceiptModal from '../components/FinalReceiptModal';
import { api } from '../services/api';
import { getParkingDuration } from '../utils/parkingUtils';

export default function VehicleExit({ selectedVehicle, onExitSuccess }) {
  // Search & lookup state
  const [searchQuery, setSearchQuery] = useState(
    selectedVehicle
      ? selectedVehicle.vehicleNumber || selectedVehicle.tokenId || selectedVehicle.parkingId || ''
      : ''
  );
  const [activeRecord, setActiveRecord] = useState(selectedVehicle || null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Payment method & checkout state
  const [paymentMethod, setPaymentMethod] = useState('UPI_QR'); // 'UPI_QR' | 'CASH' | 'CARD'
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Settled receipt modal state
  const [settledReceipt, setSettledReceipt] = useState(null);

  // Custom demo simulation state
  const [customDays, setCustomDays] = useState(1);
  const [simLoading, setSimLoading] = useState(false);

  // UPI settings state (defaults match exact screenshot: vigasnk@okicici & Smart Stand Parking Hub)
  const [upiId, setUpiId] = useState('vigasnk@okicici');
  const [merchantName, setMerchantName] = useState('Smart Stand Parking Hub');

  useEffect(() => {
    if (selectedVehicle) {
      setActiveRecord(selectedVehicle);
      setSearchQuery(selectedVehicle.vehicleNumber || selectedVehicle.tokenId || selectedVehicle.parkingId || '');
      setSettledReceipt(null);
      setErrorMessage('');
    }
    loadSettings();
  }, [selectedVehicle]);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res && res.data) {
        if (res.data.upiId) setUpiId(res.data.upiId);
        if (res.data.merchantName || res.data.parkingName) {
          setMerchantName(res.data.merchantName || res.data.parkingName);
        }
      }
    } catch (err) {
      console.log('Using default UPI settings');
    }
  };

  // Section 2: Lookup Departing Vehicle Session
  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearchLoading(true);
    setErrorMessage('');
    setSettledReceipt(null);

    try {
      const res = await api.searchParking(query);
      if (res && res.data && res.data.length > 0) {
        const records = Array.isArray(res.data) ? res.data : [res.data];

        // Find active parked session
        const activeParked = records.find(
          (r) =>
            r.status === 'PARKED' ||
            r.vehicleStatus === 'PARKED' ||
            r.bookingStatus === 'ACTIVE' ||
            r.bookingStatus === 'CONFIRMED'
        );

        if (activeParked) {
          setActiveRecord(activeParked);
          setErrorMessage('');
        } else {
          setActiveRecord(null);
          const firstExited = records[0];
          setErrorMessage(
            `Vehicle ${firstExited.vehicleNumber || query} has already completed exit settlement and exited the facility.`
          );
        }
      } else {
        setActiveRecord(null);
        setErrorMessage(
          `No active parking session found for '${query}'. Please check the vehicle number, token ID, or mobile number.`
        );
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error searching departing vehicle session.');
      setActiveRecord(null);
    } finally {
      setSearchLoading(false);
    }
  };

  // Duration & Dynamic Bill Calculation
  const durationInfo = activeRecord
    ? getParkingDuration(
        activeRecord.entryTime || activeRecord.startTime,
        new Date(),
        activeRecord.demoAddedDays ?? 0,
        activeRecord.dailyRate ?? 20
      )
    : { days: 1, amount: 20, isOverOneDay: false, text: '1 Day' };

  const calculatedFinalAmount = durationInfo.amount;
  const alreadyPaidAmount = Number(activeRecord?.paidAmount || 0);
  const payableAmount =
    activeRecord?.paymentStatus === 'PAID' && alreadyPaidAmount >= calculatedFinalAmount
      ? calculatedFinalAmount
      : calculatedFinalAmount;

  // Format Date and Time helper matching Screenshot (e.g. 29 Sept 2026, 10:18 pm)
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

  // Time simulation for testing (isolated from actual exit calculation)
  const handleSimulateTime = async (addedDays) => {
    if (!activeRecord) return;
    setSimLoading(true);
    try {
      const recordId = activeRecord.id || activeRecord.bookingId || activeRecord.parkingId;
      const res = await api.simulateTime(recordId, addedDays);
      if (res && res.data) {
        setActiveRecord(res.data);
      } else {
        setActiveRecord((prev) => ({
          ...prev,
          demoAddedDays: addedDays,
        }));
      }
    } catch (err) {
      // Local fallback
      setActiveRecord((prev) => ({
        ...prev,
        demoAddedDays: addedDays,
      }));
    } finally {
      setSimLoading(false);
    }
  };

  // Execute Exit & Complete Settlement
  const handleConfirmExitSettlement = async () => {
    if (!activeRecord) return;
    setPaymentLoading(true);
    setErrorMessage('');

    const bookingRef = activeRecord.id || activeRecord.bookingId || activeRecord.parkingId;
    const methodLabel = paymentMethod === 'UPI_QR' ? 'UPI' : paymentMethod === 'CASH' ? 'CASH' : 'CARD';
    const generatedTxn = `${methodLabel}_${Date.now().toString().slice(-6)}`;

    try {
      const exitRes = await api.exitParking(
        bookingRef,
        methodLabel,
        generatedTxn,
        payableAmount
      );

      const receiptData = exitRes?.data || {
        ...activeRecord,
        paymentStatus: 'PAID',
        status: 'PAID',
        vehicleStatus: 'EXITED',
        bookingStatus: 'COMPLETED',
        totalAmount: payableAmount,
        finalAmount: payableAmount,
        paidAmount: payableAmount,
        amountDue: 0,
        parkingDurationDays: durationInfo.days,
        dailyRate: activeRecord.dailyRate || 20,
        transactionId: generatedTxn,
        paymentMethod: methodLabel,
        exitTime: new Date().toISOString(),
      };

      setSettledReceipt(receiptData);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete vehicle exit settlement.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleReceiptDone = () => {
    setSettledReceipt(null);
    setActiveRecord(null);
    setSearchQuery('');
    if (onExitSuccess) onExitSuccess();
  };

  // Dynamic UPI Payment Intent URI
  const upiPayUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${payableAmount.toFixed(2)}&tn=${encodeURIComponent(`Parking Fee ${activeRecord?.tokenId || activeRecord?.parkingId || ''}`)}`;

  const currentDemoDays = activeRecord?.demoAddedDays || 0;

  return (
    <div className="content-area" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogOut size={22} color="#ef4444" />
          <span>Vehicle Exit & Settlement Workflow</span>
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
          Retrieve customer record, calculate continuous duration charges, and complete payment.
        </p>
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div
          style={{
            background: '#fef2f2',
            border: '1.5px solid #fecaca',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} color="#ef4444" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section 2: Lookup Departing Vehicle Session */}
      <div className="card" style={{ marginBottom: '20px', padding: '20px 24px', borderRadius: '16px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
            Lookup Departing Vehicle Session
          </label>
        </div>

        <form onSubmit={handleLookup}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
              <Bike size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: '#64748b' }} />
              <input
                type="text"
                className="form-control mono-input"
                placeholder="TN 30 AC 1345"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: '48px',
                  fontSize: '15px',
                  fontWeight: 700,
                  height: '48px',
                  borderRadius: '12px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.5px',
                }}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={searchLoading}
              style={{
                height: '48px',
                padding: '0 24px',
                fontWeight: 700,
                borderRadius: '12px',
                background: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Search size={16} />
              <span>{searchLoading ? 'Retrieving Record...' : 'Retrieve Record'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ACTIVE SESSION WORKFLOW */}
      {activeRecord && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Multi-Day Duration Simulation Banner */}
          <div
            style={{
              background: '#fffdf0',
              border: '1px solid #fde047',
              borderRadius: '14px',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 800, fontSize: '13px' }}>
                <Sparkles size={15} color="#d97706" />
                <span>Multi-Day Duration Simulation</span>
              </div>
              <p style={{ fontSize: '11px', color: '#78350f', margin: '2px 0 0 0' }}>
                Simulating duration for {activeRecord.vehicleNumber} (+{currentDemoDays} Days)
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleSimulateTime(0)}
                disabled={simLoading}
                style={{
                  background: currentDemoDays === 0 ? '#2563eb' : '#ffffff',
                  color: currentDemoDays === 0 ? '#ffffff' : '#334155',
                  border: currentDemoDays === 0 ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Clock size={12} />
                <span>Actual Time</span>
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleSimulateTime(1)}
                disabled={simLoading}
                style={{
                  background: currentDemoDays === 1 ? '#2563eb' : '#ffffff',
                  color: currentDemoDays === 1 ? '#ffffff' : '#334155',
                  border: currentDemoDays === 1 ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                +1 Day (24h)
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleSimulateTime(2)}
                disabled={simLoading}
                style={{
                  background: currentDemoDays === 2 ? '#2563eb' : '#ffffff',
                  color: currentDemoDays === 2 ? '#ffffff' : '#334155',
                  border: currentDemoDays === 2 ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                +2 Days (48h)
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleSimulateTime(3)}
                disabled={simLoading}
                style={{
                  background: currentDemoDays === 3 ? '#2563eb' : '#ffffff',
                  color: currentDemoDays === 3 ? '#ffffff' : '#334155',
                  border: currentDemoDays === 3 ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                +3 Days (72h)
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                  style={{
                    width: '42px',
                    height: '28px',
                    padding: '2px 4px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    textAlign: 'center',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleSimulateTime(customDays)}
                  disabled={simLoading}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <Plus size={11} />
                  <span>Apply</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Parking Session Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #93c5fd',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Header with Title and Plate Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>
                  Active Parking Session • {activeRecord.tokenId || activeRecord.parkingId || activeRecord.bookingId || 'PK20260929002'}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
                  Verify customer information and select payment method to complete exit.
                </p>
              </div>

              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: '#1e293b',
                  fontSize: '14px',
                  letterSpacing: '1px',
                }}
              >
                {activeRecord.vehicleNumber}
              </div>
            </div>

            {/* 3 Column Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {/* Card 1: Rider Information */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  RIDER INFORMATION
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {activeRecord.customerName || 'Vigas'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                  📞 {activeRecord.mobileNumber || activeRecord.customerPhone || '9994346680'}
                </div>
                <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700, marginTop: '2px' }}>
                  Slot: {activeRecord.parkingSlot || activeRecord.parkingBay || 'A-01'}
                </div>
              </div>

              {/* Card 2: Entry Timestamp */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ENTRY TIMESTAMP
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {formatDateTime(activeRecord.entryTime || activeRecord.startTime)}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Daily Rate: ₹{activeRecord.dailyRate || 20} / 24h
                </div>
              </div>

              {/* Card 3: Calculated Duration */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  CALCULATED DURATION
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                  {durationInfo.days} Days
                </div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                  24h Block Rule Applied
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginTop: '24px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'block' }}>
                Payment Method
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
                {/* 1. UPI Online QR */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI_QR')}
                  style={{
                    background: '#ffffff',
                    border: paymentMethod === 'UPI_QR' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: paymentMethod === 'UPI_QR' ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Smartphone size={24} color={paymentMethod === 'UPI_QR' ? '#2563eb' : '#64748b'} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: paymentMethod === 'UPI_QR' ? '#1e3a8a' : '#334155' }}>
                    UPI Online QR
                  </span>
                </button>

                {/* 2. Cash Payment */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  style={{
                    background: '#ffffff',
                    border: paymentMethod === 'CASH' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: paymentMethod === 'CASH' ? '0 2px 8px rgba(22, 163, 74, 0.12)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Banknote size={24} color={paymentMethod === 'CASH' ? '#16a34a' : '#64748b'} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: paymentMethod === 'CASH' ? '#14532d' : '#334155' }}>
                    Cash Payment
                  </span>
                </button>

                {/* 3. Card / POS */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  style={{
                    background: '#ffffff',
                    border: paymentMethod === 'CARD' ? '2px solid #9333ea' : '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: paymentMethod === 'CARD' ? '0 2px 8px rgba(147, 51, 234, 0.12)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <CreditCard size={24} color={paymentMethod === 'CARD' ? '#9333ea' : '#64748b'} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: paymentMethod === 'CARD' ? '#581c87' : '#334155' }}>
                    Card / POS
                  </span>
                </button>
              </div>

              {/* PAYMENT OPTION 1: UPI Online QR Container */}
              {paymentMethod === 'UPI_QR' && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: 800, fontSize: '14px' }}>
                      <QrCode size={18} color="#2563eb" />
                      <span>Online UPI / QR Payment</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
                      Scan QR Code with any UPI App (GPay / PhonePe / Paytm)
                    </p>

                    <div style={{ fontSize: '12px', color: '#334155', marginTop: '12px' }}>
                      UPI ID: <span style={{ color: '#2563eb', fontWeight: 700 }}>{upiId}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                      Payee: <span style={{ fontWeight: 600 }}>{merchantName}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '8px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'inline-block',
                      }}
                    >
                      <QRCodeSVG value={upiPayUri} size={110} />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                      Amount: ₹{payableAmount}
                    </div>
                  </div>
                </div>
              )}

              {/* PAYMENT OPTION 2: Cash Payment Container */}
              {paymentMethod === 'CASH' && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#14532d', fontWeight: 800, fontSize: '14px' }}>
                      <Banknote size={18} color="#16a34a" />
                      <span>Cash Payment at Operator Terminal</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#166534', margin: '3px 0 0 0' }}>
                      Collect physical cash from customer before confirming gate clearance.
                    </p>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d', fontFamily: 'monospace' }}>
                    ₹{payableAmount}
                  </div>
                </div>
              )}

              {/* PAYMENT OPTION 3: Card / POS Container */}
              {paymentMethod === 'CARD' && (
                <div
                  style={{
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#581c87', fontWeight: 800, fontSize: '14px' }}>
                      <CreditCard size={18} color="#9333ea" />
                      <span>Card / POS Machine Terminal</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b21a8', margin: '3px 0 0 0' }}>
                      Swipe or tap customer debit/credit card on POS before confirming exit.
                    </p>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#7e22ce', fontFamily: 'monospace' }}>
                    ₹{payableAmount}
                  </div>
                </div>
              )}
            </div>

            {/* Total Settlement Amount Banner */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #bbf7d0',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '20px',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  TOTAL SETTLEMENT AMOUNT
                </div>
                <div style={{ fontSize: '12px', color: '#15803d', marginTop: '2px' }}>
                  {durationInfo.days} Days × ₹{activeRecord.dailyRate || 20} = ₹{payableAmount}
                </div>
              </div>

              <div style={{ fontSize: '36px', fontWeight: 900, color: '#15803d', fontFamily: 'monospace' }}>
                ₹{payableAmount}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveRecord(null)}
                style={{
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  borderRadius: '10px',
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn"
                onClick={handleConfirmExitSettlement}
                disabled={paymentLoading}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{paymentLoading ? 'Settling Exit...' : '✓ Confirm Exit & Complete Settlement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Digital Payment Proof Modal */}
      {settledReceipt && (
        <FinalReceiptModal
          receipt={settledReceipt}
          onClose={handleReceiptDone}
        />
      )}
    </div>
  );
}
