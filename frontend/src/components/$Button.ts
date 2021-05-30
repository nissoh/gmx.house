import { style } from "@aelea/core"
import { $Button as $UIComponentsButton, IButton } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { O } from "@aelea/utils"



const buttonStyle = style({
  border: 'none',
  borderRadius: '8px',
  fontWeight: 'bold',
  alignItems: 'center',
  placeContent: 'center',
  color: '#000',
  textTransform: 'uppercase'
})
const ovverideButtonStyle = style({ backgroundColor: pallete.primary }, )
const positiveStyle = style({ backgroundColor: pallete.positive }, )
const negativeStyle = style({ backgroundColor: pallete.negative }, )

export const $ButtonPrimary = (config: IButton) => O($UIComponentsButton({ ...config }), buttonStyle, ovverideButtonStyle)
export const $ButtonDanger = (config: IButton) => O($UIComponentsButton({ ...config }), buttonStyle, ovverideButtonStyle)
export const $ButtonPositive = (config: IButton) => O($UIComponentsButton({ ...config }), buttonStyle, positiveStyle)
export const $ButtonNegative = (config: IButton) => O($UIComponentsButton({ ...config }), buttonStyle, negativeStyle)
