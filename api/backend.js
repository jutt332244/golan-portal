import crypto from 'crypto';

// In-memory + Global Persistent Store (Survives warm instances & instant zero-latency)
const DB = globalThis.__GOLAN_DB__ || (globalThis.__GOLAN_DB__ = {
  admins: ['golaninternational322@gmail.com', 'sj3296521759@gmail.com'],
  agents: {
    'golaninternational322@gmail.com': {
      Email: 'golaninternational322@gmail.com',
      AgencyName: 'Golan International Head Office',
      City: 'Toba Tek Singh',
      Mobile: '0345-3326318',
      PasswordHash: hashPwd('Golan@786'),
      TotpSecret: 'JBSWY3DPEHPK3PXP',
      TotpVerified: 'NO',
      Status: 'APPROVED',
      SessionToken: '',
      SessionExpiry: 0,
      FailedAttempts: 0
    }
  },
  fares: [
    { ID: 'F1', Category: 'Group Flight', Title: 'LHE - JED (Saudi Airlines)', Details: 'Direct Flight • 30+7 KG Baggage', TravelDate: '25 Nov 2026', Seats: 18, FarePKR: 138500, Status: 'ACTIVE' },
    { ID: 'F2', Category: 'Umrah Package', Title: '15 Days Economy Umrah Package', Details: 'Makkah 7N + Madinah 7N • Visa + Transport', TravelDate: '01 Dec 2026', Seats: 25, FarePKR: 215000, Status: 'ACTIVE' }
  ],
  bookings: [],
  banks: []
});

function hashPwd(pwd) {
  return crypto.createHash('sha256').update('GOLAN_SALT_2026_' + pwd).digest('hex');
}

function getNextMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime();
}

function generateSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let s = '';
  for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function base32ToBuffer(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  base32 = base32.replace(/=+$/, '').toUpperCase();
  for (let i = 0; i < base32.length; i++) {
    const val = alphabet.indexOf(base32[i]);
    if (val >= 0) bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let j = 0; j + 8 <= bits.length; j += 8) bytes.push(parseInt(bits.substr(j, 8), 2));
  return Buffer.from(bytes);
}

function verifyTotp(secret, code) {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32ToBuffer(secret);
  const epoch = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -1; offset <= 1; offset++) {
    const step = epoch + offset;
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(step / 0x100000000), 0);
    buf.writeUInt32BE(step >>> 0, 4);
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const off = hmac[hmac.length - 1] & 0x0f;
    const bin = ((hmac[off] & 0x7f) << 24) | ((hmac[off + 1] & 0xff) << 16) | ((hmac[off + 2] & 0xff) << 8) | (hmac[off + 3] & 0xff);
    if (String(bin % 1000000).padStart(6, '0') === code) return true;
  }
  return false;
}

