import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $text, component, IBranch, INode, motion, MOTION_NO_WOBBLE, nodeEvent, style, styleBehavior, StyleCSS } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $card, $column, $icon, $NumberTicker, $Popover, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { at, combine, constant, filter, map, mergeArray, multicast, now, periodic, skipRepeatsWith, snapshot, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import {
  formatFixed, formatReadableUSD, groupByMapMany, ITrade, IClaim, intervalInMsMap, intervalListFillOrderMap, TokenDescription,
  unixTimeTzOffset, isTradeSettled, ITradeOpen, isTradeOpen, ITradeSettled, ARBITRUM_TRADEABLE_ADDRESS, isTradeLiquidated,
  isTradeClosed, IAccountTradeListParamApi, unixTimestampNow, IPricefeed, IPricefeedParamApi, IPriceLatestMap, getTokenDescription, TOKEN_ADDRESS_TO_SYMBOL, getMappedKeyByValue, AVALANCHE_TRADEABLE_ADDRESS, getChainName, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, readableNumber
} from "@gambitdao/gmx-middleware"
import { CrosshairMode, LineStyle, MouseEventParams, PriceScaleMode, SeriesMarker, Time } from "lightweight-charts"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $Table2 } from "../../common/$Table2"
import { $ProfilePreviewClaim } from "../../components/$AccountProfile"
import { $Link } from "../../components/$Link"
import { $Chart } from "../../components/$Chart"
import { $anchor, $tokenLabelFromSummary } from "../../elements/$common"
import { $caretDown } from "../../elements/$icons"
import { $Entry, $livePnl, $ProfitLossText, $riskLabel, $riskLiquidator, getPricefeedVisibleColumns, timeSince } from "../common"
import { CHAIN_LABEL_ID } from "../../types"



export interface IAccount {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  parentRoute: Route

  accountTradeList: Stream<ITrade[]>
  walletLink: IWalletLink
  walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
  pricefeed: Stream<IPricefeed[]>
  latestPriceMap: Stream<IPriceLatestMap>

  claimMap: Stream<{ [k: string]: IClaim }>
}


const INTERVAL_TICKS = 140


