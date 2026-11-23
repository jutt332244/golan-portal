 const crypto = require('crypto');

const SB_HOST = ['https:', '', ['yxnygfbamkvzgskgoxoy', 'supabase', 'co'].join('.')].join('/');
const SB_URL = process.env.SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || SB_HOST;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.STORAGE_SUPABASE_ANON_KEY;
const DUFFEL_KEY = process.env.DUFFEL_API_KEY || '';
const GAS_URL = process.env.GAS_VOUCHER_URL || 'https://script.google.com/macros/s/AKfycbyw4rKuL8HLL7zrBjrYIzcxJs2ZLsOY2LcoM7lWQ4LPT0lmkDL0jbAr4vQIIArxofTGjQ/exec';
const INVOICE_SIGN_SECRET = process.env.INVOICE_SIGN_SECRET || 'GOLAN_INV_HMAC_2026_SECURE';

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

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) ? String(req.headers['x-forwarded-proto']).split(',')[0].trim() : 'https';
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
        ContactPerson: 'Shan Chairman',
        Address: 'Head Office, Toba Tek Singh',
        VoucherBranding: 'golan',
        LogoDataUrl: '',
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

function buildBookingEmailHtml({ agencyName, paxName, paxType, farePKR, passportNo, invoiceUrl, isIssued, isCanceled, pnr, ticketNo, itemTitle, bId }) {
  const cleanTitle = String(itemTitle || '').replace(/\s*\{DATE:.*?\}/g, '');
  let statusLine = `Your booking with <strong>GOLAN INTERNATIONAL TRAVEL &amp; TOURS</strong> is on hold (PNR: <strong>${escHtml(pnr)}</strong>). Your PDF voucher is attached or click <strong>View Invoice / PDF</strong> below.`;
  if (isIssued) {
    statusLine = `Your booking with <strong>GOLAN INTERNATIONAL TRAVEL &amp; TOURS</strong> has been <strong style="color:#15803d;">CONFIRMED &amp; ISSUED</strong> (PNR: <strong>${escHtml(pnr)}</strong>${ticketNo ? ` | Ticket: <strong>${escHtml(ticketNo)}</strong>` : ''}). Your official PDF ticket is attached below.`;
  } else if (isCanceled) {
    statusLine = `Your booking with <strong>GOLAN INTERNATIONAL TRAVEL &amp; TOURS</strong> (Ref: <strong>${escHtml(bId)}</strong>, PNR: <strong>${escHtml(pnr)}</strong>) has been <strong style="color:#b91c1c;">CANCELED</strong>.`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${escHtml(bId)} - Golan International</title></head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f7;padding:28px 14px;">
    <tr><td align="center">
      <table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(11,31,68,0.1);">
        <tr>
          <td style="background:linear-gradient(125deg,#071530,#163b7a);padding:22px 28px;color:#ffffff;border-bottom:4px solid #d97706;">
            <div style="font-size:11px;color:#fbbf24;font-weight:bold;letter-spacing:1px;">OFFICIAL B2B PORTAL NOTIFICATION</div>
            <h2 style="margin:4px 0 0;font-size:20px;">GOLAN INTERNATIONAL TRAVEL &amp; TOURS</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <h3 style="margin:0 0 12px 0;color:#0b1f44;font-size:18px;">Assalam-o-Alaikum ${escHtml(agencyName || 'Partner')}!</h3>
            <p style="margin:0 0 16px 0;color:#475569;font-size:14px;line-height:1.6;">${statusLine}</p>
            <p style="margin:0 0 16px 0;color:#0f172a;font-size:13px;"><strong>Booking Ref:</strong> ${escHtml(bId)} &nbsp;|&nbsp; <strong>Route / Package:</strong> ${escHtml(cleanTitle)}</p>
            <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:22px;">
              <thead>
                <tr style="background-color:#f8fafc;color:#0b1f44;text-align:left;">
                  <th style="border:1px solid #cbd5e1;">Passenger</th>
                  <th style="border:1px solid #cbd5e1;">Type</th>
                  <th style="border:1px solid #cbd5e1;">B2B Fare</th>
                  <th style="border:1px solid #cbd5e1;">Passport</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border:1px solid #cbd5e1;color:#0f172a;font-weight:bold;">${escHtml(paxName)}</td>
                  <td style="border:1px solid #cbd5e1;color:#334155;">${escHtml(paxType || 'ADULT')}</td>
                  <td style="border:1px solid #cbd5e1;color:#15803d;font-weight:bold;">PKR ${Number(farePKR || 0).toLocaleString()}</td>
                  <td style="border:1px solid #cbd5e1;color:#334155;">${escHtml(passportNo)}</td>
                </tr>
              </tbody>
            </table>
            ${invoiceUrl ? `<div style="text-align:center;margin:22px 0;"><a href="${escHtml(invoiceUrl)}" target="_blank" style="background-color:#0b1f44;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:bold;display:inline-block;">🖨️ View / Download PDF Voucher</a></div>` : ''}
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Regards,<br><strong style="color:#0b1f44;">GOLAN INTERNATIONAL TRAVEL &amp; TOURS</strong><br><span style="font-size:12px;">CEO Shan Chairman: 0345-3326318 | Manager Tariq Mehmod: 0341-6929324 | PTCL: 046-2512722</span></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPrintableInvoicePage(bk, agent) {
  const cleanTitle = String(bk.ItemTitle || '').replace(/\s*\{DATE:.*?\}/g, '');
  const useCustom = agent && agent.VoucherBranding !== 'golan' && agent.LogoDataUrl;
  const brandTitle = (useCustom && agent.AgencyName) ? agent.AgencyName.toUpperCase() : 'GOLAN INTERNATIONAL TRAVEL &amp; TOURS';
  const brandSub = (useCustom && (agent.Address || agent.Mobile))
    ? `${escHtml(agent.Address || '')}${agent.Mobile ? ' • ' + escHtml(agent.Mobile) : ''}`
    : 'Toba Tek Singh Head Office • PTCL: 046-2512722 • +92 345 3326318';
  const st = String(bk.Status || 'PENDING').toUpperCase();
  const stBg = (st === 'CONFIRMED' || st === 'ISSUED') ? '#dcfce7' : (st === 'CANCELED' || st === 'EXPIRED' ? '#fee2e2' : '#fef3c7');
  const stCol = (st === 'CONFIRMED' || st === 'ISSUED') ? '#15803d' : (st === 'CANCELED' || st === 'EXPIRED' ? '#b91c1c' : '#b45309');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Golan Voucher - ${escHtml(bk.BookingID)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #eef2f7; padding: 24px 12px; color: #0f172a; margin: 0; }
    .sheet { max-width: 780px; margin: 0 auto; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 50px rgba(11,31,68,0.16); border: 1px solid #dbe3ee; }
    .hdr { background: linear-gradient(125deg, #071530 0%, #0b1f44 55%, #1e3a8a 100%); color: #fff; padding: 22px 26px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #d97706; }
    .perf { position: relative; height: 22px; background: #fff; display: flex; align-items: center; }
    .perf:before, .perf:after { content: ""; position: absolute; width: 24px; height: 24px; background: #eef2f7; border-radius: 50%; top: -1px; }
    .perf:before { left: -12px; } .perf:after { right: -12px; }
    .perf-line { width: 100%; border-top: 2px dashed #cbd5e1; margin: 0 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
    .lbl { font-size: 10px; font-weight: 800; color: #64748b; letter-spacing: 0.7px; text-transform: uppercase; margin-bottom: 4px; }
    .val { font-size: 14px; font-weight: 800; color: #0f172a; }
    .fare-bar { background: linear-gradient(90deg, #f0fdf4, #ecfdf5); border: 1.5px solid #86efac; border-radius: 14px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .print-bar { text-align: center; margin-bottom: 14px; }
    .print-btn { background: #0b1f44; color: #fff; border: none; padding: 10px 22px; border-radius: 9px; font-size: 13px; font-weight: 800; cursor: pointer; }
    @media print { body { background: #fff; padding: 0; } .print-bar { display: none; } .sheet { box-shadow: none; } .perf:before, .perf:after { background: #fff; border: 1px solid #cbd5e1; } }
  </style>
</head>
<body>
  <div class="print-bar"><button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button></div>
  <div class="sheet">
    <div class="hdr">
      <div style="display:flex;align-items:center;gap:14px;">
        ${useCustom ? `<img src="${escHtml(agent.LogoDataUrl)}" style="height:54px;width:54px;object-fit:contain;border-radius:12px;background:#fff;padding:4px;border:2px solid #fbbf24;" alt="Logo" />` : ''}
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;color:#fbbf24;">OFFICIAL B2B E-VOUCHER &amp; RESERVATION</div>
          <h2 style="margin:2px 0;font-size:18px;font-weight:900;">${brandTitle}</h2>
          <div style="font-size:11px;color:#cbd5e1;">${brandSub}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <span style="background:${stBg};color:${stCol};padding:4px 12px;border-radius:99px;font-size:11px;font-weight:900;">${escHtml(st)}</span>
        <div style="font-size:11px;color:#cbd5e1;margin-top:6px;">REF ID: <b style="color:#fff;">${escHtml(bk.BookingID)}</b></div>
      </div>
    </div>
    <div style="padding:20px 26px 8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;background:#0f172a;color:#fff;padding:14px 18px;border-radius:12px;margin-bottom:16px;">
        <div><div style="font-size:10px;color:#94a3b8;font-weight:800;">AIRLINE / GDS PNR</div><div style="font-size:22px;font-weight:900;letter-spacing:2px;color:#fbbf24;font-family:monospace;">${escHtml(bk.PNR || 'PENDING')}</div></div>
        <div><div style="font-size:10px;color:#94a3b8;font-weight:800;">E-TICKET / FILE NO</div><div style="font-size:15px;font-weight:800;font-family:monospace;">${escHtml(bk.TicketNo || 'To Be Issued')}</div></div>
        <div style="text-align:right;"><div style="font-size:10px;color:#94a3b8;font-weight:800;">BOOKED ON</div><div style="font-size:12.5px;font-weight:700;">${escHtml(bk.CreatedAt || '-')}</div></div>
      </div>
      <div class="grid">
        <div class="box"><div class="lbl">Passenger / Applicant Name</div><div class="val">${escHtml(bk.PassengerName)}</div></div>
        <div class="box"><div class="lbl">Passport Number</div><div class="val" style="font-family:monospace;">${escHtml(bk.PassportNo)}</div></div>
        <div class="box"><div class="lbl">Sub-Agent / Agency</div><div class="val">${escHtml(bk.AgencyName || '-')}</div></div>
        <div class="box"><div class="lbl">Passenger Contact</div><div class="val">${escHtml(bk.PaxMobile || '-')}</div></div>
      </div>
      <div class="box" style="border-left:4px solid #163b7a;"><div class="lbl">Itinerary / Package / Visa Details (${escHtml(bk.Category || 'Travel')})</div><div class="val" style="font-size:15px;color:#0b1f44;">${escHtml(cleanTitle)}</div></div>
    </div>
    <div class="perf"><div class="perf-line"></div></div>
    <div style="padding:10px 26px 22px;">
      <div class="fare-bar">
        <div><div class="lbl" style="color:#166534;">Total B2B Net Amount</div><div style="font-size:24px;font-weight:900;color:#15803d;">PKR ${Number(bk.FarePKR || 0).toLocaleString()}</div></div>
        <div style="text-align:right;font-size:11px;color:#166534;font-weight:700;">✓ Official Verified Digital Voucher<br/>Golan B2B System</div>
      </div>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b;">
        CEO Shan Chairman: 0345-3326318 | Manager Tariq Mehmod: 0341-6929324 | PTCL: 046-2512722
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildPrintableReceiptPage(d) {
  const st = String(d.Status || 'PENDING').toUpperCase();
  const stCol = st === 'APPROVED' ? '#10b981' : (st === 'CANCELED' ? '#ef4444' : '#f59e0b');
  const stLabel = st === 'APPROVED' ? 'Paid & Credited' : st;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt - ${escHtml(d.DepositID)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f3f7; color: #0f172a; margin: 0; padding: 26px 12px; }
    .rcard { max-width: 480px; margin: auto; background: #fff; border-radius: 22px; overflow: hidden; box-shadow: 0 20px 50px rgba(15,23,42,0.14); border: 1px solid #e2e8f0; }
    .rtop { background: linear-gradient(105deg, #0b1f44 0%, #4f46e5 48%, #f59e0b 100%); color: #fff; padding: 22px 24px; }
    .rrow { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 13px 0; border-bottom: 1px solid #eef2f6; font-size: 13.5px; }
    .rrow:last-child { border-bottom: none; }
    .rlbl { color: #64748b; font-weight: 600; }
    .rval { text-align: right; font-weight: 800; color: #0f172a; }
    .rsub { font-size: 11.5px; color: #64748b; font-weight: 600; margin-top: 2px; }
    .perf { position: relative; height: 22px; background: #fff; display: flex; align-items: center; }
    .perf:before, .perf:after { content: ""; position: absolute; width: 24px; height: 24px; background: #f5f3f7; border-radius: 50%; top: -1px; }
    .perf:before { left: -12px; } .perf:after { right: -12px; }
    .perf-dots { width: 100%; border-top: 3px dotted #cbd5e1; margin: 0 22px; }
    .print-bar { text-align: center; margin-bottom: 14px; }
    .print-btn { background: #0b1f44; color: #fff; border: none; padding: 10px 22px; border-radius: 9px; font-weight: 800; cursor: pointer; font-size: 13px; }
    @media print { body { background: #fff; padding: 0; } .print-bar { display: none; } .rcard { box-shadow: none; } .perf:before, .perf:after { background: #fff; border: 1px solid #cbd5e1; } }
  </style>
</head>
<body>
  <div class="print-bar"><button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF Receipt</button></div>
  <div class="rcard">
    <div class="rtop">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.8px;opacity:0.9;">GOLAN INTERNATIONAL B2B</div>
      <h2 style="margin:3px 0 0;font-size:21px;font-weight:900;">Transaction Details</h2>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:12px;opacity:0.95;font-weight:600;">
        <span>${escHtml(d.CreatedAt || '-')}</span><span>REF: ${escHtml(d.DepositID || '-')}</span>
      </div>
    </div>
    <div style="padding:10px 24px 6px;">
      <div class="rrow"><div class="rlbl">From (Sub-Agent)</div><div class="rval">${escHtml(d.AgencyName || d.AgentEmail || 'Partner Agency')}<div class="rsub">${escHtml(d.AgentEmail || '')}</div></div></div>
      <div class="rrow"><div class="rlbl">To (Corporate)</div><div class="rval">Golan International Travel &amp; Tours<div class="rsub">${escHtml(d.BankName || 'UBL 384263615')}</div></div></div>
      <div class="rrow"><div class="rlbl">Transaction / Slip Ref</div><div class="rval" style="font-family:monospace;">${escHtml(d.TxRef || 'SLIP-AUTO')}</div></div>
      <div class="rrow"><div class="rlbl">Status</div><div class="rval" style="color:${stCol};">● ${escHtml(stLabel)}</div></div>
    </div>
    <div class="perf"><div class="perf-dots"></div></div>
    <div style="padding:14px 24px 22px;">
      <div style="font-size:12px;color:#64748b;font-weight:700;">Amount Deposited</div>
      <div style="font-size:28px;font-weight:900;color:#0f172a;margin-top:2px;">PKR ${Number(d.AmountPKR || 0).toLocaleString()}</div>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #eef2f6;text-align:center;font-size:11px;color:#64748b;line-height:1.5;">
        <strong style="color:#0b1f44;">Golan International Travel &amp; Tours (Toba Tek Singh)</strong><br/>
        CEO: 0345-3326318 • Manager Tariq Mehmod: 0341-6929324 • PTCL: 046-2512722
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildDepositEmailHtml(d, receiptUrl) {
  const st = String(d.Status || 'PENDING').toUpperCase();
  const isApp = st === 'APPROVED';
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Payment Receipt - ${escHtml(d.DepositID)}</title></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:26px 14px;background:#eef2f7;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(105deg,#0b1f44,#4f46e5,#f59e0b);padding:20px 26px;color:#ffffff;">
            <div style="font-size:11px;font-weight:bold;letter-spacing:0.8px;">GOLAN INTERNATIONAL B2B</div>
            <h2 style="margin:4px 0 0;font-size:20px;">${isApp ? '✅ Deposit Approved &amp; Credited' : '📎 Deposit Slip Submitted'}</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:26px;">
            <p style="margin:0 0 14px;font-size:14px;color:#334155;">Assalam-o-Alaikum <strong>${escHtml(d.AgencyName || 'Partner')}</strong>,</p>
            <table width="100%" cellpadding="9" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:20px;">
              <tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Receipt ID</td><td style="border:1px solid #e2e8f0;">${escHtml(d.DepositID)}</td></tr>
              <tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Sub-Agent</td><td style="border:1px solid #e2e8f0;">${escHtml(d.AgencyName)} (${escHtml(d.AgentEmail)})</td></tr>
              <tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Bank Account</td><td style="border:1px solid #e2e8f0;">${escHtml(d.BankName)}</td></tr>
              <tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Slip / TID Ref</td><td style="border:1px solid #e2e8f0;">${escHtml(d.TxRef)}</td></tr>
              <tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Amount</td><td style="border:1px solid #e2e8f0;color:#15803d;font-weight:bold;font-size:16px;">PKR ${Number(d.AmountPKR || 0).toLocaleString()}</td></tr>
              <tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Status</td><td style="border:1px solid #e2e8f0;font-weight:bold;color:${isApp ? '#15803d' : '#b45309'};">${escHtml(st)}</td></tr>
            </table>
            ${receiptUrl ? `<div style="text-align:center;margin:20px 0;"><a href="${escHtml(receiptUrl)}" target="_blank" style="background:#0b1f44;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:13px;display:inline-block;">🧾 View / Print PDF Receipt</a></div>` : ''}
            <p style="margin:0;font-size:12px;color:#64748b;">CEO Shan Chairman: 0345-3326318 | Manager Tariq Mehmod: 0341-6929324 | PTCL: 046-2512722</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendGasEmail({ to, subject, htmlBody, pdfHtml, pdfName, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt, invoiceUrl }) {
  if (!to || !GAS_URL) return '';
  try {
    const postRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({
        action: 'sendVoucherHtml',
        to,
        subject: subject || 'Golan International B2B Notification',
        senderName: 'GOLAN INTERNATIONAL TRAVEL & TOURS',
        htmlBody: htmlBody || '',
        pdfHtml: pdfHtml || '',
        pdfName: pdfName || ('Document-' + (bId || Date.now()) + '.pdf'),
        invoiceUrl: invoiceUrl || '',
        bId: bId || '',
        dtStr: dtStr || getPKTimeStr(),
        agencyName: agencyName || '',
        paxName: paxName || '',
        passportNo: passportNo || '',
        category: category || '',
        itemTitle: itemTitle || '',
        farePKR: farePKR || 0,
        statusTxt: statusTxt || ''
      })
    });
    const postTxt = await postRes.text();
    if (postTxt.indexOf('true') !== -1 || postTxt.indexOf('"ok":true') !== -1) return ' | Email: SENT';
  } catch (e) {}
  return '';
}

async function sendVoucherEmail(recipients, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt, opts) {
  if (!recipients || !GAS_URL) return '';
  const options = opts || {};
  const invoiceUrl = options.invoiceUrl || '';
  const isIssued = !!options.isIssued;
  const isCanceled = !!options.isCanceled;
  const pnr = options.pnr || 'PENDING';
  const ticketNo = options.ticketNo || '';
  const subject = isIssued
    ? `Ticket Issued & Confirmed - ${bId} (PNR: ${pnr})`
    : (isCanceled ? `Booking Canceled - ${bId} (PNR: ${pnr})` : `Booking on hold - ${bId} (PNR: ${pnr})`);

  const htmlBody = buildBookingEmailHtml({
    agencyName, paxName, paxType: 'ADULT', farePKR, passportNo,
    invoiceUrl, isIssued, isCanceled, pnr, ticketNo, itemTitle, bId
  });
  const pdfHtml = options.pdfHtml || '';

  const sent = await sendGasEmail({
    to: recipients, subject, htmlBody, pdfHtml, pdfName: `Voucher-${bId}.pdf`,
    invoiceUrl, bId, dtStr, agencyName, paxName, passportNo, category, itemTitle, farePKR, statusTxt
  });
  if (sent) return sent;

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
      + '&statusTxt=' + encodeURIComponent(statusTxt)
      + '&invoiceUrl=' + encodeURIComponent(invoiceUrl);
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

    // Public Signed Invoice / Voucher PDF Viewer
    if (action === 'viewInvoice') {
      const bookingId = String(p.bookingId || '').trim();
      const sig = String(p.sig || '').trim();
      const bk = DB.bookings.find(b => b.BookingID === bookingId);
      if (!bk || sig !== signInvoice(bk.BookingID, bk.PassportNo)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(403).end('<h3 style="font-family:Arial;text-align:center;margin-top:40px;color:#b91c1c;">Invalid or Expired Invoice Link</h3>');
      }
      const agent = DB.agents[bk.AgentEmail] || null;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).end(buildPrintableInvoicePage(bk, agent));
    }

    // Public Signed Payment Receipt PDF Viewer
    if (action === 'viewReceipt') {
      const depositId = String(p.depositId || '').trim();
      const sig = String(p.sig || '').trim();
      const dep = DB.deposits.find(d => d.DepositID === depositId);
      if (!dep || sig !== signReceipt(dep.DepositID, dep.AgentEmail)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(403).end('<h3 style="font-family:Arial;text-align:center;margin-top:40px;color:#b91c1c;">Invalid or Expired Receipt Link</h3>');
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).end(buildPrintableReceiptPage(dep));
    }

    if (action === 'register') {
      const agencyName = String(p.agencyName || '').trim();
      const city = String(p.city || '').trim();
      const mobile = String(p.mobile || '').trim();
      const pwd = String(p.password || '');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json({ ok: false, message: 'Enter a valid email address.' });
      if (!agencyName || pwd.length < 6) return res.json({ ok: false, message: 'Agency name and password (min 6 chars) required.' });
      if (DB.agents[email]) return res.json({ ok: false, message: 'Email already registered.' });
      DB.agents[email] = {
        Email: email, AgencyName: agencyName, City: city, Mobile: mobile,
        ContactPerson: '', Address: '', VoucherBranding: 'custom', LogoDataUrl: '',
        PasswordHash: hashPwd(pwd), TotpSecret: generateSecret(), TotpVerified: 'NO',
        Status: 'PENDING', BalancePKR: 0, SessionToken: '', SessionExpiry: 0, FailedAttempts: 0, TotpFailedAttempts: 0
      };
      await saveDB(DB);

      const recipients = uniqueEmails([email, ...(DB.admins || [])]);
      await sendGasEmail({
        to: recipients,
        subject: `New B2B Sub-Agent Registration: ${agencyName}`,
        htmlBody: `<div style="font-family:Arial,sans-serif;padding:20px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;"><h2 style="color:#0b1f44;margin-top:0;">New Sub-Agent Registration</h2><p><b>Agency:</b> ${escHtml(agencyName)}</p><p><b>Email:</b> ${escHtml(email)}</p><p><b>City:</b> ${escHtml(city)}</p><p><b>Mobile:</b> ${escHtml(mobile)}</p><p><b>Status:</b> PENDING HEAD OFFICE APPROVAL</p><p style="font-size:12px;color:#64748b;">CEO Shan Chairman: 0345-3326318 | Manager Tariq Mehmod: 0341-6929324</p></div>`,
        bId: 'REG-' + Date.now().toString().slice(-5),
        agencyName,
        statusTxt: 'PENDING APPROVAL'
      });

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
      a.TotpVerified = 'YES'; a.TotpFailedAttempts = 0; a.SessionToken = token; a.SessionExpiry = expiry;
      await saveDB(DB);
      return res.json({ ok: true, token, expiry, agencyName: a.AgencyName, isAdmin: isSuper });
    }

    const a = DB.agents[email];
    const validSess = a && a.Status === 'APPROVED' && a.SessionToken && a.SessionToken === p.token && Date.now() < Number(a.SessionExpiry || 0);
    if (!validSess) return res.json({ ok: false, message: 'Session expired at 12:00 AM. Please verify 2FA again.' });
    const isAdmin = DB.admins.includes(email);

    if (action === 'checkSession') return res.json({ ok: true, agencyName: a.AgencyName, isAdmin, expiry: a.SessionExpiry });

    // Manual Gmail Notification Endpoint (called by index.html Gmail buttons)
    if (action === 'sendEmailNotification') {
      const subj = String(p.subject || '');
      const autoPrefixes = ['New Booking Hold [', 'Ticket Issued [', 'Booking Canceled [', 'New Deposit Slip Submitted [', 'Deposit Approved [', 'New B2B Sub-Agent Registration:'];
      if (autoPrefixes.some(pref => subj.startsWith(pref))) {
        return res.json({ ok: true, message: 'Notification already dispatched automatically.' });
      }
      const recipients = uniqueEmails([
        ...String(p.to || '').split(','),
        p.subAgentEmail,
        ...String(p.adminEmails || '').split(','),
        ...(DB.admins || [])
      ]);
      if (!recipients) return res.json({ ok: false, message: 'No valid email recipients found.' });
      const htmlBody = String(p.htmlBody || '');
      const sent = await sendGasEmail({
        to: recipients,
        subject: subj || 'Golan International B2B Notification',
        htmlBody: htmlBody || `<pre style="font-family:Arial,sans-serif;">${escHtml(p.message || '')}</pre>`,
        pdfHtml: htmlBody,
        pdfName: 'Golan-Document-' + Date.now() + '.pdf',
        agencyName: a.AgencyName
      });
      return res.json({ ok: !!sent, message: sent ? 'Gmail sent to Sub-Agent & Admins!' : 'GAS email delivery failed.' });
    }

    if (action === 'updateProfile') {
      const agencyName = String(p.agencyName || '').trim();
      if (!agencyName) return res.json({ ok: false, message: 'Travel Agency Name is required.' });
      const logoDataUrl = String(p.logoDataUrl || '');
      if (logoDataUrl.length > 350000) return res.json({ ok: false, message: 'Logo image too large. Please upload a smaller PNG/JPG.' });
      a.AgencyName = agencyName;
      a.City = String(p.city || a.City || '').trim();
      a.Mobile = String(p.mobile || a.Mobile || '').trim();
      a.ContactPerson = String(p.contactPerson || '').trim();
      a.Address = String(p.address || '').trim();
      a.VoucherBranding = p.voucherBranding === 'golan' ? 'golan' : 'custom';
      a.LogoDataUrl = logoDataUrl;
      await saveDB(DB);
      return res.json({
        ok: true,
        message: '✅ Profile & Agency Logo saved successfully!',
        profile: { agencyName: a.AgencyName, city: a.City, mobile: a.Mobile, contactPerson: a.ContactPerson, address: a.Address, voucherBranding: a.VoucherBranding, logoDataUrl: a.LogoDataUrl }
      });
    }

    if (action === 'changePassword') {
      const curPwd = String(p.currentPassword || ''), newPwd = String(p.newPassword || '');
      if (!curPwd || a.PasswordHash !== hashPwd(curPwd)) return res.json({ ok: false, message: 'Current password is incorrect.' });
      if (newPwd.length < 6) return res.json({ ok: false, message: 'New password must be at least 6 characters.' });
      if (curPwd === newPwd) return res.json({ ok: false, message: 'New password must be different from current password.' });
      a.PasswordHash = hashPwd(newPwd);
      await saveDB(DB);
      return res.json({ ok: true, message: '✅ Password updated successfully!' });
    }

    if (action === 'getDashboardData' || action === 'getDashboard') {
      const rawBookings = isAdmin ? DB.bookings : DB.bookings.filter(b => b.AgentEmail === email);
      const bookings = rawBookings.map(b => { const c = Object.assign({}, b); c.HasDocs = !!(b.PassportDoc || b.PhotoDoc); delete c.PassportDoc; delete c.PhotoDoc; return c; });
      const rawDeposits = isAdmin ? DB.deposits : DB.deposits.filter(d => d.AgentEmail === email);
      const deposits = rawDeposits.map(d => { const c = Object.assign({}, d); c.HasSlip = !!d.SlipImage; delete c.SlipImage; return c; });
      const agents = isAdmin ? Object.values(DB.agents).map(x => ({
        Email: x.Email, AgencyName: x.AgencyName, City: x.City, Mobile: x.Mobile, Status: x.Status, TotpVerified: x.TotpVerified, BalancePKR: Number(x.BalancePKR || 0)
      })) : [];
      const safeFares = isAdmin ? DB.fares : DB.fares.map(f => ({ ...f, Seats: Number(f.Seats) > 0 ? 'Available' : 'Sold Out' }));
      const profile = {
        agencyName: a.AgencyName || '', city: a.City || '', mobile: a.Mobile || '', contactPerson: a.ContactPerson || '',
        address: a.Address || '', voucherBranding: a.VoucherBranding || 'custom', logoDataUrl: a.LogoDataUrl || ''
      };
      return res.json({ ok: true, isAdmin, balancePKR: Number(a.BalancePKR || 0), profile, fares: safeFares, banks: DB.banks, bookings, deposits, agents });
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
      const date = String(p.date || '').trim(), returnDate = String(p.returnDate || '').trim();
      const tripType = String(p.tripType || 'oneway').trim();
      const origin2 = String(p.origin2 || '').trim().toUpperCase().slice(0, 3);
      const dest2 = String(p.dest2 || '').trim().toUpperCase().slice(0, 3);
      const date2 = String(p.date2 || '').trim(), cabin = String(p.cabin || 'economy').trim().toLowerCase();
      if (origin.length !== 3 || dest.length !== 3) return res.json({ ok: false, message: 'Please select valid 3-letter Origin & Destination airports.' });
      if (origin === dest) return res.json({ ok: false, message: 'Origin and Destination cannot be same.' });
      if (!date) return res.json({ ok: false, message: 'Please select departure date.' });

      const slices = [{ origin, destination: dest, departure_date: date }];
      if (tripType === 'roundtrip' && returnDate) slices.push({ origin: dest, destination: origin, departure_date: returnDate });
      else if (tripType === 'multicity' && origin2.length === 3 && dest2.length === 3 && date2) slices.push({ origin: origin2, destination: dest2, departure_date: date2 });

      const duffelUrl = ['https:', '', ['api', 'duffel', 'com'].join('.'), 'air', 'offer_requests?return_offers=true'].join('/');
      const r = await fetch(duffelUrl, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + DUFFEL_KEY, 'Duffel-Version': 'v2', 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ data: { slices, passengers: [{ type: 'adult' }], cabin_class: cabin } })
      });
      const rawTxt = await r.text();
      let json = {};
      try { json = JSON.parse(rawTxt); } catch (e) { return res.json({ ok: false, message: 'GDS Response Error (' + r.status + '): ' + rawTxt.slice(0, 100) }); }
      if (!r.ok || !json.data || !Array.isArray(json.data.offers) || json.data.offers.length === 0) {
        return res.json({ ok: false, message: (json.errors && json.errors[0] && json.errors[0].message) || 'No live flights found.' });
      }
      const RATES_PKR = { PKR: 1, USD: 280, EUR: 302, GBP: 355, SAR: 74.65, AED: 76.25 };
      const AIRLINE_POOL = [
        { name: 'Emirates', code: 'EK', num: '623' }, { name: 'flydubai', code: 'FZ', num: '392' },
        { name: 'Pakistan International Airlines (PIA)', code: 'PK', num: '221' },
        { name: 'Saudi Arabian Airlines', code: 'SV', num: '737' }, { name: 'Qatar Airways', code: 'QR', num: '629' }
      ];
      const offers = json.data.offers.slice(0, 15).map((o, idx) => {
        const slice = o.slices && o.slices[0], seg0 = slice && slice.segments && slice.segments[0], segLast = slice && slice.segments && slice.segments[slice.segments.length - 1];
        const stops = slice && slice.segments ? slice.segments.length - 1 : 0, sim = AIRLINE_POOL[idx % AIRLINE_POOL.length];
        let rawAirline = (seg0 && seg0.operating_carrier && seg0.operating_carrier.name) || (seg0 && seg0.marketing_carrier && seg0.marketing_carrier.name) || (o.owner && o.owner.name) || '';
        const isDummy = !rawAirline || rawAirline.toLowerCase().includes('duffel');
        const airline = isDummy ? sim.name : rawAirline;
        const flightNo = isDummy ? (sim.code + '-' + sim.num) : (seg0 && seg0.marketing_carrier ? (seg0.marketing_carrier.iata_code + '-' + seg0.marketing_carrier_flight_number) : sim.code + '-' + sim.num);
        const depTime = seg0 && seg0.departing_at ? seg0.departing_at.replace('T', ' ').slice(0, 16) : (date + ' 04:15');
        const arrTime = segLast && segLast.arriving_at ? segLast.arriving_at.replace('T', ' ').slice(0, 16) : (date + ' 07:45');
        const farePKR = Math.round(Number(o.total_amount || 0) * (RATES_PKR[o.total_currency] || 280));
        return {
          OfferID: o.id, Airline: airline, FlightNo: flightNo, Origin: origin, Dest: dest,
          Route: tripType === 'roundtrip' ? (origin + ' ⇄ ' + dest) : (tripType === 'multicity' ? (origin + '→' + dest + ' / ' + origin2 + '→' + dest2) : (origin + ' → ' + dest)),
          Stops: stops === 0 ? 'Non-Stop Direct' : stops + ' Stop(s)', DepTime: depTime, ArrTime: arrTime,
          Baggage: '23-30 KG Checked + 7 KG Hand Carry', Luggage: '23-30 KG Checked + 7 KG Hand Carry', FarePKR: farePKR
        };
      });
      return res.json({ ok: true, offers });
    }

    if (action === 'requestDeposit' || action === 'submitDeposit') {
      const amt = Math.round(Number(p.amountPKR || 0));
      if (!Number.isFinite(amt) || amt < 100) return res.json({ ok: false, message: 'Minimum deposit PKR 100.' });
      const slipImg = String(p.slipImage || '');
      if (slipImg.length > 450000) return res.json({ ok: false, message: 'Slip image too large. Please upload a clearer/smaller image.' });
      const depId = 'DEP-' + crypto.randomInt(10000, 99999);
      const depObj = {
        DepositID: depId,
        CreatedAt: getPKTimeStr(),
        AgentEmail: email,
        AgencyName: a.AgencyName,
        BankName: String(p.bankName || 'UBL').trim(),
        AmountPKR: amt,
        TxRef: String(p.txRef || p.refNo || ('SLIP-' + Date.now().toString().slice(-6))).trim(),
        SlipImage: slipImg,
        Status: 'PENDING'
      };
      DB.deposits.unshift(depObj);
      await saveDB(DB);

      const receiptUrl = `${getBaseUrl(req)}/api/backend?action=viewReceipt&depositId=${encodeURIComponent(depId)}&sig=${signReceipt(depId, email)}`;
      const recipients = uniqueEmails([email, ...(DB.admins || [])]);
      await sendGasEmail({
        to: recipients,
        subject: `Deposit Slip Submitted [${depId}] PKR ${amt.toLocaleString()}`,
        htmlBody: buildDepositEmailHtml(depObj, receiptUrl),
        pdfHtml: buildPrintableReceiptPage(depObj),
        pdfName: `Receipt-${depId}.pdf`,
        bId: depId,
        agencyName: a.AgencyName
      });

      return res.json({ ok: true, depositId: depId, message: 'Deposit slip submitted! Please contact Head Office.' });
    }

    if (action === 'addBooking') {
      const paxName = String(p.passengerName || '').trim();
      const ppNo = String(p.passportNo || '').trim().toUpperCase();
      if (!paxName || !/^[A-Z0-9]{6,12}$/.test(ppNo)) return res.json({ ok: false, message: 'Invalid Passenger Name or Passport Number.' });

      let fare = Number(p.farePKR || 0), holdMins = 0;
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

      const passportDoc = String(p.passportDoc || ''), photoDoc = String(p.photoDoc || '');
      if (passportDoc.length > 500000 || photoDoc.length > 500000) return res.json({ ok: false, message: 'Uploaded document file is too large.' });

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

      const bkObj = {
        BookingID: bId, FareID: fareId, CreatedAt: pkTime, HoldUntil: holdUntil,
        AgentEmail: email, AgencyName: a.AgencyName, PassengerName: paxName, PassengerEmail: paxMail,
        PassportNo: ppNo, Dob: String(p.dob || ''), PassportExpiry: String(p.passportExpiry || ''),
        Nationality: String(p.nationality || 'Pakistani'), PaxMobile: String(p.paxMobile || ''),
        Category: String(p.category || ''), ItemTitle: itStr, FarePKR: fare, PNR: autoPnr,
        TicketNo: '', PassportDoc: passportDoc, PhotoDoc: photoDoc, WasPaid: false, Refunded: false, Status: 'PENDING'
      };
      DB.bookings.unshift(bkObj);
      await saveDB(DB);

      const invoiceUrl = `${getBaseUrl(req)}/api/backend?action=viewInvoice&bookingId=${encodeURIComponent(bId)}&sig=${signInvoice(bId, ppNo)}`;
      const recipients = uniqueEmails([email, paxMail, ...(DB.admins || [])]);
      const mailNote = await sendVoucherEmail(
        recipients, bId, pkTime, a.AgencyName, paxName, ppNo, p.category, itStr, fare,
        'HOLD / PENDING (PNR: ' + autoPnr + ')',
        { invoiceUrl, isIssued: false, pnr: autoPnr, pdfHtml: buildPrintableInvoicePage(bkObj, a) }
      );
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
        if (bal < fare) return res.json({ ok: false, message: 'Cannot Issue: Agent wallet balance (PKR ' + bal.toLocaleString() + ') is less than Fare (PKR ' + fare.toLocaleString() + ').' });
        agentAcc.BalancePKR = bal - fare;
        bk.WasPaid = true;
      } else {
        bk.WasPaid = true;
      }
      if (p.pnr && String(p.pnr).trim()) bk.PNR = String(p.pnr).trim().toUpperCase();
      bk.TicketNo = String(p.ticketNo || '').trim();
      bk.Status = 'CONFIRMED';
      await saveDB(DB);

      const invoiceUrl = `${getBaseUrl(req)}/api/backend?action=viewInvoice&bookingId=${encodeURIComponent(bk.BookingID)}&sig=${signInvoice(bk.BookingID, bk.PassportNo)}`;
      const recipients = uniqueEmails([bk.AgentEmail, bk.PassengerEmail, ...(DB.admins || [])]);
      await sendVoucherEmail(
        recipients, bk.BookingID, bk.CreatedAt, bk.AgencyName, bk.PassengerName, bk.PassportNo, bk.Category, bk.ItemTitle, fare,
        'ISSUED / CONFIRMED (PNR: ' + (bk.PNR || '') + (bk.TicketNo ? ' | TKT: ' + bk.TicketNo : '') + ')',
        { invoiceUrl, isIssued: true, pnr: bk.PNR || '', ticketNo: bk.TicketNo || '', pdfHtml: buildPrintableInvoicePage(bk, agentAcc) }
      );
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

      const agentAcc = DB.agents[bk.AgentEmail];
      if (bk.WasPaid || prevSt === 'CONFIRMED' || prevSt === 'ISSUED') {
        if (agentAcc && !DB.admins.includes(bk.AgentEmail)) agentAcc.BalancePKR = Number(agentAcc.BalancePKR || 0) + Number(bk.FarePKR || 0);
        bk.Refunded = true;
      }
      if (bk.FareID && bk.Category !== 'Visit Visa') {
        const matchedFare = DB.fares.find(f => String(f.ID) === String(bk.FareID));
        if (matchedFare) matchedFare.Seats = Number(matchedFare.Seats || 0) + 1;
      }
      bk.Status = 'CANCELED';
      await saveDB(DB);

      const invoiceUrl = `${getBaseUrl(req)}/api/backend?action=viewInvoice&bookingId=${encodeURIComponent(bk.BookingID)}&sig=${signInvoice(bk.BookingID, bk.PassportNo)}`;
      const recipients = uniqueEmails([bk.AgentEmail, bk.PassengerEmail, ...(DB.admins || [])]);
      await sendVoucherEmail(
        recipients, bk.BookingID, bk.CreatedAt, bk.AgencyName, bk.PassengerName, bk.PassportNo, bk.Category, bk.ItemTitle, bk.FarePKR,
        bk.Refunded ? 'CANCELED & REFUNDED' : 'CANCELED',
        { invoiceUrl, isCanceled: true, pnr: bk.PNR || '', pdfHtml: buildPrintableInvoicePage(bk, agentAcc) }
      );

      return res.json({ ok: true, message: bk.Refunded ? 'Booking CANCELED & Fare Refunded to Wallet!' : 'Hold Booking CANCELED!' });
    }

    if (action === 'adminAddFare' && isAdmin) {
      const fareVal = Number(p.farePKR || 0);
      if (!p.title || fareVal <= 0) return res.json({ ok: false, message: 'Title and valid PKR fare required.' });
      DB.fares.unshift({
        ID: 'FARE-' + Date.now(), Category: p.category || 'Group Flight', Title: String(p.title || '').trim(),
        Timing: String(p.timing || 'As per Schedule').trim(), Luggage: String(p.luggage || '30 KG + 7 KG').trim(),
        Meal: String(p.meal || 'Included').trim(), Stay: String(p.stay || 'Direct / N/A').trim(),
        Details: String(p.details || '').trim(), TravelDate: String(p.travelDate || '').trim(),
        Seats: Number(p.seats || 15), HoldMins: Number(p.holdMins || 30), FarePKR: fareVal, Status: 'ACTIVE'
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
      DB.banks.push({ BankID: 'BNK-' + Date.now(), BankName: String(p.bankName).trim(), AccountTitle: String(p.accountTitle || '').trim(), AccountNumber: String(p.accountNumber).trim(), IBAN: String(p.iban || '').trim() });
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
      const targetEmail = String(p.targetEmail || '').trim().toLowerCase();
      const target = DB.agents[targetEmail];
      if (!target) return res.json({ ok: false, message: 'Agent not found.' });
      if (p.subAction === 'APPROVE') {
        target.Status = 'APPROVED'; target.FailedAttempts = 0; target.TotpFailedAttempts = 0;
        await saveDB(DB);
        await sendGasEmail({
          to: uniqueEmails([targetEmail, ...(DB.admins || [])]),
          subject: `Account Approved - ${target.AgencyName}`,
          htmlBody: `<div style="font-family:Arial,sans-serif;padding:20px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;"><h2 style="color:#15803d;margin-top:0;">✅ B2B Account Approved!</h2><p>Assalam-o-Alaikum <b>${escHtml(target.AgencyName)}</b>, aapka Golan International B2B account approve ho gaya hai. Ab aap portal par login karke Google Authenticator 2FA set kar sakte hain.</p></div>`,
          agencyName: target.AgencyName
        });
        return res.json({ ok: true, message: 'Agent updated: APPROVE' });
      } else if (p.subAction === 'BLOCK') {
        target.Status = 'BLOCKED'; target.SessionToken = '';
      } else if (p.subAction === 'ADD_LIMIT') {
        const amt = Number(p.amountPKR || 0);
        if (!Number.isFinite(amt) || amt <= 0) return res.json({ ok: false, message: 'Enter valid positive PKR amount.' });
        target.BalancePKR = Number(target.BalancePKR || 0) + Math.round(amt);
        await saveDB(DB);
        await sendGasEmail({
          to: uniqueEmails([targetEmail, ...(DB.admins || [])]),
          subject: `Wallet Limit Added: PKR ${Math.round(amt).toLocaleString()} - ${target.AgencyName}`,
          htmlBody: `<div style="font-family:Arial,sans-serif;padding:20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;"><h2 style="color:#0b1f44;margin-top:0;">💰 Wallet Limit Credited</h2><p><b>Agency:</b> ${escHtml(target.AgencyName)}</p><p><b>Added Amount:</b> PKR ${Math.round(amt).toLocaleString()}</p><p><b>New Balance:</b> PKR ${Number(target.BalancePKR || 0).toLocaleString()}</p></div>`,
          agencyName: target.AgencyName
        });
        return res.json({ ok: true, message: 'Agent updated: ADD_LIMIT' });
      } else if (p.subAction === 'RESET_PASSWORD') {
        const np = String(p.newPassword || '');
        if (np.length < 6) return res.json({ ok: false, message: 'New password must be at least 6 characters.' });
        target.PasswordHash = hashPwd(np); target.TotpSecret = generateSecret(); target.TotpVerified = 'NO';
        target.Status = 'APPROVED'; target.FailedAttempts = 0; target.TotpFailedAttempts = 0; target.SessionToken = '';
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

      const receiptUrl = `${getBaseUrl(req)}/api/backend?action=viewReceipt&depositId=${encodeURIComponent(dep.DepositID)}&sig=${signReceipt(dep.DepositID, dep.AgentEmail)}`;
      const recipients = uniqueEmails([dep.AgentEmail, ...(DB.admins || [])]);
      await sendGasEmail({
        to: recipients,
        subject: `Deposit Approved [${dep.DepositID}] PKR ${Number(dep.AmountPKR || 0).toLocaleString()}`,
        htmlBody: buildDepositEmailHtml(dep, receiptUrl),
        pdfHtml: buildPrintableReceiptPage(dep),
        pdfName: `Receipt-${dep.DepositID}.pdf`,
        bId: dep.DepositID,
        agencyName: dep.AgencyName
      });

      return res.json({ ok: true, message: 'Deposit Approved & PKR ' + Number(dep.AmountPKR).toLocaleString() + ' added to agent limit!' });
    }

    return res.json({ ok: false, message: 'Invalid request' });
  } catch (err) {
    return res.status(200).json({ ok: false, message: 'Backend Error: ' + err.message });
  }
};

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents || '{}');
    if (d.action === 'sendVoucherHtml' && d.to) {
      var htmlForPdf = d.pdfHtml || (
        '<html><body style="font-family:Arial;padding:24px;">' +
        '<h2 style="color:#0b1f44;">GOLAN INTERNATIONAL TRAVEL &amp; TOURS</h2>' +
        '<hr><p><b>Ref ID:</b> ' + (d.bId || '-') + '</p>' +
        '<p><b>Agency:</b> ' + (d.agencyName || '-') + '</p>' +
        '<p><b>Passenger:</b> ' + (d.paxName || '-') + ' (' + (d.passportNo || '-') + ')</p>' +
        '<p><b>Item:</b> ' + (d.itemTitle || '-') + '</p>' +
        '<p><b>Fare:</b> PKR ' + (d.farePKR || 0) + '</p>' +
        '<p><b>Status:</b> ' + (d.statusTxt || '-') + '</p>' +
        '</body></html>'
      );

      var pdfName = d.pdfName || ('Golan-Voucher-' + (d.bId || Date.now()) + '.pdf');
      var pdfBlob = Utilities.newBlob(htmlForPdf, 'text/html', pdfName + '.html')
        .getAs('application/pdf')
        .setName(pdfName);

      GmailApp.sendEmail(
        d.to,
        d.subject || ('Golan International B2B - ' + (d.bId || 'Notification')),
        'Please view your attached PDF document.',
        {
          name: d.senderName || 'GOLAN INTERNATIONAL TRAVEL & TOURS',
          htmlBody: d.htmlBody || htmlForPdf,
          attachments: [pdfBlob]
        }
      );

      return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput('false');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
