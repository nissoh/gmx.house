import { Behavior, combineObject, O, Op, replayLatest } from '@aelea/core'
import { $element, $node, $text, attr, attrBehavior, component, INode, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $card, $column, $row, layoutSheet, screenUtils, state, TablePageResponse } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { BaseProvider } from '@ethersproject/providers'
import { combine, constant, map, multicast, periodic, scan, snapshot, switchLatest } from '@most/core'
import { Stream } from '@most/types'
import { IAccountSummary, IClaim, parseFixed, IPageParapApi, CHAIN, IPagePositionParamApi, IChainParamApi, IAbstractTrade } from '@gambitdao/gmx-middleware'
import { $Table2 } from "../../common/$Table2"
import { $AccountPreview } from '../../components/$AccountProfile'
import { $alert } from '../../elements/$common'
import { $competitionPrize } from './$rules'
import { $riskLabel, tableRiskColumnCellBody, tableSizeColumnCellBody } from '../common'
import { CHAIN_LABEL_ID } from '../../types'


const prizeLadder: bigint[] = [parseFixed(100000, 30), parseFixed(30000, 30), parseFixed(15000, 30), ...Array(17).fill(parseFixed(1000, 30))]



export interface ICompetitonTopCumulative<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimMap: Stream<{ [k: string]: IClaim }>

  competitionNov2021LowestCumulative: Stream<IPageParapApi<IAccountSummary>>

  parentStore: <T, TK extends string = string>(key: TK, intitialState: T) => state.BrowserStore<T, TK>;
}


const $nftPrice = (rank: number, imgOp: Op<INode, INode>) => {
  const size = '54px'
  const block = style({ width: size, height: size, position: 'absolute', offset: 0 })
  const $img = $element('img')(block)

  return $row(style({ position: 'relative', width: size }))(
    $img(imgOp)(),
    $row(style({ alignItems: 'baseline', width: size, zIndex: 5, textAlign: 'center', placeContent: 'center' }))(
      $text(style({ fontSize: '1em', textShadow: `rgb(0 0 0 / 61%) 1px 1px 0px` }))(`#`),
      $text(style({ fontSize: '1.5em', lineHeight: size, textShadow: `rgb(0 0 0 / 61%) 1px 1px 0px` }))(`${rank}`),
    )
  )
}

const counter = scan((seed, n: number) => seed + n, 0, constant(1, periodic(2000)))

const blueberriesPreviewList = ['/assets/blueberriesNFT/Green.png', '/assets/blueberriesNFT/Orange.png', '/assets/blueberriesNFT/Purple.png', '/assets/blueberriesNFT/Yellow.png']

