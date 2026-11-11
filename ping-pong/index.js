const http = require('http')
const fs = require('fs')
const path = require('path')

const port = process.env.PORT || 3000
const dir = process.env.FILES_DIR || '/usr/src/app/files'
const file = path.join(dir, 'pingpong.txt')

let counter = 0
try {
  counter = parseInt(fs.readFileSync(file, 'utf8'), 10) || 0
} catch (e) {}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/pingpong') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(`pong ${counter}`)
    counter++
    fs.writeFile(file, String(counter), (err) => {
      if (err) console.error('Write failed:', err.message)
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  }
})

server.listen(port, () => {
  console.log(`Server started in port ${port}`)
})