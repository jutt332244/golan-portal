import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const origin = (body.origin || '').toUpperCase();
    const destination = (body.destination || '').toUpperCase();
    const departureDate = body.departureDate;
    const passengers = Number(body.passengers || 1);

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
              origin: origin,
              destination: destination,
              departure_date: departureDate
            }
          ],
          passengers: Array.from({ length: passengers }, () => ({ type: 'adult' })),
          cabin_class: 'economy'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = (data.errors && data.errors[0] && data.errors[0].message) ? data.errors[0].message : 'Duffel API Error';
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const offers = (data.data && data.data.offers) ? data.data.offers.slice(0, 15) : [];
    return NextResponse.json({ offers: offers });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error: ' + error.message }, { status: 500 });
  }
}
