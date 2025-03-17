import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy API route to fetch images from external sources like Instagram
 * This bypasses CORS restrictions by fetching the image on the server side
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL from the query parameter
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    // Validate URL to ensure it's from trusted sources
    const validDomains = [
      'instagram.com',
      'instagram.fgru4-1.fna.fbcdn.net',
      'scontent.cdninstagram.com',
      'scontent-iad3-1.cdninstagram.com',
      'media.licdn.com',
      'linkedin.com',
      'static.licdn.com'
    ];

    const isValidUrl = validDomains.some(domain => url.includes(domain));
    
    if (!isValidUrl) {
      return NextResponse.json(
        { error: 'Invalid URL domain' },
        { status: 403 }
      );
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the image data as an array buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
} 