export const $Portfolio = (config: IAccount) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [timeFrame, timeFrameTether]: Behavior<INode, intervalInMsMap>,
  [selectedTokenChange, selectedTokenChangeTether]: Behavior<IBranch, TokenDescription>,
  [selectOtherTimeframe, selectOtherTimeframeTether]: Behavior<IBranch, intervalInMsMap>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,

) => {

  const urlFragments = document.location.pathname.split('/')
  const [chainLabel] = urlFragments.slice(1) as [keyof typeof CHAIN_LABEL_ID]
  const chain = CHAIN_LABEL_ID[chainLabel]

  const accountAddress = urlFragments[urlFragments.length - 1]

  const timeFrameStore = config.parentStore('portfolio-chart-interval', intervalInMsMap.DAY7)
  const chartInterval = startWith(timeFrameStore.state, replayLatest(timeFrameStore.store(timeFrame, map(x => x))))

  const accountTradeList = multicast(filter(list => list.length > 0, config.accountTradeList))

  const settledTradeList = map(list => list.filter(isTradeSettled), accountTradeList)
  const openTradeList = map(list => list.filter(isTradeOpen), accountTradeList)


  const latestInitiatedPosition = map(h => {
    return getTokenDescription(h[0].indexToken)
  }, accountTradeList)

  const selectedToken = mergeArray([latestInitiatedPosition, selectedTokenChange])

  const latestPrice = (trade: ITrade) => map(priceMap => priceMap[trade.indexToken].value, config.latestPriceMap)



  const historicalPnl = multicast(

    combineArray((tradeList, interval) => {
      const intervalInSecs = Math.floor((interval / INTERVAL_TICKS))
      const initialDataStartTime = unixTimestampNow() - interval
      const sortedParsed = [...tradeList]
        .filter(pos => {
          return pos.settledTimestamp > initialDataStartTime
        })
        .sort((a, b) => a.settledTimestamp - b.settledTimestamp)

      if (sortedParsed.length === 0) {
        return []
      }

      const filled = intervalListFillOrderMap({
        source: sortedParsed,
        seed: { time: initialDataStartTime, value: 0n },
        interval: intervalInSecs,
        getTime: pos => pos.settledTimestamp,
        fillMap: (prev, next) => {
          return { time: next.settledTimestamp, value: prev.value + next.realisedPnl - next.fee }
        },
      })

      return filled
    }, settledTradeList, chartInterval)
  )



  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }

  const timeframePnLCounter: Stream<number> = combineArray(
    (acc, cross) => {
      return Number.isFinite(cross) ? cross : acc
    },
    map(x => {
      return formatFixed(x[x.length - 1].value, 30)
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
        position: 'fixed', top: 0, right: 0, left: 0, bottom: 0, height: '100vh', width: 'calc(50vw)', display: 'flex',
      })
    )
    : $column(chartContainerStyle)


  return [
    $container(
      $column(layoutSheet.spacingBig, style({ flex: 1 }))(

        $column(
          $row(style({ marginBottom: '-20px', marginLeft: '20px' }))(
            $ProfilePreviewClaim({
              address: accountAddress,
              chain,
              claimMap: config.claimMap, walletStore: config.walletStore, walletLink: config.walletLink,
              avatarSize: '100px', labelSize: '1.2em'
            })({
              // walletChange: walletChangeTether()
            }),
          ),

          $row(style({ boxShadow: `rgb(0 0 0 / 15%) 0px 2px 11px 0px, rgb(0 0 0 / 11%) 0px 5px 45px 16px`, borderRadius: '6px', backgroundColor: pallete.background }))(

            // margin-top: -112 px ; background-image: ; z-index: 111;
            $row(layoutSheet.spacingBig, style({ width: '100%', alignItems: 'center', placeContent: 'space-evenly' }))(
              $row(style({ position: 'relative', width: '100%', zIndex: 0, height: '126px', overflow: 'hidden', }))(
                switchLatest(map(data => $Chart({
                  initializeSeries: map(api => {
                    const series = api.addBaselineSeries({
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

                    series.setData(data.map(({ time, value }) => ({ time: time as Time, value: formatFixed(value, 30) })))

                    const high = data[data.reduce((seed, b, idx) => b.value > data[seed].value ? idx : seed, Math.min(6, data.length - 1))]
                    const low = data[data.reduce((seed, b, idx) => b.value <= data[seed].value ? idx : seed, 0)]

                    if (high.value > 0 && low.value < 0) {
                      series.createPriceLine({
                        price: 0,
                        color: pallete.foreground,
                        lineVisible: true,
                        lineWidth: 1,
                        axisLabelVisible: true,
                        title: '',
                        lineStyle: LineStyle.SparseDotted,
                      })
                    }

                    // series.applyOptions({
                    //   scaleMargins: {
                    //     top: .45,
                    //     bottom: 0
                    //   }
                    // })

                    setTimeout(() => {
                      api.timeScale().fitContent()
                    }, 50)

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
        ),


        $row(layoutSheet.spacing, style({ fontSize: '0.85em', placeContent: 'center' }))(
          $text(style({ color: pallete.foreground }))('Period:'),


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
            $$popContent: map(() => {
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


        $card(layoutSheet.spacingBig)(
          $Table2<ITradeOpen>({
            bodyContainerOp: layoutSheet.spacing,
            scrollConfig: {
              containerOps: O(layoutSheet.spacingBig)
            },
            dataSource: openTradeList,
            columns: [
              {
                $head: $text('Entry'),
                columnOp: O(style({ maxWidth: '65px', flexDirection: 'column' }), layoutSheet.spacingTiny),
                $body: map((pos) => {
                  return $Link({
                    anchorOp: style({ position: 'relative' }),
                    $content: style({ pointerEvents: 'none' }, $Entry(pos)),
                    url: `/${getChainName(chain).toLowerCase()}/${TOKEN_ADDRESS_TO_SYMBOL[pos.indexToken]}/${pos.id}/${pos.timestamp}`,
                    route: config.parentRoute.create({ fragment: '2121212' })
                  })({ click: changeRouteTether() })
                })
              },
              {
                $head: $text('Size'),
                columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, alignItems: 'center', placeContent: 'center', minWidth: '80px' })),
                $body: map(trade => {
                  const positionMarkPrice = latestPrice(trade)

                  return $riskLiquidator(trade, positionMarkPrice)
                })
              },
              {
                $head: $text('PnL $'),
                columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '160px' }),
                $body: map((trade) => {

                  const newLocal = latestPrice(trade)
                  return $livePnl(trade, newLocal)
                })
              },
            ],
          })({})
        ),

        $column(
          switchLatest(
            combineArray((pnlData, activeToken) => {
              const tokens = groupByMapMany(pnlData, trade => trade.indexToken)

              const $tokenChooser = Object.values(tokens).map(tradeList => {
                const tokenDesc = getTokenDescription(tradeList[0].indexToken)

                const selectedTokenBehavior = O(
                  style({ backgroundColor: pallete.background, padding: '12px', border: `1px solid ${tokenDesc === activeToken ? pallete.primary : 'transparent'}` }),
                  selectedTokenChangeTether(
                    nodeEvent('click'),
                    constant(tokenDesc)
                  )
                )

                return selectedTokenBehavior(
                  $tokenLabelFromSummary(tokenDesc, $text(String(tradeList.length)))
                )
              })


              return $row(style({ maxWidth: '412px' }))(
                ...$tokenChooser
              )
            }, accountTradeList, selectedToken)
          ),

          $card(layoutSheet.spacingBig, style({ padding: '16px 8px' }))(
            $Table2<ITradeSettled>({
              bodyContainerOp: layoutSheet.spacing,
              scrollConfig: {
                containerOps: O(layoutSheet.spacingBig)
              },

              dataSource: map((data) => {
                const settledList = data.sort((a, b) => b.settledTimestamp - a.settledTimestamp)
                return settledList
              }, settledTradeList),
              columns: [
                {
                  $head: $text('Settled'),
                  columnOp: O(style({ flex: 1.2 })),
                  $body: map(pos => {
                    return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
                      $text(timeSince(pos.settledTimestamp)),
                      $text(new Date(pos.settledTimestamp * 1000).toLocaleDateString()),
                    )
                  })
                },
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ maxWidth: '65px', flexDirection: 'column' }), layoutSheet.spacingTiny),
                  $body: map(trade => {
                    return $Link({
                      anchorOp: style({ position: 'relative' }),
                      $content: style({ pointerEvents: 'none' }, $Entry(trade)),
                      url: `/${getChainName(chain).toLowerCase()}/${TOKEN_ADDRESS_TO_SYMBOL[trade.indexToken]}/${trade.id}/${trade.timestamp}/${trade.settledTimestamp}`,
                      route: config.parentRoute.create({ fragment: '2121212' })
                    })({
                      click: changeRouteTether()
                    })
                  })
                },
                {
                  $head: $text('Size'),
                  columnOp: O(layoutSheet.spacingTiny, style({ placeContent: 'center' })),
                  $body: map((pos: ITrade) => {
                    return $riskLabel(pos)
                  })
                },
                {
                  $head: $text('PnL $'),
                  columnOp: style({ flex: 1, placeContent: 'flex-end', maxWidth: '110px' }),
                  $body: map(pos => $ProfitLossText(pos.realisedPnl - pos.fee))
                }
              ],
            })({
            })
          ),
        )
      ),
      $column(style({ position: 'relative', flex: 1 }))(
        $chartContainer(
          switchLatest(snapshot(({ chartInterval, selectedToken, settledTradeList }, data) => {
            return $Chart({
              initializeSeries: map(api => {

                const endDate = unixTimestampNow()
                const startDate = endDate - chartInterval
                const series = api.addCandlestickSeries({
                  upColor: pallete.foreground,
                  downColor: 'transparent',
                  borderDownColor: pallete.foreground,
                  borderUpColor: pallete.foreground,
                  wickDownColor: pallete.foreground,
                  wickUpColor: pallete.foreground,
                })

                const chartData = data.map(({ o, h, l, c, timestamp }) => {
                  const open = formatFixed(o, 30)
                  const high = formatFixed(h, 30)
                  const low = formatFixed(l, 30)
                  const close = formatFixed(c, 30)

                  return { open, high, low, close, time: timestamp }
                })



                // @ts-ignore
                series.setData(chartData)

                const priceScale = series.priceScale()

                priceScale.applyOptions({
                  scaleMargins: screenUtils.isDesktopScreen
                    ? {
                      top: 0.3,
                      bottom: 0.3
                    }
                    : {
                      top: 0.1,
                      bottom: 0.1
                    }
                })


                const selectedSymbolList = settledTradeList.filter(trade => selectedToken.symbol === getTokenDescription(trade.indexToken).symbol).filter(pos => pos.settledTimestamp > startDate)
                const closedTradeList = selectedSymbolList.filter(isTradeClosed)
                const liquidatedTradeList = selectedSymbolList.filter(isTradeLiquidated)

                setTimeout(() => {

                  const increasePosMarkers = selectedSymbolList
                    .map((trade): SeriesMarker<Time> => {
                      return {
                        color: trade.isLong ? pallete.positive : pallete.negative,
                        position: "aboveBar",
                        shape: trade.isLong ? 'arrowUp' : 'arrowDown',
                        time: unixTimeTzOffset(trade.timestamp),
                      }
                    })

                  const closePosMarkers = closedTradeList
                    .map((trade): SeriesMarker<Time> => {
                      return {
                        color: pallete.message,
                        position: "belowBar",
                        shape: 'square',
                        text: '$' + formatReadableUSD(trade.realisedPnl),
                        time: unixTimeTzOffset(trade.settledTimestamp),
                      }
                    })

                  const liquidatedPosMarkers = liquidatedTradeList
                    .map((pos): SeriesMarker<Time> => {
                      return {
                        color: pallete.negative,
                        position: "belowBar",
                        shape: 'square',
                        text: '$-' + formatReadableUSD(pos.collateral),
                        time: unixTimeTzOffset(pos.settledTimestamp),
                      }
                    })

                  // console.log(new Date(closePosMarkers[0].time as number * 1000))

                  const markers = [...increasePosMarkers, ...closePosMarkers, ...liquidatedPosMarkers].sort((a, b) => a.time as number - (b.time as number))
                  series.setMarkers(markers)
                  // api.timeScale().fitContent()

                  // timescale.setVisibleRange({
                  //   from: startDate as Time,
                  //   to: endDate as Time
                  // })
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
                  mode: PriceScaleMode.Logarithmic,
                  scaleMargins: {
                    top: 0.1,
                    bottom: 0.1
                  }
                  // visible: false
                },
                timeScale: {
                  timeVisible: chartInterval <= intervalInMsMap.DAY7,
                  secondsVisible: chartInterval <= intervalInMsMap.MIN60,
                  borderVisible: true,
                  borderColor: pallete.horizon,
                  rightOffset: 15,
                  shiftVisibleRangeOnNewBar: true
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
          }, combineObject({ chartInterval, selectedToken, settledTradeList }), config.pricefeed))
        ),
      )
    ),

    {
      pricefeed: combine((token, selectedInterval): IPricefeedParamApi => {

        // @ts-ignore
        const tokenAddress = getMappedKeyByValue(CHAIN_TOKEN_ADDRESS_TO_SYMBOL[chain], token.symbol) as ARBITRUM_TRADEABLE_ADDRESS | AVALANCHE_TRADEABLE_ADDRESS

        const to = unixTimestampNow()
        const from = to - selectedInterval

        const interval = getPricefeedVisibleColumns(160, from, to)

        return { chain, interval, tokenAddress, from, to }
      }, selectedToken, chartInterval),
      requestAccountTradeList: now({
        account: accountAddress,
        timeInterval: timeFrameStore.state,
        chain,
      }) as Stream<IAccountTradeListParamApi>,
      requestLatestPriceMap: constant({ chain }, periodic(5000)),
      changeRoute,
      walletChange
    }
  ]
})



