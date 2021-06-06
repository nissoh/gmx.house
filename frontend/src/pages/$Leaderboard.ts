import { $text, Behavior, event, component, style, styleBehavior, StyleCSS } from '@aelea/core'
import { O, } from '@aelea/utils'
import { $card, $column, $row, layoutSheet, $Table, TablePageResponse, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant, map, merge, mergeArray, multicast, now, startWith, switchLatest, tap } from '@most/core'

import {  formatFixed, readableUSD } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { $anchor } from '../elements/$common'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import { Account, leaderBoard, SettledPosition } from '../logic/leaderboard'
import { $AccountProfile } from '../components/$AccountProfile'
import { LeaderboardApiQueryParams } from 'gambit-backend'


const USD_DECIMALS = 30



// fetch('/api/claim-account', {
//   method: 'POST', // *GET, POST, PUT, DELETE, etc.
//   headers: {
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify({ tx: '0xc8842adcf564afaa616e4147030941d1841853062de8d6d5da52b724c0440c28' }) // body data type must match "Content-Type" header
// })


export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
}



enum TimeFrame {
  None,
  Day,
  Month,
}

const timeFrameToRangeOp = map((xxx: TimeFrame): LeaderboardApiQueryParams => {
  const nowTime = new Date()

  const startTime = xxx === TimeFrame.Day
    ? nowTime.setHours(nowTime.getHours() - 24)
    : xxx === TimeFrame.Month
      ? nowTime.setMonth(nowTime.getMonth() - 1)
      : new Date(0).getTime()

  return { startTime }
})

