import { $text, component, style, styleBehavior, StyleCSS, $node, motion, nodeEvent, MOTION_NO_WOBBLE, INode, IBranch } from "@aelea/dom"
import { $column, $icon, $NumberTicker, $Popover, $row, layoutSheet } from "@aelea/ui-components"
import { ARBITRUM_CONTRACTS, timeTzOffset, formatFixed, TOKEN_ADDRESS_MAP, USD_DECIMALS, groupByMapMany, Token, getPositionFee, IClaim, intervalInMsMap, AccountHistoricalDataApi, getPositionMarginFee, formatReadableUSD, IAggregatedTradeClosed, unixTimeTzOffset, IAggregatedAccountSummary, IAggregatedTradeSummary, IQueryAggregatedTradeMap } from "gambit-middleware"
import { CrosshairMode, LineStyle, MouseEventParams, PriceScaleMode, SeriesMarker, Time, UTCTimestamp } from "lightweight-charts"
import { pallete } from "@aelea/ui-components-theme"
import { map, switchLatest, fromPromise, multicast, mergeArray, snapshot, at, constant, startWith, now, filter } from "@most/core"
import { fetchHistoricKline } from "../../binance-api"
import { $AccountLabel, $AccountPhoto, $ProfileLinks } from "../../components/$AccountProfile"
import { $anchor, $seperator, $tokenLabel } from "../../elements/$common"
import { screenUtils, state } from "@aelea/ui-components"
import { combineArray, combineObject, O } from "@aelea/utils"
import { $Chart } from "../../components/chart/$Chart"
import { Stream } from "@most/types"
import { $tokenIconMap } from "../../common/$icons"
import { $caretDown } from "../../elements/$icons"
import { fillIntervalGap } from "../../common/utils"
import { Behavior } from "@aelea/core"
import { toAggregatedTradeClosedJson } from "../../logic/utils"




export interface IAccount {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  claimList: Stream<IClaim[]>

  aggregatedAccountSummary: Stream<IQueryAggregatedTradeMap>
}


const INTERVAL_TICKS = 140


