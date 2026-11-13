export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { origin, destination, departureDate, passengers = 1 } = req.body;

    const response = await fetch('https://duffel.com', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DUFFEL_API_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        data: {
          slices: [
            {
              origin: (origin || '').toUpperCase(),
              destination: (destination || '').toUpperCase(),
              departure_date: departureDate
            }
          ],
          passengers: Array.from({ length: Number(passengers) }, () => ({ type: 'adult' })),
          cabin_class: 'economy'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = (data.errors && data.errors[0] && data.errors[0].message) ? data.errors[0].message : 'Duffel API Error';
      return res.status(400).json({ error: errMsg });
    }

    const offers = (data.data && data.data.offers) ? data.data.offers.slice(0, 15) : [];
    return res.status(200).json({ offers });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error: ' + error.message });
  }
}
