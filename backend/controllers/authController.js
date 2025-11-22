const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOTP, generateOTP } = require('../utils/otp');
const hashEmail = require('../utils/hash');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Send OTP to student email
// @route   POST /api/auth/student/send-otp
// @access  Public
const sendStudentOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const otp = generateOTP();
    
    // Check if OTP already exists for this email, delete it
    await Otp.deleteMany({ email });

    await Otp.create({ email, otp });
    console.log(`TESTING OTP for ${email}: ${otp}`); // For testing purposes
    await sendOTP(email, otp);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and Login/Register Student
// @route   POST /api/auth/student/verify-otp
// @access  Public
const verifyStudentOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const validOtp = await Otp.findOne({ email, otp });

    if (!validOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Hash email
    const hashedEmail = hashEmail(email);

    // Check if user exists
    let user = await User.findOne({ hashedEmail });

    if (!user) {
      // Create new student user
      user = await User.create({
        _id: uuidv4(),
        name: 'Student ' + Math.floor(Math.random() * 10000), // Random name
        hashedEmail,
        isStudent: true,
        canPost: true
      });
    }

    // Delete OTP
    await Otp.deleteMany({ email });

    res.status(200).json({
      _id: user._id,
      name: user.name,
      isStudent: user.isStudent,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register Public User
// @route   POST /api/auth/register
// @access  Public
const registerPublic = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      _id: uuidv4(),
      name: 'User ' + Math.floor(Math.random() * 10000),
      email,
      password: hashedPassword,
      isStudent: false,
      canPost: false
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      isStudent: user.isStudent,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login Public User
// @route   POST /api/auth/login
// @access  Public
const loginPublic = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        isStudent: user.isStudent,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendStudentOTP,
  verifyStudentOTP,
  registerPublic,
  loginPublic
};
