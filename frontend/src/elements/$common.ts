import { $Branch, $element, $Node, $text, style, stylePseudo } from "@aelea/core"
import { $ButtonIcon, $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty } from "@most/core"
import { Token } from "gambit-middleware"
import { $alertIcon, $caretDblDown, $trash } from "./$icons"

export const $TrashBtn = $ButtonIcon($trash)

export const $card = $column(layoutSheet.spacingBig, style({
  padding: '16px', backgroundColor: pallete.background,
  boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2)'
}))

export const $alert = ($contnet: $Branch) => $row(layoutSheet.spacingSmall, style({ borderRadius: '100px', fontSize: '75%', border: `1px solid ${pallete.negative}`, padding: '10px 14px' }))(
  $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px' }),
  $contnet,
)

export const $anchor = $element('a')(
  stylePseudo(':hover', { color: pallete.primary, fill: pallete.primary }),
  style({
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

export const $tokenLabel = (token: Token, $label?: $Node) => {
  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center' }))(
    // token.$icon,
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '75%', color: pallete.foreground }))(token.symbol)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}

