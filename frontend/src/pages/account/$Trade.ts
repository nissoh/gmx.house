import { $text, component, style, motion, MOTION_NO_WOBBLE } from "@aelea/dom"
import { $column, $icon, $NumberTicker, $row, layoutSheet } from "@aelea/ui-components"
import { IPageChainlinkPricefeed, CHAINLINK_USD_FEED_ADRESS, IChainlinkPrice, fillIntervalGap, parseFixed, formatFixed, calculatePositionDelta, unixTimeTzOffset, formatReadableUSD, IRequestAggregatedTradeQueryparam, TradeType, IAggregatedTradeAll, toAggregatedOpenTradeSummary, IAggregatedOpenPositionSummary, TRADEABLE_TOKEN_ADDRESS_MAP, strictGet } from "gambit-middleware"
import { LineStyle, MouseEventParams, SeriesMarker, Time } from "lightweight-charts"
import { pallete } from "@aelea/ui-components-theme"
import { map, switchLatest, multicast, now, skipRepeatsWith, skipRepeats, filter, startWith, skip } from "@most/core"
import { $AccountLabel, $AccountPhoto, $ProfileLinks } from "../../components/$AccountProfile"
import { screenUtils, state } from "@aelea/ui-components"
import { combineArray } from "@aelea/utils"
import { $Chart } from "../../components/chart/$Chart"
import { Stream } from "@most/types"
import { Behavior } from "@aelea/core"
import { $bear, $bull } from "../../elements/$icons"
import { $leverage, $seperator } from "../../elements/$common"
import { filterByIndexToken, priceChange } from "../common"

interface IWWW {
  delta: bigint;
  deltaPercentage: bigint;
  value: number;
  time: number;
  price: bigint;
}

export interface ITrade {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  aggregatedTrade: Stream<IAggregatedTradeAll>
  chainlinkPricefeed: Stream<IChainlinkPrice[]>
}



