import { Behavior, combineObject, O, replayLatest } from '@aelea/core'
import { $text, component, nodeEvent, style, styleBehavior, StyleCSS } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $caretDown, $column, $icon, $row, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { BaseProvider } from '@ethersproject/providers'
import { constant, empty, map, merge, multicast, now, periodic, snapshot, startWith, switchLatest } from '@most/core'
import { Stream } from '@most/types'
import { IAccountSummary, IClaim, ILeaderboardRequest, intervalInMsMap, IPageParapApi, ITradeOpen, IChainParamApi, IOpenTradesParamApi, IPriceLatestMap, getChainName, TOKEN_ADDRESS_TO_SYMBOL } from '@gambitdao/gmx-middleware'
import { $Table2, ISortBy, TablePageResponse } from "../common/$Table2"
import { $AccountPreview } from '../components/$AccountProfile'
import { $Link } from "../components/$Link"
import { $anchor, $card } from '../elements/$common'
import { $Entry, $livePnl, $ProfitLossText, $riskLabel, $riskLiquidator } from "./common"
import { CHAIN_LABEL_ID } from '../types'
import { IWalletLink } from '@gambitdao/wallet-link'
import { $Dropdown } from '../components/$Dropdown'
import { $CompeititonInfo } from './competition/$rules'




export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimMap: Stream<{ [k: string]: IClaim }>
  walletLink: IWalletLink
  latestPriceMap: Stream<IPriceLatestMap>

  requestLeaderboardTopList: Stream<IPageParapApi<IAccountSummary>>
  openTrades: Stream<IPageParapApi<ITradeOpen>>
  parentStore: <Z, TK extends string = string>(key: TK, intitialState: Z) => state.BrowserStore<Z, TK>
}

const topSettledOption = "Top Settled"
const topOpenOption = "Top Open"


