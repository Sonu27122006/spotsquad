import React, { useState, useEffect } from 'react';
import {
  Building2,
  Car,
  TrendingUp,
  IndianRupee,
  Clock,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BarChart2,
  Calendar,
  Layers,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';

export default function OwnerDashboard({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [selectedLotForSlots, setSelectedLotForSlots] = useState(null);
  const [lotSlots, setLotSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // New Location Form State
  const [lotName, setLotName] = useState('');
  const [lotAddress, setLotAddress] = useState('');
  const [lotCity, setLotCity] = useState('Coimbatore');
  const [lotLat, setLotLat] = useState('11.0168');
  const [lotLng, setLotLng] = useState('76.9688');
  const [lotTotalSlots, setLotTotalSlots] = useState(20);
  const [lotHourlyRate, setLotHourlyRate] = useState(10);
  const [lotDailyRate, setLotDailyRate] = useState(50);
  const [lotHours, setLotHours] = useState('24/7');
  const [submittingLot, setSubmittingLot] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Add / Edit Slot Form State
  const [newSlotNumber, setNewSlotNumber] = useState('');
  const [newSlotType, setNewSlotType] = useState('TWO_WHEELER');
  const [newIsEVCharging, setNewIsEVCharging] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  useEffect(() => {
    loadOwnerData();
  }, []);

  const loadOwnerData = async () => {
    setLoading(true);
    try {
      const res = await api.getOwnerDashboard();
      if (res && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Error loading owner dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLot = async (e) => {
    e.preventDefault();
    setSubmittingLot(true);
    try {
      const res = await api.createParking({
        name: lotName,
        address: lotAddress,
        city: lotCity,
        latitude: parseFloat(lotLat),
        longitude: parseFloat(lotLng),
        totalSlots: parseInt(lotTotalSlots, 10),
        pricePerHour: parseFloat(lotHourlyRate),
        pricePerDay: parseFloat(lotDailyRate),
        operatingHours: lotHours,
      });

      if (res && res.success) {
        setFeedbackMsg(`✓ Parking location '${lotName}' created successfully.`);
        setShowCreateModal(false);
        // Reset form
        setLotName('');
        setLotAddress('');
        loadOwnerData();
      }
    } catch (err) {
      alert(err.message || 'Failed to create parking location.');
    } finally {
      setSubmittingLot(false);
    }
  };

  const openSlotManagement = async (lot) => {
    setSelectedLotForSlots(lot);
    setShowSlotsModal(true);
    setLoadingSlots(true);
    try {
      const res = await api.getSlots(lot._id);
      if (res && res.data) {
        setLotSlots(res.data);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const toggleSlotMaintenance = async (slot) => {
    const newStatus = slot.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    try {
      const res = await api.updateSlot(slot._id, { status: newStatus });
      if (res && res.success) {
        setLotSlots((prev) =>
          prev.map((s) => (s._id === slot._id ? { ...s, status: newStatus } : s))
        );
        loadOwnerData();
      }
    } catch (err) {
      alert('Failed to update slot status.');
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!newSlotNumber.trim()) return;

    try {
      const res = await api.addSlots(selectedLotForSlots._id, [
        {
          slotNumber: newSlotNumber.toUpperCase().trim(),
          vehicleType: newSlotType,
          isEVChargingSlot: Boolean(newIsEVCharging || newSlotType === 'EV'),
        },
      ]);

      if (res && res.success) {
        setNewSlotNumber('');
        setNewIsEVCharging(false);
        openSlotManagement(selectedLotForSlots);
        loadOwnerData();
      }
    } catch (err) {
      alert(err.message || 'Failed to add slot.');
    }
  };

  const handleToggleEVCharging = async (slot) => {
    const newEV = !slot.isEVChargingSlot;
    try {
      const res = await api.updateSlot(slot._id, { isEVChargingSlot: newEV });
      if (res && res.success) {
        setLotSlots((prev) =>
          prev.map((s) => (s._id === slot._id ? { ...s, isEVChargingSlot: newEV } : s))
        );
      }
    } catch (err) {
      alert('Failed to update slot EV charging setting.');
    }
  };

  const handleUpdateSlot = async (slotId, updateData) => {
    try {
      const res = await api.updateSlot(slotId, updateData);
      if (res && res.success) {
        setLotSlots((prev) =>
          prev.map((s) => (s._id === slotId ? { ...s, ...updateData } : s))
        );
        setEditingSlot(null);
        loadOwnerData();
      }
    } catch (err) {
      alert('Failed to update slot details.');
    }
  };

  if (loading && !dashboardData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 16px auto' }}></div>
        <p style={{ fontWeight: 600 }}>Loading Owner Dashboard...</p>
      </div>
    );
  }

  const lots = dashboardData?.parkingLots || [];
  const recent = dashboardData?.recentBookings || [];
  const revenueTrends = dashboardData?.revenueTrends || [];
  const peakHourData = dashboardData?.peakHourData || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
          borderRadius: '24px',
          padding: '24px 28px',
          color: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(5,150,105,0.3)',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
            PARKING OPERATOR & OWNER PORTAL
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', marginTop: '2px', color: '#ffffff' }}>
            {user?.name || 'Parking Owner'}
          </h2>
          <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
            Live Occupancy & Platform Revenue Operations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-outline"
            onClick={loadOwnerData}
            style={{
              color: '#ffffff',
              borderColor: 'rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button
            className="btn"
            onClick={() => setShowCreateModal(true)}
            style={{
              background: '#ffffff',
              color: '#065f46',
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          >
            <Plus size={16} />
            <span>Add New Parking Lot</span>
          </button>
        </div>
      </div>

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

      {/* Primary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Locations</div>
          <div className="stat-value">{dashboardData?.totalLots || 0}</div>
          <div className="stat-subtext">Active operational lots</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Slots</div>
          <div className="stat-value">{dashboardData?.totalSlots || 0}</div>
          <div className="stat-subtext">Combined bay capacity</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Available Slots</div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {dashboardData?.availableSlots || 0}
          </div>
          <div className="stat-subtext">Ready for reservation</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Occupied / Reserved</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {(dashboardData?.occupiedSlots || 0) + (dashboardData?.reservedSlots || 0)}
          </div>
          <div className="stat-subtext">
            {dashboardData?.occupiedSlots || 0} parked • {dashboardData?.reservedSlots || 0} reserved
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Today's Bookings</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {dashboardData?.todayBookings || 0}
          </div>
          <div className="stat-subtext">Reservations confirmed today</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Today's Revenue</div>
          <div className="stat-value font-mono" style={{ color: '#047857' }}>
            ₹{dashboardData?.todayRevenue || 0}
          </div>
          <div className="stat-subtext">Month: ₹{dashboardData?.monthRevenue || 0}</div>
        </div>
      </div>

      {/* Analytics Section: Revenue Trends & Peak-Hour Utilization */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* 7-Day Revenue Trends */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Revenue Trends (Last 7 Days)
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Daily collection across your parking facilities
              </p>
            </div>
            <span
              style={{
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '8px',
              }}
            >
              Week: ₹{dashboardData?.weekRevenue || 0}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '180px', paddingTop: '20px' }}>
            {revenueTrends.map((item, idx) => {
              const maxVal = Math.max(...revenueTrends.map((r) => r.revenue), 100);
              const heightPct = Math.max(15, Math.round((item.revenue / maxVal) * 100));

              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    ₹{item.revenue}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '32px',
                      height: `${heightPct}%`,
                      background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peak-Hour Utilization */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Peak-Hour Utilization
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Average occupancy patterns throughout the day
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {peakHourData.map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {item.hour} ({item.label})
                  </span>
                  <strong style={{ color: item.utilization >= 80 ? '#dc2626' : '#2563eb' }}>
                    {item.utilization}%
                  </strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${item.utilization}%`,
                      height: '100%',
                      background:
                        item.utilization >= 85
                          ? '#ef4444'
                          : item.utilization >= 70
                          ? '#f59e0b'
                          : '#2563eb',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parking Locations Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Managed Parking Locations ({lots.length})
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Configure pricing, operating hours, and manage individual slots
            </p>
          </div>
        </div>

        {lots.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
            <Building2 size={36} color="#cbd5e1" style={{ margin: '0 auto 10px auto' }} />
            <p>You have not registered any parking locations yet.</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ marginTop: '10px' }}>
              Create Your First Location
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Location Name</th>
                  <th>City</th>
                  <th>Total Slots</th>
                  <th>Free Slots</th>
                  <th>Price / Hr</th>
                  <th>Price / Day</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot._id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{lot.name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{lot.address}</div>
                    </td>
                    <td>{lot.city}</td>
                    <td style={{ fontWeight: 700 }}>{lot.totalSlots}</td>
                    <td>
                      <span style={{ color: '#16a34a', fontWeight: 800 }}>
                        {lot.availableSlots} free
                      </span>
                    </td>
                    <td className="font-mono">₹{lot.pricePerHour}</td>
                    <td className="font-mono">₹{lot.pricePerDay}</td>
                    <td>
                      <span
                        style={{
                          background: lot.status === 'ACTIVE' ? '#ecfdf5' : '#fef2f2',
                          color: lot.status === 'ACTIVE' ? '#047857' : '#b91c1c',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {lot.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline"
                        onClick={() => openSlotManagement(lot)}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700 }}
                      >
                        Manage Slots
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PARKING LOCATION MODAL */}
      {showCreateModal && (
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
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Add New Parking Location
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '18px' }}>
              Register a new parking lot to start receiving digital commuter reservations
            </p>

            <form onSubmit={handleCreateLot}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Parking Name
                </label>
                <input
                  type="text"
                  value={lotName}
                  onChange={(e) => setLotName(e.target.value)}
                  placeholder="e.g. Cross Cut Road Smart Parking Bay"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Full Street Address
                </label>
                <input
                  type="text"
                  value={lotAddress}
                  onChange={(e) => setLotAddress(e.target.value)}
                  placeholder="e.g. Cross Cut Road, Gandhipuram, Coimbatore 641012"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={lotCity}
                    onChange={(e) => setLotCity(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lotLat}
                    onChange={(e) => setLotLat(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lotLng}
                    onChange={(e) => setLotLng(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Total Slots
                  </label>
                  <input
                    type="number"
                    value={lotTotalSlots}
                    min={1}
                    max={200}
                    onChange={(e) => setLotTotalSlots(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    ₹ / Hour
                  </label>
                  <input
                    type="number"
                    value={lotHourlyRate}
                    min={1}
                    onChange={(e) => setLotHourlyRate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    ₹ / Day
                  </label>
                  <input
                    type="number"
                    value={lotDailyRate}
                    min={1}
                    onChange={(e) => setLotDailyRate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submittingLot} className="btn btn-primary">
                  {submittingLot ? 'Saving...' : 'Create Location & Slots'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLOT MANAGEMENT MODAL */}
      {showSlotsModal && selectedLotForSlots && (
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
          }}
          onClick={() => setShowSlotsModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '680px',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Manage Slots: {selectedLotForSlots.name}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  Click any slot to toggle maintenance status
                </p>
              </div>
              <button className="btn btn-outline" onClick={() => setShowSlotsModal(false)}>
                ✕ Close
              </button>
            </div>

            {/* Add Custom Slot Form */}
            <form
              onSubmit={handleAddSlot}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '12px',
                marginBottom: '16px',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                value={newSlotNumber}
                onChange={(e) => setNewSlotNumber(e.target.value.toUpperCase())}
                placeholder="New Slot ID (e.g. EV-01)"
                style={{ flex: '1 1 120px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <select
                value={newSlotType}
                onChange={(e) => {
                  setNewSlotType(e.target.value);
                  if (e.target.value === 'EV') setNewIsEVCharging(true);
                }}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="TWO_WHEELER">Two-Wheeler</option>
                <option value="FOUR_WHEELER">Four-Wheeler</option>
                <option value="EV">EV Slot</option>
              </select>

              {/* EV Charging Slot Checkbox/Toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: newIsEVCharging ? '#047857' : '#475569',
                  background: newIsEVCharging ? '#ecfdf5' : '#ffffff',
                  border: newIsEVCharging ? '1px solid #10b981' : '1px solid #cbd5e1',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={newIsEVCharging}
                  onChange={(e) => setNewIsEVCharging(e.target.checked)}
                  style={{ accentColor: '#10b981', cursor: 'pointer' }}
                />
                <span>⚡ EV Charging Slot</span>
              </label>

              <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                + Add Slot
              </button>
            </form>

            {/* Slots Grid */}
            {loadingSlots ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                <div className="pulse-dot" style={{ margin: '0 auto 8px auto' }}></div>
                <span>Loading slots...</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '8px' }}>
                {lotSlots.map((slot) => {
                  let bg = '#ecfdf5';
                  let border = '#a7f3d0';
                  let color = '#047857';

                  if (slot.status === 'RESERVED') {
                    bg = '#fffbeb';
                    border = '#fde68a';
                    color = '#b45309';
                  } else if (slot.status === 'OCCUPIED') {
                    bg = '#fef2f2';
                    border = '#fecaca';
                    color = '#b91c1c';
                  } else if (slot.status === 'MAINTENANCE') {
                    bg = '#f1f5f9';
                    border = '#cbd5e1';
                    color = '#64748b';
                  }

                  return (
                    <div
                      key={slot._id}
                      onClick={() => setEditingSlot(slot)}
                      style={{
                        background: bg,
                        border: `1.5px solid ${border}`,
                        color: color,
                        borderRadius: '10px',
                        padding: '10px 4px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                      title="Click to Edit Slot / Toggle EV Charging / Maintenance"
                    >
                      <div style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '13px' }}>
                        {slot.slotNumber}
                      </div>
                      <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px' }}>
                        {slot.status}
                      </div>
                      <div style={{ fontSize: '8px', opacity: 0.7, marginTop: '1px' }}>
                        {slot.vehicleType === 'EV' ? '⚡ EV' : slot.vehicleType === 'FOUR_WHEELER' ? '🚗 4W' : '🛵 2W'}
                      </div>
                      {slot.isEVChargingSlot && (
                        <div
                          style={{
                            fontSize: '8px',
                            fontWeight: 800,
                            color: '#047857',
                            background: '#d1fae5',
                            borderRadius: '4px',
                            padding: '1px 4px',
                            marginTop: '3px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          ⚡ EV Charging
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Edit Slot Modal / Form */}
            {editingSlot && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(3px)',
                  zIndex: 10001,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                }}
                onClick={() => setEditingSlot(null)}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '400px',
                    padding: '20px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      Edit Slot: {editingSlot.slotNumber}
                    </h4>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => setEditingSlot(null)}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Slot Status
                      </label>
                      <select
                        value={editingSlot.status}
                        onChange={(e) => setEditingSlot({ ...editingSlot, status: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        <option value="AVAILABLE">AVAILABLE (Open for Bookings)</option>
                        <option value="MAINTENANCE">MAINTENANCE (Disabled)</option>
                        <option value="RESERVED">RESERVED</option>
                        <option value="OCCUPIED">OCCUPIED</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Vehicle Type
                      </label>
                      <select
                        value={editingSlot.vehicleType}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditingSlot({
                            ...editingSlot,
                            vehicleType: v,
                            isEVChargingSlot: v === 'EV' ? true : editingSlot.isEVChargingSlot,
                          });
                        }}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        <option value="TWO_WHEELER">Two-Wheeler</option>
                        <option value="FOUR_WHEELER">Four-Wheeler</option>
                        <option value="EV">EV Slot</option>
                      </select>
                    </div>

                    {/* EV Charging Slot Toggle/Checkbox in Edit Slot Form */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px',
                        borderRadius: '8px',
                        background: editingSlot.isEVChargingSlot ? '#ecfdf5' : '#f8fafc',
                        border: editingSlot.isEVChargingSlot ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: editingSlot.isEVChargingSlot ? '#047857' : '#334155',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(editingSlot.isEVChargingSlot)}
                        onChange={(e) => setEditingSlot({ ...editingSlot, isEVChargingSlot: e.target.checked })}
                        style={{ accentColor: '#10b981', cursor: 'pointer' }}
                      />
                      <span>⚡ EV Charging Slot</span>
                    </label>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ flex: 1, padding: '8px' }}
                        onClick={() => setEditingSlot(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px' }}
                        onClick={() =>
                          handleUpdateSlot(editingSlot._id, {
                            status: editingSlot.status,
                            vehicleType: editingSlot.vehicleType,
                            isEVChargingSlot: editingSlot.isEVChargingSlot,
                          })
                        }
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
