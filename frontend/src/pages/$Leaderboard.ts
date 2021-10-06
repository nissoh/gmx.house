import { $text, component, style, styleBehavior, StyleCSS, nodeEvent, $node } from "@aelea/dom"
import { O, } from '@aelea/utils'
import { $card, $column, $row, layoutSheet, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant, map, multicast, snapshot, startWith } from '@most/core'
import { intervalInMsMap, ILeaderboardRequest, IAggregatedAccountSummary, IAggregatedTradeSummary, IPagableResponse, IAggregatedOpenPositionSummary, IPageable, IAggregatedSettledTradeSummary, TradeType } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { $anchor } from '../elements/$common'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import { $AccountPreview } from '../components/$AccountProfile'
import { Behavior } from "@aelea/core"
import { $Link } from "../components/$Link"
import { screenUtils } from "@aelea/ui-components"
import { $Table2, TablePageResponse } from "../common/$Table2"
import { $Entry, $LivePnl, $ProfitLoss, $RiskLiquidator, tableRiskColumnCellBody, winLossTableColumn } from "./common"




export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>

  requestLeaderboardTopList: Stream<IPagableResponse<IAggregatedAccountSummary>>
  openAggregatedTrades: Stream<IPagableResponse<IAggregatedOpenPositionSummary>>

  parentStore: <T, TK extends string = string>(key: TK, intitialState: T) => state.BrowserStore<T, TK>;
}



