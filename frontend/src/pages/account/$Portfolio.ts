import { Behavior, combineArray, combineObject, O } from "@aelea/core"
import { $node, $text, component, IBranch, INode, motion, MOTION_NO_WOBBLE, nodeEvent, style, styleBehavior, StyleCSS } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $card, $column, $icon, $NumberTicker, $Popover, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { at, constant, empty, filter, fromPromise, map, mergeArray, multicast, now, skipRepeatsWith, snapshot, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { AccountHistoricalDataApi, formatReadableUSD, fromJson, groupByMapMany, historicalPnLMetric, IAccountAggregationMap, IAggregatedOpenPositionSummary, IAggregatedPositionSettledSummary, IAggregatedSettledTradeSummary, IAggregatedTradeClosed, IAggregatedTradeLiquidated, IAggregatedTradeSummary, IClaim, intervalInMsMap, parseFixed, strictGet, toAggregatedTradeSettledSummary, TradeableToken, TRADEABLE_TOKEN_ADDRESS_MAP, TradeType, unixTimeTzOffset } from "gambit-middleware"
import { CrosshairMode, LineStyle, MouseEventParams, PriceScaleMode, SeriesMarker, Time } from "lightweight-charts-baseline"
import { IWalletLink } from "wallet-link"
import { fetchHistoricKline } from "../../binance-api"
import { $Table2 } from "../../common/$Table2"
import { $ProfilePreviewClaim } from "../../components/$AccountProfile"
import { $Link } from "../../components/$Link"
import { $Chart } from "../../components/chart/$Chart"
import { $anchor, $tokenLabelFromSummary } from "../../elements/$common"
import { $caretDown } from "../../elements/$icons"
import { $Entry, $LivePnl, $SummaryProfitLoss, $Risk, $RiskLiquidator, filterByIndexToken, priceChange, timeSince } from "../common"



export interface IAccount {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  parentRoute: Route

  accountAggregation: Stream<IAccountAggregationMap>
  walletLink: Stream<IWalletLink | null>

  claimMap: Stream<Map<string, IClaim>>
}


const INTERVAL_TICKS = 140


export const $Portfolio = (config: IAccount) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [timeFrame, timeFrameTether]: Behavior<INode, intervalInMsMap>,
  [selectedTokenChange, selectedTokenChangeTether]: Behavior<IBranch, TradeableToken>,
  [selectOtherTimeframe, selectOtherTimeframeTether]: Behavior<IBranch, intervalInMsMap>,
  [requestAccountAggregationPage, requestAccountAggregationPageTether]: Behavior<number, number>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,

) => {


  const urlFragments = document.location.pathname.split('/')
  const accountAddress = urlFragments[urlFragments.length - 1]

  const nonNullAccount = filter(Boolean, config.accountAggregation)

  const timeFrameStore = config.parentStore('portfolio-chart-interval', intervalInMsMap.DAY7)

  const chartInterval = startWith(timeFrameStore.state, state.replayLatest(timeFrameStore.store(timeFrame, map(x => x))))


  const accountHistoryPnL = multicast(filter(arr => {
    return arr.aggregatedTradeCloseds.length > 0 || arr.aggregatedTradeLiquidateds.length > 0
  }, nonNullAccount))


  const latestInitiatedPosition = map(h => {
    const token = h.aggregatedTradeCloseds[0]?.initialPosition.indexToken || h.aggregatedTradeLiquidateds[0]?.initialPosition.indexToken

    return strictGet(TRADEABLE_TOKEN_ADDRESS_MAP, token)
  }, accountHistoryPnL)

  const selectedToken = mergeArray([
    latestInitiatedPosition,
    selectedTokenChange
  ])

  
  const historicKline = multicast(switchLatest(combineArray((token, interval) => {
    // @ts-ignore
    const klineData = fromPromise(fetchHistoricKline(token.symbol, { interval: timeFrameToInterval[interval], limit: INTERVAL_TICKS }))
    return klineData
  }, selectedToken, chartInterval)))


  const historicalPnl = multicast(
    combineArray((historicalData, interval) => {
      return historicalPnLMetric([...historicalData.aggregatedTradeCloseds, ...historicalData.aggregatedTradeLiquidateds], interval, INTERVAL_TICKS)
    }, accountHistoryPnL, chartInterval)
  )


  const timeFrameToInterval = {
    [intervalInMsMap.HR4]: intervalInMsMap.SEC60,
    [intervalInMsMap.HR8]: intervalInMsMap.SEC60,
    [intervalInMsMap.HR24]: intervalInMsMap.MIN15,
    [intervalInMsMap.DAY7]: intervalInMsMap.MIN60,
    [intervalInMsMap.MONTH]: intervalInMsMap.HR4,
    [intervalInMsMap.MONTH2]: intervalInMsMap.HR24,
  }



  
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
    ? $row(style({ flexDirection: 'row-reverse', gap: '70px' }))
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

        $row(style({ marginBottom: '-40px', marginLeft: '20px', zIndex: 50 }))(
          $ProfilePreviewClaim({ address: accountAddress, claimMap: config.claimMap, avatarSize: '100px', labelSize: '1.2em', walletLink: config.walletLink })({
            walletChange: walletChangeTether()
          }),
        ),

        $row(style({ boxShadow: `rgb(0 0 0 / 15%) 0px 2px 11px 0px, rgb(0 0 0 / 11%) 0px 5px 45px 16px`, borderRadius: '6px', backgroundColor: pallete.background }))(

          // margin-top: -112 px ; background-image: ; z-index: 111;
          $row(layoutSheet.spacingBig, style({ width: '100%', alignItems: 'center', placeContent: 'space-evenly' }))(
            $row(style({ position: 'relative', width: '100%', zIndex: 0, height: '126px', overflow: 'hidden', }))(
              switchLatest(map(data => $Chart({
                initializeSeries: map((api) => {
                  const series = api.addAreaBaselineSeries({
                    topLineColor: pallete.positive,
                    baseValue: {
                      type: 'price',
                      price: 0,
                    },
                    lineWidth: 2,
                    baseLineVisible: false,
                    lastValueVisible: false,
                    priceLineVisible: false,
                  })

                  series.setData(data)
                  api.timeScale().fitContent()

                  const high = data[data.reduce((seed, b, idx) => b.value > data[seed].value ? idx : seed, Math.min(6, data.length - 1))]
                  const low = data[data.reduce((seed, b, idx) => b.value <= data[seed].value ? idx : seed, 0)]

                  if (high.value > 0 && low.value < 0) {
                    series.createPriceLine({
                      price: 0,
                      color: pallete.foreground,
                      lineWidth: 1,
                      axisLabelVisible: true,
                      title: '',
                      lineStyle: LineStyle.SparseDotted,
                    })
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
                crosshairMove: pnlCrosshairMoveTether(
                  skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
                )
              }), historicalPnl)),

              $row(style({ position: 'absolute', top: '6px', placeContent: 'center', right: '6px', left: '6px' }))(
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


        $row(layoutSheet.spacing, style({ fontSize: '0.85em', placeContent: 'center' }))(
          $text(style({ color: pallete.foreground }))('Time Frame:'),


          // $alert($text('Binance')),
          $anchor(
            styleBehavior(map(tf => intervalInMsMap.HR24 === tf ? activeTimeframe : null, chartInterval)),
            timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.HR24))
          )($text('25Hours')),
          $anchor(
            styleBehavior(map(tf => intervalInMsMap.DAY7 === tf ? activeTimeframe : null, chartInterval)),
            timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.DAY7))
          )($text('7Days')),
          $anchor(
            styleBehavior(map(tf => intervalInMsMap.MONTH === tf ? activeTimeframe : null, chartInterval)),
            timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.MONTH))
          )($text('1Month')),
          $Popover({
            $$popContent: map(x => {
              return $column(layoutSheet.spacingSmall)(
                $anchor(
                  styleBehavior(map(tf => intervalInMsMap.HR4 === tf ? activeTimeframe : null, chartInterval)),
                  timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.HR4))
                )(
                  $text('4Hours')
                ),
                $anchor(
                  styleBehavior(map(tf => intervalInMsMap.HR8 === tf ? activeTimeframe : null, chartInterval)),
                  timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.HR8))
                )(
                  $text('8Hours')
                ),
                $anchor(
                  styleBehavior(map(tf => intervalInMsMap.MONTH2 === tf ? activeTimeframe : null, chartInterval)),
                  timeFrameTether(nodeEvent('click'), constant(intervalInMsMap.MONTH2))
                )($text('2Months')),
              )
            }, selectOtherTimeframe),
          })(
            $anchor(
              styleBehavior(map(tf => ![intervalInMsMap.HR24, intervalInMsMap.DAY7, intervalInMsMap.MONTH].some(a => a === tf) ? { color: pallete.primary } : null, chartInterval)),
              selectOtherTimeframeTether(nodeEvent('click'), constant(intervalInMsMap.HR4))
            )(
              $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                $text('Other'),
                $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '8px', svgOps: style({ marginTop: '4px' }) })
              )
            )
          )({})
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
                          $content: style({ pointerEvents: 'none' }, $Entry(pos)),
                          url: `/p/account/${pos.trade.initialPosition.indexToken}-${TradeType.OPEN}-${pos.trade.initialPosition.indexedAt}/${pos.trade.id}`,
                          route: config.parentRoute.create({ fragment: '2121212' })
                        })({ click: changeRouteTether() })
                      )
                    },
                    {
                      $head: $text('Risk'),
                      columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, alignItems: 'center', placeContent: 'center', minWidth: '80px' })),
                      $body: map((pos: IAggregatedOpenPositionSummary) => {
                        const positionMarkPrice = map(priceUsd => parseFixed(priceUsd.p, 30), filterByIndexToken(pos.indexToken)(priceChange))
                  
                        return $RiskLiquidator(pos, positionMarkPrice)({})
                      })
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

          }, nonNullAccount)
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
              
              dataSource: map((data: IAccountAggregationMap) => {
                const settledList = [...data.aggregatedTradeCloseds, ...data.aggregatedTradeLiquidateds]
                  // .filter(trade => trade.initialPosition.indexToken === token.address)
                  .sort((a, b) => b.indexedAt - a.indexedAt)
                  .map(toAggregatedTradeSettledSummary)
                return settledList

              }, nonNullAccount),
              columns: [
                {
                  $head: $text('Settled'),
                  columnOp: O(style({  flex: 1.2 })),

                  $body: map((pos) => {
                    return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
                      $text(timeSince(pos.settledTimestamp)),
                      $text(new Date(pos.settledTimestamp * 1000).toLocaleDateString()),  
                    )
                  })
                },
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ maxWidth: '65px', flexDirection: 'column' }), layoutSheet.spacingTiny),

                  $body: map((pos: IAggregatedPositionSettledSummary) => {
                    const settlement = pos.trade.settledPosition
                    const type = 'markPrice' in settlement ? TradeType.LIQUIDATED : TradeType.CLOSED

                    return $Link({
                      anchorOp: style({ position: 'relative' }),
                      $content: style({ pointerEvents: 'none' }, $Entry(pos)),
                      url: `/p/account/${pos.trade.initialPosition.indexToken}-${type}-${pos.trade.initialPosition.indexedAt}-${settlement.indexedAt}/${pos.trade.id.split('-')[1]}`,
                      route: config.parentRoute.create({ fragment: '2121212' })
                    })({
                      click: changeRouteTether()
                    })
                  })
                },
                {
                  $head: $text('Risk'),
                  columnOp: O(layoutSheet.spacingTiny, style({ placeContent: 'center' })),
                  $body: map((pos: IAggregatedTradeSummary) => {
                    return $Risk(pos)({})
                  })
                },
                {
                  $head: $text('PnL $'),
                  columnOp: style({ flex:1, placeContent: 'flex-end', maxWidth: '110px' }),
                  $body: map((pos: IAggregatedSettledTradeSummary) => $SummaryProfitLoss(pos))
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
          switchLatest(snapshot(({ chartInterval, selectedToken, accountHistoryPnL }, data) => {
            return $Chart({
              initializeSeries: map(api => {

                const endDate = Date.now()
                const startDate = Math.floor(endDate - chartInterval) / 1000
                const series = api.addCandlestickSeries({
                  upColor: pallete.foreground,
                  downColor: 'transparent',
                  borderDownColor: pallete.foreground,
                  borderUpColor: pallete.foreground,
                  wickDownColor: pallete.foreground,
                  wickUpColor: pallete.foreground,
                })

                series.setData(data.map(d => ({ ...d, time: unixTimeTzOffset(d.time) })))


                const priceScale = series.priceScale()

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



                const closedTradeList = accountHistoryPnL.aggregatedTradeCloseds.filter(pos => pos.settledPosition.indexedAt > startDate)
                const liquidatedTradeList = accountHistoryPnL.aggregatedTradeLiquidateds.filter(pos => pos.settledPosition.indexedAt > startDate)

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

                  timescale.setVisibleRange({
                    from: startDate as Time,
                    to: endDate / 1000 as Time
                  })
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
                  timeVisible: chartInterval <= intervalInMsMap.DAY7,
                  secondsVisible: chartInterval <= intervalInMsMap.MIN60,
                  borderVisible: true,
                  borderColor: pallete.horizon,
                  rightOffset: 3,
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
        timeInterval: timeFrameStore.state
      }) as Stream<AccountHistoricalDataApi>,
      changeRoute,
      walletChange
    }
  ]
})



