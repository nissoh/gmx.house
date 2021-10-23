import { Behavior, O } from "@aelea/core"
import { $svg, $text, attr, component, nodeEvent, style, stylePseudo } from "@aelea/dom"
import { $icon, $row, layoutSheet } from "@aelea/ui-components"
import { changeTheme, pallete, Theme, THEME_PALLETE_SELECTED_KEY } from "@aelea/ui-components-theme"
import { merge, tap } from "@most/core"




export const $Picker = (themes: Theme[]) => component((
  [changeThemeEffect, changeThemeEffectTether]: Behavior<any, any>
) => {

  const current = JSON.parse(localStorage.getItem(THEME_PALLETE_SELECTED_KEY)!) as Theme

  const applyOps = O(
    style({ cursor: 'pointer' }),
    stylePseudo(':hover', { fill: pallete.primary, color: pallete.primary })
  )

  const changeBehavior = changeThemeEffectTether(
    nodeEvent('click'),
    tap(() => {
      const themeNameList = themes.map(t => t.name)
      const toIdx = (themeNameList.indexOf(current.name) + 1) % themes.length
      const toTheme = themes[toIdx]

      changeTheme(toTheme)
    })
  )

  return [
    merge(
      $row(layoutSheet.spacing, applyOps, changeBehavior)(
        $icon({
          // svgOps: ,
          $content: $svg('path')(attr({ d: 'M22.8 11.039h-1.176c-.664 0-1.2.43-1.2.961 0 .53.536.959 1.2.959H22.8c.662 0 1.2-.429 1.2-.959s-.539-.961-1.2-.961zM12 5.4A6.58 6.58 0 005.4 12a6.58 6.58 0 006.6 6.6 6.58 6.58 0 006.6-6.6c0-3.661-2.941-6.6-6.6-6.6zm0 11.4c-2.653 0-4.8-2.15-4.8-4.8 0-2.653 2.147-4.8 4.8-4.8a4.8 4.8 0 010 9.6zM3.6 12c0-.53-.539-.961-1.2-.961H1.2c-.664 0-1.2.43-1.2.961 0 .53.536.959 1.2.959h1.2c.661 0 1.2-.43 1.2-.959zM12 3.6c.53 0 .959-.536.959-1.2V1.2c0-.664-.43-1.2-.959-1.2-.53 0-.961.536-.961 1.2v1.2c0 .664.43 1.2.961 1.2zm0 16.8c-.53 0-.961.536-.961 1.2v1.2c0 .664.43 1.2.961 1.2.53 0 .959-.536.959-1.2v-1.2c0-.664-.43-1.2-.959-1.2zm8.838-15.88c.47-.47.545-1.154.17-1.528-.374-.375-1.06-.298-1.526.171l-.84.839c-.47.47-.545 1.153-.17 1.528.374.374 1.06.297 1.527-.172l.839-.839zM4.001 18.64l-.84.84c-.47.47-.545 1.152-.17 1.526.374.374 1.059.3 1.526-.17.13-.128.711-.71.84-.838.469-.47.545-1.153.17-1.529-.374-.375-1.06-.296-1.526.17zm.517-15.478c-.468-.47-1.153-.546-1.528-.172-.374.375-.297 1.06.17 1.53.13.128.711.71.84.838.469.47 1.152.546 1.526.172.374-.375.299-1.06-.17-1.528-.128-.13-.708-.712-.838-.84zm14.123 16.837l.84.839c.469.47 1.152.544 1.526.172.375-.375.299-1.06-.17-1.528l-.839-.839c-.47-.469-1.153-.546-1.529-.171-.375.374-.297 1.058.172 1.527z' }))()
        }),
        $text('Switch Theme')
      ),
      changeThemeEffect
    )
    
  ]
})
