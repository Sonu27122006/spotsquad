import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Navigation,
  Clock,
  ShieldCheck,
  Zap,
  Car,
  ChevronRight,
  Filter,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import SlotReservationModal from '../components/SlotReservationModal';

export default function SearchParking({ user, onSelectPass }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [evFilter, setEvFilter] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [activeLotForBooking, setActiveLotForBooking] = useState(null);
  const [selectedMapLot, setSelectedMapLot] = useState(null);

  useEffect(() => {
    loadParkingLots();
  }, [searchQuery, cityFilter, userLocation]);

  const loadParkingLots = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (cityFilter && cityFilter !== 'All') params.city = cityFilter;
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
      }

      const res = await api.getParkingLots(params);
      if (res && res.data) {
        setLocations(res.data);
        if (res.data.length > 0 && !selectedMapLot) {
          setSelectedMapLot(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Error loading parking locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const displayedLocations = evFilter
    ? locations.filter(
        (lot) =>
          lot.amenities?.some((a) => a.toLowerCase().includes('ev')) ||
          lot.description?.toLowerCase().includes('ev') ||
          lot.name?.toLowerCase().includes('ev')
      )
    : locations;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocatingUser(false);
      },
      (error) => {
        console.warn('Geolocation error or denied:', error.message);
        // Fallback to Coimbatore city center
        setUserLocation({ lat: 11.0168, lng: 76.9688 });
        setLocatingUser(false);
      },
      { timeout: 8000 }
    );
  };

  const handleOpenDirections = (lat, lng, name) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search & Location Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Text Search */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: '14px', top: '13px' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by bus stand, landmark, or location..."
              style={{
                width: '100%',
                padding: '11px 14px 11px 40px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* City Filter */}
          <div style={{ width: '160px' }}>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 12px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '14px',
                background: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="All">All Cities</option>
              <option value="Coimbatore">Coimbatore</option>
              <option value="Chennai">Chennai</option>
              <option value="Bangalore">Bangalore</option>
            </select>
          </div>

          {/* EV Charging Only Filter Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '11px 14px',
              borderRadius: '12px',
              border: evFilter ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
              background: evFilter ? '#ecfdf5' : '#ffffff',
              color: evFilter ? '#047857' : '#334155',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <input
              type="checkbox"
              checked={evFilter}
              onChange={(e) => setEvFilter(e.target.checked)}
              style={{ accentColor: '#10b981', cursor: 'pointer' }}
            />
            <span>⚡ EV Charging Only</span>
          </label>

          {/* Geolocation Button */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleGetCurrentLocation}
            disabled={locatingUser}
            style={{
              padding: '11px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 700,
              color: userLocation ? '#2563eb' : '#334155',
              borderColor: userLocation ? '#93c5fd' : '#cbd5e1',
              background: userLocation ? '#eff6ff' : '#ffffff',
            }}
          >
            <Navigation size={16} color={userLocation ? '#2563eb' : '#64748b'} />
            <span>{locatingUser ? 'Locating GPS...' : userLocation ? 'Nearby Active' : 'Find Near Me'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map & Location Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left Column: Interactive Map Component */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            minHeight: '440px',
          }}
        >
          {/* Map Top Bar */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="#2563eb" />
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                Interactive Google Maps Locator
              </span>
            </div>
            {selectedMapLot && (
              <button
                className="btn btn-outline"
                style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => handleOpenDirections(selectedMapLot.latitude, selectedMapLot.longitude, selectedMapLot.name)}
              >
                <ExternalLink size={12} />
                <span>Open in Google Maps</span>
              </button>
            )}
          </div>

          {/* Interactive Map Visual Area */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              background: '#e2e8f0',
              overflow: 'hidden',
              minHeight: '340px',
            }}
          >
            {/* Embedded Interactive Map Preview or Map Canvas */}
            <iframe
              title="Google Maps Parking View"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '340px' }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${selectedMapLot ? `${selectedMapLot.latitude},${selectedMapLot.longitude}` : '11.0168,76.9688'}&z=14&output=embed`}
            />

            {/* Floating Info Card on Selected Marker */}
            {selectedMapLot && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                  border: '1.5px solid #2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {selectedMapLot.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    ₹{selectedMapLot.pricePerHour}/hr • ₹{selectedMapLot.pricePerDay}/day •{' '}
                    <strong style={{ color: '#16a34a' }}>{selectedMapLot.availableSlots} slots free</strong>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => setActiveLotForBooking(selectedMapLot)}
                  style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
                >
                  Reserve Slot
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Parking Locations List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Available Parking Locations ({displayedLocations.length})
            </h3>
            <button
              onClick={loadParkingLots}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <div className="pulse-dot" style={{ margin: '0 auto 12px auto' }}></div>
              <span>Searching real-time parking data...</span>
            </div>
          ) : displayedLocations.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px solid #e2e8f0',
              }}
            >
              <Car size={36} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                No parking locations found
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                {evFilter ? 'No EV charging locations matched your filter.' : 'Try adjusting your search query or city filter.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
              {displayedLocations.map((lot) => {
                const isSelected = selectedMapLot?._id === lot._id;
                const availablePercent =
                  lot.totalSlots > 0 ? (lot.availableSlots / lot.totalSlots) * 100 : 0;

                let availabilityColor = '#10b981';
                let availabilityBg = '#ecfdf5';
                if (availablePercent < 20) {
                  availabilityColor = '#ef4444';
                  availabilityBg = '#fef2f2';
                } else if (availablePercent < 50) {
                  availabilityColor = '#f59e0b';
                  availabilityBg = '#fffbeb';
                }

                return (
                  <div
                    key={lot._id}
                    onClick={() => setSelectedMapLot(lot)}
                    style={{
                      background: '#ffffff',
                      borderRadius: '18px',
                      padding: '16px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      boxShadow: isSelected
                        ? '0 10px 15px -3px rgba(37,99,235,0.1)'
                        : '0 2px 4px rgba(0,0,0,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '16px' }}>🅿️</span>
                          <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {lot.name}
                          </h4>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} color="#64748b" />
                          <span>{lot.address}</span>
                          {lot.distanceKm !== undefined && (
                            <span style={{ color: '#2563eb', fontWeight: 700 }}>
                              • {lot.distanceKm} km away
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Available Slots Badge */}
                      <div
                        style={{
                          background: availabilityBg,
                          color: availabilityColor,
                          border: `1px solid ${availabilityColor}`,
                          borderRadius: '8px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 800,
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lot.availableSlots} / {lot.totalSlots} FREE
                      </div>
                    </div>

                    {/* Amenities & Operating Hours */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '10px 0' }}>
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Clock size={11} />
                        <span>{lot.operatingHours || '24/7'}</span>
                      </span>
                      {lot.amenities?.slice(0, 2).map((amenity, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>

                    {/* Full Lot Notice */}
                    {lot.availableSlots === 0 && (
                      <div
                        style={{
                          margin: '8px 0',
                          padding: '6px 10px',
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#b45309',
                        }}
                      >
                        <AlertCircle size={14} color="#b45309" />
                        <span>0 Slots Free — Nearby alternatives within 3 km available</span>
                      </div>
                    )}

                    {/* Price & Action Row */}
                    <div
                      style={{
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                          ₹{lot.pricePerHour}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>/ hour</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>•</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', fontFamily: 'monospace' }}>
                          ₹{lot.pricePerDay}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>/ day</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDirections(lot.latitude, lot.longitude, lot.name);
                          }}
                          style={{ padding: '7px 10px', fontSize: '11px' }}
                        >
                          Directions
                        </button>
                        <button
                          type="button"
                          className={lot.availableSlots === 0 ? 'btn btn-outline' : 'btn btn-primary'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveLotForBooking(lot);
                          }}
                          style={{
                            padding: '7px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderColor: lot.availableSlots === 0 ? '#f59e0b' : undefined,
                            color: lot.availableSlots === 0 ? '#b45309' : undefined,
                            background: lot.availableSlots === 0 ? '#fffbeb' : undefined,
                          }}
                        >
                          {lot.availableSlots === 0 ? 'View Alternatives' : 'Select Slot'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Slot Selection Modal */}
      {activeLotForBooking && (
        <SlotReservationModal
          parkingLot={activeLotForBooking}
          user={user}
          onClose={() => setActiveLotForBooking(null)}
          onReservationSuccess={(bookingData) => {
            setActiveLotForBooking(null);
            if (onSelectPass) {
              onSelectPass(bookingData.bookingId);
            }
          }}
        />
      )}
    </div>
  );
}
