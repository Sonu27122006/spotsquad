import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  Bike,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  ExternalLink,
  MapPin,
  CreditCard,
  Timer
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function Notifications({ onNotificationUpdated }) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      if (res && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      if (onNotificationUpdated) onNotificationUpdated();
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onNotificationUpdated) onNotificationUpdated();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const diffMs = new Date() - new Date(dateStr);
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}d ago`;
    } catch (e) {
      return '';
    }
  };

  const getCategoryInfo = (notif) => {
    const text = (notif.title + ' ' + (notif.message || '')).toLowerCase();
    if (text.includes('duration') || text.includes('long_stay') || text.includes('24h')) {
      return {
        label: 'Parking Duration Update',
        bg: '#fffbeb',
        color: '#b45309',
        border: '#fde68a',
        icon: <Timer size={18} color="#d97706" />,
      };
    }
    if (text.includes('exit') || text.includes('settled')) {
      return {
        label: 'Vehicle Exit',
        bg: '#f0fdf4',
        color: '#15803d',
        border: '#bbf7d0',
        icon: <CheckCircle2 size={18} color="#16a34a" />,
      };
    }
    if (text.includes('payment') || text.includes('paid')) {
      return {
        label: 'Payment Update',
        bg: '#faf5ff',
        color: '#7e22ce',
        border: '#e9d5ff',
        icon: <CreditCard size={18} color="#9333ea" />,
      };
    }
    return {
      label: 'Parking Registration',
      bg: '#eff6ff',
      color: '#1d4ed8',
      border: '#bfdbfe',
      icon: <Bike size={18} color="#2563eb" />,
    };
  };

  const extractTokenId = (notif) => {
    const match = (notif.message || '').match(/PK\d{10,14}/i) || (notif.title || '').match(/PK\d{10,14}/i);
    return match ? match[0] : null;
  };

  const extractVehiclePlate = (notif) => {
    const match = (notif.message || '').match(/Vehicle:\s*([A-Z0-9 ]+)/i) || 
                  (notif.title || '').match(/([A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,2}\s*\d{4})/i);
    return match ? match[1].trim() : null;
  };

  const extractBay = (notif) => {
    const match = (notif.message || '').match(/Parking Bay:\s*([A-Z0-9-]+)/i) || 
                  (notif.message || '').match(/Slot\s*([A-Z0-9-]+)/i);
    return match ? match[1].trim() : null;
  };

  return (
    <div className="content-area">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={22} color="#2563eb" />
            <span>{t('notificationFeed')}</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            {t('notificationFeedSub')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={loadNotifications}>
            <RefreshCw size={14} />
            <span>{t('refresh')}</span>
          </button>

          <button className="btn btn-primary btn-sm" onClick={handleMarkAllRead}>
            <CheckCheck size={14} />
            <span>{t('markAllRead')}</span>
          </button>
        </div>
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
            <Bell size={40} color="#cbd5e1" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              {loading ? t('searchingDatabase') : t('noNotifications')}
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              All parking events, vehicle check-ins, and duration alerts will appear here in real time.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {notifications.map((notif) => {
              const formattedDate = new Date(notif.createdAt).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              const relativeTime = getRelativeTime(notif.createdAt);
              const category = getCategoryInfo(notif);
              const tokenId = extractTokenId(notif);
              const vehiclePlate = extractVehiclePlate(notif);
              const bay = extractBay(notif);

              return (
                <div
                  key={notif.id}
                  style={{
                    background: notif.isRead ? '#ffffff' : '#f8fafc',
                    border: `1.5px solid ${notif.isRead ? '#e2e8f0' : '#bfdbfe'}`,
                    borderLeft: `4px solid ${notif.isRead ? '#cbd5e1' : '#2563eb'}`,
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: notif.isRead ? 'none' : '0 2px 6px rgba(37,99,235,0.06)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Card Header with Badges and Timestamp */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          background: category.bg,
                          color: category.color,
                          border: `1px solid ${category.border}`,
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {category.label}
                      </span>

                      {vehiclePlate && (
                        <span className="plate-badge" style={{ fontSize: '11px', padding: '2px 8px' }}>
                          {vehiclePlate}
                        </span>
                      )}

                      {bay && (
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <MapPin size={11} color="#2563eb" />
                          <span>Bay {bay}</span>
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        {relativeTime || formattedDate}
                      </span>
                      {!notif.isRead && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#2563eb',
                            display: 'inline-block',
                          }}
                          title="Unread"
                        />
                      )}
                    </div>
                  </div>

                  {/* Card Message Body */}
                  <div style={{ whiteSpace: 'pre-line', fontSize: '13px', color: '#334155', lineHeight: '1.5', background: notif.isRead ? '#f8fafc' : '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    {notif.message}
                  </div>

                  {/* Card Actions Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {formattedDate} {tokenId ? `• Token: ${tokenId}` : ''}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {tokenId && (
                        <a
                          href={`/pass/${tokenId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{
                            fontSize: '11px',
                            padding: '5px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: '#2563eb',
                            borderColor: '#bfdbfe',
                            textDecoration: 'none',
                            fontWeight: 700,
                          }}
                        >
                          <ExternalLink size={12} />
                          <span>View Digital Pass</span>
                        </a>
                      )}

                      {!notif.isRead && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleMarkRead(notif.id)}
                          style={{ fontSize: '11px', padding: '5px 10px' }}
                        >
                          {t('markRead')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
