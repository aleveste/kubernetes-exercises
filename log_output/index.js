const { randomUUID } = require('crypto')

const randomString = randomUUID()

const logString = () => {

  console.log(`${new Date().toISOString()}: ${randomString}`)

  setTimeout(logString, 5000)
}

logString()