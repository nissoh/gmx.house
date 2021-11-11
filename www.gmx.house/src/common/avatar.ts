import { $wrapNativeElement, style } from "@aelea/dom"
import { map } from "@most/core"
// @ts-ignore
import jazzicon from 'jazzicon'


export function $jazzicon(address: string, size = '24px') {

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

