const crypto = require('crypto');

const SB_HOST = ['https:', '', ['yxnygfbamkvzgskgoxoy', 'supabase', 'co'].join('.')].join('/');
const SB_URL = process.env.SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || SB_HOST;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.STORAGE_SUPABASE_ANON_KEY || '';
const DUFFEL_KEY = process.env.DUFFEL_API_KEY || '';
const GAS_URL = process.env.GAS_VOUCHER_URL || 'https://script.google.com/macros/s/AKfycbyw4rKuL8HLL7zrBjrYIzcxJs2ZLsOY2LcoM7lWQ4LPT0lmkDL0jbAr4vQIIArxofTGjQ/exec';
const INVOICE_SIGN_SECRET = process.env.INVOICE_SIGN_SECRET || 'GOLAN_INV_HMAC_2026_SECURE';

const DEFAULT_ADMINS = ['golaninternational322@gmail.com', 'sj3296521759@gmail.com', 'juttumer7754@gmail.com'];
const CITY_NAMES = {
  LYP: 'FAISALABAD', LHE: 'LAHORE', ISB: 'ISLAMABAD', KHI: 'KARACHI', MUX: 'MULTAN', SKT: 'SIALKOT',
  PEW: 'PESHAWAR', UET: 'QUETTA', JED: 'JEDDAH', MED: 'MADINAH', RUH: 'RIYADH', DMM: 'DAMMAM',
  DXB: 'DUBAI', SHJ: 'SHARJAH', AUH: 'ABU DHABI', DOH: 'DOHA', MCT: 'MUSCAT', SLL: 'SALALAH',
  KWI: 'KUWAIT', BAH: 'BAHRAIN', IST: 'ISTANBUL', LHR: 'LONDON', MAN: 'MANCHESTER', BHX: 'BIRMINGHAM',
  JFK: 'NEW YORK', YYZ: 'TORONTO', KUL: 'KUALA LUMPUR', BKK: 'BANGKOK', GYD: 'BAKU'
};
const RATES_PKR = { PKR: 1, USD: 280, EUR: 302, GBP: 355, SAR: 74.65, AED: 76.25 };
const RATE_LIMIT_MAP = new Map();

function checkRateLimit(key, maxHits = 30, windowMs = 60000) {
  const now = Date.now();
  const rec = RATE_LIMIT_MAP.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + windowMs; }
  rec.count++;
  RATE_LIMIT_MAP.set(key, rec);
  if (RATE_LIMIT_MAP.size > 2000) RATE_LIMIT_MAP.clear();
  return rec.count <= maxHits;
}

function getClientIp(req) {
  const xf = req && req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  return xf ? String(xf).split(',')[0].trim().slice(0, 45) : 'unknown';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

function timingSafeStrEqual(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8'), bufB = Buffer.from(String(b || ''), 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}
function legacyHashPwd(pwd) { return crypto.createHash('sha256').update('GOLAN_SALT_2026_' + String(pwd || '')).digest('hex'); }
function hashPwd(pwd) { const s = crypto.randomBytes(16).toString('hex'); return `scrypt$${s}$${crypto.scryptSync(String(pwd || ''), s, 64).toString('hex')}`; }
function verifyPwd(pwd, storedHash) {
  const s = String(storedHash || '');
  if (s.startsWith('scrypt$')) {
    const p = s.split('$');
    return p.length === 3 && timingSafeStrEqual(crypto.scryptSync(String(pwd || ''), p[1], 64).toString('hex'), p[2]);
  }
  return timingSafeStrEqual(legacyHashPwd(pwd), s);
}
function generateSecret() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', b = crypto.randomBytes(16);
  let s = ''; for (let i = 0; i < 16; i++) s += c[b[i] % c.length];
  return s;
}
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function isSafeDataUrl(str, allowPdf = false) {
  if (!str) return true;
  const s = String(str).trim();
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(s)) return true;
  return allowPdf && /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/i.test(s);
}
function signInvoice(bookingId, passportNo) {
  return crypto.createHmac('sha256', INVOICE_SIGN_SECRET).update(String(bookingId || '') + '|' + String(passportNo || '').toUpperCase()).digest('hex').slice(0, 24);
}
function signReceipt(depositId, agentEmail) {
  return crypto.createHmac('sha256', INVOICE_SIGN_SECRET).update('DEP|' + String(depositId || '') + '|' + String(agentEmail || '').toLowerCase()).digest('hex').slice(0, 24);
}
function getBaseUrl(req) {
  const host = (req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || 'golaninternational.vercel.app';
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) ? String(req.headers['x-forwarded-proto']).split(',')[0].trim() : 'https';
  return `${proto}://${host}`;
}
function uniqueEmails(list) {
  const out = [];
  (list || []).forEach(em => { const c = String(em || '').trim().toLowerCase(); if (c && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) && !out.includes(c)) out.push(c); });
  return out.join(',');
}
function clampInt(val, min, max, fallback) {
  const n = Math.round(Number(val));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function getNextMidnightPKT() {
  const nowPKT = new Date(Date.now() + 5 * 3600 * 1000);
  return Date.UTC(nowPKT.getUTCFullYear(), nowPKT.getUTCMonth(), nowPKT.getUTCDate() + 1, 0, 0, 0, 0) - 5 * 3600 * 1000;
}
function getPKTimeStr() { return new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi' }); }

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
        Email: 'golaninternational322@gmail.com', AgencyName: 'Golan International Head Office', City: 'Toba Tek Singh',
        Mobile: '0345-3326318', ContactPerson: 'Shan Chairman', Address: 'Head Office, Toba Tek Singh',
        VoucherBranding: 'golan', LogoDataUrl: '', PasswordHash: hashPwd(adminPass), TotpSecret: generateSecret(),
        TotpVerified: 'NO', Status: 'APPROVED', CanIssue: true, CanVoid: true, CanCancel: true,
        BalancePKR: 0, SessionToken: '', SessionExpiry: 0, FailedAttempts: 0, TotpFailedAttempts: 0
      }
    },
    fares: [
      { ID: 'F1', Category: 'Group Flight', Title: 'LHE - JED (Saudi Airlines SV-737)', Timing: 'Dep: 04:15 AM | Arr: 07:45 AM (Direct)', Luggage: '30 KG Check-in + 7 KG Hand Carry', Meal: 'Hot Halal Meal Included', Stay: 'Non-Stop Direct Flight', Details: 'Refundable Before 72 Hrs • Free Seat Selection', TravelDate: '25 Nov 2026', Seats: 18, HoldMins: 30, FarePKR: 138500, Status: 'ACTIVE' },
      { ID: 'F2', Category: 'Umrah Package', Title: '15 Days Economy Umrah Package', Timing: 'LHE-JED-LHE Return Flights Included', Luggage: '30 KG + 7 KG + 5L Zamzam', Meal: 'Breakfast Optional / Room Only', Stay: 'Makkah 7N (Shuttle) + Madinah 7N (Markazia)', Details: 'Umrah Visa + Full Ziyarat & AC Transport Included', TravelDate: '01 Dec 2026', Seats: 25, HoldMins: 60, FarePKR: 215000, Status: 'ACTIVE' }
    ],
    bookings: [], banks: [], deposits: [], ledger: [], securityLogs: [], offerCache: {}
  };
}

