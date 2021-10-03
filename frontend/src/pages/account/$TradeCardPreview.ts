import { combineArray, Behavior, Op, O } from "@aelea/core"
import { $text, style, motion, MOTION_NO_WOBBLE, component, INode } from "@aelea/dom"
import { $column, $icon, $NumberTicker, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { switchLatest, skip, skipRepeatsWith, multicast, map, filter, now, skipRepeats, startWith } from "@most/core"
import { Stream } from "@most/types"
import { IAggregatedOpenPositionSummary, strictGet, TRADEABLE_TOKEN_ADDRESS_MAP, formatFixed, unixTimeTzOffset, formatReadableUSD, IChainlinkPrice, IAggregatedTradeAll, parseFixed, calculatePositionDelta, fillIntervalGap, fromJson } from "gambit-middleware"
import { ChartOptions, DeepPartial, LineStyle, MouseEventParams, SeriesMarker, Time } from "lightweight-charts-baseline"
import { $AccountLabel, $AccountPhoto, $ProfileLinks } from "../../components/$AccountProfile"
import { $Chart } from "../../components/chart/$Chart"
import { $leverage, $seperator } from "../../elements/$common"
import { $bull, $bear } from "../../elements/$icons"
import { filterByIndexToken, priceChange } from "../common"

interface IPricefeedTick {
  delta: bigint;
  deltaPercentage: bigint;
  value: number;
  time: number;
  price: bigint;
}

export interface ITradeCardPreview {
  chainlinkPricefeed: Stream<IChainlinkPrice[]>,
  aggregatedTrade: Stream<IAggregatedTradeAll>,
  containerOp?: Op<INode, INode>,
  chartConfig?: DeepPartial<ChartOptions>,
}

export const $TradeCardPreview = ({
  chainlinkPricefeed,
  aggregatedTrade,
  containerOp = O(),
  chartConfig = {}
}: ITradeCardPreview) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {

  const settledPosition = multicast(aggregatedTrade)
  const tradeSummary = multicast(map(fromJson.toAggregatedOpenTradeSummary, settledPosition))

  
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
  
  const chartPnLCounter = multicast(switchLatest(combineArray((mode, summary, historicPnl) =>
    mode
      ? map((cross) => {
        return historicPnl.find(tick => cross.time === tick.time)!
      }, pnlCrossHairChange)
      : 'settledPosition' in summary.trade
        ? map(() => {
          const ww = historicPnl[historicPnl.length - 1].price

          // @ts-ignore
          const avg = summary.trade.settledPosition.averagePrice
          const posDelta = calculatePositionDelta(ww, summary.isLong, summary)


          return { ...posDelta }
        }, now(null))
        : map((price) => calculatePositionDelta(parseFixed(price.p, 30), summary.isLong, summary), filterByIndexToken(summary)(priceChange))
  , crosshairWithInitial, tradeSummary, historicPnL))
  )
    

  return [
    $column(containerOp)(

      $column(
        switchLatest(
          map((summary: IAggregatedOpenPositionSummary) => {
            const initPos = summary.trade.initialPosition
            return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '25px 35px', zIndex: 100 }))(
              $row(style({ alignItems: 'center', placeContent: 'space-evenly' }))(
                $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
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

        $column(layoutSheet.spacingTiny, style({ alignItems: 'center', pointerEvents: 'none' }))(
          $row(style({ alignItems: 'baseline' }))(
            $NumberTicker({
              textStyle: {
                fontSize: '2.65em',

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
            $text('$'),
          ),
          $row(style({ alignItems: 'baseline' }))(
            $NumberTicker({
              textStyle: {
                // pointerEvents: 'none',
                fontSize: '1.25em',
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
            $text(style({ fontSize: '.65em' }))('%'),
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
    )
  ]
})

