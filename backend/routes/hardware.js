const express = require('express');
const router = express.Router();

let latestDetection = {
  plateNumber: 'TN 38 BK 9021',
  vehicleType: 'TWO_WHEELER',
  confidence: 96.8,
  timestamp: new Date().toISOString(),
};

router.post('/scan-ocr', (req, res) => {
  const plates = ['TN 38 BK 9021', 'TN 37 CL 4040', 'TN 66 AB 1234', 'TN 99 ZZ 8899'];
  const detected = plates[Math.floor(Math.random() * plates.length)];
  latestDetection = {
    plateNumber: detected,
    vehicleType: 'TWO_WHEELER',
    confidence: Number((94 + Math.random() * 5).toFixed(1)),
    timestamp: new Date().toISOString(),
  };
  res.json({ success: true, data: latestDetection });
});

router.post('/simulate', (req, res) => {
  res.json({ success: true, data: latestDetection });
});

router.get('/latest', (req, res) => {
  res.json({ success: true, data: latestDetection });
});

module.exports = router;
