const crypto = require('crypto');

const SB_HOST = ['https:', '', ['yxnygfbamkvzgskgoxoy', 'supabase', 'co'].join('.')].join('/');
const SB_URL = process.env.SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || SB_HOST;
const SB_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.STORAGE_SUPABASE_ANON_KEY ||
  '';
const DUFFEL_KEY = process.env.DUFFEL_API_KEY || '';
const GAS_URL =
  process.env.GAS_VOUCHER_URL ||
  'https://script.google.com/macros/s/AKfycbyw4rKuL8HLL7zrBjrYIzcxJs2ZLsOY2LcoM7lWQ4LPT0lmkDL0jbAr4vQIIArxofTGjQ/exec';
const INVOICE_SIGN_SECRET = process.env.INVOICE_SIGN_SECRET || 'GOLAN_INV_HMAC_2026_SECURE';

const DEFAULT_ADMINS = [
  'golaninternational322@gmail.com',
  'sj3296521759@gmail.com',
  'juttumer7754@gmail.com'
];

const CITY_NAMES = {
  LYP: 'FAISALABAD', LHE: 'LAHORE', ISB: 'ISLAMABAD', KHI: 'KARACHI',
  MUX: 'MULTAN', SKT: 'SIALKOT', PEW: 'PESHAWAR', UET: 'QUETTA',
  JED: 'JEDDAH', MED: 'MADINAH', RUH: 'RIYADH', DMM: 'DAMMAM',
  DXB: 'DUBAI', SHJ: 'SHARJAH', AUH: 'ABU DHABI', DOH: 'DOHA',
  MCT: 'MUSCAT', SLL: 'SALALAH', KWI: 'KUWAIT', BAH: 'BAHRAIN',
  IST: 'ISTANBUL', LHR: 'LONDON', MAN: 'MANCHESTER', BHX: 'BIRMINGHAM',
  JFK: 'NEW YORK', YYZ: 'TORONTO', KUL: 'KUALA LUMPUR', BKK: 'BANGKOK', GYD: 'BAKU'
};

const RATES_PKR = { PKR: 1, USD: 280, EUR: 302, GBP: 355, SAR: 74.65, AED: 76.25 };
const RATE_LIMIT_MAP = new Map();

function checkRateLimit(key, maxHits = 60, windowMs = 60000) {
  const now = Date.now();
  const rec = RATE_LIMIT_MAP.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) {
    rec.count = 0;
    rec.resetAt = now + windowMs;
  }
  rec.count++;
  RATE_LIMIT_MAP.set(key, rec);
  if (RATE_LIMIT_MAP.size > 2500) RATE_LIMIT_MAP.clear();
  return rec.count <= maxHits;
}

function getClientIp(req) {
  const xf = req && req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  return xf ? String(xf).split(',')[0].trim().slice(0, 45) : 'unknown';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function timingSafeStrEqual(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function legacyHashPwd(pwd) {
  return crypto.createHash('sha256').update('GOLAN_SALT_2026_' + String(pwd || '')).digest('hex');
}

function hashPwd(pwd) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(pwd || ''), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPwd(pwd, storedHash) {
  const s = String(storedHash || '');
  if (s.startsWith('scrypt$')) {
    const parts = s.split('$');
    if (parts.length !== 3) return false;
    const derived = crypto.scryptSync(String(pwd || ''), parts[1], 64).toString('hex');
    return timingSafeStrEqual(derived, parts[2]);
  }
  return timingSafeStrEqual(legacyHashPwd(pwd), s);
}

function generateSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(16);
  let s = '';
  for (let i = 0; i < 16; i++) s += chars[bytes[i] % chars.length];
  return s;
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeDataUrl(str, allowPdf = false) {
  if (!str) return true;
  const s = String(str).trim();
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(s)) return true;
  if (allowPdf && /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/i.test(s)) return true;
  return false;
}

function signInvoice(bookingId, passportNo) {
  return crypto
    .createHmac('sha256', INVOICE_SIGN_SECRET)
    .update(String(bookingId || '') + '|' + String(passportNo || '').toUpperCase())
    .digest('hex')
    .slice(0, 24);
}

function signReceipt(depositId, agentEmail) {
  return crypto
    .createHmac('sha256', INVOICE_SIGN_SECRET)
    .update('DEP|' + String(depositId || '') + '|' + String(agentEmail || '').toLowerCase())
    .digest('hex')
    .slice(0, 24);
}

function getBaseUrl(req) {
  const host = (req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || 'golaninternational.vercel.app';
  const proto = (req && req.headers && req.headers['x-forwarded-proto'])
    ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
    : 'https';
  return `${proto}://${host}`;
}

function uniqueEmails(list) {
  const out = [];
  (list || []).forEach(em => {
    const c = String(em || '').trim().toLowerCase();
    if (c && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) && !out.includes(c)) out.push(c);
  });
  return out.join(',');
}

function clampInt(val, min, max, fallback) {
  const n = Math.round(Number(val));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function getNextMidnightPKT() {
  const nowPKT = new Date(Date.now() + 5 * 3600 * 1000);
  const nextMidUTC = Date.UTC(nowPKT.getUTCFullYear(), nowPKT.getUTCMonth(), nowPKT.getUTCDate() + 1, 0, 0, 0, 0);
  return nextMidUTC - 5 * 3600 * 1000;
}

function getPKTimeStr() {
  return new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi' });
}

function addSecurityLog(DB, email, action, details, ip = '') {
  DB.securityLogs = Array.isArray(DB.securityLogs) ? DB.securityLogs : [];
  DB.securityLogs.unshift({
    Timestamp: getPKTimeStr(),
    Email: String(email || 'system').toLowerCase(),
    Action: String(action || '').toUpperCase(),
    Details: String(details || '').slice(0, 260) + (ip ? ` [IP: ${ip}]` : '')
  });
  if (DB.securityLogs.length > 500) DB.securityLogs = DB.securityLogs.slice(0, 500);
}

function addLedgerEntry(DB, entry) {
  DB.ledger = Array.isArray(DB.ledger) ? DB.ledger : [];
  const rec = {
    LedgerID: 'LDG-' + Date.now().toString().slice(-6) + '-' + crypto.randomInt(100, 999),
    CreatedAt: entry.CreatedAt || getPKTimeStr(),
    Timestamp: Date.now(),
    AgentEmail: String(entry.AgentEmail || '').trim().toLowerCase(),
    AgencyName: String(entry.AgencyName || '').trim(),
    RefID: String(entry.RefID || '').trim(),
    BookingID: String(entry.BookingID || '').trim(),
    Type: String(entry.Type || 'ADJUSTMENT').toUpperCase(),
    Direction: String(entry.Direction || 'DEBIT').toUpperCase(),
    DebitPKR: Math.max(0, Math.round(Number(entry.DebitPKR || 0))),
    CreditPKR: Math.max(0, Math.round(Number(entry.CreditPKR || 0))),
    BalanceBefore: Math.round(Number(entry.BalanceBefore || 0)),
    BalanceAfter: Math.round(Number(entry.BalanceAfter || 0)),
    Description: String(entry.Description || '').trim(),
    Status: String(entry.Status || 'COMPLETED').toUpperCase(),
    PerformedBy: String(entry.PerformedBy || '').trim().toLowerCase()
  };
  DB.ledger.unshift(rec);
  if (DB.ledger.length > 2000) DB.ledger = DB.ledger.slice(0, 2000);
  return rec;
}

function defaultState() {
  const adminPass = process.env.ADMIN_DEFAULT_PASS || 'Golan@786';
  return {
    admins: [...DEFAULT_ADMINS],
    agents: {
      'golaninternational322@gmail.com': {
        Email: 'golaninternational322@gmail.com',
        AgencyName: 'Golan International Head Office',
        City: 'Toba Tek Singh',
        Mobile: '0345-3326318',
        ContactPerson: 'Shan Chairman',
        Address: 'Head Office, Toba Tek Singh',
        VoucherBranding: 'golan',
        LogoDataUrl: '',
        PasswordHash: hashPwd(adminPass),
        TotpSecret: generateSecret(),
        TotpVerified: 'NO',
        Status: 'APPROVED',
        CanIssue: true,
        CanVoid: true,
        CanCancel: true,
        BalancePKR: 0,
        SessionToken: '',
        SessionExpiry: 0,
        FailedAttempts: 0,
        TotpFailedAttempts: 0
      }
    },
    fares: [
      {
        ID: 'F1', Category: 'Group Flight', Title: 'LHE - JED (Saudi Airlines SV-737)',
        Timing: 'Dep: 04:15 AM | Arr: 07:45 AM (Direct)', Luggage: '30 KG Check-in + 7 KG Hand Carry',
        Meal: 'Hot Halal Meal Included', Stay: 'Non-Stop Direct Flight',
        Details: 'Refundable Before 72 Hrs • Free Seat Selection', TravelDate: '25 Nov 2026',
        Seats: 18, HoldMins: 30, FarePKR: 138500, Status: 'ACTIVE'
      },
      {
        ID: 'F2', Category: 'Umrah Package', Title: '15 Days Economy Umrah Package',
        Timing: 'LHE-JED-LHE Return Flights Included', Luggage: '30 KG + 7 KG + 5L Zamzam',
        Meal: 'Breakfast Optional / Room Only', Stay: 'Makkah 7N (Shuttle) + Madinah 7N (Markazia)',
        Details: 'Umrah Visa + Full Ziyarat & AC Transport Included', TravelDate: '01 Dec 2026',
        Seats: 25, HoldMins: 60, FarePKR: 215000, Status: 'ACTIVE'
      }
    ],
    bookings: [],
    banks: [],
    deposits: [],
    ledger: [],
    securityLogs: [],
    offerCache: {}
  };
}

async function loadDB() {
  if (!SB_KEY) return globalThis.__FALLBACK_DB__ || (globalThis.__FALLBACK_DB__ = defaultState());
  const r = await fetchWithTimeout(`${SB_URL}/rest/v1/golan_store?id=eq.main&select=data`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
  }, 15000);
  if (!r.ok) throw new Error('Database read error (' + r.status + ')');
  const rows = await r.json();
  if (Array.isArray(rows) && rows.length > 0 && rows[0].data) return rows[0].data;
  if (Array.isArray(rows) && rows.length === 0) {
    const init = defaultState();
    await saveDB(init);
    return init;
  }
  throw new Error('Unexpected database response.');
}

async function saveDB(db) {
  if (!SB_KEY) { globalThis.__FALLBACK_DB__ = db; return; }
  const r = await fetchWithTimeout(`${SB_URL}/rest/v1/golan_store`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ id: 'main', data: db })
  }, 15000);
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error('Database save failed (' + r.status + '): ' + txt.slice(0, 80));
  }
}

function pruneOfferCache(DB) {
  DB.offerCache = DB.offerCache || {};
  const cutoff = Date.now() - 2 * 3600 * 1000;
  let changed = false;
  Object.keys(DB.offerCache).forEach(k => {
    if (!DB.offerCache[k] || Number(DB.offerCache[k].ts || 0) < cutoff) {
      delete DB.offerCache[k];
      changed = true;
    }
  });
  return changed;
}

function expireStaleHolds(DB) {
  const now = Date.now();
  let changed = false;
  (DB.bookings || []).forEach(bk => {
    const st = String(bk.Status || '').toUpperCase();
    const holdUntil = Number(bk.HoldUntil || 0);
    if (st === 'PENDING' && holdUntil > 0 && now > holdUntil) {
      bk.Status = 'CANCELED';
      bk.CancelReason = 'HOLD_EXPIRED';
      bk.CanceledAt = getPKTimeStr();
      bk.HoldUntil = 0;

      const agentEmail = String(bk.AgentEmail || '').toLowerCase();
      const agentAcc = DB.agents[agentEmail];
      const refundAmt = Math.max(0, Math.round(Number(bk.PaidAmountPKR || bk.FarePKR || 0)));
      if (bk.WasPaid && !bk.Refunded && refundAmt > 0) {
        const balBefore = agentAcc ? Number(agentAcc.BalancePKR || 0) : 0;
        let balAfter = balBefore;
        if (agentAcc && (!DB.admins.includes(agentEmail) || bk.DeductedFromWallet)) {
          balAfter = balBefore + refundAmt;
          agentAcc.BalancePKR = balAfter;
        }
        bk.Refunded = true;
        bk.RefundAmountPKR = refundAmt;
        addLedgerEntry(DB, {
          AgentEmail: agentEmail,
          AgencyName: bk.AgencyName || (agentAcc && agentAcc.AgencyName) || '',
          RefID: bk.BookingID,
          BookingID: bk.BookingID,
          Type: 'HOLD_EXPIRED_REFUND',
          Direction: 'CREDIT',
          DebitPKR: 0,
          CreditPKR: refundAmt,
          BalanceBefore: balBefore,
          BalanceAfter: balAfter,
          Description: `Auto-Refund (Hold Expired): ${bk.ItemTitle || bk.Category} — ${bk.PassengerName}`,
          Status: 'REFUNDED',
          PerformedBy: 'system'
        });
      }

      if (bk.FareID && bk.Category !== 'Visit Visa') {
        const matchedFare = (DB.fares || []).find(f => String(f.ID) === String(bk.FareID));
        if (matchedFare) matchedFare.Seats = Number(matchedFare.Seats || 0) + 1;
      }
      changed = true;
    }
  });
  return changed;
}

function base32ToBuffer(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  base32 = String(base32 || '').replace(/=+$/, '').toUpperCase();
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
    const bin =
      ((hmac[off] & 0x7f) << 24) |
      ((hmac[off + 1] & 0xff) << 16) |
      ((hmac[off + 2] & 0xff) << 8) |
      (hmac[off + 3] & 0xff);
    if (timingSafeStrEqual(String(bin % 1000000).padStart(6, '0'), code)) return true;
  }
  return false;
}

function extractTicketMeta(bk, fareObj) {
  const raw = String((bk && bk.ItemTitle) || '');
  const meta = {};
  const m = raw.match(/\{([^}]+)\}/);
  if (m && m[1]) {
    m[1].split('|').forEach(part => {
      const idx = part.indexOf(':');
      if (idx > 0) meta[part.slice(0, idx).trim().toUpperCase()] = part.slice(idx + 1).trim();
    });
  }
  const fo = fareObj || {};
  const bagBr = raw.match(/\[([^\]]+)\]/);
  const cleanTitle = raw.replace(/\s*\{[^}]+\}/g, '').trim();
  const dateVal = bk.FlightDate || meta.DATE || fo.TravelDate || fo.Date || '';
  const depVal = bk.DepTime || meta.DEP || '';
  const arrVal = bk.ArrTime || meta.ARR || '';
  let timingVal = bk.Timing || meta.TIMING || fo.Timing || '';
  if (!timingVal && (depVal || arrVal)) {
    timingVal =
      (depVal ? ('Dep: ' + depVal) : '') +
      (meta.DTERM ? (' (T' + meta.DTERM + ')') : '') +
      (arrVal ? (' -> Arr: ' + arrVal) : '') +
      (meta.ATERM ? (' (T' + meta.ATERM + ')') : '');
  }
  return {
    cleanTitle,
    date: dateVal,
    dep: depVal,
    arr: arrVal,
    timing: timingVal,
    baggage: bk.Baggage || meta.BAG || fo.Luggage || (bagBr ? bagBr[1] : '') || '20+5 KG',
    meal: bk.Meal || meta.MEAL || fo.Meal || 'Included',
    stay: bk.Stay || meta.STAY || fo.Stay || '',
    rules: bk.Details || meta.DETAILS || fo.Details || ''
  };
}

