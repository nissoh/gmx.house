import { Behavior, O } from "@aelea/core"
import { $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $card, $column, $icon, $row, $seperator, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, filter, map, multicast, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { ARBITRUM_TRADEABLE_ADDRESS, CHAINLINK_USD_FEED_ADRESS, formatReadableUSD, fromJson, IAggregatedOpenPositionSummary, IAggregatedPositionSettledSummary, IAggregatedTradeAll, IChainlinkPrice, IClaim, IPageChainlinkPricefeed, IRequestAggregatedTradeQueryparam, TradeType } from "gambit-middleware"
import * as wallet from "wallet-link"
import { $Table2 } from "../../common/$Table2"
import { $Link } from "../../components/$Link"
import { $anchor } from "../../elements/$common"
import { $ethScan } from "../../elements/$icons"
import { $Entry, $ProfitLossText, timeSince } from "../common"
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
  const tradeSummary: Stream<IAggregatedOpenPositionSummary | IAggregatedPositionSettledSummary | null> = multicast(map(res => {
    return res ? fromJson.toAggregatedTradeAllSummary(res) : null
  }, settledPosition))

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
          map(summary => {
            if (summary === null) {
              return empty()
            }

            const trade = summary.trade
            const isSettled = 'settledPosition' in trade
            
            return $row(layoutSheet.spacingBig, style({ fontSize: '.85em', placeContent: 'center' }))(
              O(style({ flexDirection: 'row' }), layoutSheet.spacingSmall)(
                isSettled ? $label('Settled', timeSince(trade.settledPosition.indexedAt)) : $label('Opened', timeSince(summary.startTimestamp)),
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
          aggregatedTrade: tradeSummary,
          containerOp: style({ position: 'relative', width: '100%', zIndex: 0, height: '326px', overflow: 'hidden', alignSelf: 'center', boxShadow: `rgb(0 0 0 / 15%) 0px 2px 11px 0px, rgb(0 0 0 / 11%) 0px 5px 45px 16px`, borderRadius: '6px', backgroundColor: pallete.background, }),
          accountPreview: {
            parentRoute: config.parentRoute
          },
          claimMap: config.claimMap
        })({ accountPreviewClick: changeRouteTether() }),

        switchLatest(
          map(summary => {
            if (summary === null) {
              return empty()
            }

            const trade = summary.trade
            const isSettled = 'settledPosition' in trade
            const maybeSettled = isSettled ? [trade.settledPosition] : []

            return $column(layoutSheet.spacingBig, style({ padding: screenUtils.isDesktopScreen ? '' : '0 8px' }))(
              $row(layoutSheet.spacing, style({ fontSize: '.85em', placeContent: 'space-between', flex: 1, alignSelf: 'stretch' }))(
                $label('Open Date', new Date(summary.startTimestamp * 1000).toUTCString()),

                $labelUSD('Paid fees', summary.fee),
                // $labelUSD('Average Price', summary.averagePrice),
              ),

              $card($Table2({
                dataSource: now([...summary.trade.increaseList, ...summary.trade.decreaseList, ...maybeSettled].sort((a, b) => b.indexedAt - a.indexedAt)),
                bodyContainerOp: layoutSheet.spacing,
                scrollConfig: {
                  containerOps: O(layoutSheet.spacingBig)
                },
                columns: [
                  {
                    $head: $text('Timestamp'),
                    columnOp: O(style({  flex: 1.2 })),

                    $body: map((pos) => {
                      return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
                        $text(timeSince(pos.indexedAt)),
                        $text(new Date(pos.indexedAt * 1000).toLocaleDateString()),  
                      )
                    })
                  },
                  {
                    $head: $text('Action'),
                    columnOp: O(style({ flex: 1.2 })),
                    
                    $body: map((pos) => {
                      const $container = $row(layoutSheet.spacing, style({ alignItems: 'center' }))

                      const $explorer = (txHash: string) => $anchor(attr({ href: wallet.getTxExplorerUrl(wallet.CHAIN.ARBITRUM, txHash) }))(
                        $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
                      )

                      if ('markPrice' in pos) {
                        return $container(
                          $text('Liquidate'),
                          $ProfitLossText(-pos.collateral),
                          $explorer(pos.id.split('-')[1])
                        )
                      } else if ('realisedPnl' in pos) {
                        return $container(
                          $text('Close'),
                          $ProfitLossText(pos.realisedPnl),
                          $explorer(pos.id.split('-')[1])
                        )
                      } else {
                        return $container(
                          $text('Increase'),
                          $ProfitLossText(pos.collateralDelta),
                          $explorer(pos.id.split('-')[1])
                        )
                      }
                    })
                  },
                  // {
                  //   $head: $text('Delta'),
                  //   columnOp: O(style({ flex: 1.2 })),
                    
                  //   $body: map((pos) => {
                  //     const $container = $row(layoutSheet.spacing)

                  //     if ('markPrice' in pos) {
                  //       return $container(
                  //         $text('Liquidate'),
                  //         $text(formatReadableUSD(pos.collateral))
                  //       )
                  //     } else if ('realisedPnl' in pos) {
                  //       return $container(
                  //         $text('Close'),
                  //         $text(formatReadableUSD(pos.realisedPnl))
                  //       )
                  //     } else {
                  //       return $container(
                  //         $text('Increase'),
                  //         $text(formatReadableUSD(pos.sizeDelta))
                  //       )
                  //     }
                  //   })
                  // },
                ]
              })({}))
            )
          }, tradeSummary)
        ),

      ),
    ),

    {
      requestChainlinkPricefeed: now(<IPageChainlinkPricefeed>{ feedAddress, from: Number(from), to: tradeType === TradeType.OPEN ? undefined : Number(to), orderBy: 'unixTimestamp' }),
      requestAggregatedTrade: now(<IRequestAggregatedTradeQueryparam>{ id: tradeId, tradeType, }),
      changeRoute
    }
  ]
})

