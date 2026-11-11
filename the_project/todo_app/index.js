const http = require('http')
const fs = require('fs')
const path = require('path')

const port = process.env.PORT || 3000
const dir = process.env.FILES_DIR || '/usr/src/app/files'
const imagePath = path.join(dir, 'image.jpg')
const maxAgeMs = (parseInt(process.env.CACHE_MINUTES, 10) || 10) * 60 * 1000

let refreshing = false

const fetchImage = async () => {
  if (refreshing) return
  refreshing = true
  try {
    const response = await fetch('https://picsum.photos/1200')
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

const todos = [
  'Learn Kubernetes basics',
  'Deploy application to cluster',
  'Configure persistent volumes',
]

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

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
    </style>
  </head>
  <body>
    <h1>Todo App</h1>
    <img src="/image" alt="Random picture">
    <form onsubmit="return false;">
      <input type="text" id="todo" maxlength="140" placeholder="Enter a new todo (max 140 characters)">
      <button type="submit">Send</button>
    </form>
    <h2>Todos</h2>
    <ul>
      ${todos.map((todo) => `<li>${escapeHtml(todo)}</li>`).join('\n      ')}
    </ul>
  </body>
</html>`

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
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