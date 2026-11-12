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
  try {
    if (req.url === '/todos' && req.method === 'GET') {
      const { rows } = await pool.query('SELECT id, text FROM todos ORDER BY id')
      send(res, 200, rows)
    } else if (req.url === '/todos' && req.method === 'POST') {
      let text
      try {
        text = JSON.parse(await readBody(req)).text
      } catch (e) {
        return send(res, 400, { error: 'Invalid request' })
      }
      if (typeof text !== 'string' || text.trim() === '' || text.length > maxLength) {
        return send(res, 400, { error: `Todo must be 1-${maxLength} characters` })
      }
      const { rows } = await pool.query(
        'INSERT INTO todos (text) VALUES ($1) RETURNING id, text',
        [text.trim()]
      )
      send(res, 201, rows[0])
    } else {
      send(res, 404, { error: 'Not found' })
    }
  } catch (err) {
    console.error('Request failed:', errorReason(err))
    send(res, 500, { error: 'Database error' })
  }
})

initDatabase().then(() => {
  server.listen(port, () => {
    console.log(`Server started in port ${port}`)
  })
})