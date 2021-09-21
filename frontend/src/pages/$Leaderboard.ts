import { $text, component, style, styleBehavior, StyleCSS, nodeEvent, stylePseudo, $node, styleInline } from "@aelea/dom"
import { O, } from '@aelea/utils'
import { $card, $column, $row, layoutSheet, state, $seperator } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant, filter, map, multicast, now, snapshot, startWith, switchLatest } from '@most/core'
import { formatFixed, formatReadableUSD, IClaim, intervalInMsMap, ILeaderboardRequest, IAggregatedAccountSummary, parseFixed, ARBITRUM_CONTRACTS, calculatePositionDelta, IAggregatedTradeSummary, IPagableResponse, IAggregatedPositionSummary, getLiquidationPriceFromDelta, USD_DECIMALS, getPositionMarginFee, IPageable } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { $anchor } from '../elements/$common'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import { $AccountLabel, $AccountPhoto, $ProfileLinks } from '../components/$AccountProfile'
import { Behavior, combineArray } from "@aelea/core"
import { $Link } from "../components/$Link"
import { screenUtils } from "@aelea/ui-components"
import { klineWS, PRICE_EVENT_TICKER_MAP, WSBTCPriceEvent } from "../binance-api"
import { $icon, $tokenIconMap } from "../common/$icons"
import { $bear, $bull } from "../elements/$icons"
import { $Table2, TableColumn, TablePageResponse } from "../common/$Table2"


const filterByIndexToken = (pos: IAggregatedPositionSummary) => filter((data: WSBTCPriceEvent) => {
  // @ts-ignore
  const token = PRICE_EVENT_TICKER_MAP[pos.indexToken]
  
  return token === data.s
})


