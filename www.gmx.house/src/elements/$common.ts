import { $Branch, $element, $Node, $text, style, styleInline, stylePseudo } from "@aelea/dom"
import { $ButtonIcon, $column, $icon, $row, layoutSheet, $seperator as $uiSeperator } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map } from "@most/core"
import { Stream } from "@most/types"
import { IAggregatedTradeOpen, IAggregatedTradeSummary, strictGet, Token, TradeableToken, TRADEABLE_TOKEN_ADDRESS_MAP } from "@gambitdao/gmx-middleware"
import { $tokenIconMap } from "../common/$icons"
import { $alertIcon, $caretDblDown, $trash } from "./$icons"

export const $TrashBtn = $ButtonIcon($trash)

export const $card = $column(layoutSheet.spacingBig, style({
  padding: '16px', backgroundColor: pallete.background,
  boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2)'
}))

export const $seperator = $text(style({ color: pallete.foreground, pointerEvents: 'none' }))('|')

export const $alert = ($contnet: $Branch) => $row(layoutSheet.spacingSmall, style({ borderRadius: '100px', alignItems: 'center', fontSize: '75%', border: `1px solid ${pallete.negative}`, padding: '10px 14px' }))(
  $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
  $contnet,
)

export const $anchor = $element('a')(
  stylePseudo(':hover', { color: pallete.primary + '!important', fill: pallete.primary }),
  style({
    display: 'flex',
    cursor: 'pointer',
    color: pallete.message
  }),
)

export const $labeledDivider = (label: string) => {
  return $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center' }))(
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.middleground}` }))(),
    $row(layoutSheet.spacingSmall, style({ color: pallete.foreground, alignItems: 'center' }))(
      $text(style({ fontSize: '75%' }))(label),
      $icon({ $content: $caretDblDown, width: '10px', viewBox: '0 0 32 32', fill: pallete.foreground }),
    ),
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.middleground}` }))(),
  )
}

export const $tokenLabel = (token: Token | TradeableToken, $iconG: $Node, $label?: $Node) => {
  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center' }))(
    $icon({ $content: $iconG, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '75%', color: pallete.foreground }))(token.symbol)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}

export const $tokenLabelFromSummary = (trade: IAggregatedTradeOpen, $label?: $Node) => {
  const indextoken = trade.initialPosition.indexToken
  const $iconG = $tokenIconMap[indextoken]
  const token = strictGet(TRADEABLE_TOKEN_ADDRESS_MAP, indextoken)

  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center', }))(
    $icon({ $content: $iconG, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '75%', color: pallete.foreground }))(token.symbol)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}

export const $leverage = (pos: IAggregatedTradeSummary) =>
  $text(style({ fontWeight: 'bold' }))(`${String(Math.round(pos.leverage))}x`)
  

export function $liquidationSeparator(liqWeight: Stream<number>) {
  return styleInline(map((weight) => {
    return { width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${`${weight * 100}%`}, ${pallete.foreground} 0)` }
  }, liqWeight))(
    $uiSeperator
  )
}

