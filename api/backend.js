const crypto = require('crypto');
const SB_HOST = ['https:', '', ['yxnygfbamkvzgskgoxoy', 'supabase', 'co'].join('.')].join('/');
const SB_URL = process.env.SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || SB_HOST;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.STORAGE_SUPABASE_ANON_KEY;
const DUFFEL_KEY = process.env.DUFFEL_API_KEY || '';
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
{ ID: 'F1', Category: 'Group Flight', Title: 'LHE - JED (Saudi Airlines SV-737)', Timing: 'Dep: 04:15 AM | Arr: 07:45 AM (Direct)', Luggage: '30 KG Check-in + 7 KG Hand Carry', Meal: 'Hot Halal Meal Included', Stay: 'Non-Stop Direct Flight', Details: 'Refundable Before 72 Hrs • Free Seat Selection', TravelDate: '25 Nov 2026', Seats: 18, HoldMins: 30, FarePKR: 138500, Status: 'ACTIVE' },
{ ID: 'F2', Category: 'Umrah Package', Title: '15 Days Economy Umrah Package', Timing: 'LHE-JED-LHE Return Flights Included', Luggage: '30 KG + 7 KG + 5L Zamzam', Meal: 'Breakfast Optional / Room Only', Stay: 'Makkah 7N (Shuttle) + Madinah 7N (Markazia)', Details: 'Umrah Visa + Full Ziyarat & AC Transport Included', TravelDate: '01 Dec 2026', Seats: 25, HoldMins: 60, FarePKR: 215000, Status: 'ACTIVE' }
],
bookings: [],
banks: [],
deposits: []
};
}
async function loadDB() {
if (!SB_KEY) return globalThis.FALLBACK_DB || (globalThis.FALLBACK_DB = defaultState());
try {
const r = await fetch(${SB_URL}/rest/v1/golan_store?id=eq.main&select=data, {
headers: { apikey: SB_KEY, Authorization: Bearer ${SB_KEY} }
});
const rows = await r.json();
if (Array.isArray(rows) && rows.length > 0 && rows[0].data) return rows[0].data;
} catch (e) {}
const init = defaultState();
await saveDB(init);
return init;
}
async function saveDB(db) {
if (!SB_KEY) { globalThis.FALLBACK_DB = db; return; }
try {
await fetch(${SB_URL}/rest/v1/golan_store, {
method: 'POST',
headers: {
apikey: SB_KEY,
Authorization: Bearer ${SB_KEY},
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
module.exports = async function handler(req, res) {
try {
const p = Object.assign({}, req.query || {}, typeof req.body === 'object' && req.body ? req.body : {});
const action = p.action || '';
const email = String(p.email || '').trim().toLowerCase();
const DB = await loadDB();
Code
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

if (action === 'getDashboardData' || action === 'getDashboard') {
  const bookings = isAdmin ? DB.bookings : DB.bookings.filter(b => b.AgentEmail === email);
  const deposits = isAdmin ? (DB.deposits || []) : (DB.deposits || []).filter(d => d.AgentEmail === email);
  const agents = isAdmin ? Object.values(DB.agents).map(x => ({
    Email: x.Email, AgencyName: x.AgencyName, City: x.City, Mobile: x.Mobile,
    Status: x.Status, TotpVerified: x.TotpVerified, BalancePKR: Number(x.BalancePKR || 0)
  })) : [];
  const safeFares = isAdmin ? DB.fares : DB.fares.map(f => ({ ...f, Seats: 'Available' }));
  return res.json({ ok: true, isAdmin, balancePKR: Number(a.BalancePKR || 0), fares: safeFares, banks: DB.banks, bookings, deposits, agents });
}

if (action === 'searchLiveFlights') {
  if (!DUFFEL_KEY) return res.json({ ok: false, message: 'Flight API Key not configured on Vercel.' });
  const origin = String(p.origin || 'LHE').trim().toUpperCase().slice(0, 3);
  const dest = String(p.dest || 'JED').trim().toUpperCase().slice(0, 3);
  const date = String(p.date || '').trim();
  const returnDate = String(p.returnDate || '').trim();
  const tripType = String(p.tripType || 'oneway').trim();
  const origin2 = String(p.origin2 || '').trim().toUpperCase().slice(0, 3);
  const dest2 = String(p.dest2 || '').trim().toUpperCase().slice(0, 3);
  const date2 = String(p.date2 || '').trim();
  const cabin = String(p.cabin || 'economy').trim().toLowerCase();
  if (!date) return res.json({ ok: false, message: 'Please select departure date.' });

  const slices = [{ origin: origin, destination: dest, departure_date: date }];
  if (tripType === 'roundtrip' && returnDate) {
    slices.push({ origin: dest, destination: origin, departure_date: returnDate });
  } else if (tripType === 'multicity' && origin2 && dest2 && date2) {
    slices.push({ origin: origin2, destination: dest2, departure_date: date2 });
  }

  const duffelUrl = ['https:', '', ['api', 'duffel', 'com'].join('.'), 'air', 'offer_requests?return_offers=true'].join('/');
  const r = await fetch(duffelUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + DUFFEL_KEY,
      'Duffel-Version': 'v2',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      data: {
        slices: slices,
        passengers: [{ type: 'adult' }],
        cabin_class: cabin
      }
    })
  });
  const rawTxt = await r.text();
  let json = {};
  try { json = JSON.parse(rawTxt); } catch (e) {
    return res.json({ ok: false, message: 'GDS Response Error (' + r.status + '): ' + rawTxt.slice(0, 100) });
  }
  if (!r.ok || !json.data || !Array.isArray(json.data.offers) || json.data.offers.length === 0) {
    const errMsg = (json.errors && json.errors[0] && json.errors[0].message) || 'No live flights found for ' + origin + ' → ' + dest + ' on ' + date + '.';
    return res.json({ ok: false, message: errMsg });
  }
  const USD_TO_PKR = 280;
  const AIRLINE_POOL = [
    { name: 'Emirates', code: 'EK', num: '623' },
    { name: 'flydubai', code: 'FZ', num: '392' },
    { name: 'Pakistan International Airlines (PIA)', code: 'PK', num: '221' },
    { name: 'Saudi Arabian Airlines', code: 'SV', num: '737' },
    { name: 'Qatar Airways', code: 'QR', num: '629' }
  ];
  const offers = json.data.offers.slice(0, 15).map((o, idx) => {
    const slice = o.slices && o.slices[0];
    const seg0 = slice && slice.segments && slice.segments[0];
    const segLast = slice && slice.segments && slice.segments[slice.segments.length - 1];
    const stops = slice && slice.segments ? slice.segments.length - 1 : 0;
    const sim = AIRLINE_POOL[idx % AIRLINE_POOL.length];
    let rawAirline = (seg0 && seg0.operating_carrier && seg0.operating_carrier.name) || (seg0 && seg0.marketing_carrier && seg0.marketing_carrier.name) || (o.owner && o.owner.name) || '';
    const isDummy = !rawAirline || rawAirline.toLowerCase().includes('duffel');
    const airline = isDummy ? sim.name : rawAirline;
    const flightNo = isDummy ? (sim.code + '-' + sim.num) : (seg0 && seg0.marketing_carrier ? (seg0.marketing_carrier.iata_code + '-' + seg0.marketing_carrier_flight_number) : sim.code + '-' + sim.num);
    const depTime = seg0 && seg0.departing_at ? seg0.departing_at.replace('T', ' ').slice(0, 16) : (date + ' 04:15');
    const arrTime = segLast && segLast.arriving_at ? segLast.arriving_at.replace('T', ' ').slice(0, 16) : (date + ' 07:45');
    const rawAmt = Number(o.total_amount || 0);
    const farePKR = o.total_currency === 'PKR' ? Math.round(rawAmt) : Math.round(rawAmt * USD_TO_PKR);
    return {
      OfferID: o.id,
      Airline: airline,
      FlightNo: flightNo,
      Origin: origin,
      Dest: dest,
      Route: tripType === 'roundtrip' ? (origin + ' ⇄ ' + dest) : (tripType === 'multicity' ? (origin + '→' + dest + ' / ' + origin2 + '→' + dest2) : (origin + ' → ' + dest)),
      Stops: stops === 0 ? 'Non-Stop Direct' : stops + ' Stop(s)',
      DepTime: depTime,
      ArrTime: arrTime,
      Baggage: '23-30 KG Checked + 7 KG Hand Carry',
      Luggage: '23-30 KG Checked + 7 KG Hand Carry',
      FarePKR: farePKR
    };
  });
  return res.json({ ok: true, offers });
}

if (action === 'requestDeposit' || action === 'submitDeposit') {
  const amt = Number(p.amountPKR || 0);
  if (amt <= 0) return res.json({ ok: false, message: 'Enter valid PKR amount.' });
  DB.deposits = DB.deposits || [];
  DB.deposits.unshift({
    DepositID: 'DEP-' + Math.floor(10000 + Math.random() * 90000),
    CreatedAt: new Date().toLocaleString('en-PK'),
    AgentEmail: email, AgencyName: a.AgencyName,
    BankName: p.bankName || 'UBL', AmountPKR: amt, TxRef: p.txRef || p.refNo || '', Status: 'PENDING'
  });
  await saveDB(DB);
  return res.json({ ok: true, message: 'Please contact us Head Office' });
}

if (action === 'addBooking') {
  const fare = Number(p.farePKR || 0);
  const itStr = String(p.itemTitle || '');
  const dMatch = itStr.match(/\{DATE:(\d{4}-\d{2}-\d{2})/);
  const depMs = (dMatch && dMatch[1]) ? Date.parse(dMatch[1] + 'T12:00:00Z') : (Date.now() + 10 * 86400000);
  const hrsToDep = (depMs - Date.now()) / 3600000;
  const isLCC = /flyjinnah|airsial|airblue|serene|flydubai|airarabia|jazeera|salam/i.test(itStr);
  let holdMins = 1440;
  if (hrsToDep <= 6) holdMins = 30;
  else if (hrsToDep <= 24) holdMins = 120;
  else if (isLCC) holdMins = hrsToDep <= 72 ? 120 : 360;
  else if (hrsToDep <= 72) holdMins = 720;
  if (p.holdMins) holdMins = Number(p.holdMins);
  const bId = 'GI-' + Math.floor(100000 + Math.random() * 900000);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let autoPnr = '';
  for (let i = 0; i < 6; i++) autoPnr += chars[Math.floor(Math.random() * chars.length)];
  const holdUntil = Date.now() + (holdMins * 60 * 1000);
  const pkTime = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi' });
  const paxMail = String(p.passengerEmail || '').trim();
  DB.bookings.unshift({
    BookingID: bId,
    CreatedAt: pkTime,
    HoldUntil: holdUntil,
    AgentEmail: email,
    AgencyName: a.AgencyName,
    PassengerName: p.passengerName || '',
    PassengerEmail: paxMail,
    PassportNo: p.passportNo || '',
    Dob: p.dob || '',
    PassportExpiry: p.passportExpiry || '',
    Nationality: p.nationality || 'Pakistani',
    PaxMobile: p.paxMobile || '',
    Category: p.category || '',
    ItemTitle: p.itemTitle || '',
    FarePKR: fare,
    PNR: autoPnr,
    TicketNo: '',
    Status: 'PENDING'
  });
  await saveDB(DB);
  const gasUrl = 'https://script.google.com/macros/s/AKfycbyw4rKuL8HLL7zrBjrYIzcxJs2ZLsOY2LcoM7lWQ4LPT0lmkDL0jbAr4vQIIArxofTGjQ/exec';
  const recipients = [email, paxMail, 'golaninternational322@gmail.com', 'sj3296521759@gmail.com', ...(DB.admins || [])].filter((v, idx, arr) => v && v.includes('@') && arr.indexOf(v) === idx).join(',');
  let mailNote = '';
  try {
    const r = await fetch(gasUrl + '?action=sendVoucher&to=' + encodeURIComponent(recipients) + '&bId=' + encodeURIComponent(bId) + '&dtStr=' + encodeURIComponent(pkTime) + '&agencyName=' + encodeURIComponent(a.AgencyName || '') + '&paxName=' + encodeURIComponent(p.passengerName || '') + '&passportNo=' + encodeURIComponent(p.passportNo || '') + '&category=' + encodeURIComponent(p.category || '') + '&itemTitle=' + encodeURIComponent(p.itemTitle || '') + '&farePKR=' + encodeURIComponent(fare) + '&statusTxt=' + encodeURIComponent('HOLD / PENDING (PNR: ' + autoPnr + ')'), { method: 'GET', redirect: 'follow' });
    const txt = await r.text();
    mailNote = txt.indexOf('true') !== -1 ? ' | Email: SENT' : ' | Email: ' + txt.slice(0, 40);
  } catch (e) { mailNote = ' | Email Err: ' + e.message; }
  return res.json({ ok: true, bookingId: bId, pnr: autoPnr, holdUntil: holdUntil, message: 'Booking Held (PENDING)! PNR: ' + autoPnr + mailNote });
}

if (action === 'adminIssueBooking' && isAdmin) {
  const bk = DB.bookings.find(b => b.BookingID === p.bookingId);
  if (!bk) return res.json({ ok: false, message: 'Booking not found.' });
  const agentAcc = DB.agents[bk.AgentEmail];
  const fare = Number(bk.FarePKR || 0);
  if (agentAcc && !DB.admins.includes(bk.AgentEmail)) {
    const bal = Number(agentAcc.BalancePKR || 0);
    if (bal < fare) {
      return res.json({ ok: false, message: 'Cannot Issue: Agent wallet balance (PKR ' + bal.toLocaleString() + ') is less than Fare (PKR ' + fare.toLocaleString() + ').' });
    }
    agentAcc.BalancePKR = bal - fare;
  }
  if (p.pnr && String(p.pnr).trim()) bk.PNR = String(p.pnr).trim().toUpperCase();
  bk.TicketNo = String(p.ticketNo || '').trim();
  bk.Status = 'CONFIRMED';
  await saveDB(DB);
const gasUrl = 'https://script.google.com/macros/s/AKfycbyw4rKuL8HLL7zrBjrYIzcxJs2ZLsOY2LcoM7lWQ4LPT0lmkDL0jbAr4vQIIArxofTGjQ/exec';
const recipients = [bk.AgentEmail, bk.PassengerEmail, 'golaninternational322@gmail.com', 'sj3296521759@gmail.com', ...(DB.admins || [])].filter((v, idx, arr) => v && v.includes('@') && arr.indexOf(v) === idx).join(',');
try {
const r = await fetch(gasUrl + '?action=sendVoucher&to=' + encodeURIComponent(recipients) + '&bId=' + encodeURIComponent(bk.BookingID) + '&dtStr=' + encodeURIComponent(bk.CreatedAt || '') + '&agencyName=' + encodeURIComponent(bk.AgencyName || '') + '&paxName=' + encodeURIComponent(bk.PassengerName || '') + '&passportNo=' + encodeURIComponent(bk.PassportNo || '') + '&category=' + encodeURIComponent(bk.Category || '') + '&itemTitle=' + encodeURIComponent(bk.ItemTitle || '') + '&farePKR=' + encodeURIComponent(fare) + '&statusTxt=' + encodeURIComponent('ISSUED / CONFIRMED (PNR: ' + (bk.PNR || '') + (bk.TicketNo ? ' | TKT: ' + bk.TicketNo : '') + ')'), { method: 'GET', redirect: 'follow' });
await r.text();
} catch (e) {}
return res.json({ ok: true, message: 'Ticket Issued & CONFIRMED! PNR: ' + bk.PNR });
}
Code
if (action === 'adminDeleteBooking' && isAdmin) {
  const before = DB.bookings.length;
  DB.bookings = DB.bookings.filter(b => b.BookingID !== p.bookingId);
  if (DB.bookings.length === before) return res.json({ ok: false, message: 'Booking not found.' });
  await saveDB(DB);
  return res.json({ ok: true, message: 'Booking deleted permanently!' });
}

if (action === 'adminCancelBooking' && isAdmin) {
  const bk = DB.bookings.find(b => b.BookingID === p.bookingId);
  if (!bk) return res.json({ ok: false, message: 'Booking not found.' });
  const prevSt = String(bk.Status || '').toUpperCase();
  if (prevSt === 'CONFIRMED' || prevSt === 'ISSUED') {
    const agentAcc = DB.agents[bk.AgentEmail];
    if (agentAcc && !DB.admins.includes(bk.AgentEmail)) {
      agentAcc.BalancePKR = Number(agentAcc.BalancePKR || 0) + Number(bk.FarePKR || 0);
    }
  }
  bk.Status = 'CANCELED';
  await saveDB(DB);
  return res.json({ ok: true, message: 'Booking CANCELED!' });
}

if (action === 'adminAddFare' && isAdmin) {
  DB.fares.unshift({
    ID: 'FARE-' + Date.now(),
    Category: p.category || 'Group Flight',
    Title: p.title || '',
    Timing: p.timing || 'As per Airline Schedule',
    Luggage: p.luggage || '30 KG + 7 KG',
    Meal: p.meal || 'Meal Included',
    Stay: p.stay || 'Direct / N/A',
    Details: p.details || '',
    TravelDate: p.travelDate || '',
    Seats: p.seats || '15',
    HoldMins: Number(p.holdMins || 30),
    FarePKR: Number(p.farePKR || 0),
    Status: 'ACTIVE'
  });
  await saveDB(DB);
  return res.json({ ok: true, message: 'Fare/Package published with ' + (p.holdMins || 30) + ' mins hold timer!' });
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
};
yar is me bi jo bi mistakes   hen un ko clear   kar ta  ke me jal  se jald  apna  portal  ki  domain le kar live   kar sakuoo    portal   professional  ho  na  chayie
Model 4:26 PM
ThinkingThoughts
Expand to view model thoughts

Maine aapki **`api/backend.js`** file ko poori tarah check kiya hai — acha hua aapne live domain lene se pehle yeh file dikha di, kyunke is mein **kuch bohot khatarnak bugs** thin jo live hone ke baad aapka poora data urha sakti thin!

---

### `api/backend.js` Mein Nikli Badi Mistakes aur Fixes:

1. **Sab Se Khatarnak Bug — Poora Database Wipe Hone ka Khatra (`loadDB`):**
   - Agar Supabase server 1 second ke liye bhi slow ya busy hota (`try/catch`), toh aapka purana code `defaultState()` chala kar **`saveDB(init)` se saare sub-agents, wallets, bookings, aur deposits ko delete karke reset kar deta!** Ab yeh bug khatam kar diya hai — error par database kabhi overwrite nahi hoga.
2. **Midnight Lock Pakistan Time par Nahi Tha:**
   - Vercel servers UTC time par chalte hain, isliye aapka `12:00 AM` lock Pakistan ke **subah 5:00 AM** par lag raha tha. Ab yeh exact **12:00 AM PKT (`Asia/Karachi`)** par lock hoga.
3. **Double Issue par Double Wallet Deduction:**
   - Pehle agar Admin ghalti se kisi booking par 2 baar `Issue` daba de toh agent ke wallet se 2 baar paise kat jate the! Ab already confirmed/canceled booking dobara issue nahi ho sakegi.
4. **Price Tampering & Seat Inventory Bug:**
   - Pehle price sirf browser se aati thi aur seats minus nahi hoti thin. Ab Group Fares/Packages ki price backend verify karega, booking par seat minus hogi, aur cancel par seat wapas add hogi.
5. **2FA Brute-Force & Hardcoded Secret:**
   - `verifyTotp` mein ab 5 galat codes ke baad account lock hoga, aur public test secret `'JBSWY3DPEHPK3PXP'` hata kar `crypto.randomBytes` se secure secret generate hoga.
6. **`GET` se `POST` Shift + Slip/Visa Docs + Delete Features Add:**
   - Passwords ab URL mein nahi jayenge (`POST` JSON).
   - **Bank Account Delete**, **Group Fare Delete**, aur **Uploaded Deposit Slip / Visa Documents dekhne (`👁️ View Slip` / `📎 Docs`)** ke naye professional features dono files mein add kar diye hain!

---

### Step 1: `api/backend.js` Update Karein (GitHub par)

```javascript
const crypto = require('crypto');

const SB_HOST = ['https:', '', ['yxnygfbamkvzgskgoxoy', 'supabase', 'co'].join('.')].join('/');
const SB_URL = process.env.SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || SB_HOST;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.STORAGE_SUPABASE_ANON_KEY;
const DUFFEL_KEY = process.env.DUFFEL_API_KEY || '';
const GAS_URL = process.env.GAS_VOUCHER_URL || 'https://script.google.com/macros/s/AKfycbyw4rKuL8HLL7zrBjrYIzcxJs2ZLsOY2LcoM7lWQ4LPT0lmkDL0jbAr4vQIIArxofTGjQ/exec';

function hashPwd(pwd) {
  return crypto.createHash('sha256').update('GOLAN_SALT_2026_' + String(pwd || '')).digest('hex');
}

function generateSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(16);
  let s = '';
  for (let i = 0; i < 16; i++) s += chars[bytes[i] % chars.length];
  return s;
}

function defaultState() {
  const adminPass = process.env.ADMIN_DEFAULT_PASS || 'Golan@786';
  return {
    admins: ['golaninternational322@gmail.com', 'sj3296521759@gmail.com'],
    agents: {
      'golaninternational322@gmail.com': {
        Email: 'golaninternational322@gmail.com',
        AgencyName: 'Golan International Head Office',
        City: 'Toba Tek Singh',
        Mobile: '0345-3326318',
        PasswordHash: hashPwd(adminPass),
        TotpSecret: generateSecret(),
        TotpVerified: 'NO',
        Status: 'APPROVED',
        BalancePKR: 0,
        SessionToken: '',
        SessionExpiry: 0,
        FailedAttempts: 0,
        TotpFailedAttempts: 0
      }
    },
    fares: [
      { ID: 'F1', Category: 'Group Flight', Title: 'LHE - JED (Saudi Airlines SV-737)', Timing: 'Dep: 04:15 AM | Arr: 07:45 AM (Direct)', Luggage: '30 KG Check-in + 7 KG Hand Carry', Meal: 'Hot Halal Meal Included', Stay: 'Non-Stop Direct Flight', Details: 'Refundable Before 72 Hrs • Free Seat Selection', TravelDate: '25 Nov 2026', Seats: 18, HoldMins: 30, FarePKR: 138500, Status: 'ACTIVE' },
      { ID: 'F2', Category: 'Umrah Package', Title: '15 Days Economy Umrah Package', Timing: 'LHE-JED-LHE Return Flights Included', Luggage: '30 KG + 7 KG + 5L Zamzam', Meal: 'Breakfast Optional / Room Only', Stay: 'Makkah 7N (Shuttle) + Madinah 7N (Markazia)', Details: 'Umrah Visa + Full Ziyarat & AC Transport Included', TravelDate: '01 Dec 2026', Seats: 25, HoldMins: 60, FarePKR: 215000, Status: 'ACTIVE' }
    ],
    bookings: [],
    banks: [],
    deposits: []
  };
}

async function loadDB() {
  if (!SB_KEY) return globalThis.__FALLBACK_DB__ || (globalThis.__FALLBACK_DB__ = defaultState());
  const r = await fetch(`${SB_URL}/rest/v1/golan_store?id=eq.main&select=data`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
  });
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
  const r = await fetch(`${SB_URL}/rest/v1/golan_store`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ id: 'main', data: db })
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error('Database save failed (' + r.status + '): ' + txt.slice(0, 80));
  }
}

function getNextMidnightPKT() {
  const nowPKT = new Date(Date.now() + 5 * 3600 * 1000);
  const nextMidUTC = Date.UTC(nowPKT.getUTCFullYear(), nowPKT.getUTCMonth(), nowPKT.getUTCDate() + 1, 0, 0, 0, 0);
  return nextMidUTC - 5 * 3600 * 1000;
}

function getPKTimeStr() {
  return new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi' });
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
    const bin = ((hmac[off] & 0x7f) << 24) | ((hmac[off + 1] & 0xff) << 16) | ((hmac[off + 2] & 0xff) << 8) | (hmac[off + 3] & 0xff);
    if (String(bin % 1000000).padStart(6, '0') === code) return true;
  }
  return false;
}

async function sendVoucherEmail(recipients, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt) {
  if (!recipients || !GAS_URL) return '';
  try {
    const url = GAS_URL + '?action=sendVoucher&to=' + encodeURIComponent(recipients)
      + '&bId=' + encodeURIComponent(bId)
      + '&dtStr=' + encodeURIComponent(dtStr)
      + '&agencyName=' + encodeURIComponent(agencyName || '')
      + '&paxName=' + encodeURIComponent(paxName || '')
      + '&passportNo=' + encodeURIComponent(passportNo || '')
      + '&category=' + encodeURIComponent(category || '')
      + '&itemTitle=' + encodeURIComponent(itemTitle || '')
      + '&farePKR=' + encodeURIComponent(farePKR)
      + '&statusTxt=' + encodeURIComponent(statusTxt);
    const r = await fetch(url, { method: 'GET', redirect: 'follow' });
    const txt = await r.text();
    return txt.indexOf('true') !== -1 ? ' | Email: SENT' : '';
  } catch (e) {
    return '';
  }
}

module.exports = async function handler(req, res) {
  try {
    let bodyObj = {};
    if (req.body && typeof req.body === 'object') bodyObj = req.body;
    else if (typeof req.body === 'string' && req.body.trim()) {
      try { bodyObj = JSON.parse(req.body); } catch (e) {}
    }

    const p = Object.assign({}, req.query || {}, bodyObj);
    const action = String(p.action || '').trim();
    const email = String(p.email || '').trim().toLowerCase();
    const DB = await loadDB();
    DB.admins = DB.admins || [];
    DB.agents = DB.agents || {};
    DB.fares = DB.fares || [];
    DB.bookings = DB.bookings || [];
    DB.banks = DB.banks || [];
    DB.deposits = DB.deposits || [];

    if (action === 'register') {
      const agencyName = String(p.agencyName || '').trim();
      const pwd = String(p.password || '');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json({ ok: false, message: 'Enter a valid email address.' });
      if (!agencyName || pwd.length < 6) return res.json({ ok: false, message: 'Agency name and password (min 6 chars) required.' });
      if (DB.agents[email]) return res.json({ ok: false, message: 'Email already registered.' });
      DB.agents[email] = {
        Email: email,
        AgencyName: agencyName,
        City: String(p.city || '').trim(),
        Mobile: String(p.mobile || '').trim(),
        PasswordHash: hashPwd(pwd),
        TotpSecret: generateSecret(),
        TotpVerified: 'NO',
        Status: 'PENDING',
        BalancePKR: 0,
        SessionToken: '',
        SessionExpiry: 0,
        FailedAttempts: 0,
        TotpFailedAttempts: 0
      };
      await saveDB(DB);
      return res.json({ ok: true, message: 'Please contact the Head Quarters to activate your registered account: CEO Shan Chairman (0345-3326318) | Manager Muhammad Umer (0331-6379110).' });
    }

    if (action === 'loginStep1') {
      const a = DB.agents[email];
      if (!a) return res.json({ ok: false, message: 'Agent email not found. Please register first.' });
      const isSuper = DB.admins.includes(email);
      if (isSuper) { a.Status = 'APPROVED'; a.FailedAttempts = 0; a.TotpFailedAttempts = 0; }
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
      const isSuper = DB.admins.includes(email);
      if (!a || a.Status !== 'APPROVED') return res.json({ ok: false, message: 'Account not approved or blocked.' });
      if (!verifyTotp(a.TotpSecret, String(p.code || '').trim())) {
        if (!isSuper) {
          a.TotpFailedAttempts = (a.TotpFailedAttempts || 0) + 1;
          if (a.TotpFailedAttempts >= 5) a.Status = 'BLOCKED';
          await saveDB(DB);
        }
        return res.json({ ok: false, message: 'Invalid 6-digit Google Authenticator code.' });
      }
      const token = crypto.randomUUID();
      const expiry = getNextMidnightPKT();
      a.TotpVerified = 'YES';
      a.TotpFailedAttempts = 0;
      a.SessionToken = token;
      a.SessionExpiry = expiry;
      await saveDB(DB);
      return res.json({ ok: true, token, expiry, agencyName: a.AgencyName, isAdmin: isSuper });
    }

    const a = DB.agents[email];
    const validSess = a && a.Status === 'APPROVED' && a.SessionToken && a.SessionToken === p.token && Date.now() < Number(a.SessionExpiry || 0);
    if (!validSess) return res.json({ ok: false, message: 'Session expired at 12:00 AM. Please verify 2FA again.' });
    const isAdmin = DB.admins.includes(email);

    if (action === 'checkSession') return res.json({ ok: true, agencyName: a.AgencyName, isAdmin, expiry: a.SessionExpiry });

    if (action === 'getDashboardData' || action === 'getDashboard') {
      const rawBookings = isAdmin ? DB.bookings : DB.bookings.filter(b => b.AgentEmail === email);
      const bookings = rawBookings.map(b => {
        const copy = Object.assign({}, b);
        copy.HasDocs = !!(b.PassportDoc || b.PhotoDoc);
        delete copy.PassportDoc;
        delete copy.PhotoDoc;
        return copy;
      });
      const rawDeposits = isAdmin ? DB.deposits : DB.deposits.filter(d => d.AgentEmail === email);
      const deposits = rawDeposits.map(d => {
        const copy = Object.assign({}, d);
        copy.HasSlip = !!d.SlipImage;
        delete copy.SlipImage;
        return copy;
      });
      const agents = isAdmin ? Object.values(DB.agents).map(x => ({
        Email: x.Email, AgencyName: x.AgencyName, City: x.City, Mobile: x.Mobile,
        Status: x.Status, TotpVerified: x.TotpVerified, BalancePKR: Number(x.BalancePKR || 0)
      })) : [];
      const safeFares = isAdmin ? DB.fares : DB.fares.map(f => ({ ...f, Seats: Number(f.Seats) > 0 ? 'Available' : 'Sold Out' }));
      return res.json({ ok: true, isAdmin, balancePKR: Number(a.BalancePKR || 0), fares: safeFares, banks: DB.banks, bookings, deposits, agents });
    }

    if (action === 'adminGetAttachment' && isAdmin) {
      if (p.kind === 'deposit') {
        const dep = DB.deposits.find(d => d.DepositID === p.id);
        if (!dep || !dep.SlipImage) return res.json({ ok: false, message: 'Deposit slip image not found.' });
        return res.json({ ok: true, slipImage: dep.SlipImage });
      }
      if (p.kind === 'booking') {
        const bk = DB.bookings.find(b => b.BookingID === p.id);
        if (!bk || (!bk.PassportDoc && !bk.PhotoDoc)) return res.json({ ok: false, message: 'Documents not found for this booking.' });
        return res.json({ ok: true, passportDoc: bk.PassportDoc || '', photoDoc: bk.PhotoDoc || '' });
      }
      return res.json({ ok: false, message: 'Invalid attachment request.' });
    }

    if (action === 'searchLiveFlights') {
      if (!DUFFEL_KEY) return res.json({ ok: false, message: 'Flight API Key not configured on Vercel.' });
      const origin = String(p.origin || '').trim().toUpperCase().slice(0, 3);
      const dest = String(p.dest || '').trim().toUpperCase().slice(0, 3);
      const date = String(p.date || '').trim();
      const returnDate = String(p.returnDate || '').trim();
      const tripType = String(p.tripType || 'oneway').trim();
      const origin2 = String(p.origin2 || '').trim().toUpperCase().slice(0, 3);
      const dest2 = String(p.dest2 || '').trim().toUpperCase().slice(0, 3);
      const date2 = String(p.date2 || '').trim();
      const cabin = String(p.cabin || 'economy').trim().toLowerCase();
      if (origin.length !== 3 || dest.length !== 3) return res.json({ ok: false, message: 'Please select valid 3-letter Origin & Destination airports.' });
      if (origin === dest) return res.json({ ok: false, message: 'Origin and Destination cannot be same.' });
      if (!date) return res.json({ ok: false, message: 'Please select departure date.' });

      const slices = [{ origin: origin, destination: dest, departure_date: date }];
      if (tripType === 'roundtrip' && returnDate) {
        slices.push({ origin: dest, destination: origin, departure_date: returnDate });
      } else if (tripType === 'multicity' && origin2.length === 3 && dest2.length === 3 && date2) {
        slices.push({ origin: origin2, destination: dest2, departure_date: date2 });
      }

      const duffelUrl = ['https:', '', ['api', 'duffel', 'com'].join('.'), 'air', 'offer_requests?return_offers=true'].join('/');
      const r = await fetch(duffelUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + DUFFEL_KEY,
          'Duffel-Version': 'v2',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          data: {
            slices: slices,
            passengers: [{ type: 'adult' }],
            cabin_class: cabin
          }
        })
      });
      const rawTxt = await r.text();
      let json = {};
      try { json = JSON.parse(rawTxt); } catch (e) {
        return res.json({ ok: false, message: 'GDS Response Error (' + r.status + '): ' + rawTxt.slice(0, 100) });
      }
      if (!r.ok || !json.data || !Array.isArray(json.data.offers) || json.data.offers.length === 0) {
        const errMsg = (json.errors && json.errors[0] && json.errors[0].message) || 'No live flights found for ' + origin + ' → ' + dest + ' on ' + date + '.';
        return res.json({ ok: false, message: errMsg });
      }
      const RATES_PKR = { PKR: 1, USD: 280, EUR: 302, GBP: 355, SAR: 74.65, AED: 76.25 };
      const AIRLINE_POOL = [
        { name: 'Emirates', code: 'EK', num: '623' },
        { name: 'flydubai', code: 'FZ', num: '392' },
        { name: 'Pakistan International Airlines (PIA)', code: 'PK', num: '221' },
        { name: 'Saudi Arabian Airlines', code: 'SV', num: '737' },
        { name: 'Qatar Airways', code: 'QR', num: '629' }
      ];
      const offers = json.data.offers.slice(0, 15).map((o, idx) => {
        const slice = o.slices && o.slices[0];
        const seg0 = slice && slice.segments && slice.segments[0];
        const segLast = slice && slice.segments && slice.segments[slice.segments.length - 1];
        const stops = slice && slice.segments ? slice.segments.length - 1 : 0;
        const sim = AIRLINE_POOL[idx % AIRLINE_POOL.length];
        let rawAirline = (seg0 && seg0.operating_carrier && seg0.operating_carrier.name) || (seg0 && seg0.marketing_carrier && seg0.marketing_carrier.name) || (o.owner && o.owner.name) || '';
        const isDummy = !rawAirline || rawAirline.toLowerCase().includes('duffel');
        const airline = isDummy ? sim.name : rawAirline;
        const flightNo = isDummy ? (sim.code + '-' + sim.num) : (seg0 && seg0.marketing_carrier ? (seg0.marketing_carrier.iata_code + '-' + seg0.marketing_carrier_flight_number) : sim.code + '-' + sim.num);
        const depTime = seg0 && seg0.departing_at ? seg0.departing_at.replace('T', ' ').slice(0, 16) : (date + ' 04:15');
        const arrTime = segLast && segLast.arriving_at ? segLast.arriving_at.replace('T', ' ').slice(0, 16) : (date + ' 07:45');
        const rawAmt = Number(o.total_amount || 0);
        const mult = RATES_PKR[o.total_currency] || 280;
        const farePKR = Math.round(rawAmt * mult);
        return {
          OfferID: o.id,
          Airline: airline,
          FlightNo: flightNo,
          Origin: origin,
          Dest: dest,
          Route: tripType === 'roundtrip' ? (origin + ' ⇄ ' + dest) : (tripType === 'multicity' ? (origin + '→' + dest + ' / ' + origin2 + '→' + dest2) : (origin + ' → ' + dest)),
          Stops: stops === 0 ? 'Non-Stop Direct' : stops + ' Stop(s)',
          DepTime: depTime,
          ArrTime: arrTime,
          Baggage: '23-30 KG Checked + 7 KG Hand Carry',
          Luggage: '23-30 KG Checked + 7 KG Hand Carry',
          FarePKR: farePKR
        };
      });
      return res.json({ ok: true, offers });
    }

    if (action === 'requestDeposit' || action === 'submitDeposit') {
      const amt = Math.round(Number(p.amountPKR || 0));
      if (!Number.isFinite(amt) || amt < 100) return res.json({ ok: false, message: 'Minimum deposit PKR 100.' });
      const slipImg = String(p.slipImage || '');
      if (slipImg.length > 450000) return res.json({ ok: false, message: 'Slip image too large. Please upload a clearer/smaller image.' });
      DB.deposits.unshift({
        DepositID: 'DEP-' + crypto.randomInt(10000, 99999),
        CreatedAt: getPKTimeStr(),
        AgentEmail: email,
        AgencyName: a.AgencyName,
        BankName: String(p.bankName || 'UBL').trim(),
        AmountPKR: amt,
        TxRef: String(p.txRef || p.refNo || ('SLIP-' + Date.now().toString().slice(-6))).trim(),
        SlipImage: slipImg,
        Status: 'PENDING'
      });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Deposit slip submitted! Please contact Head Office.' });
    }

    if (action === 'addBooking') {
      const paxName = String(p.passengerName || '').trim();
      const ppNo = String(p.passportNo || '').trim().toUpperCase();
      if (!paxName || !/^[A-Z0-9]{6,12}$/.test(ppNo)) return res.json({ ok: false, message: 'Invalid Passenger Name or Passport Number.' });

      let fare = Number(p.farePKR || 0);
      let holdMins = 0;
      const fareId = String(p.fareId || '').trim();
      if (fareId) {
        const matchedFare = DB.fares.find(f => String(f.ID) === fareId);
        if (!matchedFare) return res.json({ ok: false, message: 'Selected fare/package is no longer available.' });
        if (matchedFare.Category !== 'Visit Visa') {
          const seatsLeft = Number(matchedFare.Seats || 0);
          if (seatsLeft <= 0) return res.json({ ok: false, message: 'Sorry, no seats left in this group.' });
          matchedFare.Seats = seatsLeft - 1;
        }
        fare = Number(matchedFare.FarePKR || 0);
        holdMins = Number(matchedFare.HoldMins || 30);
      }
      if (!Number.isFinite(fare) || fare <= 0) return res.json({ ok: false, message: 'Invalid fare amount.' });

      const passportDoc = String(p.passportDoc || '');
      const photoDoc = String(p.photoDoc || '');
      if (passportDoc.length > 500000 || photoDoc.length > 500000) {
        return res.json({ ok: false, message: 'Uploaded document file is too large.' });
      }

      const itStr = String(p.itemTitle || '');
      if (!holdMins) {
        const dMatch = itStr.match(/\{DATE:(\d{4}-\d{2}-\d{2})/);
        const depMs = (dMatch && dMatch[1]) ? Date.parse(dMatch[1] + 'T12:00:00Z') : (Date.now() + 10 * 86400000);
        const hrsToDep = (depMs - Date.now()) / 3600000;
        const isLCC = /flyjinnah|airsial|airblue|serene|flydubai|airarabia|jazeera|salam/i.test(itStr);
        holdMins = 1440;
        if (hrsToDep <= 6) holdMins = 30;
        else if (hrsToDep <= 24) holdMins = 120;
        else if (isLCC) holdMins = hrsToDep <= 72 ? 120 : 360;
        else if (hrsToDep <= 72) holdMins = 720;
        if (p.holdMins) holdMins = Number(p.holdMins);
      }

      const bId = 'GI-' + crypto.randomInt(100000, 999999);
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let autoPnr = '';
      for (let i = 0; i < 6; i++) autoPnr += chars[crypto.randomInt(0, chars.length)];
      const holdUntil = Date.now() + (holdMins * 60 * 1000);
      const pkTime = getPKTimeStr();
      const paxMail = String(p.passengerEmail || '').trim();

      DB.bookings.unshift({
        BookingID: bId,
        FareID: fareId,
        CreatedAt: pkTime,
        HoldUntil: holdUntil,
        AgentEmail: email,
        AgencyName: a.AgencyName,
        PassengerName: paxName,
        PassengerEmail: paxMail,
        PassportNo: ppNo,
        Dob: String(p.dob || ''),
        PassportExpiry: String(p.passportExpiry || ''),
        Nationality: String(p.nationality || 'Pakistani'),
        PaxMobile: String(p.paxMobile || ''),
        Category: String(p.category || ''),
        ItemTitle: itStr,
        FarePKR: fare,
        PNR: autoPnr,
        TicketNo: '',
        PassportDoc: passportDoc,
        PhotoDoc: photoDoc,
        WasPaid: false,
        Refunded: false,
        Status: 'PENDING'
      });
      await saveDB(DB);
      const recipients = [email, paxMail, ...(DB.admins || [])].filter((v, idx, arr) => v && v.includes('@') && arr.indexOf(v) === idx).join(',');
      const mailNote = await sendVoucherEmail(recipients, bId, pkTime, a.AgencyName, paxName, ppNo, p.category, itStr, fare, 'HOLD / PENDING (PNR: ' + autoPnr + ')');
      return res.json({ ok: true, bookingId: bId, pnr: autoPnr, holdUntil, message: 'Booking Held (PENDING)! PNR: ' + autoPnr + mailNote });
    }

    if (action === 'adminIssueBooking' && isAdmin) {
      const bk = DB.bookings.find(b => b.BookingID === p.bookingId);
      if (!bk) return res.json({ ok: false, message: 'Booking not found.' });
      const curSt = String(bk.Status || '').toUpperCase();
      if (curSt === 'CONFIRMED' || curSt === 'ISSUED') return res.json({ ok: false, message: 'Booking is already ISSUED / CONFIRMED.' });
      if (curSt === 'CANCELED') return res.json({ ok: false, message: 'Cannot issue a CANCELED booking.' });

      const agentAcc = DB.agents[bk.AgentEmail];
      const fare = Number(bk.FarePKR || 0);
      if (agentAcc && !DB.admins.includes(bk.AgentEmail)) {
        const bal = Number(agentAcc.BalancePKR || 0);
        if (bal < fare) {
          return res.json({ ok: false, message: 'Cannot Issue: Agent wallet balance (PKR ' + bal.toLocaleString() + ') is less than Fare (PKR ' + fare.toLocaleString() + ').' });
        }
        agentAcc.BalancePKR = bal - fare;
        bk.WasPaid = true;
      } else {
        bk.WasPaid = true;
      }
      if (p.pnr && String(p.pnr).trim()) bk.PNR = String(p.pnr).trim().toUpperCase();
      bk.TicketNo = String(p.ticketNo || '').trim();
      bk.Status = 'CONFIRMED';
      await saveDB(DB);

      const recipients = [bk.AgentEmail, bk.PassengerEmail, ...(DB.admins || [])].filter((v, idx, arr) => v && v.includes('@') && arr.indexOf(v) === idx).join(',');
      await sendVoucherEmail(recipients, bk.BookingID, bk.CreatedAt, bk.AgencyName, bk.PassengerName, bk.PassportNo, bk.Category, bk.ItemTitle, fare, 'ISSUED / CONFIRMED (PNR: ' + (bk.PNR || '') + (bk.TicketNo ? ' | TKT: ' + bk.TicketNo : '') + ')');
      return res.json({ ok: true, message: 'Ticket Issued & CONFIRMED! PNR: ' + bk.PNR });
    }

    if (action === 'adminDeleteBooking' && isAdmin) {
      const before = DB.bookings.length;
      DB.bookings = DB.bookings.filter(b => b.BookingID !== p.bookingId);
      if (DB.bookings.length === before) return res.json({ ok: false, message: 'Booking not found.' });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Booking deleted permanently!' });
    }

    if (action === 'adminCancelBooking' && isAdmin) {
      const bk = DB.bookings.find(b => b.BookingID === p.bookingId);
      if (!bk) return res.json({ ok: false, message: 'Booking not found.' });
      const prevSt = String(bk.Status || '').toUpperCase();
      if (prevSt === 'CANCELED') return res.json({ ok: false, message: 'Booking is already CANCELED.' });

      if (bk.WasPaid || prevSt === 'CONFIRMED' || prevSt === 'ISSUED') {
        const agentAcc = DB.agents[bk.AgentEmail];
        if (agentAcc && !DB.admins.includes(bk.AgentEmail)) {
          agentAcc.BalancePKR = Number(agentAcc.BalancePKR || 0) + Number(bk.FarePKR || 0);
        }
        bk.Refunded = true;
      }
      if (bk.FareID && bk.Category !== 'Visit Visa') {
        const matchedFare = DB.fares.find(f => String(f.ID) === String(bk.FareID));
        if (matchedFare) matchedFare.Seats = Number(matchedFare.Seats || 0) + 1;
      }
      bk.Status = 'CANCELED';
      await saveDB(DB);
      return res.json({ ok: true, message: bk.Refunded ? 'Booking CANCELED & Fare Refunded to Wallet!' : 'Hold Booking CANCELED!' });
    }

    if (action === 'adminAddFare' && isAdmin) {
      const fareVal = Number(p.farePKR || 0);
      if (!p.title || fareVal <= 0) return res.json({ ok: false, message: 'Title and valid PKR fare required.' });
      DB.fares.unshift({
        ID: 'FARE-' + Date.now(),
        Category: p.category || 'Group Flight',
        Title: String(p.title || '').trim(),
        Timing: String(p.timing || 'As per Schedule').trim(),
        Luggage: String(p.luggage || '30 KG + 7 KG').trim(),
        Meal: String(p.meal || 'Included').trim(),
        Stay: String(p.stay || 'Direct / N/A').trim(),
        Details: String(p.details || '').trim(),
        TravelDate: String(p.travelDate || '').trim(),
        Seats: Number(p.seats || 15),
        HoldMins: Number(p.holdMins || 30),
        FarePKR: fareVal,
        Status: 'ACTIVE'
      });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Fare/Package published with ' + (p.holdMins || 30) + ' mins hold timer!' });
    }

    if (action === 'adminDeleteFare' && isAdmin) {
      const before = DB.fares.length;
      DB.fares = DB.fares.filter(f => String(f.ID) !== String(p.fareId));
      if (DB.fares.length === before) return res.json({ ok: false, message: 'Fare/Package not found.' });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Fare/Package removed!' });
    }

    if (action === 'adminAddBank' && isAdmin) {
      if (!p.bankName || !p.accountNumber) return res.json({ ok: false, message: 'Bank Name and Account Number required.' });
      DB.banks.push({
        BankID: 'BNK-' + Date.now(),
        BankName: String(p.bankName).trim(),
        AccountTitle: String(p.accountTitle || '').trim(),
        AccountNumber: String(p.accountNumber).trim(),
        IBAN: String(p.iban || '').trim()
      });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Payment account added!' });
    }

    if (action === 'adminDeleteBank' && isAdmin) {
      const before = DB.banks.length;
      DB.banks = DB.banks.filter((b, idx) => {
        if (p.bankId && b.BankID) return String(b.BankID) !== String(p.bankId);
        if (p.accountNumber) return String(b.AccountNumber) !== String(p.accountNumber);
        return String(idx) !== String(p.index);
      });
      if (DB.banks.length === before) return res.json({ ok: false, message: 'Bank account not found.' });
      await saveDB(DB);
      return res.json({ ok: true, message: 'Payment account removed!' });
    }

    if (action === 'adminManageAgent' && isAdmin) {
      const target = DB.agents[String(p.targetEmail || '').trim().toLowerCase()];
      if (!target) return res.json({ ok: false, message: 'Agent not found.' });
      if (p.subAction === 'APPROVE') {
        target.Status = 'APPROVED';
        target.FailedAttempts = 0;
        target.TotpFailedAttempts = 0;
      } else if (p.subAction === 'BLOCK') {
        target.Status = 'BLOCKED';
        target.SessionToken = '';
      } else if (p.subAction === 'ADD_LIMIT') {
        const amt = Number(p.amountPKR || 0);
        if (!Number.isFinite(amt) || amt <= 0) return res.json({ ok: false, message: 'Enter valid positive PKR amount.' });
        target.BalancePKR = Number(target.BalancePKR || 0) + Math.round(amt);
      } else if (p.subAction === 'RESET_PASSWORD') {
        const np = String(p.newPassword || '');
        if (np.length < 6) return res.json({ ok: false, message: 'New password must be at least 6 characters.' });
        target.PasswordHash = hashPwd(np);
        target.TotpSecret = generateSecret();
        target.TotpVerified = 'NO';
        target.Status = 'APPROVED';
        target.FailedAttempts = 0;
        target.TotpFailedAttempts = 0;
        target.SessionToken = '';
      } else {
        return res.json({ ok: false, message: 'Invalid admin sub-action.' });
      }
      await saveDB(DB);
      return res.json({ ok: true, message: 'Agent updated: ' + p.subAction });
    }

    if (action === 'adminApproveDeposit' && isAdmin) {
      const dep = DB.deposits.find(d => d.DepositID === p.depositId);
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
};
```

---

### Step 2: `index.html` Update Karein (Taake `POST`, Slip/Visa Image Upload, Bank/Fare Delete aur Slip Viewer Backend se Connect Ho Jayein)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Golan International Travel &amp; Tours | Official B2B Portal</title>
  <style>
    :root { --navy:#0b1f44; --blue:#163b7a; --teal:#0f4c5c; --gold:#d97706; --bg:#eef2f7; --text:#0f172a; --muted:#475569; --border:#dbe3ee; --green:#15803d; --red:#b91c1c; }
    * { box-sizing:border-box; margin:0; padding:0; font-family:'Segoe UI',system-ui,-apple-system,sans-serif; }
    body { background:radial-gradient(circle at top right,#e0e7ff 0%,#f1f5f9 45%,#e2e8f0 100%); color:var(--text); min-height:100vh; }
    .hidden { display:none !important; }
    .topbar { background:#050e24; color:#cbd5e1; font-size:11.5px; font-weight:600; letter-spacing:0.4px; padding:8px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-bottom:1px solid rgba(251,191,36,0.25); }
    .badge { background:rgba(217,119,6,0.18); color:#fbbf24; padding:3px 11px; border-radius:99px; font-weight:700; border:1px solid rgba(251,191,36,0.45); }
    .wa-btn { background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; text-decoration:none; padding:5px 13px; border-radius:99px; font-weight:700; font-size:11.5px; box-shadow:0 2px 8px rgba(22,163,74,0.35); }
    header { background:linear-gradient(135deg,#071530 0%,#0b1f44 55%,#163b7a 100%); color:#fff; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; border-bottom:3px solid var(--gold); box-shadow:0 6px 24px rgba(11,31,68,0.22); }
    .brand { display:flex; align-items:center; gap:14px; }
    .logo-box { width:108px; height:58px; border-radius:10px; background:#061229; overflow:hidden; flex-shrink:0; border:2px solid #fbbf24; box-shadow:0 4px 14px rgba(0,0,0,0.35); }
    .logo-box img { width:100%; height:100%; object-fit:contain; display:block; }
    .brand h1 { font-size:20px; font-weight:900; letter-spacing:0.6px; }
    .brand p { font-size:11px; color:#fbbf24; font-weight:700; letter-spacing:0.4px; margin-top:2px; }
    .ceo-box { text-align:right; font-size:12px; background:rgba(255,255,255,0.08); padding:8px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.16); cursor:pointer; }
    .ceo-box strong { display:block; font-size:14px; color:#fbbf24; font-weight:800; }
    .container { max-width:1360px; margin:20px auto; padding:0 14px; }
    .auth-grid { display:grid; grid-template-columns:1.12fr 0.88fr; gap:28px; align-items:center; margin-top:14px; }
    .hero-panel h2 { font-size:32px; font-weight:900; color:var(--navy); line-height:1.18; margin:14px 0; }
    .hero-panel h2 span { color:var(--blue); }
    .hero-panel p { color:var(--muted); font-size:14.5px; line-height:1.65; margin-bottom:20px; }
    .feature-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
    .f-card { background:#fff; padding:16px; border-radius:14px; border:1px solid var(--border); border-top:3px solid var(--navy); box-shadow:0 6px 18px rgba(15,23,42,0.05); transition:0.18s; }
    .f-card:hover { transform:translateY(-3px); border-top-color:var(--gold); }
    .f-card h4 { color:var(--navy); font-size:14px; font-weight:800; margin-bottom:5px; }
    .f-card p { font-size:12px; color:var(--muted); margin:0; }
    .card { background:#fff; border-radius:16px; padding:22px; border:1px solid var(--border); border-top:4px solid var(--navy); box-shadow:0 10px 28px rgba(11,31,68,0.08); margin-bottom:16px; }
    .card h3 { font-size:19px; font-weight:900; color:var(--navy); margin-bottom:6px; }
    .sub-text { font-size:12.5px; color:var(--muted); margin-bottom:16px; }
    .form-group { margin-bottom:12px; }
    label { display:block; font-size:11.5px; font-weight:700; color:#1e293b; margin-bottom:4px; }
    input, select { width:100%; padding:10px 12px; border:1.5px solid #cbd5e1; border-radius:9px; font-size:13.5px; background:#f8fafc; transition:0.15s; }
    input:focus, select:focus { outline:none; border-color:var(--blue); background:#fff; box-shadow:0 0 0 3px rgba(22,59,122,0.14); }
    .btn { width:100%; padding:11px 16px; border:none; border-radius:9px; font-size:13.5px; font-weight:800; cursor:pointer; transition:0.15s; }
    .btn:hover:not(:disabled) { transform:translateY(-1px); }
    .btn:disabled { opacity:0.65; cursor:not-allowed; }
    .btn-primary { background:linear-gradient(135deg,#0b1f44 0%,#163b7a 100%); color:#fff; box-shadow:0 4px 14px rgba(11,31,68,0.22); }
    .btn-gold { background:linear-gradient(135deg,#d97706 0%,#b45309 100%); color:#fff; }
    .btn-green { background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; }
    .btn-red { background:linear-gradient(135deg,#dc2626,#b91c1c); color:#fff; }
    .btn-sm { width:auto; padding:6px 11px; font-size:11.5px; border-radius:7px; }
    .alert { padding:11px 14px; border-radius:9px; font-size:12.5px; margin-bottom:14px; font-weight:600; }
    .alert-info { background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; }
    .alert-error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
    .alert-success { background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; }
    .qr-box { text-align:center; background:#f8fafc; border:2px dashed #94a3b8; border-radius:12px; padding:14px; margin-bottom:14px; }
    .qr-box img { width:170px; height:170px; border-radius:8px; border:4px solid #fff; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
    .secret-pill { display:inline-block; background:#e2e8f0; padding:4px 10px; border-radius:6px; font-family:monospace; font-size:13px; font-weight:800; color:var(--navy); margin-top:4px; }
    .dash-wrap { display:grid; grid-template-columns:205px 1fr; gap:16px; align-items:start; }
    .sidebar { background:#fff; border-radius:16px; border:1px solid var(--border); padding:16px 12px; box-shadow:0 6px 20px rgba(15,23,42,0.05); position:sticky; top:14px; }
    .side-btn { width:100%; text-align:left; background:#fff; border:1px solid transparent; padding:9px 11px; border-radius:9px; font-weight:700; font-size:12.5px; cursor:pointer; color:#334155; transition:0.15s; margin-bottom:4px; display:block; }
    .side-btn:hover { background:#f1f5f9; color:var(--navy); }
    .side-btn.active { background:linear-gradient(135deg,#0b1f44,#163b7a); color:#fff; box-shadow:0 4px 12px rgba(11,31,68,0.2); }
    .tab-btn { background:#fff; border:1px solid var(--border); padding:8px 16px; border-radius:99px; font-weight:800; font-size:12.5px; cursor:pointer; color:#334155; }
    .tab-btn.active { background:linear-gradient(135deg,#0b1f44,#163b7a); color:#fff; border-color:var(--navy); }
    .stats-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px; }
    .stat-box { background:#fff; padding:15px 16px; border-radius:14px; border:1px solid #e2e8f0; display:flex; align-items:center; gap:12px; box-shadow:0 2px 8px rgba(15,23,42,0.03); }
    .journey-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
    .j-card { padding:14px; border-radius:12px; cursor:pointer; transition:0.15s; border:1px solid #e2e8f0; }
    .j-card:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(15,23,42,0.08); }
    .search-row { display:grid; grid-template-columns:1.3fr auto 1.3fr 1fr 1fr auto; gap:10px; align-items:end; }
    .bank-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; }
    .bank-card { background:linear-gradient(135deg,#071530,#163b7a); color:#fff; padding:18px; border-radius:14px; border-bottom:3px solid var(--gold); box-shadow:0 8px 20px rgba(11,31,68,0.16); position:relative; }
    .bank-card h4 { color:#fbbf24; font-size:14.5px; margin-bottom:8px; }
    .bank-card p { font-size:12.5px; margin:4px 0; color:#e2e8f0; }
    .bank-card .mono { font-family:monospace; font-size:14px; font-weight:800; color:#fff; }
    .admin-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    th { background:#f1f5f9; text-align:left; padding:9px 7px; color:#0b1f44; font-weight:800; font-size:10.5px; text-transform:uppercase; border-bottom:2px solid #cbd5e1; line-height:1.25; }
    td { padding:9px 7px; border-bottom:1px solid var(--border); vertical-align:middle; }
    #tab-bookings table { width:100%; table-layout:auto; font-size:11.5px; }
    #tab-bookings th, #tab-bookings td { padding:8px 6px; word-break:break-word; }
    .act-wrap { display:flex; flex-wrap:wrap; gap:4px; min-width:105px; max-width:140px; }
    .act-wrap .btn-sm { padding:4px 7px; font-size:10.5px; margin:0 !important; }
    .status-badge { padding:3px 8px; border-radius:99px; font-size:10px; font-weight:800; display:inline-block; white-space:nowrap; }
    .st-APPROVED, .st-CONFIRMED, .st-ACTIVE, .st-ISSUED { background:#dcfce7; color:#166534; }
    .st-PENDING { background:#fef3c7; color:#92400e; }
    .st-BLOCKED, .st-CANCELED, .st-EXPIRED { background:#fee2e2; color:#991b1b; }
    .ticker-wrap { flex:1; overflow:hidden; white-space:nowrap; position:relative; }
    .ticker-move { display:inline-block; padding-left:100%; animation:golanTicker 28s linear infinite; font-size:12px; font-weight:600; }
    .ticker-wrap:hover .ticker-move { animation-play-state:paused; }
    @keyframes golanTicker { 0% { transform:translateX(0); } 100% { transform:translateX(-100%); } }
    @media (max-width:960px) { .dash-wrap, .auth-grid, .admin-grid { grid-template-columns:1fr; } .sidebar { position:static; } .stats-4 { grid-template-columns:repeat(2,1fr); } .journey-grid { grid-template-columns:repeat(2,1fr); } .search-row { grid-template-columns:1fr; } }
    @media (max-width:600px) { .feature-cards, .stats-4 { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <div class="topbar">
    <div>OFFICIAL B2B TRAVEL, TICKETING &amp; UMRAH PARTNER PORTAL</div>
    <div style="display:flex; gap:10px; align-items:center;">
      <span class="badge">🔐 OTP 2FA + MIDNIGHT LOCK</span>
      <a class="wa-btn" href="https://whatsapp.com/channel/0029VacqwWx90x2u89AOGs2L" target="_blank" rel="noopener noreferrer">📢 Official WhatsApp Channel</a>
    </div>
  </div>
  <header>
    <div class="brand">
      <div class="logo-box"><img id="mainHeaderLogo" src="logo.png.jpeg" alt="Golan Logo" onerror="this.style.display='none'" /></div>
      <div><h1>GOLAN INTERNATIONAL</h1><p>TRAVEL &amp; TOURISM • AIRLINE TICKETING &amp; UMRAH SERVICES</p></div>
    </div>
    <div class="ceo-box" onclick="openCeoWhatsApp()"><span>Chief Executive</span><strong>Shan Chairman</strong><span style="color:#86efac;font-weight:700;">📞 0345-3326318 (WhatsApp) | Toba Tek Singh</span></div>
  </header>

  <div class="container">
    <div id="authSection" class="auth-grid">
      <div class="hero-panel">
        <span style="background:#dbeafe; color:#1e40af; padding:5px 12px; border-radius:99px; font-size:12px; font-weight:700;">B2B AGENT &amp; SUB-AGENT PORTAL</span>
        <h2>Pakistan’s Trusted B2B Portal for <span>Group Flights, Umrah &amp; Visit Visas</span></h2>
        <p>Protected with Enterprise Google Authenticator (2FA) &amp; Auto Midnight 12:00 AM Session Lock. Authorized travel agencies only.</p>
        <div class="feature-cards">
          <div class="f-card"><h4>✈️ Group Fares</h4><p>Instant seat hold &amp; live KSA, UAE &amp; UK fares.</p></div>
          <div class="f-card"><h4>🕋 Umrah B2B</h4><p>Makkah/Madinah hotels, transport &amp; instant visas.</p></div>
          <div class="f-card"><h4>🛂 Visit Visas</h4><p>Fast processing for Dubai, Saudi, Schengen &amp; UK.</p></div>
        </div>
      </div>

      <div>
        <div id="loginBox" class="card">
          <h3>B2B Partner Login</h3>
          <p class="sub-text">Protected with Google Authenticator 2FA &amp; Midnight Lock.</p>
          <div id="loginAlert" class="alert alert-error hidden"></div>
          <form onsubmit="handleLoginStep1(event)">
            <div class="form-group"><label>Agent Email Address</label><input type="email" id="loginEmail" placeholder="golaninternational322@gmail.com" required /></div>
            <div class="form-group"><label>Password</label><input type="password" id="loginPassword" placeholder="••••••••" required /></div>
            <button type="submit" id="loginBtn" class="btn btn-primary">Verify Credentials →</button>
          </form>
          <div style="text-align:center; margin-top:14px; padding-top:14px; border-top:1px solid var(--border);">
            <p style="font-size:12px; color:var(--muted); margin-bottom:8px;">Want to become an authorized sub-agent?</p>
            <button type="button" class="btn btn-gold" onclick="showRegister()">Register New Travel Agency (Free)</button>
          </div>
        </div>

        <div id="totpBox" class="card hidden">
          <h3>🔐 Google Authenticator 2FA</h3>
          <p class="sub-text">Session remains active until <strong>12:00 AM Midnight</strong>.</p>
          <div id="totpAlert" class="alert alert-info">Enter the 6-digit code from your Google Authenticator app.</div>
          <div id="qrSetupArea" class="qr-box hidden">
            <p style="font-size:12px; font-weight:700; color:var(--navy); margin-bottom:8px;">📲 First-Time Setup: Scan QR in Google Authenticator App</p>
            <img id="qrImage" src="" alt="2FA QR Code" />
            <div style="font-size:11px; color:var(--muted); margin-top:6px;">Or enter manual setup key:</div>
            <div id="manualSecret" class="secret-pill"></div>
          </div>
          <form onsubmit="handleVerifyTotp(event)">
            <div class="form-group"><label>6-Digit Authenticator Code</label><input type="text" id="totpCode" maxlength="6" inputmode="numeric" pattern="[0-9]{6}" placeholder="123456" style="font-size:20px; text-align:center; letter-spacing:6px; font-weight:800;" required /></div>
            <button type="submit" id="totpBtn" class="btn btn-primary">Unlock Portal Until 12:00 AM →</button>
          </form>
          <button type="button" class="btn" style="margin-top:8px; background:#e2e8f0; color:#334155;" onclick="backToLogin()">← Back to Login</button>
        </div>

        <div id="registerBox" class="card hidden">
          <h3>Register B2B Sub-Agent</h3>
          <p class="sub-text">Account requires Chief Executive approval before login.</p>
          <div id="regAlert" class="alert hidden"></div>
          <form onsubmit="handleRegister(event)">
            <div class="form-group"><label>Travel Agency Name</label><input type="text" id="regAgency" required /></div>
            <div class="form-group"><label>City</label><input type="text" id="regCity" required /></div>
            <div class="form-group"><label>Mobile / WhatsApp</label><input type="text" id="regMobile" placeholder="03XX-XXXXXXX" required /></div>
            <div class="form-group"><label>Official Email</label><input type="email" id="regEmail" required /></div>
            <div class="form-group"><label>Create Password (min 6 chars)</label><input type="password" id="regPass" minlength="6" required /></div>
            <button type="submit" id="regBtn" class="btn btn-gold">Submit Registration for Approval</button>
          </form>
          <button type="button" class="btn" style="margin-top:8px; background:#e2e8f0; color:#334155;" onclick="backToLogin()">← Back to Login</button>
        </div>
      </div>
    </div>

    <div id="dashboardSection" class="dash-wrap hidden">
      <aside class="sidebar">
        <div style="text-align:center; padding-bottom:12px; border-bottom:1px solid #e2e8f0; margin-bottom:12px;">
          <div style="font-size:14px; font-weight:900; color:#0b1f44;">GOLAN INTERNATIONAL</div>
          <div id="sideSubAgentName" style="font-size:11px; font-weight:800; color:#d97706; margin-top:3px; text-transform:uppercase;">SUB-AGENT PORTAL</div>
        </div>
        <button type="button" class="side-btn active" data-tab="liveair" onclick="switchTab('liveair',this)">🏠 Dashboard</button>
        <button type="button" class="side-btn" data-tab="fares" onclick="openFareCategoryTab('ALL',this)">🛫 Group Fares &amp; Visas</button>
        <button type="button" class="side-btn" data-tab="bookings" onclick="switchTab('bookings',this)">📋 Bookings &amp; Receipts</button>
        <button type="button" class="side-btn" data-tab="ledger" onclick="switchTab('ledger',this)">📒 My Ledger</button>
        <button type="button" class="side-btn" data-tab="banks" onclick="switchTab('banks',this)">🏦 Banks &amp; Deposit</button>
        <button type="button" id="sideAdminBtn" class="side-btn hidden" data-tab="admin" onclick="switchTab('admin',this)">👑 Super Admin</button>
        <button type="button" class="side-btn" onclick="openCeoWhatsApp()">💬 Give Feedback!</button>
        <div style="margin-top:12px; padding-top:10px; border-top:1px solid #e2e8f0;">
          <button type="button" class="side-btn" style="color:#b91c1c; background:#fef2f2; border-color:#fecaca;" onclick="logout()">⏻ Logout</button>
        </div>
      </aside>

      <div style="min-width:0;">
        <div style="background:linear-gradient(90deg,#0b1f44,#1e3a8a); color:#fff; padding:9px 14px; border-radius:12px; margin-bottom:14px; display:flex; align-items:center; gap:12px; overflow:hidden;">
          <span style="background:#d97706; color:#fff; padding:3px 10px; border-radius:6px; font-size:11px; font-weight:800; white-space:nowrap;">💱 LIVE B2B RATES</span>
          <div class="ticker-wrap">
            <div class="ticker-move">
              <span id="liveB2bRatesText">1 USD = <strong>PKR 280.00</strong> &nbsp;•&nbsp; 1 SAR = <strong>PKR 74.65</strong> &nbsp;•&nbsp; 1 AED = <strong>PKR 76.25</strong> &nbsp;•&nbsp; 1 GBP = <strong>PKR 355.00</strong> &nbsp;•&nbsp; 1 EUR = <strong>PKR 302.00</strong> &nbsp;•&nbsp; 1 OMR = <strong>PKR 727.00</strong></span>
              &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
              <span style="color:#fde68a;">📢 <strong>UPDATE:</strong> Special Umrah Group Fares &amp; UAE 30/60 Days Visit Visas Urgent Processing Available!</span>
            </div>
          </div>
        </div>

        <div id="dashHeroBanner" style="background:linear-gradient(115deg,#0f4c5c 0%,#136f82 55%,#1b8a99 100%); color:#fff; padding:20px 24px; border-radius:16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; box-shadow:0 8px 24px rgba(15,76,92,0.18);">
          <div style="max-width:560px;">
            <div id="liveDateClock" style="font-size:11px; font-weight:700; letter-spacing:0.8px; color:#bae6fd; text-transform:uppercase; margin-bottom:5px;">📅 GOLAN B2B PORTAL</div>
            <h2 style="font-size:23px; font-weight:800; margin:0 0 6px; color:#fff;"><span id="liveGreetingText">Assalam-o-Alaikum</span>, <span id="dashAgencyName">Partner</span></h2>
            <p style="font-size:12.5px; color:#e0f2fe; margin:0 0 12px; line-height:1.5;">Search live flights, book group fares, manage PNRs and track your account ledger from one place.</p>
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <button type="button" onclick="openFareCategoryTab('ALL')" style="background:#fff; color:#0f4c5c; border:none; padding:8px 14px; border-radius:8px; font-size:12px; font-weight:800; cursor:pointer;">✈️ View Group Fares</button>
              <button type="button" onclick="switchTab('bookings')" style="background:rgba(255,255,255,0.15); color:#fff; border:1px solid rgba(255,255,255,0.3); padding:8px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">📋 View Bookings</button>
              <span id="walletBadge" style="background:rgba(16,185,129,0.25); color:#ecfdf5; border:1px solid rgba(167,243,208,0.45); padding:7px 12px; border-radius:8px; font-size:12px; font-weight:800;">💰 Wallet: PKR 0</span>
            </div>
          </div>
          <div style="display:flex; gap:10px;">
            <div style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.22); padding:12px 16px; border-radius:12px; min-width:110px;">
              <div id="statTodayBookings" style="font-size:22px; font-weight:900;">0</div>
              <div style="font-size:10px; font-weight:700; color:#bae6fd;">BOOKINGS TODAY</div>
            </div>
            <div style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.22); padding:12px 16px; border-radius:12px; min-width:110px;">
              <div id="statAvailGroups" style="font-size:22px; font-weight:900;">0</div>
              <div style="font-size:10px; font-weight:700; color:#bae6fd;">AVAILABLE GROUPS</div>
            </div>
          </div>
        </div>

        <div id="dashHomeBlocks">
          <div class="stats-4">
            <div class="stat-box" style="border-left:4px solid #0284c7;"><div style="font-size:22px;">📊</div><div><div style="font-size:10.5px;font-weight:800;color:#64748b;">ALL BOOKINGS</div><div id="statTotalBookings" style="font-size:22px;font-weight:900;">0</div></div></div>
            <div class="stat-box" style="border-left:4px solid #16a34a;"><div style="font-size:22px;">✅</div><div><div style="font-size:10.5px;font-weight:800;color:#64748b;">CONFIRMED</div><div id="statSoldTickets" style="font-size:22px;font-weight:900;">0</div></div></div>
            <div class="stat-box" style="border-left:4px solid #d97706;"><div style="font-size:22px;">⏳</div><div><div style="font-size:10.5px;font-weight:800;color:#64748b;">ON HOLD</div><div id="statHoldTickets" style="font-size:22px;font-weight:900;">0</div></div></div>
            <div class="stat-box" style="border-left:4px solid #dc2626;"><div style="font-size:22px;">❌</div><div><div style="font-size:10.5px;font-weight:800;color:#64748b;">CANCELED / EXP</div><div id="statCanceledTickets" style="font-size:22px;font-weight:900;">0</div></div></div>
          </div>

          <div style="background:#fff; padding:16px; border-radius:16px; border:1px solid #e2e8f0; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div><h4 style="color:#0f172a; font-size:14.5px;">Browse Fares &amp; Packages by Journey</h4><span style="font-size:11.5px; color:#64748b;">Quick filter group flights, Umrah &amp; visit visas</span></div>
              <a href="javascript:void(0)" onclick="openFareCategoryTab('ALL')" style="font-size:12px; font-weight:700; color:#0f4c5c; text-decoration:none;">View All →</a>
            </div>
            <div class="journey-grid">
              <div class="j-card" onclick="openFareCategoryTab('ALL')" style="background:linear-gradient(135deg,#f8fafc,#e0f2fe);"><div style="font-size:18px;margin-bottom:4px;">🌐</div><div style="font-weight:800;font-size:13px;">All Groups</div><div style="font-size:11px;color:#64748b;">Complete inventory</div></div>
              <div class="j-card" onclick="openFareCategoryTab('DXB')" style="background:linear-gradient(135deg,#f8fafc,#eef2ff);"><div style="font-size:18px;margin-bottom:4px;">🇦🇪</div><div style="font-weight:800;font-size:13px;">UAE / Dubai</div><div style="font-size:11px;color:#64748b;">DXB &amp; SHJ fares</div></div>
              <div class="j-card" onclick="openFareCategoryTab('JED')" style="background:linear-gradient(135deg,#f8fafc,#f0fdf4);"><div style="font-size:18px;margin-bottom:4px;">🇸🇦</div><div style="font-weight:800;font-size:13px;">KSA Flights</div><div style="font-size:11px;color:#64748b;">JED / RUH / MED</div></div>
              <div class="j-card" onclick="openFareCategoryTab('Umrah Package')" style="background:linear-gradient(135deg,#f8fafc,#fefce8);"><div style="font-size:18px;margin-bottom:4px;">🕋</div><div style="font-weight:800;font-size:13px;">Umrah B2B</div><div style="font-size:11px;color:#64748b;">Makkah &amp; Madinah</div></div>
              <div class="j-card" onclick="openFareCategoryTab('MCT')" style="background:linear-gradient(135deg,#f8fafc,#fff7ed);"><div style="font-size:18px;margin-bottom:4px;">🇴🇲</div><div style="font-weight:800;font-size:13px;">Muscat</div><div style="font-size:11px;color:#64748b;">Oman group fares</div></div>
              <div class="j-card" onclick="openFareCategoryTab('BAH')" style="background:linear-gradient(135deg,#f8fafc,#fdf2f8);"><div style="font-size:18px;margin-bottom:4px;">🇧🇭</div><div style="font-weight:800;font-size:13px;">Bahrain</div><div style="font-size:11px;color:#64748b;">Bahrain flights</div></div>
              <div class="j-card" onclick="openFareCategoryTab('LHR')" style="background:linear-gradient(135deg,#f8fafc,#f5f3ff);"><div style="font-size:18px;margin-bottom:4px;">🇬🇧</div><div style="font-weight:800;font-size:13px;">UK &amp; London</div><div style="font-size:11px;color:#64748b;">LHR &amp; MAN fares</div></div>
              <div class="j-card" onclick="openFareCategoryTab('Visit Visa')" style="background:linear-gradient(135deg,#f8fafc,#ecfeff);"><div style="font-size:18px;margin-bottom:4px;">🛂</div><div style="font-weight:800;font-size:13px;">Visit Visas</div><div style="font-size:11px;color:#64748b;">UAE, KSA &amp; Global</div></div>
            </div>
          </div>
        </div>

        <div id="tab-liveair" class="card">
          <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
            <button type="button" id="pill-oneway" class="tab-btn active" onclick="setTripType('oneway')">One Way</button>
            <button type="button" id="pill-roundtrip" class="tab-btn" onclick="setTripType('roundtrip')">Round Trip</button>
            <button type="button" id="pill-multicity" class="tab-btn" onclick="setTripType('multicity')">Multi City</button>
          </div>
          <form onsubmit="handleLiveFlightSearch(event)" style="background:#f8fafc; padding:14px; border-radius:12px; border:1px solid #cbd5e1;">
            <div class="search-row">
              <div class="form-group" style="margin:0; position:relative;">
                <label>From</label>
                <input type="text" id="srchOriginText" placeholder="From (City or Airport)" autocomplete="off" required onfocus="filterAirports('origin')" oninput="document.getElementById('srchOrigin').value='';filterAirports('origin')" />
                <input type="hidden" id="srchOrigin" />
                <div id="drop-origin" style="display:none; position:absolute; top:100%; left:0; min-width:290px; background:#fff; border:1px solid #cbd5e1; border-radius:10px; box-shadow:0 10px 25px rgba(15,23,42,0.15); max-height:220px; overflow-y:auto; z-index:999;"></div>
              </div>
              <button type="button" onclick="swapAirports()" title="Swap" style="height:40px; width:40px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; cursor:pointer; font-size:16px;">⇄</button>
              <div class="form-group" style="margin:0; position:relative;">
                <label>To</label>
                <input type="text" id="srchDestText" placeholder="To (City or Airport)" autocomplete="off" required onfocus="filterAirports('dest')" oninput="document.getElementById('srchDest').value='';filterAirports('dest')" />
                <input type="hidden" id="srchDest" />
                <div id="drop-dest" style="display:none; position:absolute; top:100%; left:0; min-width:290px; background:#fff; border:1px solid #cbd5e1; border-radius:10px; box-shadow:0 10px 25px rgba(15,23,42,0.15); max-height:220px; overflow-y:auto; z-index:999;"></div>
              </div>
              <div class="form-group" style="margin:0;"><label>Departure Date</label><input type="date" id="srchDate" required /></div>
              <div class="form-group" id="boxReturnDate" style="margin:0; display:none;"><label>Return Date</label><input type="date" id="srchReturnDate" /></div>
              <div class="form-group" style="margin:0;"><label>Cabin</label><select id="srchCabin"><option value="economy">Economy</option><option value="business">Business</option></select></div>
              <button type="submit" id="srchBtn" class="btn btn-primary" style="height:40px; width:auto; padding:0 20px; white-space:nowrap;">🔍 Search Flights</button>
            </div>
            <div id="boxMultiCity" style="display:none; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:12px; padding-top:12px; border-top:1px dashed #cbd5e1;">
              <div class="form-group" style="margin:0; position:relative;"><label>Flight 2 From</label><input type="text" id="srchOrigin2Text" placeholder="From" autocomplete="off" onfocus="filterAirports('origin2')" oninput="document.getElementById('srchOrigin2').value='';filterAirports('origin2')" /><input type="hidden" id="srchOrigin2" /><div id="drop-origin2" style="display:none; position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #cbd5e1; border-radius:8px; max-height:180px; overflow-y:auto; z-index:99;"></div></div>
              <div class="form-group" style="margin:0; position:relative;"><label>Flight 2 To</label><input type="text" id="srchDest2Text" placeholder="To" autocomplete="off" onfocus="filterAirports('dest2')" oninput="document.getElementById('srchDest2').value='';filterAirports('dest2')" /><input type="hidden" id="srchDest2" /><div id="drop-dest2" style="display:none; position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #cbd5e1; border-radius:8px; max-height:180px; overflow-y:auto; z-index:99;"></div></div>
              <div class="form-group" style="margin:0;"><label>Flight 2 Date</label><input type="date" id="srchDate2" /></div>
            </div>
          </form>
          <div id="liveFlightsBody" style="margin-top:16px;"></div>
        </div>

        <div id="tab-fares" class="card hidden">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
            <h3 id="faresTabHeading" style="margin:0;">🛫 Live Group Flights &amp; Packages</h3>
            <button type="button" class="btn btn-sm btn-primary" onclick="openFareCategoryTab('ALL')">Show All</button>
          </div>
          <div style="overflow-x:auto;">
            <table><thead><tr><th>Category &amp; Date</th><th>Route / Package Details</th><th>Status</th><th>B2B Fare</th><th>Action</th></tr></thead><tbody id="faresTableBody"></tbody></table>
          </div>
        </div>

        <div id="tab-bookings" class="card hidden">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
            <h3 style="margin:0;">📋 B2B Bookings Ledger &amp; Live PNR Status</h3>
            <div style="display:flex; gap:6px; align-items:center;">
              <input type="text" id="adminBookingSearchInput" oninput="filterBookingsTable()" placeholder="Search Booking ID, PNR, Name, Passport..." style="width:230px; padding:7px 10px; font-size:12px;" />
              <button type="button" class="btn btn-sm" style="background:#e2e8f0; color:#0f172a;" onclick="document.getElementById('adminBookingSearchInput').value='';filterBookingsTable();">✕</button>
            </div>
          </div>
          <div>
            <table><thead><tr><th>Booking ID</th><th>Date</th><th>Passenger &amp; Passport</th><th>Package / Flight</th><th>PNR / Ticket</th><th>Fare (PKR)</th><th>Status &amp; Timer</th><th>Action</th></tr></thead><tbody id="bookingsTableBody"></tbody></table>
          </div>
        </div>

        <div id="tab-banks" class="card hidden" style="border-top:4px solid #d97706;">
          <h3 style="margin-bottom:4px;">🏦 Official Payment Deposit Accounts</h3>
          <p class="sub-text">Deposit in any verified corporate account below and upload your slip for wallet credit.</p>
          <div id="banksGrid" class="bank-grid"></div>
          <div style="margin-top:20px; background:#eff6ff; border:1.5px solid #bfdbfe; border-top:4px solid #163b7a; border-radius:14px; padding:18px; max-width:520px;">
            <div id="headOfficeContactBanner" class="hidden" style="margin-bottom:12px; background:#fef3c7; border:1px solid #f59e0b; border-left:5px solid #b45309; border-radius:8px; padding:10px 12px; color:#78350f; font-size:12px;"><strong>📞 Please contact Head Office</strong> — Deposit slip submitted for verification.</div>
            <h4 style="color:#0b1f44; margin-bottom:6px;">📎 Smart Slip Upload (Auto-Amount Detection)</h4>
            <form onsubmit="handleInstantSlipUpload(event)">
              <div class="form-group"><label>1. Select Deposited Bank Account *</label><select id="depBank" required><option value="UBL (384263615)">UBL (United Bank Limited) — 384263615</option></select></div>
              <div class="form-group"><label>2. Attach Deposit Slip (Image) *</label><input type="file" id="depSlipFile" accept="image/*" onchange="autoScanBankSlip(this)" required style="background:#fff; border:1.5px dashed #163b7a;" /><div id="slipScanStatus" style="margin-top:5px; font-size:11.5px; font-weight:700; color:#1d4ed8;"></div></div>
              <div class="form-group"><label>3. Amount Deposited (PKR) *</label><input type="number" id="depAmount" placeholder="Auto-filled or enter PKR amount" min="100" required /></div>
              <input type="hidden" id="depRef" value="SLIP-AUTO" />
              <button type="submit" id="slipUploadBtn" class="btn btn-green">✅ Submit Deposit Slip</button>
            </form>
          </div>
        </div>

        <div id="tab-ledger" class="card hidden">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
            <div><h3 style="margin:0;">📒 B2B Account Ledger &amp; Statement</h3><span style="font-size:11.5px; color:#64748b;">Deposits, ticket deductions, and refunds</span></div>
            <button type="button" class="btn btn-sm btn-primary" onclick="switchTab('banks')">+ Submit Deposit Slip</button>
          </div>
          <div class="stats-4">
            <div style="background:#f0fdf4; padding:12px; border-radius:10px; border:1px solid #bbf7d0;"><div style="font-size:10px;font-weight:800;color:#166534;">➕ APPROVED DEPOSITS</div><div id="ldgTotalCredit" style="font-size:17px;font-weight:900;color:#15803d;margin-top:3px;">PKR 0</div></div>
            <div style="background:#fef2f2; padding:12px; border-radius:10px; border:1px solid #fecaca;"><div style="font-size:10px;font-weight:800;color:#991b1b;">➖ BOOKINGS SPENT</div><div id="ldgTotalDebit" style="font-size:17px;font-weight:900;color:#b91c1c;margin-top:3px;">PKR 0</div></div>
            <div style="background:#eff6ff; padding:12px; border-radius:10px; border:1px solid #bfdbfe;"><div style="font-size:10px;font-weight:800;color:#1e40af;">🔄 CANCELED / REFUND</div><div id="ldgTotalRefund" style="font-size:17px;font-weight:900;color:#1d4ed8;margin-top:3px;">PKR 0</div></div>
            <div style="background:#fffbeb; padding:12px; border-radius:10px; border:1px solid #fde68a;"><div style="font-size:10px;font-weight:800;color:#92400e;">⚖️ WALLET BALANCE</div><div id="ldgNetBalance" style="font-size:17px;font-weight:900;color:#b45309;margin-top:3px;">PKR 0</div><div id="ldgBalanceNote" style="font-size:10px;color:#92400e;">Available Balance</div></div>
          </div>
          <div style="overflow-x:auto;"><table><thead><tr><th>Date</th><th>Ref / ID</th><th>Description</th><th>Type</th><th>Debit</th><th>Credit</th><th>Status</th></tr></thead><tbody id="ledgerTableBody"></tbody></table></div>
        </div>

        <div id="tab-admin" class="hidden">
          <div class="admin-grid">
            <div class="card">
              <h3>➕ Add Live Fare / Package</h3>
              <form onsubmit="handleAdminAddFare(event)">
                <div class="form-group"><label>Category</label><select id="admCat" onchange="toggleVisaFields()"><option>Group Flight</option><option>Umrah Package</option><option>Visit Visa</option></select></div>
                <div class="form-group"><label id="lblTitle">Route &amp; Airline / Package Title</label><input type="text" id="admTitle" placeholder="e.g. LHE - JED (SV-737)" required /></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <div class="form-group" id="grpTiming"><label id="lblTiming">✈️ Flight Timing</label><input type="text" id="admTiming" placeholder="Dep 04:15 AM - Arr 07:45 AM" /></div>
                  <div class="form-group" id="grpLuggage"><label id="lblLuggage">🧳 Luggage</label><input type="text" id="admLuggage" placeholder="30 KG + 7 KG" /></div>
                  <div class="form-group" id="grpMeal"><label id="lblMeal">🍽️ Meal</label><input type="text" id="admMeal" placeholder="Hot Meal Included" /></div>
                  <div class="form-group" id="grpStay"><label id="lblStay">🏨 Stay / Transit</label><input type="text" id="admStay" placeholder="Direct / Hotels" /></div>
                </div>
                <div class="form-group"><label>📝 Additional Rules</label><input type="text" id="admDetails" placeholder="Refundable • Visa + Transport" required /></div>
                <div class="form-group" id="grpDate"><label>Travel Date</label><input type="text" id="admDate" placeholder="25 Nov 2026" required /></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <div class="form-group" id="grpSeats"><label>Total Seats</label><input type="number" id="admSeats" value="15" min="1" required /></div>
                  <div class="form-group"><label>⏳ Hold Limit (Mins)</label><input type="number" id="admHoldMins" value="30" min="5" required /></div>
                </div>
                <div class="form-group"><label>B2B Fare (PKR)</label><input type="number" id="admFare" min="1" required /></div>
                <button type="submit" id="addFareBtn" class="btn btn-primary">Publish to All Agents</button>
              </form>
            </div>
            <div class="card">
              <h3>🏦 Manage Official Payment Accounts</h3>
              <form onsubmit="handleAdminAddBank(event)">
                <div class="form-group"><label>Bank / Wallet Name</label><input type="text" id="bankName" required /></div>
                <div class="form-group"><label>Account Title</label><input type="text" id="bankTitle" value="Golan International Travel & Tourism" required /></div>
                <div class="form-group"><label>Account Number</label><input type="text" id="bankAcc" required /></div>
                <div class="form-group"><label>IBAN</label><input type="text" id="bankIban" /></div>
                <button type="submit" id="addBankBtn" class="btn btn-gold">Add Payment Account</button>
              </form>
              <div style="margin-top:16px; border-top:1px solid var(--border); padding-top:12px;">
                <h4 style="font-size:13px; color:var(--navy); margin-bottom:8px;">Active Accounts (Click Remove to Delete)</h4>
                <div id="adminBanksList" style="display:flex; flex-direction:column; gap:6px;"></div>
              </div>
            </div>
          </div>
          <div class="card"><h3>💰 Deposit Limit Requests</h3><div style="overflow-x:auto;"><table><thead><tr><th>ID</th><th>Date</th><th>Agency</th><th>Bank</th><th>Amount</th><th>Slip / TID</th><th>Status</th><th>Action</th></tr></thead><tbody id="adminDepositsBody"></tbody></table></div></div>
          <div class="card"><h3>🛡️ Sub-Agent Wallet &amp; Security Control</h3><div style="overflow-x:auto;"><table><thead><tr><th>Agency</th><th>Email</th><th>City / Mobile</th><th>Wallet (PKR)</th><th>Status</th><th>Controls</th></tr></thead><tbody id="adminAgentsBody"></tbody></table></div></div>
        </div>
      </div>
    </div>
  </div>

  <div id="attachmentModal" class="hidden" style="position:fixed; inset:0; background:rgba(15,23,42,0.75); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
    <div style="background:#fff; border-radius:16px; max-width:650px; width:100%; overflow:hidden; box-shadow:0 20px 45px rgba(0,0,0,0.35);">
      <div style="background:#0b1f44; color:#fff; padding:14px 18px; display:flex; justify-content:space-between; align-items:center;">
        <strong id="attachmentModalTitle" style="font-size:15px;">📎 Uploaded Document</strong>
        <button type="button" onclick="document.getElementById('attachmentModal').classList.add('hidden')" style="border:1px solid rgba(255,255,255,0.3); background:transparent; color:#fff; border-radius:6px; padding:4px 10px; cursor:pointer;">Close ✕</button>
      </div>
      <div id="attachmentModalBody" style="padding:18px; max-height:78vh; overflow-y:auto; text-align:center;"></div>
    </div>
  </div>

  <div id="gdsDetailsModal" class="hidden" style="position:fixed; inset:0; background:rgba(15,23,42,0.68); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;">
    <div style="background:#fff; border-radius:16px; max-width:680px; width:100%; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.28);">
      <div style="background:#0b1f44; color:#fff; padding:14px 18px; display:flex; justify-content:space-between; align-items:center;">
        <strong style="font-size:15px;">✈️ Flight Fare &amp; Baggage Details</strong>
        <button type="button" onclick="document.getElementById('gdsDetailsModal').classList.add('hidden')" style="border:1px solid rgba(255,255,255,0.3); background:transparent; color:#fff; border-radius:6px; padding:4px 10px; cursor:pointer;">Close ✕</button>
      </div>
      <div id="gdsModalContent" style="padding:18px; max-height:75vh; overflow-y:auto;"></div>
    </div>
  </div>

  <div id="bookingModal" class="hidden" style="position:fixed; inset:0; background:rgba(15,23,42,0.75); display:flex; align-items:center; justify-content:center; z-index:999; padding:16px; overflow-y:auto;">
    <div class="card" style="width:100%; max-width:500px; margin:auto;">
      <h3 id="modalHeaderTitle">✈️ Confirm B2B Booking</h3>
      <div style="background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:7px 12px; border-radius:8px; margin-top:6px; font-size:12px; font-weight:800; text-align:center;">⏳ Session Left: <span id="modalSessionClock">15:00</span></div>
      <p id="modalItemTitle" style="color:#0b1f44; font-weight:800; margin:8px 0 12px; font-size:13.5px;"></p>
      <form id="bookingForm" onsubmit="submitBooking(event)">
        <div id="flightFieldsWrap">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="form-group"><label>First Name *</label><input type="text" id="paxFirstName" placeholder="Given Name" /></div>
            <div class="form-group"><label>Last Name *</label><input type="text" id="paxLastName" placeholder="Surname" /></div>
            <div class="form-group"><label>Passport Number *</label><input type="text" id="paxPassport" placeholder="AB1234567" /></div>
            <div class="form-group"><label>Date of Birth</label><input type="date" id="paxDob" /></div>
            <div class="form-group"><label>Passport Expiry</label><input type="date" id="paxExp" /></div>
            <div class="form-group"><label>Nationality</label><input type="text" id="paxNat" value="Pakistani" /></div>
          </div>
          <div class="form-group"><label>Passenger Mobile / WhatsApp *</label><input type="text" id="paxMobile" placeholder="03XX-XXXXXXX" /></div>
          <div class="form-group"><label>Passenger / Agent Gmail (PDF Voucher)</label><input type="email" id="paxEmail" placeholder="example@gmail.com" /></div>
        </div>
        <div id="visaFieldsWrap" class="hidden">
          <div class="form-group"><label>Applicant Full Name *</label><input type="text" id="visaFullName" placeholder="As per Passport" /></div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="form-group"><label>Passport Number *</label><input type="text" id="visaPassport" placeholder="AB1234567" /></div>
            <div class="form-group"><label>Applicant Mobile *</label><input type="text" id="visaMobile" placeholder="03XX-XXXXXXX" /></div>
          </div>
          <div class="form-group"><label>📎 Passport Front Scan *</label><input type="file" id="visaDocPassport" accept="image/*,.pdf" style="background:#fff;border:1px dashed #94a3b8;" /></div>
          <div class="form-group"><label>📎 White BG Photo *</label><input type="file" id="visaDocPhoto" accept="image/*" style="background:#fff;border:1px dashed #94a3b8;" /></div>
        </div>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button type="submit" id="modalSubmitBtn" class="btn btn-green">Hold Booking (PENDING)</button>
          <button type="button" class="btn btn-red" onclick="closeBookingModal()">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    var API_URL = '/api/backend';
    var currentEmail = '', currentToken = '', currentIsAdmin = false, selectedItem = null;
    var CURRENT_TRIP_TYPE = 'oneway', ACTIVE_GDS_IDX = 0, modalTimerInterval = null, expiryInterval = null;
    var isBookingSubmitting = false;
    var DEFAULT_BANKS = [{ BankName:'UBL (United Bank Limited)', AccountTitle:'Golan International Travel & Tourism', AccountNumber:'384263615', IBAN:'PK30UNIL0109000384263615' }];
    var AIRPORTS_LIST = [
      { code:'LYP', label:'Faisalabad, PK - Faisalabad (LYP)' },
      { code:'LHE', label:'Lahore, PK - Allama Iqbal Intl (LHE)' },
      { code:'ISB', label:'Islamabad, PK - Islamabad Intl (ISB)' },
      { code:'KHI', label:'Karachi, PK - Jinnah Intl (KHI)' },
      { code:'MUX', label:'Multan, PK - Multan Intl (MUX)' },
      { code:'SKT', label:'Sialkot, PK - Sialkot Intl (SKT)' },
      { code:'PEW', label:'Peshawar, PK - Bacha Khan Intl (PEW)' },
      { code:'UET', label:'Quetta, PK - Quetta Intl (UET)' },
      { code:'JED', label:'Jeddah, SA - King Abdulaziz Intl (JED)' },
      { code:'MED', label:'Madinah, SA - Prince Mohammad Bin Abdulaziz (MED)' },
      { code:'RUH', label:'Riyadh, SA - King Khalid Intl (RUH)' },
      { code:'DMM', label:'Dammam, SA - King Fahd Intl (DMM)' },
      { code:'DXB', label:'Dubai, AE - Dubai Intl (DXB)' },
      { code:'SHJ', label:'Sharjah, AE - Sharjah Intl (SHJ)' },
      { code:'AUH', label:'Abu Dhabi, AE - Zayed Intl (AUH)' },
      { code:'DOH', label:'Doha, QA - Hamad Intl (DOH)' },
      { code:'MCT', label:'Muscat, OM - Muscat Intl (MCT)' },
      { code:'KWI', label:'Kuwait, KW - Kuwait Intl (KWI)' },
      { code:'BAH', label:'Bahrain, BH - Bahrain Intl (BAH)' },
      { code:'IST', label:'Istanbul, TR - Istanbul Airport (IST)' },
      { code:'LHR', label:'London, GB - Heathrow (LHR)' },
      { code:'MAN', label:'Manchester, GB - Manchester (MAN)' },
      { code:'BHX', label:'Birmingham, GB - Birmingham (BHX)' },
      { code:'JFK', label:'New York, US - John F. Kennedy (JFK)' },
      { code:'YYZ', label:'Toronto, CA - Pearson Intl (YYZ)' },
      { code:'KUL', label:'Kuala Lumpur, MY - KLIA (KUL)' },
      { code:'BKK', label:'Bangkok, TH - Suvarnabhumi (BKK)' },
      { code:'GYD', label:'Baku, AZ - Heydar Aliyev Intl (GYD)' }
    ];

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function callBackend(payload) {
      return fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      }).then(function(r) {
        if (!r.ok) throw new Error('Server error (' + r.status + ')');
        return r.json();
      });
    }

    function compressFileToDataUrl(file, maxW, quality) {
      return new Promise(function(resolve, reject) {
        if (!file) return resolve('');
        if (file.type === 'application/pdf') {
          if (file.size > 400000) return reject(new Error('PDF file must be under 400 KB (or upload a photo/image).'));
          var rd = new FileReader();
          rd.onload = function() { resolve(rd.result || ''); };
          rd.onerror = function() { reject(new Error('Could not read PDF file.')); };
          rd.readAsDataURL(file);
          return;
        }
        var reader = new FileReader();
        reader.onload = function(ev) {
          var img = new Image();
          img.onload = function() {
            var w = img.width, h = img.height;
            if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
            var c = document.createElement('canvas');
            c.width = w; c.height = h;
            var ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(c.toDataURL('image/jpeg', quality || 0.65));
          };
          img.onerror = function() { reject(new Error('Invalid image file.')); };
          img.src = ev.target.result;
        };
        reader.onerror = function() { reject(new Error('Could not read file.')); };
        reader.readAsDataURL(file);
      });
    }

    function openCeoWhatsApp() {
      window.open('https://api.whatsapp.com/send?phone=923453326318', '_blank', 'noopener,noreferrer');
    }

    function showRegister() {
      document.getElementById('loginBox').classList.add('hidden');
      document.getElementById('totpBox').classList.add('hidden');
      document.getElementById('registerBox').classList.remove('hidden');
    }

    function backToLogin() {
      document.getElementById('registerBox').classList.add('hidden');
      document.getElementById('totpBox').classList.add('hidden');
      document.getElementById('loginBox').classList.remove('hidden');
    }

    function logout() {
      if (expiryInterval) clearInterval(expiryInterval);
      if (modalTimerInterval) clearInterval(modalTimerInterval);
      localStorage.removeItem('golan_email');
      localStorage.removeItem('golan_token');
      localStorage.removeItem('golan_expiry');
      location.reload();
    }

    function handleRegister(e) {
      e.preventDefault();
      var btn = document.getElementById('regBtn'), box = document.getElementById('regAlert');
      box.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = 'Submitting...';
      callBackend({
        action: 'register',
        agencyName: document.getElementById('regAgency').value.trim(),
        city: document.getElementById('regCity').value.trim(),
        mobile: document.getElementById('regMobile').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPass').value
      }).then(function(res) {
        box.className = 'alert ' + (res.ok ? 'alert-success' : 'alert-error');
        box.textContent = res.message || 'Done.';
        box.classList.remove('hidden');
        if (res.ok) e.target.reset();
      }).catch(function(err) {
        box.className = 'alert alert-error';
        box.textContent = 'Error: ' + err.message;
        box.classList.remove('hidden');
      }).finally(function() {
        btn.disabled = false;
        btn.textContent = 'Submit Registration for Approval';
      });
    }

    function handleLoginStep1(e) {
      e.preventDefault();
      var btn = document.getElementById('loginBtn'), alertBox = document.getElementById('loginAlert');
      alertBox.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = 'Checking Security...';
      var email = document.getElementById('loginEmail').value.trim(), password = document.getElementById('loginPassword').value;
      callBackend({ action:'loginStep1', email:email, password:password }).then(function(res) {
        if (!res || !res.ok) {
          alertBox.textContent = (res && res.message) || 'Invalid credentials.';
          alertBox.classList.remove('hidden');
          return;
        }
        currentEmail = email.toLowerCase();
        var savedE = (localStorage.getItem('golan_email') || '').toLowerCase();
        var savedT = localStorage.getItem('golan_token') || '';
        var savedEx = Number(localStorage.getItem('golan_expiry') || 0);
        if (savedE === currentEmail && savedT && Date.now() < savedEx) {
          return callBackend({ action:'checkSession', email:savedE, token:savedT }).then(function(sRes) {
            if (sRes && sRes.ok) { currentToken = savedT; enterDashboard(sRes.agencyName, sRes.isAdmin, sRes.expiry); }
            else showTotpPrompt(res, email);
          }).catch(function() {
            showTotpPrompt(res, email);
          });
        }
        showTotpPrompt(res, email);
      }).catch(function(err) {
        alertBox.textContent = 'Connection error: ' + err.message;
        alertBox.classList.remove('hidden');
      }).finally(function() {
        btn.disabled = false;
        btn.textContent = 'Verify Credentials →';
      });
    }

    function showTotpPrompt(res, email) {
      document.getElementById('loginBox').classList.add('hidden');
      document.getElementById('totpBox').classList.remove('hidden');
      document.getElementById('totpCode').value = '';
      var totpAlert = document.getElementById('totpAlert');
      totpAlert.className = 'alert alert-info';
      totpAlert.textContent = 'Enter the 6-digit code from your Google Authenticator app.';
      if (res.needQrSetup && res.secret) {
        document.getElementById('qrSetupArea').classList.remove('hidden');
        document.getElementById('manualSecret').textContent = res.secret;
        var otpUri = 'otpauth://totp/Golan%20International:' + encodeURIComponent(email) + '?secret=' + encodeURIComponent(res.secret) + '&issuer=Golan%20International';
        var renderQr = function() {
          var qr = new QRious({ value: otpUri, size: 170 });
          document.getElementById('qrImage').src = qr.toDataURL();
        };
        if (window.QRious) {
          renderQr();
        } else {
          var s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
          s.onload = renderQr;
          document.body.appendChild(s);
        }
      } else {
        document.getElementById('qrSetupArea').classList.add('hidden');
      }
    }

    function handleVerifyTotp(e) {
      e.preventDefault();
      var btn = document.getElementById('totpBtn'), alertBox = document.getElementById('totpAlert');
      btn.disabled = true;
      btn.textContent = 'Verifying 2FA...';
      callBackend({ action:'verifyTotp', email:currentEmail, code:document.getElementById('totpCode').value.trim() }).then(function(res) {
        if (!res || !res.ok) {
          alertBox.className = 'alert alert-error';
          alertBox.textContent = (res && res.message) || 'Invalid 2FA code.';
          return;
        }
        currentToken = res.token;
        localStorage.setItem('golan_email', currentEmail);
        localStorage.setItem('golan_token', res.token);
        localStorage.setItem('golan_expiry', res.expiry);
        enterDashboard(res.agencyName, res.isAdmin, res.expiry);
      }).catch(function(err) {
        alertBox.className = 'alert alert-error';
        alertBox.textContent = 'Verification error: ' + err.message;
      }).finally(function() {
        btn.disabled = false;
        btn.textContent = 'Unlock Portal Until 12:00 AM →';
      });
    }

    function enterDashboard(agencyName, isAdmin, expiry) {
      currentIsAdmin = !!isAdmin;
      document.getElementById('authSection').classList.add('hidden');
      document.getElementById('dashboardSection').classList.remove('hidden');
      document.getElementById('dashAgencyName').textContent = agencyName || 'Partner';
      document.getElementById('sideSubAgentName').textContent = agencyName || 'SUB-AGENT PORTAL';
      document.getElementById('sideAdminBtn').classList.toggle('hidden', !isAdmin);
      if (expiryInterval) clearInterval(expiryInterval);
      expiryInterval = setInterval(function() {
        if (Date.now() >= Number(expiry)) {
          alert('12:00 AM Midnight Lock: Please verify 2FA again.');
          logout();
        }
      }, 15000);
      switchTab('liveair');
      loadDashboardData();
    }

    function handleFareBookClick(btn) {
      openBookingModal(
        btn.getAttribute('data-cat') || 'Group Flight',
        btn.getAttribute('data-title') || '',
        Number(btn.getAttribute('data-fare') || 0),
        btn.getAttribute('data-fareid') || '',
        Number(btn.getAttribute('data-holdmins') || 0)
      );
    }

    function loadDashboardData() {
      if (!currentEmail || !currentToken) return;
      callBackend({ action:'getDashboardData', email:currentEmail, token:currentToken }).then(function(res) {
        if (!res || !res.ok) {
          if (res && res.message && /session|expired|unauthorized/i.test(res.message)) {
            alert(res.message);
            logout();
          }
          return;
        }
        window.__LAST_DASH_RES__ = res;
        window.__ALL_BOOKINGS__ = res.bookings || [];
        window.__ALL_DEPOSITS__ = res.deposits || [];
        currentIsAdmin = !!res.isAdmin;
        var bal = Number(res.balancePKR || 0);
        document.getElementById('walletBadge').textContent = '💰 Wallet: PKR ' + bal.toLocaleString();

        var fares = res.fares || [];
        document.getElementById('statAvailGroups').textContent = fares.length;
        document.getElementById('faresTableBody').innerHTML = fares.length ? fares.map(function(f) {
          var isVisa = f.Category === 'Visit Visa', isUmrah = f.Category === 'Umrah Package';
          var mainName = f.Route || f.Title || f.PackageName || f.Category;
          var l1 = isVisa ? 'Processing:' : (isUmrah ? 'Route:' : 'Timing:');
          var l2 = isVisa ? 'Validity:' : 'Baggage:';
          var l3 = isVisa ? 'Entry:' : (isUmrah ? 'Meals:' : 'Meal:');
          var l4 = isVisa ? 'Documents:' : (isUmrah ? 'Hotels:' : 'Flight Type:');
          var meta = '<div style="margin-top:4px;font-size:11px;line-height:1.5;color:#475569;">'
            + (f.Timing ? '<div><b>'+l1+'</b> '+esc(f.Timing)+'</div>' : '')
            + (f.Luggage ? '<div><b>'+l2+'</b> '+esc(f.Luggage)+'</div>' : '')
            + (f.Meal ? '<div><b>'+l3+'</b> '+esc(f.Meal)+'</div>' : '')
            + (f.Stay ? '<div><b>'+l4+'</b> '+esc(f.Stay)+'</div>' : '')
            + (f.Details ? '<div style="color:#0f4c5c;font-weight:600;">• '+esc(f.Details)+'</div>' : '') + '</div>';
          var fullLabel = f.Category + ' - ' + mainName;
          var isSoldOut = !isVisa && (String(f.Seats) === '0' || String(f.Seats) === 'Sold Out');
          var seatBadge = isSoldOut
            ? '<span class="status-badge st-CANCELED">Sold Out</span>'
            : '<span class="status-badge st-APPROVED">'+(res.isAdmin && f.Seats ? esc(f.Seats)+' Seats' : 'Available')+'</span>';
          var delBtn = res.isAdmin ? ' <button type="button" class="btn btn-sm btn-red" data-fareid="'+esc(f.ID)+'" onclick="adminDeleteFareReq(this.getAttribute(\'data-fareid\'))">🗑️</button>' : '';
          return '<tr><td><span class="status-badge st-APPROVED">'+esc(f.Category)+'</span><div style="font-size:11px;color:#64748b;margin-top:4px;">'+esc(f.TravelDate||f.Date||'Open Validity')+'</div></td>'
            + '<td><strong style="font-size:13.5px;color:#0b1f44;">'+esc(mainName)+'</strong>'+meta+'</td>'
            + '<td>'+seatBadge+'</td>'
            + '<td><strong style="font-size:13.5px;color:#0b1f44;">PKR '+Number(f.FarePKR||0).toLocaleString()+'</strong></td>'
            + '<td style="white-space:nowrap;"><button type="button" class="btn btn-sm btn-primary" '+(isSoldOut?'disabled':'')+' data-cat="'+esc(f.Category)+'" data-title="'+esc(fullLabel)+'" data-fare="'+Number(f.FarePKR||0)+'" data-fareid="'+esc(f.ID||'')+'" data-holdmins="'+Number(f.HoldMins||30)+'" onclick="handleFareBookClick(this)">Book / Hold</button>'+delBtn+'</td></tr>';
        }).join('') : '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:20px;">No active records posted yet.</td></tr>';

        var banks = (res.banks && res.banks.length) ? res.banks : DEFAULT_BANKS;
        document.getElementById('banksGrid').innerHTML = banks.map(function(bk, idx) {
          var removeBtn = (res.isAdmin && res.banks && res.banks.length)
            ? '<button type="button" class="btn btn-sm btn-red" style="margin-top:10px;" data-bid="'+esc(bk.BankID||'')+'" data-acc="'+esc(bk.AccountNumber||'')+'" data-idx="'+idx+'" onclick="adminDeleteBankReq(this)">🗑️ Remove Account</button>'
            : '';
          return '<div class="bank-card"><h4>🏦 '+esc(bk.BankName)+'</h4><p>Title: <strong>'+esc(bk.AccountTitle)+'</strong></p><p>Account #: <span class="mono">'+esc(bk.AccountNumber)+'</span></p>'+(bk.IBAN?'<p>IBAN: <span class="mono">'+esc(bk.IBAN)+'</span></p>':'')+removeBtn+'</div>';
        }).join('');
        var bankSel = document.getElementById('depBank');
        if (bankSel) {
          var prevBank = bankSel.value;
          bankSel.innerHTML = banks.map(function(bk) {
            var acc = bk.AccountNumber ? ' (' + bk.AccountNumber + ')' : '';
            var val = (bk.BankName || 'Bank') + acc;
            return '<option value="'+esc(val)+'">'+esc(bk.BankName || 'Bank')+(bk.AccountNumber ? ' — '+esc(bk.AccountNumber) : '')+'</option>';
          }).join('');
          var hasPrev = Array.prototype.some.call(bankSel.options, function(opt) { return opt.value === prevBank; });
          if (hasPrev) bankSel.value = prevBank;
          else if (bankSel.options.length) bankSel.selectedIndex = 0;
        }

        var adminBanksEl = document.getElementById('adminBanksList');
        if (adminBanksEl && res.isAdmin) {
          adminBanksEl.innerHTML = (res.banks && res.banks.length) ? res.banks.map(function(bk, idx) {
            return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;padding:8px 10px;border-radius:8px;font-size:12px;">'
              + '<div><b>'+esc(bk.BankName)+'</b> — <span style="font-family:monospace;">'+esc(bk.AccountNumber)+'</span></div>'
              + '<button type="button" class="btn btn-sm btn-red" data-bid="'+esc(bk.BankID||'')+'" data-acc="'+esc(bk.AccountNumber||'')+'" data-idx="'+idx+'" onclick="adminDeleteBankReq(this)">🗑️ Remove</button></div>';
          }).join('') : '<div style="font-size:12px;color:#64748b;">No custom accounts added yet (showing default UBL).</div>';
        }

        renderBookingsTable(res.isAdmin);
        refreshLedgerAuto(bal);

        if (res.isAdmin) {
          var deps = res.deposits || [];
          document.getElementById('adminDepositsBody').innerHTML = deps.length ? deps.map(function(d) {
            var st = String(d.Status || 'PENDING').toUpperCase();
            var did = esc(d.DepositID);
            var viewBtn = d.HasSlip ? '<button type="button" class="btn btn-sm btn-primary" style="margin-right:4px;" data-did="'+did+'" onclick="viewAttachment(\'deposit\',this.getAttribute(\'data-did\'))">👁️ Slip</button>' : '';
            var act = st === 'PENDING' ? '<button type="button" class="btn btn-sm btn-green" data-depid="'+did+'" onclick="adminApproveDepositReq(this.getAttribute(\'data-depid\'))">✓ Approve</button>' : '<span style="color:#64748b;font-size:11px;">Credited</span>';
            return '<tr><td><b>'+did+'</b></td><td>'+esc(d.CreatedAt)+'</td><td><b>'+esc(d.AgencyName||d.AgentEmail)+'</b></td><td>'+esc(d.BankName)+'</td><td style="font-weight:900;color:#15803d;">PKR '+Number(d.AmountPKR||0).toLocaleString()+'</td><td>'+viewBtn+esc(d.TxRef)+'</td><td><span class="status-badge st-'+esc(st)+'">'+esc(st)+'</span></td><td>'+act+'</td></tr>';
          }).join('') : '<tr><td colspan="8" style="text-align:center;color:#64748b;padding:16px;">No deposit requests yet.</td></tr>';

          var ags = res.agents || [];
          document.getElementById('adminAgentsBody').innerHTML = ags.length ? ags.map(function(ag) {
            var st = String(ag.Status || 'PENDING').toUpperCase();
            var em = esc(ag.Email);
            return '<tr><td><b>'+esc(ag.AgencyName)+'</b></td><td>'+em+'</td><td>'+esc(ag.City)+' • '+esc(ag.Mobile)+'</td><td style="font-weight:900;color:#0b1f44;">PKR '+Number(ag.BalancePKR||0).toLocaleString()+'</td><td><span class="status-badge st-'+esc(st)+'">'+esc(st)+'</span></td><td style="white-space:nowrap;display:flex;gap:4px;flex-wrap:wrap;">'
              + '<button type="button" class="btn btn-sm btn-green" data-email="'+em+'" onclick="adminAgentCtrl(this.getAttribute(\'data-email\'),\'APPROVE\')">Approve</button>'
              + '<button type="button" class="btn btn-sm btn-primary" data-email="'+em+'" onclick="adminAgentCtrl(this.getAttribute(\'data-email\'),\'ADD_LIMIT\')">+ Limit</button>'
              + '<button type="button" class="btn btn-sm btn-red" data-email="'+em+'" onclick="adminAgentCtrl(this.getAttribute(\'data-email\'),\'BLOCK\')">Block</button>'
              + '<button type="button" class="btn btn-sm btn-gold" data-email="'+em+'" onclick="resetAgentPass(this.getAttribute(\'data-email\'))">Reset Pass</button>'
              + '</td></tr>';
          }).join('') : '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px;">No sub-agents found.</td></tr>';
        }
      }).catch(function(err) {
        console.error('Dashboard load error:', err);
      });
    }
    var loadDashboard = loadDashboardData;

    function switchTab(tabName, btnEl) {
      var isDash = (tabName === 'liveair');
      document.getElementById('dashHeroBanner').style.display = isDash ? 'flex' : 'none';
      document.getElementById('dashHomeBlocks').style.display = isDash ? 'block' : 'none';
      ['liveair','fares','bookings','banks','ledger','admin'].forEach(function(id) {
        var el = document.getElementById('tab-' + id);
        if (el) el.classList.toggle('hidden', id !== tabName);
      });
      var targetBtn = (btnEl && btnEl.classList && btnEl.classList.contains('side-btn'))
        ? btnEl
        : document.querySelector('.side-btn[data-tab="' + tabName + '"]');
      document.querySelectorAll('.side-btn').forEach(function(b) { b.classList.remove('active'); });
      if (targetBtn) targetBtn.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openFareCategoryTab(catName, btnEl) {
      switchTab('fares', btnEl);
      var mapKeys = {
        DXB:['DXB','SHJ','AUH','UAE','DUBAI'],
        JED:['JED','RUH','DMM','MED','KSA','SAUDI','JEDDAH','RIYADH'],
        MCT:['MCT','SLL','MUSCAT','OMAN'],
        BAH:['BAH','BAHRAIN'],
        LHR:['LHR','MAN','BHX','UK','LONDON','MANCHESTER']
      };
      var titles = {
        ALL:'🌐 All Group Fares, Packages & Visas',
        'Umrah Package':'🕋 Live Umrah Packages',
        'Visit Visa':'🛂 Live Visit Visas',
        DXB:'🇦🇪 UAE & Dubai Group Fares',
        JED:'🇸🇦 KSA Group Fares',
        MCT:'🇴🇲 Muscat Group Fares',
        BAH:'🇧🇭 Bahrain Group Fares',
        LHR:'🇬🇧 UK & London Fares'
      };
      document.getElementById('faresTabHeading').textContent = titles[catName] || ('🛫 ' + catName);
      var oldEmpty = document.getElementById('quickJourneyEmptyRow');
      if (oldEmpty) oldEmpty.remove();
      var rows = document.querySelectorAll('#faresTableBody tr'), shown = 0;
      rows.forEach(function(tr) {
        var txt = (tr.textContent || '').toUpperCase();
        var match = (!catName || catName === 'ALL') ? true : (mapKeys[catName] ? mapKeys[catName].some(function(k) { return txt.indexOf(k) !== -1; }) : txt.indexOf(catName.toUpperCase()) !== -1);
        tr.style.display = match ? '' : 'none';
        if (match) shown++;
      });
      if (shown === 0) {
        document.getElementById('faresTableBody').insertAdjacentHTML('beforeend', '<tr id="quickJourneyEmptyRow"><td colspan="5" style="text-align:center;color:#64748b;padding:24px;">No seats posted for this filter yet. <button type="button" class="btn btn-sm btn-primary" style="margin-left:8px;" onclick="openFareCategoryTab(\'ALL\')">Show All</button></td></tr>');
      }
    }

    function renderBookingsTable(isAdmin) {
      var list = window.__ALL_BOOKINGS__ || [], now = Date.now(), todayStr = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' });
      var todayCnt = 0, soldCnt = 0, holdCnt = 0, cancCnt = 0;
      list.forEach(function(b) {
        if (String(b.CreatedAt || '').indexOf(todayStr) !== -1) todayCnt++;
        var st = String(b.Status || 'PENDING').toUpperCase(), isExp = (st === 'PENDING' && b.HoldUntil && now > Number(b.HoldUntil));
        if (st === 'CONFIRMED' || st === 'ISSUED') soldCnt++;
        else if (st === 'CANCELED' || st === 'EXPIRED' || isExp) cancCnt++;
        else holdCnt++;
      });
      document.getElementById('statTodayBookings').textContent = todayCnt;
      document.getElementById('statTotalBookings').textContent = list.length;
      document.getElementById('statSoldTickets').textContent = soldCnt;
      document.getElementById('statHoldTickets').textContent = holdCnt;
      document.getElementById('statCanceledTickets').textContent = cancCnt;

      document.getElementById('bookingsTableBody').innerHTML = list.length ? list.map(function(b) {
        var cleanTitle = String(b.ItemTitle || '').replace(/\s*\{DATE:.*?\}/g, '');
        var dtParts = String(b.CreatedAt || '').split(',');
        var dateHtml = dtParts.length > 1 ? ('<div>'+esc(dtParts[0])+'</div><small style="color:#64748b;">'+esc(dtParts.slice(1).join(',').trim())+'</small>') : esc(b.CreatedAt);
        var st = String(b.Status || 'PENDING').toUpperCase(), isExp = (st === 'PENDING' && b.HoldUntil && now > Number(b.HoldUntil)), badgeSt = isExp ? 'EXPIRED' : st;
        var timerHtml = (st === 'PENDING' && b.HoldUntil && !isExp) ? '<br><span class="live-timer" data-until="'+esc(b.HoldUntil)+'" style="color:#dc2626;font-weight:800;font-size:10.5px;font-family:monospace;">⏳ ...</span>' : '';
        var pnrHtml = '<span style="background:#0b1f44;color:#fbbf24;padding:3px 7px;border-radius:6px;font-family:monospace;font-weight:800;">'+esc(b.PNR||'PENDING')+'</span>' + (b.TicketNo ? '<div style="font-size:10px;color:#15803d;font-weight:700;margin-top:3px;">TKT: '+esc(b.TicketNo)+'</div>' : '');
        var bid = esc(b.BookingID), btns = '';
        if (isAdmin && st === 'PENDING') btns += '<button type="button" class="btn btn-sm btn-green" data-bid="'+bid+'" onclick="adminIssueGolanTicket(this.getAttribute(\'data-bid\'))">✓ Issue</button>';
        if (isAdmin && st !== 'CANCELED') btns += '<button type="button" class="btn btn-sm btn-red" data-bid="'+bid+'" onclick="adminCancelGolanTicket(this.getAttribute(\'data-bid\'))">✕ Cancel</button>';
        btns += '<button type="button" class="btn btn-sm btn-primary" data-bid="'+bid+'" onclick="printSingleGolanTicket(this.getAttribute(\'data-bid\'))">🖨 PDF</button>';
        if (isAdmin && b.HasDocs) btns += '<button type="button" class="btn btn-sm btn-gold" data-bid="'+bid+'" onclick="viewAttachment(\'booking\',this.getAttribute(\'data-bid\'))">📎 Docs</button>';
        if (isAdmin) btns += '<button type="button" class="btn btn-sm" style="background:#e2e8f0;color:#991b1b;" data-bid="'+bid+'" onclick="deleteBookingAdmin(this.getAttribute(\'data-bid\'))">🗑️</button>';
        return '<tr><td><b>'+bid+'</b><br><small style="color:#64748b;">'+esc(b.AgencyName)+'</small></td><td>'+dateHtml+'</td><td><b>'+esc(b.PassengerName)+'</b><br><small>PP: '+esc(b.PassportNo)+'<br>'+esc(b.PaxMobile||'-')+'</small></td><td>'+esc(cleanTitle)+'</td><td>'+pnrHtml+'</td><td style="font-weight:800;color:#15803d;">PKR '+Number(b.FarePKR||0).toLocaleString()+'</td><td><span class="status-badge st-'+esc(badgeSt)+'">'+esc(badgeSt)+'</span>'+timerHtml+'</td><td><div class="act-wrap">'+btns+'</div></td></tr>';
      }).join('') : '<tr><td colspan="8" style="text-align:center;color:#64748b;padding:20px;">No bookings yet.</td></tr>';
    }

    function filterBookingsTable() {
      var q = (document.getElementById('adminBookingSearchInput').value || '').trim().toUpperCase();
      document.querySelectorAll('#bookingsTableBody tr').forEach(function(tr) {
        tr.style.display = (!q || tr.textContent.toUpperCase().indexOf(q) !== -1) ? '' : 'none';
      });
    }

    function refreshLedgerAuto(walletBal) {
      var bookings = window.__ALL_BOOKINGS__ || [], deposits = window.__ALL_DEPOSITS__ || [];
      if (currentIsAdmin) {
        bookings = bookings.filter(function(b) { return !b.AgentEmail || String(b.AgentEmail).toLowerCase() === currentEmail; });
        deposits = deposits.filter(function(d) { return !d.AgentEmail || String(d.AgentEmail).toLowerCase() === currentEmail; });
      }
      var debit = 0, refund = 0, credit = 0, rows = [];
      deposits.forEach(function(d) {
        var amt = Number(d.AmountPKR || 0), st = String(d.Status || 'PENDING').toUpperCase();
        if (st === 'APPROVED') credit += amt;
        rows.push('<tr><td>'+esc(d.CreatedAt)+'</td><td><b>'+esc(d.DepositID)+'</b></td><td>Deposit ('+esc(d.BankName)+')</td><td><span class="status-badge st-APPROVED">DEPOSIT</span></td><td>—</td><td style="color:#15803d;font-weight:800;">+ PKR '+amt.toLocaleString()+'</td><td><span class="status-badge st-'+esc(st)+'">'+esc(st)+'</span></td></tr>');
      });
      bookings.forEach(function(b) {
        var amt = Number(b.FarePKR || 0), st = String(b.Status || 'PENDING').toUpperCase(), title = String(b.ItemTitle || '').replace(/\s*\{DATE:.*?\}/g, '');
        if (st === 'CANCELED') {
          var wasPaid = !!(b.Refunded || b.WasPaid || b.TicketNo);
          if (wasPaid) refund += amt;
          rows.push('<tr><td>'+esc(b.CreatedAt)+'</td><td><b>'+esc(b.BookingID)+'</b></td><td>'+(wasPaid?'Refund: ':'Hold Released: ')+esc(title)+' ('+esc(b.PassengerName)+')</td><td><span class="status-badge st-CANCELED">'+(wasPaid?'REFUND':'RELEASED')+'</span></td><td>—</td><td style="color:#1d4ed8;font-weight:800;">'+(wasPaid?'+ PKR '+amt.toLocaleString():'PKR 0')+'</td><td><span class="status-badge st-CANCELED">CANCELED</span></td></tr>');
        } else {
          if (st === 'CONFIRMED' || st === 'ISSUED') debit += amt;
          rows.push('<tr><td>'+esc(b.CreatedAt)+'</td><td><b>'+esc(b.BookingID)+'</b></td><td>'+esc(title)+' ('+esc(b.PassengerName)+')</td><td><span class="status-badge st-PENDING">BOOKING</span></td><td style="color:#b91c1c;font-weight:800;">'+(st==='PENDING'?'Hold: ':'- ')+'PKR '+amt.toLocaleString()+'</td><td>—</td><td><span class="status-badge st-'+esc(st)+'">'+esc(st)+'</span></td></tr>');
        }
      });
      document.getElementById('ldgTotalCredit').textContent = 'PKR ' + credit.toLocaleString();
      document.getElementById('ldgTotalDebit').textContent = 'PKR ' + debit.toLocaleString();
      document.getElementById('ldgTotalRefund').textContent = 'PKR ' + refund.toLocaleString();
      document.getElementById('ldgNetBalance').textContent = 'PKR ' + Number(walletBal || 0).toLocaleString();
      document.getElementById('ledgerTableBody').innerHTML = rows.length ? rows.join('') : '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:18px;">No ledger entries yet.</td></tr>';
    }

    function openBookingModal(cat, title, fare, fareId, holdMins) {
      selectedItem = { Category: cat, Title: title, FarePKR: fare, FareID: fareId || '', HoldMins: holdMins || 0 };
      var form = document.getElementById('bookingForm');
      if (form) form.reset();
      document.getElementById('paxNat').value = 'Pakistani';
      var isVisa = (cat === 'Visit Visa');
      document.getElementById('flightFieldsWrap').classList.toggle('hidden', isVisa);
      document.getElementById('visaFieldsWrap').classList.toggle('hidden', !isVisa);
      document.getElementById('modalHeaderTitle').textContent = isVisa ? '🛂 Apply Visit Visa (Documents)' : '✈️ Confirm B2B Booking (Passport Details)';
      document.getElementById('modalItemTitle').textContent = title + ' — PKR ' + Number(fare).toLocaleString();
      var subBtn = document.getElementById('modalSubmitBtn');
      subBtn.disabled = false;
      subBtn.textContent = 'Hold Booking (PENDING)';
      document.getElementById('bookingModal').classList.remove('hidden');
      if (modalTimerInterval) clearInterval(modalTimerInterval);
      var sec = 900, clk = document.getElementById('modalSessionClock');
      if (clk) clk.textContent = '15:00';
      modalTimerInterval = setInterval(function() {
        sec--;
        if (sec <= 0) {
          clearInterval(modalTimerInterval);
          closeBookingModal();
          alert('⌛ Booking Session Expired! Please try again.');
        } else if (clk) {
          clk.textContent = String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0');
        }
      }, 1000);
    }

    function closeBookingModal() {
      if (modalTimerInterval) clearInterval(modalTimerInterval);
      document.getElementById('bookingModal').classList.add('hidden');
    }

    async function submitBooking(e) {
      e.preventDefault();
      if (!selectedItem || isBookingSubmitting) return;
      var passportDoc = '', photoDoc = '';
      var isVisa = (selectedItem.Category === 'Visit Visa' && !document.getElementById('visaFieldsWrap').classList.contains('hidden'));
      if (isVisa) {
        var vName = document.getElementById('visaFullName').value.trim();
        var vPass = document.getElementById('visaPassport').value.trim().toUpperCase();
        var vMob = document.getElementById('visaMobile').value.trim();
        var f1 = document.getElementById('visaDocPassport'), f2 = document.getElementById('visaDocPhoto');
        if (!vName || !vPass || !vMob || !f1.files.length || !f2.files.length) {
          alert('Please enter Name, Passport, Mobile and attach Passport Scan + White BG Photo.');
          return;
        }
        var pts = vName.split(/\s+/);
        document.getElementById('paxFirstName').value = pts[0] || vName;
        document.getElementById('paxLastName').value = pts.slice(1).join(' ') || 'Applicant';
        document.getElementById('paxPassport').value = vPass;
        document.getElementById('paxDob').value = '1995-01-01';
        document.getElementById('paxExp').value = '2030-01-01';
        document.getElementById('paxNat').value = 'Pakistani';
        document.getElementById('paxMobile').value = vMob;
      }

      var fn = document.getElementById('paxFirstName').value.trim();
      var ln = document.getElementById('paxLastName').value.trim();
      var pp = document.getElementById('paxPassport').value.trim().toUpperCase();
      var mob = document.getElementById('paxMobile').value.trim();
      if (!fn || !ln) { alert('Please enter First Name and Last Name.'); return; }
      if (!/^[A-Z0-9]{6,12}$/.test(pp)) { alert('❌ Invalid Passport Number! Enter 6-12 letters/digits without spaces.'); return; }
      if (!mob || mob.length < 7) { alert('❌ Please enter valid Passenger Mobile / WhatsApp number.'); return; }

      var subBtn = document.getElementById('modalSubmitBtn');
      isBookingSubmitting = true;
      subBtn.disabled = true;
      subBtn.textContent = '⏳ Confirming Hold...';

      try {
        if (isVisa) {
          passportDoc = await compressFileToDataUrl(document.getElementById('visaDocPassport').files[0], 900, 0.65);
          photoDoc = await compressFileToDataUrl(document.getElementById('visaDocPhoto').files[0], 700, 0.65);
        }
        var fullName = fn + ' ' + ln;
        var paxEm = ((document.getElementById('paxEmail') && document.getElementById('paxEmail').value) || currentEmail).trim();
        var fullTitle = String(selectedItem.Title || '');
        if (selectedItem.Category === 'Live Airline') {
          var o = (window.__GDS_OFFERS__ || [])[ACTIVE_GDS_IDX] || {};
          if (fullTitle.indexOf('{DATE:') === -1 && o.DepTime) {
            var tDate = String(o.DepTime).split(' ')[0] || '';
            fullTitle += ' {DATE:' + tDate + '|DEP:' + (o.DepTime||'') + '|ARR:' + (o.ArrTime||'') + '|DTERM:1|ATERM:1}';
          }
        }
        var res = await callBackend({
          action:'addBooking', email:currentEmail, token:currentToken, passengerName:fullName, passengerEmail:paxEm,
          passportNo:pp, dob:document.getElementById('paxDob').value, passportExpiry:document.getElementById('paxExp').value,
          nationality:document.getElementById('paxNat').value, paxMobile:mob,
          category:selectedItem.Category, itemTitle:fullTitle, farePKR:selectedItem.FarePKR,
          fareId:selectedItem.FareID || '', holdMins:selectedItem.HoldMins || 0,
          passportDoc:passportDoc, photoDoc:photoDoc
        });
        if (!res || !res.ok) { alert((res && res.message) || 'Booking failed.'); return; }
        closeBookingModal();
        document.getElementById('gdsDetailsModal').classList.add('hidden');
        showProBookingCard(res.bookingId, res.pnr, fullName, pp, selectedItem.Title, selectedItem.FarePKR);
        loadDashboardData();
        switchTab('bookings');
      } catch (err) {
        alert('Booking error: ' + err.message);
      } finally {
        isBookingSubmitting = false;
        subBtn.disabled = false;
        subBtn.textContent = 'Hold Booking (PENDING)';
      }
    }

    function showProBookingCard(id, pnr, pax, pp, itin, fare) {
      var old = document.getElementById('golanProBookingCard'); if (old) old.remove();
      var pop = document.createElement('div'); pop.id = 'golanProBookingCard';
      pop.style.cssText = 'position:fixed;inset:0;background:rgba(11,31,68,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
      pop.innerHTML = '<div style="background:#fff;max-width:450px;width:100%;border-radius:16px;overflow:hidden;border:2px solid #0b1f44;box-shadow:0 20px 50px rgba(0,0,0,0.35);">'
        + '<div style="background:linear-gradient(135deg,#0b1f44,#163570);color:#fff;padding:18px;text-align:center;border-bottom:4px solid #d97706;"><div style="font-size:28px;">✅</div><div style="font-size:17px;font-weight:800;">BOOKING RESERVED (HOLD)</div></div>'
        + '<div style="padding:18px;font-size:13px;"><div style="display:flex;gap:10px;margin-bottom:12px;"><div style="flex:1;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:10px;text-align:center;"><small style="color:#64748b;font-weight:700;">PNR</small><div style="font-size:19px;font-weight:900;color:#0b1f44;font-family:monospace;">'+esc(pnr)+'</div></div><div style="flex:1;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:10px;text-align:center;"><small style="color:#64748b;font-weight:700;">REF ID</small><div style="font-size:16px;font-weight:800;color:#b45309;font-family:monospace;">'+esc(id)+'</div></div></div>'
        + '<p><b>Passenger:</b> '+esc(pax)+' (PP: '+esc(pp)+')</p><p style="margin:6px 0;"><b>Item:</b> '+esc(itin)+'</p><p><b>Net Fare:</b> <b style="color:#15803d;">PKR '+Number(fare||0).toLocaleString()+'</b></p>'
        + '<div style="display:flex;gap:8px;margin-top:14px;"><button type="button" class="btn btn-primary" data-bid="'+esc(id)+'" onclick="document.getElementById(\'golanProBookingCard\').remove();printSingleGolanTicket(this.getAttribute(\'data-bid\'))">🖨 Print Voucher</button><button type="button" class="btn btn-gold" onclick="document.getElementById(\'golanProBookingCard\').remove()">Done</button></div></div></div>';
      document.body.appendChild(pop);
    }

    function setTripType(t) {
      CURRENT_TRIP_TYPE = t;
      ['oneway','roundtrip','multicity'].forEach(function(id) { document.getElementById('pill-'+id).className = (id === t) ? 'tab-btn active' : 'tab-btn'; });
      document.getElementById('boxReturnDate').style.display = (t === 'roundtrip') ? 'block' : 'none';
      document.getElementById('srchReturnDate').required = (t === 'roundtrip');
      document.getElementById('boxMultiCity').style.display = (t === 'multicity') ? 'grid' : 'none';
      document.getElementById('srchOrigin2Text').required = (t === 'multicity');
      document.getElementById('srchDest2Text').required = (t === 'multicity');
      document.getElementById('srchDate2').required = (t === 'multicity');
    }

    function filterAirports(which) {
      var cap = which.charAt(0).toUpperCase() + which.slice(1);
      var q = (document.getElementById('srch'+cap+'Text').value || '').toLowerCase();
      var matches = AIRPORTS_LIST.filter(function(a) { return a.label.toLowerCase().indexOf(q) !== -1 || a.code.toLowerCase().indexOf(q) !== -1; });
      if (!matches.length) matches = AIRPORTS_LIST;
      var dropEl = document.getElementById('drop-'+which);
      dropEl.innerHTML = matches.map(function(a) {
        return '<div data-which="'+esc(which)+'" data-code="'+esc(a.code)+'" data-label="'+esc(a.label)+'" onmousedown="selectAirport(this.getAttribute(\'data-which\'),this.getAttribute(\'data-code\'),this.getAttribute(\'data-label\'))" style="padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:12.5px;">'+esc(a.label)+'</div>';
      }).join('');
      dropEl.style.display = 'block';
    }

    function selectAirport(which, code, label) {
      var cap = which.charAt(0).toUpperCase() + which.slice(1);
      document.getElementById('srch'+cap).value = code;
      document.getElementById('srch'+cap+'Text').value = label;
      document.getElementById('drop-'+which).style.display = 'none';
    }

    function resolveAirportCode(hiddenId, textId) {
      var code = (document.getElementById(hiddenId).value || '').trim().toUpperCase();
      if (code && code.length === 3) return code;
      var txt = (document.getElementById(textId).value || '').trim();
      if (!txt) return '';
      var upper = txt.toUpperCase();
      var parenMatch = upper.match(/\(([A-Z]{3})\)/);
      if (parenMatch) return parenMatch[1];
      var found = AIRPORTS_LIST.find(function(a) {
        return a.code === upper || a.label.toUpperCase().indexOf(upper) !== -1;
      });
      return found ? found.code : upper.slice(0, 3);
    }

    document.addEventListener('click', function(e) {
      ['origin','dest','origin2','dest2'].forEach(function(w) {
        var d = document.getElementById('drop-'+w);
        if (d && !e.target.closest('#drop-'+w) && e.target.id !== 'srch'+w.charAt(0).toUpperCase()+w.slice(1)+'Text') d.style.display = 'none';
      });
    });

    function swapAirports() {
      var c1 = document.getElementById('srchOrigin').value, t1 = document.getElementById('srchOriginText').value;
      document.getElementById('srchOrigin').value = document.getElementById('srchDest').value;
      document.getElementById('srchOriginText').value = document.getElementById('srchDestText').value;
      document.getElementById('srchDest').value = c1; document.getElementById('srchDestText').value = t1;
    }

    function handleLiveFlightSearch(e) {
      e.preventDefault();
      var o1 = resolveAirportCode('srchOrigin', 'srchOriginText');
      var d1 = resolveAirportCode('srchDest', 'srchDestText');
      if (!o1 || !d1) { alert('Please select valid From and To airports.'); return; }
      if (o1 === d1) { alert('Origin and Destination airports cannot be the same.'); return; }
      var o2 = CURRENT_TRIP_TYPE === 'multicity' ? resolveAirportCode('srchOrigin2', 'srchOrigin2Text') : '';
      var d2 = CURRENT_TRIP_TYPE === 'multicity' ? resolveAirportCode('srchDest2', 'srchDest2Text') : '';

      var btn = document.getElementById('srchBtn');
      btn.disabled = true; btn.textContent = '✈️ Searching...';
      document.getElementById('liveFlightsBody').innerHTML = '<div class="alert alert-info" style="text-align:center;">✈️ Searching live GDS &amp; airline fares... Please wait...</div>';
      callBackend({
        action:'searchLiveFlights', email:currentEmail, token:currentToken, tripType:CURRENT_TRIP_TYPE, origin:o1, dest:d1,
        date:document.getElementById('srchDate').value, returnDate:document.getElementById('srchReturnDate').value,
        origin2:o2, dest2:d2, date2:document.getElementById('srchDate2').value, cabin:document.getElementById('srchCabin').value
      }).then(function(res) {
        if (!res || !res.ok) {
          document.getElementById('liveFlightsBody').innerHTML = '<div class="alert alert-error">❌ '+esc((res && res.message) || 'No flights found.')+'</div>';
          return;
        }
        window.__GDS_OFFERS__ = res.offers || [];
        if (!window.__GDS_OFFERS__.length) {
          document.getElementById('liveFlightsBody').innerHTML = '<div class="alert alert-info">No live flights available for this route/date.</div>';
          return;
        }
        document.getElementById('liveFlightsBody').innerHTML = window.__GDS_OFFERS__.map(function(o, idx) {
          var dp = (o.DepTime || '').split(' '), ap = (o.ArrTime || '').split(' ');
          return '<div style="background:#fff;border:1px solid #cbd5e1;border-radius:12px;margin-bottom:12px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,0.05);">'
            + '<div style="background:#f1f5f9;padding:7px 14px;display:flex;justify-content:space-between;font-size:12px;"><span>✈️ <b>'+esc(dp[0]||'-')+'</b></span><span>'+esc(o.Route)+'</span></div>'
            + '<div style="padding:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
            + '<div><div style="font-size:15px;font-weight:800;color:#0b1f44;">'+esc(o.Airline)+'</div><div style="font-size:12px;color:#0284c7;font-weight:700;">'+esc(o.FlightNo)+' • '+esc(o.Stops)+'</div></div>'
            + '<div style="text-align:center;"><b style="font-size:17px;">'+esc(dp[1]||'--:--')+'</b> ('+esc(o.Origin)+') ──✈️── <b style="font-size:17px;">'+esc(ap[1]||'--:--')+'</b> ('+esc(o.Dest)+')<div style="font-size:11px;color:#15803d;font-weight:700;margin-top:3px;">🧳 '+esc(o.Baggage||o.Luggage)+'</div></div>'
            + '<div style="text-align:right;"><div style="font-size:18px;font-weight:900;color:#15803d;">PKR '+Number(o.FarePKR).toLocaleString()+'</div><div style="display:flex;gap:6px;margin-top:6px;"><button type="button" class="btn btn-sm" style="background:#0b1f44;color:#fff;" onclick="openGdsModal('+idx+',\'itin\')">Details</button><button type="button" class="btn btn-sm" style="background:#0284c7;color:#fff;" onclick="openGdsModal('+idx+',\'fares\')">More Fares</button><button type="button" class="btn btn-sm btn-primary" onclick="bookGdsOffer('+idx+',\'Standard 30 KG + 7 KG\','+Number(o.FarePKR||0)+')">Book / Hold</button></div></div>'
            + '</div></div>';
        }).join('');
      }).catch(function(err) {
        document.getElementById('liveFlightsBody').innerHTML = '<div class="alert alert-error">❌ Flight search error: '+esc(err.message)+'</div>';
      }).finally(function() {
        btn.disabled = false; btn.textContent = '🔍 Search Flights';
      });
    }

    function openGdsModal(idx, tab) {
      ACTIVE_GDS_IDX = idx;
      document.getElementById('gdsDetailsModal').classList.remove('hidden');
      switchGdsModalTab(tab || 'fares');
    }

    function switchGdsModalTab(tab) {
      var o = (window.__GDS_OFFERS__ || [])[ACTIVE_GDS_IDX]; if (!o) return;
      var base = Number(o.FarePKR || 0), val = base + 4500, flex = base + 11500, box = document.getElementById('gdsModalContent');
      if (tab === 'fares') {
        box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;">'
          + '<div style="border:1px solid #cbd5e1;border-radius:12px;padding:14px;"><h4>Economy Light</h4><p style="font-size:12px;margin:8px 0;">✓ 7 KG Hand Carry<br>✕ Non-Refundable</p><b style="font-size:17px;">PKR '+base.toLocaleString()+'</b><button type="button" class="btn btn-primary" style="margin-top:10px;" onclick="bookGdsOffer('+ACTIVE_GDS_IDX+',\'Economy Light (7 KG)\','+base+')">Select Light</button></div>'
          + '<div style="border:2px solid #0284c7;border-radius:12px;padding:14px;background:#f0f9ff;"><h4>Economy Value</h4><p style="font-size:12px;margin:8px 0;">✓ 30 KG + 7 KG<br>✓ Date Change (Fee)</p><b style="font-size:17px;color:#0284c7;">PKR '+val.toLocaleString()+'</b><button type="button" class="btn btn-primary" style="margin-top:10px;" onclick="bookGdsOffer('+ACTIVE_GDS_IDX+',\'Economy Value (30 KG + 7 KG)\','+val+')">Select Value</button></div>'
          + '<div style="border:1px solid #f59e0b;border-radius:12px;padding:14px;background:#fffbeb;"><h4>Economy Flex</h4><p style="font-size:12px;margin:8px 0;">✓ 40 KG + 7 KG<br>✓ Free Change &amp; Meal</p><b style="font-size:17px;color:#b45309;">PKR '+flex.toLocaleString()+'</b><button type="button" class="btn btn-gold" style="margin-top:10px;" onclick="bookGdsOffer('+ACTIVE_GDS_IDX+',\'Economy Flex (40 KG + 7 KG)\','+flex+')">Select Flex</button></div></div>';
      } else {
        box.innerHTML = '<div style="font-size:13.5px;line-height:1.8;"><b>Airline:</b> '+esc(o.Airline)+' ('+esc(o.FlightNo)+')<br><b>Route:</b> '+esc(o.Route)+'<br><b>Departure:</b> '+esc(o.DepTime)+'<br><b>Arrival:</b> '+esc(o.ArrTime)+'<br><b>Baggage:</b> '+esc(o.Baggage||o.Luggage)+'</div>';
      }
    }

    function bookGdsOffer(idx, bagLabel, finalFare) {
      var o = (window.__GDS_OFFERS__ || [])[idx]; if (!o) return;
      ACTIVE_GDS_IDX = idx;
      document.getElementById('gdsDetailsModal').classList.add('hidden');
      openBookingModal('Live Airline', o.Airline + ' ' + o.FlightNo + ' (' + o.Origin + ' - ' + o.Dest + ') [' + bagLabel + ']', Number(finalFare || o.FarePKR || 0));
    }

    function toggleVisaFields() {
      var cat = document.getElementById('admCat').value;
      var isVisa = (cat === 'Visit Visa'), isUmrah = (cat === 'Umrah Package');
      document.getElementById('grpSeats').style.display = isVisa ? 'none' : 'block';
      document.getElementById('grpDate').style.display = isVisa ? 'none' : 'block';
      document.getElementById('admSeats').required = !isVisa;
      document.getElementById('admDate').required = !isVisa;
      if (isVisa) {
        document.getElementById('admSeats').value = '999';
        document.getElementById('admDate').value = 'Open Validity';
        document.getElementById('lblTitle').textContent = 'Visa Country & Duration';
        document.getElementById('admTitle').placeholder = 'e.g. UAE 30 Days Visit Visa';
        document.getElementById('lblTiming').textContent = '⏱️ Processing Time';
        document.getElementById('admTiming').placeholder = '24 - 48 Hours';
        document.getElementById('lblLuggage').textContent = '📅 Visa Validity';
        document.getElementById('admLuggage').placeholder = '60 Days Validity';
        document.getElementById('lblMeal').textContent = '🛂 Entry Type';
        document.getElementById('admMeal').placeholder = 'Single / Multiple Entry';
        document.getElementById('lblStay').textContent = '📄 Required Documents';
        document.getElementById('admStay').placeholder = 'Passport Scan + White BG Photo';
      } else if (isUmrah) {
        document.getElementById('lblTitle').textContent = 'Umrah Package Title';
        document.getElementById('admTitle').placeholder = 'e.g. 15 Days Economy Umrah Package';
        document.getElementById('lblTiming').textContent = '🛫 Sector / Route';
        document.getElementById('admTiming').placeholder = 'LHE - JED - LHE (SV Direct)';
        document.getElementById('lblLuggage').textContent = '🧳 Baggage';
        document.getElementById('admLuggage').placeholder = '30 KG + 7 KG';
        document.getElementById('lblMeal').textContent = '🍽️ Meals / Ziyarat';
        document.getElementById('admMeal').placeholder = 'Breakfast + Ziyarat Included';
        document.getElementById('lblStay').textContent = '🏨 Makkah & Madinah Hotels';
        document.getElementById('admStay').placeholder = '7 Nights Makkah + 7 Nights Madinah';
      } else {
        document.getElementById('lblTitle').textContent = 'Route & Airline / Package Title';
        document.getElementById('admTitle').placeholder = 'e.g. LHE - JED (SV-737)';
        document.getElementById('lblTiming').textContent = '✈️ Flight Timing';
        document.getElementById('admTiming').placeholder = 'Dep 04:15 AM - Arr 07:45 AM';
        document.getElementById('lblLuggage').textContent = '🧳 Luggage';
        document.getElementById('admLuggage').placeholder = '30 KG + 7 KG';
        document.getElementById('lblMeal').textContent = '🍽️ Meal';
        document.getElementById('admMeal').placeholder = 'Hot Meal Included';
        document.getElementById('lblStay').textContent = '🏨 Stay / Transit';
        document.getElementById('admStay').placeholder = 'Direct / Hotels';
      }
    }

    function handleAdminAddFare(e) {
      e.preventDefault();
      var btn = document.getElementById('addFareBtn');
      btn.disabled = true; btn.textContent = 'Publishing...';
      callBackend({
        action:'adminAddFare', email:currentEmail, token:currentToken, category:document.getElementById('admCat').value,
        title:document.getElementById('admTitle').value.trim(), timing:document.getElementById('admTiming').value.trim(),
        luggage:document.getElementById('admLuggage').value.trim(), meal:document.getElementById('admMeal').value.trim(),
        stay:document.getElementById('admStay').value.trim(), details:document.getElementById('admDetails').value.trim(),
        travelDate:document.getElementById('admDate').value.trim(), seats:document.getElementById('admSeats').value,
        holdMins:document.getElementById('admHoldMins').value, farePKR:document.getElementById('admFare').value
      }).then(function(res) {
        alert((res && res.message) || 'Published.');
        if (res && res.ok) { e.target.reset(); toggleVisaFields(); loadDashboardData(); }
      }).catch(function(err) {
        alert('Error: ' + err.message);
      }).finally(function() {
        btn.disabled = false; btn.textContent = 'Publish to All Agents';
      });
    }

    function adminDeleteFareReq(fareId) {
      if (!confirm('Remove this Fare / Package from portal?')) return;
      callBackend({ action:'adminDeleteFare', email:currentEmail, token:currentToken, fareId:fareId })
        .then(function(r) { alert((r&&r.message)||'Removed'); loadDashboardData(); })
        .catch(function(err) { alert('Error: ' + err.message); });
    }

    function handleAdminAddBank(e) {
      e.preventDefault();
      var btn = document.getElementById('addBankBtn');
      btn.disabled = true; btn.textContent = 'Saving...';
      callBackend({
        action:'adminAddBank', email:currentEmail, token:currentToken, bankName:document.getElementById('bankName').value.trim(),
        accountTitle:document.getElementById('bankTitle').value.trim(), accountNumber:document.getElementById('bankAcc').value.trim(),
        iban:document.getElementById('bankIban').value.trim()
      }).then(function(res) {
        alert((res && res.message) || 'Saved.');
        if (res && res.ok) { e.target.reset(); loadDashboardData(); }
      }).catch(function(err) {
        alert('Error: ' + err.message);
      }).finally(function() {
        btn.disabled = false; btn.textContent = 'Add Payment Account';
      });
    }

    function adminDeleteBankReq(btn) {
      var bankId = btn.getAttribute('data-bid') || '';
      var acc = btn.getAttribute('data-acc') || '';
      var idx = btn.getAttribute('data-idx') || '';
      if (!confirm('Remove bank account ' + acc + '?')) return;
      callBackend({ action:'adminDeleteBank', email:currentEmail, token:currentToken, bankId:bankId, accountNumber:acc, index:idx })
        .then(function(r) { alert((r&&r.message)||'Removed'); loadDashboardData(); })
        .catch(function(err) { alert('Error: ' + err.message); });
    }

    function viewAttachment(kind, id) {
      var modal = document.getElementById('attachmentModal');
      var body = document.getElementById('attachmentModalBody');
      var title = document.getElementById('attachmentModalTitle');
      title.textContent = kind === 'deposit' ? ('🧾 Deposit Slip — ' + id) : ('📎 Visa Documents — ' + id);
      body.innerHTML = '<div class="alert alert-info">Loading attachment...</div>';
      modal.classList.remove('hidden');
      callBackend({ action:'adminGetAttachment', email:currentEmail, token:currentToken, kind:kind, id:id }).then(function(res) {
        if (!res || !res.ok) {
          body.innerHTML = '<div class="alert alert-error">' + esc((res && res.message) || 'Not available.') + '</div>';
          return;
        }
        if (kind === 'deposit') {
          body.innerHTML = '<img src="' + esc(res.slipImage) + '" alt="Deposit Slip" style="max-width:100%;border-radius:10px;border:1px solid #cbd5e1;" />';
        } else {
          var html = '';
          if (res.passportDoc) {
            html += '<h4 style="margin-bottom:8px;color:#0b1f44;">Passport Scan</h4>';
            if (res.passportDoc.indexOf('data:application/pdf') === 0) {
              html += '<iframe src="' + esc(res.passportDoc) + '" style="width:100%;height:360px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:14px;"></iframe>';
            } else {
              html += '<img src="' + esc(res.passportDoc) + '" style="max-width:100%;border-radius:8px;border:1px solid #cbd5e1;margin-bottom:14px;" />';
            }
          }
          if (res.photoDoc) {
            html += '<h4 style="margin-bottom:8px;color:#0b1f44;">Applicant Photo</h4><img src="' + esc(res.photoDoc) + '" style="max-width:260px;border-radius:8px;border:1px solid #cbd5e1;" />';
          }
          body.innerHTML = html || '<div class="alert alert-info">No files attached.</div>';
        }
      }).catch(function(err) {
        body.innerHTML = '<div class="alert alert-error">Error: ' + esc(err.message) + '</div>';
      });
    }

    function adminIssueGolanTicket(id) {
      var pnr = prompt('Enter Airline / GDS PNR:', '');
      if (pnr === null) return;
      var tkt = prompt('Enter 13-Digit Ticket Number (Optional):', '') || '';
      callBackend({ action:'adminIssueBooking', email:currentEmail, token:currentToken, bookingId:id, pnr:pnr.trim(), ticketNo:tkt.trim() })
        .then(function(r) { alert((r&&r.message)||'Updated'); loadDashboardData(); })
        .catch(function(err) { alert('Error: ' + err.message); });
    }

    function adminCancelGolanTicket(id) {
      if (!confirm('Cancel booking ' + id + '?')) return;
      callBackend({ action:'adminCancelBooking', email:currentEmail, token:currentToken, bookingId:id })
        .then(function(r) { alert((r&&r.message)||'Canceled'); loadDashboardData(); })
        .catch(function(err) { alert('Error: ' + err.message); });
    }

    function deleteBookingAdmin(id) {
      if (!confirm('Permanently delete booking ' + id + '?')) return;
      callBackend({ action:'adminDeleteBooking', email:currentEmail, token:currentToken, bookingId:id })
        .then(function(r) { alert((r&&r.message)||'Deleted'); loadDashboardData(); })
        .catch(function(err) { alert('Error: ' + err.message); });
    }

    function adminApproveDepositReq(depId) {
      if (!confirm('Approve deposit ' + depId + ' and credit wallet?')) return;
      callBackend({ action:'adminApproveDeposit', email:currentEmail, token:currentToken, depositId:depId })
        .then(function(r) { alert((r&&r.message)||'Approved'); loadDashboardData(); })
        .catch(function(err) { alert('Error: ' + err.message); });
    }

    function adminAgentCtrl(targetEmail, subAction) {
      var amt = 0;
      if (subAction === 'ADD_LIMIT') {
        var v = prompt('Enter PKR Amount to Add:', '50000'); if (v === null) return;
        amt = Number(v || 0); if (amt <= 0) { alert('Enter valid amount.'); return; }
      } else if (!confirm('Confirm ' + subAction + ' for ' + targetEmail + '?')) return;
      callBackend({ action:'adminManageAgent', email:currentEmail, token:currentToken, targetEmail:targetEmail, subAction:subAction, amountPKR:amt })
        .then(function(r) { alert((r&&r.message)||'Updated'); loadDashboardData(); })
        .catch(function(err) { alert('Error: ' + err.message); });
    }

    function resetAgentPass(targetEmail) {
      var np = prompt('Enter NEW temporary password for ' + targetEmail + ':');
      if (!np || np.length < 6) { if (np !== null) alert('Password must be at least 6 characters.'); return; }
      callBackend({ action:'adminManageAgent', email:currentEmail, token:currentToken, targetEmail:targetEmail, subAction:'RESET_PASSWORD', newPassword:np })
        .then(function(r) { alert((r&&r.message)||'Reset done'); loadDashboardData(); })
        .catch(function(err) { alert('Error: ' + err.message); });
    }

    function autoScanBankSlip(inp) {
      var file = inp && inp.files && inp.files[0], st = document.getElementById('slipScanStatus'), amtInp = document.getElementById('depAmount'), refInp = document.getElementById('depRef');
      if (!file) return;
      st.style.color = '#1d4ed8'; st.textContent = '⏳ Scanning deposit slip...';
      var runOcr = function() {
        window.Tesseract.recognize(file, 'eng').then(function(res) {
          var txt = (res && res.data && res.data.text) || '', amt = 0;
          var m1 = txt.match(/(?:PKR|Rs\.?|Amount|Total)\s*[:\-]?\s*([1-9]\d{0,2}(?:,\d{3})*(?:\.\d{1,2})?|[1-9]\d{2,7}(?:\.\d{1,2})?)/i);
          if (m1 && m1[1]) amt = Math.round(parseFloat(m1[1].replace(/,/g, '')));
          else {
            (txt.match(/\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b/g) || []).forEach(function(n) {
              var v = Math.round(parseFloat(n.replace(/,/g, '')));
              if (v >= 100 && v <= 50000000 && v > amt) amt = v;
            });
          }
          var mTid = txt.match(/(?:TID|Ref(?:erence)?|Trans(?:action)?\s*(?:ID|No)|Auth\s*Code)\s*[:#\-]?\s*([A-Z0-9\-]{6,22})/i);
          if (refInp) refInp.value = (mTid && mTid[1]) ? mTid[1].trim() : ('SLIP-' + Date.now().toString().slice(-6));
          if (amt >= 100 && amtInp) {
            amtInp.value = amt;
            st.style.color = '#15803d';
            st.textContent = '✅ Auto-Detected: PKR ' + amt.toLocaleString();
          } else {
            st.style.color = '#b45309';
            st.textContent = '⚠️ Slip unclear — please enter amount manually.';
          }
        }).catch(function() { st.style.color = '#b45309'; st.textContent = '⚠️ Enter amount manually.'; });
      };
      if (window.Tesseract) runOcr();
      else {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        s.onload = runOcr;
        document.head.appendChild(s);
      }
    }

    async function handleInstantSlipUpload(e) {
      e.preventDefault();
      var amt = Number(document.getElementById('depAmount').value || 0);
      var ref = (document.getElementById('depRef').value || ('SLIP-' + Date.now().toString().slice(-6))).trim();
      var bankSel = document.getElementById('depBank');
      var bank = (bankSel && bankSel.value) ? bankSel.value.trim() : 'UBL (384263615)';
      var fileInp = document.getElementById('depSlipFile');
      if (amt < 100) { alert('Minimum deposit PKR 100.'); return; }
      if (!fileInp || !fileInp.files || !fileInp.files.length) { alert('Please attach deposit slip image.'); return; }

      var btn = document.getElementById('slipUploadBtn');
      btn.disabled = true; btn.textContent = '⏳ Uploading Slip...';
      try {
        var slipImage = await compressFileToDataUrl(fileInp.files[0], 900, 0.65);
        var r = await callBackend({ action:'requestDeposit', email:currentEmail, token:currentToken, amountPKR:amt, bankName:bank, txRef:ref, slipImage:slipImage });
        if (r && r.ok) {
          document.getElementById('headOfficeContactBanner').classList.remove('hidden');
          alert('📞 Deposit slip uploaded! Please contact Head Office for approval.');
          e.target.reset();
          document.getElementById('depRef').value = 'SLIP-AUTO';
          if (bankSel && bankSel.options.length) bankSel.selectedIndex = 0;
          document.getElementById('slipScanStatus').textContent = '';
          loadDashboardData();
        } else {
          alert('❌ ' + ((r && r.message) || 'Submission failed.'));
        }
      } catch (err) {
        alert('❌ Error: ' + err.message);
      } finally {
        btn.disabled = false; btn.textContent = '✅ Submit Deposit Slip';
      }
    }

    function printSingleGolanTicket(bookingId) {
      var b = (window.__ALL_BOOKINGS__ || []).find(function(x) { return String(x.BookingID) === String(bookingId); });
      if (!b) return;
      var logoEl = document.getElementById('mainHeaderLogo');
      var logoSrc = (logoEl && logoEl.src) ? logoEl.src : '';
      var cleanTitle = String(b.ItemTitle || '').replace(/\s*\{DATE:.*?\}/g, '');
      var w = window.open('', '_blank', 'width=900,height=900');
      if (!w) { alert('Please allow pop-ups to print E-Ticket.'); return; }
      w.document.write(
        '<!DOCTYPE html><html><head><title>Voucher - '+esc(b.BookingID)+'</title>'
        + '<style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#0f172a;} .box{max-width:780px;margin:auto;border:2px solid #0b1f44;border-radius:12px;overflow:hidden;} .hdr{background:#0b1f44;color:#fff;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #d97706;} table{width:100%;border-collapse:collapse;margin-top:14px;} th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:13px;} th{background:#f1f5f9;color:#0b1f44;}</style></head>'
        + '<body><div class="box"><div class="hdr"><div style="display:flex;align-items:center;gap:12px;">'+(logoSrc?'<img src="'+esc(logoSrc)+'" onerror="this.style.display=\'none\'" style="height:42px;border-radius:6px;background:#fff;padding:2px;"/>':'')+'<div><h2 style="margin:0;font-size:17px;">GOLAN INTERNATIONAL TRAVEL &amp; TOURS</h2><small style="color:#fbbf24;">Toba Tek Singh • +92 345 3326318</small></div></div><div style="text-align:right;"><div>Ref: <b>'+esc(b.BookingID)+'</b></div><div>PNR: <b style="color:#fbbf24;font-size:16px;">'+esc(b.PNR||'PENDING')+'</b></div></div></div>'
        + '<div style="padding:20px;"><table><tr><th>Agency Name</th><td>'+esc(b.AgencyName)+'</td><th>Booking Date</th><td>'+esc(b.CreatedAt)+'</td></tr><tr><th>Passenger Name</th><td><b>'+esc(b.PassengerName)+'</b></td><th>Passport No</th><td><b>'+esc(b.PassportNo)+'</b></td></tr><tr><th>Flight / Package</th><td colspan="3"><b>'+esc(cleanTitle)+'</b> ('+esc(b.Category)+')</td></tr><tr><th>Ticket Number</th><td>'+esc(b.TicketNo||'To be issued')+'</td><th>Status</th><td><b>'+esc(b.Status)+'</b></td></tr><tr><th>Total B2B Fare</th><td colspan="3"><b style="color:#15803d;font-size:15px;">PKR '+Number(b.FarePKR||0).toLocaleString()+'</b></td></tr></table>'
        + '<p style="margin-top:18px;font-size:11px;color:#64748b;text-align:center;">System Generated B2B Voucher — Golan International Travel &amp; Tours</p></div></div>'
        + '<script>window.onload=function(){window.print();};<\/script></body></html>'
      );
      w.document.close();
    }

    setInterval(function() {
      var now = Date.now();
      document.querySelectorAll('.live-timer').forEach(function(el) {
        var until = Number(el.getAttribute('data-until') || 0);
        var diff = until - now;
        if (diff <= 0) {
          el.textContent = '⌛ EXPIRED';
          var cell = el.parentElement;
          var badge = cell ? cell.querySelector('.status-badge') : null;
          if (badge && badge.textContent === 'PENDING') {
            badge.textContent = 'EXPIRED';
            badge.className = 'status-badge st-EXPIRED';
          }
        } else {
          var h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
          el.textContent = '⏳ ' + (h>0 ? String(h).padStart(2,'0')+':' : '') + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        }
      });
    }, 1000);

    (function initPortalWidgets() {
      var pktToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
      ['srchDate', 'srchReturnDate', 'srchDate2'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.min = pktToday;
      });
      var d1 = document.getElementById('srchDate');
      if (d1 && !d1.value) d1.value = pktToday;

      function tickClock() {
        var pkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
        var hr = pkt.getHours();
        var g = hr < 12 ? 'Good morning' : (hr < 17 ? 'Good afternoon' : 'Good evening');
        var gEl = document.getElementById('liveGreetingText'); if (gEl) gEl.textContent = g;
        var days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
        var mos = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
        var dEl = document.getElementById('liveDateClock');
        if (dEl) dEl.textContent = '📅 ' + days[pkt.getDay()] + ', ' + pkt.getDate() + ' ' + mos[pkt.getMonth()] + ' ' + pkt.getFullYear() + ' • ' + (hr%12||12) + ':' + String(pkt.getMinutes()).padStart(2,'0') + ':' + String(pkt.getSeconds()).padStart(2,'0') + (hr>=12?' PM':' AM') + ' PKT • GOLAN B2B PORTAL';
      }
      tickClock(); setInterval(tickClock, 1000);

      fetch('https://open.er-api.com/v6/latest/PKR').then(function(r) { return r.json(); }).then(function(d) {
        if (!d || !d.rates) return;
        var r = d.rates, f = function(c) { return r[c] ? (1/r[c]).toFixed(2) : '-'; };
        var el = document.getElementById('liveB2bRatesText');
        if (el && r.USD) el.innerHTML = '1 USD = <strong>PKR '+f('USD')+'</strong> &nbsp;•&nbsp; 1 SAR = <strong>PKR '+f('SAR')+'</strong> &nbsp;•&nbsp; 1 AED = <strong>PKR '+f('AED')+'</strong> &nbsp;•&nbsp; 1 GBP = <strong>PKR '+f('GBP')+'</strong> &nbsp;•&nbsp; 1 EUR = <strong>PKR '+f('EUR')+'</strong> &nbsp;•&nbsp; 1 OMR = <strong>PKR '+f('OMR')+'</strong>';
      }).catch(function() {});

      var savedE = (localStorage.getItem('golan_email') || '').toLowerCase();
      var savedT = localStorage.getItem('golan_token') || '';
      var savedEx = Number(localStorage.getItem('golan_expiry') || 0);
      if (savedE && savedT && Date.now() < savedEx) {
        callBackend({ action:'checkSession', email:savedE, token:savedT }).then(function(sRes) {
          if (sRes && sRes.ok) { currentEmail = savedE; currentToken = savedT; enterDashboard(sRes.agencyName, sRes.isAdmin, sRes.expiry); }
        }).catch(function() {});
      }
    })();
  </script>

  <div onclick="openCeoWhatsApp()" title="WhatsApp CEO Shan Chairman" style="position:fixed; bottom:24px; right:24px; width:58px; height:58px; background:#25D366; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,0.28); z-index:99999; cursor:pointer;">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#ffffff"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"/></svg>
  </div>
</body>
</html>
