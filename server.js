
const TOKEN = process.env.TOKEN || 'foo'
const PORT = process.env.PORT || 5000

const http = require('http')
const Redis = require('ioredis')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const redis = new Redis(process.env.REDIS_URL)
const app = express()


app.get('*', (req, res, next) => {

  redis
    .get(`body.${req.originalUrl}`)
    .then( data => {
      if(data === null)
        res.sendStatus(404)
      else
        res.send(data)
    })
    .catch(next)
})

app.all('/upload', cors())
app.post('/upload', bodyParser.json(), (req, res, next) => {

  if(req.headers.token !== TOKEN)
    return res.sendStatus(401)

  if(req.body.path && req.body.content)
    redis
      .set(`body.${req.body.path}`, req.body.content)
      .then( _ => res.sendStatus(200))
      .catch(next)

})


app.listen(PORT)
