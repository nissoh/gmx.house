import { Behavior, O, replayLatest } from '@aelea/core'
import { $text, component, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $card, $column, $row, $seperator, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { BaseProvider } from '@ethersproject/providers'
import { combine, empty, map, multicast, snapshot, switchLatest, take } from '@most/core'
import { Stream } from '@most/types'
import { IClaim, IPageParapApi, IPagePositionParamApi, IChainParamApi, formatReadableUSD, formatFixed, CHAIN, ITimerangeParamApi, unixTimestampNow, getChainName } from '@gambitdao/gmx-middleware'
import { $Table2 } from "../../common/$Table2"
import { $AccountLabel, $AccountPhoto, $AccountPreview, $defaultProfileSocialLink, $ProfilePreviewClaim, $twitterProfileLink, getTwitterHandle } from '../../components/$AccountProfile'
import { CHAIN_LABEL_ID } from '../../types'
import { IAccountLadderSummary } from 'common'
import { $Link } from '../../components/$Link'
import { $alertTooltip, $avaxIcon, countdown } from './$rules'
import { IWalletLink } from '@gambitdao/wallet-link'
import { $alert } from '../../elements/$common'


const prizeLadder: string[] = ['1200', '600', '300', ...Array(15).fill('60')]



export interface ICompetitonTopCumulative<T extends BaseProvider> extends ITimerangeParamApi, IChainParamApi {
  walletLink: IWalletLink
  parentRoute: Route
  provider?: Stream<T>
  claimMap: Stream<{ [k: string]: IClaim }>
  walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">


  competitionCumulativeRoi: Stream<IPageParapApi<IAccountLadderSummary>>

  parentStore: <T, TK extends string = string>(key: TK, intitialState: T) => state.BrowserStore<T, TK>;
}




export const $CompetitionRoi = <T extends BaseProvider>(config: ICompetitonTopCumulative<T>) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [highTableRequestIndex, highTableRequestIndexTether]: Behavior<number, number>,
) => {

  const ended = unixTimestampNow() >= config.to

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
  }, multicast(config.competitionCumulativeRoi))
  )


  const newLocal = take(1, tableList)
  return [
    $column(

      style({ alignSelf: 'center', maxWidth: '500px', marginBottom: '18px' })(
        $alert($text(`Results are being checked to ensure all data is accoutned for. expected to finalize by Nov 25 12:00 UTC`)),
      ),

      ended ? switchLatest(combine((page, claimMap) => {
        const list = page.page

        return $row(layoutSheet.spacing, style({ alignItems: 'flex-end', placeContent: 'center', marginBottom: '40px', position: 'relative' }))(
          $column(layoutSheet.spacing, style({ alignItems: 'center', textDecoration: 'none' }))(
            style({ border: `2px solid ${pallete.positive}`, boxShadow: `${colorAlpha(pallete.positive, .15)} 0px 0px 20px 11px` }, $AccountPhoto(list[1].account, claimMap[list[1].account], '140px')),
            $column(layoutSheet.spacingTiny, style({ alignItems: 'center', textDecoration: 'none' }))(
              $text(style({ fontSize: '.75em' }))(`${formatFixed(list[1].roi, 2)}%`),
              $column(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                $Link({
                  route: config.parentRoute.create({ fragment: '2121212' }),
                  $content: $AccountLabel(list[1].account, claimMap[list[1].account], style({ color: pallete.primary, fontSize: '1em' })),
                  anchorOp: style({ minWidth: 0, zIndex: 222 }),
                  url: `/${getChainName(config.chain)}/account/${list[1].account}`,
                })({ click: routeChangeTether() }),
                $defaultProfileSocialLink(list[1].account, config.chain, claimMap[list[1].account])
              )
            )
          ),
          $column(layoutSheet.spacing, style({ alignItems: 'center', zIndex: 10, margin: '0 -35px', textDecoration: 'none' }))(
            style({ border: `2px solid ${pallete.positive}`, boxShadow: `${colorAlpha(pallete.positive, .15)} 0px 0px 20px 11px` }, $AccountPhoto(list[0].account, claimMap[list[0].account], '215px')),
            $column(layoutSheet.spacingTiny, style({ alignItems: 'center', textDecoration: 'none' }))(
              $text(style({ fontSize: '.75em' }))(`${formatFixed(list[0].roi, 2)}%`),
              $column(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                $Link({
                  route: config.parentRoute.create({ fragment: '2121212' }),
                  $content: $AccountLabel(list[0].account, claimMap[list[0].account], style({ color: pallete.primary, fontSize: '1em' })),
                  anchorOp: style({ minWidth: 0, zIndex: 222 }),
                  url: `/${getChainName(config.chain)}/account/${list[0].account}`,
                })({ click: routeChangeTether() }),
                $defaultProfileSocialLink(list[0].account, config.chain, claimMap[list[0].account])
              )
            )
          ),
          $column(layoutSheet.spacing, style({ alignItems: 'center', textDecoration: 'none' }))(
            style({ border: `2px solid ${pallete.positive}`, boxShadow: `${colorAlpha(pallete.positive, .15)} 0px 0px 20px 11px` }, $AccountPhoto(list[2].account, claimMap[list[2].account], '140px')),
            $column(layoutSheet.spacingTiny, style({ alignItems: 'center', textDecoration: 'none' }))(
              $text(style({ fontSize: '.75em' }))(`${formatFixed(list[2].roi, 2)}%`),
              $column(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                $Link({
                  route: config.parentRoute.create({ fragment: '2121212' }),
                  $content: $AccountLabel(list[2].account, claimMap[list[2].account], style({ color: pallete.primary, fontSize: '1em' })),
                  anchorOp: style({ minWidth: 0, zIndex: 222 }),
                  url: `/${getChainName(config.chain)}/account/${list[2].account}`,
                })({ click: routeChangeTether() }),
                $defaultProfileSocialLink(list[2].account, config.chain, claimMap[list[2].account])
              )
            )
          )
        )
      }, newLocal, config.claimMap))
        : empty(),


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


      $row(style({ padding: screenUtils.isMobileScreen ? '0 12px' : '' }))(
        $column(layoutSheet.spacingSmall, style({ marginBottom: '26px', flex: 1 }))(
          $row(layoutSheet.spacingSmall, style({ alignItems: 'flex-end' }))(
            $text(style({}))(`Highest ROI (%)`),

            ...ended ? [] : [
              $text(style({ color: pallete.foreground, fontSize: '.75em' }))('Ending in'),
              $text(style({ fontSize: '.75em' }))(countdown(config.to)),
            ]

          ),
          $text(style({ fontSize: '.75em' }))(`ROI (%) is defined as: Profits / Max Collateral (min $500) * 100`),
        ),

        $row(
          $text(style({
            color: pallete.positive,
            fontSize: '1.75em',
            textShadow: `${pallete.positive} 1px 1px 20px, ${pallete.positive} 0px 0px 20px`
          }))('~$50,000')
        )
      ),




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
                  const claim = map[pos.account.toLowerCase()]

                  return $row(layoutSheet.spacing, style({ minWidth: '0', alignItems: 'center' }))(
                    $AccountPreview({ address: pos.account, chain: config.chain, parentRoute: config.parentRoute, claim })({
                      profileClick: routeChangeTether()
                    }),
                    $defaultProfileSocialLink(pos.account, config.chain, claim)
                  )
                }, config.claimMap)),


              )
            }, tableList)
          },
          ...(screenUtils.isDesktopScreen ? [
            {
              $head: $text('Win/Loss'),
              columnOp: style({ maxWidth: '88px', alignItems: 'center', placeContent: 'center' }),
              $body: map((pos: IAccountLadderSummary) => {
                return $row(
                  $text(`${pos.winTradeCount}/${pos.lossTradeCount}`)
                )
              })
            },

          ] : []),

          {
            $head: $column(style({ textAlign: 'center' }))(
              $text('Profits $'),
              $text(style({ fontSize: '.65em' }))('Max Collateral'),
            ),
            columnOp: style({ placeContent: 'center', minWidth: '125px' }),
            $body: map((pos: IAccountLadderSummary) => {
              const val = formatReadableUSD(pos.pnl)
              const isNeg = pos.pnl < 0n


              return $column(layoutSheet.spacingTiny, style({ textAlign: 'center' }))(
                $text(style({}))(
                  `${isNeg ? '' : '+'}${val}`
                ),
                $seperator,
                $text(formatReadableUSD(BigInt(pos.maxCollateral)))
              )
            })
          },
          {
            $head: $column(style({ placeContent: 'flex-end', alignItems: 'flex-end' }))(
              $text('Prize AVAX'),
              $text(style({ fontSize: '.65em' }))('ROI %'),
            ),
            columnOp: style({ flex: 1, alignItems: 'flex-end', placeContent: 'flex-end' }),
            $body: snapshot((list, pos) => {
              const prize = prizeLadder[list.offset + list.page.indexOf(pos)]

              return $column(
                prize
                  ? $row(
                    $avaxIcon,
                    $text(style({ fontSize: '1.8em', color: pallete.positive }))(prize),
                  ) : empty(),

                $text(`${formatFixed(pos.roi, 2)}%`)
              )
            }, tableList)
          }
        ],
      })({ scrollIndex: highTableRequestIndexTether() }),

    ),

    {
      competitionCumulativeRoi: pagerOp(highTableRequestIndex),
      routeChange
    }
  ]
})