export const $Leaderboard = <T extends BaseProvider>(config: ILeaderboard<T>) => component((
  [initializeLeaderboard, initializeLeaderboardTether]: Behavior<any, TimeFrame>,
) => {

  const $header = $text(style({ fontSize: '1.45em', fontWeight: 'lighter', letterSpacing: '4px' }))

  const rootStore = state.createLocalStorageChain('store')


  const timeFrameStore = rootStore('timeframe', TimeFrame.Month)

  const timeFrameState = multicast(startWith(timeFrameStore.state, timeFrameStore.store(initializeLeaderboard, map(x => x))))
  const timeFrame = timeFrameToRangeOp(timeFrameState)
  
  
  const topGambit: Stream<Stream<TablePageResponse<Account>>> = map((params: LeaderboardApiQueryParams) => {
    return map((list) => {
      const account = list.reduce((seed, pos) => {
        const account = seed[pos.account] ??= {
          address: pos.account,
          settledPositionCount: 0,
          claim: null,
          profitablePositionsCount: 0,
          realisedPnl: 0n,
          settledPositions: [],
        }

        account.settledPositions.push(pos)
        account.settledPositionCount++
        account.realisedPnl += pos.realisedPnl

        if (pos.realisedPnl > 0n) {
          account.profitablePositionsCount++
        }

        return seed
      }, {} as {[account: string]: Account})

      const allAccounts = Object.values(account).filter(a => a.realisedPnl > 0).sort((a, b) => Number(b.realisedPnl - a.realisedPnl))

      return { data: allAccounts }
    }, leaderBoard(params))
  }, timeFrame)




  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }
  return [
    $column(
      $column(layoutSheet.spacingBig)(
        $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
          $row(layoutSheet.flex)(),

          $text(style({ color: pallete.foreground }))('Time Frame:'),
          $anchor(
            styleBehavior(map(tf => TimeFrame.Day === tf ? activeTimeframe : null, timeFrameState)),
            initializeLeaderboardTether(event('click'), constant(TimeFrame.Day))
          )(
            $text('24hr')
          ),
          $anchor(
            styleBehavior(map(tf => TimeFrame.Month === tf ? activeTimeframe : null, timeFrameState)),
            initializeLeaderboardTether(event('click'), constant(TimeFrame.Month))
          )(
            $text('1Mon')
          )
        ),
        $card(layoutSheet.spacingBig, style({ padding: '46px' }))(
          $row(
            $header(layoutSheet.flex)('Top Gambit'),
          ),
          $column(layoutSheet.spacing)(

            switchLatest(map((dataSource) => {
              return $Table<Account>({
                bodyContainerOp: O(layoutSheet.spacing),
                dataSource,
                columns: [
                  {
                    $head: $text('Account'),
                    columnOp: style({ minWidth: '300px' }),
                    valueOp: map(x => {
                      return $AccountProfile({ account: x })({
                        claimSucceed: initializeLeaderboardTether(
                          constant(timeFrameStore.state)
                        )
                      })
                      // return $text(shortenTxAddress(x.account))
                    })
                  },
                  {
                    $head: $text('Wins'),
                    valueOp: map(x => {
                      return $text(String(x.profitablePositionsCount))
                    })
                  },
                  {
                    $head: $text('Losses'),
                    valueOp: map(x => {
                      return $text(String(x.settledPositionCount - x.profitablePositionsCount))
                    })
                  },
                  {
                    $head: $text('realisedPnl'),
                    valueOp: map(x => {
                      const str = formatFixed(x.realisedPnl, USD_DECIMALS)

                      return $text(style({ color: str.indexOf('-') > -1 ? pallete.negative : pallete.positive }))(readableUSD(str))
                    })
                  },
                ],
              })({})
            }, topGambit))
          ),

          // $node(),
          // $node(),

          // $header(layoutSheet.flex)('Liquidations'),

          // $column(layoutSheet.spacing)(
          //   $TableZZ<TopGambit>({
          //     bodyContainerOp: O(layoutSheet.spacing),
          //     dataSource: map(
          //       items => {
          //         return {
          //           data: items //.sort((a, b) => Number(BigNumber.from(b.realisedPnl).toBigInt() - BigNumber.from(a.realisedPnl).toBigInt()))
          //           // .filter(x => x.account.indexOf(filterText) > -1)
          //         }
          //       },
          //       topGambit
          //     ),
          //     columns: [
          //       {
          //         $head: $text('account'),
          //         columnOp: style({ minWidth: '300px' }),
          //         valueOp: map(x => {
          //           return $row(layoutSheet.spacing)(
          //             $jazzicon(x.account, 42),
          //             $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
          //               $text(shortenAddress(x.account)),
          //               $anchor(attr({ href: getAccountUrl(CHAIN.BSC, x.account) }))(
          //                 $icon({ $content: $external, width: '12px', viewBox: '0 0 24 24' })
          //               ),
          //               $text('Claim')
          //             )
          //           )
          //           // return $text(shortenTxAddress(x.account))
          //         })
          //       },
          //       {
          //         $head: $text('Wins'),
          //         valueOp: map(x => {
          //           return $text(String(x.profitablePositions))
          //         })
          //       },
          //       {
          //         $head: $text('Losses'),
          //         valueOp: map(x => {
          //           return $text(String(x.closedPositions.length - x.profitablePositions))
          //         })
          //       },
          //       {
          //         $head: $text('realisedPnl'),
          //         valueOp: map(x => {
          //           const str = formatFixed(x.realisedPnl, USD_DECIMALS)

          //           return $text(style({ color: str.indexOf('-') > -1 ? pallete.negative : pallete.positive }))(readableUSD(str))
          //         })
          //       },
          //     ],
          //   })({})
          // ),
        ),

        // $column(layoutSheet.spacingSmall)(
        //   $header('Latest Liquidated'),

        //   $TableZZ<dto.PositionLiquidated>({
        //     // bodyCellOp: layoutSheet.spacing,
        //     dataSource: map(
        //       items => {
        //         return { data: items }
        //       },
        //       mergeArray([
        //         now(liquidatePositionPositionStore.state),
        //         map(x => [x], liquidatePosition)
        //       ])
        //     ),
        //     columns: [
        //       {
        //         $head: $text('key'),
        //         valueOp: map(x => {
        //           return $text(shortenTxAddress(x.key))
        //         })
        //       },
        //       {
        //         $head: $text('time'),
        //         valueOp: map(x => {
        //           return $text(new Date(x.time).toLocaleString())
        //         })
        //       },
        //       {
        //         $head: $text('account'),
        //         valueOp: map(x => {
        //           const str = shortenAddress(x.account)
        //           return $text(str)
        //         })
        //       },
        //       {
        //         $head: $text('collateral'),
        //         valueOp: map(x => {
        //           const str = formatFixed(BigNumber.from(x.collateral).toBigInt(), USD_DECIMALS)
        //           return $text(style({ color: pallete.negative }))(readableUSD(str))
        //         })
        //       },
        //       {
        //         $head: $text('markPrice'),
        //         valueOp: map(x => {
        //           const str = formatFixed(BigNumber.from(x.markPrice).toBigInt(), USD_DECIMALS)
        //           return $text(readableUSD(str))
        //         })
        //       },
        //     ],
        //   })({})
          
        // ),


        // $column(layoutSheet.spacingSmall)(
        //   $header('Latest Increase'),

        //   $TableZZ<dto.PositionIncrease>({
        //     dataSource: map(
        //       (items) => {
        //         return {
        //           data: items
        //           // .filter(x => x.key.indexOf(filterText) > -1 || x.account?.indexOf(filterText) > -1)
        //         }
        //       }, mergeArray([
        //         now(increasePositionStore.state),
        //         map(x => [x], increasePosition)
        //       ])
        //     ),
        //     columns: posChangeColumns,
        //   })({}),
        // ),

        // $column(layoutSheet.spacingSmall)(
        //   $header('Decrease'),

        //   switchLatest(
        //     map(filterText => {
        //       return $TableZZ<PositionEvent>({
        //         dataSource: map(
        //           (items) => {
        //             return {  data: items.filter(x => x.key.indexOf(filterText) > -1 || x.account?.indexOf(filterText) > -1) }
        //           }, mergeArray([
        //             now(decreasePositionStore.state),
        //             map(x => [x], decreasePosition)
        //           ])
        //         ),
        //         columns: posChangeColumns,
        //       })({})

        //     }, filterInput)
        //   ),
          
        // ),


        

        // $column(layoutSheet.spacingSmall)(
        //   $header('Latest Settled'),

        //   $TableZZ<dto.PositionSettled>({
        //     dataSource: map(
        //       items => {
        //         return {
        //           data: items
        //           // .filter(x => x.key.indexOf(filterText) > -1)
        //         }
        //       },
        //       mergeArray([
        //         now(closePositionStore.state),
        //         map(x => [x], closePosition)
        //       ])
        //     ),
        //     columns: [
        //       {
        //         $head: $text('key'),
        //         valueOp: map(x => {
        //           return $text(shortenTxAddress(x.key))
        //         })
        //       },
        //       {
        //         $head: $text('time'),
        //         valueOp: map(x => {
        //           return $text(new Date(x.time).toLocaleString())
        //         })
        //       },
        //       {
        //         $head: $text('realisedPnl'),
        //         valueOp: map(x => {
        //           const str = formatFixed(BigNumber.from(x.realisedPnl).toBigInt(), USD_DECIMALS)

        //           return $text(style({ color: str.indexOf('-') > -1 ? pallete.negative : pallete.positive }))(readableUSD(str))
        //         })
        //       },
        //       {
        //         $head: $text('collateral'),
        //         valueOp: map(x => {
        //           const str = formatFixed(BigNumber.from(x.collateral).toBigInt(), USD_DECIMALS)
        //           return $text(readableUSD(str))
        //         })
        //       },
        //       {
        //         $head: $text('size'),
        //         valueOp: map(x => {
        //           const str = formatFixed(BigNumber.from(x.size).toBigInt(), USD_DECIMALS)
        //           return $text(readableUSD(str))
        //         })
        //       },
        //     ],
        //   })({}),
        // ),

        // $column(layoutSheet.spacingSmall)(
        //   $header('Update'),

        //   switchLatest(
        //     map(filterText => {
        //       return $TableZZ<PositionSettledEvent>({
        //         dataSource: map(
        //           items => {
        //             return {  data: items.filter(x => x.key.indexOf(filterText) > -1) }
        //           },
        //           mergeArray([
        //             now(updatePositionStore.state),
        //             map(x => [x], updatePosition)
        //           ])
        //         ),
        //         columns: [
        //           {
        //             $head: $text('key'),
        //             valueOp: map(x => {
        //               return $text(shortenTxAddress(x.key))
        //             })
        //           },
        //           {
        //             $head: $text('averagePrice'),
        //             valueOp: map(x => {
        //               const str = formatFixed(BigNumber.from(x.averagePrice).toBigInt(), USD_DECIMALS)
        //               return $text(readableUSD(str))
        //             })
        //           },
        //           {
        //             $head: $text('collateral'),
        //             valueOp: map(x => {
        //               const str = formatFixed(BigNumber.from(x.collateral).toBigInt(), USD_DECIMALS)
        //               return $text(readableUSD(str))
        //             })
        //           },
        //           {
        //             $head: $text('size'),
        //             valueOp: map(x => {
        //               const str = formatFixed(BigNumber.from(x.size).toBigInt(), USD_DECIMALS)
        //               return $text(readableUSD(str))
        //             })
        //           },
        //         ],
        //       })({})

        //     }, filterInput)
        //   ),
          
      ),







  



      // style({ position: 'absolute' }, $icon({ $content: $logo, viewBox: '0 0 200 44', width: '180px', height: '40px', fill: pallete.message })),

      // $row(style({ flex: 1 }))(

      //   $column(style({ flex: 1, position: 'relative', backgroundImage: `radial-gradient(at 126% center, ${pallete.foreground} 0vw, #0000 121vh)`, borderRadius: '25px' }))(

      //     switchLatest(
      //       map(({ data, klineWSData }) => {

      //         return $CandleSticks({
      //           initalData: data,
      //           update: scan((prev, next): BarData => {

      //             const prevTimespan = (prev.time as number) + intervalInMsMap['1m']
      //             if (prevTimespan > next.T) {
      //             // prev.open = Number(next.p)
      //               prev.close = Number(next.p)

      //               if (Number(next.p) > prev.high) {
      //                 prev.high = Number(next.p)
      //               }
      //               if (Number(next.p) < prev.low) {
      //                 prev.low = Number(next.p)
      //               }

      //               return prev
      //             }

      //             return {
      //               close: Number(next.p),
      //               time: next.T as UTCTimestamp,
      //               high: Number(next.p),
      //               open: Number(next.p),
      //               low: Number(next.p),
      //             }
      //           }, data[data.length - 1], klineWSData),
      //           chartConfig: {
      //             timeScale: {
      //               timeVisible: true,
      //               secondsVisible: true,
      //               borderVisible: true,
      //               borderColor: pallete.foreground,
      //             },
      //             crosshair: {
      //               mode: CrosshairMode.Normal,
      //               horzLine: {
      //                 color: pallete.foreground,
      //                 width: 1,
      //                 style: LineStyle.Dotted
      //               },
      //               vertLine: {
      //                 color: pallete.foreground,
      //                 width: 1,
      //                 style: LineStyle.Dotted,
      //               }
      //             }
      //           },
      //         })({
      //           crosshairMove: sampleChartCrosshair(),
      //         // click: sampleClick()
      //         })
      //       }, selectedTokenHistoricKline)
      //     ),

      //     // $node(
      //     //   style({
      //     //     position: 'absolute',
      //     //     backgroundColor: theme.background,
      //     //     border: `1px solid ${theme.text}`,
      //     //     padding: '0 8px',
      //     //     transform: 'translateY(-50%)',
      //     //     cursor: 'pointer',
      //     //     zIndex: 1000
      //     //   }),
      //     //   styleInline(
      //     //     map(crossEvent => {
      //     //       return {
      //     //         top: crossEvent.point?.y + 'px',
      //     //         display: 'block'
      //     //       }
      //     //     }, chartCrosshair)
      //     //   ),
      //     //   sampleClick(
      //     //     event('click')
      //     //   )
      //     // )(
      //     //   $text('+ Add')
      //     // ),

      //     switchLatest(
      //       snapshot((address, clickEvent) => {
      //         return $node(style({
      //           position: 'absolute', left: 0, right: 0, bottom: 0, top: 0,
      //           // backdropFilter: 'blur(5px)',
      //           backgroundImage: 'radial-gradient(at center center, #fff 33%, #0000 100vh)',
      //           zIndex: 1000,
      //           alignItems: 'center',
      //           display: 'flex',
      //           placeContent: 'center',
      //         }))(
      //           $Send({ address })({})
      //         )
      //       }, selectedToken, click)
      //     )
      //   ),

      //   $column(style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(

      //     $Portfolio({ storageState: portfolioStorageState  })({
      //       selectToken: sampleSelectToken()
      //     })

      //     // $NumberTicker({
      //     //   decrementColor: theme.danger,
      //     //   incrementColor: theme.success,
      //     //   value$: map(n => n.y, rateLimitedChanges)
      //     // })
      //   ),

      // )
      

    )
  ]
})


