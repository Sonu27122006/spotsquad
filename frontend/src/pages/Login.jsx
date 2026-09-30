import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  Car,
  Building2,
  Shield,
  Smartphone,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

export default function Login({ onLoginSuccess }) {
  const { t } = useLanguage();

  // Auth Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState('login');

  // Sign In State
  const [emailOrUsername, setEmailOrUsername] = useState('commuter@parkingspot.com');
  const [password, setPassword] = useState('commuter123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('COMMUTER');
  const [regPhone, setRegPhone] = useState('');
  const [regVehicleNumber, setRegVehicleNumber] = useState('');
  const [regVehicleType, setRegVehicleType] = useState('TWO_WHEELER');
  const [regLoading, setRegLoading] = useState(false);
  const [regErrorMsg, setRegErrorMsg] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await api.login(emailOrUsername, password);
      if (res && res.data) {
        if (res.token) {
          localStorage.setItem('smart_parking_token', res.token);
        }
        onLoginSuccess(res.data, res.token);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email/username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setRegErrorMsg('');
    setRegSuccessMsg('');

    if (regPassword.length < 6) {
      setRegErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setRegLoading(true);

    try {
      const res = await api.register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        phone: regPhone,
        vehicleNumber: regVehicleNumber,
        vehicleType: regVehicleType,
      });

      if (res && res.success) {
        setRegSuccessMsg('Account registered successfully! Signing in...');
        if (res.token) {
          localStorage.setItem('smart_parking_token', res.token);
        }
        setTimeout(() => {
          if (res.data) {
            onLoginSuccess(res.data, res.token);
          } else {
            setEmailOrUsername(regEmail);
            setPassword(regPassword);
            setAuthMode('login');
          }
        }, 1000);
      }
    } catch (err) {
      setRegErrorMsg(err.message || 'Failed to create account. Please check your inputs.');
    } finally {
      setRegLoading(false);
    }
  };

  // Quick Demo Login Handler
  const quickDemoLogin = (role) => {
    setErrorMsg('');
    if (role === 'COMMUTER') {
      setEmailOrUsername('commuter@parkingspot.com');
      setPassword('commuter123');
    } else if (role === 'OWNER') {
      setEmailOrUsername('owner@parkingspot.com');
      setPassword('owner123');
    } else if (role === 'ADMIN') {
      setEmailOrUsername('admin@parkingspot.com');
      setPassword('admin123');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow effects */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: '460px', zIndex: 10 }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 10px 25px -5px rgba(37,99,235,0.4)',
              color: '#ffffff',
              fontSize: '32px',
              fontWeight: 900,
            }}
          >
            P
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.5px',
              marginBottom: '6px',
            }}
          >
            ParkingSpot
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
            Smart Parking Reservation & Space Management Platform
          </p>
        </div>

        {/* Quick Demo Role Picker Cards */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '12px 14px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={13} color="#3b82f6" />
            <span>Quick Demo Role Sign In (One-Click)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => quickDemoLogin('COMMUTER')}
              style={{
                background: emailOrUsername.includes('commuter') ? '#2563eb' : '#0f172a',
                color: '#ffffff',
                border: emailOrUsername.includes('commuter') ? '1px solid #60a5fa' : '1px solid #334155',
                borderRadius: '10px',
                padding: '8px 4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
            >
              <Car size={16} />
              <span>Commuter</span>
            </button>

            <button
              type="button"
              onClick={() => quickDemoLogin('OWNER')}
              style={{
                background: emailOrUsername.includes('owner') ? '#059669' : '#0f172a',
                color: '#ffffff',
                border: emailOrUsername.includes('owner') ? '1px solid #34d399' : '1px solid #334155',
                borderRadius: '10px',
                padding: '8px 4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
            >
              <Building2 size={16} />
              <span>Lot Owner</span>
            </button>

            <button
              type="button"
              onClick={() => quickDemoLogin('ADMIN')}
              style={{
                background: emailOrUsername.includes('admin') ? '#7c3aed' : '#0f172a',
                color: '#ffffff',
                border: emailOrUsername.includes('admin') ? '1px solid #a78bfa' : '1px solid #334155',
                borderRadius: '10px',
                padding: '8px 4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
            >
              <Shield size={16} />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Main Auth Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '32px 28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Tabs: Sign In / Create Account */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              marginBottom: '24px',
            }}
          >
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'login' ? '#ffffff' : 'transparent',
                color: authMode === 'login' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: authMode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'register' ? '#ffffff' : 'transparent',
                color: authMode === 'register' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: authMode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Create Account
            </button>
          </div>

          {/* SIGN IN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin}>
              {errorMsg && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '18px',
                  }}
                >
                  <AlertCircle size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Email or Username
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={18}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: '14px', top: '14px' }}
                  />
                  <input
                    type="text"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="Enter email or username"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Password
                  </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: '14px', top: '14px' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Sign In to ParkingSpot</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister}>
              {regErrorMsg && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                  }}
                >
                  <AlertCircle size={18} />
                  <span>{regErrorMsg}</span>
                </div>
              )}

              {regSuccessMsg && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>{regSuccessMsg}</span>
                </div>
              )}

              {/* Role Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '8px',
                  }}
                >
                  I want to use ParkingSpot as:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setRegRole('COMMUTER')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '12px',
                      border: regRole === 'COMMUTER' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                      background: regRole === 'COMMUTER' ? '#eff6ff' : '#ffffff',
                      color: regRole === 'COMMUTER' ? '#1d4ed8' : '#64748b',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Car size={20} />
                    <span>Commuter</span>
                    <span style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8' }}>
                      Search & Book Slots
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('OWNER')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '12px',
                      border: regRole === 'OWNER' ? '2px solid #059669' : '1.5px solid #cbd5e1',
                      background: regRole === 'OWNER' ? '#ecfdf5' : '#ffffff',
                      color: regRole === 'OWNER' ? '#047857' : '#64748b',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Building2 size={20} />
                    <span>Parking Owner</span>
                    <span style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8' }}>
                      List & Monetize Lots
                    </span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Vignesh R"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Mobile Phone */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Commuter vehicle specifics */}
              {regRole === 'COMMUTER' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={regVehicleNumber}
                      onChange={(e) => setRegVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="TN 38 BK 9021"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Vehicle Type
                    </label>
                    <select
                      value={regVehicleType}
                      onChange={(e) => setRegVehicleType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 10px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        background: '#ffffff',
                      }}
                    >
                      <option value="TWO_WHEELER">Two-Wheeler</option>
                      <option value="FOUR_WHEELER">Four-Wheeler</option>
                      <option value="EV">Electric Vehicle</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Create Password (min. 6 chars)
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {regLoading ? <span>Creating Account...</span> : <><UserPlus size={18} /><span>Register as {regRole === 'OWNER' ? 'Owner' : 'Commuter'}</span></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
