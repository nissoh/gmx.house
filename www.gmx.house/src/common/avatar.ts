import { $text, $wrapNativeElement, style } from "@aelea/dom"
import { $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { isAddress } from "@gambitdao/gmx-middleware"
import { map } from "@most/core"
// @ts-ignore
import jazzicon from 'jazzicon'


export function $jazzicon(address: string | null, size = '24px') {

  const isAddressValid = address && isAddress(address)

  if (!isAddressValid) {
    return $row(style({ minWidth: size, minHeight: size, borderRadius: '50%', border: `1px solid ${pallete.foreground}`, placeContent: 'center', alignItems: 'center' }))(
      $text(style({ fontWeight: 800, color: pallete.foreground }))('?')
    )
  }


  const cnt = parseInt(address.slice(2, 10), 16)
  const el = jazzicon(parseInt(size), cnt)

  return $wrapNativeElement(el)(map(node => {
    const el: HTMLElement = node.element
    const svg = el.querySelector('svg')
    if (svg) {
      svg.setAttribute('width', size)
      svg.setAttribute('height', size)

      el.style.borderRadius = '50%'
    }
    return node
  }), style({ width: size, minWidth: size, height: size, display: 'flex', position: 'relative' }))()
}

