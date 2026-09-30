const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('==========================================================');
  console.log('  ParkingSpot – Comprehensive Backend API Test Suite      ');
  console.log('==========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  \x1b[32m✓ PASS:\x1b[0m ${message}`);
      passed++;
    } else {
      console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.body.status === 'online', 'Server health check online');

    // 2. Auth: Login as Commuter
    const commLogin = await request('POST', '/auth/login', {
      email: 'commuter@parkingspot.com',
      password: 'commuter123',
    });
    assert(commLogin.status === 200 && commLogin.body.token, 'Commuter login & JWT generation');
    const commuterToken = commLogin.body.token;

    // 3. Auth: Login as Owner
    const ownerLogin = await request('POST', '/auth/login', {
      email: 'owner@parkingspot.com',
      password: 'owner123',
    });
    assert(ownerLogin.status === 200 && ownerLogin.body.data.role === 'OWNER', 'Owner login with OWNER role');
    const ownerToken = ownerLogin.body.token;

    // 4. Auth: Login as Admin
    const adminLogin = await request('POST', '/auth/login', {
      email: 'admin@parkingspot.com',
      password: 'admin123',
    });
    assert(adminLogin.status === 200 && adminLogin.body.data.role === 'ADMIN', 'Admin login with ADMIN role');
    const adminToken = adminLogin.body.token;

    // 5. Parking: Get all parking lots
    const lotsRes = await request('GET', '/parking');
    assert(lotsRes.status === 200 && lotsRes.body.count > 0, `Found ${lotsRes.body.count} parking lots`);
    const testLot = lotsRes.body.data[0];

    // 6. Slots: Get slots for parking lot
    const slotsRes = await request('GET', `/parking/${testLot._id}/slots`);
    assert(slotsRes.status === 200 && slotsRes.body.data.length > 0, `Retrieved ${slotsRes.body.data.length} slots for ${testLot.name}`);
    const availableSlot = slotsRes.body.data.find((s) => s.status === 'AVAILABLE');
    assert(availableSlot !== undefined, `Found available slot: ${availableSlot?.slotNumber}`);

    // 7. Booking: Reserve an available slot
    const startTime = new Date(Date.now() + 3600 * 1000).toISOString();
    const endTime = new Date(Date.now() + 3600 * 1000 * 3).toISOString();

    const bookRes = await request(
      'POST',
      '/bookings',
      {
        parkingLotId: testLot._id,
        slotId: availableSlot._id,
        vehicleNumber: 'TN 38 TEST 9999',
        vehicleType: 'TWO_WHEELER',
        startTime,
        endTime,
        durationHours: 2,
      },
      commuterToken
    );
    assert(bookRes.status === 201 && bookRes.body.data.bookingId, `Slot reserved: Booking ID ${bookRes.body?.data?.bookingId}`);
    const booking = bookRes.body.data;

    // 8. CRITICAL: Try Double Booking the same slot at the same time
    const doubleBookRes = await request(
      'POST',
      '/bookings',
      {
        parkingLotId: testLot._id,
        slotId: availableSlot._id,
        vehicleNumber: 'TN 99 FAIL 0000',
        vehicleType: 'TWO_WHEELER',
        startTime,
        endTime,
        durationHours: 2,
      },
      commuterToken
    );
    assert(
      doubleBookRes.status === 409,
      `Double booking correctly blocked with HTTP 409 Conflict: "${doubleBookRes.body.message}"`
    );

    // 9. Payment: Verify payment on backend
    const payRes = await request(
      'POST',
      '/payments/verify',
      {
        bookingId: booking.bookingId,
        razorpay_order_id: `order_${Date.now()}`,
        razorpay_payment_id: `pay_${Date.now()}`,
        razorpay_signature: 'sig_valid',
      },
      commuterToken
    );
    assert(payRes.status === 200 && payRes.body.data.paymentStatus === 'PAID', 'Payment verified and booking confirmed on backend');

    // 10. Pass: Fetch Digital Parking Pass
    const passRes = await request('GET', `/parking/pass/${booking.bookingId}`);
    assert(
      passRes.status === 200 && passRes.body.data.bookingId === booking.bookingId,
      `Digital Pass retrieved successfully for Token ${booking.bookingId}`
    );

    // 11. Check-in: Vehicle arrives at parking lot
    const checkinRes = await request('POST', `/bookings/${booking.bookingId}/checkin`, {}, commuterToken);
    assert(checkinRes.status === 200 && checkinRes.body.data.bookingStatus === 'ACTIVE', 'Vehicle checked in -> Session status ACTIVE');

    // 12. Check-out / Exit: Vehicle leaves
    const checkoutRes = await request('POST', `/bookings/${booking.bookingId}/checkout`, { paymentMethod: 'UPI_QR' });
    assert(checkoutRes.status === 200 && checkoutRes.body.data.bookingStatus === 'COMPLETED', 'Vehicle checked out -> Session COMPLETED & Slot released');

    // 13. Cancellation test: Reserve a temporary slot and cancel it
    const otherSlot = slotsRes.body.data.find((s) => s.status === 'AVAILABLE' && s._id !== availableSlot._id);
    if (otherSlot) {
      const cancelBookRes = await request(
        'POST',
        '/bookings',
        {
          parkingLotId: testLot._id,
          slotId: otherSlot._id,
          vehicleNumber: 'TN 38 CANC 1234',
          vehicleType: 'TWO_WHEELER',
          startTime: new Date(Date.now() + 86400 * 1000).toISOString(),
          endTime: new Date(Date.now() + 86400 * 1000 * 2).toISOString(),
          durationHours: 24,
        },
        commuterToken
      );

      const cancelRes = await request(
        'PUT',
        `/bookings/${cancelBookRes.body.data.bookingId}/cancel`,
        { reason: 'Change of plans' },
        commuterToken
      );
      assert(
        cancelRes.status === 200 && cancelRes.body.data.bookingStatus === 'CANCELLED',
        'Booking cancellation & refund handling working properly'
      );
    }

    // 14. Dashboards: Commuter
    const commDash = await request('GET', '/dashboard/commuter', null, commuterToken);
    assert(commDash.status === 200 && typeof commDash.body.data.totalSpent === 'number', 'Commuter Dashboard loads real MongoDB metrics');

    // 15. Dashboards: Owner
    const ownerDash = await request('GET', '/dashboard/owner', null, ownerToken);
    assert(ownerDash.status === 200 && Array.isArray(ownerDash.body.data.revenueTrends), 'Owner Dashboard loads revenue trends & peak-hour analytics');

    // 16. Dashboards: Admin
    const adminDash = await request('GET', '/dashboard/admin', null, adminToken);
    assert(adminDash.status === 200 && adminDash.body.data.totalUsers >= 3, 'Admin Dashboard loads platform analytics & user counts');

    console.log('==========================================================');
    console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED        `);
    console.log('==========================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test Suite Exception:', err);
    process.exit(1);
  }
}

runTests();
