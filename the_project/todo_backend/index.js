const http = require('http')
const { Pool } = require('pg')

const requiredInt = (name) => {
  const value = parseInt(process.env[name], 10)
  if (Number.isNaN(value)) {
    console.error(`Missing or invalid environment variable ${name}`)
    process.exit(1)
  }
  return value
}

const log = (level, message, fields = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }))

const preview = (text) => (typeof text === 'string' ? text.slice(0, 200) : String(text))

const port = requiredInt('PORT')
const maxLength = requiredInt('MAX_TODO_LENGTH')

const pool = new Pool()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const errorReason = (err) =>
  err.code ||
  err.message ||
  (err.errors && err.errors.map((e) => `${e.address}:${e.port} ${e.code}`).join(', ')) ||
  String(err)

const initDatabase = async () => {
  for (;;) {
    try {
      await pool.query(
        'CREATE TABLE IF NOT EXISTS todos (id SERIAL PRIMARY KEY, text TEXT NOT NULL)'
      )
      console.log('Database ready')
      return
    } catch (err) {
      console.error('Database not ready:', errorReason(err))
      await sleep(3000)
    }
  }
}

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 10000) {
        reject(new Error('Body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })

const server = http.createServer(async (req, res) => {
  const started = Date.now()
  res.on('finish', () => {
    log('info', 'request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      ms: Date.now() - started,
    })
  })

  try {
    if (req.url === '/todos' && req.method === 'GET') {
      const { rows } = await pool.query('SELECT id, text FROM todos ORDER BY id')
      send(res, 200, rows)
    } else if (req.url === '/todos' && req.method === 'POST') {
      let text
      try {
        text = JSON.parse(await readBody(req)).text
      } catch (e) {
        log('warn', 'Todo rejected', { reason: 'invalid request body' })
        return send(res, 400, { error: 'Invalid request' })
      }
      if (typeof text !== 'string' || text.trim() === '') {
        log('warn', 'Todo rejected', { reason: 'empty or not a string', text: preview(text) })
        return send(res, 400, { error: 'Todo must be a non-empty string' })
      }
      if (text.length > maxLength) {
        log('warn', 'Todo rejected', {
          reason: 'too long',
          length: text.length,
          maxLength,
          text: preview(text),
        })
        return send(res, 400, { error: `Todo must be 1-${maxLength} characters` })
      }
      const { rows } = await pool.query(
        'INSERT INTO todos (text) VALUES ($1) RETURNING id, text',
        [text.trim()]
      )
      log('info', 'Todo created', { id: rows[0].id, length: text.length, text: preview(text) })
      send(res, 201, rows[0])
    } else {
      send(res, 404, { error: 'Not found' })
    }
  } catch (err) {
    log('error', 'Request failed', { reason: errorReason(err) })
    send(res, 500, { error: 'Database error' })
  }
})

initDatabase().then(() => {
  server.listen(port, () => {
    console.log(`Server started in port ${port}`)
  })
})