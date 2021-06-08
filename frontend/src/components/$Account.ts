import { $text, Behavior, component, style, styleBehavior, event, StyleCSS } from "@aelea/core"
import { $column, $NumberTicker, $row, layoutSheet } from "@aelea/ui-components"
import { $Line } from "./chart/$Line"
import { SettledPosition } from "../logic/types"
import { accountHistoricalPnLApi } from "../logic/account"
import { BSC_CONTRACTS, TimeTzOffset, formatFixed, TOKEN_ADDRESS_MAP, USD_DECIMALS, readableUSD } from "gambit-middleware"
import { CrosshairMode, LineStyle, MouseEventParams, SeriesMarker, Time, UTCTimestamp } from "lightweight-charts"
import { intervalInMsMap } from "../logic/constant"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { map, now, switchLatest, fromPromise, multicast, mergeArray, scan, snapshot, at, constant, startWith } from "@most/core"
import { fetchHistoricKline, klineWS } from "../binance-api"
import { $AccountProfile } from "./$AccountProfile"
import { $CandleSticks } from "./chart/$CandleSticks"
import { $anchor } from "../elements/$common"
import { state } from "@aelea/ui-components"
import { combineObject } from "@aelea/utils"
import { $Chart } from "./chart/$Chart"


export interface IAccount {
  settledPositions: SettledPosition[]

  parentStore: <T>(key: string, intitialState: T) => state.BrowserStore<T>;

}

type TimelineTime = {
  time: number
}


function fillIntervalGap<T extends TimelineTime, R extends TimelineTime>(
  interval: intervalInMsMap, fillMap: (next: T) => R, fillGapMap: (prev: R) => R
) {
  return (timeline: R[], next: T) => {

    if (timeline.length === 0) {
      timeline.push(fillMap(next))

      return timeline
    }

    const lastIdx = timeline.length - 1
    const prev = timeline[lastIdx]
    const barSpan = (next.time - prev.time) / interval

    if (barSpan > 1) {
      const barSpanCeil = Math.ceil(barSpan)

      for (let index = 1; index < barSpanCeil; index++) {
        timeline.push({ ...fillGapMap(prev), time: prev.time + interval * index })
      }
    }
    
    if (barSpan < 1) {
      timeline.splice(lastIdx, 1, prev)
    } else {
      timeline.push(fillMap(next))
    }

    return timeline
  }
}