function getTicketAirlineMeta(txt) {
  const u = String(txt || '').toUpperCase();
  if (/SALAM|\bOV[-\s]?\d/i.test(u)) return { name: 'SalamAir', code: 'OV', isSalam: true, color: '#008b8b' };
  if (/AIRSIAL|\bPF[-\s]?\d/i.test(u)) return { name: 'AirSial', code: 'PF', color: '#15803d' };
  if (/\bPIA\b|\bPK[-\s]?\d/i.test(u)) return { name: 'PIA', code: 'PK', color: '#166534' };
  if (/SAUDIA|SAUDI|\bSV[-\s]?\d/i.test(u)) return { name: 'Saudia Airlines', code: 'SV', color: '#065f46' };
  if (/AIRBLUE|\bPA[-\s]?\d/i.test(u)) return { name: 'Airblue', code: 'PA', color: '#1d4ed8' };
  if (/SERENE|\bER[-\s]?\d/i.test(u)) return { name: 'SereneAir', code: 'ER', color: '#0f172a' };
  if (/EMIRATES|\bEK[-\s]?\d/i.test(u)) return { name: 'Emirates', code: 'EK', color: '#b91c1c' };
  if (/FLYDUBAI|\bFZ[-\s]?\d/i.test(u)) return { name: 'flydubai', code: 'FZ', color: '#ea580c' };
  if (/FLYNAS|\bXY[-\s]?\d/i.test(u)) return { name: 'flynas', code: 'XY', color: '#0d9488' };
  if (/JAZEERA|\bJ9[-\s]?\d/i.test(u)) return { name: 'Jazeera Airways', code: 'J9', color: '#0284c7' };
  if (/QATAR|\bQR[-\s]?\d/i.test(u)) return { name: 'Qatar Airways', code: 'QR', color: '#881337' };
  if (/TURKISH|\bTK[-\s]?\d/i.test(u)) return { name: 'Turkish Airlines', code: 'TK', color: '#dc2626' };
  if (/ETIHAD|\bEY[-\s]?\d/i.test(u)) return { name: 'Etihad Airways', code: 'EY', color: '#b45309' };
  if (/AZAL|AZERBAIJAN|\bJ2[-\s]?\d/i.test(u)) return { name: 'Azerbaijan Airlines', code: 'J2', color: '#0369a1' };
  return { name: 'Golan Group Flight', code: 'GL', color: '#134b91' };
}

function fmtTicketDate(dStr) {
  if (!dStr) return '-';
  const s = String(dStr).trim();
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const mos = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[dt.getUTCDay()]} ${dt.getUTCDate()} ${mos[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
  }
  return s;
}

function fmtTicketTime(val) {
  if (!val) return '--:--';
  const s = String(val).trim();
  const ampm = s.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (ampm) return ampm[1].toUpperCase();
  const hm = s.match(/(?:^|[\sT])(\d{1,2}):(\d{2})(?::\d{2})?(?:\s|$)/);
  if (hm) {
    const h = parseInt(hm[1], 10);
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return String(h12).padStart(2, '0') + ':' + hm[2] + ' ' + ap;
  }
  return s;
}

function codeToCity(c) {
  const k = String(c || '').trim().toUpperCase();
  return CITY_NAMES[k] || k || 'ORIGIN';
}

function parseTicketSegments(bk, fi) {
  const clean = fi.cleanTitle || '';
  const airlineInfo = getTicketAirlineMeta(clean + ' ' + fi.timing);
  const bag = fi.baggage || '20+5 KG';
  const rawSegs = String(clean).split(/\s*\/\s*|\s*;\s*/).filter(Boolean);
  const timingLegs = String(fi.timing || '').split(/\s*\/\s*|\s*;\s*/).filter(Boolean);
  const dateLegs = String(fi.date || '').split(/\s*\/\s*|\s*;\s*/).filter(Boolean);
  const segments = [];
  const routeMatches = clean.match(/\b([A-Z]{3})\s*[-–to]+\s*([A-Z]{3})\b/gi) || [];
  const hasIsoDate = v => /\d{4}-\d{2}-\d{2}/.test(String(v || ''));

  if (rawSegs.length > 1 && rawSegs.every(x => /[A-Z]{3}\s*[-–]\s*[A-Z]{3}/i.test(x))) {
    rawSegs.forEach((segTxt, i) => {
      const rm = segTxt.match(/\b([A-Z]{3})\s*[-–]\s*([A-Z]{3})\b/i);
      const flm = segTxt.match(/\b([A-Z]{2}[-\s]?\d{2,4})\b/i);
      const times = (timingLegs[i] || fi.timing || '').match(/\d{1,2}:\d{2}(?:\s*(?:AM|PM))?/gi) || [];
      const dTxt = fmtTicketDate(dateLegs[i] || fi.date);
      segments.push({
        oCode: rm ? rm[1].toUpperCase() : 'ORG',
        dCode: rm ? rm[2].toUpperCase() : 'DST',
        origin: rm ? codeToCity(rm[1]) : 'ORIGIN',
        dest: rm ? codeToCity(rm[2]) : 'DESTINATION',
        airline: getTicketAirlineMeta(segTxt + ' ' + clean).name,
        flightNo: flm ? flm[1].replace('-', ' ').toUpperCase() : (airlineInfo.code + '-GRP'),
        depTime: times[0] ? fmtTicketTime(times[0]) : fmtTicketTime(fi.dep),
        arrTime: times[1] ? fmtTicketTime(times[1]) : fmtTicketTime(fi.arr),
        depDate: dTxt,
        arrDate: dTxt,
        baggage: bag
      });
    });
  } else if (routeMatches.length > 1) {
    routeMatches.forEach((rmStr, i) => {
      const rm = rmStr.match(/\b([A-Z]{3})\s*[-–to]+\s*([A-Z]{3})\b/i);
      const fls = clean.match(/\b([A-Z]{2}[-\s]?\d{2,4})\b/gi) || [];
      const times = (timingLegs[i] || fi.timing || '').match(/\d{1,2}:\d{2}(?:\s*(?:AM|PM))?/gi) || [];
      const dTxt = fmtTicketDate(dateLegs[i] || fi.date);
      segments.push({
        oCode: rm ? rm[1].toUpperCase() : 'ORG',
        dCode: rm ? rm[2].toUpperCase() : 'DST',
        origin: rm ? codeToCity(rm[1]) : 'ORIGIN',
        dest: rm ? codeToCity(rm[2]) : 'DESTINATION',
        airline: airlineInfo.name,
        flightNo: fls[i] ? fls[i].replace('-', ' ').toUpperCase() : (fls[0] ? fls[0].replace('-', ' ').toUpperCase() : (airlineInfo.code + '-GRP')),
        depTime: times[0] ? fmtTicketTime(times[0]) : fmtTicketTime(fi.dep),
        arrTime: times[1] ? fmtTicketTime(times[1]) : fmtTicketTime(fi.arr),
        depDate: dTxt,
        arrDate: dTxt,
        baggage: bag
      });
    });
  } else {
    const rm = clean.match(/\b([A-Z]{3})\s*[-–]\s*([A-Z]{3})\b/i);
    const flm = clean.match(/\b([A-Z]{2}[-\s]?\d{2,4})\b/i);
    const times = String(fi.timing || '').match(/\d{1,2}:\d{2}(?:\s*(?:AM|PM))?/gi) || [];
    segments.push({
      oCode: rm ? rm[1].toUpperCase() : 'GL',
      dCode: rm ? rm[2].toUpperCase() : (bk.Category === 'Visit Visa' ? 'VISA' : 'DST'),
      origin: rm ? codeToCity(rm[1]) : clean.replace(/^(Group Flight|Umrah Package|Visit Visa|Live Airline)\s*[-–]\s*/i, '').slice(0, 22).toUpperCase(),
      dest: rm ? codeToCity(rm[2]) : (bk.Category === 'Visit Visa' ? 'E-VISA' : 'DESTINATION'),
      airline: airlineInfo.name,
      flightNo: flm ? flm[1].replace('-', ' ').toUpperCase() : (airlineInfo.code + '-GRP'),
      depTime: fi.dep ? fmtTicketTime(fi.dep) : (times[0] ? fmtTicketTime(times[0]) : '--:--'),
      arrTime: fi.arr ? fmtTicketTime(fi.arr) : (times[1] ? fmtTicketTime(times[1]) : '--:--'),
      depDate: fmtTicketDate(hasIsoDate(fi.dep) ? fi.dep : fi.date),
      arrDate: fmtTicketDate(hasIsoDate(fi.arr) ? fi.arr : fi.date),
      baggage: bag
    });
  }
  return { airlineInfo, segments };
}

function resolveBackendVoucherContext(bk, agent, matchedFare) {
  const isGolanBranding = !agent || agent.VoucherBranding === 'golan';
  const hasValidLogo = !!(agent && agent.LogoDataUrl && isSafeDataUrl(agent.LogoDataUrl, false));
  const useCustomLogo = !isGolanBranding && hasValidLogo;
  const agencyName = isGolanBranding ? 'Golan International Travel & Tours' : (bk.AgencyName || (agent && agent.AgencyName) || 'Partner Travel Agency');
  const agencyEmail = isGolanBranding ? 'golaninternational322@gmail.com' : (bk.AgentEmail || (agent && agent.Email) || 'golaninternational322@gmail.com');
  const agencyContact = isGolanBranding ? '0345-3326318' : ((agent && agent.Mobile) || bk.PaxMobile || '0345-3326318');
  const fi = extractTicketMeta(bk, matchedFare);
  const parsed = parseTicketSegments(bk, fi);
  const air = parsed.airlineInfo;
  const st = String(bk.Status || 'PENDING').toUpperCase();
  const pnrText = String(bk.PNR || 'PENDING');
  const bookingCodeText = String(bk.TicketNo || bk.BookingID || '-');
  const ticketedAt = String(bk.IssuedAt || bk.CreatedAt || '-');
  const paxTitleDisp = (bk.Title ? (String(bk.Title).toUpperCase() + ' ') : '') + String(bk.PassengerName || '').toUpperCase();
  const stLabel = st === 'PENDING' ? 'On Hold' : ((st === 'ISSUED' || st === 'CONFIRMED') ? 'Confirmed / Issued' : (st === 'VOIDED' ? 'Voided' : st));
  const stIcon = st === 'PENDING' ? '&#9203; ' : ((st === 'ISSUED' || st === 'CONFIRMED') ? '&#10003; ' : '');
  const stCol = (st === 'CONFIRMED' || st === 'ISSUED') ? '#15803d' : (st === 'VOIDED' ? '#9a3412' : (st === 'CANCELED' || st === 'EXPIRED' ? '#b91c1c' : '#b45309'));
  const stBg = (st === 'CONFIRMED' || st === 'ISSUED') ? '#dcfce7' : (st === 'VOIDED' ? '#ffedd5' : (st === 'CANCELED' || st === 'EXPIRED' ? '#fee2e2' : '#fef3c7'));
  const stBorder = (st === 'CONFIRMED' || st === 'ISSUED') ? '#86efac' : (st === 'VOIDED' ? '#fdba74' : (st === 'CANCELED' || st === 'EXPIRED' ? '#fca5a5' : '#fcd34d'));
  const segNames = parsed.segments.map(sg => `${escHtml(sg.oCode)} - ${escHtml(sg.dCode)}`).join(' / ');
  const extraRuleHtml = fi.rules
    ? `<div style="margin-top:2px;">3- ${escHtml(String(fi.rules).toUpperCase())}</div>`
    : `<div style="margin-top:2px;">3- PLEASE VERIFY PASSPORT VALIDITY (MIN 6 MONTHS) &amp; VISA REQUIREMENTS PRIOR TO TRAVEL.</div>`;
  return {
    isGolanBranding, useCustomLogo, agencyName, agencyEmail, agencyContact,
    fi, parsed, air, st, pnrText, bookingCodeText, ticketedAt, paxTitleDisp,
    stLabel, stIcon, stCol, stBg, stBorder, segNames, extraRuleHtml
  };
}

