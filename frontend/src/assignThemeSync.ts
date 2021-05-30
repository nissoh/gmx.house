
import type { Theme } from "@aelea/ui-components-theme"
import { dark, light } from "./common/theme"


const THEME_PALLETE_SELECTED_KEY = `!!THEME_PALLETE_SELECTED_KEY`
const themeFromStorage = sessionStorage.getItem(THEME_PALLETE_SELECTED_KEY)
const themeList = [dark, light]


if (themeFromStorage === null) {
  const darkModePreferance = self?.matchMedia('(prefers-color-scheme: dark)').matches
  const defaultTheme = dark//darkModePreferance ? light : dark

  sessionStorage.setItem(THEME_PALLETE_SELECTED_KEY, JSON.stringify(defaultTheme))
} else {
  const storedSelectedTheme: Theme = JSON.parse(themeFromStorage)
  const currentTheme = themeList.find(t => t.name === storedSelectedTheme.name)

  sessionStorage.setItem(THEME_PALLETE_SELECTED_KEY, JSON.stringify(currentTheme))
}


