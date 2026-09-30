import React, { useState, useEffect } from 'react';
import {
  Car,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  QrCode,
  CreditCard,
  Ban,
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
  Receipt,
} from 'lucide-react';
import { api } from '../services/api';

export default function CommuterDashboard({
  user,
  setCurrentPage,
  onViewPass,
}) {
  const [dashboardData, setDashboardData] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, bookingsRes] = await Promise.all([
        api.getCommuterDashboard(),
        api.getBookings(),
      ]);

      if (dashRes && dashRes.data) {
        setDashboardData(dashRes.data);
      }
      if (bookingsRes && bookingsRes.data) {
        setAllBookings(bookingsRes.data);
      }
    } catch (err) {
      console.error('Error fetching commuter dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation? A full refund will be processed.')) {
      return;
    }

    setActionLoadingId(bookingId);
    try {
      const res = await api.cancelBooking(bookingId, cancelReason || 'Commuter requested cancellation');
      if (res && res.success) {
        setFeedbackMsg(`✓ Booking ${bookingId} cancelled. Refund of ₹${res.data?.refundAmount || 0} initiated.`);
        setCancellingBookingId(null);
        setCancelReason('');
        loadDashboard();
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel booking.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCheckIn = async (bookingId) => {
    setActionLoadingId(bookingId);
    try {
      const res = await api.checkInBooking(bookingId);
      if (res && res.success) {
        setFeedbackMsg(`✓ Vehicle checked in! Slot status is now OCCUPIED.`);
        loadDashboard();
      }
    } catch (err) {
      alert(err.message || 'Check-in failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCheckOut = async (bookingId) => {
    if (!window.confirm('Mark this parking session as completed and exit?')) return;
    setActionLoadingId(bookingId);
    try {
      const res = await api.checkOutBooking(bookingId, { paymentMethod: 'UPI_QR' });
      if (res && res.success) {
        setFeedbackMsg(`✓ Parking completed. Vehicle has exited and slot is now AVAILABLE.`);
        loadDashboard();
      }
    } catch (err) {
      alert(err.message || 'Exit failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredHistory = allBookings.filter((b) => {
    if (historyFilter === 'ALL') return true;
    if (historyFilter === 'UPCOMING') return b.bookingStatus === 'CONFIRMED';
    if (historyFilter === 'ACTIVE') return b.bookingStatus === 'ACTIVE';
    if (historyFilter === 'COMPLETED') return b.bookingStatus === 'COMPLETED';
    if (historyFilter === 'CANCELLED') return b.bookingStatus === 'CANCELLED';
    return true;
  });

  if (loading && !dashboardData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 16px auto' }}></div>
        <p style={{ fontWeight: 600 }}>Loading Commuter Dashboard...</p>
      </div>
    );
  }

  const upcoming = dashboardData?.upcomingBookings || [];
  const active = dashboardData?.activeBookings || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          borderRadius: '24px',
          padding: '24px 28px',
          color: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(37,99,235,0.3)',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>
            COMMUTER DASHBOARD
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', marginTop: '2px', color: '#ffffff' }}>
            Welcome back, {user?.name || 'Commuter'}!
          </h2>
          <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
            Registered Vehicle: <strong style={{ fontFamily: 'monospace' }}>{user?.defaultVehicleNumber || 'TN 38 CM 2026'}</strong>
          </p>
        </div>

        <button
          className="btn"
          onClick={() => setCurrentPage('search')}
          style={{
            background: '#ffffff',
            color: '#1d4ed8',
            padding: '12px 20px',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <Search size={16} />
          <span>Find & Reserve Parking</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            color: '#15803d',
            padding: '12px 18px',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{feedbackMsg}</span>
          <button
            onClick={() => setFeedbackMsg('')}
            style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="stat-card">
          <div className="stat-label">Active Parking</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {dashboardData?.activeCount || 0}
          </div>
          <div className="stat-subtext">Currently parked vehicle</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Upcoming Bookings</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {dashboardData?.upcomingCount || 0}
          </div>
          <div className="stat-subtext">Confirmed future reservations</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Completed Sessions</div>
          <div className="stat-value" style={{ color: '#475569' }}>
            {dashboardData?.completedCount || 0}
          </div>
          <div className="stat-subtext">Total past parking history</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value font-mono" style={{ color: '#0f172a' }}>
            ₹{dashboardData?.totalSpent || 0}
          </div>
          <div className="stat-subtext">Settled across all bookings</div>
        </div>
      </div>

      {/* Active Parking Spotlight */}
      {active.length > 0 && (
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pulse-dot" style={{ background: '#2563eb' }}></span>
            <span>Live Active Parking Session</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {active.map((b) => (
              <div
                key={b._id}
                style={{
                  background: '#eff6ff',
                  border: '2px solid #93c5fd',
                  borderRadius: '20px',
                  padding: '20px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {b.bookingStatus}
                    </span>
                    <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>
                      {b.parkingLotId?.name || 'Parking Spot'}
                    </h4>
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>
                    Vehicle: <strong style={{ fontFamily: 'monospace' }}>{b.vehicleNumber}</strong> • Slot: <strong style={{ color: '#2563eb' }}>{b.slotId?.slotNumber || 'Slot'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Entry: {new Date(b.checkInTime || b.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => onViewPass(b.bookingId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px' }}
                  >
                    <QrCode size={16} />
                    <span>Digital Pass</span>
                  </button>

                  {b.bookingStatus === 'CONFIRMED' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleCheckIn(b.bookingId)}
                      disabled={actionLoadingId === b.bookingId}
                      style={{ padding: '10px 16px', fontWeight: 700 }}
                    >
                      {actionLoadingId === b.bookingId ? 'Checking In...' : 'Check In Vehicle'}
                    </button>
                  )}

                  {b.bookingStatus === 'ACTIVE' && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleCheckOut(b.bookingId)}
                      disabled={actionLoadingId === b.bookingId}
                      style={{ background: '#16a34a', color: '#ffffff', padding: '10px 16px', fontWeight: 700, border: 'none', borderRadius: '10px' }}
                    >
                      {actionLoadingId === b.bookingId ? 'Processing...' : 'Complete & Exit'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Reservations */}
      {upcoming.length > 0 && (
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
            Upcoming Reservations ({upcoming.length})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {upcoming.map((b) => (
              <div
                key={b._id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '18px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {b.parkingLotId?.name}
                    </h4>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Ref: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{b.bookingId}</span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    CONFIRMED
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '14px', background: '#f8fafc', padding: '10px', borderRadius: '10px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Slot: </span>
                    <strong style={{ color: '#2563eb' }}>{b.slotId?.slotNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Vehicle: </span>
                    <strong style={{ fontFamily: 'monospace' }}>{b.vehicleNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Time: </span>
                    <span>{new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Amount: </span>
                    <strong style={{ color: '#15803d' }}>₹{b.amount}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => onViewPass(b.bookingId)}
                    style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <QrCode size={14} />
                    <span>Pass</span>
                  </button>

                  <button
                    className="btn btn-outline"
                    onClick={() => handleCancelBooking(b.bookingId)}
                    disabled={actionLoadingId === b.bookingId}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '12px',
                      color: '#ef4444',
                      borderColor: '#fca5a5',
                    }}
                  >
                    {actionLoadingId === b.bookingId ? 'Cancelling...' : 'Cancel'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete Booking History Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Booking History
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              All reservations, completed sessions, and refunds
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED', 'CANCELLED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setHistoryFilter(tab)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: historyFilter === tab ? '#2563eb' : '#f1f5f9',
                  color: historyFilter === tab ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div style={{ padding: '36px 12px', textAlign: 'center', color: '#64748b' }}>
            <Calendar size={32} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
            <p style={{ fontWeight: 600 }}>No reservations found under '{historyFilter}'.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Parking Location</th>
                  <th>Slot</th>
                  <th>Vehicle</th>
                  <th>Date & Time</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((b) => (
                  <tr key={b._id}>
                    <td className="font-mono" style={{ fontWeight: 700, color: '#1e3a8a' }}>
                      {b.bookingId}
                    </td>
                    <td>{b.parkingLotId?.name || 'Parking Lot'}</td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#2563eb' }}>
                        {b.slotId?.slotNumber || 'Slot'}
                      </span>
                    </td>
                    <td className="font-mono">{b.vehicleNumber}</td>
                    <td>
                      {new Date(b.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} •{' '}
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 700 }}>
                      ₹{b.amount}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background:
                            b.bookingStatus === 'COMPLETED'
                              ? '#f0fdf4'
                              : b.bookingStatus === 'CANCELLED'
                              ? '#fef2f2'
                              : b.bookingStatus === 'ACTIVE'
                              ? '#eff6ff'
                              : '#fffbeb',
                          color:
                            b.bookingStatus === 'COMPLETED'
                              ? '#15803d'
                              : b.bookingStatus === 'CANCELLED'
                              ? '#b91c1c'
                              : b.bookingStatus === 'ACTIVE'
                              ? '#1d4ed8'
                              : '#b45309',
                        }}
                      >
                        {b.bookingStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline"
                        onClick={() => onViewPass(b.bookingId)}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
