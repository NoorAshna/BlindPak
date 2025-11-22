const crypto = require('crypto');

const hashEmail = (email) => {
  return crypto.createHash('sha256').update(email).digest('hex');
};

module.exports = hashEmail;
