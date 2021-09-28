import { $text, component, style, motion, MOTION_NO_WOBBLE, INode } from "@aelea/dom"
import { $column, $NumberTicker, $row, layoutSheet } from "@aelea/ui-components"
import { IClaim, intervalInMsMap, AccountHistoricalDataApi, IAggregatedTradeSettledAll, IPageChainlinkPricefeed, CHAINLINK_USD_FEED_ADRESS, IIdentifiableEntity, IChainlinkPrice, historicalPnLMetric, fillIntervalGap, timeTzOffset, parseFixed, formatReadableUSD, formatFixed, readableNumber, calculatePositionDelta } from "gambit-middleware"
import { LineStyle, MouseEventParams } from "lightweight-charts"
import { pallete } from "@aelea/ui-components-theme"
import { map, switchLatest, fromPromise, multicast, mergeArray, at, startWith, now, never } from "@most/core"
import { fetchHistoricKline } from "../../binance-api"
import { $AccountLabel, $AccountPhoto, $ProfileLinks } from "../../components/$AccountProfile"
import { screenUtils, state } from "@aelea/ui-components"
import { combineArray } from "@aelea/utils"
import { $Chart } from "../../components/chart/$Chart"
import { Stream } from "@most/types"
import { Behavior } from "@aelea/core"



export interface ITrade {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  settledPosition: Stream<IAggregatedTradeSettledAll>
  chainlinkPricefeed: Stream<IChainlinkPrice[]>
}


const INTERVAL_TICKS = 140


