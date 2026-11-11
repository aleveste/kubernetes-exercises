const http = require('http')
const fs = require('fs')

const port = process.env.PORT || 3000
const logFile = process.env.LOG_FILE || '/usr/src/app/files/log.txt'
const pingFile = process.env.PING_FILE || '/usr/src/app/pvfiles/pingpong.txt'

const readOr = (file, fallback) => {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch (e) {
    return fallback
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/status')) {
    const lines = readOr(logFile, '').trim().split('\n').filter(Boolean)
    const lastLine = lines.length ? lines[lines.length - 1] : 'No log line yet'
    const pings = readOr(pingFile, '0').trim() || '0'
    
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(`${lastLine}.\nPing / Pongs: ${pings}\n`)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  }
})

server.listen(port, () => {
  console.log(`Server started in port ${port}`)
})