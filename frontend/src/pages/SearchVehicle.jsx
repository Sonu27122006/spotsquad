import React, { useState } from 'react';
import {
  Search,
  LogOut,
  FileText,
  AlertCircle,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Share2,
  ExternalLink,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { api } from '../services/api';

export default function SearchVehicle({ setCurrentPage, onSelectVehicleForExit, onViewPass }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const executeSearch = async (searchTerm) => {
    const q = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!q) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.searchParking(q);
      if (res && res.data) {
        setResults(Array.isArray(res.data) ? res.data : []);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Error during search:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    executeSearch();
  };

  const handleOpenDigitalBill = (record) => {
    const passId = record.parkingId || record.tokenId || record.bookingId || record.id;
    if (onViewPass) {
      onViewPass(passId);
    } else {
      window.open(`/pass/${passId}`, '_blank');
    }
  };

  return (
    <div className="content-area">
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={24} color="#2563eb" />
          <span>Vehicle & Digital Pass Search</span>
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Search parking history using any one of 3 values: Token ID, Vehicle Number, or Customer Mobile Number.
        </p>
      </div>

      {/* Single Search Input Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: '#64748b' }} />
              <input
                type="text"
                className="form-control mono-input"
                placeholder="Search by Parking ID, Vehicle Number or Mobile Number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingLeft: '48px', fontSize: '15px', height: '48px', borderRadius: '12px' }}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ height: '48px', padding: '0 24px', fontWeight: 700 }}
            >
              <Search size={18} />
              <span>{loading ? 'Searching Database...' : 'Search'}</span>
            </button>
          </div>

          {/* Quick Examples */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Quick Examples:</span>
            {['TN 30 AB 1234', '9876543210', 'PK-2026', 'Vigas'].map((sample) => (
              <button
                key={sample}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setQuery(sample);
                  executeSearch(sample);
                }}
                style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px' }}
              >
                {sample}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Results Section: Vehicle History Cards */}
      {hasSearched && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2>
                <span>Search Results ({results.length})</span>
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                {results.length > 0
                  ? `Found ${results.length} matching parking record(s)`
                  : 'No records matched your search query'}
              </p>
            </div>
          </div>

          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
              <AlertCircle size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '17px', color: '#1e293b', fontWeight: 700 }}>No Matching Records Found</h3>
              <p style={{ fontSize: '13px', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0 auto' }}>
                We could not find any active or past parking sessions matching "{query}". Please verify the Token ID, vehicle plate, or 10-digit mobile number.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
              {results.map((rec) => {
                const tokenId = rec.parkingId || rec.tokenId || rec.bookingId || rec.id;
                const isParked = rec.vehicleStatus === 'PARKED' || rec.status === 'PARKED';
                const formattedDate = rec.entryTime
                  ? new Date(rec.entryTime).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A';

                const totalAmount = Number(rec.totalAmount ?? rec.finalAmount ?? rec.currentAmount ?? rec.dailyRate ?? 20);
                const rawPaid = Number(rec.paidAmount ?? 0);
                const isPaid = Boolean(rec.paymentStatus === 'PAID' && rawPaid >= totalAmount && rawPaid > 0);
                const paidAmount = isPaid ? totalAmount : rawPaid;
                const amountDue = rec.amountDue !== undefined ? Number(rec.amountDue) : (isPaid ? 0 : Math.max(0, totalAmount - paidAmount));
                const displayBay = rec.parkingBay || rec.parkingSlot || 'General Bay';
                const rateDisplay = `Rs. ${rec.dailyRate || 20}/day`;

                const cleanPhone = (rec.mobile || rec.mobileNumber || rec.customerPhone || '').replace(/[^0-9]/g, '');
                const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

                // WhatsApp template
                const passUrl = `${window.location.origin}/pass/${tokenId}`;
                const shareText = isPaid
                  ? `*ParkingSpot - Digital Parking Pass*\n` +
                    `Customer Name: ${rec.customerName || 'Customer'}\n` +
                    `Mobile Number: ${cleanPhone || rec.mobile || 'N/A'}\n` +
                    `Vehicle: ${rec.vehicleNumber}\n` +
                    `Parking Bay: ${displayBay}\n` +
                    `Token ID: ${tokenId}\n` +
                    `Entry Time: ${formattedDate}\n` +
                    `Parking Rate: ${rateDisplay}\n` +
                    `Status: ${isParked ? 'PARKED' : 'EXITED'}\n` +
                    `Payment Status: PAID - Rs. ${totalAmount}\n` +
                    `Amount Due: Rs. 0\n` +
                    `View Pass:\n${passUrl}`
                  : `*ParkingSpot - Digital Parking Pass*\n` +
                    `Customer Name: ${rec.customerName || 'Customer'}\n` +
                    `Mobile Number: ${cleanPhone || rec.mobile || 'N/A'}\n` +
                    `Vehicle: ${rec.vehicleNumber}\n` +
                    `Parking Bay: ${displayBay}\n` +
                    `Token ID: ${tokenId}\n` +
                    `Entry Time: ${formattedDate}\n` +
                    `Parking Rate: ${rateDisplay}\n` +
                    `Status: ${isParked ? 'PARKED' : 'EXITED'}\n` +
                    `Payment Status: PAYMENT PENDING\n` +
                    `Amount Due: Rs. ${amountDue}\n` +
                    `Pay Online / View Pass:\n${passUrl}`;

                const whatsappUrl = waPhone
                  ? `https://wa.me/${waPhone}?text=${encodeURIComponent(shareText)}`
                  : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

                return (
                  <div
                    key={tokenId}
                    className="vehicle-history-card"
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '18px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {/* Header: Vehicle Plate & Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="plate-badge" style={{ fontSize: '15px' }}>
                        {rec.vehicleNumber}
                      </span>
                      <StatusBadge status={isParked ? 'PARKED' : 'EXITED'} />
                    </div>

                    {/* Token ID & Parking Bay Box */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          Token ID
                        </div>
                        <div className="mono font-bold" style={{ color: '#2563eb', fontSize: '14px', marginTop: '2px' }}>
                          {tokenId}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          Parking Bay
                        </div>
                        <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '14px', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={14} color="#2563eb" />
                          <span>{displayBay}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Key Details */}
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Customer:</span>
                        <span style={{ fontWeight: 600 }}>{rec.customerName || 'Customer'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Mobile Number:</span>
                        <span className="mono" style={{ fontWeight: 600 }}>{cleanPhone || rec.mobile || 'N/A'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Entry Date & Time:</span>
                        <span style={{ fontSize: '12px' }}>{formattedDate}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Parking Rate:</span>
                        <span style={{ fontWeight: 600 }}>{rateDisplay}</span>
                      </div>

                      {/* Billing row */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: '8px',
                          marginTop: '4px',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            {isPaid ? 'Payment Status' : 'Amount Due'}
                          </span>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: isPaid ? '#15803d' : '#d97706' }}>
                            {isPaid ? 'PAID (Rs. ' + totalAmount + ')' : 'DUE: Rs. ' + amountDue}
                          </div>
                        </div>

                        <span
                          className="mono"
                          style={{
                            color: isPaid ? '#15803d' : '#dc2626',
                            fontWeight: 900,
                            fontSize: '17px',
                          }}
                        >
                          Rs. {amountDue}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {/* View Digital Bill Button */}
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenDigitalBill(rec)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700, padding: '8px' }}
                        >
                          <FileText size={14} />
                          <span>View Digital Bill</span>
                        </button>

                        {/* WhatsApp Share Button */}
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm"
                          style={{
                            background: '#25d366',
                            color: 'white',
                            border: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            textDecoration: 'none',
                            fontWeight: 700,
                            borderRadius: '8px',
                            padding: '8px',
                          }}
                        >
                          <Share2 size={14} />
                          <span>WhatsApp</span>
                        </a>
                      </div>

                      {/* Operator Process Exit if Parked */}
                      {isParked && onSelectVehicleForExit && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            onSelectVehicleForExit(rec);
                            setCurrentPage('exit');
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#dc2626', borderColor: '#fca5a5' }}
                        >
                          <LogOut size={13} />
                          <span>Process Vehicle Exit</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
