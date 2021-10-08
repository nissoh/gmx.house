import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { IPageChainlinkPricefeed, IChainlinkPrice, formatReadableUSD, IRequestAggregatedTradeQueryparam, TradeType, IAggregatedTradeAll, IAggregatedOpenPositionSummary, fromJson } from "gambit-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { map, switchLatest, multicast, now } from "@most/core"
import { screenUtils, state } from "@aelea/ui-components"
import { Stream } from "@most/types"
import { $TradeCardPreview } from "./$TradeCardPreview"
import { Behavior, O } from "@aelea/core"
import { Route } from "@aelea/router"
import { timeSince } from "../common"


export interface ITrade {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  aggregatedTrade: Stream<IAggregatedTradeAll>
  chainlinkPricefeed: Stream<IChainlinkPrice[]>
  parentRoute?: Route
}



export const $Trade = (config: ITrade) => component((
  [requestChainlinkPricefeed, requestChainlinkPricefeedTether]: Behavior<IPageChainlinkPricefeed, IPageChainlinkPricefeed>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

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

    
  
  const $label = (label: string, value: string) => $column(
    $text(style({ color: pallete.foreground }))(label),
    $text(style({  }))(value)
  )

  // const $labelNumber = (label: string, value: bigint) => $label(label, value)
  const $labelUSD = (label: string, value: bigint) => $label(label, '$' + formatReadableUSD(value))
  
  return [
    $container(

      $column(layoutSheet.spacingBig, style({ flex: 1 }))(

        switchLatest(
          map((summary: IAggregatedOpenPositionSummary) => {
            return $row(layoutSheet.spacingBig, style({ fontSize: '.85em', placeContent: 'center' }))(
              O(style({ flexDirection: 'row' }), layoutSheet.spacingSmall)(
                $label('Opened', timeSince(summary.startTimestamp)),
              ),

              O(style({ flexDirection: 'row' }), layoutSheet.spacingSmall)(
                $labelUSD('Collateral', summary.collateral),
              )

              // $labelUSD('Collateral', summary.collateral),
            )
          }, tradeSummary)
        ),

        $TradeCardPreview({
          chainlinkPricefeed: config.chainlinkPricefeed,
          aggregatedTrade: config.aggregatedTrade,
          containerOp: style({ position: 'relative', maxWidth: '720px', width: '100%', zIndex: 0, height: '326px', overflow: 'hidden', alignSelf: 'center', boxShadow: `rgb(0 0 0 / 15%) 0px 2px 11px 0px, rgb(0 0 0 / 11%) 0px 5px 45px 16px`, borderRadius: '6px', backgroundColor: pallete.background, }),
          accountPreview: {
            parentRoute: config.parentRoute
          }
        })({
          requestChainlinkPricefeed: requestChainlinkPricefeedTether(),
          accountPreviewClick: changeRouteTether()
        }),

        switchLatest(
          map((summary: IAggregatedOpenPositionSummary) => {
            return $row(layoutSheet.spacing, style({ placeContent: 'space-evenly' }))(
              $label('Open Date', new Date(summary.startTimestamp * 1000).toUTCString()),

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
      }) as Stream<IRequestAggregatedTradeQueryparam>,
      changeRoute
    }
  ]
})

