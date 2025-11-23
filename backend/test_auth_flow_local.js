const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { initiateRegistration, verifyRegistration, loginUser, forgotPassword, resetPassword } = require('./controllers/authController');
const User = require('./models/User');
const Otp = require('./models/Otp');

dotenv.config();
process.env.TEST_MODE = 'true';

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

const runTests = async () => {
  try {
    const mongoUri = 'mongodb://localhost:27017/collegeblind';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Cleanup
    await User.deleteMany({ email: 'test@nu.edu.pk' });
    await User.deleteMany({ email: 'public@example.com' });
    await Otp.deleteMany({ email: 'test@nu.edu.pk' });
    await Otp.deleteMany({ email: 'public@example.com' });

    console.log('\n--- Test 1: Public Registration (Gmail) ---');
    let req = { body: { email: 'public@example.com', password: 'password123' } };
    let res = mockRes();
    await initiateRegistration(req, res);
    console.log(`Status: ${res.statusCode}, Message: ${res.data?.message}`);

    // Verify Public
    let otpRecord = await Otp.findOne({ email: 'public@example.com' });
    let otp = otpRecord ? otpRecord.otp : null;
    req = { body: { email: 'public@example.com', otp } };
    res = mockRes();
    await verifyRegistration(req, res);
    console.log(`Status: ${res.statusCode}, isStudent: ${res.data?.isStudent}, University: ${res.data?.university}`);

    console.log('\n--- Test 2: Student Registration (NU.EDU.PK) ---');
    req = { body: { email: 'test@nu.edu.pk', password: 'password123' } };
    res = mockRes();
    await initiateRegistration(req, res);
    console.log(`Status: ${res.statusCode}, Message: ${res.data?.message}`);

    // Verify Student
    otpRecord = await Otp.findOne({ email: 'test@nu.edu.pk' });
    otp = otpRecord ? otpRecord.otp : null;
    req = { body: { email: 'test@nu.edu.pk', otp } };
    res = mockRes();
    await verifyRegistration(req, res);
    console.log(`Status: ${res.statusCode}, isStudent: ${res.data?.isStudent}, University: ${res.data?.university}`);

    console.log('\n--- Test 3: Login Student ---');
    req = { body: { email: 'test@nu.edu.pk', password: 'password123' } };
    res = mockRes();
    await loginUser(req, res);
    console.log(`Status: ${res.statusCode}, User: ${res.data?.name}, isStudent: ${res.data?.isStudent}`);

    console.log('\n--- Test 4: Login Public ---');
    req = { body: { email: 'public@example.com', password: 'password123' } };
    res = mockRes();
    await loginUser(req, res);
    console.log(`Status: ${res.statusCode}, User: ${res.data?.name}, isStudent: ${res.data?.isStudent}`);

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

runTests();
