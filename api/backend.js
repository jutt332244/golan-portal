     function renderBookingsTable(isAdmin) {
      var list = window.__ALL_BOOKINGS__ || [];
      document.getElementById('bookingsTableBody').innerHTML = list.length ? list.map(function(b) {
        var pnrHtml = (b.PNR && b.PNR !== 'PENDING') ? '<strong style="color:#15803d;font-size:14px;">PNR: '+b.PNR+'</strong>' + (b.TicketNo ? '<br><small>TKT: '+b.TicketNo+'</small>' : '') : '<span style="color:#d97706;font-weight:700;">Awaiting PNR</span>';
        var timerHtml = '';
        if (b.Status === 'PENDING' && b.HoldUntil) {
          timerHtml = '<br><span class="live-timer" data-until="'+b.HoldUntil+'" style="color:#dc2626;font-weight:800;font-size:12px;">⏳ Calculating...</span>';
        }
        var adminBtn = (isAdmin && b.Status === 'PENDING') ? '<button class="btn btn-sm btn-green" style="margin-bottom:4px;" onclick="issueBookingPnr(\''+b.BookingID+'\')">🎫 Issue PNR</button><br>' : '';
        var pdfBtn = '<button class="btn btn-sm btn-primary" onclick="printBookingPdf(\''+b.BookingID+'\')">🖨️ PDF</button>';
        return '<tr><td><strong>'+b.BookingID+'</strong><br><small>'+b.AgencyName+'</small></td><td>'+b.CreatedAt+'</td><td><strong>'+b.PassengerName+'</strong><br><small>PP: '+b.PassportNo+' | DOB: '+(b.Dob||'-')+'</small><br><small>Exp: '+(b.PassportExpiry||'-')+' | '+(b.PaxMobile||'-')+'</small></td><td>'+b.ItemTitle+'</td><td>'+pnrHtml+'</td><td>PKR '+Number(b.FarePKR).toLocaleString()+'</td><td><span class="status-badge st-'+b.Status+'">'+b.Status+'</span>'+timerHtml+'</td><td>'+adminBtn+pdfBtn+'</td></tr>';
      }).join('') : '<tr><td colspan="8" style="text-align:center;color:#64748b;">No bookings yet.</td></tr>';
    }

    setInterval(function() {
      var timers = document.querySelectorAll('.live-timer');
      var now = Date.now();
      timers.forEach(function(el) {
        var until = Number(el.getAttribute('data-until') || 0);
        var diff = until - now;
        if (diff <= 0) {
          el.textContent = '⌛ TIME EXPIRED';
        } else {
          var mins = Math.floor(diff / 60000);
          var secs = Math.floor((diff % 60000) / 1000);
          el.textContent = '⏳ ' + (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs + ' left';
        }
      });
    }, 1000);

    function issueBookingPnr(bookingId) {
      var pnr = prompt('Enter 6-Digit Airline PNR (e.g. 8K9L2P):');
      if (!pnr) return;
      var tkt = prompt('Enter 13-Digit E-Ticket Number (Optional):') || '';
      callBackend({ action:'adminIssueBooking', email:currentEmail, token:currentToken, bookingId:bookingId, pnr:pnr, ticketNo:tkt }).then(function(res) { alert(res.message); loadDashboardData(); });
    }

    function printBookingPdf(bookingId) {
      var b = (window.__ALL_BOOKINGS__ || []).find(function(x) { return x.BookingID === bookingId; });
      if (!b) return;
      var w = window.open('', '_blank');
      w.document.write('<html><head><title>Golan International - '+b.BookingID+'</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#0f172a;} .box{border:2px solid #0b1f3a;border-radius:10px;padding:24px;max-width:750px;margin:auto;} .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #d4af37;padding-bottom:14px;margin-bottom:18px;} table{width:100%;border-collapse:collapse;margin-top:12px;} td,th{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:13px;} th{background:#f1f5f9;}</style></head><body><div class="box"><div class="hdr"><div><h2 style="margin:0;color:#0b1f3a;">GOLAN INTERNATIONAL TRAVEL & TOURS</h2><p style="margin:4px 0 0;font-size:12px;color:#475569;">Toba Tek Singh | CEO Shan Chairman: 0345-3326318 | Manager M. Umer: 0331-6379110</p></div><div style="text-align:right;"><strong>Booking ID: '+b.BookingID+'</strong><br><span>Status: <b>'+b.Status+'</b></span><br><span>PNR: <b>'+(b.PNR||'PENDING')+'</b></span></div></div><table><tr><th>Agency Name</th><td>'+b.AgencyName+'</td><th>Booking Date</th><td>'+b.CreatedAt+'</td></tr><tr><th>Passenger Name</th><td><strong>'+b.PassengerName+'</strong></td><th>Passport Number</th><td><strong>'+b.PassportNo+'</strong></td></tr><tr><th>Date of Birth</th><td>'+(b.Dob||'-')+'</td><th>Passport Expiry</th><td>'+(b.PassportExpiry||'-')+'</td></tr><tr><th>Nationality</th><td>'+(b.Nationality||'Pakistani')+'</td><th>Mobile</th><td>'+(b.PaxMobile||'-')+'</td></tr><tr><th>Flight / Package</th><td colspan="3"><strong>'+b.ItemTitle+'</strong> ('+b.Category+')</td></tr><tr><th>E-Ticket Number</th><td>'+(b.TicketNo||'To be issued')+'</td><th>Total B2B Fare</th><td><strong>PKR '+Number(b.FarePKR).toLocaleString()+'</strong></td></tr></table><p style="margin-top:20px;font-size:11px;color:#64748b;text-align:center;">System Generated B2B Travel Voucher — Golan International Travel & Tours</p></div><script>window.onload=function(){window.print();}<\/script></body></html>');
      w.document.close();
    }

    function submitBooking(e) {
      e.preventDefault();
      callBackend({
        action:'addBooking', email:currentEmail, token:currentToken,
        passengerName:document.getElementById('paxName').value,
        passportNo:document.getElementById('paxPassport').value,
        dob:document.getElementById('paxDob').value,
        passportExpiry:document.getElementById('paxExp').value,
        nationality:document.getElementById('paxNat').value,
        paxMobile:document.getElementById('paxMobile').value,
        category:selectedItem.Category, itemTitle:selectedItem.Title, farePKR:selectedItem.FarePKR
      }).then(function(res) { alert(res.message); document.getElementById('bookingModal').classList.add('hidden'); loadDashboardData(); });
    }
