import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Car,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Zap,
  ShieldCheck,
  CreditCard,
  IndianRupee,
} from 'lucide-react';
import { api } from '../services/api';

export default function SlotReservationModal({
  parkingLot,
  user,
  onClose,
  onReservationSuccess,
}) {
  const [currentLot, setCurrentLot] = useState(parkingLot);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // EV Charging Filter
  const [evOnly, setEvOnly] = useState(false);

  // Nearby Alternatives State
  const [alternatives, setAlternatives] = useState([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [alternativesMessage, setAlternativesMessage] = useState('');

  // Update currentLot if parent prop changes
  useEffect(() => {
    setCurrentLot(parkingLot);
  }, [parkingLot]);

  // Time & Date selection
  const now = new Date();
  const defaultStartTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins from now
  const defaultEndTime = new Date(defaultStartTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

  const [bookingDate, setBookingDate] = useState(now.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(
    defaultStartTime.toTimeString().substring(0, 5)
  );
  const [durationHours, setDurationHours] = useState(2);

  // Customer & Vehicle Details
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [mobileNumber, setMobileNumber] = useState(user?.phone || '');
  const [vehicleNumber, setVehicleNumber] = useState(
    user?.defaultVehicleNumber || 'TN 38 CM 2026'
  );
  const [vehicleType, setVehicleType] = useState(
    user?.defaultVehicleType || 'TWO_WHEELER'
  );

  // Calculation & Checkout
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-switch vehicle type to EV if EV Only is selected
  useEffect(() => {
    if (evOnly && vehicleType !== 'EV') {
      setVehicleType('EV');
    }
  }, [evOnly]);

  // Fetch slots whenever lot, time, duration or evOnly changes
  useEffect(() => {
    if (currentLot) {
      loadSlots();
    }
  }, [currentLot, bookingDate, startTime, durationHours, evOnly]);

  const loadSlots = async () => {
    setLoadingSlots(true);
    setErrorMessage('');
    try {
      const startDateTime = new Date(`${bookingDate}T${startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);

      const params = {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      };
      if (evOnly) {
        params.evOnly = 'true';
      }

      const res = await api.getSlots(currentLot._id, params);

      if (res && res.data) {
        setSlots(res.data);
        // Clear selected slot if it became unavailable in this time slot
        if (selectedSlot) {
          const matching = res.data.find((s) => s._id === selectedSlot._id);
          if (!matching || matching.status !== 'AVAILABLE') {
            setSelectedSlot(null);
          }
        }

        // Check if 0 available slots found for this lot or lot is full
        const availableCount = res.data.filter((s) => s.status === 'AVAILABLE').length;
        if (availableCount === 0 || currentLot.availableSlots === 0) {
          fetchNearbyAlternatives(currentLot._id);
        } else {
          setAlternatives([]);
          setAlternativesMessage('');
        }
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setErrorMessage('Failed to load slots for the selected time.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchNearbyAlternatives = async (lotId) => {
    setLoadingAlternatives(true);
    setAlternativesMessage('');
    try {
      const res = await api.getNearbyAlternatives(lotId);
      if (res && res.data && res.data.length > 0) {
        setAlternatives(res.data);
        setAlternativesMessage(res.message || `Found ${res.data.length} nearby alternative(s) within 3 km.`);
      } else {
        setAlternatives([]);
        setAlternativesMessage(res?.message || 'No nearby parking alternatives available within 3 km.');
      }
    } catch (err) {
      console.error('Error fetching nearby alternatives:', err);
      setAlternatives([]);
      setAlternativesMessage('No nearby parking alternatives available within 3 km.');
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleSelectAlternative = (alt) => {
    setCurrentLot(alt);
    setSelectedSlot(null);
    setAlternatives([]);
    setAlternativesMessage('');
    setErrorMessage('');
  };

  // Pricing calculation
  const hours = Number(durationHours);
  let totalAmount = 0;
  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    totalAmount = days * (currentLot.pricePerDay || 50);
  } else {
    totalAmount = hours * (currentLot.pricePerHour || 10);
  }

  const handleSlotClick = (slot) => {
    if (slot.status !== 'AVAILABLE') return;
    setSelectedSlot(slot);
    setErrorMessage('');
  };

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMessage('Please click and select an AVAILABLE slot from the grid below.');
      return;
    }

    if (!customerName || customerName.trim().length < 2) {
      setErrorMessage('Please enter the customer name (at least 2 characters).');
      return;
    }

    const cleanMobile = (mobileNumber || '').replace(/[^0-9]/g, '');
    if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).');
      return;
    }

    if (!vehicleNumber.trim() || vehicleNumber.trim().length < 4) {
      setErrorMessage('Please enter a valid vehicle registration number.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const startDateTime = new Date(`${bookingDate}T${startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);

      // Call API to create reservation (backend verifies overlapping availability!)
      const res = await api.createBooking({
        parkingLotId: currentLot._id,
        slotId: selectedSlot._id,
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        vehicleType,
        customerName: customerName.trim(),
        customerPhone: cleanMobile,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        durationHours: hours,
        amount: totalAmount,
        paymentStatus: 'PENDING',
      });

      if (res && res.success && res.data) {
        onReservationSuccess(res.data);
      }
    } catch (err) {
      setErrorMessage(
        err.message ||
          'Failed to reserve slot. It may have just been booked by another commuter. Please pick another slot.'
      );
    } finally {
      setSubmitting(false);
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
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🅿️</span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {currentLot.name}
              </h2>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} color="#2563eb" />
              <span>{currentLot.address}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#e2e8f0',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {errorMessage && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Time & Duration Controls */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '18px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="#2563eb" />
              <span>Select Date & Reservation Time</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  min={now.toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Duration
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                >
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                  <option value={4}>4 Hours</option>
                  <option value={8}>8 Hours</option>
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (Full Day)</option>
                  <option value={48}>2 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Customer Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Mobile Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength="10"
                placeholder="Enter 10-digit mobile number"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Vehicle Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="TN 38 CM 2026"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Vehicle Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              >
                <option value="TWO_WHEELER">Two-Wheeler</option>
                <option value="FOUR_WHEELER">Four-Wheeler</option>
                <option value="EV">Electric Vehicle (EV)</option>
              </select>
            </div>
          </div>

          {/* Slot Map Section */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  Select a Parking Slot
                </div>

                {/* EV Charging Only Filter Toggle */}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    background: evOnly ? '#ecfdf5' : '#f8fafc',
                    border: evOnly ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                    color: evOnly ? '#047857' : '#475569',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={evOnly}
                    onChange={(e) => setEvOnly(e.target.checked)}
                    style={{ accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <span>⚡ EV Charging Only</span>
                </label>
              </div>

              {/* Status Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '3px' }}></span>
                  <span>Available</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '3px' }}></span>
                  <span>Reserved</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '3px' }}></span>
                  <span>Occupied</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#047857', borderRadius: '3px' }}></span>
                  <span>⚡ EV</span>
                </span>
              </div>
            </div>

            {loadingSlots ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                <div className="pulse-dot" style={{ margin: '0 auto 10px auto' }}></div>
                <span>Checking real-time slot availability...</span>
              </div>
            ) : slots.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                {evOnly ? 'No EV charging slots available for this location.' : 'No slots configured for this location.'}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                  gap: '8px',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '14px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {slots.map((slot) => {
                  const isAvailable = slot.status === 'AVAILABLE';
                  const isSelected = selectedSlot?._id === slot._id;

                  let bg = '#ffffff';
                  let border = '#cbd5e1';
                  let color = '#334155';

                  if (slot.status === 'AVAILABLE') {
                    bg = isSelected ? '#10b981' : '#ecfdf5';
                    border = isSelected ? '#059669' : '#a7f3d0';
                    color = isSelected ? '#ffffff' : '#047857';
                  } else if (slot.status === 'RESERVED') {
                    bg = '#fffbeb';
                    border = '#fde68a';
                    color = '#b45309';
                  } else if (slot.status === 'OCCUPIED') {
                    bg = '#fef2f2';
                    border = '#fecaca';
                    color = '#b91c1c';
                  } else {
                    bg = '#f1f5f9';
                    border = '#e2e8f0';
                    color = '#94a3b8';
                  }

                  return (
                    <button
                      key={slot._id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleSlotClick(slot)}
                      style={{
                        background: bg,
                        border: `2px solid ${border}`,
                        color: color,
                        borderRadius: '10px',
                        padding: '8px 4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        transform: isSelected ? 'scale(1.05)' : 'none',
                        boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace' }}>
                        {slot.slotNumber}
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>
                        {isSelected ? 'SELECTED' : slot.status}
                      </span>
                      {slot.isEVChargingSlot && (
                        <span
                          style={{
                            fontSize: '8px',
                            fontWeight: 800,
                            color: isSelected ? '#ffffff' : '#047857',
                            background: isSelected ? 'rgba(0,0,0,0.25)' : '#d1fae5',
                            borderRadius: '4px',
                            padding: '1px 4px',
                            marginTop: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ⚡ EV Charging
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* NEARBY ALTERNATIVES SECTION (Triggered when 0 available slots in selected lot) */}
          {!loadingSlots && (slots.filter((s) => s.status === 'AVAILABLE').length === 0 || currentLot.availableSlots === 0) && (
            <div
              style={{
                marginBottom: '18px',
                padding: '16px',
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={20} color="#b45309" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#92400e' }}>
                  No Available Slots at {currentLot.name} (0 Free)
                </h4>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#78350f' }}>
                Finding other parking lots with available slots within 3 km:
              </p>

              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Nearby Alternatives
              </div>

              {loadingAlternatives ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#92400e', fontSize: '12px' }}>
                  <div className="pulse-dot" style={{ margin: '0 auto 6px auto' }}></div>
                  Searching nearby alternatives within 3 km...
                </div>
              ) : alternatives.length === 0 ? (
                <div
                  style={{
                    padding: '12px',
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #fed7aa',
                    color: '#9a3412',
                    fontSize: '12px',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  {alternativesMessage || 'No nearby parking alternatives available within 3 km.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {alternatives.map((alt) => (
                    <div
                      key={alt._id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ flex: '1 1 200px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                          {alt.name}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            marginTop: '2px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <span style={{ color: '#2563eb', fontWeight: 700 }}>
                            📍 {alt.distanceKm} km away
                          </span>
                          <span>•</span>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>
                            ₹{alt.pricePerHour}/hr
                          </span>
                          <span>•</span>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>
                            ⚡ {alt.availableSlots} slots available
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleSelectAlternative(alt)}
                        style={{
                          padding: '7px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        View / Book Option →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pricing & Summary Card */}
          <div
            style={{
              background: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                RESERVATION SUMMARY
              </div>
              <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                Slot: <strong style={{ color: '#2563eb' }}>{selectedSlot ? selectedSlot.slotNumber : 'None Selected'}</strong> • Duration: <strong>{hours} {hours === 1 ? 'Hour' : 'Hours'}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Total Payable</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e3a8a', fontFamily: 'monospace' }}>
                ₹{totalAmount}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirmReservation}
            disabled={!selectedSlot || submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            {submitting ? (
              <span>Confirming Reservation...</span>
            ) : (
              <>
                <CreditCard size={18} />
                <span>Pay ₹{totalAmount} & Reserve</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
