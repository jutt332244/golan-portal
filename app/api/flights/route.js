import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { origin, destination, departureDate, passengers = 1 } = await request.json();

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
              origin: origin.toUpperCase(),
              destination: destination.toUpperCase(),
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
      return NextResponse.json({ error: data.errors?.[0]?.message || 'Duffel API Error' }, { status: 400 });
    }

    return NextResponse.json({ offers: data.data.offers.slice(0, 15) });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error: ' + error.message }, { status: 500 });
  }
}
