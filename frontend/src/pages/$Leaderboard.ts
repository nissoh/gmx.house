import { Behavior, O } from '@aelea/core'
import { $node, $text, component, nodeEvent, style, styleBehavior, StyleCSS } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $card, $column, $row, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { BaseProvider } from '@ethersproject/providers'
import { constant, map, multicast, snapshot, startWith, switchLatest } from '@most/core'
import { Stream } from '@most/types'
import { IAggregatedAccountSummary, IAggregatedOpenPositionSummary, IAggregatedSettledTradeSummary, IAggregatedTradeSummary, IClaim, ILeaderboardRequest, intervalInMsMap, IPagableResponse, IPageable, parseFixed, TradeType } from 'gambit-middleware'
import { $Table2, TablePageResponse } from "../common/$Table2"
import { $AccountPreview } from '../components/$AccountProfile'
import { $Link } from "../components/$Link"
import { $anchor } from '../elements/$common'
import { $Entry, $LivePnl, $SummaryProfitLoss, $Risk, $RiskLiquidator, filterByIndexToken, priceChange, winLossTableColumn } from "./common"




export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimMap: Stream<Map<string, IClaim>>

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



  const timeFrameStore = config.parentStore<ILeaderboardRequest['timeInterval']>('timeframe', intervalInMsMap.HR24)

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
    columnOp: style({ minWidth: '120px' }),
    $body: map(({ account }: IAggregatedTradeSummary) => {

      return switchLatest(map(map => {
        return $AccountPreview({ address: account, parentRoute: config.parentRoute, claim: map.get(account.toLowerCase()) })({
          profileClick: routeChangeTether()
        })
      }, config.claimMap))
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
              {
                $head: $text('Risk'),
                columnOp: O(layoutSheet.spacingTiny, style({ placeContent: 'center' })),
                $body: map((pos: IAggregatedTradeSummary) => {
                  return $Risk(pos)({})
                })
              },
              // {
              //   $head: $text('Size $'),
              //   columnOp: O(layoutSheet.spacingTiny, style({ textAlign: 'left', maxWidth: '150px', placeContent: 'flex-start' })),
              //   $body: map((pos: IAggregatedTradeSummary) => {
              //     return $text(style({ fontSize: '.65em' }))(formatReadableUSD(pos.size))
              //   })
              // },
              {
                $head: $text('PnL $'),
                columnOp: style({ flex: 1.5, placeContent: 'flex-end', maxWidth: '160px' }),
                $body: map((pos: IAggregatedSettledTradeSummary) => $row($SummaryProfitLoss(pos)))
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
              accountTableColumn,
              {
                $head: $text('Entry'),
                columnOp: O(style({ maxWidth: '58px', flexDirection: 'column' }), layoutSheet.spacingTiny),
                $body: map((pos: IAggregatedOpenPositionSummary) =>
                  $Link({
                    anchorOp: style({ position: 'relative' }),
                    $content: style({ pointerEvents: 'none' }, $Entry(pos)),
                    url: `/p/account/${pos.trade.initialPosition.indexToken}-${TradeType.OPEN}-${pos.trade.initialPosition.indexedAt}/${pos.trade.id}`,
                    route: config.parentRoute.create({ fragment: '2121212' })
                  })({ click: routeChangeTether() })
                )
              },
              {
                $head: $text('Risk'),
                columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, alignItems: 'center', placeContent: 'center', minWidth: '80px' })),
                $body: map((pos: IAggregatedOpenPositionSummary) => {
                  const positionMarkPrice = map(priceUsd => parseFixed(priceUsd.p, 30), filterByIndexToken(pos.indexToken)(priceChange))
                  
                  return $RiskLiquidator(pos, positionMarkPrice)({})
                })
              },
              {
                $head: $text('PnL $'),
                columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '110px' }),
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


