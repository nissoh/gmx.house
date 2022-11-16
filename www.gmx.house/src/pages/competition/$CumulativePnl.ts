import { Behavior, O, replayLatest } from '@aelea/core'
import { $text, component, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $card, $column, $row, $seperator, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { BaseProvider } from '@ethersproject/providers'
import { combine, empty, map, multicast, snapshot, switchLatest, take } from '@most/core'
import { Stream } from '@most/types'
import { IClaim, IPageParapApi, IPagePositionParamApi, IChainParamApi, IAbstractTrade, formatFixed, CHAIN, ITimerangeParamApi, unixTimestampNow } from '@gambitdao/gmx-middleware'
import { $Table2 } from "../../common/$Table2"
import { $AccountLabel, $AccountPhoto, $AccountPreview, $ProfilePreviewClaim } from '../../components/$AccountProfile'
import { $riskLabel } from '../common'
import { CHAIN_LABEL_ID } from '../../types'
import { IAccountLadderSummary } from 'common'
import { $Link } from '../../components/$Link'
import { $alertTooltip, $avaxIcon, formatReadableUSD } from './$rules'
import { IWalletLink } from '@gambitdao/wallet-link'
import { $leverage } from '../../elements/$common'


const prizeLadder: string[] = ['1500', '900', '600']



export interface ICompetitonTopCumulative<T extends BaseProvider> extends ITimerangeParamApi, IChainParamApi {
  walletLink: IWalletLink
  parentRoute: Route
  provider?: Stream<T>
  claimMap: Stream<{ [k: string]: IClaim }>
  walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">


  competitionCumulativePnl: Stream<IPageParapApi<IAccountLadderSummary>>

  parentStore: <T, TK extends string = string>(key: TK, intitialState: T) => state.BrowserStore<T, TK>;
}




export const $CumulativePnl = <T extends BaseProvider>(config: ICompetitonTopCumulative<T>) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [highTableRequestIndex, highTableRequestIndexTether]: Behavior<number, number>,
) => {

  const urlFragments = document.location.pathname.split('/')
  const [chainLabel] = urlFragments.slice(1) as [keyof typeof CHAIN_LABEL_ID]
  const chain = CHAIN_LABEL_ID[chainLabel]

  const pagerOp = map((pageIndex: number): IPagePositionParamApi & ITimerangeParamApi & IChainParamApi => {

    return {
      chain: config.chain,
      from: config.from,
      to: config.to,
      offset: pageIndex * 20,
      pageSize: 20,
    }
  })

  const tableList = replayLatest(map(res => {
    return res
  }, multicast(config.competitionCumulativePnl))
  )


  const newLocal = take(1, tableList)
  return [
    $column(

      unixTimestampNow() >= config.to
        ? switchLatest(combine((page, claimMap) => {
          const list = page.page

          return $row(style({ alignItems: 'flex-end', placeContent: 'center', marginBottom: '40px', position: 'relative' }))(
            // $column(style({ alignItems: 'center' }))(
            //   $text(`Ending in`),
            //   $text(style({ fontWeight: 'bold', fontSize: '3em' }))(countdown(config.to)),
            // ),
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
        }, newLocal, config.claimMap))
        : empty(),




      $row(layoutSheet.spacing)(
        $column(layoutSheet.spacingSmall, style({ marginBottom: '26px', flex: 1 }))(
          $text(style({}))(`Highest Notional P&L`),
          $text(style({ fontSize: '.75em' }))(`Sum of all realized and unrealized profits and losses, including open positions at the deadline.`),
        ),

        $row(
          $text(style({
            color: pallete.positive,
            fontSize: '1.75em',
            textShadow: `${pallete.positive} 1px 1px 20px, ${pallete.positive} 0px 0px 20px`
          }))('~$50,000')
        )
      ),

      switchLatest(combine((account, chain) => {

        if (!account || !chain) {
          return empty()
        }

        return $row(style({ backgroundColor: pallete.background, borderLeft: 0, borderRadius: '30px', alignSelf: 'center', marginBottom: '30px', padding: '20px' }))(

          switchLatest(map(map => {

            return $ProfilePreviewClaim({
              address: account,
              chain,
              claimMap: config.claimMap, walletStore: config.walletStore, walletLink: config.walletLink,
              avatarSize: '55px', labelSize: '1.2em',
            })({
              // walletChange: walletChangeTether()
            })

          }, config.claimMap)),


        )
      }, config.walletLink.account, config.walletLink.network)),


      $Table2({
        $container: $card(layoutSheet.spacingBig, style(screenUtils.isDesktopScreen ? { padding: "28px 40px" } : {})),
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
                        $alertTooltip($text(style({ whiteSpace: 'pre-wrap', fontSize: '.75em' }))(`Unclaimed profile remains below until claimed`)),
                        // style({ zoom: '0.7' })(
                        //   $alert($text('Unclaimed'))
                        // )
                      )
                    }

                    const rank = datasource.offset + datasource.page.indexOf(pos) + 1


                    return $row(style({ alignItems: 'baseline', zIndex: 5, textAlign: 'center', placeContent: 'center' }))(
                      $text(style({ fontSize: '.65em' }))(`${rank}`),
                    )

                  }, config.claimMap))

                ),
                switchLatest(map(map => {
                  return $AccountPreview({ address: pos.account, chain, parentRoute: config.parentRoute, claim: map[pos.account.toLowerCase()] })({
                    profileClick: routeChangeTether()
                  })
                }, config.claimMap)),


              )
            }, tableList)
          },
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
                $text('PnL $'),
                $text(style({ fontSize: '.65em' }))('Size @ Avg. Leverage'),
              ),
              columnOp: style({ placeContent: 'center', minWidth: '125px' }),
              $body: map((pos: IAccountLadderSummary) => {
                return $column(layoutSheet.spacingTiny, style({ textAlign: 'center' }))(
                  $text(style({ fontSize: '1.25em' }))(`${formatReadableUSD(pos.pnl)}`),
                  $seperator,
                  $row(layoutSheet.spacingSmall, style({ fontSize: '.75em', alignItems: 'center', placeContent: 'center' }))(
                    $text(formatReadableUSD(pos.size)),
                    $text(style({ color: pallete.foreground, fontSize: '.75em' }))(' @ '),
                    style({ textAlign: 'center' }, $leverage(pos)),
                  )
                )
              })
            }
          ] : []),
          {
            $head: $column(style({ placeContent: 'flex-end', alignItems: 'flex-end' }))(
              $text('Prize $'),
              $text(style({ fontSize: '.65em' }))('Profits'),
            ),
            columnOp: style({ flex: 1, alignItems: 'center', placeContent: 'flex-end' }),
            $body: snapshot((list, pos) => {
              const prize = prizeLadder[list.offset + list.page.indexOf(pos)]

              return prize
                ? $row(style({ alignSelf: 'center', alignItems: 'center' }))(
                  $avaxIcon,
                  $text(style({ fontSize: '1.8em', color: pallete.positive }))(prize),
                ) : $row()
            }, tableList)
          }
        ],
      })({ scrollIndex: highTableRequestIndexTether() }),

    ),

    {
      competitionCumulativePnl: pagerOp(highTableRequestIndex),
      routeChange
    }
  ]
})


