import React, { useState, useEffect } from 'react';
import {
  Award,
  TrendingUp,
  Clock,
  IndianRupee,
  Users,
  Calendar,
  Medal,
  RefreshCw,
  Phone
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function Leaderboard() {
  const { t } = useLanguage();
  const [type, setType] = useState('visits'); // 'visits', 'revenue', 'duration'
  const [filter, setFilter] = useState('all_time'); // 'today', 'this_week', 'this_month', 'all_time'
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [type, filter]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.getLeaderboard(type, filter);
      if (res && res.data) {
        setLeaderboardData(res.data);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#fef08a', color: '#854d0e', fontWeight: 800, fontSize: '14px', border: '1.5px solid #facc15' }}>
          🥇 1
        </span>
      );
    } else if (rank === 2) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', color: '#334155', fontWeight: 800, fontSize: '14px', border: '1.5px solid #cbd5e1' }}>
          🥈 2
        </span>
      );
    } else if (rank === 3) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#ffedd5', color: '#9a3412', fontWeight: 800, fontSize: '14px', border: '1.5px solid #fdba74' }}>
          🥉 3
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', fontWeight: 700, fontSize: '12px' }}>
        #{rank}
      </span>
    );
  };

  return (
    <div className="content-area">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={22} color="#2563eb" />
            <span>{t('leaderboardTitle')}</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            {t('leaderboardSub')}
          </p>
        </div>

        <button className="btn btn-outline btn-sm" onClick={loadLeaderboard}>
          <RefreshCw size={14} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* Metric Categories & Time Range Filter */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Leaderboard View Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${type === 'visits' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setType('visits')}
            >
              <Users size={14} />
              <span>{t('mostFrequent')}</span>
            </button>

            <button
              className={`btn btn-sm ${type === 'revenue' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setType('revenue')}
            >
              <IndianRupee size={14} />
              <span>{t('highestRevenue')}</span>
            </button>

            <button
              className={`btn btn-sm ${type === 'duration' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setType('duration')}
            >
              <Clock size={14} />
              <span>{t('longestDuration')}</span>
            </button>
          </div>

          {/* Time Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            {[
              { id: 'today', label: t('filterToday') },
              { id: 'this_week', label: t('filterWeek') },
              { id: 'this_month', label: t('filterMonth') },
              { id: 'all_time', label: t('filterAllTime') },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                style={{
                  border: 'none',
                  background: filter === f.id ? '#ffffff' : 'transparent',
                  color: filter === f.id ? '#1e3a8a' : '#64748b',
                  fontWeight: filter === f.id ? 700 : 500,
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: filter === f.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2>
              <Medal size={18} color="#f59e0b" />
              <span>
                {type === 'visits' && t('mostFrequent')}
                {type === 'revenue' && t('highestRevenue')}
                {type === 'duration' && t('longestDuration')}
              </span>
            </h2>
            <p>Calculated live from real MySQL visit and billing records.</p>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>{t('rank')}</th>
                <th>{t('customer')}</th>
                <th>{t('mobileNumber')}</th>
                <th>{t('totalVisits')}</th>
                <th>{t('totalDurationHours')}</th>
                <th style={{ textAlign: 'right' }}>{t('totalSpent')}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    {loading ? t('searchingDatabase') : t('noLeaderboardData')}
                  </td>
                </tr>
              ) : (
                leaderboardData.map((cust) => (
                  <tr
                    key={cust.customerId}
                    style={{
                      background: cust.rank === 1 ? '#fefce8' : cust.rank <= 3 ? '#fafaf9' : 'transparent',
                    }}
                  >
                    <td>{getRankBadge(cust.rank)}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                        {cust.customerName}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} /> {cust.mobileNumber}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '14px' }}>
                        {cust.totalVisits} visits
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#475569', fontWeight: 600 }}>
                        {cust.totalHours.toFixed(0)} hrs ({(cust.totalHours / 24).toFixed(1)} days)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ color: '#15803d', fontWeight: 800, fontSize: '16px' }}>
                        ₹{cust.totalAmountSpent.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
