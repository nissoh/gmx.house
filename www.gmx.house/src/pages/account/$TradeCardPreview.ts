import { Behavior, combineArray, O, Op, replayLatest } from "@aelea/core"
import { $text, component, INode, motion, MOTION_NO_WOBBLE, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $NumberTicker, $row, $seperator, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { filter, map, merge, multicast, now, skip, skipRepeats, skipRepeatsWith, snapshot, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import {
  calculatePositionDelta, calculateSettledPositionDelta, formatFixed, formatReadableUSD,
  getLiquidationPriceFromDelta, IAggregatedOpenPositionSummary, IAggregatedPositionSettledSummary,
  IAggregatedTradeOpen,
  IAggregatedTradeSettledAll,
  IChainlinkPrice, IClaim, intervalListFillOrderMap, IPositionDelta, isLiquidated, isTradeSettled, parseFixed, readableNumber,
  unixTimeTzOffset
} from "@gambitdao/gmx-middleware"
import { ChartOptions, DeepPartial, LineStyle, MouseEventParams, SeriesMarker, Time } from "lightweight-charts-baseline"
import { $AccountPreview, IAccountPreview } from "../../components/$AccountProfile"
import { $Chart } from "../../components/chart/$Chart"
import { $alert } from "../../elements/$common"
import { $bear, $bull, $target } from "../../elements/$icons"
import { $Risk, $RiskLiquidator, $TokenIndex, filterByIndexToken, priceChange } from "../common"

interface IPricefeedTick extends IPositionDelta {
  value: number;
  time: number;
  price: bigint;
}

export interface ITradeCardPreview {
  chainlinkPricefeed: Stream<IChainlinkPrice[]>,
  aggregatedTrade: Stream<IAggregatedOpenPositionSummary | IAggregatedPositionSettledSummary>,
  latestPositionPrice?: Stream<number>
  
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
  latestPositionPrice,
  animatePnl = true,
  accountPreview,
  claimMap
}: ITradeCardPreview) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [accountPreviewClick, accountPreviewClickTether]: Behavior<string, string>,
) => {

  const aggregatedTradeState = replayLatest(multicast(aggregatedTrade))
  const nullishTrade = filter(x => x === null, aggregatedTradeState)

  const parsedPricefeed = replayLatest(multicast(combineArray((summary, feed) => {
    const parsedFeed = feed
      .map(({ unixTimestamp, value }) => {

        const parsedValue = parseFixed(Number(value) / 1e8, 30)
        return {
          value: parsedValue,
          time: unixTimestamp,
        }
      })

    parsedFeed.unshift({
      time: summary.startTimestamp,
      value: summary.trade.initialPosition.price
    })

    const trade = summary.trade
    if (isTradeSettled(trade)) {
      parsedFeed.push({
        time: trade.settledPosition.indexedAt,
        value: trade.decreaseList[trade.decreaseList.length - 1].price
      })
    }

    return parsedFeed.sort((a, b) => a.time - b.time)
  }, aggregatedTradeState, chainlinkPricefeed)))

  const latestPrice = latestPositionPrice ? latestPositionPrice : switchLatest(map(summary => {
    const trade = summary.trade
    const isOpen = !(`settledPosition` in trade)

    return isOpen
      ? map(price => Number(price.p), filterByIndexToken(summary.trade.initialPosition.indexToken)(priceChange))
      : map(feed => formatFixed(feed[feed.length - 1].value, 30), parsedPricefeed)
  }, aggregatedTradeState))

  const historicPnL = replayLatest(multicast(combineArray((summary, pricefeed) => {
    const trade: IAggregatedTradeOpen | IAggregatedTradeSettledAll = { ...summary.trade }

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
      const value = formatFixed(delta.delta, 30)
      // const val = formatFixed((delta.hasProfit ? delta.delta : -delta.delta) - summary.fee, 30)

      return { value, time: priceFeed.time, price: priceFeed.value, ...delta }
    }
    
    const initialTick: IPricefeedTick = {
      ...calculatePositionDelta(pricefeed[0].value, trade.initialPosition.isLong, summary),
      time: startTime,
      price: pricefeed[0].value,
      value: 0
    }


    const filled = intervalListFillOrderMap({
      source: pricefeed,
      interval: intervalTime,
      seed: initialTick,
      getTime: x => x.time,
      fillMap: (prev, priceFeed) => {
        return getVal(priceFeed)
      },
      fillGapMap: (prev, priceFeed) => {
        return getVal(priceFeed)
      },
      squashMap: (prev, priceFeed) => {
        return { ...getVal(priceFeed), time: prev.time }
      },
    })
    // .map(t => ({ time: timeTzOffset(t.time), value: t.value }))

    return filled
  }, aggregatedTradeState, parsedPricefeed)))


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
      

      if (isSettled) {
        const initialDelta = calculateSettledPositionDelta(trade)
        return now({ delta: initialDelta.delta - summary.fee, deltaPercentage: initialDelta.deltaPercentage })
      }

      const initialDelta = calculatePositionDelta(historicPnl[historicPnl.length - 1].price, trade.initialPosition.isLong, summary)

      return merge(
        map(price => calculatePositionDelta(parseFixed(price, 30), summary.isLong, summary), latestPositionPrice ?? latestPrice),
        now({ delta: initialDelta.delta - summary.fee, deltaPercentage: initialDelta.deltaPercentage })
      )
    }
  }, crosshairWithInitial, aggregatedTradeState, historicPnL)))
    

  const tickerStyle = style({
    lineHeight: 1,
    fontWeight: "bold",
    zIndex: 50,
    position: 'relative'
  })

  const chartRealisedPnl = map(ss => formatFixed(ss.delta, 30), chartPnLCounter)
  const chartPnlPercentage = map(ss => formatFixed(ss.deltaPercentage, 2), chartPnLCounter)


  function tradeTitle(summary: IAggregatedOpenPositionSummary | IAggregatedPositionSettledSummary): string {
    const trade = summary.trade
    const isSettled = `settledPosition` in trade

    if (isSettled) {
      const settledPos = trade.settledPosition
      return isSettled ? isLiquidated(settledPos) ? 'LIQUIDATED' : 'CLOSED' : ''
    }
    
    return 'OPEN'
  }


  return [
    $column(containerOp)(


      switchLatest(map(x => {
        return $row(style({ placeContent: 'center', padding: '30px' }))(
          $alert($text('Could not find trade. it may have been settled'))
        )
      }, nullishTrade)),

      $column(
        switchLatest(
          map(summary => {
            const initPos = summary.trade.initialPosition
            const trade = summary.trade

            const isOpen = !(`settledPosition` in trade)
            const isSettled = `settledPosition` in trade

            return $row(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ alignItems: 'center', fontFamily: 'RelativePro', padding: screenUtils.isDesktopScreen ? '25px 35px' : '15px 15px', zIndex: 100 }))(
              $row(style({ fontFamily: 'RelativeMono', alignItems: 'center', placeContent: 'space-evenly' }))(
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
                  $column(style({ gap: '6px' }))(
                    $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                      $TokenIndex(summary.indexToken, { width: '18px' }),
                      $text(formatReadableUSD(summary.averagePrice))
                    ),
                    $row(layoutSheet.spacingSmall, style({ color: isSettled ? '' : pallete.indeterminate, fontSize: '.65em' }))(
                      $text(tradeTitle(summary)),
                      $row(style({ gap: '3px', alignItems: 'baseline' }))(
                        $icon({
                          $content: $target,
                          width: '10px',
                          fill: isSettled ? '' : pallete.indeterminate,
                          viewBox: '0 0 32 32'
                        }),
                        $text(style(`settledPosition` in summary.trade ? {} : { color: pallete.indeterminate }))(
                          merge(
                            now('Loading...'),
                            map(price => {
                              return readableNumber(price)
                            }, latestPrice)
                          )
                        )
                      )
                    ),
                  )
                ),
              ),

              style({ alignSelf: 'stretch' }, $seperator),

              isOpen
                ? $RiskLiquidator(summary, map(feed => feed[feed.length - 1].price, historicPnL))({})
                : $Risk(summary)({}),


              $row(style({ flex: 1 }))(),

              switchLatest(map(map => {
                return $AccountPreview({ ...accountPreview, address: summary.account, claim: map.get(summary.account.toLocaleLowerCase()) })({
                  profileClick: accountPreviewClickTether()
                })
              }, claimMap)),


            )
          }, aggregatedTradeState)
        ),

        $row(layoutSheet.spacing, style({ alignItems: 'baseline', placeContent: 'center', pointerEvents: 'none' }))(
          $row(style({ fontSize: '2.25em', alignItems: 'baseline', paddingTop: '26px' }))(
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
            const series = api.addBaselineSeries({
              // topFillColor1: pallete.positive,
              // topFillColor2: pallete.positive,
              topLineColor: pallete.positive,
              bottomLineColor: pallete.negative,
              baseValue: {
                type: 'price',
                price: 0,
              },
              lineWidth: 2,
              baseLineVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
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

            if (low.delta < 0) {
              const liquidationPrice = getLiquidationPriceFromDelta(tradeSummary.collateral, tradeSummary.size, tradeSummary.averagePrice, tradeSummary.isLong)
              const posDelta = calculatePositionDelta(liquidationPrice, tradeSummary.isLong, tradeSummary)
              const formatedLiqPrice = formatFixed(posDelta.delta, 30)
            

              series.createPriceLine({
                price: formatedLiqPrice,
                color: pallete.negative,
                lineWidth: 1,
                axisLabelVisible: true,
                title: `Liquidation $${readableNumber(formatedLiqPrice)}`,
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

                  const decreaseList = isTradeSettled(tradeSummary.trade) ? tradeSummary.trade.decreaseList.slice(0, -1) : tradeSummary.trade.decreaseList

                  const decreaseMarkers = decreaseList
                    .map((ip): SeriesMarker<Time> => {
                      return {
                        color: pallete.foreground,
                        position: 'belowBar',
                        shape: "arrowDown",
                        time: unixTimeTzOffset(ip.indexedAt),
                        text:  '$' + formatReadableUSD(ip.collateralDelta)
                      }
                    })

                  series.setMarkers([...increaseMarkers, ...decreaseMarkers].sort((a, b) => Number(a.time) - Number(b.time)))

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
      , historicPnL, aggregatedTradeState)),
    ),

    {
      accountPreviewClick
    }
  ]
})

