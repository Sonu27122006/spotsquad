import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  IndianRupee,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Globe,
  QrCode,
  MessageSquare,
  Car,
  Smartphone,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

export default function Settings({ user }) {
  const { t } = useLanguage();
  const [dailyRate, setDailyRate] = useState(20);
  const [fourWheelerRate, setFourWheelerRate] = useState(50);
  const [parkingName, setParkingName] = useState('Smart Bus Stand Two-Wheeler Parking');
  const [upiId, setUpiId] = useState('smartparking@upi');
  const [merchantName, setMerchantName] = useState('Smart Bus Stand Parking Hub');
  const [smsProvider, setSmsProvider] = useState('mock');
  const [smsApiKey, setSmsApiKey] = useState('');
  const [demoModeEnabled, setDemoModeEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res && res.data) {
        setDailyRate(res.data.dailyRate || 20);
        setFourWheelerRate(res.data.fourWheelerDailyRate || 50);
        setParkingName(res.data.parkingName || 'Smart Bus Stand Two-Wheeler Parking');
        setUpiId(res.data.upiId || 'smartparking@upi');
        setMerchantName(res.data.merchantName || 'Smart Bus Stand Parking Hub');
        const provider = res.data.smsProvider || 'fast2sms';
        setSmsProvider(provider);
        setSmsApiKey(res.data.smsApiKey || '');
        setDemoModeEnabled(res.data.demoModeEnabled !== false);

        if (provider === 'fast2sms') {
          checkWallet();
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const checkWallet = async () => {
    setWalletLoading(true);
    try {
      const data = await api.getFast2SmsWallet();
      setWalletInfo(data);
    } catch (e) {
      setWalletInfo({ success: false, message: e.message || 'Failed to connect to Fast2SMS' });
    } finally {
      setWalletLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (dailyRate <= 0) {
      setErrorMsg('Daily parking rate must be greater than 0.');
      return;
    }

    setLoading(true);
    try {
      await api.updateSettings({
        dailyRate: parseFloat(dailyRate),
        fourWheelerDailyRate: parseFloat(fourWheelerRate),
        parkingName: parkingName.trim(),
        upiId: upiId.trim(),
        merchantName: merchantName.trim(),
        smsProvider: smsProvider.trim(),
        smsApiKey: smsApiKey.trim(),
        demoModeEnabled: demoModeEnabled,
      });
      setSuccessMsg(t('configSuccess'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="content-area">
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '12px' }} />
          <h2 style={{ fontSize: '18px', color: '#1e293b' }}>Admin Access Restricted</h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
            Only administrators can modify parking tariff rates, UPI payment IDs and system settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsIcon size={22} color="#2563eb" />
          <span>{t('adminSettingsTitle')}</span>
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          {t('adminSettingsSub')}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '780px' }}>
        {/* Prominent Multi-Language Selection Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={18} color="#2563eb" />
                <span>{t('selectSystemLanguage')}</span>
              </h2>
              <p>English, தமிழ், ಕನ್ನಡ, తెలుగు, മലയാളം, हिन्दी, मराठी, ગુજરાતી</p>
            </div>
          </div>

          <LanguageSelector variant="banner" />
        </div>

        {/* Tariff, Payment & SMS Configuration Form */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2>{t('tariffParameters')}</h2>
              <p>{t('tariffParametersSub')}</p>
            </div>
          </div>

          {successMsg && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                color: '#15803d',
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group">
                <label>
                  {t('ratePerDay')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#2563eb' }} />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-control mono-input"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    required
                    style={{ paddingLeft: '38px', fontSize: '15px', color: '#1e3a8a' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  {t('fourWheelerRate')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Car size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#2563eb' }} />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-control mono-input"
                    value={fourWheelerRate}
                    onChange={(e) => setFourWheelerRate(e.target.value)}
                    required
                    style={{ paddingLeft: '38px', fontSize: '15px', color: '#1e3a8a' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>
                {t('facilityName')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
                <input
                  type="text"
                  className="form-control"
                  value={parkingName}
                  onChange={(e) => setParkingName(e.target.value)}
                  required
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group">
                <label>
                  {t('upiIdConfig')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <QrCode size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#2563eb' }} />
                  <input
                    type="text"
                    className="form-control mono-input"
                    placeholder="e.g. smartparking@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  {t('merchantNameConfig')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Building size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Smart Bus Stand Parking Hub"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    required
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: smsProvider === 'fast2sms' ? '12px' : '24px' }}>
              <div className="form-group">
                <label>{t('smsGatewayConfig')}</label>
                <div style={{ position: 'relative' }}>
                  <MessageSquare size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
                  <select
                    className="form-control"
                    value={smsProvider}
                    onChange={(e) => {
                      setSmsProvider(e.target.value);
                      if (e.target.value === 'fast2sms') checkWallet();
                    }}
                    style={{ paddingLeft: '38px' }}
                  >
                    <option value="fast2sms">Fast2SMS Gateway (Live SMS)</option>
                    <option value="mock">Built-In Simulated SMS (Console / Modal)</option>
                    <option value="twilio">Twilio SMS API</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t('smsApiKeyConfig')}</label>
                <div style={{ position: 'relative' }}>
                  <Smartphone size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
                  <input
                    type="password"
                    className="form-control mono-input"
                    placeholder="Enter your Fast2SMS API key"
                    value={smsApiKey}
                    onChange={(e) => setSmsApiKey(e.target.value)}
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>
            </div>

            {smsProvider === 'fast2sms' && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: walletInfo?.success ? '#16a34a' : '#ea580c',
                        display: 'inline-block',
                      }}
                    />
                    <strong style={{ fontSize: '13px', color: '#166534' }}>
                      {walletInfo?.success ? 'Fast2SMS Gateway Connected' : 'Fast2SMS Connection Status'}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={checkWallet}
                    disabled={walletLoading}
                    style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={13} className={walletLoading ? 'animate-spin' : ''} />
                    <span>{walletLoading ? 'Checking...' : 'Check Balance'}</span>
                  </button>
                </div>

                {walletInfo && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px', marginBottom: '12px' }}>
                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Wallet Balance:</span>
                      <strong style={{ fontSize: '16px', color: '#15803d' }}>₹{walletInfo.wallet || '0.00'}</strong>
                    </div>
                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Free Credits Available:</span>
                      <strong style={{ fontSize: '16px', color: '#15803d' }}>{walletInfo.smsCount ?? 200} SMS</strong>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    fontSize: '12px',
                    color: '#1e3a8a',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    lineHeight: '1.5',
                  }}
                >
                  <strong>ℹ️ Fast2SMS Activation Requirement:</strong>
                  <div style={{ marginTop: '2px' }}>
                    Fast2SMS requires a one-time initial recharge of ₹100 or more at{' '}
                    <a
                      href="https://www.fast2sms.com"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      fast2sms.com
                    </a>{' '}
                    to unlock automated API SMS dispatch. Once recharged, registration and checkout messages will deliver instantly to customer mobile phones. In the meantime, 1-click WhatsApp dispatch is always active.
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  {t('enableDemoMode')}
                </h4>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {t('enableDemoModeSub')}
                </p>
              </div>

              <input
                type="checkbox"
                checked={demoModeEnabled}
                onChange={(e) => setDemoModeEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ minWidth: '220px' }}>
                <Save size={18} />
                <span>{loading ? t('saving') : t('saveConfiguration')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
