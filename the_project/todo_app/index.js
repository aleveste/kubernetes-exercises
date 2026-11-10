const http = require('http')

const port = process.env.PORT || 3000

const page = `<!DOCTYPE html>
<html>
  <head><title>Todo app</title></head>
  <body>
    <h1>Todo app</h1>
    <p>Todo app</p>
  </body>
</html>`

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(page)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  }
    })

server.listen(port, () => {
  console.log(`Server started in port ${port}`)
})