import 'construct-style-sheets-polyfill'
import './assignThemeSync' // apply synchnously theme before all styles are being evaluated

import { runBrowser } from "@aelea/dom"
import $Main from './pages/$Main'


runBrowser({ rootNode: document.body })(
  $Main({})({})
)