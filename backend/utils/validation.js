const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S+$/;

const isValidEmail = (email) => (
  typeof email === 'string' &&
  email.length <= 254 &&
  emailPattern.test(email)
);

const getPasswordValidationError = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (password.length > 128) {
    return 'Password must not exceed 128 characters';
  }

  if (!passwordPattern.test(password)) {
    return 'Password must include uppercase, lowercase, number, and special character';
  }

  return null;
};

module.exports = { isValidEmail, getPasswordValidationError };
