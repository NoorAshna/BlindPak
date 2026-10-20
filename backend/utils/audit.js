// Fire-and-forget audit log helper. Never throws — audit failures must not crash the app.
const AuditLog = require('../models/AuditLog');

/**
 * @param {object} opts
 * @param {string|null}  opts.userId
 * @param {string}       opts.resource  — AUTH | POST | COMMENT | USER | ADMIN
 * @param {string}       opts.action    — REGISTER | LOGIN | LOGIN_FAILED | ...
 * @param {'SUCCESS'|'FAILURE'} [opts.status]
 * @param {string|null}  [opts.targetId]
 * @param {object|null}  [opts.metadata]
 * @param {object}       [opts.deviceInfo]  — from parseDeviceInfo()
 */
async function audit(opts) {
  try {
    await AuditLog.create({
      userId: opts.userId ?? null,
      resource: opts.resource,
      action: opts.action,
      status: opts.status ?? 'SUCCESS',
      targetId: opts.targetId ?? null,
      metadata: opts.metadata ?? null,
      ip: opts.deviceInfo?.ip ?? null,
      userAgent: opts.deviceInfo?.userAgent ?? null,
      platform: opts.deviceInfo?.platform ?? null,
      device: opts.deviceInfo?.device ?? null,
      browser: opts.deviceInfo?.browser ?? null,
      os: opts.deviceInfo?.os ?? null,
    });
  } catch (err) {
    console.error('[Audit] Failed to write audit log:', err.message);
  }
}

module.exports = { audit };
