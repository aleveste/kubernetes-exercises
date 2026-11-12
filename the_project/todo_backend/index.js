const http = require('http')

const port = process.env.PORT || 3001
const maxLength = 140

let nextId = 4
const todos = [
  { id: 1, text: 'Learn Kubernetes basics' },
  { id: 2, text: 'Deploy application to cluster' },
  { id: 3, text: 'Configure persistent volumes' },
]

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
  if (req.url === '/todos' && req.method === 'GET') {
    send(res, 200, todos)
  } else if (req.url === '/todos' && req.method === 'POST') {
    try {
      const { text } = JSON.parse(await readBody(req))
      if (typeof text !== 'string' || text.trim() === '' || text.length > maxLength) {
        return send(res, 400, { error: `Todo must be 1-${maxLength} characters` })
      }
      const todo = { id: nextId++, text: text.trim() }
      todos.push(todo)
      send(res, 201, todo)
    } catch (e) {
      send(res, 400, { error: 'Invalid request' })
    }
  } else {
    send(res, 404, { error: 'Not found' })
  }
})

server.listen(port, () => {
  console.log(`Server started in port ${port}`)
})