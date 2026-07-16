import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    // Fallback mock data for testing
    const mockResults = [
      { id: '1', name: 'Bohemian Rhapsody', artist: 'Queen' },
      { id: '2', name: 'Imagine', artist: 'John Lennon' },
      { id: '3', name: 'Yesterday', artist: 'The Beatles' },
    ].filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.artist.toLowerCase().includes(query.toLowerCase()));
    return NextResponse.json({ results: mockResults });
  }

  try {
    const params = new URLSearchParams({
      method: 'track.search',
      api_key: apiKey,
      format: 'json',
      track: query,
      limit: '10',
    });
    const url = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ results: [] });
    }

    const tracks = data.results?.trackmatches?.track || [];
    const results = tracks.map((track: any) => ({
      id: track.mbid || track.name + '_' + track.artist,
      name: track.name,
      artist: track.artist,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Music search error:', error);
    return NextResponse.json({ results: [] });
  }
}
