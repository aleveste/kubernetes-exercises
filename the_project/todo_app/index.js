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

const page = `<!DOCTYPE html>
<html>
  <head>
    <title>Todo App</title>
    <style>
      body { font-family: sans-serif; text-align: center; color: #333; }
      img { width: 800px; max-width: 90%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    </style>
  </head>
  <body>
    <h1>Todo App</h1>
    <img src="/image" alt="Random picture">
    <p>DevOps with Kubernetes 2026</p>
  </body>
</html>`

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(page)
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