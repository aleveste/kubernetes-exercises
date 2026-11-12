const http = require('http')
const fs = require('fs')

const port = process.env.PORT || 3000
const logFile = process.env.LOG_FILE || '/usr/src/app/files/log.txt'
const infoFile = process.env.INFO_FILE || '/usr/src/app/config/information.txt'
const pingUrl = process.env.PING_URL || 'http://ping-pong-svc:2346/pings'

const readLastLine = () => {
  try {
    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean)
    return lines.length ? lines[lines.length - 1] : 'No log line yet'
  } catch (e) {
    return 'No log line yet'
  }
}

const readInfo = () => {
  try {
    return fs.readFileSync(infoFile, 'utf8').trim()
  } catch (e) {
    return 'file not found'
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
    res.end(
      `file content: ${readInfo()}\n` +
      `env variable: MESSAGE=${process.env.MESSAGE}\n` +
      `${readLastLine()}.\n` +
      `Ping / Pongs: ${pings.replace(/\D/g, '')}\n`
    )
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  }
})

server.listen(port, () => {
  console.log(`Server started in port ${port}`)
})