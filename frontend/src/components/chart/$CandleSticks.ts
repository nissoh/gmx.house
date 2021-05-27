import { $wrapNativeElement, Behavior, component } from '@aelea/core'
import { pallete, theme } from '@aelea/ui-components-theme'
import { chain, empty, never } from '@most/core'
import { Stream } from '@most/types'
import { ChartOptions, createChart, DeepPartial, LineStyle, MouseEventParams, SeriesDataItemTypeMap, SeriesType } from 'lightweight-charts'
import { $Chart } from './$Chart'




interface ICandlesticks {
  chartConfig?: DeepPartial<ChartOptions>
  update?: Stream<SeriesDataItemTypeMap['Candlestick']>
  initalData?: SeriesDataItemTypeMap['Candlestick'][]
}

export const $CandleSticks = <T extends SeriesType>({ chartConfig, update: dataSource = empty(), initalData = [] }: ICandlesticks) => component((
  [crosshairMove, sampleCrosshairMove]: Behavior<MouseEventParams, MouseEventParams>,
  [click, sampleClick]: Behavior<MouseEventParams, MouseEventParams>,
) => {

  return [
    $Chart({
      dataSource: dataSource,
      initializeSeries: (api) => {
        const candleSeries = api.addCandlestickSeries({
          upColor: 'transparent',
          downColor: pallete.message,
          borderDownColor: pallete.message,
          borderUpColor: pallete.message,
          wickDownColor: pallete.message,
          wickUpColor: pallete.message,
        })

        candleSeries.setData(initalData)

        // candleSeries.createPriceLine({
        //   price: 57824,
        //   color: '#be1238',
        //   lineWidth: 1,
        //   lineStyle: LineStyle.Solid,
        //   axisLabelVisible: true,
        //   title: 'minimum price',
        // })


        return candleSeries
      },
      chartConfig
    })({
      crosshairMove: sampleCrosshairMove(),
      click: sampleClick()
    }),

    {
      crosshairMove,
      click,
    }
  ]
})