async function loadDB() {
  if (!SB_KEY) return globalThis.__FALLBACK_DB__ || (globalThis.__FALLBACK_DB__ = defaultState());
  const r = await fetchWithTimeout(`${SB_URL}/rest/v1/golan_store?id=eq.main&select=data`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }, 15000);
  if (!r.ok) throw new Error('Database read error (' + r.status + ')');
  const rows = await r.json();
  if (Array.isArray(rows) && rows.length > 0 && rows[0].data) return rows[0].data;
  if (Array.isArray(rows) && rows.length === 0) { const init = defaultState(); await saveDB(init); return init; }
  throw new Error('Unexpected database response.');
}

async function saveDB(db) {
  if (!SB_KEY) { globalThis.__FALLBACK_DB__ = db; return; }
  const r = await fetchWithTimeout(`${SB_URL}/rest/v1/golan_store`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: 'main', data: db })
  }, 15000);
  if (!r.ok) { const txt = await r.text().catch(() => ''); throw new Error('Database save failed (' + r.status + '): ' + txt.slice(0, 80)); }
}

function pruneOfferCache(DB) {
  DB.offerCache = DB.offerCache || {};
  const cutoff = Date.now() - 2 * 3600 * 1000;
  let changed = false;
  Object.keys(DB.offerCache).forEach(k => { if (!DB.offerCache[k] || Number(DB.offerCache[k].ts || 0) < cutoff) { delete DB.offerCache[k]; changed = true; } });
  return changed;
}

function expireStaleHolds(DB) {
  const now = Date.now();
  let changed = false;
  (DB.bookings || []).forEach(bk => {
    const st = String(bk.Status || '').toUpperCase(), holdUntil = Number(bk.HoldUntil || 0);
    if (st === 'PENDING' && holdUntil > 0 && now > holdUntil) {
      bk.Status = 'CANCELED'; bk.CancelReason = 'HOLD_EXPIRED'; bk.CanceledAt = getPKTimeStr(); bk.HoldUntil = 0;
      const agentEmail = String(bk.AgentEmail || '').toLowerCase(), agentAcc = DB.agents[agentEmail];
      const refundAmt = Math.max(0, Math.round(Number(bk.PaidAmountPKR || bk.FarePKR || 0)));
      if (bk.WasPaid && !bk.Refunded && refundAmt > 0) {
        const balBefore = agentAcc ? Number(agentAcc.BalancePKR || 0) : 0;
        let balAfter = balBefore;
        if (agentAcc && (!DB.admins.includes(agentEmail) || bk.DeductedFromWallet)) {
          balAfter = balBefore + refundAmt; agentAcc.BalancePKR = balAfter;
        }
        bk.Refunded = true; bk.RefundAmountPKR = refundAmt;
        addLedgerEntry(DB, {
          AgentEmail: agentEmail, AgencyName: bk.AgencyName || (agentAcc && agentAcc.AgencyName) || '',
          RefID: bk.BookingID, BookingID: bk.BookingID, Type: 'HOLD_EXPIRED_REFUND', Direction: 'CREDIT',
          DebitPKR: 0, CreditPKR: refundAmt, BalanceBefore: balBefore, BalanceAfter: balAfter,
          Description: `Auto-Refund (Hold Expired): ${bk.ItemTitle || bk.Category} — ${bk.PassengerName}`,
          Status: 'REFUNDED', PerformedBy: 'system'
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
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
  base32 = String(base32 || '').replace(/=+$/, '').toUpperCase();
  for (let i = 0; i < base32.length; i++) { const v = alphabet.indexOf(base32[i]); if (v >= 0) bits += v.toString(2).padStart(5, '0'); }
  const bytes = []; for (let j = 0; j + 8 <= bits.length; j += 8) bytes.push(parseInt(bits.substr(j, 8), 2));
  return Buffer.from(bytes);
}

function verifyTotp(secret, code) {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32ToBuffer(secret), epoch = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -1; offset <= 1; offset++) {
    const step = epoch + offset, buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(step / 0x100000000), 0); buf.writeUInt32BE(step >>> 0, 4);
    const hmac = crypto.createHmac('sha1', key).update(buf).digest(), off = hmac[hmac.length - 1] & 0x0f;
    const bin = ((hmac[off] & 0x7f) << 24) | ((hmac[off + 1] & 0xff) << 16) | ((hmac[off + 2] & 0xff) << 8) | (hmac[off + 3] & 0xff);
    if (timingSafeStrEqual(String(bin % 1000000).padStart(6, '0'), code)) return true;
  }
  return false;
}

function extractTicketMeta(bk, fareObj) {
  const raw = String((bk && bk.ItemTitle) || ''), meta = {}, m = raw.match(/\{([^}]+)\}/);
  if (m && m[1]) m[1].split('|').forEach(p => { const i = p.indexOf(':'); if (i > 0) meta[p.slice(0, i).trim().toUpperCase()] = p.slice(i + 1).trim(); });
  const fo = fareObj || {}, bagBr = raw.match(/\[([^\]]+)\]/), cleanTitle = raw.replace(/\s*\{[^}]+\}/g, '').trim();
  const dateVal = bk.FlightDate || meta.DATE || fo.TravelDate || fo.Date || '', depVal = bk.DepTime || meta.DEP || '', arrVal = bk.ArrTime || meta.ARR || '';
  let timingVal = bk.Timing || meta.TIMING || fo.Timing || '';
  if (!timingVal && (depVal || arrVal)) timingVal = (depVal ? ('Dep: ' + depVal) : '') + (arrVal ? (' -> Arr: ' + arrVal) : '');
  return { cleanTitle, date: dateVal, dep: depVal, arr: arrVal, timing: timingVal, baggage: bk.Baggage || meta.BAG || fo.Luggage || (bagBr ? bagBr[1] : '') || '20+5 KG', meal: bk.Meal || meta.MEAL || fo.Meal || 'Included', stay: bk.Stay || meta.STAY || fo.Stay || '', rules: bk.Details || meta.DETAILS || fo.Details || '' };
}
function getTicketAirlineMeta(txt) {
  const u = String(txt || '').toUpperCase();
  if (/SALAM|\bOV/i.test(u)) return { name: 'SalamAir', code: 'OV', color: '#008b8b' };
  if (/AIRSIAL|\bPF/i.test(u)) return { name: 'AirSial', code: 'PF', color: '#15803d' };
  if (/\bPIA\b|\bPK/i.test(u)) return { name: 'PIA', code: 'PK', color: '#166534' };
  if (/SAUDIA|\bSV/i.test(u)) return { name: 'Saudia Airlines', code: 'SV', color: '#065f46' };
  if (/AIRBLUE|\bPA/i.test(u)) return { name: 'Airblue', code: 'PA', color: '#1d4ed8' };
  if (/EMIRATES|\bEK/i.test(u)) return { name: 'Emirates', code: 'EK', color: '#b91c1c' };
  if (/FLYDUBAI|\bFZ/i.test(u)) return { name: 'flydubai', code: 'FZ', color: '#ea580c' };
  if (/QATAR|\bQR/i.test(u)) return { name: 'Qatar Airways', code: 'QR', color: '#881337' };
  return { name: 'Golan Group Flight', code: 'GL', color: '#134b91' };
}
function fmtTicketDate(d) {
  if (!d) return '-';
  const m = String(d).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) { const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))), days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], mos = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return `${days[dt.getUTCDay()]} ${dt.getUTCDate()} ${mos[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`; }
  return String(d);
}
function fmtTicketTime(v) {
  if (!v) return '--:--'; const s = String(v).trim(), ap = s.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i); if (ap) return ap[1].toUpperCase();
  const hm = s.match(/(?:^|[\sT])(\d{1,2}):(\d{2})/); if (hm) { const h = parseInt(hm[1], 10); return String(h % 12 || 12).padStart(2, '0') + ':' + hm[2] + ' ' + (h >= 12 ? 'PM' : 'AM'); }
  return s;
}
function parseTicketSegments(bk, fi) {
  const c = fi.cleanTitle || '', a = getTicketAirlineMeta(c + ' ' + fi.timing), rm = c.match(/\b([A-Z]{3})\s*[-–]\s*([A-Z]{3})\b/i), flm = c.match(/\b([A-Z]{2}[-\s]?\d{2,4})\b/i), times = String(fi.timing || '').match(/\d{1,2}:\d{2}(?:\s*(?:AM|PM))?/gi) || [];
  const oC = rm ? rm[1].toUpperCase() : 'GL', dC = rm ? rm[2].toUpperCase() : (bk.Category === 'Visit Visa' ? 'VISA' : 'DST');
  return { airlineInfo: a, segments: [{ oCode: oC, dCode: dC, origin: CITY_NAMES[oC] || oC, dest: CITY_NAMES[dC] || dC, airline: a.name, flightNo: flm ? flm[1].replace('-', ' ').toUpperCase() : (a.code + '-GRP'), depTime: fi.dep ? fmtTicketTime(fi.dep) : (times[0] ? fmtTicketTime(times[0]) : '--:--'), arrTime: fi.arr ? fmtTicketTime(fi.arr) : (times[1] ? fmtTicketTime(times[1]) : '--:--'), depDate: fmtTicketDate(fi.date), arrDate: fmtTicketDate(fi.date), baggage: fi.baggage || '20+5 KG' }] };
}

