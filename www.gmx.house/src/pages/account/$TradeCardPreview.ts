import { Behavior, combineArray, O, Op, replayLatest } from "@aelea/core"
import { $text, component, INode, motion, MOTION_NO_WOBBLE, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $NumberTicker, $row, $seperator, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { combine, filter, map, merge, multicast, now, skip, skipRepeats, skipRepeatsWith, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import {
  calculatePositionDelta, formatFixed, formatReadableUSD, getLiquidationPriceFromDelta, ITrade,
  IPricefeed, IClaim, intervalListFillOrderMap, isTradeSettled, readableNumber,
  unixTimeTzOffset, isTradeLiquidated, IPriceLatestMap, IPositionDelta, isTradeClosed, unixTimestampNow, TOKEN_ADDRESS_TO_SYMBOL, isTradeOpen
} from "@gambitdao/gmx-middleware"
import { ChartOptions, DeepPartial, LineStyle, MouseEventParams, SeriesMarker, Time } from "lightweight-charts"
import { $AccountPreview, IAccountPreview } from "../../components/$AccountProfile"
import { $Chart } from "../../components/$Chart"
import { $alert } from "../../elements/$common"
import { $bear, $bull, $target } from "../../elements/$icons"
import { $Risk, $RiskLiquidator, $TokenIndex } from "../common"
import { CHAIN_LABEL_ID } from "../../types"

interface IPricefeedTick extends IPositionDelta {
  value: number
  time: number
  price: bigint
  size: bigint
  collateral: bigint
  averagePrice: bigint
}

export interface ITradeCardPreview {
  pricefeed: Stream<IPricefeed[]>
  tradeSource: Stream<ITrade>,
  
  containerOp?: Op<INode, INode>,
  chartConfig?: DeepPartial<ChartOptions>
  latestPriceMap?: Stream<IPriceLatestMap>

  animatePnl?: boolean

  claimMap: Stream<{ [k: string]: IClaim }>
  accountPreview?: Partial<IAccountPreview>
}

export const $TradeCardPreview = ({
  pricefeed,
  tradeSource,
  containerOp = O(),
  chartConfig = {},
  latestPriceMap,
  animatePnl = true,
  accountPreview,
  claimMap
}: ITradeCardPreview) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [accountPreviewClick, accountPreviewClickTether]: Behavior<string, string>,
) => {

  const urlFragments = document.location.pathname.split('/')
  const [chainLabel] = urlFragments.slice(1) as [keyof typeof CHAIN_LABEL_ID]
  const chain = CHAIN_LABEL_ID[chainLabel]

  const tradeState = replayLatest(multicast(tradeSource))
  const nullishTrade = filter(x => x === null, tradeState)

  const latestPrice = switchLatest(combine((trade, feed) => {
    if (isTradeOpen(trade)) {
      return latestPriceMap ?  map(tmap => tmap[trade.indexToken].value, latestPriceMap) : feed[feed.length - 1].c
    }
    
    return isTradeClosed(trade) ? trade.decreaseList[trade.decreaseList.length - 1].price : trade.liquidatedPosition.markPrice
  }, tradeState, pricefeed))

  const historicPnL = replayLatest(multicast(combineArray((trade, feed) => {
    const startPrice = trade.increaseList[0].price

    const endtime = isTradeSettled(trade) ? trade.settledTimestamp : unixTimestampNow()

    const deltaTime = endtime - trade.timestamp
    const intervalTime = Math.floor((deltaTime) / 88)
   
    const startDelta = calculatePositionDelta(trade.increaseList[0].price, trade.averagePrice, trade.isLong, trade)

    const initalUpdate = trade.updateList[0]

    const initialTick: IPricefeedTick = {
      time: trade.timestamp,
      price: startPrice,
      value: formatFixed(startDelta.delta, 30),
      collateral: initalUpdate.collateral,
      size: initalUpdate.size,
      averagePrice: initalUpdate.averagePrice,
      ...startDelta
    }

    
    const filled = intervalListFillOrderMap({
      source: [...feed, ...trade.updateList],
      interval: intervalTime,
      seed: initialTick,
      getTime: x => x.timestamp,
      fillMap: (prev, next) => {

        if (next.__typename === 'UpdatePosition') {
          const delta = calculatePositionDelta(next.markPrice, trade.averagePrice, trade.isLong, next)

          const value = formatFixed(delta.delta, 30)

          return { ...prev, ...delta, value, price: next.markPrice, collateral: next.collateral, size: next.size, averagePrice: next.averagePrice  }
        }

        const delta = calculatePositionDelta(next.c, prev.averagePrice, trade.isLong, prev)
        const value = formatFixed(delta.delta, 30)

        return { ...prev, ...delta, value }
      }
    })


    if (isTradeClosed(trade)) {
      const prev = filled[filled.length - 1]
      const price = trade.decreaseList[trade.decreaseList.length - 1].price
      const delta = calculatePositionDelta(price, trade.averagePrice, trade.isLong, trade)

      filled.push({ ...prev, ...delta, time: trade.closedPosition.timestamp  })
    } else if (isTradeLiquidated(trade)) {
      const prev = filled[filled.length - 1]
      const price = trade.liquidatedPosition.markPrice
      const delta = calculatePositionDelta(price, trade.averagePrice, trade.isLong, trade)
      filled.push({ ...prev, ...delta, time: trade.liquidatedPosition.timestamp })
    }

    return filled
  }, tradeState, pricefeed)))


  const hasSeriesFn = (cross: MouseEventParams): boolean => {
    const mode = !!cross?.seriesPrices?.size
    return mode
  }
  const pnlCrosshairMoveMode = skipRepeats(map(hasSeriesFn, pnlCrosshairMove))
  const pnlCrossHairChange = filter(hasSeriesFn, pnlCrosshairMove)
  const crosshairWithInitial = startWith(false, pnlCrosshairMoveMode)

  
  const chartPnLCounter = multicast(switchLatest(combineArray((isMoveringChart, trade, historicPnl) => {
    if (isMoveringChart) {
      return map(cross => {
        return historicPnl.find(tick => cross.time === tick.time)!
      }, pnlCrossHairChange)
    } else {
      if (isTradeSettled(trade)) {
        return now({ delta: trade.realisedPnl - trade.fee, deltaPercentage: trade.realisedPnlPercentage })
      }

      const initialDelta = calculatePositionDelta(historicPnl[historicPnl.length - 1].price, trade.averagePrice, trade.isLong, trade)

      return merge(
        map(price => {
          return calculatePositionDelta(price, trade.averagePrice, trade.isLong, trade)
        }, latestPrice),
        now({ delta: initialDelta.delta - trade.fee, deltaPercentage: initialDelta.deltaPercentage })
      )
    }
  }, crosshairWithInitial, tradeState, historicPnL)))
    

  const tickerStyle = style({
    lineHeight: 1,
    fontWeight: "bold",
    zIndex: 50,
    position: 'relative'
  })

  const chartRealisedPnl = map(ss => formatFixed(ss.delta, 30), chartPnLCounter)
  const chartPnlPercentage = map(ss => formatFixed(ss.deltaPercentage, 2), chartPnLCounter)


  function tradeTitle(trade: ITrade): string {
    const isSettled = isTradeSettled(trade)

    if (isSettled) {
      return isSettled ? isTradeLiquidated(trade) ? 'LIQUIDATED' : 'CLOSED' : ''
    }
    
    return 'OPEN'
  }


  return [
    $column(containerOp)(


      switchLatest(map(() => {
        return $row(style({ placeContent: 'center', padding: '30px' }))(
          $alert($text('Could not find trade. it may have been settled'))
        )
      }, nullishTrade)),

      $column(
        switchLatest(
          map(trade => {
            const isSettled = isTradeSettled(trade)

            return $row(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ alignItems: 'center', fontFamily: 'RelativePro', padding: screenUtils.isDesktopScreen ? '25px 35px' : '15px 15px', zIndex: 100 }))(
              $row(style({ fontFamily: 'RelativeMono', alignItems: 'center', placeContent: 'space-evenly' }))(
                $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                  $row(
                    style({ borderRadius: '2px', padding: '4px', backgroundColor: pallete.message, })(
                      $icon({
                        $content: trade.isLong ? $bull : $bear,
                        width: '38px',
                        fill: pallete.background,
                        viewBox: '0 0 32 32',
                      })
                    )
                  ),
                  $column(style({ gap: '6px' }))(
                    $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                      $TokenIndex(TOKEN_ADDRESS_TO_SYMBOL[trade.indexToken], { width: '18px' }),
                      $text(formatReadableUSD(trade.averagePrice))
                    ),
                    $row(layoutSheet.spacingSmall, style({ color: isSettled ? '' : pallete.indeterminate, fontSize: '.65em' }))(
                      $text(tradeTitle(trade)),
                      $row(style({ gap: '3px', alignItems: 'baseline' }))(
                        $icon({
                          $content: $target,
                          width: '10px',
                          fill: isSettled ? '' : pallete.indeterminate,
                          viewBox: '0 0 32 32'
                        }),
                        $text(style(isSettled ? {} : { color: pallete.indeterminate }))(
                          merge(
                            now('Loading...'),
                            map(price => {
                              return readableNumber(formatFixed(price, 30))
                            }, latestPrice)
                          )
                        )
                      )
                    ),
                  )
                ),
              ),

              style({ alignSelf: 'stretch' }, $seperator),

              !isSettled
                ? $RiskLiquidator(trade, map(feed => feed[feed.length - 1].price, historicPnL))({})
                : $Risk(trade)({}),


              $row(style({ flex: 1 }))(),

              switchLatest(map(cMap => {
                return $AccountPreview({ ...accountPreview, chain, address: trade.account, claim: cMap[trade.account.toLocaleLowerCase()] })({
                  profileClick: accountPreviewClickTether()
                })
              }, claimMap)),


            )
          }, tradeState)
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

      switchLatest(combineArray((data, trade) =>
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
              baseLineStyle: LineStyle.Dashed,
              lineWidth: 2,
              baseLineColor: 'red',
              baseLineVisible: true,
              lastValueVisible: false,
              priceLineVisible: false,
            })


            const chartData = data
              // .sort((a, b) => b.time - a.time)
              .map(({ delta, time }) => ({ time: time as Time, value: formatFixed(delta, 30) }))
              
            series.setData(chartData)
                

            const high = data[data.reduce((seed, b, idx) => b.delta > data[seed].delta ? idx : seed, Math.min(6, data.length - 1))]
            const low = data[data.reduce((seed, b, idx) => b.delta <= data[seed].delta ? idx : seed, 0)]

            if (high.delta > 0 && low.delta < 0) {
              series.createPriceLine({
                price: 0,
                color: pallete.foreground,
                lineWidth: 1,
                lineVisible: true,
                axisLabelVisible: true,
                title: '',
                lineStyle: LineStyle.SparseDotted,
              })
            }

            if (low.delta < 0) {
              const liquidationPrice = getLiquidationPriceFromDelta(trade.collateral, trade.size, trade.averagePrice, trade.isLong)
              const posDelta = calculatePositionDelta(liquidationPrice, trade.averagePrice, trade.isLong, trade)
              const formatedLiqPrice = formatFixed(posDelta.delta, 30)
            

              series.createPriceLine({
                price: formatedLiqPrice,
                color: pallete.negative,
                lineVisible: true,
                lineWidth: 1,
                axisLabelVisible: true,
                title: `Liquidation $${readableNumber(formatedLiqPrice)}`,
                lineStyle: LineStyle.SparseDotted,
              })
            }


            if (data.length > 10) {
              if (low.delta !== high.delta) {
                setTimeout(() => {
                  const increaseList = trade.increaseList
                  const increaseMarkers = increaseList
                    .slice(1)
                    .map((ip): SeriesMarker<Time> => {
                      return {
                        color: pallete.foreground,
                        position: "aboveBar",
                        shape: "arrowUp",
                        time: unixTimeTzOffset(ip.timestamp),
                        text:  '$' + formatReadableUSD(ip.collateralDelta)
                      }
                    })

                  const decreaseList = isTradeSettled(trade) ? trade.decreaseList.slice(0, -1) : trade.decreaseList

                  const decreaseMarkers = decreaseList
                    .map((ip): SeriesMarker<Time> => {
                      return {
                        color: pallete.foreground,
                        position: 'belowBar',
                        shape: "arrowDown",
                        time: unixTimeTzOffset(ip.timestamp),
                        text:  '$' + formatReadableUSD(ip.collateralDelta)
                      }
                    })

                  series.setMarkers([...increaseMarkers, ...decreaseMarkers].sort((a, b) => Number(a.time) - Number(b.time)))

                  api.timeScale().fitContent()


                }, 90)
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
      , historicPnL, tradeState)),
    ),

    {
      accountPreviewClick
    }
  ]
})

