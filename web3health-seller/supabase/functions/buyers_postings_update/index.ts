import { serve } from 'std/server'

// Simple Supabase Edge Function that accepts a JSON body to update a posting.
// It returns CORS headers and echoes back a success object. Replace the update logic
// with your DB calls or supabase-js integrations as needed.

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const origin = req.headers.get('origin') || '*'
    const data = await req.json().catch(() => null)

    if (!data || (!data.postingId && !data.posting_id && !data.id)) {
      return new Response(JSON.stringify({ error: 'missing postingId' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
        },
      })
    }

    // TODO: perform actual update in your DB here using Supabase client or direct SQL.
    // We'll return a stubbed success payload reflecting the update.
    const updated = {
      postingId: data.postingId || data.posting_id || data.id,
      updatedFields: data,
      status: 'ok',
    }

    return new Response(JSON.stringify({ ok: true, updated }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
