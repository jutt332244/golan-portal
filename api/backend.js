import crypto from 'crypto';

const SB_HOST = ['https:', '', ['yxnygfbamkvzgskgoxoy', 'supabase', 'co'].join('.')].join('/');
const SB_URL = process.env.SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || SB_HOST;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.STORAGE_SUPABASE_ANON_KEY;

function hashPwd(pwd) {
  return crypto.createHash('sha256').update('GOLAN_SALT_2026_' + pwd).digest('hex');
}

function defaultState() {
  return {
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
        BalancePKR: 0,
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
    banks: [],
    deposits: []
  };
}

async function loadDB() {
  if (!SB_KEY) return globalThis.__FALLBACK_DB__ || (globalThis.__FALLBACK_DB__ = defaultState());
  try {
    const r = await fetch(`${SB_URL}/rest/v1/golan_store?id=eq.main&select=data`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    const rows = await r.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].data) return rows[0].data;
  } catch (e) {}
  const init = defaultState();
  await saveDB(init);
  return init;
}

async function saveDB(db) {
  if (!SB_KEY) { globalThis.__FALLBACK_DB__ = db; return; }
  try {
    await fetch(`${SB_URL}/rest/v1/golan_store`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: 'main', data: db })
    });
  } catch (e) {}
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

