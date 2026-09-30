import React from 'react';
import {
  LayoutDashboard,
  Search,
  Car,
  PlusCircle,
  LogOut as ExitIcon,
  History,
  Award,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  Building2,
  MapPin,
  CalendarCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar({
  currentPage,
  setCurrentPage,
  unreadCount,
  user,
  onLogout,
}) {
  const { t } = useLanguage();
  const role = user?.role || 'COMMUTER';

  // Role-specific navigation items
  let navItems = [];

  if (role === 'COMMUTER') {
    navItems = [
      { id: 'search', label: 'Search Parking', icon: MapPin },
      { id: 'search-vehicle', label: 'Vehicle Search', icon: Search },
      { id: 'dashboard', label: 'My Bookings', icon: CalendarCheck },
      { id: 'history', label: 'Booking History', icon: History },
      { id: 'notifications', label: t('notifications') || 'Notifications', icon: Bell, badge: unreadCount },
    ];
  } else if (role === 'OWNER') {
    navItems = [
      { id: 'dashboard', label: 'Owner Dashboard', icon: LayoutDashboard },
      { id: 'search', label: 'All Locations', icon: MapPin },
      { id: 'search-vehicle', label: 'Vehicle Search', icon: Search },
      { id: 'active', label: 'Active Occupancy', icon: Car },
      { id: 'new-entry', label: 'Manual Entry', icon: PlusCircle },
      { id: 'exit', label: 'Vehicle Exit', icon: ExitIcon },
      { id: 'history', label: 'History & Logs', icon: History },
      { id: 'notifications', label: t('notifications') || 'Notifications', icon: Bell, badge: unreadCount },
    ];
  } else {
    // ADMIN
    navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'new-entry', label: 'New Vehicle Entry', icon: PlusCircle },
      { id: 'active', label: 'Active Parking', icon: Car },
      { id: 'search-vehicle', label: 'Search & Recovery', icon: Search },
      { id: 'exit', label: 'Vehicle Exit', icon: ExitIcon },
      { id: 'leaderboard', label: 'Customer Leaderboard', icon: Award },
      { id: 'history', label: 'Parking History', icon: History },
      { id: 'notifications', label: 'Notifications & Alerts', icon: Bell, badge: unreadCount },
      { id: 'settings', label: 'Admin Settings', icon: SettingsIcon },
    ];
  }

  const getRoleBadgeColor = () => {
    if (role === 'ADMIN') return '#7c3aed';
    if (role === 'OWNER') return '#059669';
    return '#2563eb';
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div
          className="sidebar-logo-icon"
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            fontSize: '20px',
            fontWeight: 900,
          }}
        >
          P
        </div>
        <div className="sidebar-brand">
          <h2>ParkingSpot</h2>
          <span>Smart Parking Platform</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer with Role Tag & Logout */}
      <div className="sidebar-footer">
        <div className="user-profile-card">
          <div className="user-avatar" style={{ background: getRoleBadgeColor(), color: '#ffffff' }}>
            {role === 'ADMIN' ? <ShieldCheck size={18} /> : role === 'OWNER' ? <Building2 size={18} /> : <Car size={18} />}
          </div>
          <div className="user-info">
            <h4 style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
              {user?.name || 'User'}
            </h4>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: getRoleBadgeColor(),
                background: 'rgba(255,255,255,0.08)',
                padding: '2px 6px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
              }}
            >
              {role}
            </span>
          </div>
        </div>

        <button className="nav-item" onClick={onLogout} style={{ color: '#f87171' }}>
          <LogOut size={18} />
          <span>{t('logout') || 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  );
}
