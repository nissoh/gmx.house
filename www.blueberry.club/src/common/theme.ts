
import type { Theme } from '@aelea/ui-components-theme'


const light: Theme = {
  name: 'light',
  pallete: {
    primary: '#2c98f3',

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
    primary: '#c973f1',

    message: '#ffffff',

    background: '#141416',
    horizon: '#202229',
    middleground: '#502b86',
    foreground: '#b9b0b8',

    positive: '#38E567',
    negative: '#FA4333',
    indeterminate: '#dccb07',
  }
}


export { light, dark }

