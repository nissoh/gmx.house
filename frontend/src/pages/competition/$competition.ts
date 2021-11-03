import { Behavior, combineArray, O, Op } from '@aelea/core'
import { $element, $node, $text, attr, component, INode, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $card, $column, $row, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { BaseProvider } from '@ethersproject/providers'
import { empty, map, switchLatest } from '@most/core'
import { Stream } from '@most/types'
import { calculateSettledPositionDelta, formatFixed, IAggregatedPositionSettledSummary, IAggregatedTradeSummary, IClaim, IPagableResponse, IPageable, readableNumber, TradeType } from 'gambit-middleware'
import { $Table2 } from "../../common/$Table2"
import { $AccountPreview } from '../../components/$AccountProfile'
import { $Link } from "../../components/$Link"
import { $Entry } from "../common"





export interface ICompetitonTopPercentage<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimMap: Stream<Map<string, IClaim>>

  competitionNov2021HighestPercentage: Stream<IPagableResponse<IAggregatedPositionSettledSummary>>
  competitionNov2021LowestPercentage: Stream<IPagableResponse<IAggregatedPositionSettledSummary>>

  parentStore: <T, TK extends string = string>(key: TK, intitialState: T) => state.BrowserStore<T, TK>;
}


export const $settledPercentage = (pos: IAggregatedPositionSettledSummary) => {
  const delta = calculateSettledPositionDelta(pos.trade)

  const perc = formatFixed(delta.deltaPercentage, 2)
  const isNeg = delta.deltaPercentage < 0n

  return $row(
    $text(style({ color: isNeg ? pallete.negative : pallete.positive }))(
      `${isNeg ? '' : '+'}${perc}%`
    )
  )
}

const $nftPrice = (rank: number, imgOp: Op<INode, INode>) => {
  const block = style({ width: '34px', height: '34px' })
  const $img = $element('img')(block)

  if (rank > 1) {
    return $row(style({ position: 'relative' }))(
      $text(style({ width: '34px', textAlign: 'center', lineHeight: '34px', color: pallete.foreground, fontWeight: 'bold' }), block)('?'),
      $img(style({ opacity: '.15', position: 'absolute', offset: '0' }), imgOp)()
    )
  }
  
  return $img(imgOp)()
}

