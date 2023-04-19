import ws from 'ws'
import http from 'http'

type ILiveClients = Map<ws, {
  ws: ws;
  isAlive: boolean;
}>

export function runWssServer(server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>) {

  const wss = new ws.Server({
    server,
    path: '/api-ws',
  })

  wss.shouldHandle = (request) => {
    return request.headers.origin === process.env.ORIGIN
  }
  const liveClients: ILiveClients = new Map()

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


  wss.on('connection', function connection(ws) {
    const client = liveClients.get(ws)

    if (client) {
      client.isAlive = true
    } else {
      liveClients.set(ws, { isAlive: true, ws })
    }

    ws.on('pong', () => heartbeat(liveClients, ws))
  })


  wss.on('close', function close() {
    clearInterval(interval)
  })

  wss.on('error', err => {
    console.error(err)
  })

  return wss
}

function heartbeat(liveClients: ILiveClients, wss: ws.WebSocket) {
  const client = liveClients.get(wss)

  if (client) {
    client.isAlive = true
  }
}