export const $CompetitionCumulative = <T extends BaseProvider>(config: ICompetitonTopCumulative<T>) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [highTableRequestIndex, highTableRequestIndexTether]: Behavior<number, number>,
) => {

  const urlFragments = document.location.pathname.split('/')
  const [chainLabel] = urlFragments.slice(1) as [keyof typeof CHAIN_LABEL_ID]
  const chain = CHAIN_LABEL_ID[chainLabel]

  const pagerOp = map((pageIndex: number): IPagePositionParamApi & IChainParamApi => {

    return {
      chain,
      offset: pageIndex * 20,
      pageSize: 20,
    }
  })

  const dataSource = replayLatest(multicast(config.competitionNov2021LowestCumulative))
  const datas = map(res => res, dataSource)

  return [

    $node(style({ gap: '46px', display: 'flex', flexDirection: screenUtils.isMobileScreen ? 'column' : 'row' }))(
      $column(layoutSheet.spacing, style({ flex: 1, padding: '0 12px' }))(
        $card(layoutSheet.spacingBig, style({ background: `radial-gradient(101% 83% at 100% 100px, ${colorAlpha(pallete.positive, .04)} 0px, ${pallete.background} 100%)`, padding: screenUtils.isMobileScreen ? '16px 8px' : '20px', margin: '0 -12px' }))(
          $Table2({
            bodyContainerOp: layoutSheet.spacing,
            scrollConfig: {
              containerOps: O(layoutSheet.spacingBig)
            },
            dataSource: datas,
            columns: [
              {
                $head: $text('Rank'),
                columnOp: style({ flex: .7, alignItems: 'center', placeContent: 'center' }),
                $body: snapshot((datasource, pos) => {

                  return $column(layoutSheet.spacingSmall)(
                    $row(style({ alignItems: 'center' }), layoutSheet.spacingSmall)(

                      switchLatest(map(claimMap => {
                        const claim = claimMap[pos.account]

                        if (!claim) {
                          return $row(
                            style({ zoom: '0.7' })(
                              $alert($text('Unclaimed'))
                            )
                          )
                        }

                        const rank = datasource.offset + datasource.page.indexOf(pos) + 1


                        let $nftPLaceholder = $row(style({ alignItems: 'baseline', zIndex: 5, textAlign: 'center', placeContent: 'center' }))(
                          $text(style({ fontSize: '1em' }))(`#`),
                          $text(style({ fontSize: '1.5em' }))(`${rank}`),
                        )

                        if (rank < 2) {
                          $nftPLaceholder = $nftPrice(rank, attrBehavior(map(n => ({ src: blueberriesPreviewList[(n % blueberriesPreviewList.length)] }), counter)))
                        }

                        if (rank < 21) {

                          return $column(layoutSheet.spacingSmall)(
                            $row(style({ alignItems: 'center' }), layoutSheet.spacingSmall)(
                              $nftPLaceholder
                            )
                          )
                        }


                        return $nftPLaceholder
                      }, config.claimMap))
                      
                    ),

                    // $text(style({ fontSize: '1em', fontWeight: 'bold' }))(
                    //   `$${readableNumber(getPrizePoolByRank(rank))}`
                    // )
                  )
                }, datas)
              },
              {
                $head: $text('Account'),
                columnOp: style({ minWidth: '120px', flex: 1.2 }),
                $body: map(({ account }) => {

                  return switchLatest(map(map => {
                    return $AccountPreview({ address: account, chain, parentRoute: config.parentRoute, claim: map[account.toLowerCase()] })({
                      profileClick: routeChangeTether()
                    })
                  }, config.claimMap))
                })
              },
              {
                $head: $text('Win/Loss'),
                columnOp: style({ maxWidth: '110px', alignItems: 'center', placeContent: 'center' }),
                $body: map((pos: IAccountSummary) => {
                  return $row(
                    $text(`${pos.winTradeCount}/${pos.settledTradeCount - pos.winTradeCount}`)
                  )
                })
              },
              ...(screenUtils.isDesktopScreen ? [
                {
                  $head: $column(style({ textAlign: 'center' }))(
                    $text('Size $'),
                    $text(style({ fontSize: '.65em' }))('Avg Leverage'),
                  ),
                  columnOp: style({ placeContent: 'center', minWidth: '125px' }),
                  $body: map((pos: IAbstractTrade) => {
                    return $riskLabel(pos)
                  })
                }
              ] : []),
              {
                $head: $column(style({ textAlign: 'center' }))(
                  $text('Prize $'),
                  $text(style({ fontSize: '.65em' }))('PnL $'),
                ),
                columnOp: style({ flex: 1, placeContent: 'flex-end' }),
                $body: snapshot((list, pos) => {
                  const prizeUsd = prizeLadder[list.offset + list.page.indexOf(pos)]

                  return $competitionPrize(prizeUsd, pos.realisedPnl)
                }, datas)
              }
            ],
          })({ scrollIndex: highTableRequestIndexTether() }),
        ),
      ),

    ),

    {
      competitionNov2021LowestCumulative: pagerOp(highTableRequestIndex),
      routeChange
    }
  ]
})


