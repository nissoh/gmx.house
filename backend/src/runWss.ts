import ws from 'ws'
import http from 'http'


export function runWssServer(server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>) {

  const wss = new ws.Server({
    server,
    path: '/api-ws',
  })

  wss.shouldHandle = (request) => {
    return request.headers.origin === origin
  }

  const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
      const client = liveClients.get(ws)

      if (!client) {
        return
      }

      if (client.isAlive === false) {
        liveClients.delete(ws)
        return ws.terminate()
      }

      client.isAlive = false
      ws.ping()
    })
  }, 30000)

  const liveClients = new Map<ws, { ws: ws, isAlive: boolean }>()

  wss.on('connection', function connection(ws) {
    const client = liveClients.get(ws)

    if (client) {
      client.isAlive = true
    } else {
      liveClients.set(ws, { isAlive: true, ws })
    }

    ws.on('pong', heartbeat)
  })


  wss.on('close', function close() {
    clearInterval(interval)
  })

  wss.on('error', err => {
    console.error(err)
  })

  return wss
}

function heartbeat() {
  // @ts-ignore
  const client = liveClients.get(this)

  if (client) {
    client.isAlive = true
  }
}
