import { $node, style } from "@aelea/dom"

export const $spinner = $node(style({
  margin: '0 auto',
  width: '55px',
  height: '55px',
  borderRadius: '50%',
  border: '4px #fff dashed',
  boxShadow: 'inset 0px 0px 0px 3px #fff',
  backgroundColor: 'transparent',
  animation: 'spinner 5s linear infinite',
}))()