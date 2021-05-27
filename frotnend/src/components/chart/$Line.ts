import { Behavior, component } from '@aelea/core'
import { pallete, theme } from '@aelea/ui-components-theme'
import { empty } from '@most/core'
import { Stream } from '@most/types'
import { ChartOptions, DeepPartial, LineStyle, SeriesDataItemTypeMap, SeriesType } from 'lightweight-charts'
import { $Chart } from './$Chart'




interface ILine {
  chartConfig?: DeepPartial<ChartOptions>
  update?: Stream<SeriesDataItemTypeMap['Line']>
  initalData?: SeriesDataItemTypeMap['Line'][]
}

export const $Line = <T extends SeriesType>({ chartConfig, update: dataSource = empty(), initalData = [] }: ILine) => component((
  [sampleData, data]: Behavior<any, any>
) => {

  return [
    $Chart({
      dataSource: dataSource,
      initializeSeries: (api) => {
        const series = api.addLineSeries({
          lineStyle: LineStyle.Solid,
          color: pallete.message
        })

        series.setData(initalData)

        series.createPriceLine({
          price: 57824,
          color: '#be1238',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'minimum price',
        })

        return series
      },
      chartConfig
    })({}),
  ]
})


