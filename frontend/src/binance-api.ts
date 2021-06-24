import { http } from "@aelea/ui-components"
import { filter, fromPromise, map, merge, multicast, now, skipRepeatsWith, switchLatest, throttle } from "@most/core"
import { intervalInMsMap, timeTzOffset } from "gambit-middleware"
import { BarData, UTCTimestamp } from "lightweight-charts"






export type WSBTCPriceEvent =  {
  e: "trade"                 // Event type
  E: 1617289601815           // Event time
  s: "BTCUSDT"               // Symbol
  t: 740367356               // Aggregate trade ID
  p: "59024.37000000"        // Price
  q: "0.00411700"            // Quantity
  b: 5419239227              // First trade ID
  a: 5419239297              // Last trade ID
  T: 1617289601814           // Trade time
  m: true                    // Is the buyer the market maker?
  M: true                    // Ignore
}
// 1m
// 3m
// 5m
// 15m
// 30m
// 1h
// 2h
// 4h
// 6h
// 8h
// 12h
// 1d
// 3d
// 1w
// 1M
type kineEvent = [openTime: number, open: string, high: string, low: string, close: string, volume: string, closeTime: number]

const intervampMap = {
  [intervalInMsMap.MIN]: '1m',
  [intervalInMsMap.MIN5]: '5m',
  [intervalInMsMap.MIN15]: '15m',
  [intervalInMsMap.HR]: '1h',
  [intervalInMsMap.HR4]: '4h',
  [intervalInMsMap.HR8]: '8h',
  [intervalInMsMap.DAY]: '1d',
  [intervalInMsMap.WEEK]: '1w',
}

export interface IBinanceApiParams {
  interval: intervalInMsMap
  startTime?: number
  endTime?: number
  limit: number
}

// https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data
export async function fetchHistoricKline(symbol: string, params: IBinanceApiParams) {
  const interval = intervampMap[params.interval as keyof typeof intervampMap]
  const queryParams = new URLSearchParams({
    symbol,
    interval,
    limit: String(params.limit)
  })

  if (params.startTime) {
    queryParams.set('startTime', String(params.startTime))
  }

  if (params.endTime) {
    queryParams.set('endTime', String(params.endTime))
  }



  const kLineData: kineEvent[] = await http.fetchJson(`https://api.binance.com/api/v3/klines?${queryParams.toString()}`)
  const klineBars = kLineData.map(([time, open, high, low, close]) => {

    return {
      low: Number(low),
      close: Number(close),
      open: Number(open),
      time,
      high: Number(high),
    }
  })

  return klineBars
}

// function convertBusinessDayToUTCTimestamp(date) {
//   return new Date(Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0, 0))
// }

// function nextBusinessDay(time) {
//   const d = convertBusinessDayToUTCTimestamp({ year: time.year, month: time.month, day: time.day + 1 })
//   return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
// }

export function klineWS(symbol: string) {
  const url = `wss://stream.binance.com:9443/ws/${symbol}@aggTrade`
  const wsInput = now({
    method: "SUBSCRIBE",
    params: [
      `${symbol}@aggTrade`
    ],
    id: 2
  })
  const wss = filter((data: any) => {
    return Boolean(data.p)
  }, http.fromWebsocket<WSBTCPriceEvent, any>(url, wsInput))

  const throttledWss = throttle(1000, wss)
  const throttleWss = multicast(
    skipRepeatsWith((prev, next) => prev.p === next.p, throttledWss)  
  )

  return throttleWss
}





