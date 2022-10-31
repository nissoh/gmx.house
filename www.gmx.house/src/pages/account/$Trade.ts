import { Behavior, O } from "@aelea/core"
import { $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $card, $column, $icon, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, multicast, now, periodic, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import {
  ARBITRUM_TRADEABLE_ADDRESS, formatReadableUSD, IPricefeed, IClaim, getMappedKeyByValue, IPositionDecrease, IPositionIncrease, IRequestTradeQueryparam, isTradeSettled, isTradeLiquidated,
  ITrade, CHAIN, IPriceLatestMap, getTokenDescription, IChainParamApi, TOKEN_ADDRESS_TO_SYMBOL, TOKEN_SYMBOL, IPricefeedParamApi, AVALANCHE_TRADEABLE_ADDRESS,
  CHAIN_TOKEN_ADDRESS_TO_SYMBOL, unixTimestampNow, getTxExplorerUrl
} from "@gambitdao/gmx-middleware"
import { $buttonAnchor } from "../../components/form/$Button"
import { $anchor } from "../../elements/$common"
import { $ethScan, $twitter } from "../../elements/$icons"
import { $ProfitLossText, $TokenIndex, getPricefeedVisibleColumns, timeSince } from "../common"
import { $TradeCardPreview } from "./$TradeCardPreview"
import { $Table2 } from "../../common/$Table2"
import { CHAIN_LABEL_ID } from "../../types"



export interface ITradeView {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  trade: Stream<ITrade>
  pricefeedRange: Stream<IPricefeed[]>
  claimMap: Stream<{ [k: string]: IClaim }>
  latestPriceMap: Stream<IPriceLatestMap>

  parentRoute?: Route
}



export const $Trade = (config: ITradeView) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {

  const urlFragments = document.location.pathname.split('/')
  const [chainLabel, ticker, tradeId, from, to] = urlFragments.slice(1) as [keyof typeof CHAIN_LABEL_ID, TOKEN_SYMBOL, string, string, string]


  // @ts-ignore
  const chain: CHAIN.AVALANCHE | CHAIN.ARBITRUM = CHAIN_LABEL_ID[chainLabel.toLowerCase()]

  // @ts-ignore
  const tokenAddress = getMappedKeyByValue(CHAIN_TOKEN_ADDRESS_TO_SYMBOL[chain], ticker) as ARBITRUM_TRADEABLE_ADDRESS | AVALANCHE_TRADEABLE_ADDRESS


  const tradeSummary: Stream<ITrade | null> = multicast(config.trade)

  const requestLatestPriceMap: Stream<IChainParamApi> = constant({ chain }, periodic(5000))

  const $mainContainer = screenUtils.isDesktopScreen
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


  const toParsed = Number(to || unixTimestampNow())
  const fromParsed = Number(from)

  
  const requestPricefeed: Stream<IPricefeedParamApi> = now({
    from: fromParsed, to: toParsed,
    chain, tokenAddress,
    interval: getPricefeedVisibleColumns(80, fromParsed, toParsed)
  })

  return [
    $mainContainer(

      $column(layoutSheet.spacingBig, style({ flex: 1 }))(

        switchLatest(
          map(trade => {
            if (trade === null) {
              return empty()
            }

            const isSettled = isTradeSettled(trade)
            const token = getTokenDescription(trade.indexToken)

            return $row(layoutSheet.spacingBig, style({ fontSize: '.85em', placeContent: 'center', alignItems: 'center', }))(
              $row(layoutSheet.spacingSmall, style({ alignItems: 'self-end' }))(
                $label(isSettled ? 'Settled' : 'Opened', timeSince(trade.timestamp)),
              ),

              $labelUSD('Collateral', trade.collateral),

              $buttonAnchor(attr({
                href: `https://twitter.com/intent/tweet?text=$${formatReadableUSD(trade.size)} ${trade.isLong ? 'Long' : 'Short'} ${token.symbol} trade on GMX \n${document.location.href}`
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
          pricefeed: config.pricefeedRange,
          tradeSource: tradeSummary,
          containerOp: style({ position: 'relative', width: '100%', zIndex: 0, height: '326px', overflow: 'hidden', alignSelf: 'center', boxShadow: `rgb(0 0 0 / 15%) 0px 2px 11px 0px, rgb(0 0 0 / 11%) 0px 5px 45px 16px`, borderRadius: '6px', backgroundColor: pallete.background, }),
          latestPriceMap: config.latestPriceMap,
          accountPreview: {
            parentRoute: config.parentRoute
          },
          claimMap: config.claimMap
        })({ accountPreviewClick: changeRouteTether() }),

        switchLatest(
          map(trade => {
            if (trade === null) {
              return empty()
            }

            const actionList: (IPositionIncrease | IPositionDecrease)[] = [...trade.increaseList, ...trade.decreaseList].sort((a, b) => b.timestamp - a.timestamp)

            if (isTradeLiquidated(trade)) {
              const { id } = trade
              const upadte: IPositionDecrease = {
                ...trade,
                collateralDelta: 0n,
                fee: 0n,
                __typename: "DecreasePosition",
                price: trade.decreaseList[trade.decreaseList.length - 1].price,
                id
              }
              actionList.unshift(upadte)
            }

            return $column(layoutSheet.spacingBig, style({ padding: screenUtils.isDesktopScreen ? '' : '0 8px' }))(
              $row(layoutSheet.spacing, style({ fontSize: '.85em', placeContent: 'space-between', flex: 1, alignSelf: 'stretch' }))(
                $label('Open Date', new Date(trade.timestamp * 1000).toUTCString()),

                $labelUSD('Paid fees', trade.fee),
                // $labelUSD('Average Price', summary.averagePrice),
              ),
              
              $Table2({
                dataSource: now(actionList),
                $container: $card,
                scrollConfig: {
                  containerOps: O(layoutSheet.spacingBig)
                },
                columns: [
                  {
                    $head: $text('Timestamp'),
                    columnOp: O(style({ flex: 1 })),

                    $body: map((pos) => {
                      return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
                        $text(timeSince(pos.timestamp)),
                        $text(new Date(pos.timestamp * 1000).toLocaleDateString()),
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

                      const [_, txHash] = pos.id.split(':')
                      return $container(
                        $text(actionType),
                        $anchor(attr({ href: getTxExplorerUrl(chain, txHash) }))(
                          $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
                        )
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

                      const $token = $TokenIndex(TOKEN_ADDRESS_TO_SYMBOL[pos.collateralToken], { width: '18px' })
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
              })({})
            )
          }, tradeSummary)
        ),

      ),
    ),

    {
      requestPricefeed,
      requestTrade: now(<IRequestTradeQueryparam>{ id: tradeId, chain }),
      requestLatestPriceMap,
      changeRoute
    }
  ]
})

