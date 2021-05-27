import { $node, $text, Behavior, component, event, eventElementTarget, INode, nullSink, O, Op, style, styleInline } from '@aelea/core'
import { $card, $column, $icon, $row, $TextField, designSheet, layoutSheet, state } from '@aelea/ui-components'
import { pallete, theme } from '@aelea/ui-components-theme'
import { chain, constant, delay, empty, filter, fromPromise, map, merge, mergeArray, multicast, now, periodic, scan, skip, skipRepeatsWith, snapshot, startWith, switchLatest, tap, throttle, withItems, withLocalTime } from '@most/core'
import { disposeBoth, disposeWith } from '@most/disposable'
import { Stream } from '@most/types'
import { BigNumber, ethers } from 'ethers'
import { fetchJson, formatUnits } from 'ethers/lib/utils'
import { BarData, CrosshairMode, LineStyle, MouseEventParams, UTCTimestamp } from 'lightweight-charts'
import { BSC_CONTRACTS } from '../api/address/contract'
import { TOKEN_ADDRESS_MAP } from '../api/address/token'
import { vaultContract } from '../api/contract'
import { CHAIN } from '../api/provider'
import { LiquidatedPositionEvent, PositionEvent, PositionSettledEvent, Trader } from '../api/types'
import { createLocalStorageChain, formatFixed, readableUSD, shortenAddress, shortenTxAddress } from '../api/utils'
import { $logo } from '../common/$icons'
import { $TableZZ, TableColumn } from '../common/$TableZZZ'
import { $jazzicon } from '../common/gAvatar'
import { combineMap, groupByMap } from '../common/utils'
// import { $Portfolio, IPortfolioStoreState } from '../components/$Portfolio'
import { $CandleSticks } from '../components/chart/$CandleSticks'

const BASIS_POINTS_DIVISOR = 10000
const USD_DECIMALS = 30



  




// const createLocalStorageChain = state.localStorageTreeFactory('_storage')
const createLocalStorageChainRoot = createLocalStorageChain('store')
// const portfolioStorageState = createLocalStorageChain<IPortfolioStoreState>('portfolio', { selected:  BSC_CONTRACTS.Vault, interval: '1hr' })



    
type TopAccountMap = { [traderAccount: string]: Trader }
type tradeToAccountRefMap = { [tradeId: string]: string }


function appendItemToStoreList<A>(listStore: A[]) {
  const accumulate = scan((seed, item: A) => {
    return [...seed, { ...item, time: Date.now() }]
  }, listStore)
  return O(accumulate, skip(1))
}



