import { filter, fromPromise, map, merge, multicast, now, skipRepeatsWith, switchLatest, throttle } from "@most/core"
import { fetchJson } from "ethers/lib/utils"
import { BarData, UTCTimestamp } from "lightweight-charts"


type kineEvent = [openTime: number, open: string, high: string, low: string, close: string, volume: string, closeTime: number]



const intervalInMsMap = {
  '1m': 60 * 1000
}

type WSBTCPriceEvent =  {
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
  

async function fetchHistoricKline(symbol: string, interval = '1hr') {
  const params = new URLSearchParams({
    // endTime: Date.now().toString(),
    // startTime: (Date.now() - 25000).toString(),
    symbol,
    interval: '1h',
    limit: '140'
  })

  const kLineData: kineEvent[] = await fetchJson(`https://api.binance.com/api/v3/klines?${params.toString()}`)
  const klineBars: BarData[] = kLineData.map(([time, open, high, low, close]) => {
    return {
      low: Number(low),
      close: Number(close),
      open: Number(open),
      time: time as UTCTimestamp,
      high: Number(high),
    }
  })

  return klineBars
}

// export function klineWS(symbol: string) {
//   const url = `wss://stream.binance.com:9443/ws/${symbol}@aggTrade`
//   const wsInput = now({
//     method: "SUBSCRIBE",
//     params: [
//       `${symbol}@aggTrade`
//     ],
//     id: 2
//   })
//   const wss = filter((data: any) => {
//     return Boolean(data.p)
//   }, fromWebsocket<WSBTCPriceEvent, any>(url, wsInput))

//   const throttledWss = throttle(1000, wss)
//   const throttleWss = multicast(
//     skipRepeatsWith((prev, next) => prev.p === next.p, throttledWss)  
//   )

//   return throttleWss
// }



// const selectedToken = merge(now(portfolioStorageState.state.selected), selectToken)

// const selectedTokenHistoricKline = switchLatest(
//   map(address => {
//     const tokenMetadata = address

//     if (!tokenMetadata)
//       throw 'unable to identify address from token list'


//     const symbol = tokenMetadata.symbol + 'USDT'
//     const klineData = fromPromise(fetchHistoricKline(symbol, portfolioStorageState.state.interval))

//     const klineWSData = klineWS(symbol.toLowerCase())

//     return map(data => ({ data, klineWSData }), klineData)
//   }, selectedToken)
// )

