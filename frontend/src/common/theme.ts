
import type { Theme } from '@aelea/ui-components-theme'

// https://www.radixdlt.com/
// --background-color: #fff;
// --bg-shade-color: #dde5ed;
// --bg-shade-color-alt: #f2f2fc;
// --bg-shade-empty: #e6f1f4;
// --border-light: #e8edf2;
// --primary-color: #060f8f;
// --primary-color-alt: #052cc0;
// --primary-brand-color: #00c389;
// --primary-brand-color-alt: #00ab84;
// --font-color: #003057;
// --font-color-alt: #425563;
// --box-color: #dfdfdf;
// --shade-gradient: linear-gradient(270deg,var(--bg-shade-color-alt),#fff);
// --primary-gradient: linear-gradient(180deg,var(--primary-color-alt),var(--primary-color));
// --primary-gradient-rot: linear-gradient(225deg,var(--primary-color-alt),var(--primary-color));
// radial-gradient(at center center, #0a0f5f 50vh, #00002d)

const light: Theme = {
  name: 'light',
  pallete: {
    primary: '#f00',

    message: '#000000',

    background: '#ffffff',
    horizon: '#fff5de',
    middleground: '#e0d0ab',
    foreground: '#866724',

    positive: '#0fd25e',
    negative: '#b70636',
    indeterminate: '#dccb07',
  }
}

const dark: Theme = {
  name: 'dark',
  pallete: {
    primary: '#ff36bf',

    message: '#ffffff',

    background: '#1f0a44',
    horizon: '#381a63',
    middleground: '#2d363a',
    foreground: '#bca4de',

    positive: '#a6f5a6',
    negative: '#de3434',
    indeterminate: '#dccb07',
  }
}


export { light, dark }