// const posChangeColumns: TableColumn<dto.PositionMake>[] = [
//   {
//     $head: $text('key'),
//     valueOp: map(x => {
//       return $text(shortenTxAddress(x.key))
//     })
//   },
//   {
//     $head: $text('time'),
//     valueOp: map(x => {
//       return $text(new Date(x.createdAt).toLocaleString())
//     })
//   },
//   {
//     $head: $text('account'),
//     valueOp: map(x => {

//       return $text(shortenAddress(x.account))
//     })
//   },
//   {
//     $head: $text('indexToken'),
//     valueOp: map(x => {
//       const symb = TOKEN_ADDRESS_MAP.get(x.indexToken)?.symbol
//       return $text(String(symb))
//     })
//   },
//   {
//     $head: $text('isLong'),
//     valueOp: map(x => {
//       return $text(String(x.isLong ? 'bull' : 'bear'))
//     })
//   },
//   {
//     $head: $text('price'),
//     valueOp: map(x => {
//       const str = formatFixed(BigNumber.from(x.price).toBigInt(), USD_DECIMALS)
//       return $text(readableUSD(str))
//     })
//   },
//   {
//     $head: $text('collateralDelta'),
//     valueOp: map(x => {
//       const str = formatFixed(BigNumber.from(x.collateralDelta).toBigInt(), USD_DECIMALS)
//       return $text(readableUSD(str))
//     })
//   },
//   {
//     $head: $text('sizeDelta'),
//     valueOp: map(x => {
//       const str = formatFixed(BigNumber.from(x.sizeDelta).toBigInt(), USD_DECIMALS)
//       return $text(readableUSD(str))
//     })
//   }
// ]