export const $Profile = (config: IAccount) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [timeFrame, timeFrameTether]: Behavior<INode, intervalInMsMap>,
  [selectedTokenChange, selectedTokenChangeTether]: Behavior<IBranch, Token>,
  [selectOtherTimeframe, selectOtherTimeframeTether]: Behavior<IBranch, intervalInMsMap>,
  [aggregatedTradeListQuery, aggregatedTradeListQueryTether]: Behavior<AccountHistoricalDataApi, AccountHistoricalDataApi>,
) => {


  const urlFragments = document.location.pathname.split('/')
  const accountAddress = urlFragments[urlFragments.length - 1]


  const timeFrameStore = config.parentStore('portfolio-chart-interval', intervalInMsMap.HR)

  const chartInterval = startWith(timeFrameStore.state, state.replayLatest(timeFrameStore.store(timeFrame, map(x => x))))


  const accountHistoryPnL = multicast(filter(arr => {
    return arr.aggregatedTradeCloseds.length > 0
  }, config.aggregatedAccountSummary))


  const latestInitiatedPosition = map(h => {
    const token = h.aggregatedTradeCloseds[0].initialPosition.indexToken
    return TOKEN_ADDRESS_MAP.get(token as ARBITRUM_CONTRACTS)!
  }, accountHistoryPnL)
  // const selectedToken = now(TOKEN_ADDRESS_MAP.get(ARBITRUM_CONTRACTS.ETH)!)

  const selectedToken = mergeArray([
    latestInitiatedPosition,
    selectedTokenChange
  ])

  const historicKline = multicast(switchLatest(combineArray((token, interval) => {
    const symbol = token.symbol + 'USDT'
    const klineData = fromPromise(fetchHistoricKline(symbol, { interval, limit: INTERVAL_TICKS }))
    // const klineWSData = klineWS(symbol.toLowerCase())

    return klineData
  }, selectedToken, chartInterval)))


  const historicalPnl = multicast(
    combineArray((historicalData, interval) => {
      let accumulated = 0
      const now = Date.now()

      const initialDataStartTime = now - interval * INTERVAL_TICKS
      const closedPosList = historicalData.aggregatedTradeCloseds
        // .filter(t => t.settledPosition)
        .map(aggTrade => {
          const time = aggTrade.settledBlockTimestamp
          const aggsumm = toAggregatedTradeClosedJson
          
          const value = formatFixed(aggTrade.settledPosition.realisedPnl, USD_DECIMALS)

          return { value, time }
        })

      const sortedParsed = closedPosList
        .filter(pos => pos.time > initialDataStartTime)
        .sort((a, b) => a.time - b.time)
        .map(x => {
          accumulated += x.value
          return { value: accumulated, time: x.time }
        })


      if (sortedParsed.length) {
        sortedParsed.push({ value: sortedParsed[sortedParsed.length - 1].value, time: now as UTCTimestamp })
      }


      const filled = sortedParsed
        .reduce(
          fillIntervalGap(
            interval,
            (next) => {
              return { time: next.time, value: next.value }
            },
            (prev) => {
              return { time: prev.time, value: prev.value }
            },
            (prev, next) => {
              return { time: prev.time, value: next.value }
            }
          ),
          [{ time: initialDataStartTime, value: 0 }] as { time: number; value: number} []
        )
        .map(t => ({ time: timeTzOffset(t.time), value: t.value }))
          

      return filled
    }, accountHistoryPnL, chartInterval)
  )



  
  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }

  const timeframePnLCounter: Stream<number> = combineArray(
    (acc, cross) => {
      return Number.isFinite(cross) ? cross : acc
    },
    map(x => {
      const newLocal = Math.floor(x[x.length - 1].value)
      return newLocal
    }, historicalPnl),
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

  const chartContainerStyle = style({
    backgroundImage: `radial-gradient(at right center, ${pallete.background} 50%, transparent)`,
    background: pallete.background
  })
  const $chartContainer = screenUtils.isDesktopScreen
    ? $node(
      chartContainerStyle, style({
        position: 'fixed', top: 0, right: 0, left: 0, bottom:0, height: '100vh', width: 'calc(50vw)', display: 'flex',
      })
    )
    : $column(chartContainerStyle)
  
  
  return [
    $container(

      

      $column(layoutSheet.spacingBig, style({ flex: 1 }))(

        $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
          $text(style({ color: pallete.foreground }))('Chart Interval:'),
          // $alert($text('Binance')),
          $anchor(
            styleBehavior(map(tf => intervalInMsMap.MIN15 === tf ? activeTimeframe : null, chartInterval)),
            timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.MIN15))
          )(
            $text('15 Min')
          ),
          $anchor(
            styleBehavior(map(tf => intervalInMsMap.HR === tf ? activeTimeframe : null, chartInterval)),
            timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.HR))
          )(
            $text('1 Hour')
          ),
          $anchor(
            styleBehavior(map(tf => intervalInMsMap.HR4 === tf ? activeTimeframe : null, chartInterval)),
            timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.HR4))
          )(
            $text('4 Hour')
          ),
          $seperator,
          $Popover({
            $$popContent: map(x => {
              return $column(layoutSheet.spacingSmall)(
                $anchor(
                  styleBehavior(map(tf => intervalInMsMap.MIN === tf ? activeTimeframe : null, chartInterval)),
                  timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.MIN))
                )(
                  $text('1 Minute')
                ),
                $anchor(
                  styleBehavior(map(tf => intervalInMsMap.MIN5 === tf ? activeTimeframe : null, chartInterval)),
                  timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.MIN5))
                )(
                  $text('5 Minutes')
                ),
                $anchor(
                  styleBehavior(map(tf => intervalInMsMap.HR8 === tf ? activeTimeframe : null, chartInterval)),
                  timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.HR8))
                )(
                  $text('8 Hour')
                ),
                $anchor(
                  styleBehavior(map(tf => intervalInMsMap.DAY === tf ? activeTimeframe : null, chartInterval)),
                  timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.DAY))
                )(
                  $text('24 Hour(Day)')
                ),
                $anchor(
                  styleBehavior(map(tf => intervalInMsMap.WEEK === tf ? activeTimeframe : null, chartInterval)),
                  timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.WEEK))
                )(
                  $text('1 Week')
                ),
              )
            }, selectOtherTimeframe),
            // dismiss: selectOtherTimeframe
          })(
            $anchor(
              styleBehavior(map(tf => ![intervalInMsMap.MIN15, intervalInMsMap.HR, intervalInMsMap.HR4].some(a => a === tf) ? { color: pallete.primary } : null, chartInterval)),
              selectOtherTimeframeTether(nodeEvent('click'), constant(intervalInMsMap.HR4))
            )(
              $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                $text('Other'),
                $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '8px', svgOps: style({ marginTop: '4px' }) })
              )
            )
          )({})
        ),

        

        $row(layoutSheet.spacingBig, style({ alignItems: 'center', placeContent: 'space-evenly' }))(
          $row(layoutSheet.spacingBig, style({ alignItems: 'center', placeContent: 'space-evenly' }))(
            switchLatest(
              map((claimList: IClaim[]) => {
                const claim = claimList?.find(c => c.address === accountAddress) || null

                return $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                  $AccountPhoto(accountAddress, claim, 72),
                  $column(layoutSheet.spacingTiny)(
                    $AccountLabel(accountAddress, claim),
                    $ProfileLinks(accountAddress, claim),
                  )
                )
                // $anchor(attr({ href: getAccountUrl(CHAIN.BSC, accountAddress) }))(
                //   $icon({ $content: $external, width: '12px', viewBox: '0 0 24 24' })
                // ),
                // $text(style({ color: pallete.horizon }))('|'),
                // $anchor(style({ fontSize: '.7em' }), clickPopoverClaimTether(event('click')))(
                //   $text('Claim')
                // ), 


                // return $AccountProfile({ address: accountAddress, claim, tempFix: true })({})
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
            }), historicalPnl)),

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

        $node(),


        // $AccountProfile({ address: accountAddress, claim: null })({}),

        // $labeledDivider('Realised PnL'),

        switchLatest(
          combineArray((pnlData, activeToken) => {
            const tokens = groupByMapMany(pnlData.aggregatedTradeCloseds, pos => pos.initialPosition.indexToken)

            const $tokenChooser = Object.entries(tokens).map(([contract, positions]) => {
              const token = TOKEN_ADDRESS_MAP.get(contract as ARBITRUM_CONTRACTS)!

              const selectedTokenBehavior = O(
                style({ backgroundColor: pallete.background, padding: '12px', border: `1px solid ${activeToken.address === contract ? pallete.primary : 'transparent'}` }),
                selectedTokenChangeTether(
                  nodeEvent('click'),
                  constant(token)
                )
              )

              // @ts-ignore
              const $tokenIcon = $tokenIconMap[contract]

              return selectedTokenBehavior(
                $tokenLabel(token, $tokenIcon, $text(String(positions.length)))
              )
            })

            const $container = screenUtils.isDesktopScreen ? $column : $row(style({ padding: '0 10px' }))

            return $container(layoutSheet.spacing)(
              ...$tokenChooser
            )
          }, accountHistoryPnL, selectedToken)
        ),

      ),


      $column(style({ position: 'relative', flex: 1 }))(
        $chartContainer(
          switchLatest(snapshot(({ chartInterval, selectedToken, accountHistoryPnL }, historicKline) => {
            return $Chart({
              initializeSeries: map(api => {


                // const series2 = api.addAreaSeries({
                //   lineStyle: LineStyle.Solid,
                //   lineWidth: 2,
                //   baseLineVisible: false,
                //   lastValueVisible: false,
                //   priceLineVisible: false,
                //   // priceLineSource

                //   // crosshairMarkerVisible: false,
                //   lineColor: pallete.primary,
                //   topColor: pallete.background,	
                //   bottomColor: 'transparent',
                // })

                // series2.setData(data.historicalPnl)

                const series = api.addCandlestickSeries({
                  upColor: pallete.foreground,
                  downColor: 'transparent',
                  borderDownColor: pallete.foreground,
                  borderUpColor: pallete.foreground,
                  wickDownColor: pallete.foreground,
                  wickUpColor: pallete.foreground,
                })

                series.setData(historicKline.map(d => ({ ...d, time: timeTzOffset(d.time) })))



                const priceScale = api.priceScale()

                priceScale.applyOptions({
                  scaleMargins: screenUtils.isDesktopScreen
                    ? {
                      top:  0.3,
                      bottom: 0.3
                    }
                    : {
                      top:  0.1,
                      bottom: 0.1
                    }
                })

                const timescale = api.timeScale()
                timescale.fitContent()



                setTimeout(() => {
                  const fstTick = historicKline[0]
                  const increasePosMarkers = accountHistoryPnL.aggregatedTradeCloseds
                    .filter(pos => selectedToken.address === pos.initialPosition.indexToken)
                    .map((pos): SeriesMarker<Time> => {
                      return {
                        color: pos.initialPosition.isLong ? pallete.positive : pallete.negative,
                        position: "aboveBar",
                        shape: pos.initialPosition.isLong ? 'arrowUp' : 'arrowDown',
                        time: timeTzOffset(pos.initialPositionBlockTimestamp),
                      }
                    })
                  const closePosMarkers = accountHistoryPnL.aggregatedTradeCloseds
                    .filter(pos => selectedToken.address === pos.initialPosition.indexToken && pos.settledPosition && !('markPrice' in pos.settledPosition))
                    .map((pos): SeriesMarker<Time> => {
                      // const fee = getPositionMarginFee(pos.settledPosition.size)

                      return {
                        color: pallete.message,
                        position: "belowBar",
                        shape: 'square',
                        text: '$' + formatReadableUSD(pos.settledPosition!.realisedPnl),
                        time: timeTzOffset(pos.settledBlockTimestamp),
                      }
                    })
                  const liquidatedPosMarkers = accountHistoryPnL.aggregatedTradeLiquidateds
                    .filter(pos => selectedToken.address === pos.initialPosition.indexToken && pos.settledPosition && 'markPrice' in pos.settledPosition)
                    .map((pos): SeriesMarker<Time> => {
                      return {
                        color: pallete.negative,
                        position: "belowBar",
                        shape: 'square',
                        text: '$-' + formatReadableUSD(pos.settledPosition!.collateral),
                        time: timeTzOffset(pos.settledBlockTimestamp),
                      }
                    })
                  
                  // console.log(new Date(closePosMarkers[0].time as number * 1000))

                  const markers = [...increasePosMarkers, ...closePosMarkers, ...liquidatedPosMarkers].sort((a, b) => b.time as number - (a.time as number))
                  series.setMarkers(markers)
                }, 50)

                return series
              }),
              containerOp: style({
                minHeight: '300px',
                width: '100%',
              }),
              chartConfig: {
                rightPriceScale: {
                  entireTextOnly: true,
                  borderVisible: false,
                  mode: PriceScaleMode.Logarithmic
                  
                // visible: false
                },
                timeScale: {
                  timeVisible: chartInterval < intervalInMsMap.DAY,
                  secondsVisible: chartInterval < intervalInMsMap.HR,
                  borderVisible: true,
                  borderColor: pallete.horizon,
                  barSpacing: 415,
                  rightOffset: 4,
                  
                },
                crosshair: {
                  mode: CrosshairMode.Normal,
                  horzLine: {
                    labelBackgroundColor: pallete.background,
                    color: pallete.foreground,
                    width: 1,
                    style: LineStyle.Dotted
                  },
                  vertLine: {
                    labelBackgroundColor: pallete.background,
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
          }, combineObject({ chartInterval, selectedToken, accountHistoryPnL }), historicKline))
        ),
      )
    ),

    { aggregatedTradeListQuery: now({ account: accountAddress, timeRange: [Date.now() - timeFrameStore.state * INTERVAL_TICKS, Date.now()] }) as Stream<AccountHistoricalDataApi> }
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

