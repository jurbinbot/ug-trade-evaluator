const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001
const DATA_FILE = process.env.DATA_FILE || '/data/settings.json'

const EMPTY_SETTINGS = {
  bases: {},
  bundles: {},
  customDinos: [],
  customCatColors: {},
}

app.use(cors())
app.use(express.json({ limit: '1mb' }))

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/settings', (_req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.json(EMPTY_SETTINGS)
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    res.json(JSON.parse(raw))
  } catch (err) {
    console.error('Failed to read settings:', err.message)
    res.status(500).json({ error: 'Failed to read settings' })
  }
})

app.put('/api/settings', (req, res) => {
  try {
    ensureDataDir()
    const data = {
      bases:           req.body.bases           || {},
      bundles:         req.body.bundles         || {},
      customDinos:     req.body.customDinos     || [],
      customCatColors: req.body.customCatColors || {},
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
    res.json({ ok: true })
  } catch (err) {
    console.error('Failed to save settings:', err.message)
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

app.listen(PORT, () => {
  console.log(`UG Trade Evaluator API listening on :${PORT}`)
  console.log(`Data file: ${DATA_FILE}`)
})
