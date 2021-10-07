import { $text, component, style, styleBehavior, StyleCSS, $node, motion, nodeEvent, MOTION_NO_WOBBLE, INode, IBranch } from "@aelea/dom"
import { $card, $column, $icon, $NumberTicker, $Popover, $row, layoutSheet } from "@aelea/ui-components"
import { unixTimeTzOffset, groupByMapMany, intervalInMsMap, AccountHistoricalDataApi, formatReadableUSD, historicalPnLMetric, IAccountAggregationMap, toAggregatedTradeSettledSummary, IAggregatedPositionSettledSummary, IAggregatedTradeClosed, IAggregatedTradeLiquidated, strictGet, TRADEABLE_TOKEN_ADDRESS_MAP, TradeableToken, IAggregatedOpenPositionSummary, IAggregatedSettledTradeSummary, TradeType, IAggregatedTradeOpen, toAggregatedOpenTradeSummary, fromJson } from "gambit-middleware"
import { CrosshairMode, LineStyle, MouseEventParams, PriceScaleMode, SeriesMarker, Time } from "lightweight-charts-baseline"
import { pallete } from "@aelea/ui-components-theme"
import { map, switchLatest, fromPromise, multicast, mergeArray, snapshot, at, constant, startWith, now, filter, skipRepeatsWith, empty } from "@most/core"
import { fetchHistoricKline } from "../../binance-api"
import { $AccountPreview } from "../../components/$AccountProfile"
import { $anchor, $seperator, $tokenLabelFromSummary } from "../../elements/$common"
import { screenUtils, state } from "@aelea/ui-components"
import { combineArray, combineObject, O } from "@aelea/utils"
import { $Chart } from "../../components/chart/$Chart"
import { Stream } from "@most/types"
import { $caretDown } from "../../elements/$icons"
import { Behavior } from "@aelea/core"
import { $Table2 } from "../../common/$Table2"
import { $Entry, $LivePnl, $ProfitLoss, $RiskLiquidator, timeSince } from "../common"
import { $Link } from "../../components/$Link"
import { Route } from "@aelea/router"




export interface IAccount {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  parentRoute: Route

  accountAggregation: Stream<IAccountAggregationMap>
}


const INTERVAL_TICKS = 140


