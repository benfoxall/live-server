const auth = require('basic-auth')
const http = require('http')
const Redis = require('ioredis')
const redis = new Redis(process.env.REDIS_URL)

const USER = process.env.SERVER_USER || 'foo'
const PASS = process.env.SERVER_PASS || 'bar'
const PORT = process.env.SERVER_PORT || 5000

const server = http.createServer( (req, res) => {

  console.log(`${req.method} - ${req.url}`)

  const url = req.url == '/' ? '/index.html' : req.url

  if(req.method.toLowerCase() == 'post') {

    const user = auth(req)

    if(user.name !== USER || user.pass !== PASS) {
      console.log("❌  Rejected", user)

      res.writeHead(401, {'Content-Type': 'text/plain'});
      res.end('401 Unauthorized');

      return
    }


    var body = ''

    req.on('data', (chunk) => {
        body += chunk.toString()

        // limit just in case (~16MB)
        if (body.length > 16e6) req.connection.destroy();
    });

    req.on('end', () => {

      const type = req.headers['content-type'] || 'text/plain'


      redis
        .multi()
          .set(`type.${url}`, type)
          .set(`body.${url}`, body)
        .exec()
        .then( () => {

          console.log(`✅  STORED ${url} | ${type} | (${body.length}) `)

          res.writeHead(200, {'Content-Type': 'text/plain'})
          res.end('200 saved')


        })
        .catch( e => {

          console.error(e)

          res.writeHead(500, {'Content-Type': 'text/plain'})
          res.end('500 error')

        })



    });


  } else {

    console.log(`GET: data.${url}`)

    redis
      .multi()
        .get(`type.${url}`)
        .get(`body.${url}`)
      .exec()
      .then( (result) => {


        var e = result[0][0] || result[1][0]
        if(e) throw e

        var type = result[0][1]
        var body = result[1][1]

        // didn't find anything
        if(type === null || body === null) {
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end('404')
        } else {
          res.writeHead(200, {'Content-Type': type});
          res.end(body)
        }


      })


  }

})

server.listen(PORT)