export const $Trade = (config: ITrade) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {


  const urlFragments = document.location.pathname.split('/')
  const tradeId = urlFragments[urlFragments.length - 1]
  const settledPosition = multicast(config.settledPosition)

  
  const historicKline = multicast(combineArray((trade, pricefeed) => {
    // const klineData = fromPromise(fetchHistoricKline(trade.symbol, { interval, limit: INTERVAL_TICKS }))
    // const klineWSData = klineWS(symbol.toLowerCase())

    const initialDataStartTime = trade.indexedAt
    const endtime = trade.initialPositionBlockTimestamp

    const deltaTime = (trade.initialPositionBlockTimestamp - trade.indexedAt) / 50


    const newLocal = pricefeed
      .map(({ unixTimestamp, value }) => ({
        date: new Date(unixTimestamp * 1000),
        value: value,
        time: unixTimestamp * 1000,
      }))
      .sort((a, b) => b.time - a.time)
      .filter(x => x.time >= initialDataStartTime && x.time <= endtime)
    
    
    
    // debugger
    const filled = newLocal
      
      .reduce(
        fillIntervalGap(
          deltaTime,
          (next) => {
            const markPrice = parseFixed(next.value, 8)

            trade.increaseList.findIndex(ip => ip.collateralDelta)

            // calculatePositionDelta(pos.size, pos.collateral, pos.isLong, pos.averagePrice, markPrice)
    

            return { time: next.time, value: next.value } as any
          },
          (prev) => {
            return prev
          },
          (prev, next) => {
            return { ...prev, time: prev.time, value: next.value }
          }
        ),
        [{ time: initialDataStartTime, value: '' }] as { time: number; value: string} []
      )
      // .map(t => ({ time: timeTzOffset(t.time), value: t.value }))

    return filled
  }, settledPosition, config.chainlinkPricefeed))




  const timeframePnLCounter: Stream<number> = combineArray(
    (cross) => {
      return cross
    },
    // map(x => {
    //   const newLocal = Math.floor(x[x.length - 1].value)
    //   return newLocal
    // }, historicalPnl),
    mergeArray([
      map(s => {
        const barPrice = [...s.seriesPrices.values()][0]
        const serires = barPrice
        return Math.floor(Number(serires))
      }, pnlCrosshairMove),
      at(600, null)
    ])
  )

  const $container = screenUtils.isDesktopScreen
    ? $row(style({ flexDirection: 'row-reverse', gap: '6vw' }))
    : $column

    
  
  return [
    $container(

      $column(layoutSheet.spacingBig, style({ flex: 1 }))(

        $text('ff'),

        $row(layoutSheet.spacingBig, style({ alignItems: 'center', placeContent: 'space-evenly' }))(
          $row(layoutSheet.spacingBig, style({ alignItems: 'center', placeContent: 'space-evenly' }))(
            switchLatest(
              map((claimList: IClaim[]) => {
                const claim = claimList?.find(c => c.address === tradeId) || null

                return $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                  $AccountPhoto(tradeId, claim, 72),
                  $column(layoutSheet.spacingTiny)(
                    $AccountLabel(tradeId, claim),
                    $ProfileLinks(tradeId, claim),
                  )
                )
              }, now(null) as any)
            ),
          ),

          $row(style({ position: 'relative', width: '100%', zIndex: 0, height: '126px', maxWidth: '380px', overflow: 'hidden', boxShadow: `rgb(0 0 0 / 15%) 0px 2px 11px 0px, rgb(0 0 0 / 11%) 0px 5px 45px 16px`, borderRadius: '6px', backgroundColor: pallete.background, }))(
            switchLatest(map(data => $Chart({
              initializeSeries: map((api) => {
                const series = api.addAreaSeries({
                  lineStyle: LineStyle.Solid,
                  lineWidth: 2,
                  baseLineVisible: false,
                  lastValueVisible: false,
                  priceLineVisible: false,
                  // crosshairMarkerVisible: false,
                  lineColor: pallete.primary,
                  topColor: pallete.background,
                  bottomColor: 'transparent',
                })

                // @ts-ignore
                series.setData(data)

                // const fst = data[0]
                // const lst = data[data.length - 1]

                // api.timeScale().setVisibleRange({ from: fst.time, to: lst.time })
                api.timeScale().fitContent()

                if (data.length > 10) {
                  // const high = data[data.reduce((seed, b, idx) => b.value > data[seed].value ? idx : seed, 6)]
                  // const low = data[data.reduce((seed, b, idx) => b.value <= data[seed].value ? idx : seed, 0)]
                
                  // if (low.value !== high.value) {
                  //   setTimeout(() => {
                  //     series.setMarkers([
                  //       {
                  //         color: pallete.foreground,
                  //         position: "aboveBar",
                  //         shape: "arrowUp",
                  //         time: high.time,
                  //         text:  readableUSD(String(high.value.toLocaleString()))
                  //       },
                  //       {
                  //         color: pallete.foreground,
                  //         position: "aboveBar",
                  //         shape: "arrowDown",
                  //         time: low.time,
                  //         text: readableUSD(String(low.value.toLocaleString()))
                  //       }
                  //     ])
                  //   }, 1000)
                  // }
                
                }

                series.applyOptions({
                  scaleMargins: {
                    top: .45,
                    bottom: 0
                  }
                })

                return series
              }),
              chartConfig: {
                handleScale: false,
                handleScroll: false,
                timeScale: {
                // rightOffset: 110,
                  secondsVisible: false,
                  timeVisible: true,
                  // visible: false,
                  rightBarStaysOnScroll: true,
                }
              },
              containerOp: style({
                display: 'flex',
              // position: 'absolute', left: 0, top: 0, right: 0, bottom: 0
              }),
            })({
              crosshairMove: pnlCrosshairMoveTether()
            }), historicKline)),

            $row(style({ position: 'absolute', top: '6px', placeContent: 'center', right: '6px', left: '6px', textShadow: `1px 9px 42px ${pallete.background}, 0px 1px 110px ${pallete.background}, 1px 9px 42px ${pallete.background}, 0px 1px 110px ${pallete.background}` }))(
              $row(style({ alignItems: 'baseline' }))(
                $NumberTicker({
                  textStyle: {
                    fontSize: '1.6em',
                    // pointerEvents: 'none',
                    lineHeight: 1,
                    zIndex: 50,
                    position: 'relative'
              
                  // fontWeight: 'normal',
                  },
                  value$: map(Math.floor, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, timeframePnLCounter)),
                  incrementColor: pallete.positive,
                  decrementColor: pallete.negative
                }),
                $text(style({ color: pallete.foreground }))('$'),
              )
            )
          ),
        ),


      ),

    ),

    {
      requestChainlinkPricefeed: now({
        feedAddress: CHAINLINK_USD_FEED_ADRESS.ETH,
        settledTradeId: 'accountAddress',
        orderBy: 'unixTimestamp'
      }) as Stream<IPageChainlinkPricefeed>,
      requestAggregatedSettleTrade: now({
        id: tradeId + '-6'
      }) as Stream<IIdentifiableEntity>
    }
  ]
})



// $labeledDivider('Position Overview'),
// realtimeSource: switchLatest(
//   map(({ data, klineWSData }) => {
//     const intialBarData = data[data.length - 1]
//     return scan((prev, next): BarData => {

//       const prevTimespan = (prev.time as number) + intervalInMsMap.MIN
//       if (prevTimespan > next.T) {
//         // prev.open = Number(next.p)
//         prev.close = Number(next.p)

//         if (Number(next.p) > prev.high) {
//           prev.high = Number(next.p)
//         }
//         if (Number(next.p) < prev.low) {
//           prev.low = Number(next.p)
//         }

//         return prev
//       }

//       return {
//         close: Number(next.p),
//         time: next.T / 1000 as UTCTimestamp,
//         high: Number(next.p),
//         open: Number(next.p),
//         low: Number(next.p),
//       }
//     }, intialBarData, klineWSData)
//   }, selectedTokenHistoricKline)
// ),

