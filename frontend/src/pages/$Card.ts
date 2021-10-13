import { $element, $text, attr, component, style, styleInline } from "@aelea/dom"
import { $column, $icon, $row, http, layoutSheet } from '@aelea/ui-components'

import {  IAggregatedTradeSettledAll, IChainlinkPrice, IClaim, IPageChainlinkPricefeed, IRequestAggregatedTradeQueryparam, TradeType  } from 'gambit-middleware'
import { Stream } from '@most/types'
import { awaitPromises, empty, map, now } from '@most/core'
import { pallete } from '@aelea/ui-components-theme'
import { $logo } from '../common/$icons'
import { $TradeCardPreview } from "./account/$TradeCardPreview"
import { Behavior } from "@aelea/core"


export interface ICard {
  chainlinkPricefeed: Stream<IChainlinkPrice[]>
  aggregatedTrade: Stream<IAggregatedTradeSettledAll>

  claimMap: Stream<Map<string, IClaim>>
}



export const $Card = ({ aggregatedTrade, claimMap }: ICard) => component((
  [requestChainlinkPricefeed, requestChainlinkPricefeedTether]: Behavior<IPageChainlinkPricefeed, IPageChainlinkPricefeed>,

) => {
  const urlFragments = document.location.pathname.split('/')
  const tradeId = urlFragments[urlFragments.length - 1]
  const tradeTypeUrl = urlFragments[urlFragments.length - 2].split('-')

  const tradeType = tradeTypeUrl[0] as TradeType


  const ww = awaitPromises(
    map(params => {
      return http.fetchJson('/api/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // parseJson: jsonList => {
        //   return jsonList.map(fromJson.positionLiquidatedJson)
        // },
        body: JSON.stringify(params)
      })

    }, requestChainlinkPricefeed)
  )


  return [
    $column(layoutSheet.spacingBig, style({ height: '100vh', fontSize: '1.25em', fontFamily: 'RelativePro', backgroundColor: 'rgb(14, 15, 32)' }))(

      $row(layoutSheet.spacing, style({ alignItems: 'center', position: 'absolute', left: '15px', bottom: '15px' }))(
        $element('img')(attr({ src: '/assets/gmx-logo.png' }), style({ width: '42px' }))(),
        $text(style({ color: pallete.message, fontSize: '.75em', fontWeight: 'bold' }))('GMX.io')
      ),

      $TradeCardPreview({
        chainlinkPricefeed: ww,
        aggregatedTrade,
        latestPositionDeltaChange: empty(),
        containerOp: style({ position: 'absolute', letterSpacing: '2px', inset: `0px 0px 35px`, }),
        chartConfig: {
          timeScale: {
            visible: false
          }
        },
        animatePnl: false,
        claimMap
      })({
        requestChainlinkPricefeed: requestChainlinkPricefeedTether()
      }),

      $row(
        style({
          backgroundImage: 'url(/assets/field-overlay.png)',
          position: 'absolute',
          zIndex: 2222,
          inset: 0,
          backgroundPositionY: '40px',
          backgroundRepeat: 'no-repeat',
          // filter: 'opacity(.7)',
          mixBlendMode: 'soft-light',  
        })
      )($row(style({
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(at center top, rgba(255, 255, 255, 0) -5%, rgba(14, 15, 32, 0.72) 67%)'
      }))())

    ),

    {
      // requestChainlinkPricefeed,
      requestAggregatedTrade: now({ id: tradeId, tradeType, }) as Stream<IRequestAggregatedTradeQueryparam>
    }
  ]
})