export default component((
  [chartCrosshair, sampleChartCrosshair]: Behavior<MouseEventParams, MouseEventParams>,
  [selectToken, sampleSelectToken]: Behavior<BSC_CONTRACTS, BSC_CONTRACTS>,
  [click, sampleClick]: Behavior<INode, PointerEvent>,
) => {



  const addTime = map(<A>(a: A) => ({ ...a, time: Date.now() }))




  const increasePositionStore = createLocalStorageChainRoot<PositionEvent[]>('increasePosition', [])
  const increasePosition = increasePositionStore.store(addTime(vaultContract.increasePosition), appendItemToStoreList(increasePositionStore.state))

  const decreasePositionStore = createLocalStorageChainRoot<PositionEvent[]>('decreasePosition', [])
  const decreasePosition = decreasePositionStore.store(addTime(vaultContract.decreasePosition), appendItemToStoreList(decreasePositionStore.state))


  const liquidatePositionPositionStore = createLocalStorageChainRoot<LiquidatedPositionEvent[]>('liquidatePosition', [])
  const liquidatePosition = liquidatePositionPositionStore.store(addTime(vaultContract.liquidatePosition), appendItemToStoreList(liquidatePositionPositionStore.state))


  const closePositionStore = createLocalStorageChainRoot<PositionSettledEvent[]>('closePosition', [])
  const closePosition = closePositionStore.store(addTime(vaultContract.closePosition), appendItemToStoreList(closePositionStore.state))


  const topGambitStore = createLocalStorageChainRoot<TopAccountMap>('tppGambit', {})








  // const updatePositionStore = createLocalStorageChainRoot<PositionSettledEvent[]>('updatePosition', [])
  // const updatePosition = updatePositionStore.store(addTime(vaultContract.updatePosition), appendItemToStoreList(updatePositionStore.state))


  // const pnlStore = browserStore<ProfitLoss[]>('pnl', [])
  // const pnl = pnlStore.store(appendItemToStoreList(pnlStore.state), vaultContract.pnl)

  
  // const buyUSDGStore = browserStore<UsdgBuyEvent[]>('buyUSDG', [])
  // const usdg = buyUSDGStore.store(appendItemToStoreList(buyUSDGStore.state), vaultContract.buyUSDG)
  
  
  // replay stored events
  const replayClosedItems = withItems(closePositionStore.state, periodic(0))
  const replayIncreasePositionItems = withItems(increasePositionStore.state, periodic(0))
  const replayDecreasePositionItems = withItems(decreasePositionStore.state, periodic(0))

  const tradeToAccountMap = [...increasePositionStore.state, ...decreasePositionStore.state].reduce((seed, pos) => {
    seed[pos.key] = pos.account
    return seed
  }, {} as tradeToAccountRefMap)

  
  const initiatePosition = topGambitStore.store(
    map(pos => {
      let trader: Trader | null = topGambitStore.state[pos.account] || null

      if (trader === null) {
        tradeToAccountMap[pos.key] = pos.account
        trader = {
          account: pos.account,
          realisedPnl: BigNumber.from(0)
        }
        topGambitStore.state[pos.account] = trader
      }

      return trader
    }, mergeArray([
    // replayIncreasePositionItems,
    // replayDecreasePositionItems,
      decreasePosition,
      increasePosition
    ])),
    map(pos => {
      const storeState = topGambitStore.state
      return storeState
    })
  )
  

  
  const newLocal = filter(pos => {
  // debugger
    return typeof tradeToAccountMap[pos.key] === 'string'
  }, mergeArray([
  // replayClosedItems,
    vaultContract.closePosition
  ]))
  
  const settledPosition = topGambitStore.store(
    map((pos): Trader => {

      const accountidRef = tradeToAccountMap[pos.key]

      const account = topGambitStore.state[accountidRef]
      const realisedPnl = BigNumber.from(account.realisedPnl).add(BigNumber.from(pos.realisedPnl))
      // const settledPositions = [...account.settledPositions, { ...pos, time: Date.now() }]


      return { ...account, realisedPnl }
    }, newLocal),
    map(pos => {
      const storeState = topGambitStore.state

      storeState[pos.account] = { ...pos }

      return storeState
    })
  )
  
  const $header = $text(style({ fontSize: '1.45em', fontWeight: 'lighter', letterSpacing: '4px' }))


  const posChangeColumns: TableColumn<PositionEvent>[] = [
    {
      $head: $text('key'),
      valueOp: map(x => {
        return $text(shortenTxAddress(x.key))
      })
    },
    {
      $head: $text('time'),
      valueOp: map(x => {
        return $text(new Date(x.time).toLocaleString())
      })
    },
    {
      $head: $text('account'),
      valueOp: map(x => {

        return $text(shortenAddress(x.account))
      })
    },
    {
      $head: $text('indexToken'),
      valueOp: map(x => {
        const symb = TOKEN_ADDRESS_MAP.get(x.indexToken)?.symbol
        return $text(String(symb))
      })
    },
    {
      $head: $text('isLong'),
      valueOp: map(x => {
        return $text(String(x.isLong ? 'bull' : 'bear'))
      })
    },
    {
      $head: $text('price'),
      valueOp: map(x => {
        const str = formatFixed(BigNumber.from(x.price).toBigInt(), USD_DECIMALS)
        return $text(readableUSD(str))
      })
    },
    {
      $head: $text('collateralDelta'),
      valueOp: map(x => {
        const str = formatFixed(BigNumber.from(x.collateralDelta).toBigInt(), USD_DECIMALS)
        return $text(readableUSD(str))
      })
    },
    {
      $head: $text('sizeDelta'),
      valueOp: map(x => {
        const str = formatFixed(BigNumber.from(x.sizeDelta).toBigInt(), USD_DECIMALS)
        return $text(readableUSD(str))
      })
    }
  ]



  const newLocal_1 = scan((seed, pos) => [...seed, pos], Object.values(topGambitStore.state), mergeArray([initiatePosition, settledPosition]))
  return [
    $column(designSheet.main, style({ fontFamily: 'Work Sans', padding: '10vh 10vw', fontWeight: 'normal', fontSize: '1rem', backgroundImage: `radial-gradient(at center center, ${pallete.horizon} 50vh, ${pallete.background})` }))(

      $column(layoutSheet.spacingBig, style({ width: '1200px', margin: '0 auto' }))(



        $card(layoutSheet.spacingBig)(
          $header('Top Gambit'),
          $icon({ $content: $logo }),
          $column(layoutSheet.spacing)(
            $TableZZ<Trader>({
              bodyContainerOp: O(layoutSheet.spacing),
              dataSource: map(
                items => {
                  return {
                    data: items.sort((a, b) => Number(BigNumber.from(b.realisedPnl).toBigInt() - BigNumber.from(a.realisedPnl).toBigInt()))
                    // .filter(x => x.account.indexOf(filterText) > -1)
                  }
                },
                newLocal_1
              ),
              columns: [
                {
                  $head: $text('account'),
                  valueOp: map(x => {
                    return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                      $jazzicon(x.account, 42),
                      $text(shortenAddress(x.account))
                    )
                    // return $text(shortenTxAddress(x.account))
                  })
                },
                {
                  $head: $text('realisedPnl'),
                  valueOp: map(x => {
                    const str = formatFixed(BigNumber.from(x.realisedPnl).toBigInt(), USD_DECIMALS)

                    return $text(style({ color: str.indexOf('-') > -1 ? pallete.negative : pallete.positive }))(readableUSD(str))
                  })
                },
                // {
                //   $head: $text('markPrice'),
                //   valueOp: map(x => {
                //     const str = formatFixed(BigNumber.from(x.markPrice).toBigInt(), USD_DECIMALS)
                //     return $text(readableUSD(str))
                //   })
                // },
              ],
            })({})
          )
        ),

        $column(layoutSheet.spacingSmall)(
          $header('Latest Liquidated'),

          $TableZZ<LiquidatedPositionEvent>({
            // bodyCellOp: layoutSheet.spacing,
            dataSource: map(
              items => {
                return { data: items }
              },
              mergeArray([
                now(liquidatePositionPositionStore.state),
                map(x => [x], liquidatePosition)
              ])
            ),
            columns: [
              {
                $head: $text('key'),
                valueOp: map(x => {
                  return $text(shortenTxAddress(x.key))
                })
              },
              {
                $head: $text('time'),
                valueOp: map(x => {
                  return $text(new Date(x.time).toLocaleString())
                })
              },
              {
                $head: $text('account'),
                valueOp: map(x => {
                  const str = shortenAddress(x.account)
                  return $text(str)
                })
              },
              {
                $head: $text('collateral'),
                valueOp: map(x => {
                  const str = formatFixed(BigNumber.from(x.collateral).toBigInt(), USD_DECIMALS)
                  return $text(style({ color: pallete.negative }))(readableUSD(str))
                })
              },
              {
                $head: $text('markPrice'),
                valueOp: map(x => {
                  const str = formatFixed(BigNumber.from(x.markPrice).toBigInt(), USD_DECIMALS)
                  return $text(readableUSD(str))
                })
              },
            ],
          })({})
          
        ),


        $column(layoutSheet.spacingSmall)(
          $header('Latest Increase'),

          $TableZZ<PositionEvent>({
            dataSource: map(
              (items) => {
                return {
                  data: items
                  // .filter(x => x.key.indexOf(filterText) > -1 || x.account?.indexOf(filterText) > -1)
                }
              }, mergeArray([
                now(increasePositionStore.state),
                map(x => [x], increasePosition)
              ])
            ),
            columns: posChangeColumns,
          })({}),
        ),

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


        

        $column(layoutSheet.spacingSmall)(
          $header('Latest Settled'),

          $TableZZ<PositionSettledEvent>({
            dataSource: map(
              items => {
                return {
                  data: items
                  // .filter(x => x.key.indexOf(filterText) > -1)
                }
              },
              mergeArray([
                now(closePositionStore.state),
                map(x => [x], closePosition)
              ])
            ),
            columns: [
              {
                $head: $text('key'),
                valueOp: map(x => {
                  return $text(shortenTxAddress(x.key))
                })
              },
              {
                $head: $text('time'),
                valueOp: map(x => {
                  return $text(new Date(x.time).toLocaleString())
                })
              },
              {
                $head: $text('realisedPnl'),
                valueOp: map(x => {
                  const str = formatFixed(BigNumber.from(x.realisedPnl).toBigInt(), USD_DECIMALS)

                  return $text(style({ color: str.indexOf('-') > -1 ? pallete.negative : pallete.positive }))(readableUSD(str))
                })
              },
              {
                $head: $text('collateral'),
                valueOp: map(x => {
                  const str = formatFixed(BigNumber.from(x.collateral).toBigInt(), USD_DECIMALS)
                  return $text(readableUSD(str))
                })
              },
              {
                $head: $text('size'),
                valueOp: map(x => {
                  const str = formatFixed(BigNumber.from(x.size).toBigInt(), USD_DECIMALS)
                  return $text(readableUSD(str))
                })
              },
            ],
          })({}),
        ),

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
          
        // ),


      )




  



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

