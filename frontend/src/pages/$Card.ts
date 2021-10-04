import { $text, component, style } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet } from '@aelea/ui-components'

import {  calculateSettledPositionDelta, CHAINLINK_USD_FEED_ADRESS, IAggregatedTradeSettledAll, IChainlinkPrice, IPageChainlinkPricefeed, IRequestAggregatedTradeQueryparam, TradeType  } from 'gambit-middleware'
import { Stream } from '@most/types'
import { map, now } from '@most/core'
import { pallete } from '@aelea/ui-components-theme'
import { $logo } from '../common/$icons'
import { $TradeCardPreview } from "./account/$TradeCardPreview"
import { Behavior } from "@aelea/core"


export interface ICard {
  chainlinkPricefeed: Stream<IChainlinkPrice[]>
  aggregatedTrade: Stream<IAggregatedTradeSettledAll>
}



export const $Card = ({ chainlinkPricefeed, aggregatedTrade }: ICard) => component((
  [requestChainlinkPricefeed, requestChainlinkPricefeedTether]: Behavior<IPageChainlinkPricefeed, IPageChainlinkPricefeed>,

) => {
  const urlFragments = document.location.pathname.split('/')
  const tradeId = urlFragments[urlFragments.length - 1]
  const tradeTypeUrl = urlFragments[urlFragments.length - 2].split('-')

  const tradeType = tradeTypeUrl[0] as TradeType


  return [
    $column(layoutSheet.spacingBig, style({ fontSize: '150%' }))(

      $row(layoutSheet.spacingSmall, style({ alignItems: 'center', position: 'absolute', left: '10px', bottom: '10px' }))(
        $icon({ $content: $logo, fill: pallete.foreground, width: '46px', height: '38px', viewBox: '0 0 32 32' }),
        $text(style({ color: pallete.foreground, fontSize: '.55em', }))('GMX.house')
      ),

      $TradeCardPreview({
        chainlinkPricefeed,
        aggregatedTrade,
        latestPositionDeltaChange: map(trade => calculateSettledPositionDelta(trade), aggregatedTrade),
        containerOp: style({ position: 'absolute', inset: `0px 0px 35px`, }),
        chartConfig: {
          timeScale: {
            visible: false
          }
        },
        animatePnl: false,
      })({
        requestChainlinkPricefeed: requestChainlinkPricefeedTether()
      })

    ),

    {
      requestChainlinkPricefeed,
      requestAggregatedTrade: now({ id: tradeId, tradeType, }) as Stream<IRequestAggregatedTradeQueryparam>
    }
  ]
})

