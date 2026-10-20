// Parses device info from an Express request object
function parseDeviceInfo(req) {
  const ua = req.headers['user-agent'] || '';
  const rawIp = req.headers['x-forwarded-for'] || req.ip || '';
  const ip = rawIp.split(',')[0].trim();

  let platform = 'Unknown';
  if (/windows/i.test(ua)) platform = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) platform = 'macOS';
  else if (/android/i.test(ua)) platform = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) platform = 'iOS';
  else if (/linux/i.test(ua)) platform = 'Linux';

  let device = 'Desktop';
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua)) browser = 'Opera';
  else if (/chrome\/[\d.]+/i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
  else if (/firefox\/[\d.]+/i.test(ua)) browser = 'Firefox';
  else if (/safari\/[\d.]+/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';

  // Extract OS version
  let os = platform;
  const winMatch = ua.match(/Windows NT ([\d.]+)/i);
  if (winMatch) {
    const ntMap = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
    os = `Windows ${ntMap[winMatch[1]] || winMatch[1]}`;
  }
  const macMatch = ua.match(/Mac OS X ([\d_]+)/i);
  if (macMatch) os = `macOS ${macMatch[1].replace(/_/g, '.')}`;
  const androidMatch = ua.match(/Android ([\d.]+)/i);
  if (androidMatch) os = `Android ${androidMatch[1]}`;
  const iosMatch = ua.match(/OS ([\d_]+) like Mac/i);
  if (iosMatch) os = `iOS ${iosMatch[1].replace(/_/g, '.')}`;

  return { ip, userAgent: ua, platform, device, browser, os };
}

module.exports = { parseDeviceInfo };
