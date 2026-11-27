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
