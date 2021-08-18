
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
    primary: '#079dfa',

    message: '#ffffff',

    background: '#0e0f20',
    horizon: '#16273a',
    middleground: '#502b86',
    foreground: '#8284b1',

    positive: '#91fbad',
    negative: '#ff3e29',
    indeterminate: '#dccb07',
  }
}


export { light, dark }