function buildVoucherCrestBadgeHtml(air, customLogoUrl, forEmail) {
  if (!forEmail && customLogoUrl) return `<img src="${escHtml(customLogoUrl)}" style="height:44px;max-width:160px;object-fit:contain;" alt="Logo" />`;
  if (air.isSalam) {
    return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;display:inline-table;vertical-align:middle;"><tr>
      <td style="text-align:right;padding-right:8px;vertical-align:middle;">
        <div style="font-size:10px;color:#84cc16;font-weight:800;line-height:1;">&#1575;&#1604;&#1587;&#1604;&#1575;&#1605;</div>
        <div style="font-size:18px;font-weight:900;line-height:1.1;"><span style="color:#00a99d;">Salam</span><span style="color:#0284c7;">Air</span></div>
        <div style="font-size:9px;font-weight:800;color:#64748b;letter-spacing:0.4px;">GOLAN B2B SERVICE VOUCHER</div>
      </td>
      <td style="width:42px;height:42px;background-color:#0b1f44;border:2px solid #d97706;border-radius:10px;text-align:center;vertical-align:middle;">
        <div style="font-size:10px;font-weight:900;color:#fbbf24;letter-spacing:0.8px;line-height:1;">GOLAN</div>
        <div style="font-size:7px;font-weight:700;color:#e2e8f0;letter-spacing:0.5px;margin-top:2px;">B2B</div>
      </td>
    </tr></table>`;
  }
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;display:inline-table;vertical-align:middle;"><tr>
    <td style="text-align:right;padding-right:8px;vertical-align:middle;">
      <div style="font-size:15px;font-weight:900;color:${escHtml(air.color)};line-height:1.15;">${escHtml(air.name)}</div>
      <div style="font-size:9px;font-weight:800;color:#64748b;letter-spacing:0.4px;">GOLAN B2B SERVICE VOUCHER</div>
    </td>
    <td style="width:42px;height:42px;background-color:#0b1f44;border:2px solid #d97706;border-radius:10px;text-align:center;vertical-align:middle;">
      <div style="font-size:10px;font-weight:900;color:#fbbf24;letter-spacing:0.8px;line-height:1;">GOLAN</div>
      <div style="font-size:7px;font-weight:700;color:#e2e8f0;letter-spacing:0.5px;margin-top:2px;">B2B</div>
    </td>
  </tr></table>`;
}

function buildBookingEmailHtml({ bk, agent, matchedFare, agencyName, paxName, farePKR, passportNo, invoiceUrl, isIssued, isVoided, isCanceled, pnr, ticketNo, itemTitle, bId, isAdminCopy, agentEmail }) {
  const bkData = bk || { BookingID: bId, PNR: pnr, TicketNo: ticketNo, AgencyName: agencyName, AgentEmail: agentEmail, PassengerName: paxName, PassportNo: passportNo, ItemTitle: itemTitle, FarePKR: farePKR, Status: isIssued ? 'ISSUED' : (isVoided ? 'VOIDED' : (isCanceled ? 'CANCELED' : 'PENDING')), CreatedAt: getPKTimeStr() };
  const ctx = resolveBackendVoucherContext(bkData, agent || null, matchedFare || null);
  const fi = ctx.fi, refId = bkData.BookingID || bId || '-', crestBadge = buildVoucherCrestBadgeHtml(ctx.air, '', true);

  const segCardsHtml = ctx.parsed.segments.map(sg => `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:10px;">
      <tr>
        <td style="width:29%;padding:12px 14px;vertical-align:top;text-align:left;">
          <div style="font-size:21px;font-weight:900;color:#163b7a;line-height:1.1;letter-spacing:0.5px;">${escHtml(sg.oCode)}</div>
          <div style="font-size:10.5px;font-weight:700;color:#475569;margin-bottom:6px;text-transform:uppercase;">${escHtml(sg.origin)}</div>
          <div style="font-size:15px;font-weight:900;color:#0f172a;">${escHtml(sg.depTime)}</div>
          <div style="font-size:10.5px;color:#163b7a;font-weight:700;">${escHtml(sg.depDate)}</div>
        </td>
        <td style="width:42%;padding:12px 8px;vertical-align:middle;text-align:center;">
          <div style="font-size:10.5px;color:#475569;font-weight:700;">Agent Ref: ${escHtml(refId)}</div>
          <div style="font-size:11px;color:#b45309;font-weight:800;margin:3px 0;">Airline PNR: ${escHtml(ctx.pnrText)}</div>
          <div style="margin:6px 0;"><span style="display:inline-block;background-color:${ctx.stBg};color:${ctx.stCol};padding:3px 10px;border-radius:99px;font-size:10.5px;font-weight:800;border:1px solid ${ctx.stBorder};">${ctx.stIcon}${escHtml(ctx.stLabel)}</span></div>
          <div style="font-size:12px;font-weight:800;color:#0b1f44;">&#9992; ${escHtml(sg.airline)} &#8226; <span style="color:#d97706;">${escHtml(sg.flightNo)}</span></div>
        </td>
        <td style="width:29%;padding:12px 14px;vertical-align:top;text-align:right;">
          <div style="font-size:21px;font-weight:900;color:#163b7a;line-height:1.1;letter-spacing:0.5px;">${escHtml(sg.dCode)}</div>
          <div style="font-size:10.5px;font-weight:700;color:#475569;margin-bottom:6px;text-transform:uppercase;">${escHtml(sg.dest)}</div>
          <div style="font-size:15px;font-weight:900;color:#0f172a;">${escHtml(sg.arrTime)}</div>
          <div style="font-size:10.5px;color:#163b7a;font-weight:700;">${escHtml(sg.arrDate)}</div>
        </td>
      </tr>
    </table>
  `).join('');

  const subMeta = (agent && (agent.City || agent.Mobile)) ? ` | ${escHtml(agent.City || '')} ${escHtml(agent.Mobile || '')}` : '';
  const adminBanner = isAdminCopy
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#0b1f44;border-bottom:2px solid #d97706;"><tr><td style="padding:7px 16px;font-size:11px;font-weight:800;color:#fbbf24;">ADMIN NOTIFICATION COPY &#8226; SUB-AGENT: ${escHtml(bkData.AgencyName || ctx.agencyName)} (${escHtml(agentEmail || bkData.AgentEmail || ctx.agencyEmail)}${subMeta})</td></tr></table>`
    : '';
  const viewPdfBtn = invoiceUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:14px 0 4px;"><tr><td align="center"><a href="${escHtml(invoiceUrl)}" target="_blank" style="display:inline-block;background-color:#0b1f44;color:#ffffff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:12.5px;font-weight:800;border:2px solid #d97706;">&#9992; View / Print A4 Service Voucher PDF</a></td></tr></table>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Service Voucher - ${escHtml(refId)}</title></head>
<body style="margin:0;padding:12px;background-color:#eef2f7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;margin:0 auto;background-color:#ffffff;border-radius:10px;border:1px solid #dbe3ee;overflow:hidden;">
    <tr><td>${adminBanner}</td></tr>
    <tr><td style="padding:16px 18px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border-bottom:2px solid #d97706;margin-bottom:10px;"><tr>
        <td style="padding-bottom:10px;vertical-align:middle;"><div style="font-size:17px;font-weight:900;color:#0b1f44;">Service(s) Voucher / Electronic Ticket</div><div style="font-size:11.5px;font-weight:800;color:#163b7a;margin-top:4px;">Super Ref: ${escHtml(refId)} &nbsp;|&nbsp; PNR: <span style="background-color:#eff6ff;color:#0b1f44;padding:2px 7px;border-radius:4px;border:1px solid #bfdbfe;font-family:monospace;">${escHtml(ctx.pnrText)}</span></div></td>
        <td style="padding-bottom:10px;text-align:right;vertical-align:middle;">${crestBadge}</td>
      </tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#f1f5f9;border-radius:6px;margin-bottom:10px;"><tr>
        <td style="padding:8px 12px;font-size:11.5px;font-weight:700;color:#0b1f44;">Hi ${escHtml(ctx.paxTitleDisp)}, thank you for choosing Golan International Travel &amp; Tours</td>
        <td style="padding:8px 12px;font-size:11px;font-weight:700;color:#334155;text-align:right;white-space:nowrap;">Issued: ${escHtml(ctx.ticketedAt)}</td>
      </tr></table>
      ${segCardsHtml}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin-top:10px;">
        <tr><td style="background-color:#0b1f44;color:#ffffff;font-size:12px;font-weight:800;padding:7px 12px;border-radius:6px 6px 0 0;">Farefamily &amp; Baggage Description</td></tr>
        <tr><td style="border:1px solid #cbd5e1;border-top:none;padding:9px 12px;font-size:11.5px;color:#1e293b;border-radius:0 0 6px 6px;"><strong style="color:#0b1f44;">${escHtml(fi.cleanTitle)}</strong> &#8226; Baggage: <strong>${escHtml(fi.baggage || '20+5 KG')}</strong> &#8226; Meal: <strong>${escHtml(fi.meal || 'Included')}</strong>${fi.stay ? ` &#8226; Stay/Transit: ${escHtml(fi.stay)}` : ''}</td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin-top:10px;">
        <tr><td colspan="7" style="background-color:#0b1f44;color:#ffffff;font-size:12px;font-weight:800;padding:7px 12px;border-radius:6px 6px 0 0;">Passenger Information</td></tr>
        <tr style="background-color:#f1f5f9;"><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;border-left:1px solid #cbd5e1;">Passenger Name</th><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;">Segment</th><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;">Doc / Passport</th><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;">Baggage</th><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;">Seat</th><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;">Meal</th><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;">Status</th></tr>
        <tr><td style="padding:7px;font-size:11px;border-bottom:1px solid #cbd5e1;border-left:1px solid #cbd5e1;"><b>${escHtml(ctx.paxTitleDisp)}</b></td><td style="padding:7px;font-size:11px;border-bottom:1px solid #cbd5e1;">${ctx.segNames}</td><td style="padding:7px;font-size:11px;font-family:monospace;border-bottom:1px solid #cbd5e1;">${escHtml(String(bkData.PassportNo || '').toUpperCase())}</td><td style="padding:7px;font-size:11px;border-bottom:1px solid #cbd5e1;">${escHtml(fi.baggage || '20+5 KG')}</td><td style="padding:7px;font-size:11px;border-bottom:1px solid #cbd5e1;">${escHtml(bkData.SeatPref || 'Any')}</td><td style="padding:7px;font-size:11px;border-bottom:1px solid #cbd5e1;">${escHtml(fi.meal || 'Included')}</td><td style="padding:7px;font-size:11px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;"><b style="color:${ctx.stCol};">${escHtml(ctx.st)}</b></td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin-top:10px;">
        <tr><td colspan="6" style="background-color:#0b1f44;color:#ffffff;font-size:12px;font-weight:800;padding:7px 12px;border-radius:6px 6px 0 0;">Account &amp; Price Info (In PKR)</td></tr>
        <tr style="background-color:#f1f5f9;"><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;border-left:1px solid #cbd5e1;">Booking Code</th><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;">Agency</th><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;">Email</th><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;">Contact</th><th style="padding:6px 7px;text-align:left;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;">Status</th><th style="padding:6px 7px;text-align:right;font-size:10.5px;color:#0b1f44;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;">Grand Total</th></tr>
        <tr><td style="padding:7px;font-size:11px;font-family:monospace;border-bottom:1px solid #cbd5e1;border-left:1px solid #cbd5e1;">${escHtml(ctx.bookingCodeText)}</td><td style="padding:7px;font-size:11px;border-bottom:1px solid #cbd5e1;"><b>${escHtml(ctx.agencyName)}</b></td><td style="padding:7px;font-size:11px;border-bottom:1px solid #cbd5e1;">${escHtml(ctx.agencyEmail)}</td><td style="padding:7px;font-size:11px;border-bottom:1px solid #cbd5e1;">${escHtml(ctx.agencyContact)}</td><td style="padding:7px;font-size:11px;border-bottom:1px solid #cbd5e1;">${escHtml(ctx.st)}</td><td style="padding:7px;font-size:11.5px;text-align:right;font-weight:900;color:#15803d;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;white-space:nowrap;">PKR ${Number(bkData.FarePKR || 0).toLocaleString()}</td></tr>
      </table>
      <div style="margin-top:10px;font-size:10px;color:#334155;line-height:1.55;background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #163b7a;padding:8px 10px;border-radius:5px;">
        <strong style="color:#0b1f44;">TERM &amp; CONDITION:</strong>
        <div>1- PASSENGER SHOULD REPORT AT CHECK IN COUNTER AT LEAST 0400 HOURS PRIOR TO FLIGHT.</div>
        <div>2- TICKETS ARE NON REFUNDABLE AND NON CHANGEABLE ANY TIME.</div>
        ${ctx.extraRuleHtml}
      </div>
      ${viewPdfBtn}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin-top:10px;background-color:#0b1f44;color:#ffffff;border-radius:8px;border-bottom:3px solid #d97706;">
        <tr><td style="padding:10px 12px;font-size:10.5px;line-height:1.6;"><div><strong style="color:#fbbf24;">GOLAN INTERNATIONAL TRAVEL &amp; TOURS</strong> <span style="color:#cbd5e1;">(Toba Tek Singh)</span></div><div style="color:#f1f5f9;">CEO Shan Chairman: <strong>0345-3326318</strong> &nbsp;|&nbsp; Manager Tariq Mehmod: <strong>0341-6929324</strong> &nbsp;|&nbsp; Muhammad Umer: <strong>0331-6379110</strong></div></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildPrintableInvoicePage(bk, agent, matchedFare, forBrowserPrint = true) {
  const ctx = resolveBackendVoucherContext(bk, agent, matchedFare);
  const fi = ctx.fi;
  const rightLogoHtml = buildVoucherCrestBadgeHtml(ctx.air, ctx.useCustomLogo && agent ? agent.LogoDataUrl : '', false);
  const segsHtml = ctx.parsed.segments.map(sg => `
    <div class="it-card"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr>
      <td style="width:28%;vertical-align:top;text-align:left;"><div class="code-big">${escHtml(sg.oCode)}</div><div class="city-sub">${escHtml(sg.origin)}</div><div class="time-big">${escHtml(sg.depTime)}</div><div class="date-sm">${escHtml(sg.depDate)}</div></td>
      <td style="width:44%;text-align:center;vertical-align:middle;"><div style="font-size:10.5px;color:#475569;font-weight:700;">Agent Ref: ${escHtml(bk.BookingID)}</div><div style="font-size:11px;color:#b45309;font-weight:800;margin:2px 0;">Airline PNR: ${escHtml(ctx.pnrText)}</div><div style="margin:5px 0;"><span style="display:inline-block;background:${ctx.stBg};color:${ctx.stCol};padding:3px 10px;border-radius:99px;font-size:10.5px;font-weight:800;border:1px solid ${ctx.stBorder};">${ctx.stIcon}${escHtml(ctx.stLabel)}</span></div><div style="font-size:12px;font-weight:800;color:#0b1f44;">&#9992; ${escHtml(sg.airline)} &#8226; <span style="color:#d97706;">${escHtml(sg.flightNo)}</span></div></td>
      <td style="width:28%;text-align:right;vertical-align:top;"><div class="code-big">${escHtml(sg.dCode)}</div><div class="city-sub">${escHtml(sg.dest)}</div><div class="time-big">${escHtml(sg.arrTime)}</div><div class="date-sm">${escHtml(sg.arrDate)}</div></td>
    </tr></table></div>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Service Voucher - ${escHtml(bk.BookingID)}</title>
<style>@page{size:A4 portrait;margin:8mm;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#eef2f7;color:#0f172a;margin:0;padding:16px;}.a4-page{width:194mm;max-width:100%;margin:0 auto;background:#fff;padding:18px 22px;border-radius:8px;box-shadow:0 12px 36px rgba(11,31,68,.14);border:1px solid #dbe3ee;}.top-bar{width:100%;border-collapse:collapse;border-bottom:2px solid #d97706;margin-bottom:10px;}.greet{width:100%;border-collapse:collapse;background:#f1f5f9;border-radius:6px;font-size:11.5px;font-weight:700;color:#0b1f44;margin-bottom:10px;}.it-card{background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:11px 14px;margin-bottom:10px;}.code-big{font-size:21px;font-weight:900;color:#163b7a;letter-spacing:.5px;line-height:1.1;}.city-sub{font-size:10.5px;font-weight:700;color:#475569;margin-bottom:5px;text-transform:uppercase;}.time-big{font-size:16px;font-weight:900;color:#0f172a;}.date-sm{font-size:10.5px;color:#163b7a;font-weight:600;}.sec-hdr{background:#0b1f44;color:#fff;font-size:12px;font-weight:800;padding:6px 12px;border-radius:6px 6px 0 0;margin-top:9px;}.sec-box{border:1px solid #cbd5e1;border-top:none;border-radius:0 0 6px 6px;padding:9px 12px;font-size:11px;margin-bottom:8px;}.v-tbl{width:100%;border-collapse:collapse;font-size:11px;}.v-tbl th{background:#f1f5f9;padding:6px 8px;text-align:left;color:#0b1f44;font-weight:800;border-bottom:1px solid #cbd5e1;}.v-tbl td{padding:7px 8px;border-bottom:1px solid #eef2f6;}.ft-contacts{width:100%;border-collapse:collapse;margin-top:10px;background:#0b1f44;color:#fff;border-radius:8px;font-size:10.5px;border-bottom:3px solid #d97706;}.no-print{text-align:center;margin-bottom:12px;}@media print{body{background:#fff;padding:0;}.a4-page{box-shadow:none;border:none;padding:4mm;width:100%;}.no-print{display:none!important;}}</style></head>
<body>${forBrowserPrint ? `<div class="no-print"><button onclick="window.print()" style="background:#0b1f44;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:800;cursor:pointer;font-size:13px;">Print / Save A4 Service Voucher PDF</button></div>` : ''}
<div class="a4-page">
  <table class="top-bar"><tr><td style="padding-bottom:10px;vertical-align:middle;"><div style="font-size:18px;font-weight:900;color:#0b1f44;">Service(s) Voucher / Electronic Ticket</div><div style="font-size:11.5px;font-weight:800;color:#163b7a;margin-top:2px;">Super Ref: ${escHtml(bk.BookingID)} &nbsp;|&nbsp; PNR: <span style="background:#eff6ff;padding:1px 7px;border-radius:4px;border:1px solid #bfdbfe;font-family:monospace;">${escHtml(ctx.pnrText)}</span></div></td><td style="padding-bottom:10px;text-align:right;vertical-align:middle;">${rightLogoHtml}</td></tr></table>
  <table class="greet"><tr><td style="padding:7px 12px;">Hi ${escHtml(ctx.paxTitleDisp)}, thank you for choosing Golan International Travel &amp; Tours</td><td style="padding:7px 12px;text-align:right;white-space:nowrap;">Issued: ${escHtml(ctx.ticketedAt)}</td></tr></table>
  ${segsHtml}
  <div class="sec-hdr">Farefamily &amp; Baggage Description</div>
  <div class="sec-box"><strong style="color:#0b1f44;">${escHtml(fi.cleanTitle)}</strong> &#8226; Baggage: <strong>${escHtml(fi.baggage || '20+5 KG')}</strong> &#8226; Meal: <strong>${escHtml(fi.meal || 'Included')}</strong>${fi.stay ? ` &#8226; Stay/Transit: ${escHtml(fi.stay)}` : ''}</div>
  <div class="sec-hdr">Passenger Information</div>
  <div class="sec-box" style="padding:0;"><table class="v-tbl"><thead><tr><th>Passenger Name</th><th>Segment</th><th>Doc / Passport</th><th>Baggage</th><th>Seat</th><th>Meal</th><th>Status</th></tr></thead><tbody><tr><td><b>${escHtml(ctx.paxTitleDisp)}</b></td><td>${ctx.segNames}</td><td style="font-family:monospace;">${escHtml(String(bk.PassportNo || '').toUpperCase())}</td><td>${escHtml(fi.baggage || '20+5 KG')}</td><td>${escHtml(bk.SeatPref || 'Any')}</td><td>${escHtml(fi.meal || 'Included')}</td><td><b style="color:${ctx.stCol};">${escHtml(ctx.st)}</b></td></tr></tbody></table></div>
  <div class="sec-hdr">Account &amp; Price Info (In PKR)</div>
  <div class="sec-box" style="padding:0;"><table class="v-tbl"><thead><tr><th>Booking Code</th><th>Agency</th><th>Email</th><th>Contact</th><th>Status</th><th style="text-align:right;">Grand Total</th></tr></thead><tbody><tr><td style="font-family:monospace;">${escHtml(ctx.bookingCodeText)}</td><td><b>${escHtml(ctx.agencyName)}</b></td><td>${escHtml(ctx.agencyEmail)}</td><td>${escHtml(ctx.agencyContact)}</td><td>${escHtml(ctx.st)}</td><td style="text-align:right;font-weight:900;color:#15803d;">PKR ${Number(bk.FarePKR || 0).toLocaleString()}</td></tr></tbody></table></div>
  <div style="font-size:10px;color:#334155;line-height:1.6;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #163b7a;padding:7px 10px;border-radius:5px;"><strong style="color:#0b1f44;">TERM &amp; CONDITION:</strong><div>1- PASSENGER SHOULD REPORT AT CHECK IN COUNTER AT LEAST 0400 HOURS PRIOR TO FLIGHT.</div><div>2- TICKETS ARE NON REFUNDABLE AND NON CHANGEABLE ANY TIME.</div>${ctx.extraRuleHtml}</div>
  <table class="ft-contacts"><tr><td style="padding:9px 12px;"><strong style="color:#fbbf24;">GOLAN INTERNATIONAL TRAVEL &amp; TOURS</strong> (Toba Tek Singh)</td><td style="padding:9px 12px;text-align:right;">CEO Shan Chairman: <strong>0345-3326318</strong> &nbsp;|&nbsp; Manager Tariq Mehmod: <strong>0341-6929324</strong> &nbsp;|&nbsp; Muhammad Umer: <strong>0331-6379110</strong></td></tr></table>
</div></body></html>`;
}

function buildPrintableReceiptPage(d, forBrowserPrint = true) {
  const st = String(d.Status || 'PENDING').toUpperCase();
  const stCol = st === 'APPROVED' ? '#10b981' : (st === 'REJECTED' || st === 'CANCELED' ? '#ef4444' : '#f59e0b');
  const stLabel = st === 'APPROVED' ? 'Paid & Credited' : st;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Payment Receipt - ${escHtml(d.DepositID)}</title>
<style>@page{size:A4;margin:14mm;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f3f7;color:#0f172a;margin:0;padding:26px 12px;}.rcard{max-width:480px;margin:auto;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,.14);border:1px solid #e2e8f0;}.rtop{background:#0b1f44;color:#fff;padding:22px 24px;border-bottom:4px solid #d97706;}.rrow{padding:12px 0;border-bottom:1px solid #eef2f6;font-size:13.5px;}.rlbl{color:#64748b;font-weight:600;}.rval{text-align:right;font-weight:800;color:#0f172a;}.rsub{font-size:11.5px;color:#64748b;font-weight:600;margin-top:2px;}.print-bar{text-align:center;margin-bottom:14px;}.print-btn{background:#0b1f44;color:#fff;border:none;padding:10px 22px;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px;}@media print{body{background:#fff;padding:0;}.print-bar{display:none!important;}.rcard{box-shadow:none;}}</style></head>
<body>${forBrowserPrint ? `<div class="print-bar"><button class="print-btn" onclick="window.print()">Print / Save PDF Receipt</button></div>` : ''}
<div class="rcard"><div class="rtop"><div style="font-size:11px;font-weight:800;letter-spacing:.8px;color:#fbbf24;">GOLAN INTERNATIONAL B2B</div><h2 style="margin:3px 0 0;font-size:21px;font-weight:900;">Transaction Details</h2><table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;margin-top:12px;color:#e2e8f0;font-weight:600;"><tr><td>${escHtml(d.CreatedAt || '-')}</td><td align="right">REF: ${escHtml(d.DepositID || '-')}</td></tr></table></div>
<div style="padding:10px 24px 6px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td class="rrow rlbl">From (Sub-Agent)</td><td class="rrow rval">${escHtml(d.AgencyName || d.AgentEmail || 'Partner Agency')}<div class="rsub">${escHtml(d.AgentEmail || '')}</div></td></tr><tr><td class="rrow rlbl">To (Corporate)</td><td class="rrow rval">Golan International Travel &amp; Tours<div class="rsub">${escHtml(d.BankName || 'UBL 384263615')}</div></td></tr><tr><td class="rrow rlbl">Transaction / Slip Ref</td><td class="rrow rval" style="font-family:monospace;">${escHtml(d.TxRef || 'SLIP-AUTO')}</td></tr><tr><td class="rrow rlbl" style="border-bottom:none;">Status</td><td class="rrow rval" style="border-bottom:none;color:${stCol};">&#9679; ${escHtml(stLabel)}</td></tr></table></div>
<div style="border-top:2px dashed #cbd5e1;margin:4px 22px;"></div>
<div style="padding:14px 24px 22px;"><div style="font-size:12px;color:#64748b;font-weight:700;">Amount Deposited</div><div style="font-size:28px;font-weight:900;color:#0f172a;margin-top:2px;">PKR ${Number(d.AmountPKR || 0).toLocaleString()}</div><div style="margin-top:16px;padding-top:12px;border-top:1px solid #eef2f6;text-align:center;font-size:11px;color:#64748b;line-height:1.5;"><strong style="color:#0b1f44;">Golan International Travel &amp; Tours (Toba Tek Singh)</strong><br/>CEO Shan Chairman: 0345-3326318 &#8226; Manager Tariq Mehmod: 0341-6929324 &#8226; Muhammad Umer: 0331-6379110</div></div></div></body></html>`;
}

function buildDepositEmailHtml(d, receiptUrl) {
  const st = String(d.Status || 'PENDING').toUpperCase();
  const isApp = st === 'APPROVED';
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#eef2f7;font-family:Arial,sans-serif;"><table width="600" align="center" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #cbd5e1;"><tr><td style="background:#0b1f44;padding:20px 26px;color:#fff;border-bottom:3px solid #d97706;"><div style="font-size:11px;font-weight:bold;color:#fbbf24;">GOLAN INTERNATIONAL B2B</div><h2 style="margin:4px 0 0;font-size:20px;">${isApp ? '&#10003; Deposit Approved &amp; Credited' : 'Deposit Status: ' + escHtml(st)}</h2></td></tr><tr><td style="padding:26px;"><p style="margin:0 0 14px;font-size:14px;color:#334155;">Assalam-o-Alaikum <strong>${escHtml(d.AgencyName || 'Partner')}</strong>,</p><table width="100%" cellpadding="9" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:20px;"><tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Receipt ID</td><td style="border:1px solid #e2e8f0;">${escHtml(d.DepositID)}</td></tr><tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Sub-Agent</td><td style="border:1px solid #e2e8f0;">${escHtml(d.AgencyName)} (${escHtml(d.AgentEmail)})</td></tr><tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Bank</td><td style="border:1px solid #e2e8f0;">${escHtml(d.BankName)}</td></tr><tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Ref</td><td style="border:1px solid #e2e8f0;">${escHtml(d.TxRef)}</td></tr><tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Amount</td><td style="border:1px solid #e2e8f0;color:#15803d;font-weight:bold;font-size:16px;">PKR ${Number(d.AmountPKR || 0).toLocaleString()}</td></tr><tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Status</td><td style="border:1px solid #e2e8f0;font-weight:bold;color:${isApp ? '#15803d' : '#b45309'};">${escHtml(st)}</td></tr></table>${receiptUrl ? `<div style="text-align:center;margin:20px 0;"><a href="${escHtml(receiptUrl)}" target="_blank" style="background:#0b1f44;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:13px;display:inline-block;border:2px solid #d97706;">View / Print PDF Receipt</a></div>` : ''}<p style="margin:0;font-size:12px;color:#64748b;">CEO Shan Chairman: 0345-3326318 | Manager Tariq Mehmod: 0341-6929324 | Muhammad Umer: 0331-6379110</p></td></tr></table></body></html>`;
}

function sleepMs(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function sendGasEmail(payload) {
  const { to, subject, htmlBody, pdfHtml, pdfName, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt, invoiceUrl, adminCopy } = payload || {};
  if (!to || !GAS_URL) return { ok: false, batchHandled: false };
  const bodyPayload = JSON.stringify({
    action: 'sendVoucherHtml', to, subject: subject || 'Golan International B2B Notification',
    senderName: 'GOLAN INTERNATIONAL TRAVEL & TOURS', htmlBody: htmlBody || '', pdfHtml: pdfHtml || '',
    pdfName: pdfName || ('ServiceVoucher-' + (bId || Date.now()) + '.pdf'), invoiceUrl: invoiceUrl || '',
    bId: bId || '', dtStr: dtStr || getPKTimeStr(), agencyName: agencyName || '', paxName: paxName || '',
    passportNo: passportNo || '', category: category || '', itemTitle: itemTitle || '', farePKR: farePKR || 0,
    statusTxt: statusTxt || '', adminCopy: adminCopy || null
  });
  try {
    const postRes = await fetchWithTimeout(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'follow', body: bodyPayload }, 5500);
    const postTxt = await postRes.text();
    if (postTxt.indexOf('"ok":true') !== -1 || postTxt.indexOf('true') !== -1) {
      let parsed = null; try { parsed = JSON.parse(postTxt); } catch (e) {}
      return { ok: true, batchHandled: !!(parsed && parsed.batchHandled === true) };
    }
  } catch (e) {}
  return { ok: false, batchHandled: false };
}

async function sendGasPair(primaryPayload, secondaryPayload) {
  const hasPrimary = !!(primaryPayload && primaryPayload.to);
  const hasSecondary = !!(secondaryPayload && secondaryPayload.to);
  if (!hasPrimary && !hasSecondary) return false;
  const run = async () => {
    if (hasPrimary) {
      const res1 = await sendGasEmail({ ...primaryPayload, adminCopy: hasSecondary ? { to: secondaryPayload.to, subject: secondaryPayload.subject, htmlBody: secondaryPayload.htmlBody } : null });
      if (res1.ok && (!hasSecondary || res1.batchHandled)) return true;
      if (hasSecondary) return !!((await sendGasEmail(secondaryPayload)).ok || res1.ok);
      return !!res1.ok;
    }
    return !!(await sendGasEmail(secondaryPayload)).ok;
  };
  return Promise.race([run(), sleepMs(4800).then(() => true)]);
}

async function sendBookingEmailsSeparate({ adminEmails, subAgentEmail, paxEmail, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt, opts }) {
  const options = opts || {}, invoiceUrl = options.invoiceUrl || '', isIssued = !!options.isIssued, isVoided = !!options.isVoided, isCanceled = !!options.isCanceled;
  const pnr = options.pnr || 'PENDING', ticketNo = options.ticketNo || '', pdfHtml = options.pdfHtml || '', bk = options.bk || null, agent = options.agent || null, matchedFare = options.matchedFare || null;
  const agentSubject = isIssued ? `Service Voucher CONFIRMED - ${bId} (PNR: ${pnr})` : (isVoided ? `Ticket Voided - ${bId} (PNR: ${pnr})` : (isCanceled ? `Booking Canceled - ${bId} (PNR: ${pnr})` : `Service Voucher (HOLD) - ${bId} (PNR: ${pnr})`));
  const adminSubject = `[ADMIN COPY] ${agentSubject} | ${agencyName || 'Partner'}`;
  const subAgentTo = uniqueEmails([subAgentEmail, paxEmail]), adminTo = uniqueEmails(adminEmails || []), pdfFileName = `ServiceVoucher-${bId}.pdf`;
  const primaryPayload = subAgentTo ? { to: subAgentTo, subject: agentSubject, htmlBody: buildBookingEmailHtml({ bk, agent, matchedFare, agencyName, paxName, farePKR, passportNo, invoiceUrl, isIssued, isVoided, isCanceled, pnr, ticketNo, itemTitle, bId, isAdminCopy: false, agentEmail: subAgentEmail }), pdfHtml, pdfName: pdfFileName, invoiceUrl, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt } : null;
  const secondaryPayload = adminTo ? { to: adminTo, subject: adminSubject, htmlBody: buildBookingEmailHtml({ bk, agent, matchedFare, agencyName, paxName, farePKR, passportNo, invoiceUrl, isIssued, isVoided, isCanceled, pnr, ticketNo, itemTitle, bId, isAdminCopy: true, agentEmail: subAgentEmail }), pdfHtml, pdfName: pdfFileName, invoiceUrl, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt } : null;
  return (await sendGasPair(primaryPayload, secondaryPayload)) ? ' | Email: SENT' : '';
}
// ====== END OF PART 1 — PASTE PART 2 DIRECTLY BELOW THIS LINE ======
function formatDuffelDuration(isoDur) {
  const m = String(isoDur || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return '';
  const h = m[1] ? m[1] + 'h ' : '';
  const min = m[2] ? m[2] + 'm' : '';
  return (h + min).trim();
}

function extractDuffelBaggage(seg) {
  const paxList = (seg && Array.isArray(seg.passengers)) ? seg.passengers : [];
  const bags = (paxList[0] && Array.isArray(paxList[0].baggages)) ? paxList[0].baggages : [];
  let checkedTxt = '';
  let carryTxt = '';
  bags.forEach(b => {
    const qty = Number(b.quantity || 1);
    const tp = String(b.type || '').toLowerCase();
    if (tp === 'checked') checkedTxt = `${qty}x Checked Bag (23-30 KG)`;
    else if (tp === 'carry_on') carryTxt = `${qty}x Cabin Bag (7 KG)`;
  });
  if (checkedTxt && carryTxt) return `${checkedTxt} + ${carryTxt}`;
  if (checkedTxt) return `${checkedTxt} + 7 KG Hand Carry`;
  if (carryTxt) return `${carryTxt} Only`;
  return '30 KG Checked + 7 KG Hand Carry';
}

function buildAirlineBaggageTiers(airline, stdBag, baseFare) {
  const air = String(airline || '').toUpperCase();
  const f = Math.max(1000, Math.round(Number(baseFare || 0)));
  if (/EMIRATES|QATAR|ETIHAD|SAUDIA|TURKISH/i.test(air)) {
    return [
      { label: `Economy Saver (${stdBag})`, fare: f },
      { label: 'Economy Flex (35 KG + 7 KG)', fare: f + 6500 },
      { label: 'Economy Flex Plus (45 KG + 7 KG)', fare: f + 14000 }
    ];
  }
  if (/FLYDUBAI|AIRBLUE|AIRSIAL|SERENE|SALAM|JAZEERA/i.test(air)) {
    return [
      { label: 'Lite (7 KG Hand Carry Only)', fare: Math.max(1000, f - 3500) },
      { label: `Value (${stdBag})`, fare: f },
      { label: 'Extra (40 KG + 7 KG + Meal)', fare: f + 8500 }
    ];
  }
  return [
    { label: `Standard (${stdBag})`, fare: f },
    { label: 'Value (35 KG + 7 KG)', fare: f + 4500 },
    { label: 'Flex (45 KG + 7 KG + Meal)', fare: f + 11500 }
  ];
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(204).end();
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp, 90, 60000)) {
    return res.status(429).json({ ok: false, message: 'Too many requests. Please slow down.' });
  }

  try {
    let bodyObj = {};
    if (req.body && typeof req.body === 'object') bodyObj = req.body;
    else if (typeof req.body === 'string' && req.body.trim()) {
      if (req.body.length > 2500000) return res.status(413).json({ ok: false, message: 'Payload too large.' });
      try { bodyObj = JSON.parse(req.body); } catch (e) {
        return res.status(400).json({ ok: false, message: 'Invalid JSON request body.' });
      }
    }

    const q = req.query || {};
    const action = String((bodyObj.action != null ? bodyObj.action : q.action) || '').trim();
    const READ_GET_ACTIONS = new Set(['viewInvoice', 'viewReceipt', 'checkSession', 'getDashboardData', 'getDashboard', 'adminGetAttachment']);
    if (req.method !== 'POST' && !READ_GET_ACTIONS.has(action)) {
      return res.status(405).json({ ok: false, message: 'Method Not Allowed. Use POST for this action.' });
    }

    const p = req.method === 'POST' ? Object.assign({}, bodyObj, { action }) : Object.assign({}, q, bodyObj);
    const email = String(p.email || '').trim().toLowerCase();

    const DB = await loadDB();
    DB.admins = (DB.admins || []).map(x => String(x || '').trim().toLowerCase()).filter(Boolean);
    DB.agents = DB.agents || {};
    DB.fares = DB.fares || [];
    DB.bookings = DB.bookings || [];
    DB.banks = DB.banks || [];
    DB.deposits = DB.deposits || [];
    DB.ledger = DB.ledger || [];
    DB.securityLogs = DB.securityLogs || [];
    DB.offerCache = DB.offerCache || {};

    const adminDefaultPass = process.env.ADMIN_DEFAULT_PASS || 'Golan@786';
    let adminSynced = false;
    DEFAULT_ADMINS.forEach(adm => {
      if (!DB.admins.includes(adm)) { DB.admins.push(adm); adminSynced = true; }
      if (!DB.agents[adm]) {
        DB.agents[adm] = {
          Email: adm, AgencyName: 'Golan International Head Office', City: 'Toba Tek Singh',
          Mobile: '0345-3326318', ContactPerson: 'Shan Chairman', Address: 'Head Office, Toba Tek Singh',
          VoucherBranding: 'golan', LogoDataUrl: '', PasswordHash: hashPwd(adminDefaultPass),
          TotpSecret: generateSecret(), TotpVerified: 'NO', Status: 'APPROVED',
          CanIssue: true, CanVoid: true, CanCancel: true, BalancePKR: 0,
          SessionToken: '', SessionExpiry: 0, FailedAttempts: 0, TotpFailedAttempts: 0
        };
        adminSynced = true;
      } else if (DB.agents[adm].Status !== 'APPROVED' || !DB.agents[adm].CanIssue || !DB.agents[adm].CanVoid || !DB.agents[adm].CanCancel) {
        DB.agents[adm].Status = 'APPROVED';
        DB.agents[adm].CanIssue = true;
        DB.agents[adm].CanVoid = true;
        DB.agents[adm].CanCancel = true;
        adminSynced = true;
      }
    });
    if (adminSynced) await saveDB(DB);

    if (action === 'viewInvoice') {
      const bookingId = String(p.bookingId || '').trim();
      const sig = String(p.sig || '').trim();
      const bk = DB.bookings.find(b => b.BookingID === bookingId);
      if (!bk || !timingSafeStrEqual(sig, signInvoice(bk.BookingID, bk.PassportNo))) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(403).end('<h3 style="font-family:Arial;text-align:center;margin-top:40px;color:#b91c1c;">Invalid or Expired Ticket Link</h3>');
      }
      const agent = DB.agents[String(bk.AgentEmail || '').toLowerCase()] || null;
      const matchedFare = bk.FareID ? DB.fares.find(f => String(f.ID) === String(bk.FareID)) : null;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).end(buildPrintableInvoicePage(bk, agent, matchedFare));
    }

    if (action === 'viewReceipt') {
      const depositId = String(p.depositId || '').trim();
      const sig = String(p.sig || '').trim();
      const dep = DB.deposits.find(d => d.DepositID === depositId);
      if (!dep || !timingSafeStrEqual(sig, signReceipt(dep.DepositID, dep.AgentEmail))) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(403).end('<h3 style="font-family:Arial;text-align:center;margin-top:40px;color:#b91c1c;">Invalid or Expired Receipt Link</h3>');
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).end(buildPrintableReceiptPage(dep));
    }

    if (action === 'register') {
      if (!checkRateLimit('REG_' + clientIp, 6, 300000)) {
        return res.json({ ok: false, message: 'Too many registration attempts. Try later.' });
      }
      const agencyName = String(p.agencyName || '').trim().slice(0, 120);
      const city = String(p.city || '').trim().slice(0, 60);
      const mobile = String(p.mobile || '').trim().slice(0, 30);
      const pwd = String(p.password || '');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json({ ok: false, message: 'Enter a valid email address.' });
      if (!agencyName || pwd.length < 6) return res.json({ ok: false, message: 'Agency name and password (min 6 chars) required.' });
      if (DB.agents[email]) return res.json({ ok: false, message: 'Email already registered.' });

      const isSuperReg = DB.admins.includes(email);
      DB.agents[email] = {
        Email: email, AgencyName: agencyName, City: city, Mobile: mobile,
        ContactPerson: '', Address: '', VoucherBranding: 'custom', LogoDataUrl: '',
        PasswordHash: hashPwd(pwd), TotpSecret: generateSecret(), TotpVerified: 'NO',
        Status: isSuperReg ? 'APPROVED' : 'PENDING',
        CanIssue: isSuperReg, CanVoid: isSuperReg, CanCancel: isSuperReg,
        BalancePKR: 0, SessionToken: '', SessionExpiry: 0, FailedAttempts: 0, TotpFailedAttempts: 0
        };
      addSecurityLog(DB, email, 'REGISTER', `New Agency: ${agencyName} (${city})`, clientIp);
      await saveDB(DB);
      const regBody = `<div style="font-family:Arial,sans-serif;padding:20px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;"><h2 style="color:#0b1f44;margin-top:0;">New Sub-Agent Registration</h2><p><b>Agency:</b> ${escHtml(agencyName)}</p><p><b>Email:</b> ${escHtml(email)}</p><p><b>City:</b> ${escHtml(city)} | <b>Mobile:</b> ${escHtml(mobile)}</p></div>`;
      const regId = 'REG-' + Date.now().toString().slice(-5);
      await sendGasPair(
        { to: email, subject: `Registration Received: ${agencyName}`, htmlBody: regBody, bId: regId, agencyName },
        { to: uniqueEmails(DB.admins || []), subject: `[ADMIN] New B2B Sub-Agent: ${agencyName}`, htmlBody: regBody, bId: regId, agencyName }
      );
      return res.json({
        ok: true,
        message: isSuperReg ? 'Admin approved! Login now & scan 2FA QR.' : 'Submitted! Contact CEO Shan Chairman (0345-3326318) for approval.'
      });
    }

    if (action === 'loginStep1') {
      if (!checkRateLimit('L1_' + clientIp + '_' + email, 12, 300000)) {
        return res.json({ ok: false, message: 'Too many login attempts. Please wait 5 minutes.' });
      }
      const a = DB.agents[email];
      if (!a) return res.json({ ok: false, message: 'Agent email not found. Please register first.' });
      const isSuper = DB.admins.includes(email);
      if (isSuper) { a.Status = 'APPROVED'; a.CanIssue = true; a.CanVoid = true; a.CanCancel = true; a.FailedAttempts = 0; a.TotpFailedAttempts = 0; }
      if (a.Status === 'BLOCKED') return res.json({ ok: false, message: 'Account BLOCKED by Head Office.' });
      if (a.Status !== 'APPROVED') return res.json({ ok: false, message: 'Account PENDING approval from Admin.' });

      const pwd = String(p.password || '');
      if (!verifyPwd(pwd, a.PasswordHash)) {
        if (!isSuper) {
          a.FailedAttempts = (a.FailedAttempts || 0) + 1;
          if (a.FailedAttempts >= 5) a.Status = 'BLOCKED';
        }
        addSecurityLog(DB, email, 'LOGIN_FAIL', `Wrong password (Attempt ${a.FailedAttempts || 1})`, clientIp);
        await saveDB(DB);
        return res.json({ ok: false, message: 'Invalid password.' });
      }
      if (!String(a.PasswordHash || '').startsWith('scrypt$')) a.PasswordHash = hashPwd(pwd);
      a.FailedAttempts = 0;
      await saveDB(DB);
      return res.json({ ok: true, needQrSetup: a.TotpVerified !== 'YES', secret: a.TotpVerified !== 'YES' ? a.TotpSecret : '' });
    }

    if (action === 'verifyTotp') {
      if (!checkRateLimit('2FA_' + clientIp + '_' + email, 12, 300000)) {
        return res.json({ ok: false, message: 'Too many 2FA attempts. Please wait 5 minutes.' });
      }
      const a = DB.agents[email], isSuper = DB.admins.includes(email);
      if (!a || a.Status !== 'APPROVED') return res.json({ ok: false, message: 'Account not approved or blocked.' });
      if (!verifyTotp(a.TotpSecret, String(p.code || '').trim())) {
        if (!isSuper) {
          a.TotpFailedAttempts = (a.TotpFailedAttempts || 0) + 1;
          if (a.TotpFailedAttempts >= 5) a.Status = 'BLOCKED';
        }
        addSecurityLog(DB, email, '2FA_FAIL', `Invalid 2FA code (Attempt ${a.TotpFailedAttempts || 1})`, clientIp);
        await saveDB(DB);
        return res.json({ ok: false, message: 'Invalid 6-digit Google Authenticator code.' });
      }
      const token = crypto.randomUUID(), expiry = getNextMidnightPKT();
      a.TotpVerified = 'YES'; a.TotpFailedAttempts = 0; a.SessionToken = token; a.SessionExpiry = expiry; a.LastLoginAt = getPKTimeStr();
      addSecurityLog(DB, email, 'LOGIN_OK', `2FA Verified (${a.AgencyName})`, clientIp);
      await saveDB(DB);
      return res.json({
        ok: true, token, expiry, agencyName: a.AgencyName, isAdmin: isSuper,
        canIssue: isSuper || !!a.CanIssue, canVoid: isSuper || !!a.CanVoid, canCancel: isSuper || !!a.CanCancel
      });
    }

    const a = DB.agents[email];
    const validSess = a && a.Status === 'APPROVED' && a.SessionToken && timingSafeStrEqual(a.SessionToken, p.token) && Date.now() < Number(a.SessionExpiry || 0);
    if (!validSess) return res.json({ ok: false, message: 'Session expired or revoked. Please login with 2FA again.' });
    const isAdmin = DB.admins.includes(email), canIssue = isAdmin || !!a.CanIssue, canVoid = isAdmin || !!a.CanVoid, canCancel = isAdmin || !!a.CanCancel;

    if (action === 'checkSession') {
      return res.json({ ok: true, agencyName: a.AgencyName, isAdmin, canIssue, canVoid, canCancel, expiry: a.SessionExpiry });
    }

    if (action === 'updateProfile') {
      const agencyName = String(p.agencyName || '').trim().slice(0, 120), logoDataUrl = String(p.logoDataUrl || '').trim();
      if (!agencyName) return res.json({ ok: false, message: 'Travel Agency Name is required.' });
      if (logoDataUrl.length > 350000 || !isSafeDataUrl(logoDataUrl, false)) return res.json({ ok: false, message: 'Invalid or oversized logo image.' });
      a.AgencyName = agencyName; a.City = String(p.city || a.City || '').trim().slice(0, 60); a.Mobile = String(p.mobile || a.Mobile || '').trim().slice(0, 30);
      a.ContactPerson = String(p.contactPerson || '').trim().slice(0, 80); a.Address = String(p.address || '').trim().slice(0, 200);
      a.VoucherBranding = p.voucherBranding === 'golan' ? 'golan' : 'custom'; a.LogoDataUrl = logoDataUrl;
      await saveDB(DB);
      return res.json({
        ok: true, message: '✅ Profile & Agency Logo saved!',
        profile: { agencyName: a.AgencyName, city: a.City, mobile: a.Mobile, contactPerson: a.ContactPerson, address: a.Address, voucherBranding: a.VoucherBranding, logoDataUrl: a.LogoDataUrl }
      });
    }

    if (action === 'changePassword') {
      const curPwd = String(p.currentPassword || ''), newPwd = String(p.newPassword || '');
      if (!curPwd || !verifyPwd(curPwd, a.PasswordHash)) return res.json({ ok: false, message: 'Current password is incorrect.' });
      if (newPwd.length < 6 || curPwd === newPwd) return res.json({ ok: false, message: 'New password must be min 6 chars and different.' });
      a.PasswordHash = hashPwd(newPwd);
      addSecurityLog(DB, email, 'PASSWORD_CHANGE', 'User updated password', clientIp);
      await saveDB(DB);
      return res.json({ ok: true, message: '✅ Password updated successfully!' });
    }

    if (action === 'getDashboardData' || action === 'getDashboard') {
      const expiredChanged = expireStaleHolds(DB), cacheChanged = pruneOfferCache(DB);
      if (expiredChanged || cacheChanged) await saveDB(DB);

      const rawBookings = isAdmin ? DB.bookings : DB.bookings.filter(b => String(b.AgentEmail || '').toLowerCase() === email);
      const bookings = rawBookings.map(b => {
        const c = Object.assign({}, b), ag = DB.agents[String(b.AgentEmail || '').toLowerCase()] || null;
        if (ag) { c.AgencyName = c.AgencyName || ag.AgencyName || ''; c.AgentCity = ag.City || ''; c.AgentMobile = ag.Mobile || ''; c.AgentContactPerson = ag.ContactPerson || ''; c.AgentBalancePKR = Number(ag.BalancePKR || 0); }
        c.HasDocs = !!(b.PassportDoc || b.PhotoDoc); delete c.PassportDoc; delete c.PhotoDoc;
        return c;
      });
      const rawDeposits = isAdmin ? DB.deposits : DB.deposits.filter(d => String(d.AgentEmail || '').toLowerCase() === email);
      const deposits = rawDeposits.map(d => { const c = Object.assign({}, d); c.HasSlip = !!d.SlipImage; delete c.SlipImage; return c; });
      const ledger = isAdmin ? (DB.ledger || []) : (DB.ledger || []).filter(l => String(l.AgentEmail || '').toLowerCase() === email);
      const agents = isAdmin ? Object.values(DB.agents).map(x => {
        const em = String(x.Email || '').toLowerCase();
        const agBks = DB.bookings.filter(b => String(b.AgentEmail || '').toLowerCase() === em).length;
        const agDeps = DB.deposits.filter(d => String(d.AgentEmail || '').toLowerCase() === em && String(d.Status || '').toUpperCase() === 'APPROVED').reduce((s, d) => s + Number(d.AmountPKR || 0), 0);
        return { Email: x.Email, AgencyName: x.AgencyName, City: x.City, Mobile: x.Mobile, ContactPerson: x.ContactPerson || '', Status: x.Status, TotpVerified: x.TotpVerified, CanIssue: !!x.CanIssue, CanVoid: !!x.CanVoid, CanCancel: !!x.CanCancel, BalancePKR: Number(x.BalancePKR || 0), TotalBookings: agBks, TotalDepositsPKR: agDeps, LastLoginAt: x.LastLoginAt || '' };
      }) : [];
      const safeFares = isAdmin ? DB.fares : DB.fares.map(f => ({ ...f, Seats: Number(f.Seats) > 0 ? 'Available' : 'Sold Out' }));
      const profile = { agencyName: a.AgencyName || '', city: a.City || '', mobile: a.Mobile || '', contactPerson: a.ContactPerson || '', address: a.Address || '', voucherBranding: a.VoucherBranding || 'custom', logoDataUrl: a.LogoDataUrl || '' };
      return res.json({ ok: true, isAdmin, canIssue, canVoid, canCancel, balancePKR: Number(a.BalancePKR || 0), profile, fares: safeFares, banks: DB.banks, bookings, deposits, ledger, agents, securityLogs: isAdmin ? (DB.securityLogs || []).slice(0, 200) : [] });
    }

    if (action === 'adminGetAttachment' && isAdmin) {
      if (p.kind === 'deposit') {
        const dep = DB.deposits.find(d => d.DepositID === p.id);
        return (!dep || !dep.SlipImage) ? res.json({ ok: false, message: 'Deposit slip not found.' }) : res.json({ ok: true, slipImage: dep.SlipImage });
      }
      if (p.kind === 'booking') {
        const bk = DB.bookings.find(b => b.BookingID === p.id);
        return (!bk || (!bk.PassportDoc && !bk.PhotoDoc)) ? res.json({ ok: false, message: 'Documents not found.' }) : res.json({ ok: true, passportDoc: bk.PassportDoc || '', photoDoc: bk.PhotoDoc || '' });
      }
      return res.json({ ok: false, message: 'Invalid attachment request.' });
    }

    if (action === 'searchLiveFlights') {
      if (!DUFFEL_KEY) return res.json({ ok: false, message: 'Flight API Key not configured on Vercel.' });
      const origin = String(p.origin || '').trim().toUpperCase().slice(0, 3), dest = String(p.dest || '').trim().toUpperCase().slice(0, 3), date = String(p.date || '').trim();
      const returnDate = String(p.returnDate || '').trim(), tripType = String(p.tripType || 'oneway').trim();
      const origin2 = String(p.origin2 || '').trim().toUpperCase().slice(0, 3), dest2 = String(p.dest2 || '').trim().toUpperCase().slice(0, 3), date2 = String(p.date2 || '').trim();
      const cabin = ['economy', 'premium_economy', 'business', 'first'].includes(String(p.cabin || '').toLowerCase()) ? String(p.cabin).toLowerCase() : 'economy';
      const adults = clampInt(p.adults, 1, 9, 1), children = clampInt(p.children, 0, 6, 0), infants = clampInt(p.infants, 0, adults, 0);
      if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(dest) || origin === dest || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.json({ ok: false, message: 'Invalid Origin, Destination or Date.' });
      }

      const passengers = [];
      for (let i = 0; i < adults; i++) passengers.push({ type: 'adult' });
      for (let i = 0; i < children; i++) passengers.push({ type: 'child' });
      for (let i = 0; i < infants; i++) passengers.push({ type: 'infant_without_seat' });

      const slices = [{ origin, destination: dest, departure_date: date }];
      if (tripType === 'roundtrip' && /^\d{4}-\d{2}-\d{2}$/.test(returnDate)) slices.push({ origin: dest, destination: origin, departure_date: returnDate });
      else if (tripType === 'multicity' && /^[A-Z]{3}$/.test(origin2) && /^[A-Z]{3}$/.test(dest2) && /^\d{4}-\d{2}-\d{2}$/.test(date2)) slices.push({ origin: origin2, destination: dest2, departure_date: date2 });

      const r = await fetchWithTimeout(['https:', '', ['api', 'duffel', 'com'].join('.'), 'air', 'offer_requests?return_offers=true'].join('/'), {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + DUFFEL_KEY, 'Duffel-Version': 'v2', 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ data: { slices, passengers, cabin_class: cabin } })
      }, 20000);
      const rawTxt = await r.text();
      let json = {}; try { json = JSON.parse(rawTxt); } catch (e) { return res.json({ ok: false, message: 'GDS Error (' + r.status + ')' }); }
      if (!r.ok || !json.data || !Array.isArray(json.data.offers) || !json.data.offers.length) {
        return res.json({ ok: false, message: (json.errors && json.errors[0] && json.errors[0].message) || 'No live flights found.' });
      }

      const POOL = [{ name: 'Emirates', code: 'EK', num: '623' }, { name: 'flydubai', code: 'FZ', num: '392' }, { name: 'PIA', code: 'PK', num: '221' }, { name: 'Saudia', code: 'SV', num: '737' }, { name: 'Qatar Airways', code: 'QR', num: '629' }];
      pruneOfferCache(DB);
      const nowTs = Date.now();
      const offers = json.data.offers.slice(0, 15).map((o, idx) => {
        const slice = o.slices && o.slices[0], segsRaw = (slice && slice.segments) || [], seg0 = segsRaw[0], segLast = segsRaw[segsRaw.length - 1];
        const stops = segsRaw.length ? segsRaw.length - 1 : 0, sim = POOL[idx % POOL.length];
        const rawAir = (seg0 && seg0.operating_carrier && seg0.operating_carrier.name) || (seg0 && seg0.marketing_carrier && seg0.marketing_carrier.name) || (o.owner && o.owner.name) || '';
        const isDummy = !rawAir || rawAir.toLowerCase().includes('duffel');
        const airline = isDummy ? sim.name : rawAir;
        const flightNo = isDummy ? `${sim.code}-${sim.num}` : (seg0 && seg0.marketing_carrier ? `${seg0.marketing_carrier.iata_code}-${seg0.marketing_carrier_flight_number}` : `${sim.code}-${sim.num}`);
        const depTime = seg0 && seg0.departing_at ? seg0.departing_at.replace('T', ' ').slice(0, 16) : (date + ' 04:15');
        const arrTime = segLast && segLast.arriving_at ? segLast.arriving_at.replace('T', ' ').slice(0, 16) : (date + ' 07:45');
        const farePKR = Math.round(Number(o.total_amount || 0) * (RATES_PKR[o.total_currency] || 280));
        const stdBag = extractDuffelBaggage(seg0);
        const baggageOptions = buildAirlineBaggageTiers(airline, stdBag, farePKR);
        const segments = segsRaw.map(sg => ({
          origin: (sg.origin && sg.origin.iata_code) || origin,
          dest: (sg.destination && sg.destination.iata_code) || dest,
          carrier: (sg.marketing_carrier && sg.marketing_carrier.name) || airline,
          flightNo: sg.marketing_carrier ? `${sg.marketing_carrier.iata_code}-${sg.marketing_carrier_flight_number}` : flightNo,
          dep: sg.departing_at ? sg.departing_at.replace('T', ' ').slice(0, 16) : depTime,
          arr: sg.arriving_at ? sg.arriving_at.replace('T', ' ').slice(0, 16) : arrTime,
          baggage: extractDuffelBaggage(sg)
        }));
        if (o.id && farePKR > 0) DB.offerCache[o.id] = { farePKR, baggageOptions, ts: nowTs };
        return {
          OfferID: o.id, Airline: airline, FlightNo: flightNo, Origin: origin, Dest: dest,
          Cabin: cabin.replace('_', ' ').toUpperCase(),
          Duration: formatDuffelDuration(slice && slice.duration),
          Route: tripType === 'roundtrip' ? `${origin} ⇄ ${dest}` : (tripType === 'multicity' ? `${origin}→${dest} / ${origin2}→${dest2}` : `${origin} → ${dest}`),
          Stops: stops === 0 ? 'Non-Stop Direct' : stops + ' Stop(s)',
          DepTime: depTime, ArrTime: arrTime, Baggage: stdBag, Luggage: stdBag,
          baggageOptions, segments, FarePKR: farePKR
        };
      });
      await saveDB(DB);
      return res.json({ ok: true, offers });
    }