export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimList: Stream<IClaim[]>

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

  const priceChange = multicast(klineWS('ethusdt@aggTrade', 'btcusdt@aggTrade', 'linkusdt@aggTrade', 'uniusdt@aggTrade'))


  const timeFrameStore = config.parentStore('timeframe', intervalInMsMap.DAY)

  const filterByTimeFrameState = state.replayLatest(multicast(startWith(timeFrameStore.state, timeFrameStore.store(topPnlTimeframeChange, map(x => x)))))

  const tableRequestState = combineArray((timeInterval, page): ILeaderboardRequest => {
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
        //   a.account == '0xfcb2229fb2da163b50f09de04cc1980de76f343c'.toLocaleLowerCase()
        //   // || a.account == '0x04d52e150e49c1bbc9ddde258060a3bf28d9fd70'.toLocaleLowerCase()
        // ))
      ,
      pageSize: res.pageSize,
      offset: res.offset,
      // .map(toAggregatedOpenTradeSummary)
        
    }
  }, config.openAggregatedTrades)

  const tableRiskColumnCellBody: TableColumn<IAggregatedAccountSummary> = {
    $head: $text('Risk'),
    columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, flexDirection: 'column', textAlign: 'left', minWidth: '80px', placeContent: 'flex-start' })),
    $body: map((pos: IAggregatedTradeSummary) => {

      return $column(style({ alignItems: 'center', fontSize: '.65em' }))(
        $row(layoutSheet.spacingTiny)(
          $text(style({ fontWeight: 'bold' }))(`${String(Math.round(pos.leverage))}x`),
          $text(formatReadableUSD(pos.collateral - pos.fee))
        ),
        style({ width: '100%' }, $seperator),
        $text(style({  }))(formatReadableUSD(pos.size)),
      )
    })
  }

  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }
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
            $text('24Hrs')
          ),
          $anchor(
            styleBehavior(map(tf => tf === intervalInMsMap.WEEK ? activeTimeframe : null, filterByTimeFrameState)),
            topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.WEEK))
          )(
            $text('Week')
          ),
          $anchor(
            styleBehavior(map(tf => tf === intervalInMsMap.MONTH ? activeTimeframe : null, filterByTimeFrameState)),
            topPnlTimeframeChangeTether(nodeEvent('click'), constant(intervalInMsMap.MONTH))
          )(
            $text('Month')
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
                {
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
                },
                {
                  $head: $text('Win / Loss'),
                  columnOp: style({ flex: 1.25, placeContent: 'center' }),
                  $body: map(x => {
                    return $row(
                      $text(`${x.profitablePositionsCount}/${x.settledPositionCount - x.profitablePositionsCount}`)
                    )
                  })
                },
                tableRiskColumnCellBody,
                {
                  $head: $text('PnL $'),
                  columnOp: style({ flex: 1.5, placeContent: 'flex-end', maxWidth: '160px' }),
                  $body: map(x => {
                    const str = formatReadableUSD(x.pnl - x.fee)
                    return $row(
                      $text(style({ color: str.indexOf('-') > -1 ? pallete.negative : pallete.positive }))(str)
                    )
                  })
                },
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
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ minWidth: '80px', position: 'relative', placeContent: 'center', flexDirection: 'column' }), layoutSheet.spacingTiny),
                    
                  $body: map(({ isLong, indexToken, averagePrice }) => {
                    const idx = Object.entries(ARBITRUM_CONTRACTS).find(([k, v]) => v === indexToken)?.[1]

                    if (!idx) {
                      throw new Error('Unable to find matched token')
                    }

                    // @ts-ignore
                    const $token = $tokenIconMap[idx]

                    return $column(
                      style({ borderRadius: '50%', padding: '3px', left: '10px', top: '-4px', backgroundColor: pallete.background, position: 'absolute', offset: '0 0 0 0', })(
                        $icon({
                          $content: isLong ? $bull : $bear, 
                          viewBox: '0 0 32 32',
                        })
                      ),
                      $icon({
                        $content: $token, 
                        viewBox: '0 0 32 32',
                        width: 24,
                      }),
                      $text(style({ fontSize:'.65em' }))(formatReadableUSD(averagePrice)),
                    )
                  })
                },
                {
                  $head: $text('Account'),
                  columnOp: style({ minWidth: '138px' }),
                  $body: map(({ account }) => {
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
                },
                {
                  $head: $text(style({ fontSize: '1em' }))('Risk'),
                  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, fontSize: '.65em', flexDirection: 'column', textAlign: 'left', minWidth: '80px', placeContent: 'flex-start' })),
                  $body: map((pos: IAggregatedPositionSummary) => {

                    const liquidationPrice = getLiquidationPriceFromDelta(pos.collateral - getPositionMarginFee(pos.size), pos.size, pos.averagePrice, pos.isLong)

                    const positionMarkPrice = filterByIndexToken(pos)(priceChange)

                    const pnlPosition = multicast(map(price => {
                      const markPrice = parseFixed(price.p, 30)

                      return calculatePositionDelta(pos.size, pos.collateral, pos.isLong, pos.averagePrice, markPrice)
                    }, filterByIndexToken(pos)(priceChange)))

                    const liqPercentage = snapshot((meta, price) => {
                      const markPrice = Number(price.p)
                      const liquidationPriceUsd = formatFixed(liquidationPrice, USD_DECIMALS)

                            
                      const perc = Math.round(liquidationPriceUsd / markPrice * 100)
                      const value = perc > 100 ? 0 : perc

                      return `${value}%`
                    }, pnlPosition, positionMarkPrice)

                    const ww = styleInline(map((pec) => ({ width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${pec}, ${pallete.foreground} 0)` }), liqPercentage))

                    return $column(
                      $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                        $text(style({ fontWeight: 'bold' }))(`${String(Math.round(pos.leverage))}x`),
                        $text(formatReadableUSD(pos.collateral - pos.fee)),
                        $text(formatReadableUSD(liquidationPrice))
                      ),
                      ww($seperator),
                      $text(style({  }))(formatReadableUSD(pos.size)),
                    )
                  })
                },
                {
                  $head: $text('PnL $'),
                  columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '160px' }),
                  $body: map((pos) => {

                    const pnlPosition = multicast(map(price => {
                      const markPrice = parseFixed(price.p, 30)

                      return calculatePositionDelta(pos.size, pos.collateral, pos.isLong, pos.averagePrice, markPrice)
                    }, filterByIndexToken(pos)(priceChange)))


                    return $row(
                      $text(styleBehavior(map(s => ({ color: s.hasProfit ? pallete.positive : pallete.negative }), pnlPosition)))(
                        map(meta => {

                          const pnl = formatReadableUSD(meta.delta - pos.fee)
                          return `${meta.hasProfit ? pnl : `${pnl.startsWith('-') ? pnl : '-' + pnl}`}`
                        }, pnlPosition),
                      ),
                    )
                  })
                },
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


