// import { Behavior, component, style } from "@aelea/dom"
// import { pallete } from '@aelea/ui-components-theme'
// import { MouseEventParams } from 'lightweight-charts'
// import { $Chart, IChart } from './$Chart'




// export interface ICandlesticks extends Omit<IChart<'Candlestick'>, 'initializeSeries'> {

// }

// export const $CandleSticks = (config: ICandlesticks) => component((
//   [crosshairMove, sampleCrosshairMove]: Behavior<MouseEventParams, MouseEventParams>,
//   [click, sampleClick]: Behavior<MouseEventParams, MouseEventParams>,
// ) => {

//   return [
//     $Chart({
//       ...config,
//       // chartConfig: {

//       // },
//       containerOp: style({
//         height: '300px'
//       }),
//       initializeSeries: (api) => {
//         const candleSeries = api.addCandlestickSeries({
//           upColor: 'transparent',
//           downColor: pallete.foreground,
//           borderDownColor: pallete.foreground,
//           borderUpColor: pallete.foreground,
//           wickDownColor: pallete.foreground,
//           wickUpColor: pallete.foreground,
//         })

//         return candleSeries
//       },
//     })({
//       crosshairMove: sampleCrosshairMove(),
//       click: sampleClick()
//     }),

//     {
//       crosshairMove,
//       click,
//     }
//   ]
// })


