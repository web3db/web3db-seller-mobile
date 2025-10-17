// Simple development proxy to avoid CORS while developing locally.
// Usage: node dev-proxy.js


const express = require('express')
const fetch = require('node-fetch')
const app = express()
const PORT = process.env.PORT || 8787

const TARGET_BASE = process.env.TARGET_BASE || 'https://jkyctppxygjhsqwmbyvb.supabase.co/functions/v1'

// --- CORS allowedOrigins whitelist ---
const allowedOrigins = [
  'http://localhost:8081', // Expo web
  'http://localhost:19006', // Expo web (alt)
  'http://localhost:3000', // React web
  'http://localhost:8787', // Proxy itself
  // Add more origins as needed
]

app.use(express.json())

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.use((req, res) => {
  const url = `${TARGET_BASE}${req.path}` + (Object.keys(req.query).length ? ('?' + new URLSearchParams(req.query).toString()) : '')
  const opts = {
    method: req.method,
    headers: { ...req.headers },
    redirect: 'follow',
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') opts.body = JSON.stringify(req.body)

  fetch(url, opts)
    .then(async (r) => {
      const body = await r.text()
      res.status(r.status).send(body)
    })
    .catch((err) => {
      console.error(err)
      res.status(502).send('Bad Gateway')
    })
})

app.listen(PORT, () => console.log(`Dev proxy listening on http://localhost:${PORT} -> ${TARGET_BASE}`))
