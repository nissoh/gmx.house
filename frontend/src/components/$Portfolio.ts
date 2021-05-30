import { $Node, $text, Behavior, component, INode, style } from "@aelea/core"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { skipRepeats } from "@most/core"
import { BSC_CONTRACTS } from "gambit-middleware"
import { $icon } from "../common/$icons"



export interface IPortfolioStoreState {
  selected: BSC_CONTRACTS
  interval: string
}

export interface IPortfolio {
}

const $AssetLabel = (label: string, ticker: string, $iconPath: $Node) => $row(style({ alignItems: 'center' }), layoutSheet.spacingSmall)(
  $icon({ $content: $iconPath, viewBox: '0 0 32 32' }),
  $column(
    $text(style({  }))(ticker),
    $text(style({ fontSize: '80%', color: pallete.foreground }))(label),
  ),
)

export const $Portfolio = (config: IPortfolio) => component((
  [selectToken, sampleChangeSelection]: Behavior<INode, string>
) => {




  return [
    $column(layoutSheet.spacingBig)(




    ),
    {
      selectToken: skipRepeats(selectToken)
    }
  ]
})


