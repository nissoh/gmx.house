
import { colorAlpha, Theme } from '@aelea/ui-components-theme'


const light: Theme = {
  name: 'light',
  pallete: {
    primary: '#2c98f3',

    message: '#000000',

    background: '#ffffff',
    horizon: '#e1e5f1',
    middleground: colorAlpha('#000', .15),
    foreground: '#3b565f',

    positive: '#0cab00',
    negative: '#ea004c',
    indeterminate: '#dccb07',
  }
}
// radial - gradient(570 % 71 % at 50 % 15vh, rgb(26 24 63) 0px, rgb(29 18 38) 100 %)
const dark: Theme = {
  name: 'dark',
  pallete: {
    primary: 'rgb(255 0 116)',

    message: '#ffffff',

    background: '#030a17',
    horizon: '#1c1b3d',
    middleground: colorAlpha('#fff', .15),
    foreground: '#75849f',

    positive: '#38E567',
    negative: '#FA4333',
    indeterminate: '#dccb07',
  }
}


export { light, dark }

