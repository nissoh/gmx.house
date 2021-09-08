import { $text, component, style } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet } from '@aelea/ui-components'

import {  AccountHistoricalDataApi, formatFixed, historicalPnLMetric, IClaim, intervalInMsMap, IQueryAggregatedTradeMap, readableUSD, toAggregatedAccountSummary  } from 'gambit-middleware'
import { Stream } from '@most/types'
import { filter, map, multicast, never, now, switchLatest } from '@most/core'
import { Route } from '@aelea/router'
import { pallete } from '@aelea/ui-components-theme'
import { $AccountLabel, $AccountPhoto } from '../components/$AccountProfile'
import { $Chart } from "../components/chart/$Chart"
import { LineStyle } from 'lightweight-charts'
import { $logo } from '../common/$icons'


export interface ICard {
  parentRoute: Route

  claimList: Stream<IClaim[]>
  aggregatedTradeList: Stream<IQueryAggregatedTradeMap>
}



export const $Card = (config: ICard) => component(() => {
  const INTERVAL_TICKS = 140
  const interval = intervalInMsMap.HR4
  const urlFragments = document.location.pathname.split('/')
  const accountAddress = urlFragments[urlFragments.length - 1]

  const accountHistoryPnL = multicast(filter(arr => (arr.aggregatedTradeCloseds.length + arr.aggregatedTradeLiquidateds.length) > 0, config.aggregatedTradeList))

  const summary = map(data => toAggregatedAccountSummary(data)[0], accountHistoryPnL)

  
  const state = multicast(
    map((historicalData) => {
      return historicalPnLMetric(historicalData, interval, INTERVAL_TICKS)
    }, accountHistoryPnL)
  )

  const timeframePnLCounter = map(x => {
    const newLocal = Math.floor(x[x.length - 1].value)
    return newLocal
  }, state)


  return [
    $column(layoutSheet.spacingBig, style({ fontSize: '200%' }))(

      $row(layoutSheet.spacing, style({ alignItems: 'center', position: 'absolute', left: '10px', top: '10px' }))(
        $icon({ $content: $logo, fill: pallete.foreground, width: '46px', height: '38px', viewBox: '0 0 32 32' }),
        $text(style({ color: pallete.foreground, fontSize: '.55em', }))('GMX Community')
      ),

      $row(style({ gap: '75px', alignItems: 'center', justifyContent: 'center', paddingTop: '18vh' }))(
        $row(
          switchLatest(
            map((claimList: IClaim[]) => {
              const claim = claimList?.find(c => c.address === accountAddress) || null

              return $row(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
                $AccountPhoto(accountAddress, claim, 100),
                $AccountLabel(accountAddress, claim)
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

        $column(layoutSheet.spacing, style({ placeContent:'center', alignItems: 'center' }))(
          $row(style({ alignItems: 'baseline' }))(
            switchLatest(
              map(profit => $text(style({
                fontSize: '2em',
                lineHeight: 1,
                color: profit > 0 ? pallete.positive : pallete.negative,
                zIndex: 50,
                position: 'relative',
              }))(profit.toLocaleString()), timeframePnLCounter)
            ),
            $text(style({ color: pallete.foreground }))('$'),
          ),
          switchLatest(
            map(data => {
              return $row(layoutSheet.spacingBig, style({ placeContent: 'center', alignItems: 'center' }))(
                $column(style({ alignItems: 'center' }))(
                  $row(
                    $text(`${formatFixed(data.leverage, 4).toFixed(1)}x`),
                  ),
                  $text(style({ fontSize: '.6em', color: pallete.foreground }))('Leverage')
                ),

                $column(style({ alignItems: 'center' }))(
                  $row(layoutSheet.spacing)(
                    $text(`${data.profitablePositionsCount}`),
                    $text(style({ color: pallete.foreground }))(`/`),
                    $text(`${data.settledPositionCount - data.profitablePositionsCount}`),
                  ),
                  $text(style({ fontSize: '.6em', color: pallete.foreground }))('Win / Loss')
                )
              )
            }, summary)
          ),
        ),
       
      ),


      switchLatest(map((data) => $Chart({
        initializeSeries: map((api) => {

          const series = api.addAreaSeries({
            lineStyle: LineStyle.Solid,
            lineWidth: 4,
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

          if (data.length > 10) {
            const high = data[data.reduce((seed, b, idx) => b.value > data[seed].value ? idx : seed, 6)]
            const low = data[data.reduce((seed, b, idx) => b.value <= data[seed].value ? idx : seed, 0)]
                
            if (low.value !== high.value) {
              setTimeout(() => {
                series.setMarkers([
                  {
                    color: pallete.foreground,
                    position: "aboveBar",
                    shape: "arrowUp",
                    time: high.time,
                    // size: 0,
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
              }, 100)
            }
                
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
            // secondsVisible: false,
            timeVisible: true,
            visible: false,
            rightBarStaysOnScroll: true,
          }
        },
        containerOp: style({
          display: 'flex',
          minHeight: '300px',
          position: 'absolute',
          pointerEvents: 'none',
          top: '30vh',
          left: '0',
          right: '0',
          bottom: '0',
          // position: 'absolute', left: 0, top: 0, right: 0, bottom: 0
        }),
      })({
      }), state))

    ),

    { aggregatedTradeListQuery: now({ account: accountAddress, timeRange: [Date.now() - interval * INTERVAL_TICKS, Date.now()] }) as Stream<AccountHistoricalDataApi> }
  ]
})

