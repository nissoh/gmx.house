
import './applyTheme' // apply synchnously theme before all styles are being evaluated

import { runBrowser } from '@aelea/core'
import $Main from './pages/$Main'


runBrowser({ rootNode: document.body })(
  $Main({})
)