export const $Leaderboard = <T extends BaseProvider>(config: ILeaderboard<T>) => component((
  [topPnlTimeframeChange, topPnlTimeframeChangeTether]: Behavior<any, ILeaderboardRequest['timeInterval']>,

  [routeChange, routeChangeTether]: Behavior<string, string>,
  [tableTopPnlRequest, tableTopPnlRequestTether]: Behavior<number, number>,
  [openPositionsRequest, openPositionsRequestTether]: Behavior<number, number>,

) => {

  const $header = $text(style({ fontSize: '1.15em', letterSpacing: '4px' }))



  const timeFrameStore = config.parentStore<ILeaderboardRequest['timeInterval']>('timeframe', intervalInMsMap.DAY)

  const filterByTimeFrameState = state.replayLatest(multicast(startWith(timeFrameStore.state, timeFrameStore.store(topPnlTimeframeChange, map(x => x)))))

  const tableRequestState = snapshot((timeInterval, page): ILeaderboardRequest => {
    return {
      timeInterval,
      offset: page * 20,
      pageSize: 20
    }
  }, filterByTimeFrameState, tableTopPnlRequest)

  const tableTopOpenState = map((page): IPageable => {
    return { offset: page * 20, pageSize: 20 }
  }, openPositionsRequest)


  const openPositions: Stream<TablePageResponse<IAggregatedOpenPositionSummary>> = map((res) => {
    return {
      data: res.page
      // .filter(a => (
      //   a.account == '0x04d52e150e49c1bbc9ddde258060a3bf28d9fd70'
      //   // || a.account == '0x04d52e150e49c1bbc9ddde258060a3bf28d9fd70'.toLocaleLowerCase()
      // ))
      ,
      pageSize: res.pageSize,
      offset: res.offset,
      // .map(toAggregatedOpenTradeSummary)
        
    }
  }, config.openAggregatedTrades)


  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }


  const accountTableColumn = {
    $head: $text('Account'),
    columnOp: style({ minWidth: '138px' }),
    $body: map(({ account }: IAggregatedTradeSummary) => {
      return $AccountPreview({ address: account, parentRoute: config.parentRoute })({
        profileClick: routeChangeTether()
      })
    })
  }






  return [
    $node(style({ gap: '46px', display: 'flex', flexDirection: screenUtils.isMobileScreen ? 'column' : 'row' }))(
      $column(layoutSheet.spacing, style({ flex: 1, padding: '0 12px' }))(
        $row(style({ fontSize: '0.85em', justifyContent: 'space-between' }))(
          $row(layoutSheet.spacing)(
            $header(layoutSheet.flex)(`Top Settled`),
          // $header(layoutSheet.flex)(`Settled`),
          // $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '8px', svgOps: style({ marginTop: '4px' }) })
          ),

          $row(layoutSheet.spacing)(
            $text(style({ color: pallete.foreground }))('Time Frame:'),
            $anchor(
              styleBehavior(map(tf => tf === intervalInMsMap.DAY ? activeTimeframe : null, filterByTimeFrameState)),
              topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.DAY))
            )(
              $text('24Hour')
            ),
            $anchor(
              styleBehavior(map(tf => tf === intervalInMsMap.WEEK ? activeTimeframe : null, filterByTimeFrameState)),
              topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.WEEK))
            )(
              $text('1Day')
            ),
            $anchor(
              styleBehavior(map(tf => tf === intervalInMsMap.MONTH ? activeTimeframe : null, filterByTimeFrameState)),
              topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.MONTH))
            )(
              $text('1Month')
            )
          )
        ),
        $card(layoutSheet.spacingBig, style({ padding: screenUtils.isMobileScreen ? '16px 8px' : '26px', margin: '0 -12px' }))(
          $Table2<IAggregatedAccountSummary>({
            bodyContainerOp: layoutSheet.spacing,
            scrollConfig: {
              containerOps: O(layoutSheet.spacingBig)
            },
            filterChange: topPnlTimeframeChange,
            dataSource: map((res) => {
              return {
                data: res.page,
                pageSize: res.pageSize,
                offset: res.offset,
              }
            }, config.requestLeaderboardTopList),
            // bodyRowOp: O(layoutSheet.spacing),
            columns: [
              accountTableColumn,
              winLossTableColumn,
              tableRiskColumnCellBody,
              {
                $head: $text('PnL $'),
                columnOp: style({ flex: 1.5, placeContent: 'flex-end', maxWidth: '160px' }),
                $body: map((pos: IAggregatedSettledTradeSummary) => $ProfitLoss(pos)({}))
              },
            ],
          })({ scrollIndex: tableTopPnlRequestTether(), })
        ),
      ),
      $column(layoutSheet.spacing, style({ flex: 1, padding: '0 12px' }))(
        $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
          $row(layoutSheet.spacing)(
            $header(layoutSheet.flex)(`Top Open`),
          // $header(layoutSheet.flex)(`Settled`),
          // $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '8px', svgOps: style({ marginTop: '4px' }) })
          ),
        ),
        $card(layoutSheet.spacingBig, style({ padding: screenUtils.isMobileScreen ? '16px 8px' : '26px', margin: '0 -12px' }))(
          $Table2<IAggregatedOpenPositionSummary>({
            bodyContainerOp: layoutSheet.spacing,
            scrollConfig: {
              containerOps: O(layoutSheet.spacingBig)
            },
            dataSource: openPositions,
            // headerCellOp: style({ fontSize: '.65em' }),
            // bodyRowOp: O(layoutSheet.spacing),
            columns: [
              {
                $head: $text('Entry'),
                columnOp: O(style({ maxWidth: '65px', flexDirection: 'column' }), layoutSheet.spacingTiny),
                $body: map((pos: IAggregatedOpenPositionSummary) =>
                  $Link({
                    anchorOp: style({ position: 'relative' }),
                    $content: style({ pointerEvents: 'none' }, $Entry(pos)({})),
                    url: `/p/account/${TradeType.OPEN}/${pos.trade.id}`,
                    route: config.parentRoute.create({ fragment: '2121212' })
                  })({ click: routeChangeTether() })
                )
              },
              accountTableColumn,
              {
                $head: $text('Risk'),
                columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, alignItems: 'center', placeContent: 'center', minWidth: '80px' })),
                $body: map((pos: IAggregatedOpenPositionSummary) => $RiskLiquidator(pos)({}))
              },
              {
                $head: $text('PnL $'),
                columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '160px' }),
                $body: map((pos) => $LivePnl(pos)({}))
              },
            ],
          })({ scrollIndex: openPositionsRequestTether() })
        ),
      )
    ),

    {
      requestLeaderboardTopList: tableRequestState,
      requestOpenAggregatedTrades: tableTopOpenState,
      routeChange
    }
  ]
})