function buildBookingEmailHtml({ bk, agent, matchedFare, agencyName, paxName, farePKR, passportNo, invoiceUrl, isIssued, isVoided, isCanceled, pnr, itemTitle, bId, isAdminCopy, agentEmail }) {
  const bkData = bk || { BookingID: bId, PNR: pnr, AgencyName: agencyName, AgentEmail: agentEmail, PassengerName: paxName, PassportNo: passportNo, ItemTitle: itemTitle, FarePKR: farePKR, Status: isIssued ? 'ISSUED' : (isVoided ? 'VOIDED' : (isCanceled ? 'CANCELED' : 'PENDING')), CreatedAt: getPKTimeStr() };
  const fi = extractTicketMeta(bkData, matchedFare), sg = parseTicketSegments(bkData, fi).segments[0], st = String(bkData.Status || 'PENDING').toUpperCase();
  const stCol = (st === 'CONFIRMED' || st === 'ISSUED') ? '#15803d' : (st === 'VOIDED' ? '#9a3412' : (st === 'CANCELED' ? '#b91c1c' : '#b45309'));
  const admBar = isAdminCopy ? `<div style="background:#0b1f44;color:#fbbf24;padding:8px 14px;font-size:11px;font-weight:800;">ADMIN COPY • SUB-AGENT: ${escHtml(bkData.AgencyName)} (${escHtml(agentEmail || bkData.AgentEmail)}${agent && agent.Mobile ? ' • ' + escHtml(agent.Mobile) : ''})</div>` : '';
  return `<!DOCTYPE html><html><body style="margin:0;padding:14px;background:#eef2f7;font-family:Arial,sans-serif;"><div style="max-width:650px;margin:auto;background:#fff;border-radius:10px;border:1px solid #cbd5e1;overflow:hidden;">${admBar}<div style="padding:18px;"><h2 style="color:#0b1f44;margin:0 0 8px;border-bottom:2px solid #d97706;padding-bottom:8px;">Service Voucher • ${escHtml(bkData.BookingID)} (PNR: ${escHtml(bkData.PNR || 'PENDING')})</h2><p>Passenger: <b>${escHtml(bkData.PassengerName)}</b> (${escHtml(bkData.PassportNo)}) • Status: <b style="color:${stCol};">${escHtml(st)}</b></p><p><b>${escHtml(sg.oCode)} → ${escHtml(sg.dCode)}</b> • ${escHtml(sg.airline)} (${escHtml(sg.flightNo)}) • ${escHtml(sg.depDate)} ${escHtml(sg.depTime)}</p><p>Agency: <b>${escHtml(bkData.AgencyName)}</b> • Fare: <b style="color:#15803d;">PKR ${Number(bkData.FarePKR || 0).toLocaleString()}</b></p>${invoiceUrl ? `<p style="margin:16px 0;"><a href="${escHtml(invoiceUrl)}" target="_blank" style="background:#0b1f44;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;border:2px solid #d97706;">View / Print A4 Voucher PDF</a></p>` : ''}<p style="font-size:11px;color:#64748b;">Golan International Travel &amp; Tours (Toba Tek Singh) • 0345-3326318</p></div></div></body></html>`;
}

