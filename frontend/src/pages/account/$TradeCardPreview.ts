import { combineArray, Behavior, Op, O } from "@aelea/core"
import { $text, style, motion, MOTION_NO_WOBBLE, component, INode, styleBehavior } from "@aelea/dom"
import { $column, $icon, $NumberTicker, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { switchLatest, skip, skipRepeatsWith, multicast, map, filter, now, skipRepeats, startWith, merge, empty, snapshot } from "@most/core"
import { Stream } from "@most/types"
import { strictGet, TRADEABLE_TOKEN_ADDRESS_MAP, formatFixed, unixTimeTzOffset, formatReadableUSD, IChainlinkPrice, IAggregatedTradeAll, parseFixed, calculatePositionDelta, fillIntervalGap, fromJson, IPageChainlinkPricefeed, CHAINLINK_USD_FEED_ADRESS, IPositionDelta, isTradeSettled, liquidationWeight, calculateSettledPositionDelta, IClaim } from "gambit-middleware"
import { ChartOptions, DeepPartial, LineStyle, MouseEventParams, SeriesMarker, Time } from "lightweight-charts-baseline"
import { $AccountPreview, IAccountPreview } from "../../components/$AccountProfile"
import { $Chart } from "../../components/chart/$Chart"
import { $leverage, $seperator } from "../../elements/$common"
import { $bull, $bear } from "../../elements/$icons"
import { filterByIndexToken, priceChange } from "../common"

interface IPricefeedTick extends IPositionDelta {
  value: number;
  time: number;
  price: bigint;
}

export interface ITradeCardPreview {
  chainlinkPricefeed: Stream<IChainlinkPrice[]>,
  aggregatedTrade: Stream<IAggregatedTradeAll>,
  latestPositionDeltaChange?: Stream<IPositionDelta>
  
  containerOp?: Op<INode, INode>,
  chartConfig?: DeepPartial<ChartOptions>,

  animatePnl?: boolean

  claimMap: Stream<Map<string, IClaim>>
  accountPreview?: Partial<IAccountPreview>
}

export const $TradeCardPreview = ({
  chainlinkPricefeed,
  aggregatedTrade,
  containerOp = O(),
  chartConfig = {},
  latestPositionDeltaChange,
  animatePnl = true,
  accountPreview,
  claimMap
}: ITradeCardPreview) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [accountPreviewClick, accountPreviewClickTether]: Behavior<string, string>,
) => {

  const settledPosition = multicast(aggregatedTrade)
  const tradeSummary = multicast(map(fromJson.toAggregatedTradeAllSummary, settledPosition))

  
  const parsedPricefeed = map(feed => {
    return feed
      .map(({ unixTimestamp, value }) => ({
        value: parseFixed(String(Number(value) / 1e8), 30),
        time: unixTimestamp,
      }))
      .sort((a, b) => a.time - b.time)
  }, chainlinkPricefeed)

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
    
    function getVal(priceFeed: feedValue): IPricefeedTick {
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
    
    const initialTick: IPricefeedTick = {
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
  const crosshairWithInitial = startWith(false, pnlCrosshairMoveMode)

  const lastTickFromHistory = (historicPnl: IPricefeedTick[]) => map((cross: MouseEventParams) => {
    return historicPnl.find(tick => cross.time === tick.time)!
  })
  
  const chartPnLCounter = multicast(switchLatest(combineArray((mode, summary, historicPnl): Stream<IPositionDelta> => {
    if (mode) {
      return lastTickFromHistory(historicPnl)(pnlCrossHairChange)
    } else {
      const trade = summary.trade
      const isSettled = isTradeSettled(trade)

      const initialDelta = isSettled
        ? calculateSettledPositionDelta(trade) // calculatePositionDelta(summary.trade.updateList[summary.trade.updateList.length - 1].averagePrice, trade.initialPosition.isLong, summary)
        : calculatePositionDelta(historicPnl[historicPnl.length - 1].price, trade.initialPosition.isLong, summary)

      return merge(
        isSettled
          ? latestPositionDeltaChange ?? empty()
          : latestPositionDeltaChange ?? map(p => calculatePositionDelta(parseFixed(p.p, 30), summary.isLong, summary), filterByIndexToken(summary.trade.initialPosition.indexToken)(priceChange)),
        now({ delta: initialDelta.delta - summary.fee, deltaPercentage: initialDelta.deltaPercentage })
      )
    }
  }, crosshairWithInitial, tradeSummary, historicPnL)))
    

  const tickerStyle = style({
    lineHeight: 1,
    fontWeight: "bold",
    zIndex: 50,
    position: 'relative'
  })

  const chartRealisedPnl = map(ss => formatFixed(ss.delta, 30), chartPnLCounter)
  const chartPnlPercentage = map(ss => formatFixed(ss.deltaPercentage, 2), chartPnLCounter)

  // const liqPercentage = snapshot(price => {
  //   // const markPrice = Number(price.delta)
  //   // const liquidationPriceUsd = formatFixed(liquidationPrice, USD_DECIMALS)
  //   return liquidationWeight(true, 50, 40)
  // }, tradeSummary, pnlCrosshairMove)

  return [
    $column(containerOp)(

      $column(
        switchLatest(
          map(summary => {
            const initPos = summary.trade.initialPosition
            const trade = summary.trade
            const isOpen = !(`settledPosition` in trade)

            return $row(layoutSheet.spacingBig, style({ alignItems: 'center', fontFamily: 'RelativePro', padding: '25px 35px', zIndex: 100 }))(
              $row(style({ alignItems: 'center', placeContent: 'space-evenly' }))(
                $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                  $row(
                    style({ borderRadius: '2px', padding: '4px', backgroundColor: pallete.message, })(
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

              ...isOpen ? [
                $seperator,
                $text(style({ color: pallete.indeterminate }))(`OPEN`)
              ] : [],

              // $tokenLabelFromSummary(summary.trade),
                  
              // $seperator,

              $row(style({ flex: 1 }))(),

              switchLatest(map(map => {
                return $AccountPreview({ ...accountPreview, address: summary.account, claim: map.get(summary.account.toLocaleLowerCase()) })({
                  profileClick: accountPreviewClickTether()
                })
              }, claimMap)),


            )
          }, tradeSummary)
        ),

        $row(layoutSheet.spacing, style({ alignItems: 'baseline', placeContent: 'center', pointerEvents: 'none' }))(
          $row(style({ fontSize: '2.25em', alignItems: 'baseline', paddingTop: '20px' }))(
            animatePnl
              ? tickerStyle(
                $NumberTicker({
                  value$: map(Math.round, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartRealisedPnl)),
                  incrementColor: pallete.positive,
                  decrementColor: pallete.negative
                })
              )
              : $text(tickerStyle, styleBehavior(map(pnl => ({ color: pnl > 0 ? pallete.positive : pallete.negative }), chartRealisedPnl)))(map(O(Math.floor, x => `${x > 0 ? '+' : ''}` + x.toLocaleString()), chartRealisedPnl)),
            $text(style({ fontSize: '.75em', color: pallete.foreground }))('$'),
          ),
          // $liquidationSeparator(liqPercentage),
          $row(style({ fontSize: '1.75em', alignItems: 'baseline' }))(
            $text(style({ color: pallete.foreground }))('('),
            animatePnl
              ? tickerStyle(
                $NumberTicker({
                  value$: map(Math.round, skip(1, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartPnlPercentage))),
                  incrementColor: pallete.positive,
                  decrementColor: pallete.negative
                })
              )
              : $text(tickerStyle, styleBehavior(map(pnl => ({ color: pnl > 0 ? pallete.positive : pallete.negative }), chartPnlPercentage)))(map(O(Math.floor, n => `${n > 0 ? '+' : ''}` + n), chartPnlPercentage)),
            $text(tickerStyle, style({ color: pallete.foreground }))('%'),
            $text(style({ color: pallete.foreground }))(')'),
          ),
        )
      ),

      switchLatest(combineArray((data, tradeSummary) =>
        $Chart({
          initializeSeries: map((api) => {
            const series = api.addAreaBaselineSeries({
              // topFillColor1: pallete.positive,
              // topFillColor2: pallete.positive,
              topLineColor: pallete.positive,
              // priceLineColor: 'transparent',
              baseValue: {
                type: 'price',
                price: 0,
              },
              
              // lineStyle: LineStyle.Solid,
              
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
              // lineColor: pallete.primary,
              // topColor: pallete.background,
              // bottomColor: 'transparent',
                  
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
                    .map((ip): SeriesMarker<Time> => {
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

                  api.timeScale().fitContent()

   

                }, 50)
              }
                
            }

            series.applyOptions({
              scaleMargins: {
                top: 0.6,
                bottom: 0.03,
              }
            })

            return series
          }),
          chartConfig: {
            rightPriceScale: {
              // mode: PriceScaleMode.Logarithmic,
              autoScale: true,
              visible: false,
              
            },
            handleScale: false,
            handleScroll: false,
            timeScale: {
            // rightOffset: 110,
              secondsVisible: false,
              timeVisible: true,
              rightOffset: 0,
              // fixLeftEdge: true,
              // fixRightEdge: true,
              // visible: false,
              rightBarStaysOnScroll: true,
            },
            ...chartConfig
          },
          containerOp: style({
            display: 'flex',
            // height: '200px',
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

    {
      requestChainlinkPricefeed: map((pos): IPageChainlinkPricefeed => {
        const feedAddress = CHAINLINK_USD_FEED_ADRESS[pos.initialPosition.indexToken]
        return {
          feedAddress,
          from: pos.initialPosition.indexedAt,
          to: 'settledPosition' in pos ? pos.settledPosition.indexedAt : Math.floor(Date.now() / 1000),
          orderBy: 'unixTimestamp'
        }
      }, settledPosition),

      accountPreviewClick
    }
  ]
})