export const $Competition = <T extends BaseProvider>(config: ICompetitonTopPercentage<T>) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [highTableRequestIndex, highTableRequestIndexTether]: Behavior<number, number>,
  [lowTableRequestIndex, lowTableRequestIndexTether]: Behavior<number, number>,
) => {



  const pagerOp = map((pageIndex: number): IPageable => {

    return {
      offset: pageIndex * 20,
      pageSize: 20,
    }
  })



  return [

    $column(
      
      $column(layoutSheet.spacing, style({ alignItems: 'center', placeContent: 'center', marginBottom: '60px', }))(
        $text(style({ fontSize: '.85em' }))('Highest Percentage PnL for a single trade'),
        $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
          $text(style({ fontSize: '2.5em', fontWeight: 'bold', color: pallete.negative, textShadow: `1px 1px 50px ${pallete.negative}, 1px 1px 50px rgb(250 67 51 / 59%) ` }))('RED'),
          $text(style({}))('vs.'),
          $text(style({ fontSize: '2.5em', fontWeight: 'bold', color:pallete.positive, textShadow: `1px 1px 50px ${pallete.positive}` }))('GREEN'),
        ),
        
        $text(style({ fontSize: '.85em' }))('+$100 Trades of Nov 2-16'),
      ),

      $node(style({ gap: '46px', display: 'flex', flexDirection: screenUtils.isMobileScreen ? 'column' : 'row' }))(

        
        $column(layoutSheet.spacing, style({ flex: 1, padding: '0 12px' }))(
          $card(layoutSheet.spacingBig, style({ background: `radial-gradient(101% 83% at 100% 100px, ${colorAlpha(pallete.positive, .04)} 0px, ${pallete.background} 100%)`, padding: screenUtils.isMobileScreen ? '16px 8px' : '20px', margin: '0 -12px' }))(
            $Table2<IAggregatedPositionSettledSummary & {claimMap: Map<string, IClaim>, index: number}>({
              bodyContainerOp: layoutSheet.spacing,
              scrollConfig: {
                containerOps: O(layoutSheet.spacingBig)
              },
              dataSource: combineArray((claimMap, res) => {
                return {
                  data: res.page.map((item, index) => {
                    return { ...item, claimMap, index: index + res.offset }
                  }),
                  pageSize: res.pageSize,
                  offset: res.offset,
                }
              }, config.claimMap, config.competitionNov2021HighestPercentage),
              columns: [
                {
                  $head: $text('Rank'),
                  columnOp: style({ flex: .7, alignItems: 'center', placeContent: 'center' }),
                  $body: map((pos) => {
                    const rank = pos.index + 1

                    if (rank < 21) {
                      return $column(layoutSheet.spacingSmall)(
                        $row(style({ alignItems: 'center' }), layoutSheet.spacingSmall)(
                          $row(style({ alignItems: 'baseline' }))(
                            $text(style({ fontSize: '1em', color: pallete.foreground }))(`#`),
                            $text(style({ fontSize: '1.5em', lineHeight: 1 }))(`${rank}`),
                          ),
                          rank < 6 ? $nftPrice(rank, attr({ src: '/assets/blueberriesNFT/high.jpg' })): empty(),
                        ),
                        // $text(style({ fontSize: '1em', fontWeight: 'bold' }))(
                        //   `$${readableNumber(getPrizePoolByRank(rank))}`
                        // )
                      )
                    }

                    return $row()
                  })
                },
                {
                  $head: $text('Account'),
                  columnOp: style({ minWidth: '120px', flex: 1.2 }),
                  $body: map(({ account }: IAggregatedTradeSummary) => {

                    return switchLatest(map(map => {
                      return $AccountPreview({ address: account, parentRoute: config.parentRoute, claim: map.get(account.toLowerCase()) })({
                        profileClick: routeChangeTether()
                      })
                    }, config.claimMap))
                  })
                },
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ maxWidth: '58px', flexDirection: 'column' }), layoutSheet.spacingTiny),
                  $body: map((pos) => {
                    const settlement = pos.trade.settledPosition
                    const type = 'markPrice' in settlement ? TradeType.LIQUIDATED : TradeType.CLOSED

                    return $Link({
                      anchorOp: style({ position: 'relative' }),
                      $content: style({ pointerEvents: 'none' }, $Entry(pos)),
                      url: `/p/account/${pos.trade.initialPosition.indexToken}-${type}-${pos.trade.initialPosition.indexedAt}-${settlement.indexedAt}/${pos.trade.id.split('-')[1]}`,
                      route: config.parentRoute.create({ fragment: '2121212' })
                    })({ click: routeChangeTether() })
                  })
                },
                {
                  $head: $text('Profit-%'),
                  columnOp: style({ flex:1, placeContent: 'flex-end', maxWidth: '110px' }),
                  $body: map((pos) => {
                    return $settledPercentage(pos)
                  })
                }
              ],
            })({ scrollIndex: highTableRequestIndexTether() }),
          ),
        ),
        $column(layoutSheet.spacing, style({ flex: 1, padding: '0 12px' }))(
          $card(layoutSheet.spacingBig, style({ background: `radial-gradient(101% 83% at 0% 100px, ${colorAlpha(pallete.negative, .1)} 0px, ${pallete.background} 100%)`, padding: screenUtils.isMobileScreen ? '16px 8px' : '20px', margin: '0 -12px' }))(
            $Table2<IAggregatedPositionSettledSummary & {claimMap: Map<string, IClaim>, index: number}>({
              bodyContainerOp: layoutSheet.spacing,
              scrollConfig: {
                containerOps: O(layoutSheet.spacingBig)
              },
              dataSource: combineArray((claimMap, res) => {
                return {
                  data: res.page.map((item, index) => {
                    return { ...item, claimMap, index: index + res.offset }
                  }),
                  pageSize: res.pageSize,
                  offset: res.offset,
                }
              }, config.claimMap, config.competitionNov2021LowestPercentage),
              columns: [
                {
                  $head: $text('Rank'),
                  columnOp: style({ flex: .7, alignItems: 'center', placeContent: 'center' }),
                  $body: map((pos) => {
                    const rank = pos.index + 1

                    if (rank < 21) {
                      return $column(layoutSheet.spacingSmall)(
                        $row(style({ alignItems: 'center' }), layoutSheet.spacingSmall)(
                          $row(style({ alignItems: 'baseline' }))(
                            $text(style({ fontSize: '1em', color: pallete.foreground }))(`#`),
                            $text(style({ fontSize: '1.5em', lineHeight: 1 }))(`${rank}`),
                          ),
                          rank < 2 ? $nftPrice(rank, attr({ src: '/assets/blueberriesNFT/low.jpg' })): empty(),
                        ),
                        // $text(style({ fontSize: '1em', fontWeight: 'bold' }))(
                        //   `$${readableNumber(getPrizePoolByRank(rank))}`
                        // )
                      )
                    }

                    return $row()
                  })
                },
                {
                  $head: $text('Account'),
                  columnOp: style({ minWidth: '120px' }),
                  $body: map(({ account }: IAggregatedTradeSummary) => {

                    return switchLatest(map(map => {
                      return $AccountPreview({ address: account, parentRoute: config.parentRoute, claim: map.get(account.toLowerCase()) })({
                        profileClick: routeChangeTether()
                      })
                    }, config.claimMap))
                  })
                },
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ maxWidth: '58px', flexDirection: 'column' }), layoutSheet.spacingTiny),
                  $body: map((pos) => {
                    const settlement = pos.trade.settledPosition
                    const type = 'markPrice' in settlement ? TradeType.LIQUIDATED : TradeType.CLOSED

                    return $Link({
                      anchorOp: style({ position: 'relative' }),
                      $content: style({ pointerEvents: 'none' }, $Entry(pos)),
                      url: `/p/account/${pos.trade.initialPosition.indexToken}-${type}-${pos.trade.initialPosition.indexedAt}-${settlement.indexedAt}/${pos.trade.id.split('-')[1]}`,
                      route: config.parentRoute.create({ fragment: '2121212' })
                    })({ click: routeChangeTether() })
                  })
                },
                {
                  $head: $text('Profit-%'),
                  columnOp: style({ flex:1, placeContent: 'flex-end', maxWidth: '110px' }),
                  $body: map((pos) => {
                    return $settledPercentage(pos)
                  })
                }
              ],
            })({ scrollIndex: lowTableRequestIndexTether() }),
          ),
        ),
      ),
    ),


    {
      competitionNov2021LowestPercentage: pagerOp(highTableRequestIndex),
      competitionNov2021HighestPercentage: pagerOp(lowTableRequestIndex),
      routeChange
    }
  ]
})


