import { O } from "@aelea/core"
import { $text, component, style, styleBehavior, styleInline } from "@aelea/dom"
import { $column, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { filter, map, multicast, snapshot } from "@most/core"
import { ARBITRUM_TRADEABLE_ADDRESS, calculatePositionDelta, formatFixed, formatReadableUSD, getLiquidationPriceFromDelta, getPositionMarginFee, IAggregatedAccountSummary, IAggregatedOpenPositionSummary, IAggregatedSettledTradeSummary, IAggregatedTradeSummary, parseFixed, USD_DECIMALS } from "gambit-middleware"
import { klineWS, PRICE_EVENT_TICKER_MAP, WSBTCPriceEvent } from "../binance-api"
import { $icon, $tokenIconMap } from "../common/$icons"
import { TableColumn } from "../common/$Table2"
import { $leverage } from "../elements/$common"
import { $bear, $bull, $skull } from "../elements/$icons"


export const filterByIndexToken = (pos: IAggregatedOpenPositionSummary) => filter((data: WSBTCPriceEvent) => {
  // @ts-ignore
  const token = PRICE_EVENT_TICKER_MAP[pos.indexToken]
  
  return token === data.s
})

function easeInExpo(x: number) {
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10)
}


const intervals = [
  { label: 'year', seconds: 31536000 },
  { label: 'month', seconds: 2592000 },
  { label: 'day', seconds: 86400 },
  { label: 'hour', seconds: 3600 },
  { label: 'minute', seconds: 60 },
  { label: 'second', seconds: 1 }
] as const

export function timeSince(time: number) {
  const seconds = Date.now() / 1000 - time | 0
  const interval = intervals.find(i => i.seconds < seconds)

  if (!interval)
    return ''
  const count = seconds / interval.seconds | 0
  return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`
}

export const priceChange = multicast(klineWS('ethusdt@aggTrade', 'btcusdt@aggTrade', 'linkusdt@aggTrade', 'uniusdt@aggTrade'))


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
        $leverage(pos),
        $text(formatReadableUSD(pos.collateral - pos.fee))
      ),
      style({ width: '100%' }, $seperator),
      $text(style({  }))(formatReadableUSD(pos.size - pos.fee)),
    )
  })
}



export const $ProfitLoss = (pos: IAggregatedSettledTradeSummary) => component(() => {
  const str = formatReadableUSD(pos.pnl - pos.fee)

  return [
    $row(
      $text(style({ color: str.indexOf('-') > -1 ? pallete.negative : pallete.positive }))(str)
    )
  ]
})


export const $RiskLiquidator = (pos: IAggregatedOpenPositionSummary) => component(() => {
  const liquidationPrice = getLiquidationPriceFromDelta(pos.collateral - getPositionMarginFee(pos.size), pos.size, pos.averagePrice, pos.isLong)

  const positionMarkPrice = filterByIndexToken(pos)(priceChange)

  const pnlPosition = multicast(map(price => {
    const markPrice = parseFixed(price.p, 30)

    return calculatePositionDelta(markPrice, pos.isLong, pos)
  }, filterByIndexToken(pos)(priceChange)))

  const liqPercentage = snapshot((meta, price) => {
    const markPrice = Number(price.p)
    const liquidationPriceUsd = formatFixed(liquidationPrice, USD_DECIMALS)

    const weight = pos.isLong ? liquidationPriceUsd / markPrice : markPrice / liquidationPriceUsd
    const perc = Math.round(easeInExpo(weight) * 100)
    const value = perc > 100 ? 100 : perc

    return `${value}%`
  }, pnlPosition, positionMarkPrice)

  const $liquidationIndicator = styleInline(map((pec) => ({ width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${pec}, ${pallete.foreground} 0)` }), liqPercentage))


  return [
    $column(style({ fontSize: '.65em', alignItems: 'center' }))(
      $row(layoutSheet.spacingTiny)(
        $leverage(pos),
        $text(formatReadableUSD(pos.collateral - pos.fee))
      ),
      $liquidationIndicator($seperator),
      $row(style({ gap: '2px', alignItems: 'center' }))(
        $icon({
          $content: $skull,
          width: 12,
          viewBox: '0 0 32 32',
        }),
        $text(
          formatReadableUSD(liquidationPrice)
        )
      )
    )
  ]
})


export const $LivePnl = (pos: IAggregatedOpenPositionSummary) => component(() => {
  const pnlPosition = multicast(map(price => {
    const markPrice = parseFixed(price.p, 30)

    return calculatePositionDelta(markPrice, pos.isLong, pos, )
  }, filterByIndexToken(pos)(priceChange)))

  return [
    $row(
      $text(styleBehavior(map(s => ({ color: s.delta > 0 ? pallete.positive : pallete.negative }), pnlPosition)))(
        map(meta => {

          const pnl = formatReadableUSD(meta.delta - pos.fee)
          return `${meta.delta > 0 ? pnl : `${pnl.startsWith('-') ? pnl : '-' + pnl}`}`
        }, pnlPosition)
      )
    )
  ]
})


export const $Entry = (pos: IAggregatedOpenPositionSummary) => component(() => {
  const idx = Object.entries(ARBITRUM_TRADEABLE_ADDRESS).find(([k, v]) => v === pos.indexToken)?.[1]

  if (!idx) {
    throw new Error('Unable to find matched token')
  }

  const $token = $tokenIconMap[idx]

  return [
    $row(
      $column(layoutSheet.spacingTiny, style({ alignSelf: 'flex-start' }))(
        $row(style({ position: 'relative', flexDirection: 'row-reverse', alignSelf: 'center' }))(
          $icon({
            $content: $token,
            viewBox: '0 0 32 32',
            width: 24,
          }),
          style({ borderRadius: '50%', padding: '3px', marginRight: '-5px', backgroundColor: pallete.background, })(
            $icon({
              $content: pos.isLong ? $bull : $bear,
              viewBox: '0 0 32 32',
            })
          ),
        ),  
        $text(style({ fontSize: '.65em', textAlign: 'center', color: pallete.primary }))(formatReadableUSD(pos.averagePrice))
      )
    )
  ]
})

