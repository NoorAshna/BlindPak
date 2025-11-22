const fetch = require('node-fetch'); // Need to install node-fetch or use built-in if node 18+

const API_URL = 'http://localhost:5000/api';

async function testFlow() {
  try {
    console.log('--- Starting Verification ---');

    // 1. Register Public User
    console.log('\n1. Registering Public User...');
    const publicUserRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'public@test.com', password: 'password123' })
    });
    const publicUser = await publicUserRes.json();
    console.log('Public User:', publicUser);

    // 2. Send Student OTP
    console.log('\n2. Sending Student OTP...');
    const studentEmail = 'student@college.edu';
    await fetch(`${API_URL}/auth/student/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail })
    });
    console.log('OTP Sent. Check server logs for OTP.');

    // Wait for manual OTP input or just skip if I can't automate without reading logs.
    // Since I can't read logs in real-time easily from here while script is running...
    // I will assume I can read the log from the background command output?
    // I will split this script.
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testFlow();