function buildPrintableInvoicePage(bk, agent, matchedFare, forBrowserPrint = true) {
  const fi = extractTicketMeta(bk, matchedFare), sg = parseTicketSegments(bk, fi).segments[0], st = String(bk.Status || 'PENDING').toUpperCase();
  const stCol = (st === 'CONFIRMED' || st === 'ISSUED') ? '#15803d' : (st === 'VOIDED' ? '#9a3412' : (st === 'CANCELED' ? '#b91c1c' : '#b45309'));
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Voucher - ${escHtml(bk.BookingID)}</title><style>@page{size:A4;margin:10mm;}body{font-family:Segoe UI,Arial,sans-serif;background:#eef2f7;padding:16px;}.a4{max-width:780px;margin:auto;background:#fff;padding:22px;border-radius:10px;border:1px solid #cbd5e1;}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px;}th{background:#0b1f44;color:#fff;padding:7px;text-align:left;}td{padding:7px;border:1px solid #cbd5e1;}@media print{.no-print{display:none!important;}body{background:#fff;padding:0;}}</style></head><body>${forBrowserPrint ? `<div class="no-print" style="text-align:center;margin-bottom:12px;"><button onclick="window.print()" style="background:#0b1f44;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-weight:800;cursor:pointer;">Print / Save PDF</button></div>` : ''}<div class="a4"><h2 style="color:#0b1f44;border-bottom:3px solid #d97706;padding-bottom:8px;">Service(s) Voucher / Electronic Ticket</h2><p>Ref: <b>${escHtml(bk.BookingID)}</b> | PNR: <b>${escHtml(bk.PNR || 'PENDING')}</b> | Status: <b style="color:${stCol};">${escHtml(st)}</b></p><p>Passenger: <b>${escHtml(bk.PassengerName)}</b> • Passport: <b>${escHtml(bk.PassportNo)}</b></p><table><thead><tr><th>Route</th><th>Airline / Flight</th><th>Departure</th><th>Baggage</th><th>Status</th></tr></thead><tbody><tr><td><b>${escHtml(sg.oCode)} → ${escHtml(sg.dCode)}</b></td><td>${escHtml(sg.airline)} (${escHtml(sg.flightNo)})</td><td>${escHtml(sg.depDate)} ${escHtml(sg.depTime)}</td><td>${escHtml(fi.baggage)}</td><td><b>${escHtml(st)}</b></td></tr></tbody></table><table><thead><tr><th>Agency</th><th>Email</th><th>Contact</th><th style="text-align:right;">Total</th></tr></thead><tbody><tr><td><b>${escHtml(bk.AgencyName)}</b></td><td>${escHtml(bk.AgentEmail)}</td><td>${escHtml((agent && agent.Mobile) || bk.PaxMobile || '-')}</td><td style="text-align:right;font-weight:900;color:#15803d;">PKR ${Number(bk.FarePKR || 0).toLocaleString()}</td></tr></tbody></table><p style="margin-top:14px;font-size:11px;color:#475569;">Golan International Travel &amp; Tours (Toba Tek Singh) • CEO Shan Chairman: 0345-3326318</p></div></body></html>`;
}

function buildPrintableReceiptPage(d, forBrowserPrint = true) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt - ${escHtml(d.DepositID)}</title></head><body style="font-family:Segoe UI,Arial,sans-serif;background:#eef2f7;padding:24px;">${forBrowserPrint ? `<div style="text-align:center;margin-bottom:12px;"><button onclick="window.print()" style="background:#0b1f44;color:#fff;border:none;padding:9px 20px;border-radius:8px;font-weight:800;cursor:pointer;">Print Receipt</button></div>` : ''}<div style="max-width:460px;margin:auto;background:#fff;border-radius:16px;padding:22px;border:1px solid #cbd5e1;"><h2 style="color:#0b1f44;">Payment Receipt</h2><p><b>ID:</b> ${escHtml(d.DepositID)} | <b>Date:</b> ${escHtml(d.CreatedAt)}</p><p><b>Sub-Agent:</b> ${escHtml(d.AgencyName || d.AgentEmail)}</p><p><b>Bank:</b> ${escHtml(d.BankName)}</p><p><b>Ref:</b> ${escHtml(d.TxRef)}</p><p><b>Status:</b> ${escHtml(d.Status)}</p><h2 style="color:#15803d;">PKR ${Number(d.AmountPKR || 0).toLocaleString()}</h2></div></body></html>`;
}

function buildDepositEmailHtml(d, receiptUrl) {
  const st = String(d.Status || 'PENDING').toUpperCase();
  return `<!DOCTYPE html><html><body style="padding:20px;background:#eef2f7;font-family:Arial,sans-serif;"><div style="max-width:580px;margin:auto;background:#fff;border-radius:12px;padding:20px;border:1px solid #cbd5e1;"><h2 style="color:#0b1f44;">Deposit ${escHtml(st)} [${escHtml(d.DepositID)}]</h2><p>Agency: <b>${escHtml(d.AgencyName)}</b> (${escHtml(d.AgentEmail)})</p><p>Bank: ${escHtml(d.BankName)} • Ref: ${escHtml(d.TxRef)}</p><p>Amount: <b style="color:#15803d;">PKR ${Number(d.AmountPKR || 0).toLocaleString()}</b></p>${receiptUrl ? `<p><a href="${escHtml(receiptUrl)}" target="_blank">View PDF Receipt</a></p>` : ''}</div></body></html>`;
}

function sleepMs(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sendGasEmail(payload) {
  const { to, subject, htmlBody, pdfHtml, pdfName, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt, invoiceUrl, adminCopy } = payload || {};
  if (!to || !GAS_URL) return { ok: false, batchHandled: false };
  const bodyPayload = JSON.stringify({ action: 'sendVoucherHtml', to, subject: subject || 'Golan International Notification', senderName: 'GOLAN INTERNATIONAL TRAVEL & TOURS', htmlBody: htmlBody || '', pdfHtml: pdfHtml || '', pdfName: pdfName || ('Voucher-' + (bId || Date.now()) + '.pdf'), invoiceUrl: invoiceUrl || '', bId: bId || '', dtStr: dtStr || getPKTimeStr(), agencyName: agencyName || '', paxName: paxName || '', passportNo: passportNo || '', category: category || '', itemTitle: itemTitle || '', farePKR: farePKR || 0, statusTxt: statusTxt || '', adminCopy: adminCopy || null });
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const postRes = await fetchWithTimeout(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'follow', body: bodyPayload }, 25000);
      const postTxt = await postRes.text();
      if (postTxt.indexOf('"ok":true') !== -1 || postTxt.indexOf('true') !== -1) {
        let parsed = null; try { parsed = JSON.parse(postTxt); } catch (e) {}
        return { ok: true, batchHandled: !!(parsed && parsed.batchHandled === true) };
      }
    } catch (e) {}
    if (attempt < 2) await sleepMs(400);
  }
  return { ok: false, batchHandled: false };
}

async function sendGasPair(primaryPayload, secondaryPayload) {
  const hasP = !!(primaryPayload && primaryPayload.to), hasS = !!(secondaryPayload && secondaryPayload.to);
  if (!hasP && !hasS) return false;
  if (hasP) {
    const r1 = await sendGasEmail({ ...primaryPayload, adminCopy: hasS ? { to: secondaryPayload.to, subject: secondaryPayload.subject, htmlBody: secondaryPayload.htmlBody } : null });
    if (r1.ok && (!hasS || r1.batchHandled)) return true;
    if (hasS) { await sleepMs(250); const r2 = await sendGasEmail(secondaryPayload); return !!(r1.ok || r2.ok); }
    return !!r1.ok;
  }
  return !!(await sendGasEmail(secondaryPayload)).ok;
}

async function sendBookingEmailsSeparate({ adminEmails, subAgentEmail, paxEmail, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt, opts }) {
  const o = opts || {}, invoiceUrl = o.invoiceUrl || '', isIssued = !!o.isIssued, isVoided = !!o.isVoided, isCanceled = !!o.isCanceled, pnr = o.pnr || 'PENDING', pdfHtml = o.pdfHtml || '';
  const subj = isIssued ? `Service Voucher CONFIRMED - ${bId} (PNR: ${pnr})` : (isVoided ? `Ticket Voided - ${bId}` : (isCanceled ? `Booking Canceled - ${bId}` : `Service Voucher (HOLD) - ${bId} (PNR: ${pnr})`));
  const subTo = uniqueEmails([subAgentEmail, paxEmail]), admTo = uniqueEmails(adminEmails || []), pdfName = `ServiceVoucher-${bId}.pdf`;
  const p1 = subTo ? { to: subTo, subject: subj, htmlBody: buildBookingEmailHtml({ bk: o.bk, agent: o.agent, matchedFare: o.matchedFare, agencyName, paxName, farePKR, passportNo, invoiceUrl, isIssued, isVoided, isCanceled, pnr, itemTitle, bId, isAdminCopy: false, agentEmail: subAgentEmail }), pdfHtml, pdfName, invoiceUrl, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt } : null;
  const p2 = admTo ? { to: admTo, subject: `[ADMIN COPY] ${subj} | ${agencyName || 'Partner'}`, htmlBody: buildBookingEmailHtml({ bk: o.bk, agent: o.agent, matchedFare: o.matchedFare, agencyName, paxName, farePKR, passportNo, invoiceUrl, isIssued, isVoided, isCanceled, pnr, itemTitle, bId, isAdminCopy: true, agentEmail: subAgentEmail }), pdfHtml, pdfName, invoiceUrl, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt } : null;
  return (await sendGasPair(p1, p2)) ? ' | Email: SENT' : '';
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
      try { bodyObj = JSON.parse(req.body); } catch (e) { return res.status(400).json({ ok: false, message: 'Invalid JSON body.' }); }
    }
    const q = req.query || {}, action = String((bodyObj.action != null ? bodyObj.action : q.action) || '').trim();
    const READ_GET_ACTIONS = new Set(['viewInvoice', 'viewReceipt', 'checkSession', 'getDashboardData', 'getDashboard', 'adminGetAttachment']);
    if (req.method !== 'POST' && !READ_GET_ACTIONS.has(action)) return res.status(405).json({ ok: false, message: 'Method Not Allowed.' });

    const p = req.method === 'POST' ? Object.assign({}, bodyObj, { action }) : Object.assign({}, q, bodyObj);
    const email = String(p.email || '').trim().toLowerCase();

    const DB = await loadDB();
    DB.admins = (DB.admins || []).map(x => String(x || '').trim().toLowerCase()).filter(Boolean);
    DB.agents = DB.agents || {};
    DB.fares = DB.fares || []; DB.bookings = DB.bookings || []; DB.banks = DB.banks || []; DB.deposits = DB.deposits || []; DB.ledger = DB.ledger || []; DB.securityLogs = DB.securityLogs || []; DB.offerCache = DB.offerCache || {};

    const adminDefaultPass = process.env.ADMIN_DEFAULT_PASS || 'Golan@786';
    let adminSynced = false;
    DEFAULT_ADMINS.forEach(adm => {
      if (!DB.admins.includes(adm)) { DB.admins.push(adm); adminSynced = true; }
      if (!DB.agents[adm]) {
        DB.agents[adm] = { Email: adm, AgencyName: 'Golan International Head Office', City: 'Toba Tek Singh', Mobile: '0345-3326318', ContactPerson: 'Head Office Admin', Address: 'Head Office, Toba Tek Singh', VoucherBranding: 'golan', LogoDataUrl: '', PasswordHash: hashPwd(adminDefaultPass), TotpSecret: generateSecret(), TotpVerified: 'NO', Status: 'APPROVED', CanIssue: true, CanVoid: true, CanCancel: true, BalancePKR: 0, SessionToken: '', SessionExpiry: 0, FailedAttempts: 0, TotpFailedAttempts: 0 };
        adminSynced = true;
      } else if (DB.agents[adm].Status !== 'APPROVED' || !DB.agents[adm].CanIssue || !DB.agents[adm].CanVoid || !DB.agents[adm].CanCancel) {
        DB.agents[adm].Status = 'APPROVED'; DB.agents[adm].CanIssue = true; DB.agents[adm].CanVoid = true; DB.agents[adm].CanCancel = true; adminSynced = true;
      }
    });
    if (adminSynced) await saveDB(DB);

    if (action === 'viewInvoice') {
      const bk = DB.bookings.find(b => b.BookingID === String(p.bookingId || '').trim());
      if (!bk || !timingSafeStrEqual(String(p.sig || '').trim(), signInvoice(bk.BookingID, bk.PassportNo))) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(403).end('<h3 style="font-family:Arial;text-align:center;margin-top:40px;color:#b91c1c;">Invalid or Expired Ticket Link</h3>');
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).end(buildPrintableInvoicePage(bk, DB.agents[bk.AgentEmail] || null, bk.FareID ? DB.fares.find(f => String(f.ID) === String(bk.FareID)) : null));
    }

    if (action === 'viewReceipt') {
      const dep = DB.deposits.find(d => d.DepositID === String(p.depositId || '').trim());
      if (!dep || !timingSafeStrEqual(String(p.sig || '').trim(), signReceipt(dep.DepositID, dep.AgentEmail))) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(403).end('<h3 style="font-family:Arial;text-align:center;margin-top:40px;color:#b91c1c;">Invalid or Expired Receipt Link</h3>');
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).end(buildPrintableReceiptPage(dep));
    }

    if (action === 'register') {
      if (!checkRateLimit('REG_' + clientIp, 6, 300000)) return res.json({ ok: false, message: 'Too many registration attempts. Try later.' });
      const agencyName = String(p.agencyName || '').trim().slice(0, 120), city = String(p.city || '').trim().slice(0, 60), mobile = String(p.mobile || '').trim().slice(0, 30), pwd = String(p.password || '');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json({ ok: false, message: 'Enter valid email.' });
      if (!agencyName || pwd.length < 6) return res.json({ ok: false, message: 'Agency name and password (min 6 chars) required.' });
      if (DB.agents[email]) return res.json({ ok: false, message: 'Email already registered.' });
      const isSuperReg = DB.admins.includes(email);
      DB.agents[email] = { Email: email, AgencyName: agencyName, City: city, Mobile: mobile, ContactPerson: '', Address: '', VoucherBranding: 'custom', LogoDataUrl: '', PasswordHash: hashPwd(pwd), TotpSecret: generateSecret(), TotpVerified: 'NO', Status: isSuperReg ? 'APPROVED' : 'PENDING', CanIssue: isSuperReg, CanVoid: isSuperReg, CanCancel: isSuperReg, BalancePKR: 0, SessionToken: '', SessionExpiry: 0, FailedAttempts: 0, TotpFailedAttempts: 0 };
      addSecurityLog(DB, email, 'REGISTER', `New Agency: ${agencyName} (${city})`, clientIp);
      await saveDB(DB);
      const regBody = `<div style="font-family:Arial,sans-serif;padding:20px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;"><h2>New Sub-Agent Registration</h2><p><b>Agency:</b> ${escHtml(agencyName)}</p><p><b>Email:</b> ${escHtml(email)}</p><p><b>City:</b> ${escHtml(city)} | <b>Mobile:</b> ${escHtml(mobile)}</p></div>`;
      await sendGasPair({ to: email, subject: `Registration Received: ${agencyName}`, htmlBody: regBody, agencyName }, { to: uniqueEmails(DB.admins || []), subject: `[ADMIN] New Sub-Agent: ${agencyName}`, htmlBody: regBody, agencyName });
      return res.json({ ok: true, message: isSuperReg ? 'Admin approved! Login & scan 2FA QR.' : 'Submitted! Contact CEO Shan Chairman (0345-3326318) for approval.' });
    }

    if (action === 'loginStep1') {
      if (!checkRateLimit('L1_' + clientIp + '_' + email, 12, 300000)) return res.json({ ok: false, message: 'Too many login attempts. Wait 5 minutes.' });
      const a = DB.agents[email];
      if (!a) return res.json({ ok: false, message: 'Agent email not found.' });
      const isSuper = DB.admins.includes(email);
      if (isSuper) { a.Status = 'APPROVED'; a.CanIssue = true; a.CanVoid = true; a.CanCancel = true; a.FailedAttempts = 0; a.TotpFailedAttempts = 0; }
      if (a.Status === 'BLOCKED') return res.json({ ok: false, message: 'Account BLOCKED by Head Office.' });
      if (a.Status !== 'APPROVED') return res.json({ ok: false, message: 'Account PENDING approval from Admin.' });
      const pwd = String(p.password || '');
      if (!verifyPwd(pwd, a.PasswordHash)) {
        if (!isSuper) { a.FailedAttempts = (a.FailedAttempts || 0) + 1; if (a.FailedAttempts >= 5) a.Status = 'BLOCKED'; }
        addSecurityLog(DB, email, 'LOGIN_FAIL', `Wrong password (Attempt ${a.FailedAttempts || 1})`, clientIp);
        await saveDB(DB);
        return res.json({ ok: false, message: 'Invalid password.' });
      }
      if (!String(a.PasswordHash || '').startsWith('scrypt$')) a.PasswordHash = hashPwd(pwd);
      a.FailedAttempts = 0; await saveDB(DB);
      return res.json({ ok: true, needQrSetup: a.TotpVerified !== 'YES', secret: a.TotpVerified !== 'YES' ? a.TotpSecret : '' });
    }

    if (action === 'verifyTotp') {
      if (!checkRateLimit('2FA_' + clientIp + '_' + email, 12, 300000)) return res.json({ ok: false, message: 'Too many 2FA attempts. Wait 5 minutes.' });
      const a = DB.agents[email], isSuper = DB.admins.includes(email);
      if (!a || a.Status !== 'APPROVED') return res.json({ ok: false, message: 'Account not approved or blocked.' });
      if (!verifyTotp(a.TotpSecret, String(p.code || '').trim())) {
        if (!isSuper) { a.TotpFailedAttempts = (a.TotpFailedAttempts || 0) + 1; if (a.TotpFailedAttempts >= 5) a.Status = 'BLOCKED'; }
        addSecurityLog(DB, email, '2FA_FAIL', `Invalid 2FA code (Attempt ${a.TotpFailedAttempts || 1})`, clientIp);
        await saveDB(DB);
        return res.json({ ok: false, message: 'Invalid 6-digit Google Authenticator code.' });
      }
      const token = crypto.randomUUID(), expiry = getNextMidnightPKT();
      a.TotpVerified = 'YES'; a.TotpFailedAttempts = 0; a.SessionToken = token; a.SessionExpiry = expiry; a.LastLoginAt = getPKTimeStr();
      addSecurityLog(DB, email, 'LOGIN_OK', `2FA Verified (${a.AgencyName})`, clientIp);
      await saveDB(DB);
      return res.json({ ok: true, token, expiry, agencyName: a.AgencyName, isAdmin: isSuper, canIssue: isSuper || !!a.CanIssue, canVoid: isSuper || !!a.CanVoid, canCancel: isSuper || !!a.CanCancel });
    }

    const a = DB.agents[email];
    if (!a || a.Status !== 'APPROVED' || !a.SessionToken || !timingSafeStrEqual(a.SessionToken, p.token) || Date.now() >= Number(a.SessionExpiry || 0)) {
      return res.json({ ok: false, message: 'Session expired or revoked. Please login with 2FA again.' });
    }
    const isAdmin = DB.admins.includes(email), canIssue = isAdmin || !!a.CanIssue, canVoid = isAdmin || !!a.CanVoid, canCancel = isAdmin || !!a.CanCancel;

    if (action === 'checkSession') return res.json({ ok: true, agencyName: a.AgencyName, isAdmin, canIssue, canVoid, canCancel, expiry: a.SessionExpiry });

    if (action === 'updateProfile') {
      const agencyName = String(p.agencyName || '').trim().slice(0, 120), logoDataUrl = String(p.logoDataUrl || '').trim();
      if (!agencyName) return res.json({ ok: false, message: 'Agency Name required.' });
      if (logoDataUrl.length > 350000 || !isSafeDataUrl(logoDataUrl, false)) return res.json({ ok: false, message: 'Invalid or oversized logo.' });
      a.AgencyName = agencyName; a.City = String(p.city || a.City || '').trim().slice(0, 60); a.Mobile = String(p.mobile || a.Mobile || '').trim().slice(0, 30);
      a.ContactPerson = String(p.contactPerson || '').trim().slice(0, 80); a.Address = String(p.address || '').trim().slice(0, 200);
      a.VoucherBranding = p.voucherBranding === 'golan' ? 'golan' : 'custom'; a.LogoDataUrl = logoDataUrl;
      await saveDB(DB);
      return res.json({ ok: true, message: '✅ Profile & Logo saved!', profile: { agencyName: a.AgencyName, city: a.City, mobile: a.Mobile, contactPerson: a.ContactPerson, address: a.Address, voucherBranding: a.VoucherBranding, logoDataUrl: a.LogoDataUrl } });
    }

    if (action === 'changePassword') {
      const curPwd = String(p.currentPassword || ''), newPwd = String(p.newPassword || '');
      if (!curPwd || !verifyPwd(curPwd, a.PasswordHash)) return res.json({ ok: false, message: 'Current password is incorrect.' });
      if (newPwd.length < 6 || curPwd === newPwd) return res.json({ ok: false, message: 'New password must be min 6 chars and different.' });
      a.PasswordHash = hashPwd(newPwd);
      addSecurityLog(DB, email, 'PASSWORD_CHANGE', 'User updated password', clientIp);
      await saveDB(DB);
      return res.json({ ok: true, message: '✅ Password updated!' });
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
        return (!dep || !dep.SlipImage) ? res.json({ ok: false, message: 'Slip not found.' }) : res.json({ ok: true, slipImage: dep.SlipImage });
      }
      if (p.kind === 'booking') {
        const bk = DB.bookings.find(b => b.BookingID === p.id);
        return (!bk || (!bk.PassportDoc && !bk.PhotoDoc)) ? res.json({ ok: false, message: 'Docs not found.' }) : res.json({ ok: true, passportDoc: bk.PassportDoc || '', photoDoc: bk.PhotoDoc || '' });
      }
      return res.json({ ok: false, message: 'Invalid attachment request.' });
    }

    if (action === 'searchLiveFlights') {
      if (!DUFFEL_KEY) return res.json({ ok: false, message: 'Flight API Key not configured on Vercel.' });
      const origin = String(p.origin || '').trim().toUpperCase().slice(0, 3), dest = String(p.dest || '').trim().toUpperCase().slice(0, 3), date = String(p.date || '').trim();
      const returnDate = String(p.returnDate || '').trim(), tripType = String(p.tripType || 'oneway').trim();
      const origin2 = String(p.origin2 || '').trim().toUpperCase().slice(0, 3), dest2 = String(p.dest2 || '').trim().toUpperCase().slice(0, 3), date2 = String(p.date2 || '').trim();
      const cabin = ['economy', 'premium_economy', 'business', 'first'].includes(String(p.cabin || '').toLowerCase()) ? String(p.cabin).toLowerCase() : 'economy';
      if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(dest) || origin === dest || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.json({ ok: false, message: 'Invalid Origin, Destination or Date.' });

      const slices = [{ origin, destination: dest, departure_date: date }];
      if (tripType === 'roundtrip' && /^\d{4}-\d{2}-\d{2}$/.test(returnDate)) slices.push({ origin: dest, destination: origin, departure_date: returnDate });
      else if (tripType === 'multicity' && /^[A-Z]{3}$/.test(origin2) && /^[A-Z]{3}$/.test(dest2) && /^\d{4}-\d{2}-\d{2}$/.test(date2)) slices.push({ origin: origin2, destination: dest2, departure_date: date2 });

      const r = await fetchWithTimeout(['https:', '', ['api', 'duffel', 'com'].join('.'), 'air', 'offer_requests?return_offers=true'].join('/'), { method: 'POST', headers: { Authorization: 'Bearer ' + DUFFEL_KEY, 'Duffel-Version': 'v2', 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ data: { slices, passengers: [{ type: 'adult' }], cabin_class: cabin } }) }, 20000);
      const rawTxt = await r.text(); let json = {}; try { json = JSON.parse(rawTxt); } catch (e) { return res.json({ ok: false, message: 'GDS Error (' + r.status + ')' }); }
      if (!r.ok || !json.data || !Array.isArray(json.data.offers) || !json.data.offers.length) return res.json({ ok: false, message: (json.errors && json.errors[0] && json.errors[0].message) || 'No live flights found.' });

      const POOL = [{ name: 'Emirates', code: 'EK', num: '623' }, { name: 'flydubai', code: 'FZ', num: '392' }, { name: 'PIA', code: 'PK', num: '221' }, { name: 'Saudia', code: 'SV', num: '737' }, { name: 'Qatar Airways', code: 'QR', num: '629' }];
      pruneOfferCache(DB); const nowTs = Date.now();
      const offers = json.data.offers.slice(0, 15).map((o, idx) => {
        const slice = o.slices && o.slices[0], seg0 = slice && slice.segments && slice.segments[0], segLast = slice && slice.segments && slice.segments[slice.segments.length - 1];
        const stops = slice && slice.segments ? slice.segments.length - 1 : 0, sim = POOL[idx % POOL.length];
        const rawAir = (seg0 && seg0.operating_carrier && seg0.operating_carrier.name) || (seg0 && seg0.marketing_carrier && seg0.marketing_carrier.name) || (o.owner && o.owner.name) || '';
        const isDummy = !rawAir || rawAir.toLowerCase().includes('duffel');
        const airline = isDummy ? sim.name : rawAir, flightNo = isDummy ? `${sim.code}-${sim.num}` : (seg0 && seg0.marketing_carrier ? `${seg0.marketing_carrier.iata_code}-${seg0.marketing_carrier_flight_number}` : `${sim.code}-${sim.num}`);
        const depTime = seg0 && seg0.departing_at ? seg0.departing_at.replace('T', ' ').slice(0, 16) : (date + ' 04:15');
        const arrTime = segLast && segLast.arriving_at ? segLast.arriving_at.replace('T', ' ').slice(0, 16) : (date + ' 07:45');
        const farePKR = Math.round(Number(o.total_amount || 0) * (RATES_PKR[o.total_currency] || 280));
        if (o.id && farePKR > 0) DB.offerCache[o.id] = { farePKR, ts: nowTs };
        return { OfferID: o.id, Airline: airline, FlightNo: flightNo, Origin: origin, Dest: dest, Route: tripType === 'roundtrip' ? `${origin} ⇄ ${dest}` : `${origin} → ${dest}`, Stops: stops === 0 ? 'Non-Stop Direct' : stops + ' Stop(s)', DepTime: depTime, ArrTime: arrTime, Baggage: '30 KG + 7 KG', FarePKR: farePKR };
      });
      await saveDB(DB);
      return res.json({ ok: true, offers });
    }

    if (action === 'requestDeposit' || action === 'submitDeposit') {
      const amt = Math.round(Number(p.amountPKR || 0)), slipImg = String(p.slipImage || '').trim();
      if (!Number.isFinite(amt) || amt < 100 || amt > 50000000) return res.json({ ok: false, message: 'Deposit must be between PKR 100 and 50,000,000.' });
      if (slipImg.length > 450000 || !isSafeDataUrl(slipImg, true)) return res.json({ ok: false, message: 'Invalid or oversized deposit slip.' });
      const depId = 'DEP-' + crypto.randomInt(10000, 99999);
      const depObj = { DepositID: depId, CreatedAt: getPKTimeStr(), AgentEmail: email, AgencyName: a.AgencyName, BankName: String(p.bankName || 'UBL').trim().slice(0, 80), AmountPKR: amt, TxRef: String(p.txRef || ('SLIP-' + Date.now().toString().slice(-6))).trim().slice(0, 60), SlipImage: slipImg, Status: 'PENDING' };
      DB.deposits.unshift(depObj);
      addSecurityLog(DB, email, 'DEPOSIT_SUBMIT', `Submitted ${depId} for PKR ${amt.toLocaleString()}`, clientIp);
      await saveDB(DB);
      const receiptUrl = `${getBaseUrl(req)}/api/backend?action=viewReceipt&depositId=${encodeURIComponent(depId)}&sig=${signReceipt(depId, email)}`;
      const emailHtml = buildDepositEmailHtml(depObj, receiptUrl), receiptPdfHtml = buildPrintableReceiptPage(depObj, false);
      await sendGasPair({ to: email, subject: `Deposit Slip Submitted [${depId}] PKR ${amt.toLocaleString()}`, htmlBody: emailHtml, pdfHtml: receiptPdfHtml, pdfName: `Receipt-${depId}.pdf`, bId: depId, agencyName: a.AgencyName }, { to: uniqueEmails(DB.admins || []), subject: `[ADMIN] Deposit Slip [${depId}] PKR ${amt.toLocaleString()}`, htmlBody: emailHtml, pdfHtml: receiptPdfHtml, pdfName: `Receipt-${depId}.pdf`, bId: depId, agencyName: a.AgencyName });
      return res.json({ ok: true, depositId: depId, message: 'Deposit slip submitted! Please contact Head Office.' });
    }

    if (action === 'addBooking') {
      expireStaleHolds(DB); pruneOfferCache(DB);
      const paxName = String(p.passengerName || '').trim().slice(0, 100), ppNo = String(p.passportNo || '').trim().toUpperCase().replace(/\s+/g, '');
      if (paxName.length < 2 || !/^[A-Z0-9\-]{6,18}$/.test(ppNo)) return res.json({ ok: false, message: 'Invalid Passenger Name or Passport Number.' });

      const category = String(p.category || '').trim(), fareId = String(p.fareId || '').trim(), offerId = String(p.offerId || p.OfferID || '').trim();
      let fare = 0, holdMins = 0, matchedFare = null;
      if (fareId) {
        matchedFare = DB.fares.find(f => String(f.ID) === fareId);
        if (!matchedFare) return res.json({ ok: false, message: 'Fare no longer available.' });
        if (matchedFare.Category !== 'Visit Visa' && Number(matchedFare.Seats || 0) <= 0) return res.json({ ok: false, message: 'No seats left.' });
        fare = Number(matchedFare.FarePKR || 0); holdMins = clampInt(matchedFare.HoldMins, 5, 4320, 30);
      } else if (offerId) {
        if (DB.offerCache[offerId] && Number(DB.offerCache[offerId].farePKR) > 0) fare = Number(DB.offerCache[offerId].farePKR);
        else if (DUFFEL_KEY) {
          const rOffer = await fetchWithTimeout(['https:', '', ['api', 'duffel', 'com'].join('.'), 'air', 'offers', encodeURIComponent(offerId)].join('/'), { headers: { Authorization: 'Bearer ' + DUFFEL_KEY, 'Duffel-Version': 'v2', Accept: 'application/json' } }, 12000);
          if (rOffer.ok) { const oj = await rOffer.json().catch(() => ({})); if (oj.data && oj.data.total_amount) fare = Math.round(Number(oj.data.total_amount) * (RATES_PKR[oj.data.total_currency] || 280)); }
        }
        if (!Number.isFinite(fare) || fare <= 0) return res.json({ ok: false, message: 'Offer expired. Search again.' });
      } else {
        fare = Math.round(Number(p.farePKR || 0));
        if (!Number.isFinite(fare) || fare < (category === 'Visit Visa' ? 1000 : 5000)) return res.json({ ok: false, message: 'Invalid fare amount.' });
      }
      if (!Number.isFinite(fare) || fare <= 0) return res.json({ ok: false, message: 'Invalid fare amount.' });

      const passportDoc = String(p.passportDoc || '').trim(), photoDoc = String(p.photoDoc || '').trim();
      if (passportDoc.length > 500000 || photoDoc.length > 500000 || !isSafeDataUrl(passportDoc, true) || !isSafeDataUrl(photoDoc, false)) return res.json({ ok: false, message: 'Invalid document file.' });

      const balBefore = Number(a.BalancePKR || 0);
      if (!isAdmin && balBefore < fare) return res.json({ ok: false, message: `❌ Insufficient Wallet! Available: PKR ${balBefore.toLocaleString()} | Fare: PKR ${fare.toLocaleString()}` });
      if (matchedFare && matchedFare.Category !== 'Visit Visa') matchedFare.Seats = Number(matchedFare.Seats || 0) - 1;

      let deductedFromWallet = false, balAfter = balBefore;
      if (!isAdmin || balBefore >= fare) { balAfter = balBefore - fare; a.BalancePKR = balAfter; deductedFromWallet = true; }

      const itStr = String(p.itemTitle || '').trim().slice(0, 300);
      if (!holdMins) holdMins = 1440;
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
        mailNote = await sendBookingEmailsSeparate({ adminEmails: DB.admins || [], subAgentEmail: email, paxEmail: paxMail, bId, dtStr: pkTime, agencyName: a.AgencyName, paxName, passportNo: ppNo, category, itemTitle: itStr, farePKR: fare, statusTxt: 'HOLD / PAID', opts: { invoiceUrl, isIssued: false, pnr: autoPnr, pdfHtml: buildPrintableInvoicePage(bkObj, a, matchedFare, false), bk: bkObj, agent: a, matchedFare } });
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
      return res.json({ ok: true, message: 'Ticket ISSUED! PNR: ' + bk.PNR + mailNote });
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

    if (action === 'adminDeleteFare' && isAdmin) {
      DB.fares = DB.fares.filter(f => String(f.ID) !== String(p.fareId));
      await saveDB(DB);
      return res.json({ ok: true, message: 'Fare removed!' });
    }

    if (action === 'adminAddBank' && isAdmin) {
      if (!p.bankName || !p.accountNumber) return res.json({ ok: false, message: 'Bank & Account Number required.' });
      DB.banks.push({ BankID: 'BNK-' + Date.now(), BankName: String(p.bankName).trim(), AccountTitle: String(p.accountTitle || '').trim(), AccountNumber: String(p.accountNumber).trim(), IBAN: String(p.iban || '').trim() });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Bank account added!' });
    }

    if (action === 'adminDeleteBank' && isAdmin) {
      DB.banks = DB.banks.filter((b, idx) => (p.bankId && b.BankID) ? String(b.BankID) !== String(p.bankId) : (p.accountNumber ? String(b.AccountNumber) !== String(p.accountNumber) : String(idx) !== String(p.index)));
      await saveDB(DB);
      return res.json({ ok: true, message: 'Bank removed!' });
    }

    if (action === 'adminManageAgent' && isAdmin) {
      const targetEmail = String(p.targetEmail || '').trim().toLowerCase(), target = DB.agents[targetEmail];
      if (!target) return res.json({ ok: false, message: 'Agent not found.' });

      if (p.subAction === 'APPROVE') {
        target.Status = 'APPROVED'; target.FailedAttempts = 0; target.TotpFailedAttempts = 0;
        addSecurityLog(DB, targetEmail, 'APPROVE_AGENT', `Approved by ${email}`, clientIp);
        await saveDB(DB);
        return res.json({ ok: true, message: 'Agent Approved!' });
      }
      const authMap = { GRANT_ISSUE: ['CanIssue', true], REVOKE_ISSUE: ['CanIssue', false], GRANT_VOID: ['CanVoid', true], REVOKE_VOID: ['CanVoid', false], GRANT_CANCEL: ['CanCancel', true], REVOKE_CANCEL: ['CanCancel', false] };
      if (authMap[p.subAction]) {
        const [fld, val] = authMap[p.subAction]; target[fld] = val;
        addSecurityLog(DB, targetEmail, p.subAction, `Changed by ${email}`, clientIp);
        await saveDB(DB);
        return res.json({ ok: true, message: `Updated ${p.subAction} for ${target.AgencyName}` });
      }
      if (p.subAction === 'BLOCK') {
        target.Status = 'BLOCKED'; target.SessionToken = ''; target.SessionExpiry = 0;
        addSecurityLog(DB, targetEmail, 'BLOCK_AGENT', `Blocked by ${email}`, clientIp);
      } else if (p.subAction === 'FORCE_LOGOUT') {
        target.SessionToken = ''; target.SessionExpiry = 0;
        addSecurityLog(DB, targetEmail, 'FORCE_LOGOUT', `Session terminated by ${email}`, clientIp);
      } else if (p.subAction === 'ADD_LIMIT' || p.subAction === 'DEDUCT_LIMIT') {
        const isAdd = p.subAction === 'ADD_LIMIT', amt = Math.round(Number(p.amountPKR || 0));
        if (!Number.isFinite(amt) || amt <= 0) return res.json({ ok: false, message: 'Enter valid positive PKR amount.' });
        const balBefore = Number(target.BalancePKR || 0);
        if (!isAdd && balBefore < amt) return res.json({ ok: false, message: `Cannot deduct PKR ${amt.toLocaleString()} (Wallet only has PKR ${balBefore.toLocaleString()}).` });
        const balAfter = isAdd ? (balBefore + amt) : (balBefore - amt), nowStr = getPKTimeStr(), refId = (isAdd ? 'LIM-' : 'DED-') + crypto.randomInt(10000, 99999);
        target.BalancePKR = balAfter;
        if (isAdd) DB.deposits.unshift({ DepositID: refId, CreatedAt: nowStr, ApprovedAt: nowStr, ApprovedBy: email, AgentEmail: targetEmail, AgencyName: target.AgencyName, BankName: 'Head Office Direct Limit', AmountPKR: amt, TxRef: 'ADMIN-LIMIT', SlipImage: '', Status: 'APPROVED' });
        const reason = String(p.reason || (isAdd ? 'Head Office Limit Added' : 'Head Office Deduction')).trim().slice(0, 120);
        addLedgerEntry(DB, { CreatedAt: nowStr, AgentEmail: targetEmail, AgencyName: target.AgencyName, RefID: refId, BookingID: '', Type: isAdd ? 'LIMIT_CREDIT' : 'ADMIN_DEDUCT', Direction: isAdd ? 'CREDIT' : 'DEBIT', DebitPKR: isAdd ? 0 : amt, CreditPKR: isAdd ? amt : 0, BalanceBefore: balBefore, BalanceAfter: balAfter, Description: `${reason} (${isAdd ? '+' : '-'}PKR ${amt.toLocaleString()})`, Status: isAdd ? 'APPROVED' : 'DEDUCTED', PerformedBy: email });
        addSecurityLog(DB, targetEmail, p.subAction, `PKR ${amt.toLocaleString()} (${reason}) by ${email}`, clientIp);
        await saveDB(DB);
        return res.json({ ok: true, message: `✅ PKR ${amt.toLocaleString()} ${isAdd ? 'Added' : 'Deducted'} & Ledger Updated!` });
      } else if (p.subAction === 'RESET_PASSWORD') {
        const np = String(p.newPassword || '');
        if (np.length < 6) return res.json({ ok: false, message: 'Min 6 chars required.' });
        target.PasswordHash = hashPwd(np); target.TotpSecret = generateSecret(); target.TotpVerified = 'NO'; target.Status = 'APPROVED'; target.FailedAttempts = 0; target.TotpFailedAttempts = 0; target.SessionToken = '';
        addSecurityLog(DB, targetEmail, 'RESET_PASSWORD', `Password & 2FA reset by ${email}`, clientIp);
      } else return res.json({ ok: false, message: 'Invalid sub-action.' });

      await saveDB(DB);
      return res.json({ ok: true, message: 'Agent updated: ' + p.subAction });
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
