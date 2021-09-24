import { $text, component, style, styleBehavior, StyleCSS, nodeEvent, stylePseudo, $node } from "@aelea/dom"
import { O, } from '@aelea/utils'
import { $card, $column, $row, layoutSheet, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant, map, multicast, now, snapshot, startWith, switchLatest } from '@most/core'
import { IClaim, intervalInMsMap, ILeaderboardRequest, IAggregatedAccountSummary, IAggregatedTradeSummary, IPagableResponse, IAggregatedPositionSummary, IPageable } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { $anchor } from '../elements/$common'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import { $AccountLabel, $AccountPhoto, $ProfileLinks } from '../components/$AccountProfile'
import { Behavior } from "@aelea/core"
import { $Link } from "../components/$Link"
import { screenUtils } from "@aelea/ui-components"
import { $Table2, TablePageResponse } from "../common/$Table2"
import { entyColumnTable, pnlColumnLivePnl, pnlColumnTable, riskColumnTableWithLiquidationIndicator, tableRiskColumnCellBody, winLossTableColumn } from "./common"




export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>

  requestLeaderboardTopList: Stream<IPagableResponse<IAggregatedAccountSummary>>
  openAggregatedTrades: Stream<IPagableResponse<IAggregatedPositionSummary>>

  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>;
}



export const $Leaderboard = <T extends BaseProvider>(config: ILeaderboard<T>) => component((
  [topPnlTimeframeChange, topPnlTimeframeChangeTether]: Behavior<any, intervalInMsMap>,

  [routeChange, routeChangeTether]: Behavior<string, string>,
  [tableTopPnlRequest, tableTopPnlRequestTether]: Behavior<number, number>,
  [openPositionsRequest, openPositionsRequestTether]: Behavior<number, number>,

) => {

  const $header = $text(style({ fontSize: '1.15em', letterSpacing: '4px' }))



  const timeFrameStore = config.parentStore('timeframe', intervalInMsMap.DAY)

  const filterByTimeFrameState = state.replayLatest(multicast(startWith(timeFrameStore.state, timeFrameStore.store(topPnlTimeframeChange, map(x => x)))))

  const tableRequestState = snapshot((timeInterval, page): ILeaderboardRequest => {
    const newLocal = {
      timeInterval,
      offset: page * 20,
      pageSize: 20
    }
    console.log(newLocal)
    return newLocal
  }, filterByTimeFrameState, tableTopPnlRequest)

  const tableTopOpenState = map((page): IPageable => {
    return { offset: page * 20, pageSize: 20 }
  }, openPositionsRequest)


  const openPositions: Stream<TablePageResponse<IAggregatedPositionSummary>> = map((res) => {
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
      return switchLatest(
        map((claimList: IClaim[]) => {
          const claim = claimList?.find(c => c.address === account) || null

          const $profileAnchor = $Link({
            $content: $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', textDecoration: 'none' }), stylePseudo(':hover', {  textDecoration: 'underline' }))(
              $AccountPhoto(account, claim),
              $AccountLabel(account, claim),
            ),
            url: `/p/account/${account}`,
            route: config.parentRoute.create({ fragment: '2121212' })
          })({
            click: routeChangeTether()
          })


          return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $profileAnchor,
            $ProfileLinks(account, claim),
          )
        }, now(null) as any)
      )
    })
  }






  return [
    $node(style({ gap: '46px', display: 'flex', flexDirection: screenUtils.isMobileScreen ? 'column' : 'row' }))(
      $column(layoutSheet.spacing, style({ flex: 1, padding: '0 12px' }))(
        $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
          $row(layoutSheet.spacing)(
            $header(layoutSheet.flex)(`Top Settled`),
          // $header(layoutSheet.flex)(`Settled`),
          // $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '8px', svgOps: style({ marginTop: '4px' }) })
          ),
          $row(layoutSheet.flex)(),

          $text(style({ color: pallete.foreground }))('Time Frame:'),
          $anchor(
            styleBehavior(map(tf => tf === intervalInMsMap.DAY ? activeTimeframe : null, filterByTimeFrameState)),
            topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.DAY))
          )(
            $text('24 Hours')
          ),
          $anchor(
            styleBehavior(map(tf => tf === intervalInMsMap.WEEK ? activeTimeframe : null, filterByTimeFrameState)),
            topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.WEEK))
          )(
            $text('7 Days')
          ),
          $anchor(
            styleBehavior(map(tf => tf === intervalInMsMap.MONTH ? activeTimeframe : null, filterByTimeFrameState)),
            topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.MONTH))
          )(
            $text('1 Month')
          )
        ),
        $card(layoutSheet.spacingBig, style({ padding: screenUtils.isMobileScreen ? '16px 8px' : '26px', margin: '0 -12px' }))(
          $column(layoutSheet.spacing)(
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
                pnlColumnTable,
              ],
            })({
              scrollIndex: tableTopPnlRequestTether(),
            })
          ),
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
          $column(layoutSheet.spacing)(
            $Table2<IAggregatedPositionSummary>({
              bodyContainerOp: layoutSheet.spacing,
              scrollConfig: {
                containerOps: O(layoutSheet.spacingBig)
              },
              dataSource: openPositions,
              // headerCellOp: style({ fontSize: '.65em' }),
              // bodyRowOp: O(layoutSheet.spacing),
              columns: [
                entyColumnTable,
                accountTableColumn,
                riskColumnTableWithLiquidationIndicator,
                pnlColumnLivePnl,
              ],
            })({
              scrollIndex: openPositionsRequestTether()
            })
          ),
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


