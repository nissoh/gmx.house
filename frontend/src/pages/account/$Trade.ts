import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { IPageChainlinkPricefeed, IChainlinkPrice, formatReadableUSD, IRequestAggregatedTradeQueryparam, TradeType, IAggregatedTradeAll, IAggregatedOpenPositionSummary, fromJson, parseFixed, isTradeSettled, calculateSettledPositionDelta } from "gambit-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { map, switchLatest, multicast, now, never } from "@most/core"
import { screenUtils, state } from "@aelea/ui-components"
import { Stream } from "@most/types"
import { $TradeCardPreview } from "./$TradeCardPreview"
import { Behavior, combineArray } from "@aelea/core"
import { filterByIndexToken, priceChange } from "../common"


export interface ITrade {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  aggregatedTrade: Stream<IAggregatedTradeAll>
  chainlinkPricefeed: Stream<IChainlinkPrice[]>
}



export const $Trade = (config: ITrade) => component((
  [requestChainlinkPricefeed, requestChainlinkPricefeedTether]: Behavior<IPageChainlinkPricefeed, IPageChainlinkPricefeed>,
) => {


  const urlFragments = document.location.pathname.split('/')
  const tradeId = urlFragments[urlFragments.length - 1]

  const tradeTypeUrl = urlFragments[urlFragments.length - 2].split('-')
  const tradeType = tradeTypeUrl[0] as TradeType


  const settledPosition = multicast(config.aggregatedTrade)
  const tradeSummary = multicast(map(fromJson.toAggregatedOpenTradeSummary, settledPosition))

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
        $TradeCardPreview({
          chainlinkPricefeed: config.chainlinkPricefeed,
          aggregatedTrade: config.aggregatedTrade,
          containerOp: style({ position: 'relative', maxWidth: '720px', width: '100%', zIndex: 0, height: '326px', overflow: 'hidden', alignSelf: 'center', boxShadow: `rgb(0 0 0 / 15%) 0px 2px 11px 0px, rgb(0 0 0 / 11%) 0px 5px 45px 16px`, borderRadius: '6px', backgroundColor: pallete.background, }),
        })({
          requestChainlinkPricefeed: requestChainlinkPricefeedTether()
        }),

        switchLatest(
          map((summary: IAggregatedOpenPositionSummary) => {
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
      requestChainlinkPricefeed: requestChainlinkPricefeed,
      requestAggregatedTrade: now({
        id: tradeId,
        tradeType,
      }) as Stream<IRequestAggregatedTradeQueryparam>
    }
  ]
})

