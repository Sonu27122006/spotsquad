import React from 'react';
import { Bell, Sparkles, Clock } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../context/LanguageContext';

export default function Topbar({ title, subtitle, unreadCount, onNotificationClick, parkingName }) {
  const { t } = useLanguage();
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">
          <h1>{title}</h1>
          <p>{subtitle || parkingName || t('appTitle')}</p>
        </div>
      </div>

      <div className="topbar-right">
        <LanguageSelector />

        <div className="demo-mode-pill">
          <Sparkles size={14} />
          <span>{t('demoModeActive')}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
          <Clock size={15} color="#3b82f6" />
          <span>{currentDate}, {currentTime}</span>
        </div>

        <button
          className="notif-bell-btn"
          onClick={onNotificationClick}
          title={t('notifications')}
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
        </button>
      </div>
    </header>
  );
}
