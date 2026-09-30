import React, { useState, useEffect, useMemo } from 'react';
import {
  Bike,
  Search,
  LogOut,
  FileText,
  Sparkles,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  Clock,
  IndianRupee,
  ShieldCheck,
  MapPin,
  Calendar,
  Phone,
  User,
  XCircle,
  ChevronRight,
  Filter
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import DigitalTicketModal from '../components/DigitalTicketModal';
import DemoTimeController from '../components/DemoTimeController';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { getParkingDuration } from '../utils/parkingUtils';

export default function ActiveVehicles({ setCurrentPage, onSelectVehicleForExit }) {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [durationFilter, setDurationFilter] = useState('ALL'); // 'ALL' | 'OVER_1_DAY'
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedSimVehicle, setSelectedSimVehicle] = useState(null);

  useEffect(() => {
    loadActiveVehicles();
  }, []);

  const loadActiveVehicles = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.getActiveParking();
      if (res && res.data) {
        setVehicles(Array.isArray(res.data) ? res.data : []);
      } else {
        setVehicles([]);
      }
    } catch (err) {
      console.error('Error loading active vehicles:', err);
      setErrorMessage(err.message || 'Unable to load active parking records. Please check the server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDuration = async (addedDays) => {
    const targetVehicle = selectedSimVehicle || vehicles[0];
    if (!targetVehicle) return;

    try {
      await api.simulateTime(targetVehicle.id, addedDays);
      await loadActiveVehicles();
      const updated = await api.getParkingById(targetVehicle.id);
      if (updated && updated.data) {
        setSelectedSimVehicle(updated.data);
      }
    } catch (err) {
      console.error('Error simulating time:', err);
    }
  };

  // Pre-calculate duration info for each vehicle using unified utility
  const vehiclesWithDuration = useMemo(() => {
    return vehicles.map((v) => {
      const durationInfo = getParkingDuration(
        v.entryTime,
        new Date(),
        v.demoAddedDays ?? 0,
        v.dailyRate ?? 20
      );
      return {
        ...v,
        calculatedDuration: durationInfo,
        // Override with real-time calculated amount
        liveAmount: durationInfo.amount,
        liveDays: durationInfo.days,
        isOverOneDay: durationInfo.isOverOneDay,
      };
    });
  }, [vehicles]);

  // Combined Search and Duration Filtering
  const filteredVehicles = useMemo(() => {
    return vehiclesWithDuration.filter((item) => {
      // 1. Duration Filter: Check if > 24 hours
      if (durationFilter === 'OVER_1_DAY' && !item.isOverOneDay) {
        return false;
      }

      // 2. Search query filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      const token = (item.tokenId || item.parkingId || '').toLowerCase();
      const vNum = (item.vehicleNumber || '').toLowerCase();
      const cName = (item.customerName || '').toLowerCase();
      const mobile = (item.mobileNumber || '');
      const slot = (item.parkingSlot || '').toLowerCase();

      return (
        token.includes(term) ||
        vNum.includes(term) ||
        cName.includes(term) ||
        mobile.includes(term) ||
        slot.includes(term)
      );
    });
  }, [vehiclesWithDuration, durationFilter, searchTerm]);

  // Metrics
  const totalActiveCount = vehicles.length;
  const overdueCount = vehiclesWithDuration.filter((v) => v.isOverOneDay).length;
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todaysEntriesCount = vehicles.filter((v) => (v.entryTime || '').startsWith(todayDateStr)).length;
  const totalCurrentValue = vehiclesWithDuration.reduce((sum, v) => sum + v.liveAmount, 0);

  return (
    <div className="content-area">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bike size={24} color="#2563eb" />
            <span>{t('activeVehicles', 'Active Parking')}</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Currently parked two-wheelers in the facility with real-time stay tracking
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={loadActiveVehicles} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>{t('refresh', 'Refresh')}</span>
          </button>

          <button className="btn btn-primary btn-sm" onClick={() => setCurrentPage('new-entry')}>
            <PlusCircle size={14} />
            <span>{t('newEntry', 'New Parking Entry')}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('currentlyParked', 'Currently Parked')}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a', marginTop: '6px' }}>
            {totalActiveCount} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>vehicles</span>
          </div>
          <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px' }}>
            Live bays occupied
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{t('parkedOverOneDay', 'Parked > 1 Day')}</span>
            {overdueCount > 0 && (
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                {overdueCount} OVERDUE
              </span>
            )}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: overdueCount > 0 ? '#b45309' : '#1e293b', marginTop: '6px' }}>
            {overdueCount} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>vehicles</span>
          </div>
          <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>
            Parked for more than 24 hours
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('todaysEntries', "Today's Entries")}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#065f46', marginTop: '6px' }}>
            {todaysEntriesCount} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>vehicles</span>
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
            Checked in today
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('currentAmountDue', 'Current Parking Value')}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#5b21b6', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            ₹{totalCurrentValue.toFixed(0)}
          </div>
          <div style={{ fontSize: '12px', color: '#7c3aed', marginTop: '4px' }}>
            Total active uncollected fees
          </div>
        </div>
      </div>

      {/* Demo Multi-Day Simulator Controller */}
      <DemoTimeController
        onSimulate={handleSimulateDuration}
        currentDemoDays={selectedSimVehicle ? selectedSimVehicle.demoAddedDays : 0}
        vehicleNumber={selectedSimVehicle ? selectedSimVehicle.vehicleNumber : (vehicles[0]?.vehicleNumber || null)}
      />

      {/* Main Filter & Table Card */}
      <div className="card">
        {/* Header with Search and Duration Filter Controls */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {t('activeVehicles', 'Active Parked Vehicles')}
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
                {durationFilter === 'OVER_1_DAY'
                  ? `Showing ${filteredVehicles.length} vehicles parked for more than 1 day (> 24 hours)`
                  : `Showing ${filteredVehicles.length} active parked vehicles`}
              </p>
            </div>

            {/* Search Box */}
            <div className="search-box" style={{ width: '100%', maxWidth: '340px' }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search plate, customer, phone, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: '13px', borderRadius: '10px' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>
          </div>

          {/* HIGHLY VISIBLE DURATION FILTER BUTTONS (Mobile & Touch Friendly) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              paddingTop: '8px',
              borderTop: '1px dashed #e2e8f0',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
              <Filter size={14} color="#2563eb" />
              <span>Parking Duration:</span>
            </span>

            {/* "All Vehicles" Button */}
            <button
              type="button"
              onClick={() => setDurationFilter('ALL')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: durationFilter === 'ALL' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: durationFilter === 'ALL' ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : '#ffffff',
                color: durationFilter === 'ALL' ? '#1d4ed8' : '#475569',
                boxShadow: durationFilter === 'ALL' ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none',
              }}
            >
              <span>{t('allVehicles', 'All Vehicles')}</span>
              <span
                style={{
                  background: durationFilter === 'ALL' ? '#2563eb' : '#f1f5f9',
                  color: durationFilter === 'ALL' ? '#ffffff' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {totalActiveCount}
              </span>
            </button>

            {/* "Parked > 1 Day" Button (Large, Prominent, Clear Text) */}
            <button
              type="button"
              onClick={() => setDurationFilter('OVER_1_DAY')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: durationFilter === 'OVER_1_DAY' ? '2px solid #ea580c' : '1px solid #fed7aa',
                background: durationFilter === 'OVER_1_DAY' ? 'linear-gradient(135deg, #fff7ed, #ffedd5)' : '#ffffff',
                color: durationFilter === 'OVER_1_DAY' ? '#c2410c' : '#7c2d12',
                boxShadow: durationFilter === 'OVER_1_DAY' ? '0 3px 12px rgba(234, 88, 12, 0.2)' : 'none',
              }}
            >
              <Clock size={16} color={durationFilter === 'OVER_1_DAY' ? '#ea580c' : '#d97706'} />
              <span>{t('parkedOverOneDay', 'Parked > 1 Day')}</span>
              <span
                style={{
                  background: durationFilter === 'OVER_1_DAY' ? '#ea580c' : '#ffedd5',
                  color: durationFilter === 'OVER_1_DAY' ? '#ffffff' : '#9a3412',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {overdueCount}
              </span>
            </button>
          </div>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div style={{ margin: '16px 20px', background: '#fef2f2', border: '1.5px solid #fecaca', color: '#991b1b', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '13px' }}>{errorMessage}</span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={loadActiveVehicles} style={{ borderColor: '#fca5a5', color: '#991b1b' }}>
              Retry
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
            <div className="pulse-dot" style={{ margin: '0 auto 10px auto' }}></div>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading active vehicles from database...</span>
          </div>
        ) : filteredVehicles.length === 0 ? (
          /* Contextual Empty States */
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ maxWidth: '420px', margin: '0 auto' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: durationFilter === 'OVER_1_DAY' ? '#fff7ed' : '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: durationFilter === 'OVER_1_DAY' ? '#ea580c' : '#2563eb',
                }}
              >
                {durationFilter === 'OVER_1_DAY' ? <Clock size={30} /> : <Bike size={30} />}
              </div>

              {/* Empty state title */}
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                {searchTerm
                  ? 'No matching vehicles found'
                  : durationFilter === 'OVER_1_DAY'
                  ? t('noOverdueVehicles', 'No Vehicles Parked More Than 1 Day')
                  : 'No Active Vehicles'}
              </h3>

              {/* Empty state description */}
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', marginBottom: '20px' }}>
                {searchTerm
                  ? `No active parking record matches "${searchTerm}".`
                  : durationFilter === 'OVER_1_DAY'
                  ? t('noOverdueSub', 'There are currently no vehicles parked for more than 24 hours.')
                  : 'There are currently no vehicles parked in the system. Start fresh by creating an entry.'}
              </p>

              {/* Empty state action */}
              {searchTerm ? (
                <button className="btn btn-outline btn-sm" onClick={() => setSearchTerm('')}>
                  Clear Search Filter
                </button>
              ) : durationFilter === 'OVER_1_DAY' ? (
                <button className="btn btn-outline btn-sm" onClick={() => setDurationFilter('ALL')}>
                  View All Vehicles
                </button>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => setCurrentPage('new-entry')}>
                  <PlusCircle size={14} />
                  <span>New Parking Entry</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* 1. DESKTOP VIEW: Clean Table Layout (Hidden on small mobile screens via CSS media query) */}
            <div className="table-container desktop-table-view">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle Number</th>
                    <th>Vehicle Type</th>
                    <th>Customer Name</th>
                    <th>Mobile Number</th>
                    <th>Entry Time</th>
                    <th>Duration</th>
                    <th>Current Due / Final Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => {
                    const isSimSelected = selectedSimVehicle?.id === vehicle.id;
                    const tokenId = vehicle.tokenId || vehicle.parkingId || `PK-${vehicle.id}`;
                    const entryFormatted = vehicle.entryTime
                      ? new Date(vehicle.entryTime).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A';
                    const dailyRate = vehicle.dailyRate ?? 20;

                    return (
                      <tr
                        key={vehicle.id}
                        style={{
                          background: isSimSelected
                            ? '#f0fdf4'
                            : vehicle.isOverOneDay
                            ? '#fffbeb'
                            : 'transparent',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <td>
                          <span className="plate-badge">{vehicle.vehicleNumber}</span>
                          <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>
                            {tokenId}
                          </div>
                          {vehicle.parkingSlot && (
                            <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: 600 }}>
                              Bay: {vehicle.parkingSlot}
                            </span>
                          )}
                        </td>

                        <td>
                          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                            {vehicle.vehicleType || 'Two-Wheeler'}
                          </span>
                        </td>

                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{vehicle.customerName || 'Customer'}</td>

                        <td>
                          <span style={{ color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>
                            {vehicle.mobileNumber || vehicle.customerPhone || vehicle.mobile || 'N/A'}
                          </span>
                        </td>

                        <td>
                          <div style={{ color: '#0f172a', fontSize: '12px', fontWeight: 600 }}>{entryFormatted}</div>
                          <div style={{ color: '#64748b', fontSize: '11px' }}>₹{dailyRate.toFixed(0)}/day</div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: vehicle.isOverOneDay ? '#b45309' : '#1e3a8a' }}>
                              {vehicle.calculatedDuration.text}
                            </span>
                            {/* OVERDUE BADGE */}
                            {vehicle.isOverOneDay && (
                              <span
                                style={{
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #fca5a5',
                                }}
                              >
                                {t('overOneDayBadge', 'OVER 1 DAY')}
                              </span>
                            )}
                          </div>
                          {vehicle.calculatedDuration.simDays > 0 && (
                            <span style={{ fontSize: '10px', color: '#d97706', display: 'block', fontWeight: 600 }}>
                              (+{vehicle.calculatedDuration.simDays}d sim)
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="mono" style={{ color: '#166534', fontSize: '16px', fontWeight: 900 }}>
                            ₹{vehicle.liveAmount.toFixed(0)}
                          </span>
                        </td>

                        <td>
                          <StatusBadge status={vehicle.status || vehicle.vehicleStatus || 'PARKED'} />
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setSelectedTicket(vehicle)}
                              title="View Digital Token Pass"
                              style={{ fontSize: '11px', padding: '5px 8px' }}
                            >
                              <FileText size={12} />
                              <span>View Token</span>
                            </button>

                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                if (onSelectVehicleForExit) {
                                  onSelectVehicleForExit(vehicle);
                                }
                                setCurrentPage('exit');
                              }}
                              title="Process Vehicle Exit & Settlement"
                              style={{ fontSize: '11px', padding: '5px 12px', fontWeight: 700, background: '#2563eb', color: '#ffffff', border: 'none' }}
                            >
                              <LogOut size={12} />
                              <span>Process Exit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. MOBILE VIEW: Responsive Touch-Friendly Cards (Auto-enabled for <768px) */}
            <div className="mobile-cards-view" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredVehicles.map((vehicle) => {
                const isSimSelected = selectedSimVehicle?.id === vehicle.id;
                const tokenId = vehicle.tokenId || vehicle.parkingId || `PK-${vehicle.id}`;
                const entryDate = vehicle.entryTime
                  ? new Date(vehicle.entryTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                  : 'N/A';
                const entryTime = vehicle.entryTime
                  ? new Date(vehicle.entryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : 'N/A';

                return (
                  <div
                    key={vehicle.id}
                    style={{
                      background: isSimSelected ? '#f0fdf4' : vehicle.isOverOneDay ? '#fffdf7' : '#ffffff',
                      borderRadius: '16px',
                      padding: '16px',
                      border: isSimSelected
                        ? '2px solid #22c55e'
                        : vehicle.isOverOneDay
                        ? '1.5px solid #fed7aa'
                        : '1px solid #e2e8f0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      borderLeft: vehicle.isOverOneDay ? '5px solid #ea580c' : '5px solid #2563eb',
                    }}
                  >
                    {/* Card Header: Plate Badge, Status & Overdue Tag */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <span className="plate-badge" style={{ fontSize: '14px', padding: '5px 12px' }}>
                        {vehicle.vehicleNumber}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {vehicle.isOverOneDay && (
                          <span
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fca5a5',
                            }}
                          >
                            {t('overOneDayBadge', 'OVER 1 DAY')}
                          </span>
                        )}
                        <StatusBadge status={vehicle.status || vehicle.vehicleStatus || 'PARKED'} />
                      </div>
                    </div>

                    {/* Card Body: Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', marginBottom: '14px' }}>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Customer Name</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{vehicle.customerName || 'N/A'}</span>
                      </div>

                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Mobile Number</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{vehicle.mobileNumber || 'N/A'}</span>
                      </div>

                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Token ID / Slot</span>
                        <span style={{ color: '#2563eb', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {tokenId}
                        </span>
                        {vehicle.parkingSlot && (
                          <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>
                            {vehicle.parkingSlot}
                          </span>
                        )}
                      </div>

                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Entry Time</span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{entryDate}, {entryTime}</span>
                      </div>

                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Parked Duration</span>
                        <span style={{ fontWeight: 800, color: vehicle.isOverOneDay ? '#c2410c' : '#1e3a8a', fontSize: '13px' }}>
                          {vehicle.calculatedDuration.text}
                        </span>
                        {vehicle.calculatedDuration.simDays > 0 && (
                          <span style={{ color: '#d97706', fontSize: '10px', display: 'block' }}>
                            (+{vehicle.calculatedDuration.simDays}d sim)
                          </span>
                        )}
                      </div>

                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Current Due</span>
                        <span style={{ color: '#15803d', fontWeight: 800, fontSize: '16px', fontFamily: 'var(--font-mono)' }}>
                          ₹{vehicle.liveAmount.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions (Large touch targets) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        className={`btn btn-sm ${isSimSelected ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setSelectedSimVehicle(isSimSelected ? null : vehicle)}
                        style={{ height: '38px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Sparkles size={13} />
                        <span>{isSimSelected ? 'Selected' : 'Simulate'}</span>
                      </button>

                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setSelectedTicket(vehicle)}
                        style={{ height: '38px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <FileText size={13} />
                        <span>View Token</span>
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (onSelectVehicleForExit) {
                            onSelectVehicleForExit(vehicle);
                          }
                          setCurrentPage('exit');
                        }}
                        style={{ height: '38px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <LogOut size={13} />
                        <span>Exit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Digital Ticket Modal */}
      {selectedTicket && (
        <DigitalTicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
