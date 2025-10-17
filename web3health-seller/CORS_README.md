Fixing CORS with Supabase Edge Functions

1) Edge Function must return CORS headers for preflight and responses

Example (already added): `supabase/functions/list_postings/index.ts`

Key headers to set:
- Access-Control-Allow-Origin: the origin (or '*')
- Access-Control-Allow-Methods: GET,POST,OPTIONS
- Access-Control-Allow-Headers: Content-Type, Authorization

Deploy the function with the Supabase CLI (in the function folder):

```bash
supabase functions deploy list_postings --project-ref <your-project-ref>
```

2) Test CORS with curl (simulate a browser Origin header):

```bash
curl -i -H "Origin: http://localhost:3000" "https://<project>.supabase.co/functions/v1/list_postings"
```

You should see `Access-Control-Allow-Origin` in the response headers.

3) Local dev workaround (proxy):

Start the proxy while developing to avoid CORS locally:

```bash
npm install express node-fetch
node dev-proxy.js
# Then point your app to http://localhost:8787/list_postings
```
