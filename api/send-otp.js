export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, passcode, time } = req.body;
  try {
    const response = await fetch('https://emailjs.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: 'service_x4flyen',
        template_id: 'template_csrue8p',
        user_id: 'gMrrdOr6utn_kwlZx',
        template_params: { email, passcode, time }
      })
    });
    const text = await response.text();
    return res.status(response.status).json({ ok: response.ok, message: text });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}
    function sendRealEmailOTP(targetEmail, code, bannerId) {
      var expiry = new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var banner = document.getElementById(bannerId);
      banner.textContent = 'Sending OTP to ' + targetEmail + '...';

      fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          passcode: code,
          time: expiry
        })
      }).then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.ok) {
          banner.innerHTML = '✅ OTP Sent to <b>' + targetEmail + '</b>! (Check Gmail Inbox/Spam)';
        } else {
          banner.innerHTML = '⚠️ Server Note (' + data.message + ') • Your Code: <b>' + code + '</b>';
        }
      }).catch(function() {
        banner.innerHTML = '⚠️ Offline Mode • Your Code: <b>' + code + '</b>';
      });
    }
