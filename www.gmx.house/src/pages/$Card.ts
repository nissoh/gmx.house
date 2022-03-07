import { $element, $text, attr, component, style } from "@aelea/dom"
import { $column, $row, http, layoutSheet } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { fromPromise, map, now } from '@most/core'
import { Stream } from '@most/types'
import { ARBITRUM_TRADEABLE_ADDRESS, formatFixed, ITrade, IPricefeed, IClaim, IPricefeedParamApi, IRequestTradeQueryparam, intervalInMsMap, IPriceLatestMap } from '@gambitdao/gmx-middleware'
import { $TradeCardPreview } from "./account/$TradeCardPreview"
import { CHAIN_LABEL_ID } from "../types"



export interface ICard {
  chainlinkPricefeed: Stream<IPricefeed[]>
  trade: Stream<ITrade>
  latestPriceMap: Stream<IPriceLatestMap>

  claimMap: Stream<{ [k: string]: IClaim }>
}



export const $Card = ({ trade, claimMap, latestPriceMap }: ICard) => component(() => {

  const urlFragments = document.location.pathname.split('/')
  const [chainLabel] = urlFragments.slice(1) as [keyof typeof CHAIN_LABEL_ID]
  const chain = CHAIN_LABEL_ID[chainLabel]
  
  const tradeId = urlFragments[urlFragments.length - 1]

  const [token, status, from, to] = urlFragments[urlFragments.length - 2].split('-')
  const tokenAddress = token as ARBITRUM_TRADEABLE_ADDRESS


  const pricefeed: Stream<IPricefeed[]> = fromPromise(http.fetchJson('/api/feed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(<IPricefeedParamApi>{
      tokenAddress: tokenAddress,
      chain,
      interval: intervalInMsMap.HR4
    })
  }))


  return [
    $column(layoutSheet.spacingBig, style({ height: '100vh', fontSize: '1.25em', fontFamily: 'RelativePro', backgroundColor: 'rgb(14, 15, 32)' }))(

      $row(layoutSheet.spacing, style({ alignItems: 'center', position: 'absolute', left: '15px', bottom: '15px' }))(
        $element('img')(attr({ src: '/assets/gmx-logo.png' }), style({ width: '42px' }))(),
        $text(style({ color: pallete.message, fontSize: '.75em', fontWeight: 'bold' }))('GMX.io')
      ),

      $TradeCardPreview({
        pricefeed,
        tradeSource: trade,
        latestPriceMap,
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
      requestTrade: now({ id: tradeId, }) as Stream<IRequestTradeQueryparam>
    }
  ]
})