export const $Leaderboard = <T extends BaseProvider>(config: ILeaderboard<T>) => component((
  [topPnlTimeframeChange, topPnlTimeframeChangeTether]: Behavior<any, ILeaderboardRequest['timeInterval']>,

  [routeChange, routeChangeTether]: Behavior<string, string>,
  [tableTopPnlRequest, tableTopPnlRequestTether]: Behavior<number, number>,
  [openPositionsRequest, openPositionsRequestTether]: Behavior<number, number>,
  [tableTopSettledSortByChange, tableTopSettledsortByChangeTether]: Behavior<ISortBy<IAccountSummary>, ISortBy<IAccountSummary>>,
  [tableTopOpenSortByChange, tableTopOpenSortByChangeTether]: Behavior<ISortBy<ITradeOpen>, ISortBy<ITradeOpen>>,
  [selectMobileContent, selectMobileContentTether]: Behavior<string, string>,

) => {

  const urlFragments = document.location.pathname.split('/')
  const [chainLabel] = urlFragments.slice(1) as [keyof typeof CHAIN_LABEL_ID]
  const chain = CHAIN_LABEL_ID[chainLabel]

  const $header = $text(style({ fontSize: '1.15em' }))

  const timeFrameStore = config.parentStore<ILeaderboardRequest['timeInterval']>('timeframe', intervalInMsMap.HR24)
  const tableTopSettledSortByStore = config.parentStore<ISortBy<IAccountSummary>>('tableTopSettledSortByStore', { name: 'realisedPnl', direction: 'asc' })
  const tableTopOpenSortByStore = config.parentStore<ISortBy<ITradeOpen>>('tableTopOpenSortByStore', { name: 'realisedPnl', direction: 'asc' })
  const selectedMobileContent = config.parentStore<string>('selectedMobileContent', topSettledOption)

  const tableTopSettledSortBy = startWith(tableTopSettledSortByStore.state, tableTopSettledSortByStore.store(tableTopSettledSortByChange, map(x => x)))
  const tableTopOpenSortBy = startWith(tableTopOpenSortByStore.state, tableTopOpenSortByStore.store(tableTopOpenSortByChange, map(x => x)))
  const filterByTimeFrameState = replayLatest(multicast(startWith(timeFrameStore.state, timeFrameStore.store(topPnlTimeframeChange, map(x => x)))))
  const selectedMobileContentState = replayLatest(multicast(startWith(selectedMobileContent.state, selectedMobileContent.store(selectMobileContent, map(x => x)))))

  const tableRequestState = snapshot(({ filterByTimeFrameState: timeInterval, tableTopSettledSortBy: sortBy }, page): IChainParamApi & ILeaderboardRequest => {
    const name = sortBy.name

    return {
      timeInterval,
      offset: page * 20,
      pageSize: 20,
      sortBy: name,
      chain: chain,
      sortDirection: sortBy.direction
    }
  }, combineObject({ tableTopSettledSortBy, filterByTimeFrameState }), tableTopPnlRequest)

  const tableTopOpenState = snapshot((sortBy, page): IOpenTradesParamApi => {
    return { offset: page * 20, pageSize: 20, chain, sortBy: sortBy.name, sortDirection: sortBy.direction }
  }, tableTopOpenSortBy, openPositionsRequest)


  const openPositions: Stream<TablePageResponse<ITradeOpen>> = map((res) => {
    return {
      page: res.page,
      pageSize: res.pageSize,
      offset: res.offset,
    }
  }, config.openTrades)


  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }


  const accountTableColumn = {
    $head: $text('Account'),
    columnOp: style({ minWidth: '125px' }),
    $body: map(({ account }: { account: string }) => {
      return switchLatest(map(map => {
        return $AccountPreview({ address: account, chain, parentRoute: config.parentRoute, claim: map[account.toLowerCase()] })({
          profileClick: routeChangeTether()
        })
      }, config.claimMap))
    })
  }



  const $topAccounts = $Table2<IAccountSummary>({
    $container: $card(layoutSheet.spacingBig, style({ padding: screenUtils.isMobileScreen ? '16px 8px' : '20px', margin: '0 -12px' })),
    rowOp: layoutSheet.spacingTiny,
    scrollConfig: {
      containerOps: O(layoutSheet.spacingBig)
    },
    sortChange: now(tableTopSettledSortByStore.state),
    filterChange: merge(topPnlTimeframeChange, tableTopSettledSortByChange),
    dataSource: map((res) => {
      return {
        page: res.page,
        pageSize: res.pageSize,
        offset: res.offset,
      }
    }, config.requestLeaderboardTopList),
    columns: [
      accountTableColumn,
      {
        $head: $text('Win/Loss'),
        columnOp: style({ maxWidth: '65px', placeContent: 'center' }),
        $body: map(pos => {
          return $row(
            $text(`${pos.winTradeCount}/${pos.settledTradeCount - pos.winTradeCount}`)
          )
        })
      },
      {
        $head: $text('Size'),
        sortBy: 'size',
        columnOp: style({ placeContent: 'center', minWidth: '125px' }),
        $body: map(pos => {
          return $riskLabel(pos)
        })
      },
      {
        $head: $text('PnL-$'),
        sortBy: 'realisedPnl',
        columnOp: style({ flex: 1.2, placeContent: 'flex-end', maxWidth: '110px' }),
        $body: map(pos => $row(
          $ProfitLossText(pos.realisedPnl)
        ))
      },
    ],
  })({ scrollIndex: tableTopPnlRequestTether(), sortBy: tableTopSettledsortByChangeTether() })

  const $topOpen = $Table2<ITradeOpen>({
    $container: $card(layoutSheet.spacingBig, style({ padding: screenUtils.isMobileScreen ? '16px 8px' : '20px', margin: '0 -12px' })),
    scrollConfig: {
      containerOps: O(layoutSheet.spacingBig)
    },
    // filterChange: tableTopOpenSortBy,
    sortChange: now(tableTopOpenSortByStore.state),
    dataSource: openPositions,
    columns: [
      accountTableColumn,
      {
        $head: $text('Entry'),
        columnOp: O(style({ maxWidth: '58px', flexDirection: 'column' }), layoutSheet.spacingTiny),
        $body: map(pos => {
          return $Link({
            anchorOp: style({ position: 'relative' }),
            $content: style({ pointerEvents: 'none' }, $Entry(pos)),
            url: `/${getChainName(chain).toLowerCase()}/${TOKEN_ADDRESS_TO_SYMBOL[pos.indexToken]}/${pos.id}/${pos.timestamp}`,
            route: config.parentRoute.create({ fragment: '2121212' })
          })({ click: routeChangeTether() })
        })
      },
      {
        $head: $text('Size'),
        sortBy: 'size',
        columnOp: style({ flex: 1.3, alignItems: 'center', placeContent: 'center', minWidth: '80px' }),
        $body: map(trade => {
          const positionMarkPrice = map(priceMap => priceMap[trade.indexToken].value, config.latestPriceMap)

          return $riskLiquidator(trade, positionMarkPrice)
        })
      },
      {
        $head: $text('PnL-$'),
        sortBy: 'realisedPnl',
        columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '110px' }),
        $body: map(trade => {
          const positionMarkPrice = map(priceMap => {
            return priceMap[trade.indexToken].value
          }, config.latestPriceMap)
          return $livePnl(trade, positionMarkPrice)
        })
      },
    ],
  })({ scrollIndex: openPositionsRequestTether(), sortBy: tableTopOpenSortByChangeTether() })


  const $topAccountsFilter = $row(style({ fontSize: '0.85em', justifyContent: 'space-between', alignItems: 'center' }))(
    $row(layoutSheet.spacing)(
      $text(style({ color: pallete.foreground }))('Period:'),
      $anchor(
        styleBehavior(map(tf => tf === intervalInMsMap.HR24 ? activeTimeframe : null, filterByTimeFrameState)),
        topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.HR24))
      )(
        $text('24Hour')
      ),
      $anchor(
        styleBehavior(map(tf => tf === intervalInMsMap.DAY7 ? activeTimeframe : null, filterByTimeFrameState)),
        topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.DAY7))
      )(
        $text('7Day')
      ),
      $anchor(
        styleBehavior(map(tf => tf === intervalInMsMap.MONTH ? activeTimeframe : null, filterByTimeFrameState)),
        topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.MONTH))
      )(
        $text('1Month')
      )
    )
  )

  return [

    $column(

      // $CompeititonInfo(config.parentRoute, routeChangeTether),

      screenUtils.isDesktopScreen
        ? $row(style({ gap: '46px' }))(
          $column(layoutSheet.spacing, style({ padding: '0 12px', flex: 1 }))(
            $row(
              $header(layoutSheet.flex)(topSettledOption),
              $topAccountsFilter,
            ),
            $topAccounts,
          ),
          $column(layoutSheet.spacing, style({ padding: '0 12px', flex: 1 }))(
            $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
              $row(layoutSheet.spacing)(
                $header(layoutSheet.flex)(topOpenOption),
                // $header(layoutSheet.flex)(`Settled`),
                // $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '8px', svgOps: style({ marginTop: '4px' }) })
              ),
            ),
            $topOpen,
          )
        )
        : switchLatest(map(showContent => {
          return $column(layoutSheet.spacing)(
            $Dropdown({
              value: now(selectedMobileContent.state),
              $container: $column(style({ padding: '8px 16px' })),
              // disabled: accountChange,
              // $noneSelected: $text('Choose Amount'),
              $selection: map(option => {
                return $row(layoutSheet.spacing, style({ justifyContent: 'space-between' }))(
                  $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $header(layoutSheet.flex)(option),
                    $icon({
                      width: '14px',
                      $content: $caretDown,
                      viewBox: '0 0 32 32',
                      svgOps: style({ alignSelf: 'flex-end' })
                    })
                  ),
                  option === topSettledOption ? $topAccountsFilter : empty()
                )
              }),
              select: {
                optionOp: map(option => $row(style({ alignItems: 'center', width: '100%' }))(
                  $text(option)
                )),
                options: [topSettledOption, topOpenOption],
              }
            })({ select: selectMobileContentTether() }),
            $card(layoutSheet.spacingBig, style({ padding: screenUtils.isMobileScreen ? '16px 8px' : '20px', margin: '0 -12px' }))(
              showContent === topSettledOption ? $topAccounts : $topOpen,
            )
          )
        }, selectedMobileContentState)),
    ),


    {
      requestLeaderboardTopList: tableRequestState,
      requestOpenTrades: tableTopOpenState,
      requestLatestPriceMap: constant({ chain }, periodic(5000)),
      routeChange
    }
  ]
})


