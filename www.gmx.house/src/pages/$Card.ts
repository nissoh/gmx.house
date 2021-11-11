import { $element, $text, attr, component, style } from "@aelea/dom"
import { $column, $row, http, layoutSheet } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { fromPromise, map, now } from '@most/core'
import { Stream } from '@most/types'
import { ARBITRUM_TRADEABLE_ADDRESS, CHAINLINK_USD_FEED_ADRESS, formatFixed, fromJson, IAggregatedTradeSettledAll, IChainlinkPrice, IClaim, IPageChainlinkPricefeed, IRequestAggregatedTradeQueryparam, TradeType } from 'gambit-middleware'
import { $TradeCardPreview } from "./account/$TradeCardPreview"



export interface ICard {
  chainlinkPricefeed: Stream<IChainlinkPrice[]>
  aggregatedTrade: Stream<IAggregatedTradeSettledAll>

  claimMap: Stream<Map<string, IClaim>>
}



export const $Card = ({ aggregatedTrade, claimMap }: ICard) => component(() => {

  const urlFragments = document.location.pathname.split('/')
  const tradeId = urlFragments[urlFragments.length - 1]

  const [token, tradeType, from, to] = urlFragments[urlFragments.length - 2].split('-')
  const feedAddress = CHAINLINK_USD_FEED_ADRESS[token as ARBITRUM_TRADEABLE_ADDRESS]
  const tradeSummary = map(fromJson.toAggregatedTradeAllSummary, aggregatedTrade)


  const feed: Stream<IChainlinkPrice[]> = fromPromise(http.fetchJson('/api/feed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(<IPageChainlinkPricefeed>{
      feedAddress,
      from: Number(from),
      to: tradeType === TradeType.OPEN ? null : Number(to),
      orderBy: 'unixTimestamp'
    })
  }))


  return [
    $column(layoutSheet.spacingBig, style({ height: '100vh', fontSize: '1.25em', fontFamily: 'RelativePro', backgroundColor: 'rgb(14, 15, 32)' }))(

      $row(layoutSheet.spacing, style({ alignItems: 'center', position: 'absolute', left: '15px', bottom: '15px' }))(
        $element('img')(attr({ src: '/assets/gmx-logo.png' }), style({ width: '42px' }))(),
        $text(style({ color: pallete.message, fontSize: '.75em', fontWeight: 'bold' }))('GMX.io')
      ),

      $TradeCardPreview({
        chainlinkPricefeed: feed,
        aggregatedTrade: tradeSummary,
        latestPositionPrice: map(feed => {
          return formatFixed(BigInt(feed[feed.length - 1].value), 8)
        }, feed),
        containerOp: style({ position: 'absolute', letterSpacing: '2px', inset: `0px 0px 35px`, }),
        accountPreview: {
          avatarSize: '45px'
        },
        chartConfig: {
          timeScale: {
            visible: false
          }
        },
        animatePnl: false,
        claimMap
      })({ }),

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
      requestAggregatedTrade: now({ id: tradeId, tradeType, }) as Stream<IRequestAggregatedTradeQueryparam>
    }
  ]
})