// ====== END OF PART 2B — PASTE PART 2C DIRECTLY BELOW THIS LINE ======
  if (action === 'requestDeposit' || action === 'submitDeposit') {
      const amt = Math.round(Number(p.amountPKR || 0));
      const slipImg = String(p.slipImage || '').trim();
      if (!Number.isFinite(amt) || amt < 100 || amt > 50000000) {
        return res.json({ ok: false, message: 'Deposit must be between PKR 100 and 50,000,000.' });
      }
      if (slipImg.length > 450000 || !isSafeDataUrl(slipImg, true)) {
        return res.json({ ok: false, message: 'Invalid or oversized deposit slip.' });
      }
      const depId = 'DEP-' + crypto.randomInt(10000, 99999);
      const depObj = {
        DepositID: depId,
        CreatedAt: getPKTimeStr(),
        AgentEmail: email,
        AgencyName: a.AgencyName,
        BankName: String(p.bankName || 'UBL').trim().slice(0, 80),
        AmountPKR: amt,
        TxRef: String(p.txRef || p.refNo || ('SLIP-' + Date.now().toString().slice(-6))).trim().slice(0, 60),
        SlipImage: slipImg,
        Status: 'PENDING'
      };
      DB.deposits.unshift(depObj);
      addSecurityLog(DB, email, 'DEPOSIT_SUBMIT', `Submitted ${depId} for PKR ${amt.toLocaleString()}`, clientIp);
      await saveDB(DB);

      const receiptUrl = `${getBaseUrl(req)}/api/backend?action=viewReceipt&depositId=${encodeURIComponent(depId)}&sig=${signReceipt(depId, email)}`;
      const emailHtml = buildDepositEmailHtml(depObj, receiptUrl);
      const receiptPdfHtml = buildPrintableReceiptPage(depObj, false);
      await sendGasPair(
        { to: email, subject: `Deposit Slip Submitted [${depId}] PKR ${amt.toLocaleString()}`, htmlBody: emailHtml, pdfHtml: receiptPdfHtml, pdfName: `Receipt-${depId}.pdf`, bId: depId, agencyName: a.AgencyName },
        { to: uniqueEmails(DB.admins || []), subject: `[ADMIN] Deposit Slip [${depId}] PKR ${amt.toLocaleString()}`, htmlBody: emailHtml, pdfHtml: receiptPdfHtml, pdfName: `Receipt-${depId}.pdf`, bId: depId, agencyName: a.AgencyName }
      );
      return res.json({ ok: true, depositId: depId, message: 'Deposit slip submitted! Please contact Head Office.' });
    }

    if (action === 'addBooking') {
      expireStaleHolds(DB);
      pruneOfferCache(DB);

      const paxName = String(p.passengerName || '').trim().slice(0, 100);
      const ppNo = String(p.passportNo || '').trim().toUpperCase().replace(/\s+/g, '');
      if (paxName.length < 2 || !/^[A-Z0-9\-]{6,18}$/.test(ppNo)) {
        return res.json({ ok: false, message: 'Invalid Passenger Name or Passport / Document Number.' });
      }

      const category = String(p.category || '').trim();
      const fareId = String(p.fareId || '').trim();
      const offerId = String(p.offerId || p.OfferID || '').trim();
      let fare = 0, holdMins = 0, matchedFare = null;

      if (fareId) {
        matchedFare = DB.fares.find(f => String(f.ID) === fareId);
        if (!matchedFare) return res.json({ ok: false, message: 'Selected fare/package is no longer available.' });
        if (matchedFare.Category !== 'Visit Visa' && Number(matchedFare.Seats || 0) <= 0) {
          return res.json({ ok: false, message: 'Sorry, no seats left in this group.' });
        }
        fare = Number(matchedFare.FarePKR || 0);
        holdMins = clampInt(matchedFare.HoldMins, 5, 4320, 30);
      } else if (offerId) {
        const cached = DB.offerCache[offerId];
        if (cached && Number(cached.farePKR) > 0) {
          const reqFare = Math.round(Number(p.farePKR || 0));
          const tierMatch = Array.isArray(cached.baggageOptions) && cached.baggageOptions.find(t => Number(t.fare) === reqFare);
          fare = tierMatch ? Number(tierMatch.fare) : Number(cached.farePKR);
        } else if (DUFFEL_KEY) {
          const rOffer = await fetchWithTimeout(['https:', '', ['api', 'duffel', 'com'].join('.'), 'air', 'offers', encodeURIComponent(offerId)].join('/'), {
            headers: { Authorization: 'Bearer ' + DUFFEL_KEY, 'Duffel-Version': 'v2', Accept: 'application/json' }
          }, 12000);
          if (rOffer.ok) {
            const oj = await rOffer.json().catch(() => ({}));
            if (oj.data && oj.data.total_amount) fare = Math.round(Number(oj.data.total_amount) * (RATES_PKR[oj.data.total_currency] || 280));
          }
        }
        if (!Number.isFinite(fare) || fare <= 0) return res.json({ ok: false, message: 'Live flight offer expired. Please search again.' });
      } else {
        fare = Math.round(Number(p.farePKR || 0));
        if (!Number.isFinite(fare) || fare < (category === 'Visit Visa' ? 1000 : 5000)) {
          return res.json({ ok: false, message: 'Invalid fare amount.' });
        }
      }
      if (!Number.isFinite(fare) || fare <= 0) return res.json({ ok: false, message: 'Invalid fare amount.' });

      const passportDoc = String(p.passportDoc || '').trim(), photoDoc = String(p.photoDoc || '').trim();
      if (passportDoc.length > 500000 || photoDoc.length > 500000 || !isSafeDataUrl(passportDoc, true) || !isSafeDataUrl(photoDoc, false)) {
        return res.json({ ok: false, message: 'Invalid or oversized uploaded document.' });
      }

      const balBefore = Number(a.BalancePKR || 0);
      if (!isAdmin && balBefore < fare) {
        return res.json({ ok: false, message: `❌ Insufficient Wallet Balance! Available: PKR ${balBefore.toLocaleString()} | Fare: PKR ${fare.toLocaleString()}` });
      }
      if (matchedFare && matchedFare.Category !== 'Visit Visa') matchedFare.Seats = Number(matchedFare.Seats || 0) - 1;

      let deductedFromWallet = false, balAfter = balBefore;
      if (!isAdmin || balBefore >= fare) {
        balAfter = balBefore - fare;
        a.BalancePKR = balAfter;
        deductedFromWallet = true;
      }

      const itStr = String(p.itemTitle || '').trim().slice(0, 300);
      if (!holdMins) {
        const dMatch = itStr.match(/\{DATE:(\d{4}-\d{2}-\d{2})/), depMs = (dMatch && dMatch[1]) ? Date.parse(dMatch[1] + 'T12:00:00Z') : (Date.now() + 10 * 86400000), hrsToDep = (depMs - Date.now()) / 3600000;
        holdMins = 1440;
        if (hrsToDep <= 6) holdMins = 30;
        else if (hrsToDep <= 24) holdMins = 120;
        else if (/flyjinnah|airsial|airblue|serene|flydubai|airarabia|jazeera|salam/i.test(itStr)) holdMins = hrsToDep <= 72 ? 120 : 360;
        else if (hrsToDep <= 72) holdMins = 720;
        if (isAdmin && p.holdMins) holdMins = clampInt(p.holdMins, 5, 4320, holdMins);
      }

      const bId = 'GI-' + crypto.randomInt(100000, 999999), chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let autoPnr = ''; for (let i = 0; i < 6; i++) autoPnr += chars[crypto.randomInt(0, chars.length)];
      const holdUntil = Date.now() + (holdMins * 60 * 1000), pkTime = getPKTimeStr();
      const paxMailRaw = String(p.passengerEmail || '').trim(), paxMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paxMailRaw) ? paxMailRaw : '';

      const bkObj = {
        BookingID: bId, FareID: fareId, OfferID: offerId, CreatedAt: pkTime, HoldUntil: holdUntil,
        AgentEmail: email, AgencyName: a.AgencyName,
        Title: String(p.title || '').trim().slice(0, 15), Gender: String(p.gender || '').trim().slice(0, 15),
        SeatPref: String(p.seatPref || 'Any').trim().slice(0, 20), DocType: String(p.docType || 'Passport').trim().slice(0, 20),
        PassengerName: paxName, PassengerEmail: paxMail, PassportNo: ppNo, Dob: String(p.dob || '').slice(0, 20),
        PassportExpiry: String(p.passportExpiry || '').slice(0, 20), Nationality: String(p.nationality || 'Pakistani').slice(0, 50),
        PaxMobile: String(p.paxMobile || '').slice(0, 30), Category: category, ItemTitle: itStr,
        Adults: clampInt(p.adults, 1, 9, 1), Children: clampInt(p.children, 0, 6, 0), Infants: clampInt(p.infants, 0, 9, 0),
        FlightDate: String(p.flightDate || (matchedFare && matchedFare.TravelDate) || ''), DepTime: String(p.depTime || ''), ArrTime: String(p.arrTime || ''),
        Timing: String(p.timing || (matchedFare && matchedFare.Timing) || ''), Baggage: String(p.baggage || (matchedFare && matchedFare.Luggage) || ''),
        Meal: String(p.meal || (matchedFare && matchedFare.Meal) || ''), Stay: String(p.stay || (matchedFare && matchedFare.Stay) || ''), Details: String(p.details || (matchedFare && matchedFare.Details) || ''),
        FarePKR: fare, PaidAmountPKR: deductedFromWallet ? fare : 0, DeductedFromWallet: deductedFromWallet,
        PNR: autoPnr, TicketNo: '', PassportDoc: passportDoc, PhotoDoc: photoDoc,
        WasPaid: true, Refunded: false, RefundAmountPKR: 0, CancellationFeePKR: 0, Status: 'PENDING'
      };
      DB.bookings.unshift(bkObj);

      addLedgerEntry(DB, {
        CreatedAt: pkTime, AgentEmail: email, AgencyName: a.AgencyName, RefID: bId, BookingID: bId,
        Type: 'BOOKING_DEBIT', Direction: 'DEBIT', DebitPKR: fare, CreditPKR: 0, BalanceBefore: balBefore, BalanceAfter: balAfter,
        Description: `Ticket Booking (${autoPnr}): ${itStr.replace(/\s*\{[^}]+\}/g, '')} — ${paxName}`,
        Status: 'DEDUCTED', PerformedBy: email
      });
      addSecurityLog(DB, email, 'BOOKING_DEBIT', `${bId} (${autoPnr}) - PKR ${fare.toLocaleString()} deducted`, clientIp);
      await saveDB(DB);

      const skipEmail = p.skipEmail === true || p.skipEmail === 'true';
      let mailNote = '';
      if (!skipEmail) {
        const invoiceUrl = `${getBaseUrl(req)}/api/backend?action=viewInvoice&bookingId=${encodeURIComponent(bId)}&sig=${signInvoice(bId, ppNo)}`;
        mailNote = await sendBookingEmailsSeparate({
          adminEmails: DB.admins || [], subAgentEmail: email, paxEmail: paxMail, bId, dtStr: pkTime,
          agencyName: a.AgencyName, paxName, passportNo: ppNo, category, itemTitle: itStr, farePKR: fare,
          statusTxt: 'HOLD / PAID (PNR: ' + autoPnr + ')',
          opts: { invoiceUrl, isIssued: false, pnr: autoPnr, pdfHtml: buildPrintableInvoicePage(bkObj, a, matchedFare, false), bk: bkObj, agent: a, matchedFare }
        });
      }
      return res.json({ ok: true, bookingId: bId, pnr: autoPnr, holdUntil, newBalancePKR: Number(a.BalancePKR || 0), message: `Booking Created & PKR ${fare.toLocaleString()} Deducted! PNR: ${autoPnr}${mailNote}` });
    }

    if (action === 'adminIssueBooking') {
      if (!canIssue) return res.json({ ok: false, message: '⛔ Issue Authority required.' });
      const bk = DB.bookings.find(b => b.BookingID === p.bookingId);
      if (!bk) return res.json({ ok: false, message: 'Booking not found.' });
      const bkAg = String(bk.AgentEmail || '').toLowerCase();
      if (!isAdmin && bkAg !== email) return res.json({ ok: false, message: '⛔ Unauthorized booking.' });
      const curSt = String(bk.Status || '').toUpperCase();
      if (curSt === 'ISSUED' || curSt === 'CANCELED' || curSt === 'VOIDED') return res.json({ ok: false, message: 'Cannot issue this booking.' });

      const agentAcc = DB.agents[bkAg], fare = Number(bk.FarePKR || 0);
      if (!bk.WasPaid) {
        const balBefore = agentAcc ? Number(agentAcc.BalancePKR || 0) : 0;
        if (agentAcc && !DB.admins.includes(bkAg)) {
          if (balBefore < fare) return res.json({ ok: false, message: 'Insufficient wallet balance.' });
          agentAcc.BalancePKR = balBefore - fare; bk.DeductedFromWallet = true;
        }
        bk.WasPaid = true; bk.PaidAmountPKR = fare;
        addLedgerEntry(DB, { AgentEmail: bkAg, AgencyName: bk.AgencyName, RefID: bk.BookingID, BookingID: bk.BookingID, Type: 'TICKET_ISSUE_DEBIT', Direction: 'DEBIT', DebitPKR: fare, CreditPKR: 0, BalanceBefore: balBefore, BalanceAfter: agentAcc ? Number(agentAcc.BalancePKR || 0) : 0, Description: `Ticket Issued (${bk.PNR}): ${bk.ItemTitle}`, Status: 'ISSUED', PerformedBy: email });
      }
      if (p.pnr && String(p.pnr).trim()) bk.PNR = String(p.pnr).trim().toUpperCase().slice(0, 12);
      if (p.ticketNo && String(p.ticketNo).trim()) bk.TicketNo = String(p.ticketNo).trim().slice(0, 30);
      bk.Status = 'ISSUED'; bk.IssuedBy = email; bk.IssuedAt = getPKTimeStr(); bk.HoldUntil = 0;
      addSecurityLog(DB, email, 'TICKET_ISSUED', `${bk.BookingID} (${bk.PNR}) for ${bkAg}`, clientIp);
      await saveDB(DB);

      const matchedFare = bk.FareID ? DB.fares.find(f => String(f.ID) === String(bk.FareID)) : null;
      const invoiceUrl = `${getBaseUrl(req)}/api/backend?action=viewInvoice&bookingId=${encodeURIComponent(bk.BookingID)}&sig=${signInvoice(bk.BookingID, bk.PassportNo)}`;
      const mailNote = await sendBookingEmailsSeparate({ adminEmails: DB.admins || [], subAgentEmail: bk.AgentEmail, paxEmail: bk.PassengerEmail, bId: bk.BookingID, dtStr: bk.IssuedAt, agencyName: bk.AgencyName, paxName: bk.PassengerName, passportNo: bk.PassportNo, category: bk.Category, itemTitle: bk.ItemTitle, farePKR: fare, statusTxt: 'ISSUED', opts: { invoiceUrl, isIssued: true, pnr: bk.PNR, ticketNo: bk.TicketNo, pdfHtml: buildPrintableInvoicePage(bk, agentAcc, matchedFare, false), bk, agent: agentAcc, matchedFare } });
      return res.json({ ok: true, message: 'Ticket ISSUED & Confirmed! PNR: ' + bk.PNR + mailNote });
    }

    if (action === 'adminVoidBooking' || action === 'adminCancelBooking') {
      const isVoid = action === 'adminVoidBooking';
      if (isVoid && !canVoid) return res.json({ ok: false, message: '⛔ Void Authority required.' });
      if (!isVoid && !canCancel) return res.json({ ok: false, message: '⛔ Cancel Authority required.' });
      const bk = DB.bookings.find(b => b.BookingID === p.bookingId);
      if (!bk) return res.json({ ok: false, message: 'Booking not found.' });
      const bkAg = String(bk.AgentEmail || '').toLowerCase();
      if (!isAdmin && bkAg !== email) return res.json({ ok: false, message: '⛔ Unauthorized.' });
      const prevSt = String(bk.Status || '').toUpperCase();
      if (prevSt === 'VOIDED' || prevSt === 'CANCELED') return res.json({ ok: false, message: 'Already ' + prevSt });

      const fare = Math.max(0, Math.round(Number(bk.PaidAmountPKR || bk.FarePKR || 0)));
      const fee = isAdmin ? clampInt(p.cancellationFee || 0, 0, fare, 0) : 0;
      const refundAmt = Math.max(0, fare - fee), agentAcc = DB.agents[bkAg], nowStr = getPKTimeStr();

      if ((bk.WasPaid || prevSt === 'CONFIRMED' || prevSt === 'ISSUED') && !bk.Refunded) {
        const balBefore = agentAcc ? Number(agentAcc.BalancePKR || 0) : 0;
        let balAfter = balBefore;
        if (agentAcc && (!DB.admins.includes(bkAg) || bk.DeductedFromWallet)) { balAfter = balBefore + refundAmt; agentAcc.BalancePKR = balAfter; }
        bk.Refunded = true; bk.RefundAmountPKR = refundAmt; bk.CancellationFeePKR = fee;
        addLedgerEntry(DB, { CreatedAt: nowStr, AgentEmail: bkAg, AgencyName: bk.AgencyName, RefID: bk.BookingID, BookingID: bk.BookingID, Type: isVoid ? 'VOID_REFUND' : 'CANCEL_REFUND', Direction: 'CREDIT', DebitPKR: 0, CreditPKR: refundAmt, BalanceBefore: balBefore, BalanceAfter: balAfter, Description: `${isVoid ? 'Void Refund' : 'Cancel Refund'}${fee > 0 ? ` (Fee ${fee.toLocaleString()})` : ''}: ${String(bk.ItemTitle || '').replace(/\s*\{[^}]+\}/g, '')} — ${bk.PassengerName}`, Status: 'REFUNDED', PerformedBy: email });
      }
      if (bk.FareID && bk.Category !== 'Visit Visa') { const mf = DB.fares.find(f => String(f.ID) === String(bk.FareID)); if (mf) mf.Seats = Number(mf.Seats || 0) + 1; }
      bk.Status = isVoid ? 'VOIDED' : 'CANCELED'; if (isVoid) { bk.VoidedBy = email; bk.VoidedAt = nowStr; } else { bk.CanceledBy = email; bk.CanceledAt = nowStr; }
      bk.HoldUntil = 0;
      addSecurityLog(DB, email, bk.Status, `${bk.BookingID} (${bkAg}) Refund: PKR ${refundAmt.toLocaleString()} (Fee: ${fee})`, clientIp);
      await saveDB(DB);

      const matchedFare = bk.FareID ? DB.fares.find(f => String(f.ID) === String(bk.FareID)) : null;
      const invoiceUrl = `${getBaseUrl(req)}/api/backend?action=viewInvoice&bookingId=${encodeURIComponent(bk.BookingID)}&sig=${signInvoice(bk.BookingID, bk.PassportNo)}`;
      await sendBookingEmailsSeparate({ adminEmails: DB.admins || [], subAgentEmail: bk.AgentEmail, paxEmail: bk.PassengerEmail, bId: bk.BookingID, dtStr: nowStr, agencyName: bk.AgencyName, paxName: bk.PassengerName, passportNo: bk.PassportNo, category: bk.Category, itemTitle: bk.ItemTitle, farePKR: bk.FarePKR, statusTxt: bk.Status, opts: { invoiceUrl, isVoided: isVoid, isCanceled: !isVoid, pnr: bk.PNR, pdfHtml: buildPrintableInvoicePage(bk, agentAcc, matchedFare, false), bk, agent: agentAcc, matchedFare } });
      return res.json({ ok: true, refundAmountPKR: refundAmt, newBalancePKR: agentAcc ? Number(agentAcc.BalancePKR || 0) : 0, message: `Booking ${bk.Status} & PKR ${refundAmt.toLocaleString()} Refunded to Wallet!` });
    }

    if (action === 'adminDeleteBooking' && isAdmin) {
      const before = DB.bookings.length; DB.bookings = DB.bookings.filter(b => b.BookingID !== p.bookingId);
      if (DB.bookings.length === before) return res.json({ ok: false, message: 'Booking not found.' });
      addSecurityLog(DB, email, 'DELETE_BOOKING', `Deleted ${p.bookingId}`, clientIp);
      await saveDB(DB);
      return res.json({ ok: true, message: 'Booking deleted!' });
    }

    if (action === 'adminAddFare' && isAdmin) {
      const fareVal = Math.round(Number(p.farePKR || 0));
      if (!p.title || !Number.isFinite(fareVal) || fareVal <= 0) return res.json({ ok: false, message: 'Valid title & fare required.' });
      DB.fares.unshift({ ID: 'FARE-' + Date.now(), Category: p.category || 'Group Flight', Title: String(p.title).trim(), Timing: String(p.timing || 'As per Schedule').trim(), Luggage: String(p.luggage || '30 KG + 7 KG').trim(), Meal: String(p.meal || 'Included').trim(), Stay: String(p.stay || 'Direct').trim(), Details: String(p.details || '').trim(), TravelDate: String(p.travelDate || '').trim(), Seats: clampInt(p.seats, 0, 500, 15), HoldMins: clampInt(p.holdMins, 5, 4320, 30), FarePKR: fareVal, Status: 'ACTIVE' });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Fare/Package published!' });
    }

    if (action === 'adminDeleteFare' && isAdmin) { DB.fares = DB.fares.filter(f => String(f.ID) !== String(p.fareId)); await saveDB(DB); return res.json({ ok: true, message: 'Fare removed!' }); }
    if (action === 'adminAddBank' && isAdmin) {
      if (!p.bankName || !p.accountNumber) return res.json({ ok: false, message: 'Bank & Account Number required.' });
      DB.banks.push({ BankID: 'BNK-' + Date.now(), BankName: String(p.bankName).trim(), AccountTitle: String(p.accountTitle || '').trim(), AccountNumber: String(p.accountNumber).trim(), IBAN: String(p.iban || '').trim() });
      await saveDB(DB); return res.json({ ok: true, message: 'Bank account added!' });
    }
    if (action === 'adminDeleteBank' && isAdmin) {
      DB.banks = DB.banks.filter((b, idx) => (p.bankId && b.BankID) ? String(b.BankID) !== String(p.bankId) : (p.accountNumber ? String(b.AccountNumber) !== String(p.accountNumber) : String(idx) !== String(p.index)));
      await saveDB(DB); return res.json({ ok: true, message: 'Bank removed!' });
    }

    if (action === 'adminManageAgent' && isAdmin) {
      const targetEmail = String(p.targetEmail || '').trim().toLowerCase(), target = DB.agents[targetEmail];
      if (!target) return res.json({ ok: false, message: 'Agent not found.' });
      if (p.subAction === 'APPROVE') { target.Status = 'APPROVED'; target.FailedAttempts = 0; target.TotpFailedAttempts = 0; addSecurityLog(DB, targetEmail, 'APPROVE_AGENT', `Approved by ${email}`, clientIp); await saveDB(DB); return res.json({ ok: true, message: 'Agent Approved!' }); }
      const authMap = { GRANT_ISSUE: ['CanIssue', true], REVOKE_ISSUE: ['CanIssue', false], GRANT_VOID: ['CanVoid', true], REVOKE_VOID: ['CanVoid', false], GRANT_CANCEL: ['CanCancel', true], REVOKE_CANCEL: ['CanCancel', false] };
      if (authMap[p.subAction]) { const [fld, val] = authMap[p.subAction]; target[fld] = val; addSecurityLog(DB, targetEmail, p.subAction, `Changed by ${email}`, clientIp); await saveDB(DB); return res.json({ ok: true, message: `Updated ${p.subAction} for ${target.AgencyName}` }); }
      if (p.subAction === 'BLOCK') { target.Status = 'BLOCKED'; target.SessionToken = ''; target.SessionExpiry = 0; addSecurityLog(DB, targetEmail, 'BLOCK_AGENT', `Blocked by ${email}`, clientIp); }
      else if (p.subAction === 'FORCE_LOGOUT') { target.SessionToken = ''; target.SessionExpiry = 0; addSecurityLog(DB, targetEmail, 'FORCE_LOGOUT', `Kicked by ${email}`, clientIp); }
      else if (p.subAction === 'ADD_LIMIT' || p.subAction === 'DEDUCT_LIMIT') {
        const isAdd = p.subAction === 'ADD_LIMIT', amt = Math.round(Number(p.amountPKR || 0));
        if (!Number.isFinite(amt) || amt <= 0) return res.json({ ok: false, message: 'Enter valid positive PKR amount.' });
        const balBefore = Number(target.BalancePKR || 0);
        if (!isAdd && balBefore < amt) return res.json({ ok: false, message: `Cannot deduct PKR ${amt.toLocaleString()} (Wallet: PKR ${balBefore.toLocaleString()}).` });
        const balAfter = isAdd ? (balBefore + amt) : (balBefore - amt), nowStr = getPKTimeStr(), refId = (isAdd ? 'LIM-' : 'DED-') + crypto.randomInt(10000, 99999);
        target.BalancePKR = balAfter;
        if (isAdd) DB.deposits.unshift({ DepositID: refId, CreatedAt: nowStr, ApprovedAt: nowStr, ApprovedBy: email, AgentEmail: targetEmail, AgencyName: target.AgencyName, BankName: 'Head Office Direct Limit', AmountPKR: amt, TxRef: 'ADMIN-LIMIT', SlipImage: '', Status: 'APPROVED' });
        const reason = String(p.reason || (isAdd ? 'Head Office Limit Added' : 'Head Office Deduction')).trim().slice(0, 120);
        addLedgerEntry(DB, { CreatedAt: nowStr, AgentEmail: targetEmail, AgencyName: target.AgencyName, RefID: refId, BookingID: '', Type: isAdd ? 'LIMIT_CREDIT' : 'ADMIN_DEDUCT', Direction: isAdd ? 'CREDIT' : 'DEBIT', DebitPKR: isAdd ? 0 : amt, CreditPKR: isAdd ? amt : 0, BalanceBefore: balBefore, BalanceAfter: balAfter, Description: `${reason} (${isAdd ? '+' : '-'}PKR ${amt.toLocaleString()})`, Status: isAdd ? 'APPROVED' : 'DEDUCTED', PerformedBy: email });
        addSecurityLog(DB, targetEmail, p.subAction, `PKR ${amt.toLocaleString()} (${reason}) by ${email}`, clientIp);
        await saveDB(DB);
        return res.json({ ok: true, message: `✅ PKR ${amt.toLocaleString()} ${isAdd ? 'Added' : 'Deducted'} & Ledger Updated!` });
      } else if (p.subAction === 'RESET_PASSWORD') {
        const np = String(p.newPassword || ''); if (np.length < 6) return res.json({ ok: false, message: 'Min 6 chars required.' });
        target.PasswordHash = hashPwd(np); target.TotpSecret = generateSecret(); target.TotpVerified = 'NO'; target.Status = 'APPROVED'; target.FailedAttempts = 0; target.TotpFailedAttempts = 0; target.SessionToken = '';
        addSecurityLog(DB, targetEmail, 'RESET_PASSWORD', `Password & 2FA reset by ${email}`, clientIp);
      } else return res.json({ ok: false, message: 'Invalid sub-action.' });
      await saveDB(DB); return res.json({ ok: true, message: 'Agent updated: ' + p.subAction });
    }

    if (action === 'adminApproveDeposit' && isAdmin) {
      const dep = DB.deposits.find(d => String(d.DepositID) === String(p.depositId));
      if (!dep || String(dep.Status || '').toUpperCase() !== 'PENDING') return res.json({ ok: false, message: 'Deposit not found or already processed.' });
      const amt = Math.round(Number(dep.AmountPKR || 0)), nowStr = getPKTimeStr();
      dep.Status = 'APPROVED'; dep.ApprovedAt = nowStr; dep.ApprovedBy = email;
      const targetEmail = String(dep.AgentEmail || '').trim().toLowerCase(), target = DB.agents[targetEmail];
      const balBefore = target ? Number(target.BalancePKR || 0) : 0, balAfter = target ? (balBefore + amt) : 0;
      if (target) target.BalancePKR = balAfter;
      addLedgerEntry(DB, { CreatedAt: nowStr, AgentEmail: targetEmail, AgencyName: dep.AgencyName || (target && target.AgencyName) || '', RefID: dep.DepositID, BookingID: '', Type: 'DEPOSIT_CREDIT', Direction: 'CREDIT', DebitPKR: 0, CreditPKR: amt, BalanceBefore: balBefore, BalanceAfter: balAfter, Description: `Approved Deposit (${dep.BankName} • Ref: ${dep.TxRef})`, Status: 'APPROVED', PerformedBy: email });
      addSecurityLog(DB, targetEmail, 'DEPOSIT_APPROVE', `${dep.DepositID} PKR ${amt.toLocaleString()} approved by ${email}`, clientIp);
      await saveDB(DB);
      const receiptUrl = `${getBaseUrl(req)}/api/backend?action=viewReceipt&depositId=${encodeURIComponent(dep.DepositID)}&sig=${signReceipt(dep.DepositID, dep.AgentEmail)}`;
      await sendGasPair({ to: dep.AgentEmail, subject: `Deposit Approved [${dep.DepositID}] PKR ${amt.toLocaleString()}`, htmlBody: buildDepositEmailHtml(dep, receiptUrl), pdfHtml: buildPrintableReceiptPage(dep, false), pdfName: `Receipt-${dep.DepositID}.pdf`, bId: dep.DepositID, agencyName: dep.AgencyName }, { to: uniqueEmails(DB.admins || []), subject: `[ADMIN] Deposit Approved [${dep.DepositID}] PKR ${amt.toLocaleString()}`, htmlBody: buildDepositEmailHtml(dep, receiptUrl), pdfHtml: buildPrintableReceiptPage(dep, false), pdfName: `Receipt-${dep.DepositID}.pdf`, bId: dep.DepositID, agencyName: dep.AgencyName });
      return res.json({ ok: true, newBalancePKR: balAfter, message: `Deposit Approved & PKR ${amt.toLocaleString()} credited!` });
    }

    if (action === 'adminRejectDeposit' && isAdmin) {
      const dep = DB.deposits.find(d => String(d.DepositID) === String(p.depositId));
      if (!dep || String(dep.Status || '').toUpperCase() !== 'PENDING') return res.json({ ok: false, message: 'Pending deposit not found.' });
      dep.Status = 'REJECTED'; dep.RejectedAt = getPKTimeStr(); dep.RejectedBy = email; dep.RejectReason = String(p.reason || 'Rejected by Admin').slice(0, 160);
      addSecurityLog(DB, dep.AgentEmail, 'DEPOSIT_REJECT', `${dep.DepositID} rejected: ${dep.RejectReason}`, clientIp);
      await saveDB(DB);
      await sendGasPair({ to: dep.AgentEmail, subject: `Deposit Rejected [${dep.DepositID}]`, htmlBody: buildDepositEmailHtml(dep, ''), bId: dep.DepositID, agencyName: dep.AgencyName }, { to: uniqueEmails(DB.admins || []), subject: `[ADMIN] Deposit Rejected [${dep.DepositID}]`, htmlBody: buildDepositEmailHtml(dep, ''), bId: dep.DepositID, agencyName: dep.AgencyName });
      return res.json({ ok: true, message: `Deposit ${dep.DepositID} marked REJECTED.` });
    }

    return res.json({ ok: false, message: 'Invalid request' });
  } catch (err) {
    console.error('[Backend Error]', err);
    return res.status(200).json({ ok: false, message: 'Backend Error: ' + (err && err.message ? err.message : 'Server error') });
  }
};
