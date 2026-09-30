import axios from 'axios';

// Create configured Axios instance
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smart_parking_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to format errors and extract data
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.statusText ||
      error.message ||
      'An unexpected error occurred';
    
    // Auto logout on token expiration
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/pass/')) {
      const user = localStorage.getItem('smart_parking_user');
      if (user) {
        localStorage.removeItem('smart_parking_token');
        localStorage.removeItem('smart_parking_user');
        window.location.reload();
      }
    }

    const customError = new Error(message);
    customError.status = error.response?.status;
    customError.data = error.response?.data;
    return Promise.reject(customError);
  }
);

export const api = {
  // Authentication
  login: (emailOrUsername, password) =>
    apiClient.post('/auth/login', {
      email: emailOrUsername,
      username: emailOrUsername,
      password,
    }),

  register: (userData) => apiClient.post('/auth/register', userData),

  getMe: () => apiClient.get('/auth/me'),

  updateProfile: (profileData) => apiClient.put('/auth/profile', profileData),

  // Parking Lots
  getParkingLots: (params = {}) => apiClient.get('/parking', { params }),

  getNearbyParking: (lat, lng, radius = 50) =>
    apiClient.get('/parking/nearby', { params: { lat, lng, radius } }),

  getParkingById: (id) => apiClient.get(`/parking/${id}`),

  createParking: (data) => apiClient.post('/parking', data),

  updateParking: (id, data) => apiClient.put(`/parking/${id}`, data),

  deleteParking: (id) => apiClient.delete(`/parking/${id}`),

  getNearbyAlternatives: (id) => apiClient.get(`/parking/${id}/alternatives`),

  // Slots Management & Real-time availability
  getSlots: (parkingLotId, params = {}) =>
    apiClient.get(`/parking/${parkingLotId}/slots`, { params }),

  addSlots: (parkingLotId, slots) =>
    apiClient.post(`/parking/${parkingLotId}/slots`, { slots }),

  updateSlot: (slotId, data) => apiClient.put(`/slots/${slotId}`, data),

  // Reservations & Bookings
  createBooking: (bookingData) => apiClient.post('/bookings', bookingData),

  getBookings: (params = {}) => apiClient.get('/bookings', { params }),

  getBookingById: (id) => apiClient.get(`/bookings/${id}`),

  cancelBooking: (id, reason = '') =>
    apiClient.put(`/bookings/${id}/cancel`, { reason }),

  checkInBooking: (id) => apiClient.post(`/bookings/${id}/checkin`),

  checkOutBooking: (id, data = {}) => apiClient.post(`/bookings/${id}/checkout`, data),

  // Payments
  createPaymentOrder: (bookingId, amount, paymentMethod = 'RAZORPAY') =>
    apiClient.post('/payments/create', { bookingId, amount, paymentMethod }),

  verifyPayment: (paymentDetails) => apiClient.post('/payments/verify', paymentDetails),

  getPayments: () => apiClient.get('/payments'),

  // Role-Based Dashboards
  getCommuterDashboard: () => apiClient.get('/dashboard/commuter'),

  getOwnerDashboard: (ownerId = '') =>
    apiClient.get('/dashboard/owner', { params: ownerId ? { ownerId } : {} }),

  getAdminDashboard: () => apiClient.get('/dashboard/admin'),

  // Legacy Dashboard & Search Compatibility
  getStats: () => apiClient.get('/dashboard/stats'),

  getRecentActivity: () => apiClient.get('/dashboard/recent-activity'),

  getActiveParking: () => apiClient.get('/parking/active'),

  getParkingHistory: (params = {}) => apiClient.get('/parking/history', { params }),

  getPublicPass: (identifier) => apiClient.get(`/parking/pass/${encodeURIComponent(identifier)}`),

  exitParking: (id, paymentMethod = 'CASH', transactionId = null, finalAmount = null) =>
    apiClient.post(`/parking/${id}/exit`, { paymentMethod, transactionId, finalAmount }),

  searchParking: (query) => apiClient.get(`/parking/search?query=${encodeURIComponent(query)}`),

  simulateTime: (id, addedDays) =>
    apiClient.post(`/parking/${id}/simulate-time`, { addedDays }),

  // User Management (Admin)
  getUsers: (params = {}) => apiClient.get('/users', { params }),

  updateUser: (id, data) => apiClient.put(`/users/${id}`, data),

  deleteUser: (id) => apiClient.delete(`/users/${id}`),

  // Notifications
  getNotifications: () => apiClient.get('/notifications'),

  markNotificationRead: (id) => apiClient.put(`/notifications/${id}/read`),

  markAllNotificationsRead: () => apiClient.put('/notifications/read-all'),

  sendSms: (payload) => apiClient.post('/notifications/send-sms', payload),

  getFast2SmsWallet: () => apiClient.get('/notifications/fast2sms-wallet'),

  // Settings
  getSettings: () => apiClient.get('/settings'),

  updateSettings: (data) => apiClient.put('/settings', data),

  // Leaderboard & Hardware Simulation
  getLeaderboard: () => apiClient.get('/leaderboard'),

  scanOcr: (data = {}) => apiClient.post('/hardware/scan-ocr', data),

  simulateDetection: () => apiClient.post('/hardware/simulate'),

  getLatestDetection: () => apiClient.get('/hardware/latest'),
};

export default apiClient;