export default async function handler(req, res) {
  try {
    const p = req.query || {};
    const action = p.action || '';
    const email = String(p.email || '').trim().toLowerCase();
    const DB = await loadDB();

    if (action === 'register') {
      if (!email || !p.password || !p.agencyName) return res.json({ ok: false, message: 'All fields required.' });
      if (DB.agents[email]) return res.json({ ok: false, message: 'Email already registered.' });
      DB.agents[email] = {
        Email: email, AgencyName: p.agencyName, City: p.city || '', Mobile: p.mobile || '',
        PasswordHash: hashPwd(p.password), TotpSecret: generateSecret(), TotpVerified: 'NO',
        Status: 'PENDING', BalancePKR: 0, SessionToken: '', SessionExpiry: 0, FailedAttempts: 0
      };
      await saveDB(DB);
      return res.json({ ok: true, message: 'Please contact the Head Quarters to activate your registered account: CEO Shan Chairman (0345-3326318) | Manager Muhammad Umer (0331-6379110).' });
    }

    if (action === 'loginStep1') {
      const a = DB.agents[email];
      if (!a) return res.json({ ok: false, message: 'Agent email not found. Please register first.' });
      const isSuper = DB.admins.includes(email);
      if (isSuper) { a.Status = 'APPROVED'; a.FailedAttempts = 0; }
      if (a.Status === 'BLOCKED') return res.json({ ok: false, message: 'Account BLOCKED by Head Office.' });
      if (a.Status !== 'APPROVED') return res.json({ ok: false, message: 'Account PENDING approval from Admin.' });
      if (a.PasswordHash !== hashPwd(p.password || '')) {
        if (!isSuper) {
          a.FailedAttempts = (a.FailedAttempts || 0) + 1;
          if (a.FailedAttempts >= 5) a.Status = 'BLOCKED';
          await saveDB(DB);
        }
        return res.json({ ok: false, message: 'Invalid password.' });
      }
      a.FailedAttempts = 0;
      await saveDB(DB);
      return res.json({ ok: true, needQrSetup: a.TotpVerified !== 'YES', secret: a.TotpVerified !== 'YES' ? a.TotpSecret : '' });
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
      await saveDB(DB);
      return res.json({ ok: true, token, expiry, agencyName: a.AgencyName, isAdmin: DB.admins.includes(email) });
    }

    const a = DB.agents[email];
    const validSess = a && a.Status === 'APPROVED' && a.SessionToken === p.token && Date.now() < a.SessionExpiry;
    if (!validSess) return res.json({ ok: false, message: 'Session expired at 12:00 AM. Please verify 2FA again.' });
    const isAdmin = DB.admins.includes(email);

    if (action === 'checkSession') return res.json({ ok: true, agencyName: a.AgencyName, isAdmin, expiry: a.SessionExpiry });

    if (action === 'getDashboardData') {
      const bookings = isAdmin ? DB.bookings : DB.bookings.filter(b => b.AgentEmail === email);
      const deposits = isAdmin ? (DB.deposits || []) : (DB.deposits || []).filter(d => d.AgentEmail === email);
      const agents = isAdmin ? Object.values(DB.agents).map(x => ({
        Email: x.Email, AgencyName: x.AgencyName, City: x.City, Mobile: x.Mobile,
        Status: x.Status, TotpVerified: x.TotpVerified, BalancePKR: Number(x.BalancePKR || 0)
      })) : [];
      return res.json({ ok: true, isAdmin, balancePKR: Number(a.BalancePKR || 0), fares: DB.fares, banks: DB.banks, bookings, deposits, agents });
    }

    if (action === 'requestDeposit') {
      const amt = Number(p.amountPKR || 0);
      if (amt <= 0) return res.json({ ok: false, message: 'Enter valid PKR amount.' });
      DB.deposits = DB.deposits || [];
      DB.deposits.unshift({
        DepositID: 'DEP-' + Math.floor(10000 + Math.random() * 90000),
        CreatedAt: new Date().toLocaleString('en-PK'),
        AgentEmail: email, AgencyName: a.AgencyName,
        BankName: p.bankName || 'UBL', AmountPKR: amt, TxRef: p.txRef || '', Status: 'PENDING'
      });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Deposit request submitted! Admin will upgrade your limit shortly.' });
    }

    if (action === 'addBooking') {
      const fare = Number(p.farePKR || 0);
      const bal = Number(a.BalancePKR || 0);
      if (!isAdmin && bal < fare) {
        return res.json({ ok: false, message: 'Insufficient Wallet Balance (PKR ' + bal.toLocaleString() + '). Please deposit funds to upgrade limit.' });
      }
      if (!isAdmin) a.BalancePKR = bal - fare;
      const bId = 'GI-' + Math.floor(100000 + Math.random() * 900000);
      const holdUntil = Date.now() + (30 * 60 * 1000);
      DB.bookings.unshift({
        BookingID: bId,
        CreatedAt: new Date().toLocaleString('en-PK'),
        HoldUntil: holdUntil,
        AgentEmail: email,
        AgencyName: a.AgencyName,
        PassengerName: p.passengerName || '',
        PassportNo: p.passportNo || '',
        Dob: p.dob || '',
        PassportExpiry: p.passportExpiry || '',
        Nationality: p.nationality || 'Pakistani',
        PaxMobile: p.paxMobile || '',
        Category: p.category || '',
        ItemTitle: p.itemTitle || '',
        FarePKR: fare,
        PNR: 'PENDING',
        TicketNo: '',
        Status: 'PENDING'
      });
      await saveDB(DB);
      return res.json({ ok: true, bookingId: bId, message: 'Booking Held (PENDING): ' + bId + ' — Complete issuance within 30 minutes.' });
    }

    if (action === 'adminIssueBooking' && isAdmin) {
      const bk = DB.bookings.find(b => b.BookingID === p.bookingId);
      if (!bk) return res.json({ ok: false, message: 'Booking not found.' });
      bk.PNR = String(p.pnr || '').trim().toUpperCase();
      bk.TicketNo = String(p.ticketNo || '').trim();
      bk.Status = 'CONFIRMED';
      await saveDB(DB);
      return res.json({ ok: true, message: 'Booking Confirmed & PNR (' + bk.PNR + ') Issued!' });
    }

    if (action === 'adminAddFare' && isAdmin) {
      DB.fares.unshift({ ID: 'FARE-' + Date.now(), Category: p.category, Title: p.title, Details: p.details, TravelDate: p.travelDate, Seats: p.seats, FarePKR: Number(p.farePKR), Status: 'ACTIVE' });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Fare/Package published!' });
    }

    if (action === 'adminAddBank' && isAdmin) {
      DB.banks.push({ BankName: p.bankName, AccountTitle: p.accountTitle, AccountNumber: p.accountNumber, IBAN: p.iban || '' });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Payment account added!' });
    }

    if (action === 'adminManageAgent' && isAdmin) {
      const target = DB.agents[String(p.targetEmail || '').trim().toLowerCase()];
      if (!target) return res.json({ ok: false, message: 'Agent not found.' });
      if (p.subAction === 'APPROVE') { target.Status = 'APPROVED'; target.FailedAttempts = 0; }
      else if (p.subAction === 'BLOCK') { target.Status = 'BLOCKED'; target.SessionToken = ''; }
      else if (p.subAction === 'ADD_LIMIT') {
        target.BalancePKR = Number(target.BalancePKR || 0) + Number(p.amountPKR || 0);
      }
      else if (p.subAction === 'RESET_PASSWORD') {
        target.PasswordHash = hashPwd(p.newPassword);
        target.TotpSecret = generateSecret();
        target.TotpVerified = 'NO';
        target.Status = 'APPROVED';
        target.SessionToken = '';
      }
      await saveDB(DB);
      return res.json({ ok: true, message: 'Agent updated: ' + p.subAction });
    }

    if (action === 'adminApproveDeposit' && isAdmin) {
      const dep = (DB.deposits || []).find(d => d.DepositID === p.depositId);
      if (!dep || dep.Status !== 'PENDING') return res.json({ ok: false, message: 'Deposit not found or already processed.' });
      dep.Status = 'APPROVED';
      const target = DB.agents[dep.AgentEmail];
      if (target) target.BalancePKR = Number(target.BalancePKR || 0) + Number(dep.AmountPKR || 0);
      await saveDB(DB);
      return res.json({ ok: true, message: 'Deposit Approved & PKR ' + Number(dep.AmountPKR).toLocaleString() + ' added to agent limit!' });
    }

    return res.json({ ok: false, message: 'Invalid request' });
  } catch (err) {
    return res.status(200).json({ ok: false, message: 'Backend Error: ' + err.message });
  }
}