export default function handler(req, res) {
  const p = req.query || {};
  const action = p.action || '';
  const email = String(p.email || '').trim().toLowerCase();

  if (action === 'register') {
    if (!email || !p.password || !p.agencyName) return res.json({ ok: false, message: 'All fields required.' });
    if (DB.agents[email]) return res.json({ ok: false, message: 'Email already registered.' });
    DB.agents[email] = {
      Email: email, AgencyName: p.agencyName, City: p.city || '', Mobile: p.mobile || '',
      PasswordHash: hashPwd(p.password), TotpSecret: generateSecret(), TotpVerified: 'NO',
      Status: 'PENDING', SessionToken: '', SessionExpiry: 0, FailedAttempts: 0
    };
    return res.json({ ok: true, message: 'Registration submitted! Contact Chief Executive (Shan Chairman) for approval.' });
  }

  if (action === 'loginStep1') {
    const a = DB.agents[email];
    if (!a) return res.json({ ok: false, message: 'Agent email not found. Super Admin: golaninternational322@gmail.com' });
    if (a.Status === 'BLOCKED') return res.json({ ok: false, message: 'Account BLOCKED by Head Office.' });
    if (a.Status !== 'APPROVED') return res.json({ ok: false, message: 'Account PENDING approval from Admin.' });
    if (a.PasswordHash !== hashPwd(p.password || '')) {
      a.FailedAttempts++;
      if (a.FailedAttempts >= 5) a.Status = 'BLOCKED';
      return res.json({ ok: false, message: 'Invalid password. Attempt ' + a.FailedAttempts + ' of 5.' });
    }
    a.FailedAttempts = 0;
    const uri = `otpauth://totp/Golan%20International:${encodeURIComponent(email)}?secret=${a.TotpSecret}&issuer=Golan%20International`;
    const qrUrl = `https://qrserver.com{encodeURIComponent(uri)}`;
    return res.json({ ok: true, needQrSetup: a.TotpVerified !== 'YES', qrUrl, secret: a.TotpVerified !== 'YES' ? a.TotpSecret : '' });
  }

  if (action === 'verifyTotp') {
    const a = DB.agents[email];
    if (!a || a.Status !== 'APPROVED') return res.json({ ok: false, message: 'Account not approved.' });
    if (!verifyTotp(a.TotpSecret, String(p.code || '').trim())) {
      return res.json({ ok: false, message: 'Invalid 6-digit Google Authenticator code.' });
    }
    const token = crypto.randomUUID();
    const expiry = getNextMidnight();
    a.TotpVerified = 'YES';
    a.SessionToken = token;
    a.SessionExpiry = expiry;
    return res.json({ ok: true, token, expiry, agencyName: a.AgencyName, isAdmin: DB.admins.includes(email) });
  }

  const a = DB.agents[email];
  const validSess = a && a.Status === 'APPROVED' && a.SessionToken === p.token && Date.now() < a.SessionExpiry;
  if (!validSess) return res.json({ ok: false, message: 'Session expired at 12:00 AM. Please verify 2FA again.' });
  const isAdmin = DB.admins.includes(email);

  if (action === 'checkSession') return res.json({ ok: true, agencyName: a.AgencyName, isAdmin, expiry: a.SessionExpiry });

  if (action === 'getDashboardData') {
    const bookings = isAdmin ? DB.bookings : DB.bookings.filter(b => b.AgentEmail === email);
    const agents = isAdmin ? Object.values(DB.agents).map(x => ({ Email: x.Email, AgencyName: x.AgencyName, City: x.City, Mobile: x.Mobile, Status: x.Status, TotpVerified: x.TotpVerified })) : [];
    return res.json({ ok: true, isAdmin, fares: DB.fares, banks: DB.banks, bookings, agents });
  }

  if (action === 'addBooking') {
    const bId = 'GI-' + Math.floor(100000 + Math.random() * 900000);
    DB.bookings.unshift({ BookingID: bId, CreatedAt: new Date().toLocaleString('en-PK'), AgentEmail: email, AgencyName: a.AgencyName, PassengerName: p.passengerName, PassportNo: p.passportNo, Category: p.category, ItemTitle: p.itemTitle, FarePKR: p.farePKR, Status: 'CONFIRMED' });
    return res.json({ ok: true, bookingId: bId, message: 'Booking Confirmed: ' + bId });
  }

  if (action === 'adminAddFare' && isAdmin) {
    DB.fares.unshift({ ID: 'FARE-' + Date.now(), Category: p.category, Title: p.title, Details: p.details, TravelDate: p.travelDate, Seats: p.seats, FarePKR: p.farePKR, Status: 'ACTIVE' });
    return res.json({ ok: true, message: 'Fare/Package published!' });
  }

  if (action === 'adminAddBank' && isAdmin) {
    DB.banks.push({ BankName: p.bankName, AccountTitle: p.accountTitle, AccountNumber: p.accountNumber, IBAN: p.iban || '' });
    return res.json({ ok: true, message: 'Payment account added!' });
  }

  if (action === 'adminManageAgent' && isAdmin) {
    const target = DB.agents[String(p.targetEmail || '').trim().toLowerCase()];
    if (!target) return res.json({ ok: false, message: 'Agent not found.' });
    if (p.subAction === 'APPROVE') { target.Status = 'APPROVED'; target.FailedAttempts = 0; }
    else if (p.subAction === 'BLOCK') { target.Status = 'BLOCKED'; target.SessionToken = ''; }
    else if (p.subAction === 'RESET_PASSWORD') {
      target.PasswordHash = hashPwd(p.newPassword);
      target.TotpSecret = generateSecret();
      target.TotpVerified = 'NO';
      target.Status = 'APPROVED';
      target.SessionToken = '';
    }
    return res.json({ ok: true, message: 'Agent updated: ' + p.subAction });
  }

  return res.json({ ok: false, message: 'Invalid request' });
}
