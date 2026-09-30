import React, { useState, useEffect } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock,
  IndianRupee,
  AlertCircle,
  PlusCircle,
  Search,
  TrendingUp,
  Award
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DigitalTicketModal from '../components/DigitalTicketModal';
import FinalReceiptModal from '../components/FinalReceiptModal';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard({ setCurrentPage, onSelectVehicleForExit }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalVehicles: 0,
    currentlyParked: 0,
    exitedVehicles: 0,
    todayEntries: 0,
    todayExits: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.getStats(),
        api.getRecentActivity(),
      ]);
      if (statsRes && statsRes.data) setStats(statsRes.data);
      if (activityRes && activityRes.data) setRecentActivity(activityRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivity = recentActivity.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (item.vehicleNumber && item.vehicleNumber.toLowerCase().includes(term)) ||
      (item.customerName && item.customerName.toLowerCase().includes(term)) ||
      (item.tokenId && item.tokenId.toLowerCase().includes(term)) ||
      (item.mobileNumber && item.mobileNumber.includes(term));

    const matchesStatus =
      statusFilter === 'ALL' || item.status === statusFilter || item.vehicleStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewRecord = (record) => {
    if (record.status === 'EXITED' || record.vehicleStatus === 'EXITED') {
      setSelectedReceipt(record);
    } else {
      setSelectedTicket(record);
    }
  };

  return (
    <div className="content-area">
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: 'white',
          borderRadius: '16px',
          padding: '24px 28px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800 }}>
            {t('heroTitle')}
          </h2>
          <p style={{ color: '#bfdbfe', fontSize: '13px', marginTop: '4px' }}>
            {t('heroSub')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => setCurrentPage('new-entry')}
            style={{ background: '#ffffff', color: '#1e3a8a', fontWeight: 700 }}
          >
            <PlusCircle size={16} />
            <span>{t('newEntry')}</span>
          </button>

          <button
            className="btn btn-outline"
            onClick={() => setCurrentPage('leaderboard')}
            style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
          >
            <Award size={16} />
            <span>{t('leaderboard')}</span>
          </button>

          <button
            className="btn btn-outline"
            onClick={() => setCurrentPage('search')}
            style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
          >
            <Search size={16} />
            <span>{t('findVehicle')}</span>
          </button>
        </div>
      </div>

      {/* Clean Numerical Stat Cards (No charts/lines on Total Vehicles) */}
      <div className="stats-grid">
        <StatCard
          title={t('totalVehicles')}
          value={stats.totalVehicles}
          subtext={t('totalVehiclesSub')}
          icon={Bike}
          color="blue"
        />
        <StatCard
          title={t('currentlyParked')}
          value={stats.currentlyParked}
          subtext={t('currentlyParkedSub')}
          icon={Clock}
          color="indigo"
        />
        <StatCard
          title={t('todaysEntries')}
          value={stats.todayEntries}
          subtext={t('todaysEntriesSub')}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title={t('todaysExits')}
          value={stats.todayExits}
          subtext={t('todaysExitsSub')}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title={t('todaysRevenue')}
          value={`₹${stats.todayRevenue.toFixed(0)}`}
          subtext={t('todaysRevenueSub')}
          icon={IndianRupee}
          color="green"
        />
        <StatCard
          title={t('pendingPayments')}
          value={`₹${stats.pendingPayments.toFixed(0)}`}
          subtext={t('pendingPaymentsSub')}
          icon={AlertCircle}
          color="amber"
        />
      </div>

      {/* Recent Activity Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2>
              <Clock size={18} color="#2563eb" />
              <span>{t('recentActivity')}</span>
            </h2>
            <p>{t('recentActivitySub')}</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '220px', padding: '7px 12px 7px 36px', fontSize: '13px' }}
              />
            </div>

            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '160px', padding: '7px 10px', fontSize: '13px' }}
            >
              <option value="ALL">{t('allStatus')}</option>
              <option value="PARKED">{t('parkedOnly')}</option>
              <option value="EXITED">{t('exitedOnly')}</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>VEHICLE NUMBER</th>
                <th>VEHICLE TYPE</th>
                <th>CUSTOMER NAME</th>
                <th>ENTRY TIME</th>
                <th>DURATION</th>
                <th>CURRENT DUE / FINAL AMOUNT</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivity.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    {loading ? t('searchingDatabase') : t('noRecordsMatch')}
                  </td>
                </tr>
              ) : (
                filteredActivity.map((record) => {
                  const isExited = record.status === 'EXITED' || record.vehicleStatus === 'EXITED';
                  const amount = isExited ? (record.finalAmount || record.totalAmount || 0) : (record.currentAmount || record.totalAmount || 0);

                  const renderPlate = (num) => {
                    if (!num) return 'N/A';
                    const parts = num.trim().split(/\s+/);
                    if (parts.length >= 3) {
                      const line1 = parts.slice(0, -1).join(' ');
                      const line2 = parts.slice(-1)[0];
                      return (
                        <div
                          style={{
                            background: '#f1f5f9',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '13px',
                            color: '#1e293b',
                            display: 'inline-flex',
                            flexDirection: 'column',
                            lineHeight: 1.2,
                            letterSpacing: '0.8px',
                          }}
                        >
                          <span>{line1}</span>
                          <span>{line2}</span>
                        </div>
                      );
                    }
                    return <span className="plate-badge">{num}</span>;
                  };

                  const renderEntryTime = (time) => {
                    if (!time) return 'N/A';
                    const d = new Date(time);
                    const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
                    return (
                      <div style={{ fontSize: '13px', lineHeight: 1.3 }}>
                        <div style={{ color: '#0f172a', fontWeight: 600 }}>{dateStr},</div>
                        <div style={{ color: '#64748b' }}>{timeStr}</div>
                      </div>
                    );
                  };

                  return (
                    <tr key={record.id || record.parkingId || record.bookingId}>
                      <td>
                        {renderPlate(record.vehicleNumber)}
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                          {record.vehicleType || 'Two-Wheeler'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                        {record.customerName || 'Customer'}
                      </td>
                      <td>
                        {renderEntryTime(record.entryTime || record.startTime)}
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                          {record.totalDurationDays || record.parkingDurationDays || 1} Days
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ color: '#2563eb', fontWeight: 800, fontSize: '14px' }}>
                          ₹{amount.toFixed(0)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={record.status || record.vehicleStatus || (isExited ? 'EXITED' : 'PARKED')} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="btn btn-outline"
                            onClick={() => handleViewRecord(record)}
                            title="View Digital Token Pass"
                            style={{
                              fontSize: '12px',
                              padding: '6px 12px',
                              fontWeight: 700,
                              borderRadius: '8px',
                              border: '1.5px solid #cbd5e1',
                              color: '#1e293b',
                            }}
                          >
                            {isExited ? 'View Receipt' : 'View Token'}
                          </button>

                          {!isExited && (
                            <button
                              className="btn"
                              onClick={() => {
                                if (onSelectVehicleForExit) {
                                  onSelectVehicleForExit(record);
                                }
                                setCurrentPage('exit');
                              }}
                              style={{
                                fontSize: '12px',
                                padding: '6px 14px',
                                fontWeight: 700,
                                borderRadius: '8px',
                                background: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                              }}
                            >
                              Process Exit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedTicket && (
        <DigitalTicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      {selectedReceipt && (
        <FinalReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
