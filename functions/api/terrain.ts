/**
 * Terrain Tile Proxy - Fetches elevation tiles from AWS and adds CORS headers
 * 
 * URL: /api/terrain?z=12&x=702&y=1635
 */

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const z = url.searchParams.get('z');
  const x = url.searchParams.get('x');
  const y = url.searchParams.get('y');

  if (!z || !x || !y) {
    return new Response(JSON.stringify({ error: 'Missing z, x, or y parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate zoom level (10-14 is useful range)
  const zoom = parseInt(z, 10);
  if (isNaN(zoom) || zoom < 0 || zoom > 15) {
    return new Response(JSON.stringify({ error: 'Invalid zoom level' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // AWS Terrain Tiles URL (Terrarium format)
  const tileUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(tileUrl);
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Tile not found' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const imageData = await response.arrayBuffer();

    return new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Terrain fetch error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch terrain tile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
