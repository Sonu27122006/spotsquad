const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'parkingspot_jwt_secret_key_2026',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, vehicleNumber, vehicleType } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Role validation
    const validRoles = ['COMMUTER', 'OWNER', 'ADMIN'];
    const assignedRole = role && validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'COMMUTER';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      phone: phone || '',
      defaultVehicleNumber: (vehicleNumber || '').toUpperCase().trim(),
      defaultVehicleType: vehicleType || 'TWO_WHEELER',
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        defaultVehicleNumber: user.defaultVehicleNumber,
        defaultVehicleType: user.defaultVehicleType,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const loginIdentifier = (email || username || '').toLowerCase().trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password.',
      });
    }

    // Support login by email or username (for backward compatibility)
    let user = await User.findOne({
      $or: [{ email: loginIdentifier }, { name: new RegExp(`^${loginIdentifier}$`, 'i') }],
    });

    // Support default admin if database is newly initialized
    if (!user && (loginIdentifier === 'admin' || loginIdentifier === 'admin@parkingspot.com') && password === 'admin123') {
      user = await User.create({
        name: 'Platform Administrator',
        email: 'admin@parkingspot.com',
        password: 'admin123',
        role: 'ADMIN',
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.',
      });
    }

    if (user.status === 'BLOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact administrator.',
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        defaultVehicleNumber: user.defaultVehicleNumber,
        defaultVehicleType: user.defaultVehicleType,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, defaultVehicleNumber, defaultVehicleType } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (defaultVehicleNumber !== undefined) user.defaultVehicleNumber = defaultVehicleNumber.toUpperCase().trim();
    if (defaultVehicleType) user.defaultVehicleType = defaultVehicleType;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
