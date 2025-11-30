const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOTP, generateOTP } = require('../utils/otp');
const hashEmail = require('../utils/hash');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const universityDomains = require('../utils/universityDomains');


const adjectives = [
  "Brave","Silent","Rapid","Hidden","Calm","Red","Blue","Green","Yellow",
  "Purple","Silver","Golden","Fiery","Frosty","Shadow","Mystic","Noble",
  "Bright","Dark","Swift","Wild","Quiet","Bold","Clever","Wise","Sharp",
  "Stormy","Lucky","Fearless","Mighty","Tiny","Grand","Cosmic","Electric",
  "Frozen","Burning","Gentle","Fierce","Neon","Crimson","Azure","Jade",
  "Ruby","Sapphire","Emerald","Obsidian","Iron","Steel","Cobalt",
  "Whispering","Roaring","Glowing","Shining","Sunny","Lunar","Solar",
  "Stellar","Atomic","Infinite","Eternal","Quantum","Turbo","Phantom",
  "Ghostly","Sacred","Heroic","Vivid","Blazing","Velvet","Smoky","Thunder",
  "Winter","Summer","Autumn","Spring","Metallic","Dynamic","Ancient","Prime",
  "Alpha","Omega","Ultra","Hyper","Supreme","Radiant","Vortex","Pixel",
  "Aero","Galactic","Digital","Savage"
];

const nouns = [
  "Tiger","Falcon","Wolf","Eagle","Lion","Panther","Shadow","Phoenix",
  "Dragon","Unicorn","Bear","Hawk","Raven","Sparrow","Fox","Cobra","Viper",
  "Shark","Whale","Dolphin","Orca","Leopard","Cheetah","Stallion","Mustang",
  "Rhino","Buffalo","Owl","Kraken","Hydra","Basilisk","Griffin","Titan",
  "Nova","Comet","Meteor","Nebula","Galaxy","Star","Planet","Asteroid",
  "Quasar","Pulse","Storm","Blaze","Ember","Flame","Inferno","Frost",
  "Glacier","Tundra","Lightning","Bolt","Strike","Sword","Shield","Arrow",
  "Hammer","Dagger","Spear","Knight","Samurai","Ninja","Ranger","Wizard",
  "Mage","Sorcerer","Warrior","Guardian","Sentinel","Voyager","Pilot",
  "Captain","Hunter","Rover","Scout","Phantom","Ghost","Wraith","Spirit",
  "Pixel","Byte","Cipher","Tech","Code","Circuit","Robot","Mech","Golem",
  "Viking","Pirate","Nomad","Rebel","Raider"
];

function generateName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(100 + Math.random() * 900); // 100–999

  return `${adj}${noun}${number}`;
}

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Initiate Registration (Send OTP)
// @route   POST /api/auth/register/initiate
// @access  Public
const initiateRegistration = async (req, res) => {
  const { email, password } = req.body;

  try {
    const domain = email.split('@')[1];
    const isStudent = Object.keys(universityDomains).includes(domain);
    const hashedEmail = hashEmail(email);

    // Check if user exists (using hashedEmail for everyone now)
    const userExists = await User.findOne({ hashedEmail });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();
    const name = generateName();
    // Prepare Temp User Data
    const tempUserData = {
      _id: uuidv4(),
      name: name,
      hashedEmail,
      password: hashedPassword,
      isStudent,
      canPost: isStudent,
      university: isStudent ? universityDomains[domain] : 'General'
    };

    // Save OTP and Temp Data
    await Otp.deleteMany({ email }); // Clear old OTPs
    await Otp.create({ email, otp, tempUserData });

    console.log(`TESTING OTP for ${email}: ${otp}`); // For testing
    await sendOTP(email, otp);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Registration OTP and Create User
// @route   POST /api/auth/register/verify
// @access  Public
const verifyRegistration = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const validOtp = await Otp.findOne({ email, otp });

    if (!validOtp || !validOtp.tempUserData) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Create User
    const user = await User.create(validOtp.tempUserData);

    // Delete OTP
    await Otp.deleteMany({ email });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      isStudent: user.isStudent,
      isAdmin: user.isAdmin,
      university: user.university,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login User (Student & Public)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedEmail = hashEmail(email);
    
    // Find user by hashedEmail (Unified lookup)
    const user = await User.findOne({ hashedEmail });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        isStudent: user.isStudent,
        isAdmin: user.isAdmin,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const hashedEmail = hashEmail(email);
    const user = await User.findOne({ hashedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    
    // Store OTP with a flag indicating it's for password reset
    await Otp.deleteMany({ email });
    await Otp.create({ 
      email, 
      otp, 
      tempUserData: { type: 'password_reset', userId: user._id } 
    });

    console.log(`TESTING RESET OTP for ${email}: ${otp}`);
    await sendOTP(email, otp);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const validOtp = await Otp.findOne({ email, otp });

    if (!validOtp || validOtp.tempUserData?.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(validOtp.tempUserData.userId, {
      password: hashedPassword
    });

    await Otp.deleteMany({ email });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  initiateRegistration,
  verifyRegistration,
  loginUser,
  forgotPassword,
  resetPassword
};
