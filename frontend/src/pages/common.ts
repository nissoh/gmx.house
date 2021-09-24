import { O } from "@aelea/core"
import { $text, style, styleBehavior, styleInline } from "@aelea/dom"
import { $column, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { filter, map, multicast, snapshot } from "@most/core"
import { ARBITRUM_CONTRACTS, calculatePositionDelta, formatFixed, formatReadableUSD, getLiquidationPriceFromDelta, getPositionMarginFee, IAggregatedAccountSummary, IAggregatedPositionSummary, IAggregatedSettledTradeSummary, IAggregatedTradeSummary, parseFixed, USD_DECIMALS } from "gambit-middleware"
import { klineWS, PRICE_EVENT_TICKER_MAP, WSBTCPriceEvent } from "../binance-api"
import { $icon, $tokenIconMap } from "../common/$icons"
import { TableColumn } from "../common/$Table2"
import { $bear, $bull, $skull } from "../elements/$icons"


const filterByIndexToken = (pos: IAggregatedPositionSummary) => filter((data: WSBTCPriceEvent) => {
  // @ts-ignore
  const token = PRICE_EVENT_TICKER_MAP[pos.indexToken]
  
  return token === data.s
})

function easeInExpo(x: number) {
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10)
}

const priceChange = multicast(klineWS('ethusdt@aggTrade', 'btcusdt@aggTrade', 'linkusdt@aggTrade', 'uniusdt@aggTrade'))


export const winLossTableColumn = {
  $head: $text('Win / Loss'),
  columnOp: style({ flex: 1.25, placeContent: 'center' }),
  $body: map((pos: IAggregatedAccountSummary) => {
    return $row(
      $text(`${pos.profitablePositionsCount}/${pos.settledPositionCount - pos.profitablePositionsCount}`)
    )
  })
}
  

export const tableRiskColumnCellBody: TableColumn<IAggregatedAccountSummary> = {
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


export const pnlColumnTable = {
  $head: $text('PnL $'),
  columnOp: style({ flex: 1.5, placeContent: 'flex-end', maxWidth: '160px' }),
  $body: map((x: IAggregatedSettledTradeSummary) => {
    const str = formatReadableUSD(x.pnl - x.fee)
    return $row(
      $text(style({ color: str.indexOf('-') > -1 ? pallete.negative : pallete.positive }))(str)
    )
  })
}

export const entyColumnTable: TableColumn<IAggregatedPositionSummary> = {
  $head: $text('Entry'),
  columnOp: O(style({ maxWidth: '65px', placeContent: 'center', flexDirection: 'column' }), layoutSheet.spacingTiny),

  $body: map(({ isLong, indexToken, averagePrice }) => {
    const idx = Object.entries(ARBITRUM_CONTRACTS).find(([k, v]) => v === indexToken)?.[1]

    if (!idx) {
      throw new Error('Unable to find matched token')
    }


    // @ts-ignore
    const $token = $tokenIconMap[idx]

    return $row(style({ placeContent: 'center', alignItems: 'center' }))(
      $column(layoutSheet.spacingTiny)(
        $row(style({ position: 'relative', alignSelf: 'center' }))(
          style({ borderRadius: '50%', padding: '3px', left: '-18px', top: '0', backgroundColor: pallete.background, position: 'absolute', offset: '0 0 0 0', })(
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
        ),  
        $text(style({ fontSize: '.65em' }))(formatReadableUSD(averagePrice))
      )
    )
  })
}


export const riskColumnTableWithLiquidationIndicator: TableColumn<IAggregatedPositionSummary> = {
  $head: $text('Risk'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, flexDirection: 'column', textAlign: 'left', minWidth: '80px', placeContent: 'flex-start' })),
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

      const weight = pos.isLong ? liquidationPriceUsd / markPrice : markPrice / liquidationPriceUsd
      const perc = Math.round(easeInExpo(weight) * 100)
      const value = perc > 100 ? 100 : perc

      return `${value}%`
    }, pnlPosition, positionMarkPrice)

    const ww = styleInline(map((pec) => ({ width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${pec}, ${pallete.foreground} 0)` }), liqPercentage))

    const newLocal = formatReadableUSD(liquidationPrice)
    return $column(style({ fontSize: '.65em', alignItems: 'center' }))(
      $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
        $text(style({ fontWeight: 'bold' }))(`${String(Math.round(pos.leverage))}x`),
        $text(formatReadableUSD(pos.collateral - pos.fee)),
      ),
      ww($seperator),
      $row(style({ gap: '2px', alignItems: 'center' }))(
        $icon({
          $content: $skull,
          width: 12,
          viewBox: '0 0 32 32',
        }),
        $text(newLocal)
      )
    )
  })
}


export const pnlColumnLivePnl: TableColumn<IAggregatedPositionSummary> = {
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
        }, pnlPosition)
      )
    )
  })
}

