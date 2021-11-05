import http from 'http'
import { URL } from 'url'


export const timespanPassedSinceInvoke = (timespan: number) => {
  let lastTimePasses = 0

  return () => {
    const now = Date.now()

    if (now - lastTimePasses > timespan) {
      lastTimePasses = now
      return true
    }

    return false
  }
}

export const cacheMap = (cacheMap: any) => async <T>(key: string, lifespan: number, cacheFn: () => Promise<T>): Promise<T> => {
  const cacheEntry = cacheMap[key]

  if (cacheEntry && !cacheMap[key].lifespanFn()) {
    return cacheEntry.item
  } else {
    const lifespanFn = cacheMap[key]?.lifespanFn ?? timespanPassedSinceInvoke(lifespan)
    lifespanFn()
    cacheMap[key] = { item: cacheFn(), lifespanFn }
    return cacheMap[key].item
  }

}

export function httpRequest<T>(params: string | http.RequestOptions | URL, postData: any): Promise<T> {
  return new Promise(function(resolve, reject) {
    const req = http.request(params, function(res) {
      // reject on bad status
      if (res.statusCode! < 200 || res.statusCode! >= 300) {
        return reject(new Error('statusCode=' + res.statusCode))
      }
      // cumulate data
      let body: any = []
      res.on('data', function(chunk) {
        body.push(chunk)
      })
      // resolve on end
      res.on('end', function() {
        try {
          body = JSON.parse(Buffer.concat(body).toString())
        } catch(e) {
          reject(e)
        }
        resolve(body)
      })
    })
    // reject on request error
    req.on('error', function(err) {
      // This is not a "Second reject", just a different sort of failure
      reject(err)
    })
    if (postData) {
      req.write(postData)
    }
    // IMPORTANT
    req.end()
  })
}

