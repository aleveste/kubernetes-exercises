const http = require('http')
const { Pool } = require('pg')

const port = process.env.PORT
if (!port) {
  console.error('Error: PORT environment variable is not set')
  process.exit(1)
}

const pool = new Pool()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const initDatabase = async () => {
  for (;;) {
    try {
      await pool.query(
        'CREATE TABLE IF NOT EXISTS counter (id INT PRIMARY KEY, value INT NOT NULL)'
      )
      await pool.query(
        'INSERT INTO counter (id, value) VALUES (1, 0) ON CONFLICT (id) DO NOTHING'
      )
      console.log('Database ready')
      return
    } catch (err) {
      console.error('Database not ready:', err.message)
      await sleep(3000)
    }
  }
}

const reply = (res, status, text) => {
  res.writeHead(status, { 'Content-Type': 'text/plain' })
  res.end(text)
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      reply(res, 200, 'ok\n')
    } else if (req.method === 'GET' && req.url === '/pingpong') {
      const { rows } = await pool.query(
        'UPDATE counter SET value = value + 1 WHERE id = 1 RETURNING value'
      )
      reply(res, 200, `pong ${rows[0].value - 1}`)
    } else if (req.method === 'GET' && req.url === '/pings') {
      const { rows } = await pool.query('SELECT value FROM counter WHERE id = 1')
      reply(res, 200, String(rows[0].value))
    } else {
      reply(res, 404, 'Not found\n')
    }
  } catch (err) {
    console.error('Request failed:', err.message)
    reply(res, 500, 'Database error\n')
  }
})

initDatabase().then(() => {
  server.listen(port, () => {
    console.log(`Server started in port ${port}`)
  })
})