import { Behavior, O, Op, replayLatest } from '@aelea/core'
import { $element, $node, $text, attrBehavior, component, INode, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $card, $column, $row, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { BaseProvider } from '@ethersproject/providers'
import { combine, constant, delay, empty, map, multicast, periodic, scan, snapshot, switchLatest, take } from '@most/core'
import { Stream } from '@most/types'
import { IClaim, parseFixed, IPageParapApi, IPagePositionParamApi, IChainParamApi, IAbstractTrade, formatReadableUSD, formatFixed, CHAIN } from '@gambitdao/gmx-middleware'
import { $Table2 } from "../../common/$Table2"
import { $AccountLabel, $AccountPhoto, $AccountPreview } from '../../components/$AccountProfile'
import { $alert } from '../../elements/$common'
import { $CompeititonInfo, $competitionPrize, COMPETITION_END, COMPETITION_START } from './$rules'
import { $ProfitLossText, $riskLabel } from '../common'
import { CHAIN_LABEL_ID } from '../../types'
import { IAccountLadderSummary } from 'common'
import { $Link } from '../../components/$Link'
import { displayDate } from './$CumulativePnl'


const prizeLadder: bigint[] = [parseFixed(65000, 30), parseFixed(30000, 30), parseFixed(15000, 30), ...Array(17).fill(parseFixed(1000, 30))]



export interface ICompetitonTopCumulative<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimMap: Stream<{ [k: string]: IClaim }>

  competitionCumulativeRoi: Stream<IPageParapApi<IAccountLadderSummary>>

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

export const $CompetitionRoi = <T extends BaseProvider>(config: ICompetitonTopCumulative<T>) => component((
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

  const tableList = replayLatest(map(res => {
    return res
  }, multicast(config.competitionCumulativeRoi))
  )

  
  const newLocal = take(1, tableList)
  return [
    $node(style({ gap: '46px', display: 'flex', flexDirection: screenUtils.isMobileScreen ? 'column' : 'row' }))(
      $column(layoutSheet.spacing, style({ flex: 1, padding: '0 12px' }))(

        switchLatest(combine((page, claimMap) => {
          const list = page.page

          return $row(style({ alignItems: 'flex-end', placeContent: 'center', marginBottom: '40px' }))(
            $Link({
              route: config.parentRoute.create({ fragment: '2121212' }),
              $content: $column(layoutSheet.spacing, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
                style({ border: `2px solid ${pallete.background}`, boxShadow: `${colorAlpha(pallete.background, .15)} 0px 0px 20px 11px` }, $AccountPhoto(list[1].account, claimMap[list[1].account], '140px')),
                $column(layoutSheet.spacingTiny, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
                  $AccountLabel(list[1].account, claimMap[list[1].account], style({ color: pallete.primary, fontSize: '1em' })),
                  $text(style({ fontSize: '.75em' }))(`${formatFixed(list[1].roi, 2)}%`)
                )
              ),
              anchorOp: style({ minWidth: 0 }),
              url: `/${chain === CHAIN.ARBITRUM ? 'arbitrum' : 'avalanche'}/account/${list[1].account}`,
            })({ click: routeChangeTether() }),
            $Link({
              route: config.parentRoute.create({ fragment: '2121212' }),
              $content: $column(layoutSheet.spacing, style({ alignItems: 'center', margin: '0 -20px', pointerEvents: 'none', textDecoration: 'none' }))(
                style({ border: `2px solid ${pallete.positive}`, boxShadow: `${colorAlpha(pallete.positive, .15)} 0px 0px 20px 11px` }, $AccountPhoto(list[0].account, claimMap[list[0].account], '185px')),
                $column(layoutSheet.spacingTiny, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
                  $AccountLabel(list[0].account, claimMap[list[0].account], style({ color: pallete.primary, fontSize: '1em' })),
                  $text(style({ fontSize: '.75em' }))(`${formatFixed(list[0].roi, 2)}%`)
                )
              ),
              anchorOp: style({ minWidth: 0, zIndex: 222 }),
              url: `/${chain === CHAIN.ARBITRUM ? 'arbitrum' : 'avalanche'}/account/${list[0].account}`,
            })({ click: routeChangeTether() }),
            $Link({
              route: config.parentRoute.create({ fragment: '2121212' }),
              $content: $column(layoutSheet.spacing, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
                style({ border: `2px solid ${pallete.background}`, boxShadow: `${colorAlpha(pallete.background, .15)} 0px 0px 20px 11px` }, $AccountPhoto(list[0].account, claimMap[list[2].account], '140px')),
                $column(layoutSheet.spacingTiny, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
                  $AccountLabel(list[2].account, claimMap[list[2].account], style({ color: pallete.primary, fontSize: '1em' })),
                  $text(style({ fontSize: '.75em' }))(`${formatFixed(list[2].roi, 2)}%`)
                )
              ),
              anchorOp: style({ minWidth: 0 }),
              url: `/${chain === CHAIN.ARBITRUM ? 'arbitrum' : 'avalanche'}/account/${list[2].account}`,
            })({ click: routeChangeTether() })
          )
        }, newLocal, config.claimMap)),

        $column(style({ alignItems: 'center' }))(
          $row(style({ width: '780px', }))(
            $column(layoutSheet.spacingSmall, style({ marginBottom: '26px', flex: 1 }))(
              $text(style({}))(`Highest ROI (%)`),
              $text(style({ fontSize: '.75em' }))(`ROI (%) is defined as: Profits / Max Collateral * 100`),
            ),

            $row(
              $text(style({
                color: pallete.positive,
                fontSize: '1.75em',
                textShadow: `${pallete.positive} 1px 1px 20px, ${pallete.positive} 0px 0px 20px`
              }))('$125,000')
            )
          ),

          $Table2({
            $container: $card(
              layoutSheet.spacingBig,
              screenUtils.isDesktopScreen
                ? style({ padding: '28px 50px', width: '780px', })
                : style({ padding: '16px 8px', margin: '0 -12px' })
            ),
            scrollConfig: {
              containerOps: O(layoutSheet.spacingBig)
            },
            dataSource: tableList,
            columns: [

              {
                $head: $text('Account'),
                columnOp: style({ minWidth: '120px', flex: 1.2, alignItems: 'center' }),
                $body: snapshot((datasource, pos: IAccountLadderSummary) => {

                  return $row(layoutSheet.spacingSmall)(

                    $row(layoutSheet.spacingSmall)(

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


                        return $row(style({ alignItems: 'baseline', zIndex: 5, textAlign: 'center', placeContent: 'center' }))(
                          $text(style({ fontSize: '.65em' }))(`${rank}`),
                        )

                        // if (rank < 2) {
                        //   $nftPLaceholder = $nftPrice(rank, attrBehavior(map(n => ({ src: blueberriesPreviewList[(n % blueberriesPreviewList.length)] }), counter)))
                        // }

                        // if (rank < 21) {

                        //   return $column(layoutSheet.spacingSmall)(
                        //     $row(style({ alignItems: 'center' }), layoutSheet.spacingSmall)(
                        //       $nftPLaceholder
                        //     )
                        //   )
                        // }


                        // return $nftPLaceholder
                      }, config.claimMap))

                    ),
                    switchLatest(map(map => {
                      return $AccountPreview({ address: pos.account, chain, parentRoute: config.parentRoute, claim: map[pos.account.toLowerCase()] })({
                        profileClick: routeChangeTether()
                      })
                    }, config.claimMap)),

                    // $text(style({ fontSize: '1em', fontWeight: 'bold' }))(
                    //   `$${readableNumber(getPrizePoolByRank(rank))}`
                    // )
                  )
                }, tableList)
              }
              ,
              // {
              //   $head: $text('Account'),
              //   columnOp: style({ minWidth: '120px', flex: 1.2 }),
              //   $body: map(({ account }) => {

              //     return switchLatest(map(map => {
              //       return $AccountPreview({ address: account, chain, parentRoute: config.parentRoute, claim: map[account.toLowerCase()] })({
              //         profileClick: routeChangeTether()
              //       })
              //     }, config.claimMap))
              //   })
              // },
              {
                $head: $text('Win/Loss'),
                columnOp: style({ maxWidth: '88px', alignItems: 'center', placeContent: 'center' }),
                $body: map(pos => {
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
                },
                {
                  $head: $text('Pnl $'),
                  columnOp: style({ placeContent: 'center', minWidth: '125px' }),
                  $body: map((pos: IAccountLadderSummary) => {
                    const val = formatReadableUSD(pos.pnl)
                    const isNeg = pos.pnl < 0n

                    return $row(
                      $column(style({ alignItems: 'center' }))(
                        // prize ? style({ fontSize: '1.3em' })($ProfitLossText(prize)) : empty(),
                        style({ color: pallete.message })(
                          $text(style({ color: isNeg ? pallete.negative : pallete.positive }))(
                            `${isNeg ? '' : '+'}${val}`
                          )
                        )
                      )
                    )
                  })
                }
              ] : []),
              {
                $head: $column(style({ placeContent: 'flex-end', alignItems: 'flex-end' }))(
                  $text('Prize $'),
                  $text(style({ fontSize: '.65em' }))('ROI %'),
                ),
                columnOp: style({ flex: 1, alignItems: 'flex-end', placeContent: 'flex-end' }),
                $body: snapshot((list, pos) => {
                  const prizeUsd = prizeLadder[list.offset + list.page.indexOf(pos)]

                  return $column(
                    style({ fontSize: '1.3em' })($ProfitLossText(prizeUsd)),
                    $text(`${formatFixed(pos.roi, 2)}%`)
                  )
                }, tableList)
              }
            ],
          })({ scrollIndex: highTableRequestIndexTether() }),
        )
      ),

    ),

    {
      competitionCumulativeRoi: pagerOp(highTableRequestIndex),
      routeChange
    }
  ]
})