export const $Portfolio = (config: IAccount) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [timeFrame, timeFrameTether]: Behavior<INode, intervalInMsMap>,
  [selectedTokenChange, selectedTokenChangeTether]: Behavior<IBranch, TradeableToken>,
  [selectOtherTimeframe, selectOtherTimeframeTether]: Behavior<IBranch, intervalInMsMap>,
  [requestAccountAggregationPage, requestAccountAggregationPageTether]: Behavior<number, number>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
) => {


  const urlFragments = document.location.pathname.split('/')
  const accountAddress = urlFragments[urlFragments.length - 1]


  const timeFrameStore = config.parentStore('portfolio-chart-interval', intervalInMsMap.HR)

  const chartInterval = startWith(timeFrameStore.state, state.replayLatest(timeFrameStore.store(timeFrame, map(x => x))))


  const accountHistoryPnL = multicast(filter(arr => {
    return arr.aggregatedTradeCloseds.length > 0 || arr.aggregatedTradeLiquidateds.length > 0
  }, config.accountAggregation))


  const latestInitiatedPosition = map(h => {
    const token = h.aggregatedTradeCloseds[0]?.initialPosition.indexToken || h.aggregatedTradeLiquidateds[0]?.initialPosition.indexToken

    return strictGet(TRADEABLE_TOKEN_ADDRESS_MAP, token)
  }, accountHistoryPnL)

  const selectedToken = mergeArray([
    latestInitiatedPosition,
    selectedTokenChange
  ])

  
  const historicKline = multicast(switchLatest(combineArray((token, interval) => {
    const klineData = fromPromise(fetchHistoricKline(token.symbol, { interval, limit: INTERVAL_TICKS }))
    // const klineWSData = klineWS(symbol.toLowerCase())

    return klineData
  }, selectedToken, chartInterval)))


  const historicalPnl = multicast(
    combineArray((historicalData, interval) => {
      return historicalPnLMetric([...historicalData.aggregatedTradeCloseds, ...historicalData.aggregatedTradeLiquidateds], interval, INTERVAL_TICKS)
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
            $AccountPreview({ address: accountAddress, size: '60px' })({}),
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
                api.timeScale().fitContent()

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
              crosshairMove: pnlCrosshairMoveTether(
                skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
              )
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


        switchLatest(
          map(res => {

            return res.aggregatedTradeOpens.length
              ? $card(layoutSheet.spacingBig)(
                $Table2<IAggregatedOpenPositionSummary>({
                  bodyContainerOp: layoutSheet.spacing,
                  scrollConfig: {
                    containerOps: O(layoutSheet.spacingBig)
                  },
                  dataSource: now(res.aggregatedTradeOpens.map(O(fromJson.toAggregatedOpenTradeSummary))),
                  // headerCellOp: style({ fontSize: '.65em' }),
                  // bodyRowOp: O(layoutSheet.spacing),
                  columns: [
                    {
                      $head: $text('Entry'),
                      columnOp: O(style({ maxWidth: '65px', flexDirection: 'column' }), layoutSheet.spacingTiny),
                      $body: map((pos) =>
                        $Link({
                          anchorOp: style({ position: 'relative' }),
                          $content: style({ pointerEvents: 'none' }, $Entry(pos)({})),
                          url: `/p/account/${TradeType.OPEN}/${pos.trade.id}`,
                          route: config.parentRoute.create({ fragment: '2121212' })
                        })({ click: changeRouteTether() })
                      )
                    },
                    {
                      $head: $text('Risk'),
                      columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, alignItems: 'center', placeContent: 'center', minWidth: '80px' })),
                      $body: map((pos) => $RiskLiquidator(pos)({}))
                    },
                    {
                      $head: $text('PnL $'),
                      columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '160px' }),
                      $body: map((pos) => $LivePnl(pos)({}))
                    },
                  ],
                })({  })
              )
              : empty()

          }, config.accountAggregation)
        ),

        $column(
          switchLatest(
            combineArray((pnlData, activeToken) => {
              const tokens = groupByMapMany([...pnlData.aggregatedTradeCloseds, ...pnlData.aggregatedTradeLiquidateds], pos => pos.initialPosition.indexToken)

              const $tokenChooser = Object.entries(tokens).map(([contract, positions]) => {

                const fstTrade = positions[0]
                const token = strictGet(TRADEABLE_TOKEN_ADDRESS_MAP, fstTrade.initialPosition.indexToken)

                const selectedTokenBehavior = O(
                  style({ backgroundColor: pallete.background, padding: '12px', border: `1px solid ${activeToken.address === contract ? pallete.primary : 'transparent'}` }),
                  selectedTokenChangeTether(
                    nodeEvent('click'),
                    constant(token)
                  )
                )

                return selectedTokenBehavior(
                  $tokenLabelFromSummary(fstTrade, $text(String(positions.length)))
                  // $tokenLabel(token, $tokenIcon, $text(String(positions.length)))
                )
              })

            

              return $row(
                ...$tokenChooser
              )
            }, accountHistoryPnL, selectedToken)
          ),

          $card(layoutSheet.spacingBig, style({ padding: '16px 8px' }))(
            $Table2<IAggregatedPositionSettledSummary<IAggregatedTradeClosed | IAggregatedTradeLiquidated>>({
              bodyContainerOp: layoutSheet.spacing,
              scrollConfig: {
                containerOps: O(layoutSheet.spacingBig)
              },
              
              dataSource: map((data) => {
                const settledList = [...data.aggregatedTradeCloseds, ...data.aggregatedTradeLiquidateds]
                  // .filter(trade => trade.initialPosition.indexToken === token.address)
                  .sort((a, b) => b.indexedAt - a.indexedAt)
                  .map(toAggregatedTradeSettledSummary)
                return settledList

              }, config.accountAggregation),
              columns: [
                {
                  $head: $text('Settled'),
                  columnOp: O(style({  flex: 1 })),

                  $body: map((pos) => {
                    return $column(style({ fontSize: '.65em' }))(
                      $column(
                        $text(timeSince(pos.settledTimestamp)),
                        $text(new Date(pos.settledTimestamp * 1000).toLocaleDateString()),  
                      ),
                    )
                  })
                },
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ maxWidth: '65px', flexDirection: 'column' }), layoutSheet.spacingTiny),

                  $body: map((pos: IAggregatedOpenPositionSummary) =>
                    $Link({
                      anchorOp: style({ position: 'relative' }),
                      $content: style({ pointerEvents: 'none' }, $Entry(pos)({})),
                      url: `/p/account/${TradeType.CLOSED}/${pos.trade.id.split('-')[1]}`,
                      route: config.parentRoute.create({ fragment: '2121212' })
                    })({
                      click: changeRouteTether()
                    })
                  )
                },
                // accountTableColumn,
                {
                  $head: $text('Risk'),
                  columnOp: O(layoutSheet.spacingTiny, style({ flex: .5, alignItems: 'center', placeContent: 'center', minWidth: '80px' })),
                  $body: map((pos: IAggregatedOpenPositionSummary) => $RiskLiquidator(pos)({}))
                },
                {
                  $head: $text('PnL $'),
                  columnOp: style({ flex:1, placeContent: 'flex-end', maxWidth: '160px' }),
                  $body: map((pos: IAggregatedSettledTradeSummary) => $ProfitLoss(pos)({}))
                }
              ],
            })({
              scrollIndex: requestAccountAggregationPageTether()
            })
          ),
        )



      ),


      $column(style({ position: 'relative', flex: 1 }))(
        $chartContainer(
          switchLatest(snapshot(({ chartInterval, selectedToken, accountHistoryPnL }, historicKline) => {
            return $Chart({
              initializeSeries: map(api => {

                const startDate = (Date.now() - chartInterval * INTERVAL_TICKS) / 1000

                const series = api.addCandlestickSeries({
                  upColor: pallete.foreground,
                  downColor: 'transparent',
                  borderDownColor: pallete.foreground,
                  borderUpColor: pallete.foreground,
                  wickDownColor: pallete.foreground,
                  wickUpColor: pallete.foreground,
                })

                series.setData(historicKline.map(d => ({ ...d, time: unixTimeTzOffset(d.time) })))



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


                const closedTradeList = accountHistoryPnL.aggregatedTradeCloseds.filter(pos => pos.initialPosition.indexedAt > startDate)
                const liquidatedTradeList = accountHistoryPnL.aggregatedTradeLiquidateds.filter(pos => pos.initialPosition.indexedAt > startDate)

                setTimeout(() => {
                  const increasePosMarkers = [...closedTradeList, ...liquidatedTradeList]
                    .filter(pos => selectedToken.address === pos.initialPosition.indexToken)
                    .map((pos): SeriesMarker<Time> => {
                      return {
                        color: pos.initialPosition.isLong ? pallete.positive : pallete.negative,
                        position: "aboveBar",
                        shape: pos.initialPosition.isLong ? 'arrowUp' : 'arrowDown',
                        time: unixTimeTzOffset(pos.initialPositionBlockTimestamp),
                      }
                    })
                  const closePosMarkers = closedTradeList
                    .filter(pos => selectedToken.address === pos.initialPosition.indexToken && pos.settledPosition && !('markPrice' in pos.settledPosition))
                    .map((pos): SeriesMarker<Time> => {

                      return {
                        color: pallete.message,
                        position: "belowBar",
                        shape: 'square',
                        text: '$' + formatReadableUSD(pos.settledPosition!.realisedPnl),
                        time: unixTimeTzOffset(pos.indexedAt),
                      }
                    })
                  const liquidatedPosMarkers = liquidatedTradeList
                    .filter(pos => selectedToken.address === pos.initialPosition.indexToken && pos.settledPosition && 'markPrice' in pos.settledPosition)
                    .map((pos): SeriesMarker<Time> => {
                      return {
                        color: pallete.negative,
                        position: "belowBar",
                        shape: 'square',
                        text: '$-' + formatReadableUSD(pos.settledPosition!.collateral),
                        time: unixTimeTzOffset(pos.indexedAt),
                      }
                    })
                  
                  // console.log(new Date(closePosMarkers[0].time as number * 1000))

                  const markers = [...increasePosMarkers, ...closePosMarkers, ...liquidatedPosMarkers].sort((a, b) => a.time as number - (b.time as number))
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

    {
      requestAccountAggregation: now({
        account: accountAddress,
        timeInterval: timeFrameStore.state * INTERVAL_TICKS
      }) as Stream<AccountHistoricalDataApi>,
      changeRoute

    }
  ]
})



