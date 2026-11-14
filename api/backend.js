export default async function handler(req, res) {
  const HOST = ['https:', '', ['script', 'google', 'com'].join('.'), 'macros', 's', ''].join('/');
  const GAS_URL = HOST + 'AKfycbyw4rKuL8HLL7zrBjrYlzcxJs2ZLsOY2LcoM7lWQ4LPT0lmkDLOjbAr4vQIIArxofTGjQ/exec';

  try {
    const query = new URLSearchParams(req.query).toString();
    const response = await fetch(GAS_URL + '?' + query, { redirect: 'follow' });
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Server Proxy Error: ' + err.message });
  }
}
