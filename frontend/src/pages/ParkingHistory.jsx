import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  FileText,
  RefreshCw,
  AlertCircle,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  IndianRupee,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import DigitalTicketModal from '../components/DigitalTicketModal';
import FinalReceiptModal from '../components/FinalReceiptModal';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function ParkingHistory() {
  const { t } = useLanguage();
  const [historyRecords, setHistoryRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'PARKED', 'EXITED'
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'YESTERDAY', '7DAYS', '30DAYS'
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.getParkingHistory();
      if (res && res.data) {
        setHistoryRecords(Array.isArray(res.data) ? res.data : []);
      } else {
        setHistoryRecords([]);
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setErrorMessage(err.message || 'Unable to load parking history records. Please check the server connection.');
    } finally {
      setLoading(false);
    }
  };

  // Safe Multi-Criteria Filtering
  const filteredRecords = historyRecords.filter((rec) => {
    // 1. Text Search
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const token = (rec.tokenId || rec.parkingId || '').toLowerCase();
      const vNum = (rec.vehicleNumber || '').toLowerCase();
      const cName = (rec.customerName || '').toLowerCase();
      const mobile = (rec.mobileNumber || '');

      const matchesSearch =
        token.includes(term) ||
        vNum.includes(term) ||
        cName.includes(term) ||
        mobile.includes(term);

      if (!matchesSearch) return false;
    }

    // 2. Status Filter
    const recStatus = rec.status || rec.vehicleStatus || 'PARKED';
    if (statusFilter !== 'ALL' && recStatus !== statusFilter) {
      return false;
    }

    // 3. Date Filter
    if (dateFilter !== 'ALL') {
      const now = new Date();
      const entryDate = new Date(rec.entryTime || rec.createdAt);
      const diffDays = (now - entryDate) / (1000 * 60 * 60 * 24);

      if (dateFilter === 'TODAY') {
        const todayStr = now.toISOString().slice(0, 10);
        if (!(rec.entryTime || '').startsWith(todayStr) && !(rec.exitTime || '').startsWith(todayStr)) {
          return false;
        }
      } else if (dateFilter === 'YESTERDAY') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yestStr = yesterday.toISOString().slice(0, 10);
        if (!(rec.entryTime || '').startsWith(yestStr) && !(rec.exitTime || '').startsWith(yestStr)) {
          return false;
        }
      } else if (dateFilter === '7DAYS' && diffDays > 7) {
        return false;
      } else if (dateFilter === '30DAYS' && diffDays > 30) {
        return false;
      }
    }

    return true;
  });

  const handleView = (rec) => {
    const isExited = (rec.status || rec.vehicleStatus) === 'EXITED';
    if (isExited) {
      setSelectedReceipt(rec);
    } else {
      setSelectedTicket(rec);
    }
  };

  // Summary Metrics
  const totalRecordsCount = historyRecords.length;
  const completedExitsCount = historyRecords.filter((r) => (r.status || r.vehicleStatus) === 'EXITED').length;
  const totalRevenue = historyRecords
    .filter((r) => (r.status || r.vehicleStatus) === 'EXITED')
    .reduce((sum, r) => sum + (r.totalAmount ?? r.finalAmount ?? r.currentAmount ?? 0), 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysRevenue = historyRecords
    .filter((r) => (r.status || r.vehicleStatus) === 'EXITED' && (r.exitTime || '').startsWith(todayStr))
    .reduce((sum, r) => sum + (r.totalAmount ?? r.finalAmount ?? 0), 0);

  return (
    <div className="content-area">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={24} color="#2563eb" />
            <span>Parking History</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Complete digital parking sessions and settlement records
          </p>
        </div>

        <button className="btn btn-outline btn-sm" onClick={loadHistory} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Records
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#312e81', marginTop: '6px' }}>
            {totalRecordsCount} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>sessions</span>
          </div>
          <div style={{ fontSize: '12px', color: '#6366f1', marginTop: '4px' }}>
            All historical entries
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Completed Exits
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#065f46', marginTop: '6px' }}>
            {completedExitsCount} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>settled</span>
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
            Successfully exited vehicles
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Revenue
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#064e3b', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            ₹{totalRevenue.toFixed(0)}
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
            Lifetime settled collections
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Today's Revenue
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            ₹{todaysRevenue.toFixed(0)}
          </div>
          <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
            Collected today
          </div>
        </div>
      </div>

      {/* History Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2>
              <span>Parking History Records</span>
            </h2>
            <p>Filtered view: {filteredRecords.length} records found</p>
          </div>

          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search plate, customer, mobile, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '260px', padding: '8px 14px 8px 38px', fontSize: '13px' }}
              />
            </div>

            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '130px', padding: '8px 10px', fontSize: '13px' }}
            >
              <option value="ALL">All Status</option>
              <option value="PARKED">Parked Only</option>
              <option value="EXITED">Exited Only</option>
            </select>

            <select
              className="form-control"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ width: '140px', padding: '8px 10px', fontSize: '13px' }}
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div style={{ margin: '16px 20px', background: '#fef2f2', border: '1.5px solid #fecaca', color: '#991b1b', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '13px' }}>{errorMessage}</span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={loadHistory} style={{ borderColor: '#fca5a5', color: '#991b1b' }}>
              Retry
            </button>
          </div>
        )}

        {/* History Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parking ID</th>
                <th>Vehicle Number</th>
                <th>Customer</th>
                <th>Entry Date & Time</th>
                <th>Exit Date & Time</th>
                <th>Duration</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div className="pulse-dot" style={{ margin: '0 auto 10px auto' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading parking history from database...</span>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', color: '#64748b' }}>
                        <History size={28} />
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                        No Records Found
                      </h3>
                      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        {searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL'
                          ? 'No parking records match the selected search criteria.'
                          : 'There are currently no parking history records in the database.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isExited = (rec.status || rec.vehicleStatus) === 'EXITED';
                  const tokenId = rec.tokenId || rec.parkingId || `PK-${rec.id}`;
                  const formattedEntry = rec.entryTime
                    ? new Date(rec.entryTime).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A';
                  const formattedExit = rec.exitTime
                    ? new Date(rec.exitTime).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '---';
                  const duration = rec.totalDurationDays ?? rec.parkingDurationDays ?? 1;
                  const amount = rec.totalAmount ?? rec.finalAmount ?? rec.currentAmount ?? 20;
                  const payStatus = rec.paymentStatus || (isExited ? 'PAID' : 'PENDING');
                  const recStatus = rec.status || rec.vehicleStatus || 'PARKED';

                  return (
                    <tr key={rec.id}>
                      <td>
                        <span
                          className="mono"
                          style={{ color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}
                          onClick={() => handleView(rec)}
                          title="Click to view digital details"
                        >
                          {tokenId}
                        </span>
                        {rec.parkingSlot && (
                          <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: 600 }}>
                            {rec.parkingSlot}
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="plate-badge">{rec.vehicleNumber}</span>
                      </td>

                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        <div>{rec.customerName || 'Customer'}</div>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>{rec.mobileNumber || ''}</span>
                      </td>

                      <td style={{ color: '#475569', fontSize: '12px' }}>{formattedEntry}</td>

                      <td style={{ color: isExited ? '#15803d' : '#94a3b8', fontSize: '12px', fontWeight: isExited ? 600 : 400 }}>
                        {formattedExit}
                      </td>

                      <td>
                        <span style={{ fontWeight: 700, color: '#1e3a8a' }}>
                          {duration} {duration === 1 ? 'Day' : 'Days'}
                        </span>
                      </td>

                      <td>
                        <span className="mono" style={{ color: isExited ? '#15803d' : '#2563eb', fontWeight: 800, fontSize: '15px' }}>
                          ₹{amount.toFixed(0)}
                        </span>
                      </td>

                      <td>
                        <StatusBadge status={payStatus} type="payment" />
                      </td>

                      <td>
                        <StatusBadge status={recStatus} />
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleView(rec)}
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          title={isExited ? 'View Final Digital Receipt' : 'View Digital Token'}
                        >
                          <FileText size={12} />
                          <span>{isExited ? 'Receipt' : 'Token'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digital Modals (Strictly Digital, Zero Paper/Print) */}
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
