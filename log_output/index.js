const http = require('http')
const { randomUUID } = require('crypto')

const port = process.env.PORT || 3000
const randomString = randomUUID()

const logString = () => {

  console.log(`${new Date().toISOString()}: ${randomString}`)

  setTimeout(logString, 5000)
}

logString()

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/status')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      timestamp: new Date().toISOString(),
      randomString,
    }))
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  }
})

server.listen(port, () => {
  console.log(`Server started in port ${port}`)
})