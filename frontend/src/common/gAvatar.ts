import { $wrapNativeElement } from "@aelea/core"
// @ts-ignore
import jazzicon from 'jazzicon'


export function $jazzicon(addres: string, size = 24) {
  const cnt = parseInt(addres.slice(2, 10), 16)
  const el = jazzicon(size, cnt)
  return $wrapNativeElement(el)()
}

