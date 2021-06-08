
import type { Theme } from '@aelea/ui-components-theme'


const light: Theme = {
  name: 'light',
  pallete: {
    primary: '#f00',

    message: '#000000',

    background: '#ffffff',
    horizon: '#dcdcdc',
    middleground: '#e0d0ab',
    foreground: '#7b7b7b',

    positive: '#0fd25e',
    negative: '#b70636',
    indeterminate: '#dccb07',
  }
}

const dark: Theme = {
  name: 'dark',
  pallete: {
    primary: '#e24183',

    message: '#ffffff',

    background: '#1f0a44',
    horizon: '#381a63',
    middleground: '#502b86',
    foreground: '#bca4de',

    positive: '#a6f5a6',
    negative: '#ff3e29',
    indeterminate: '#dccb07',
  }
}


export { light, dark }

