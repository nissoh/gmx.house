// import { Behavior, component } from "@aelea/dom"
// import { pallete } from '@aelea/ui-components-theme'
// import { LineStyle, MouseEventParams, SeriesMarker, SeriesType } from 'lightweight-charts'
// import { $Chart, IChart } from './$Chart'




// export interface ILine extends Omit<IChart<'Line'>, 'initializeSeries'> {
// }

// export const $Line = (config: ILine) => component((
//   [sampleData, data]: Behavior<any, any>,
//   [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>
// ) => {

//   return [
//     $Chart({
//       ...config,
//       chartConfig: {
//         rightPriceScale: {
//           visible: false
//         },
//         grid: {
//           horzLines: {
//             visible: false,
//           },
//           vertLines: {
//             visible: false
//           },
//         },
//         overlayPriceScales: {
//           borderVisible: false,
//         },
//         leftPriceScale: {
//           visible: false
//         },
//         timeScale: {
//           secondsVisible: true,
//           timeVisible: true,
//           lockVisibleTimeRangeOnResize: true,
//           shiftVisibleRangeOnNewBar: true,
//           borderColor: pallete.background,
//         },
//         crosshair: {
//           horzLine: {
//             color: pallete.horizon,
//             width: 2,
//             visible: false,
//             style: LineStyle.Dashed,
//             labelBackgroundColor: pallete.background,
//           },
//           vertLine: {
//             labelBackgroundColor: pallete.background,
//             color: pallete.horizon,
//             width: 3,
//             style: LineStyle.Solid,
//           }
//         },

//         ...config.chartConfig
//       },
//       // historicalData: 
//       initializeSeries: (api) => {
//         const series = api.addAreaSeries({
//           lineStyle: LineStyle.Solid,
//           lineWidth: 2,
//           baseLineVisible: false,
//           lastValueVisible: false,
//           priceLineVisible: false,

//           // crosshairMarkerVisible: false,
//           lineColor: pallete.primary,
//           topColor: pallete.background,	
//           bottomColor: 'transparent',
//         })

//         const priceSacle = api.priceScale()

//         // console.log(priceSacle.options())



//         // series.createPriceLine({
//         //   price: 57824,
//         //   color: '#be1238',
//         //   lineWidth: 2,
//         //   lineStyle: LineStyle.Solid,
//         //   axisLabelVisible: true,
//         //   title: 'minimum price',
//         // })

//         return series
//       }
//     })({
//       crosshairMove: crosshairMoveTether()
//     }),


//     {
//       crosshairMove
//     }
//   ]
// })