export const $Trade = (config: ITrade) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {


  const urlFragments = document.location.pathname.split('/')
  const tradeId = urlFragments[urlFragments.length - 1]

  const tradeTypeUrl = urlFragments[urlFragments.length - 2].split('-')
  const tradeType = tradeTypeUrl[0] as TradeType


  const settledPosition = multicast(config.aggregatedTrade)
  const tradeSummary = multicast(map(toAggregatedOpenTradeSummary, settledPosition))


  
  const parsedPricefeed = map(feed => {
    return feed
      .map(({ unixTimestamp, value }) => ({
        value: parseFixed(String(Number(value) / 1e8), 30),
        time: unixTimestamp,
      }))
      .sort((a, b) => a.time - b.time)
  }, config.chainlinkPricefeed)

  const historicPnL = multicast(combineArray((summary, pricefeed) => {
    const trade = summary.trade

    const startTime = trade.initialPosition.indexedAt
    const endtime = 'settledPosition' in trade ? trade.settledPosition.indexedAt : Math.floor(Date.now() / 1000)

    const deltaTime = endtime - startTime
    const intervalTime = (deltaTime) / 88

    
    type feedValue = {
      value: bigint;
      time: number;
    }
    
    function getVal(priceFeed: feedValue): IWWW {
      const matchedIncreaseIdx = trade.updateList.findIndex((ip, idx) =>
        trade.updateList[trade.updateList.length - idx - 1].indexedAt <= priceFeed.time
      )

      const updateIdx = (trade.updateList.length - 1) + -matchedIncreaseIdx
      const pos = trade.updateList[updateIdx]
      const delta = calculatePositionDelta(priceFeed.value, trade.initialPosition.isLong, pos)
      const value = formatFixed((delta.delta), 30)
      // const val = formatFixed((delta.hasProfit ? delta.delta : -delta.delta) - summary.fee, 30)

      return { value, time: priceFeed.time, price: priceFeed.value, ...delta }
    }
    
    const initialTick: IWWW = {
      ...calculatePositionDelta(pricefeed[0].value, trade.initialPosition.isLong, summary.trade.updateList[0]),
      time: startTime,
      price: pricefeed[0].value,
      value: 0
    }


    const filled = pricefeed
      .reduce(
        fillIntervalGap(
          intervalTime,
          (priceFeed) => {
            return getVal(priceFeed)
          },
          (prev, priceFeed) => {
            return getVal(priceFeed)
          },
          (prev, priceFeed) => {
            return { ...getVal(priceFeed), time: prev.time }
          }
        ),
        [initialTick]
      )
      // .map(t => ({ time: timeTzOffset(t.time), value: t.value }))

    return filled
  }, tradeSummary, parsedPricefeed))


  const hasSeriesFn = (cross: MouseEventParams): boolean => {
    const mode = !!cross?.seriesPrices?.size
    return mode
  }
  const pnlCrosshairMoveMode = skipRepeats(map(hasSeriesFn, pnlCrosshairMove))
  const pnlCrossHairChange = filter(hasSeriesFn, pnlCrosshairMove)

  const chartPnLCounter = multicast(switchLatest(combineArray((mode, summary, historicPnl) => {
    const newLocal = mode
      ? map((cross) => {
        const aaa = historicPnl.find(tick => cross.time === tick.time)!
        // const newLocal_1 = aaa.price
        return aaa
      }, pnlCrossHairChange)
      : 'settledPosition' in summary.trade
        ? map(x => calculatePositionDelta(historicPnl[historicPnl.length - 1].price, summary.isLong, summary), now(null))
        : map((price) => calculatePositionDelta(parseFixed(price.p, 30), summary.isLong, summary), filterByIndexToken(summary)(priceChange))
    
    return newLocal
  }, startWith(false, pnlCrosshairMoveMode), tradeSummary, historicPnL)))



  const $container = screenUtils.isDesktopScreen
    ? $row(style({ flexDirection: 'row-reverse', gap: '6vw' }))
    : $column

    
  
  const $label = (label: string, value: string) =>$column(
    $text(style({ color: pallete.foreground }))(label),
    $text(style({ fontSize: '1.25em' }))(value)
  )

  // const $labelNumber = (label: string, value: bigint) => $label(label, value)
  const $labelUSD = (label: string, value: bigint) => $label(label, '$' + formatReadableUSD(value))
  
  return [
    $container(

      $column(layoutSheet.spacingBig, style({ flex: 1 }))(
        $column(style({ position: 'relative', maxWidth: '720px', width: '100%', zIndex: 0, height: '326px', overflow: 'hidden', alignSelf: 'center', boxShadow: `rgb(0 0 0 / 15%) 0px 2px 11px 0px, rgb(0 0 0 / 11%) 0px 5px 45px 16px`, borderRadius: '6px', backgroundColor: pallete.background, }))(

          $column(
            switchLatest(
              map((summary: IAggregatedOpenPositionSummary) => {
                const initPos = summary.trade.initialPosition
                return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '25px 35px' }))(
                  $row(style({ alignItems: 'center', placeContent: 'space-evenly' }))(
                    $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                      $row(
                        style({ borderRadius: '2px', padding: '4px', backgroundColor: initPos.isLong ? pallete.positive : pallete.negative, })(
                          $icon({
                            $content: initPos.isLong ? $bull : $bear,
                            width: '38px',
                            fill: pallete.background,
                            viewBox: '0 0 32 32',
                          })
                        )
                      ),
                      $text(initPos.isLong ? 'Long' : 'Short')
                    ),
                  ),

                  $seperator,

                  $leverage(summary),

                  $seperator,

                  $text(
                    strictGet(TRADEABLE_TOKEN_ADDRESS_MAP, initPos.indexToken).symbol
                  ),

                  // $tokenLabelFromSummary(summary.trade),
                  
                  // $seperator,

                  $row(style({ flex: 1 }))(),

                  $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $AccountPhoto(summary.account, null, 44),
                    $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                      $AccountLabel(summary.account, null),
                      $ProfileLinks(summary.account, null),
                    )
                  ),


                )
              }, tradeSummary)
            ),

            $column(style({ alignItems: 'center', textShadow: `1px 9px 42px ${pallete.background}, 0px 1px 110px ${pallete.background}, 1px 9px 42px ${pallete.background}, 0px 1px 110px ${pallete.background}` }))(
              $row(style({ alignItems: 'baseline' }))(
                $NumberTicker({
                  textStyle: {
                    fontSize: '3em',
                    // pointerEvents: 'none',
                    lineHeight: 1,
                    fontWeight: "bold",
                    zIndex: 50,
                    position: 'relative'
              
                  // fontWeight: 'normal',
                  },
                  value$: map(Math.round, skip(1, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, map(ss => formatFixed(ss.deltaPercentage, 2), chartPnLCounter)))),
                  incrementColor: pallete.positive,
                  decrementColor: pallete.negative
                }),
                $text('%'),
              ),
              $row(style({ alignItems: 'baseline' }))(
                $NumberTicker({
                  textStyle: {
                    fontSize: '1em',
                    // pointerEvents: 'none',
                    lineHeight: 1,
                    fontWeight: "bold",
                    zIndex: 50,
                    position: 'relative'
              
                  // fontWeight: 'normal',
                  },
                  value$: map(Math.round, skip(1, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, map(ss => formatFixed(ss.delta, 30), chartPnLCounter)))),
                  incrementColor: pallete.positive,
                  decrementColor: pallete.negative
                }),
                $text(style({ fontSize: '.65em' }))('$'),
              )
            )
          ),

          switchLatest(combineArray((data, tradeSummary) =>
            $Chart({
              initializeSeries: map((api) => {
                const series = api.addAreaSeries({
                  lineStyle: LineStyle.Solid,
                  // autoscaleInfoProvider: () => {
                  //   debugger
                  //   return {
                    
                  //   }
                  // },
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



                if (data.length > 10) {
                
                  if (low.value !== high.value) {
                    setTimeout(() => {
                      const increaseList = tradeSummary.trade.increaseList
                      const increaseMarkers = increaseList
                        .slice(1)
                        .map((ip, idx): SeriesMarker<Time> => {
                          return {
                            color: pallete.foreground,
                            position: "aboveBar",
                            shape: "arrowUp",
                            time: unixTimeTzOffset(ip.indexedAt),
                            text:  '$' + formatReadableUSD(ip.collateralDelta)
                          }
                        })

                      const decreaseMarkers = tradeSummary.trade.decreaseList
                        .slice(0, -1)
                        .map((ip): SeriesMarker<Time> => {
                          return {
                            color: pallete.foreground,
                            position: 'belowBar',
                            shape: "arrowDown",
                            time: unixTimeTzOffset(ip.indexedAt),
                            text:  '$' + formatReadableUSD(ip.collateralDelta)
                          }
                        })

                      series.setMarkers([...increaseMarkers, ...decreaseMarkers])

   

                    }, 50)
                  }
                
                }

                series.applyOptions({
                  scaleMargins: {
                    top: 0.6,
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
                  fixLeftEdge: true,
                  fixRightEdge: true,
                  // visible: false,
                  rightBarStaysOnScroll: true,
                }
              },
              containerOp: style({
                display: 'flex', zIndex: -1,
                position: 'absolute', left: 0, top: 0, right: 0, bottom: 0
              }),
            })({
              crosshairMove: pnlCrosshairMoveTether(
                skipRepeatsWith((a, b) => a.point?.x === b.point?.x),
                multicast
              )
            })
          , historicPnL, tradeSummary)),
        ),


        switchLatest(
          map((summary: IAggregatedOpenPositionSummary) => {
            const initPos = summary.trade.initialPosition
            return $column(layoutSheet.spacing)(
              $label('Entry Date', new Date(summary.startTimestamp * 1000).toUTCString()),

              $labelUSD('Collateral', summary.collateral),
              $labelUSD('Size', summary.size),
              $labelUSD('Average Price', summary.averagePrice),
            )
          }, tradeSummary)
        ),

      ),
    ),

    {
      requestChainlinkPricefeed: map((pos): IPageChainlinkPricefeed => {
        const feedAddress = CHAINLINK_USD_FEED_ADRESS[pos.initialPosition.indexToken]
        return {
          feedAddress,
          from: pos.initialPosition.indexedAt,
          to: 'settledPosition' in pos ? pos.settledPosition.indexedAt : Math.floor(Date.now() / 1000),
          settledTradeId: 'accountAddress',
          orderBy: 'unixTimestamp'
        }
      }, settledPosition),
      requestAggregatedTrade: now({
        id: tradeId,
        tradeType,
      }) as Stream<IRequestAggregatedTradeQueryparam>
    }
  ]
})

