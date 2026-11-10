const fs = require('fs')
const { randomUUID } = require('crypto')

const filePath = process.env.LOG_FILE || '/usr/src/app/files/log.txt'
const randomString = randomUUID()

const logString = () => {

  const line = `${new Date().toISOString()}: ${randomString}\n`
  fs.appendFile(filePath, line, (err) => {
    if (err) console.error('Write failed:', err.message)
  })
  setTimeout(logString, 5000)
}

logString()
console.log(`Writing to ${filePath}`)