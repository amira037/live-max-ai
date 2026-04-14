const ALLOWED_ORIGIN = 'https://live.dumpit.dev';
const GEMINI_BASE    = 'https://generativelanguage.googleapis.com';

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN || origin === 'http://localhost' || (origin || '').startsWith('http://localhost:');
  return {
    'Access-Control-Allow-Origin':  allowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: { message: 'Server misconfiguration: missing API key' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // /v1beta/models/{model}:generateContent  →  proxy to Gemini
    const url = new URL(request.url);
    const geminiUrl = `${GEMINI_BASE}${url.pathname}?key=${apiKey}`;

    let body;
    try {
      body = await request.text();
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const geminiRes = await fetch(geminiUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const responseHeaders = {
      'Content-Type': geminiRes.headers.get('Content-Type') || 'application/json',
      ...corsHeaders(origin),
    };

    return new Response(geminiRes.body, {
      status:  geminiRes.status,
      headers: responseHeaders,
    });
  },
};
