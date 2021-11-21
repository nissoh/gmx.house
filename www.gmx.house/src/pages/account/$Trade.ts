import { Behavior, O } from "@aelea/core"
import { $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $card, $column, $icon, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, multicast, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { ARBITRUM_TRADEABLE_ADDRESS, CHAINLINK_USD_FEED_ADRESS, formatReadableUSD, fromJson, IAggregatedOpenPositionSummary, IAggregatedPositionSettledSummary, IAggregatedTradeAll, IChainlinkPrice, IClaim, IPageChainlinkPricefeed, IPositionDecrease, IPositionIncrease, IPositionLiquidated, IRequestAggregatedTradeQueryparam, isLiquidated, isTradeSettled, TradeType } from "gambit-middleware"
import * as wallet from "@gambitdao/wallet-link"
import { $buttonAnchor } from "../../components/form/$Button"
import { $anchor } from "../../elements/$common"
import { $ethScan, $twitter } from "../../elements/$icons"
import { $ProfitLossText, $TokenIndex, timeSince } from "../common"
import { $TradeCardPreview } from "./$TradeCardPreview"
import { $Table2 } from "../../common/$Table2"


export interface ITrade {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  aggregatedTrade: Stream<IAggregatedTradeAll>
  chainlinkPricefeed: Stream<IChainlinkPrice[]>
  claimMap: Stream<Map<string, IClaim>>

  parentRoute?: Route
}


const $explorer = (txHash: string) => $anchor(attr({ href: wallet.getTxExplorerUrl(wallet.CHAIN.ARBITRUM, txHash) }))(
  $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
)

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
  
  
  const $label = (label: string, value: string) => {

    const $container = screenUtils.isDesktopScreen ? $row(layoutSheet.spacingSmall) : $column(layoutSheet.spacingTiny)

    return $container(
      $text(style({ color: pallete.foreground }))(label),
      $text(style({  }))(value)
    )
  }

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
            const isSettled = isTradeSettled(trade)

            const txHash = (isSettled ? summary.trade.id : summary.trade.initialPosition.id).split('-')[1]
            
            return $row(layoutSheet.spacingBig, style({ fontSize: '.85em', placeContent: 'center', alignItems: 'center', }))(
              $row(layoutSheet.spacingSmall, style({ alignItems: 'self-end' }))(
                isSettled ? $label('Settled', timeSince(trade.settledPosition.indexedAt)) : $label('Opened', timeSince(summary.startTimestamp)),

                $explorer(txHash),
              ),

              $labelUSD('Collateral', summary.collateral),

              $buttonAnchor(attr({
                href: `https://twitter.com/intent/tweet?text=Here's my GMX Trading Competition Entry $GMX $redvsgreen $cryptotrading \n${document.location.href}`
              }))(  
                $icon({
                  $content: $twitter,
                  width: '14px',
                  viewBox: '0 0 24 24'
                }),
                $text('Share'),
              )
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
            const isLiqqed = isTradeSettled(trade) && isLiquidated(trade.settledPosition)
            const actionList: (IPositionIncrease | IPositionDecrease)[] = [...summary.trade.increaseList, ...summary.trade.decreaseList].sort((a, b) => b.indexedAt - a.indexedAt)

            if (isLiqqed) {
              const { markPrice, id } = trade.settledPosition as IPositionLiquidated
              const upadte: IPositionDecrease = {
                ...trade.initialPosition,
                collateralDelta: 0n,
                fee: 0n,
                __typename: "DecreasePosition",
                price: markPrice,
                id
              }
              actionList.unshift(upadte)
            }

            return $column(layoutSheet.spacingBig, style({ padding: screenUtils.isDesktopScreen ? '' : '0 8px' }))(
              $row(layoutSheet.spacing, style({ fontSize: '.85em', placeContent: 'space-between', flex: 1, alignSelf: 'stretch' }))(
                $label('Open Date', new Date(summary.startTimestamp * 1000).toUTCString()),

                $labelUSD('Paid fees', summary.fee),
                // $labelUSD('Average Price', summary.averagePrice),
              ),

              $card($Table2({
                dataSource: now(actionList),
                bodyContainerOp: layoutSheet.spacing,
                scrollConfig: {
                  containerOps: O(layoutSheet.spacingBig)
                },
                columns: [
                  {
                    $head: $text('Timestamp'),
                    columnOp: O(style({  flex: 1 })),

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

                      const actionType = pos.__typename === "DecreasePosition"
                        ? pos.collateralDelta === 0n ? actionList.indexOf(pos) === 0 ? pos.fee === 0n ? 'Liquidated' : 'Close' : 'Decrease' : 'Decrease'
                        : actionList.indexOf(pos) === actionList.length - 1 ? 'Open' : 'Increase'

                      return $container(
                        $text(actionType),
                        $explorer(pos.id.split('-')[1])
                      )
                    })
                  },
                  {
                    $head: $text('Collateral Delta'),
                    columnOp: O(style({ flex: 1.2 })),
                    $body: map((pos) => {

                      if (pos.collateralDelta === 0n) {
                        return $text('')
                      }

                      const $token = $TokenIndex(pos.collateralToken as ARBITRUM_TRADEABLE_ADDRESS, { width: '18px' })
                      const $container = $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))
                      const isDecrease = pos.__typename === "DecreasePosition"

                      return $container(
                        $token,
                        $ProfitLossText(isDecrease ? -pos.collateralDelta : pos.collateralDelta, false),
                      )
                    })
                  },
                  {
                    $head: $text('Size Delta'),
                    columnOp: O(style({ flex: 1.2 })),
                    
                    $body: map((pos) => {
                      const $container = $row(layoutSheet.spacing, style({ alignItems: 'center' }))

                      const isDecrease = pos.__typename === "DecreasePosition"

                      return $container(
                        $ProfitLossText(isDecrease ? -pos.sizeDelta : pos.sizeDelta, false),
                      )
                    })
                  },
                  {
                    $head: $text('Market Price'),
                    columnOp: O(style({ flex: .5 })),
                    
                    $body: map((pos) => {
                      const $container = $row(layoutSheet.spacing, style({ alignItems: 'center' }))
                      return $container(
                        $text(formatReadableUSD(pos.price)),
                      )
                    })
                  },
                ]
              })({}))
            )
          }, tradeSummary)
        ),

      ),
    ),

    {
      requestChainlinkPricefeed: now(<IPageChainlinkPricefeed>{ feedAddress, from: Number(from), to: tradeType === TradeType.OPEN ? null : Number(to), orderBy: 'unixTimestamp' }),
      requestAggregatedTrade: now(<IRequestAggregatedTradeQueryparam>{ id: tradeId, tradeType, }),
      changeRoute
    }
  ]
})

