import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, method, headers, requestBody } = body;

    if (!url) {
      return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
    }

    const start = Date.now();
    
    // Parse headers from the array or object passed by the frontend
    const fetchHeaders = new Headers();
    if (headers && Array.isArray(headers)) {
      headers.forEach(h => {
        if (h.key && h.value && h.active) {
          fetchHeaders.append(h.key, h.value);
        }
      });
    }

    const fetchOptions = {
      method: method || 'GET',
      headers: fetchHeaders,
    };

    if (method !== 'GET' && method !== 'HEAD' && requestBody) {
      fetchOptions.body = requestBody;
      if (!fetchHeaders.has('Content-Type')) {
        fetchHeaders.append('Content-Type', 'application/json');
      }
    }

    const res = await fetch(url, fetchOptions);
    
    const end = Date.now();
    const timeMs = end - start;
    
    let responseData;
    const contentType = res.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      responseData = await res.json();
    } else {
      responseData = await res.text();
    }

    // Estimate size
    const size = Buffer.byteLength(typeof responseData === 'object' ? JSON.stringify(responseData) : responseData);

    return NextResponse.json({
      status: res.status,
      statusText: res.statusText,
      time: timeMs,
      size: size,
      data: responseData,
      responseHeaders: Object.fromEntries(res.headers.entries())
    });

  } catch (error) {
    console.error("API Proxy Error:", error);
    return NextResponse.json({
      status: 500,
      statusText: "Proxy Error",
      time: 0,
      size: 0,
      data: { error: error.message },
      responseHeaders: {}
    });
  }
}
