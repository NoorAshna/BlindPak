const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTP = async (email, otp) => {
  if (process.env.TEST_MODE === 'true') {
    console.log(`[TEST MODE] OTP for ${email}: ${otp}`);
    return;
  }
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'College Blind App Verification Code',
    text: `Your verification code is: ${otp}`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email could not be sent');
  }
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { sendOTP, generateOTP };