export const $Account = (config: IAccount) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [timeFrame, timeFrameTether]: Behavior<any, intervalInMsMap>,
) => {
  const timeFrameStore = config.parentStore('portfolio-chart-interval', intervalInMsMap.HR)

  const timeFrameState = startWith(timeFrameStore.state, state.replayLatest(timeFrameStore.store(timeFrame, map(x => x))))

  const urlFragments = document.location.pathname.split('/')
  const accountAddress = urlFragments[urlFragments.length - 1]



  const accountHistoryPnL = multicast(accountHistoricalPnLApi({
    account: accountAddress
  }))

  const historicalPnl = multicast(
    switchLatest(
      map(interval => {
        return map((historicalData) => {
          let accumulated = 0

          const increasePosList = historicalData.increasePositions.map(x => ({ value: 0, time: x.createdAt.getTime() }))
          const closedPosList = historicalData.closedPositions.map(x => ({ value: formatFixed(x.realisedPnl, USD_DECIMALS), time: x.createdAt.getTime() }))

          const sortedParsed = [
            ...increasePosList,
            ...closedPosList
          ]
            .sort((a, b) => a.time - b.time)
            .map(x => {
              accumulated += x.value
              return { value: accumulated, time: x.time }
            })
            

          sortedParsed.push({ value: sortedParsed[sortedParsed.length - 1].value, time: Date.now() as UTCTimestamp })

          const filled = sortedParsed
            .reduce(
              fillIntervalGap(
                interval,
                (tick) => {
                  return { time: tick.time, value: tick.value }
                },
                (prev) => {
                  return { time: prev.time, value: prev.value }
                },
                // tick => ({ time: tick.time, value: tick.value })
                // tick => {
                //   debugger
                //   return { time: tick.time, value: accumulated + tick.value }
                // }

              ),
              [] as { time: number; value: number} []
            )
            .map(t => ({ time: TimeTzOffset(t.time), value: t.value }))
          
          // console.log(filled)

          return filled
        }, accountHistoryPnL)
      }, timeFrameState)
    )
  )


  const selectedToken = now(TOKEN_ADDRESS_MAP.get(BSC_CONTRACTS.ETH)!)

  const combinedState = multicast(combineObject({
    selectedToken,
    timeFrameState,
    accountHistoryPnL
  }))

  const selectedTokenHistoricKline = multicast(switchLatest(map(state => {
    const symbol = state.selectedToken.symbol + 'USDT'
    const klineData = fromPromise(fetchHistoricKline(symbol, state.timeFrameState))
    const klineWSData = klineWS(symbol.toLowerCase())

    return map(data => ({ data, klineWSData, ...state }), klineData)
  }, combinedState)))

  

  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }

  return [
    $column(style({ gap: '40px' }))(


      $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
        // $AccountPhoto({ address: accountAddress, claim: null }, 64),
        $AccountProfile({ address: accountAddress, claim: null, tempFix: true })({}),


        $row(layoutSheet.flex)(),

        $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
          $text(style({ color: pallete.foreground }))('Chart Interval:'),
          $anchor(
            styleBehavior(map(tf => intervalInMsMap.MIN15 === tf ? activeTimeframe : null, timeFrameState)),
            timeFrameTether(event('click'), constant(intervalInMsMap.MIN15))
          )(
            $text('15 Minutes')
          ),
          $anchor(
            styleBehavior(map(tf => intervalInMsMap.HR === tf ? activeTimeframe : null, timeFrameState)),
            timeFrameTether(event('click'), constant(intervalInMsMap.HR))
          )(
            $text('1 Hour')
          ),
          $anchor(
            styleBehavior(map(tf => intervalInMsMap.DAY === tf ? activeTimeframe : null, timeFrameState)),
            timeFrameTether(event('click'), constant(intervalInMsMap.DAY))
          )(
            $text('Day')
          )
        ),

        // $row(layoutSheet.spacingSmall)(
        //   $AccountLabel({ address: accountAddress, claim: null }),
        //   $anchor(attr({ href: getAccountUrl(CHAIN.BSC, accountAddress) }))(
        //     $icon({ $content: $external, width: '12px', viewBox: '0 0 24 24' })
        //   ),
        //   // $text(style({ color: pallete.horizon }))('|'),
        //   // $anchor(style({ fontSize: '.7em' }), clickPopoverClaimTether(event('click')))(
        //   //   $text('Claim')
        //   // ), 
        // ),
      ),

      // $AccountProfile({ address: accountAddress, claim: null })({}),

      // $labeledDivider('Realised PnL'),



      $row(
        layoutSheet.spacingSmall,
        style({
          alignItems: 'center', placeContent: 'center'
        })
      )(
        $row(style({ position: 'relative', width: '466px', height: '140px', overflow: 'hidden', boxShadow: `${pallete.background} 0px 0px 45px 16px`, borderRadius: '6px', backgroundColor: colorAlpha(pallete.background, .85), }))(

          switchLatest(map(data => $Chart({
            historicalData: data,
            initializeSeries: (api) => {
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


              if (data.length > 10) {
                const high = data[data.reduce((seed, b, idx) => data.length - 10 > idx && b.value >= data[seed].value ? idx : seed, 6)]
                const low = data[data.reduce((seed, b, idx) => {
                  return idx < 6 || b.value <= data[seed].value ? idx : seed
                }, 0)]

                setTimeout(() => {
                  if (low === high) {
                    return
                  }
                  series.setMarkers([
                    {
                      color: pallete.foreground,
                      position: "aboveBar",
                      shape: "arrowUp",
                      time: high.time,
                      text:  readableUSD(String(high.value.toLocaleString()))
                    },
                    {
                      color: pallete.foreground,
                      position: "aboveBar",
                      shape: "arrowDown",
                      time: low.time,
                      text: readableUSD(String(low.value.toLocaleString()))
                    }
                  ])
                }, 103)
              }

         

              series.applyOptions({
                scaleMargins: {
                  top: .4,
                  bottom: 0
                }
              })

              const priceSacle = api.priceScale()

              // console.log(priceSacle.options())



              // series.createPriceLine({
              //   price: 57824,
              //   color: '#be1238',
              //   lineWidth: 2,
              //   lineStyle: LineStyle.Solid,
              //   axisLabelVisible: true,
              //   title: 'minimum price',
              // })

              return series
            },
            chartConfig: {
              handleScale: {
                mouseWheel: false,
                axisPressedMouseMove: false,
              },
              timeScale: {
                // rightOffset: 110,
                secondsVisible: false,
                timeVisible: true,
                visible: false,
                rightBarStaysOnScroll: true,
              }
            },
            containerOp: style({
              position: 'absolute', left: 0, top: 0, right: 0, bottom: 0
            }),
            // dataSource: now(null)

          })({
            crosshairMove: pnlCrosshairMoveTether()
          }), historicalPnl)),

          $row(style({ position: 'absolute', top: '6px', placeContent: 'center', right: '6px', left: '6px', textShadow: `1px 9px 42px ${pallete.background}, 0px 1px 110px ${pallete.background}, 1px 9px 42px ${pallete.background}, 0px 1px 110px ${pallete.background}` }))(
            $row(style({ alignItems: 'baseline' }))(
              $NumberTicker({
                textStyle: {
                  fontSize: '2.3em',
                  // pointerEvents: 'none',
                  lineHeight: 1,
                  zIndex: 50,
                  position: 'relative'
              
                  // fontWeight: 'normal',
                },
                value$: snapshot(
                  (acc, cross) => {
                    return Number.isFinite(cross) ? cross : acc
                  },
                  map(x => Math.floor(x[x.length - 1].value), historicalPnl),
                  mergeArray([
                    map(s => {
                      const barPrice = [...s.seriesPrices.values()][0]
                      const serires = barPrice
                      return Math.floor(Number(serires))
                    }, pnlCrosshairMove),
                    at(600, null)
                  ])
                ),
                incrementColor: pallete.positive,
                decrementColor: pallete.negative
              }),
              $text(style({ color: pallete.foreground }))('$'),
            )
          )
        ),
      ),



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

      switchLatest(map(data => {
        return $Chart({
          historicalData: data.data,
          initializeSeries: api => {
            const series = api.addCandlestickSeries({
              upColor: 'transparent',
              downColor: pallete.foreground,
              borderDownColor: pallete.foreground,
              borderUpColor: pallete.foreground,
              wickDownColor: pallete.foreground,
              wickUpColor: pallete.foreground,
            })


            setTimeout(() => {
              const markers = data.accountHistoryPnL.increasePositions.map((pos): SeriesMarker<Time> => {

                return {
                  color: pos.isLong ? pallete.positive : pallete.negative,
                  position: "aboveBar",
                  shape: pos.isLong ? 'arrowUp' : 'arrowDown',
                  time: TimeTzOffset(pos.createdAt.getTime()),
                  // text:  readableUSD(String(pos.value.toLocaleString()))
                }
              })
              series.setMarkers(markers)
            }, 103)

            return series
          },
          containerOp: style({
            height: '300px'
          }),
          // markers: map(g => {
          //   const last = g.closedPositions.map(p => {
          //     console.log(p.createdAt)
          //     return { time: epochToLocalUTC(p.createdAt.getTime()), position: 'aboveBar', color: 'red', shape: 'circle' }
          //   })
          //   return last
          // }, accountHistoryPnL),
          chartConfig: {
            timeScale: {
              timeVisible: data.timeFrameState <= intervalInMsMap.HR,
              secondsVisible: data.timeFrameState < intervalInMsMap.HR,
              borderVisible: true,
              borderColor: pallete.foreground,
            },
            crosshair: {
              mode: CrosshairMode.Normal,
              horzLine: {
                color: pallete.foreground,
                width: 1,
                style: LineStyle.Dotted
              },
              vertLine: {
                color: pallete.foreground,
                width: 1,
                style: LineStyle.Dotted,
              }
            }
          },
        })({
        // crosshairMove: sampleChartCrosshair(),
        // click: sampleClick()
        })
      }, selectedTokenHistoricKline)),

      

    ),

    {  }
  ]
})