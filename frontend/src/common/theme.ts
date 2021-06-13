
import type { Theme } from '@aelea/ui-components-theme'


const light: Theme = {
  name: 'light',
  pallete: {
    primary: '#b573ff',

    message: '#000000',

    background: '#ffffff',
    horizon: '#e1e5f1',
    middleground: '#b7daff',
    foreground: '#3b565f',

    positive: '#0cab00',
    negative: '#ea004c',
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

