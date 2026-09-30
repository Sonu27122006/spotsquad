import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Login from './pages/Login';
import CommuterDashboard from './pages/CommuterDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import SearchParking from './pages/SearchParking';
import ActiveVehicles from './pages/ActiveVehicles';
import NewParkingEntry from './pages/NewParkingEntry';
import VehicleExit from './pages/VehicleExit';
import ParkingHistory from './pages/ParkingHistory';
import Leaderboard from './pages/Leaderboard';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import SearchVehicle from './pages/SearchVehicle';
import DigitalParkingPass from './pages/DigitalParkingPass';
import { api } from './services/api';
import { useLanguage } from './context/LanguageContext';

export default function App() {
  const { t } = useLanguage();
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('smart_parking_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Check if opened with a public pass URL (/pass/:parkingId, ?token=..., or #pass/...)
  const getPassIdentifier = () => {
    const pathname = window.location.pathname || '';
    if (pathname.startsWith('/pass/')) {
      const id = pathname.substring('/pass/'.length).split('/')[0].trim();
      if (id) return id;
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token')) return urlParams.get('token');
    if (urlParams.get('pass')) return urlParams.get('pass');
    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    if (hash.startsWith('pass/')) return hash.replace('pass/', '').trim();
    if (hash.startsWith('token=')) return hash.replace('token=', '').trim();
    if (hash.startsWith('PK')) return hash.trim();
    return null;
  };

  const publicPassId = getPassIdentifier();
  const [viewingPassId, setViewingPassId] = useState(null);

  // Set default starting page based on role
  const [currentPage, setCurrentPage] = useState(() => {
    const savedUser = localStorage.getItem('smart_parking_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.role === 'COMMUTER') return 'search';
      } catch (e) {}
    }
    return 'dashboard';
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedVehicleForExit, setSelectedVehicleForExit] = useState(null);
  const [settings, setSettings] = useState({ parkingName: 'ParkingSpot – Smart Parking Reservation' });

  useEffect(() => {
    if (user) {
      loadNotificationCount();
      loadSettings();
      const interval = setInterval(loadNotificationCount, 20000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotificationCount = async () => {
    try {
      const res = await api.getNotifications();
      if (res && res.data) {
        const unread = res.data.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications count:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res && res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    localStorage.setItem('smart_parking_user', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('smart_parking_token', token);
    }
    // Direct commuters to search parking, owners/admins to dashboard
    if (userData.role === 'COMMUTER') {
      setCurrentPage('search');
    } else {
      setCurrentPage('dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('smart_parking_user');
    localStorage.removeItem('smart_parking_token');
  };

  // If customer or user opened digital pass link (/pass/:id)
  if (publicPassId) {
    return (
      <DigitalParkingPass
        parkingId={publicPassId}
        onBackToApp={() => {
          window.history.pushState({}, '', '/');
          window.location.href = '/';
        }}
      />
    );
  }

  // If viewing pass modal/screen from within the application
  if (viewingPassId) {
    return (
      <DigitalParkingPass
        parkingId={viewingPassId}
        onBackToApp={() => setViewingPassId(null)}
      />
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const role = user.role || 'COMMUTER';

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return role === 'COMMUTER'
          ? 'My Bookings & Reservations'
          : role === 'OWNER'
          ? 'Owner Operations & Revenue'
          : 'Central Platform Administration';
      case 'search':
        return 'Search & Reserve Parking';
      case 'search-vehicle':
        return 'Search Vehicle & Parking Pass';
      case 'new-entry':
        return 'New Parking Entry';
      case 'active':
        return 'Live Active Parking';
      case 'exit':
        return 'Vehicle Exit Processing';
      case 'leaderboard':
        return 'Frequent Parker Leaderboard';
      case 'history':
        return 'Parking & Booking History';
      case 'notifications':
        return 'System Notifications & Alerts';
      case 'settings':
        return 'Platform Settings';
      default:
        return 'ParkingSpot Hub';
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        unreadCount={unreadCount}
        user={user}
        onLogout={handleLogout}
      />

      <div className="main-wrapper">
        <Topbar
          title={getPageTitle()}
          parkingName={settings.parkingName}
          unreadCount={unreadCount}
          onNotificationClick={() => setCurrentPage('notifications')}
        />

        <main className="page-content">
          {/* DASHBOARD PAGE (ROLE-AWARE) */}
          {currentPage === 'dashboard' && (
            <>
              {role === 'COMMUTER' && (
                <CommuterDashboard
                  user={user}
                  setCurrentPage={setCurrentPage}
                  onViewPass={(id) => setViewingPassId(id)}
                />
              )}
              {role === 'OWNER' && <OwnerDashboard user={user} />}
              {role === 'ADMIN' && (
                <Dashboard
                  setCurrentPage={setCurrentPage}
                  onSelectVehicleForExit={(v) => {
                    setSelectedVehicleForExit(v);
                    setCurrentPage('exit');
                  }}
                  onViewPass={(id) => setViewingPassId(id)}
                />
              )}
            </>
          )}

          {/* SEARCH & MAP PAGE */}
          {currentPage === 'search' && (
            <SearchParking
              user={user}
              onSelectPass={(passId) => setViewingPassId(passId)}
            />
          )}

          {/* SEARCH VEHICLE & UNIVERSAL LOOKUP */}
          {currentPage === 'search-vehicle' && (
            <SearchVehicle
              setCurrentPage={setCurrentPage}
              onSelectVehicleForExit={(v) => {
                setSelectedVehicleForExit(v);
                setCurrentPage('exit');
              }}
              onViewPass={(passId) => setViewingPassId(passId)}
            />
          )}

          {/* ACTIVE VEHICLES */}
          {currentPage === 'active' && (
            <ActiveVehicles
              setCurrentPage={setCurrentPage}
              onSelectVehicleForExit={(v) => {
                setSelectedVehicleForExit(v);
                setCurrentPage('exit');
              }}
            />
          )}

          {/* NEW PARKING ENTRY (OPERATOR QUICK ENTRY) */}
          {currentPage === 'new-entry' && (
            <NewParkingEntry setCurrentPage={setCurrentPage} />
          )}

          {/* VEHICLE EXIT */}
          {currentPage === 'exit' && (
            <VehicleExit
              selectedVehicle={selectedVehicleForExit}
              onExitSuccess={() => {
                setSelectedVehicleForExit(null);
                loadNotificationCount();
              }}
            />
          )}

          {/* LEADERBOARD */}
          {currentPage === 'leaderboard' && <Leaderboard />}

          {/* HISTORY */}
          {currentPage === 'history' && (
            <>
              {role === 'COMMUTER' ? (
                <CommuterDashboard
                  user={user}
                  setCurrentPage={setCurrentPage}
                  onViewPass={(id) => setViewingPassId(id)}
                />
              ) : (
                <ParkingHistory />
              )}
            </>
          )}

          {/* NOTIFICATIONS */}
          {currentPage === 'notifications' && (
            <Notifications onNotificationUpdated={loadNotificationCount} />
          )}

          {/* SETTINGS */}
          {currentPage === 'settings' && <Settings user={user} />}
        </main>
      </div>
    </div>
  );
}
