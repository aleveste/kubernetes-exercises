const http = require('http')
const fs = require('fs')

const port = process.env.PORT || 3000
const logFile = process.env.LOG_FILE || '/usr/src/app/files/log.txt'
const pingUrl = process.env.PING_URL || 'http://ping-pong-svc:2346/pings'

const readLastLine = () => {
  try {
    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean)
    return lines.length ? lines[lines.length - 1] : 'No log line yet'
  } catch (e) {
    return 'No log line yet'
  }
}

const getPings = async () => {
  try {
    const response = await fetch(pingUrl, { signal: AbortSignal.timeout(2000) })
    if (!response.ok) throw new Error(`status ${response.status}`)
    return (await response.text()).trim()
  } catch (err) {
    console.error('Could not reach ping-pong:', err.message)
    return 'unavailable'
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/status')) {
    const pings = await getPings()
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(`${readLastLine()}.\nPing / Pongs: ${pings.slice(-1)}\n`)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  }
})

server.listen(port, () => {
  console.log(`Server started in port ${port}`)
})