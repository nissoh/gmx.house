import { Behavior, O } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, $seperator, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, multicast, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { ARBITRUM_TRADEABLE_ADDRESS, CHAINLINK_USD_FEED_ADRESS, formatReadableUSD, fromJson, IAggregatedOpenPositionSummary, IAggregatedTradeAll, IChainlinkPrice, IClaim, IPageChainlinkPricefeed, IRequestAggregatedTradeQueryparam, TradeType } from "gambit-middleware"
import { timeSince } from "../common"
import { $TradeCardPreview } from "./$TradeCardPreview"


export interface ITrade {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  aggregatedTrade: Stream<IAggregatedTradeAll>
  chainlinkPricefeed: Stream<IChainlinkPrice[]>
  claimMap: Stream<Map<string, IClaim>>

  parentRoute?: Route
}



export const $Trade = (config: ITrade) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {


  const urlFragments = document.location.pathname.split('/')
  const tradeId = urlFragments[urlFragments.length - 1]

  const [token, tradeType, from, to] = urlFragments[urlFragments.length - 2].split('-')
  const feedAddress = CHAINLINK_USD_FEED_ADRESS[token as ARBITRUM_TRADEABLE_ADDRESS]

  const settledPosition = multicast(config.aggregatedTrade)
  const tradeSummary = multicast(map(fromJson.toAggregatedOpenTradeSummary, settledPosition))

  const $container = screenUtils.isDesktopScreen
    ? $row(style({ flexDirection: 'row-reverse', alignSelf: 'center', width: '100%', maxWidth: '720px', gap: '6vw' }))
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
          containerOp: style({ position: 'relative', width: '100%', zIndex: 0, height: '326px', overflow: 'hidden', alignSelf: 'center', boxShadow: `rgb(0 0 0 / 15%) 0px 2px 11px 0px, rgb(0 0 0 / 11%) 0px 5px 45px 16px`, borderRadius: '6px', backgroundColor: pallete.background, }),
          accountPreview: {
            parentRoute: config.parentRoute
          },
          claimMap: config.claimMap
        })({
          accountPreviewClick: changeRouteTether()
        }),

        switchLatest(
          map((summary: IAggregatedOpenPositionSummary) => {
            return $column(layoutSheet.spacing, style({ alignItems: 'center', fontSize: '.85em', padding: screenUtils.isDesktopScreen ? '' : '0 8px' }))(
              $row(layoutSheet.spacing, style({ placeContent: 'space-between', flex: 1, alignSelf: 'stretch' }))(
                $label('Open Date', new Date(summary.startTimestamp * 1000).toUTCString()),

                $labelUSD('Paid fees', summary.fee),
                // $labelUSD('Average Price', summary.averagePrice),
              ),
            )
          }, tradeSummary)
        ),

      ),
    ),

    {
      requestChainlinkPricefeed: now(<IPageChainlinkPricefeed>{ feedAddress, from: Number(from), to: Number(to), orderBy: 'unixTimestamp' }),
      requestAggregatedTrade: now(<IRequestAggregatedTradeQueryparam>{ id: tradeId, tradeType, }),
      changeRoute
    }
  ]
})

