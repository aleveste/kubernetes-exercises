const http = require('http')
const fs = require('fs')
const path = require('path')

const required = (name) => {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing environment variable ${name}`)
    process.exit(1)
  }
  return value
}

const requiredInt = (name) => {
  const value = parseInt(required(name), 10)
  if (Number.isNaN(value)) {
    console.error(`Invalid number in environment variable ${name}`)
    process.exit(1)
  }
  return value
}

const port = requiredInt('PORT')
const imageUrl = required('IMAGE_URL')
const filesDir = required('FILES_DIR')
const maxAgeMs = requiredInt('CACHE_MINUTES') * 60 * 1000
const maxTodoLength = requiredInt('MAX_TODO_LENGTH')
const todosUrl = required('TODOS_URL')

const imagePath = path.join(filesDir, 'image.jpg')
let refreshing = false

const fetchImage = async () => {
  if (refreshing) return
  refreshing = true
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`status ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    const tmp = `${imagePath}.tmp`
    await fs.promises.writeFile(tmp, buffer)
    await fs.promises.rename(tmp, imagePath)
    console.log('Fetched a new image')
  } catch (err) {
    console.error('Image fetch failed:', err.message)
  } finally {
    refreshing = false
  }
}

const statOrNull = async () => {
  try {
    return await fs.promises.stat(imagePath)
  } catch (e) {
    return null
  }
}

const serveImage = async (res) => {
  let stat = await statOrNull()

  if (!stat) {
    await fetchImage()
    stat = await statOrNull()
    if (!stat) {
      res.writeHead(502, { 'Content-Type': 'text/plain' })
      res.end('Could not fetch an image\n')
      return
    }
  } else if (Date.now() - stat.mtimeMs > maxAgeMs) {
    fetchImage()
  }

  res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' })
  fs.createReadStream(imagePath).pipe(res)
}

const toJs = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

const renderPage = () => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Todo App</title>
    <style>
      body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; text-align: center; }
      img { width: 400px; max-width: 90%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      form { display: flex; gap: 12px; margin: 40px 0 20px; }
      input { flex: 1; padding: 12px; font-size: 18px; border: 2px solid #4caf50; border-radius: 4px; }
      button { padding: 12px 24px; font-size: 18px; color: #fff; background: #4caf50; border: 0; border-radius: 4px; cursor: pointer; }
      ul { list-style: none; padding: 0; text-align: left; }
      li { padding: 20px; margin-bottom: 12px; background: #f9f9f9; border-left: 4px solid #4caf50; border-radius: 4px; }
      #error { color: #c62828; }
    </style>
  </head>
  <body>
    <h1>Todo App</h1>
    <img src="/image" alt="Random picture">
    <form id="form">
      <input type="text" id="todo" maxlength="${maxTodoLength}" placeholder="Enter a new todo (max ${maxTodoLength} characters)">
      <button type="submit">Send</button>
    </form>
    <p id="error"></p>
    <h2>Todos</h2>
    <ul id="todos"></ul>
    <script>
      const TODOS_URL = ${toJs(todosUrl)}
      const list = document.getElementById('todos')
      const input = document.getElementById('todo')
      const error = document.getElementById('error')

      const render = (todos) => {
        list.innerHTML = ''
        todos.forEach((todo) => {
          const li = document.createElement('li')
          li.textContent = todo.text
          list.appendChild(li)
        })
      }

      const load = async () => {
        const res = await fetch(TODOS_URL)
        render(await res.json())
      }

      document.getElementById('form').addEventListener('submit', async (e) => {
        e.preventDefault()
        const text = input.value.trim()
        if (!text) return
        const res = await fetch(TODOS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (!res.ok) {
          error.textContent = 'Could not add the todo'
          return
        }
        error.textContent = ''
        input.value = ''
        load()
      })

      load()
    </script>
  </body>
</html>`

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderPage())
  } else if (req.method === 'GET' && req.url === '/image') {
    serveImage(res)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  }
})

server.listen(port, () => {
  console.log(`Server started in port ${port}`)
})