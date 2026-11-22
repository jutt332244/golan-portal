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

module.exports = async function handler(req, res) {
  try {
    const p = Object.assign({}, req.query || {}, typeof req.body === 'object' && req.body ? req.body : {});
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
