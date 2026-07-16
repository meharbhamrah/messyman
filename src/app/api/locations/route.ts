import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ locations: [] });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Messyman/1.0' },
    });
    const data = await response.json();

    const locations = data.map((item: any) => ({
      id: item.place_id,
      name: item.display_name,
    }));

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Location search error:', error);
    return NextResponse.json({ locations: [] });
  }
}
