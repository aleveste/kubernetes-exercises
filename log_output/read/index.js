const http = require('http')
const fs = require('fs')

const port = process.env.PORT || 3000
const filePath = process.env.LOG_FILE || '/usr/src/app/files/log.txt'

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/status')) {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(503, { 'Content-Type': 'text/plain' })
        res.end('No log file yet\n')
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end(data)
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  }
})

server.listen(port, () => {
  console.log(`Server started in port ${port}`)
})