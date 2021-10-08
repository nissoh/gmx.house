import { $wrapNativeElement, style } from "@aelea/dom"
import { $row } from "@aelea/ui-components"
// @ts-ignore
import jazzicon from 'jazzicon'


export function $jazzicon(addres: string, size = '24px') {
  const cnt = parseInt(addres.slice(2, 10), 16)
  const el = jazzicon(parseInt(size), cnt)
  return $wrapNativeElement(el)(style({ width: size, height: size, display: 'flex', position: 'relative' }))()
}

