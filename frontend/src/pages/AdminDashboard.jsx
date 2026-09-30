import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Building2,
  Car,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Check,
  Ban,
  UserCheck,
  MapPin,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminDashboard({ user }) {
  const [adminData, setAdminData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'locations' | 'bookings'
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [dashRes, usersRes, lotsRes, bookingsRes] = await Promise.all([
        api.getAdminDashboard(),
        api.getUsers(),
        api.getParkingLots(),
        api.getBookings(),
      ]);

      if (dashRes && dashRes.data) setAdminData(dashRes.data);
      if (usersRes && usersRes.data) setUsersList(usersRes.data);
      if (lotsRes && lotsRes.data) setAllLocations(lotsRes.data);
      if (bookingsRes && bookingsRes.data) setAllBookings(bookingsRes.data);
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (targetUser) => {
    const newStatus = targetUser.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    setActionLoadingId(targetUser._id);
    try {
      const res = await api.updateUser(targetUser._id, { status: newStatus });
      if (res && res.success) {
        setUsersList((prev) =>
          prev.map((u) => (u._id === targetUser._id ? { ...u, status: newStatus } : u))
        );
        setFeedbackMsg(`✓ User status updated to ${newStatus}`);
      }
    } catch (err) {
      alert('Failed to update user status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    setActionLoadingId(targetUserId);
    try {
      const res = await api.updateUser(targetUserId, { role: newRole });
      if (res && res.success) {
        setUsersList((prev) =>
          prev.map((u) => (u._id === targetUserId ? { ...u, role: newRole } : u))
        );
        setFeedbackMsg(`✓ User role updated to ${newRole}`);
      }
    } catch (err) {
      alert('Failed to update role.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteLocation = async (lotId) => {
    if (!window.confirm('Are you sure you want to permanently delete this parking location and all its slots?')) return;
    try {
      const res = await api.deleteParking(lotId);
      if (res && res.success) {
        setAllLocations((prev) => prev.filter((l) => l._id !== lotId));
        setFeedbackMsg('✓ Parking location deleted.');
      }
    } catch (err) {
      alert(err.message || 'Failed to delete parking location.');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading && !adminData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 16px auto' }}></div>
        <p style={{ fontWeight: 600 }}>Loading Platform Administration...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Admin Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
          borderRadius: '24px',
          padding: '24px 28px',
          color: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(124,58,237,0.3)',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
            CENTRAL SYSTEM CONTROL
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', marginTop: '2px', color: '#ffffff' }}>
            Administrator Dashboard
          </h2>
          <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
            Manage platform users, parking networks, bookings, and financial settlements
          </p>
        </div>

        <button
          className="btn btn-outline"
          onClick={loadAdminData}
          style={{
            color: '#ffffff',
            borderColor: 'rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <RefreshCw size={14} />
          <span>Refresh All</span>
        </button>
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

      {/* Overview Stat Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{adminData?.totalUsers || 0}</div>
          <div className="stat-subtext">
            {adminData?.totalCommuters || 0} commuters • {adminData?.totalOwners || 0} owners
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Parking Lots</div>
          <div className="stat-value">{adminData?.totalParkingLots || 0}</div>
          <div className="stat-subtext">Across {allLocations.length} locations</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Platform Slots</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {adminData?.totalSlots || 0}
          </div>
          <div className="stat-subtext">Total parking bays</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Parking</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {adminData?.activeBookings || 0}
          </div>
          <div className="stat-subtext">Vehicles currently parked</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Confirmed Upcoming</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {adminData?.confirmedBookings || 0}
          </div>
          <div className="stat-subtext">Reserved for future times</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Platform Volume</div>
          <div className="stat-value font-mono" style={{ color: '#047857' }}>
            ₹{adminData?.totalRevenue || 0}
          </div>
          <div className="stat-subtext">Total gross collections</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '8px',
        }}
      >
        {[
          { key: 'overview', label: 'Recent Platform Activity' },
          { key: 'users', label: `Users & Roles (${usersList.length})` },
          { key: 'locations', label: `Parking Lots (${allLocations.length})` },
          { key: 'bookings', label: `All Bookings (${allBookings.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === tab.key ? '#7c3aed' : '#f1f5f9',
              color: activeTab === tab.key ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: RECENT PLATFORM ACTIVITY */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Recent Bookings */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
              Latest Platform Bookings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(adminData?.recentBookings || []).slice(0, 6).map((b) => (
                <div
                  key={b._id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#1e3a8a', fontFamily: 'monospace', fontSize: '13px' }}>
                      {b.bookingId}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {b.parkingLotId?.name || 'Lot'} • {b.vehicleNumber}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#047857', fontFamily: 'monospace' }}>
                      ₹{b.amount}
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: b.bookingStatus === 'COMPLETED' ? '#ecfdf5' : '#eff6ff',
                        color: b.bookingStatus === 'COMPLETED' ? '#047857' : '#1d4ed8',
                      }}
                    >
                      {b.bookingStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Newest Registered Users */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
              Newest Registered Users
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(adminData?.recentUsers || []).slice(0, 6).map((u) => (
                <div
                  key={u._id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{u.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{u.email}</div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: u.role === 'ADMIN' ? '#f3e8ff' : u.role === 'OWNER' ? '#ecfdf5' : '#eff6ff',
                      color: u.role === 'ADMIN' ? '#7c3aed' : u.role === 'OWNER' ? '#047857' : '#1d4ed8',
                    }}
                  >
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ width: '160px' }}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="ALL">All Roles</option>
                <option value="COMMUTER">Commuters</option>
                <option value="OWNER">Lot Owners</option>
                <option value="ADMIN">Administrators</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        disabled={actionLoadingId === u._id}
                        style={{ padding: '4px 6px', borderRadius: '6px', fontSize: '12px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                      >
                        <option value="COMMUTER">COMMUTER</option>
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td>
                      <span
                        style={{
                          background: u.status === 'BLOCKED' ? '#fef2f2' : '#ecfdf5',
                          color: u.status === 'BLOCKED' ? '#b91c1c' : '#047857',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {u.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <button
                        className="btn btn-outline"
                        onClick={() => handleToggleUserStatus(u)}
                        disabled={actionLoadingId === u._id}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        {u.status === 'BLOCKED' ? 'Unblock' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ALL PARKING LOCATIONS */}
      {activeTab === 'locations' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
            All System Parking Locations
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Location Name</th>
                  <th>Owner</th>
                  <th>City</th>
                  <th>Capacity</th>
                  <th>Available</th>
                  <th>Rates</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {allLocations.map((lot) => (
                  <tr key={lot._id}>
                    <td>
                      <strong>{lot.name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{lot.address}</div>
                    </td>
                    <td>{lot.ownerId?.name || 'Owner'}</td>
                    <td>{lot.city}</td>
                    <td>{lot.totalSlots} bays</td>
                    <td style={{ color: '#16a34a', fontWeight: 700 }}>{lot.availableSlots} free</td>
                    <td className="font-mono">₹{lot.pricePerHour}/hr • ₹{lot.pricePerDay}/day</td>
                    <td>
                      <button
                        className="btn btn-outline"
                        onClick={() => handleDeleteLocation(lot._id)}
                        style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444', borderColor: '#fca5a5' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ALL BOOKINGS */}
      {activeTab === 'bookings' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
            System-Wide Bookings & Reservations
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Commuter</th>
                  <th>Parking Lot</th>
                  <th>Slot</th>
                  <th>Vehicle</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allBookings.map((b) => (
                  <tr key={b._id}>
                    <td className="font-mono" style={{ fontWeight: 700, color: '#1e3a8a' }}>
                      {b.bookingId}
                    </td>
                    <td>{b.userId?.name || b.customerName || 'Commuter'}</td>
                    <td>{b.parkingLotId?.name || 'Lot'}</td>
                    <td style={{ fontWeight: 800, color: '#2563eb' }}>{b.slotId?.slotNumber || 'Slot'}</td>
                    <td className="font-mono">{b.vehicleNumber}</td>
                    <td className="font-mono" style={{ fontWeight: 700 }}>₹{b.amount}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: b.paymentStatus === 'PAID' ? '#ecfdf5' : '#fef2f2',
                          color: b.paymentStatus === 'PAID' ? '#047857' : '#b91c1c',
                        }}
                      >
                        {b.paymentStatus}
                      </span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
