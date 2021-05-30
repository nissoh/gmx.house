import { $wrapNativeElement, Behavior, component, INode, style, styleBehavior } from '@aelea/core'
import { observer } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { fromCallback } from '@aelea/utils'
import { chain, map, multicast, never } from '@most/core'
import { disposeWith } from '@most/disposable'
import { Stream } from '@most/types'
import { ChartOptions, createChart, DeepPartial, IChartApi, ISeriesApi, LineStyle, MouseEventParams, SeriesDataItemTypeMap, SeriesType, TimeRange } from 'lightweight-charts'


interface IChart<T extends SeriesType> {
  chartConfig?: DeepPartial<ChartOptions>
  dataSource: Stream<SeriesDataItemTypeMap[T]>
  initializeSeries: (api: IChartApi) => ISeriesApi<T>
}

export const $Chart = <T extends SeriesType>({ chartConfig, dataSource, initializeSeries }: IChart<T>) => component((
  // [sampleCrosshairMove, crosshairMove]: Behavior<MouseEventParams, MouseEventParams>,
  [containerDimension, sampleContainerDimension]: Behavior<INode, ResizeObserverEntry[]>
) => {

  const containerEl = document.createElement('chart')

 
  const api = createChart(containerEl, {
    handleScale: {
    },
    layout: {
      textColor: pallete.message,
      backgroundColor: 'transparent',
    },
    leftPriceScale: {
      // autoScale: true,
    },
    rightPriceScale: {
      // autoScale: true,
      drawTicks: false,
      alignLabels: false,
      // scaleMargins: {
      //   top: 0.3,
      //   bottom: 0.3,
      // },
      borderVisible: false,
    },
    timeScale: {
      visible: false,
      timeVisible: true,
      secondsVisible: true,
      borderColor: pallete.foreground,
      borderVisible: false,
    },
    grid: {
      horzLines: {
        color: '#eee',
        visible: false,
      },
      vertLines: {
        color: 'transparent',
      },
    },
    crosshair: {
      // mode: CrosshairMode.Normal,
      horzLine: {
        color: pallete.primary,
        width: 1,
        style: LineStyle.Solid,
        // labelVisible: false
      },
      vertLine: {
        visible: false,
      }
    },
    ...chartConfig
  })

  const toolTipWidth = 80
  const toolTipHeight = 80
  const toolTipMargin = 15

  const toolTip = document.createElement('div')
  toolTip.className = 'floating-tooltip-2'
  containerEl.appendChild(toolTip)

  const seriesApi = initializeSeries(api)


  const sty = styleBehavior(map(enties => {
    const entry = enties[0]
    const { width, height } = entry.contentRect

    const targetContent: HTMLElement = entry.target.querySelector('.tv-lightweight-charts')!

    targetContent.style.position = 'absolute'
    timeScale.scrollToPosition(0, false)

    api.resize(width, height)
    return {}
  }, containerDimension))


  const crosshairMove = multicast(
    fromCallback<MouseEventParams>(cb => {
      api.subscribeCrosshairMove(cb)
      disposeWith(handler => api.unsubscribeCrosshairMove(handler), cb)
    })
  )
  const click = multicast(
    fromCallback<MouseEventParams>(cb => {
      api.subscribeClick(cb)
      disposeWith(handler => api.unsubscribeClick(handler), cb)
    })
  )

  const timeScale = api.timeScale()
  timeScale.subscribeVisibleLogicalRangeChange(range => {
    console.log(range)
  })

  const visibleLogicalRangeChange = multicast(
    fromCallback(cb => {
      timeScale.subscribeVisibleLogicalRangeChange(cb)
      disposeWith(handler => timeScale.subscribeVisibleLogicalRangeChange(handler), cb)
    })
  )

  const visibleTimeRangeChange = multicast(
    fromCallback<TimeRange | null>(cb => {
      timeScale.subscribeVisibleTimeRangeChange(cb)
      disposeWith(handler => timeScale.unsubscribeVisibleTimeRangeChange(handler), cb)
    })
  )




  // api.subscribeCrosshairMove(function(param) {
  //   if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > containerEl.clientWidth || param.point.y < 0 || param.point.y > containerEl.clientHeight) {
  //     toolTip.style.display = 'none'
  //   } else {
  //     toolTip.style.display = 'block'
  //     const price = param.seriesPrices.get(seriesApi) as BarPrices
  //     toolTip.innerHTML = '<div style="color: #009688">Apple Inc.</div><div style="font-size: 24px; margin: 4px 0px; color: #21384d">' + Math.round(100 * price.close) / 100 + '</div><div style="color: #21384d">' + param.time + '</div>'
  //     const coordinate = seriesApi.priceToCoordinate(price.close)
  //     let shiftedCoordinate = param.point.x - 50
  //     if (coordinate === null) {
  //       return
  //     }
  //     shiftedCoordinate = Math.max(0, Math.min(containerEl.clientWidth - toolTipWidth, shiftedCoordinate))
  //     const coordinateY = coordinate - toolTipHeight - toolTipMargin > 0 ? coordinate - toolTipHeight - toolTipMargin : Math.max(0, Math.min(containerEl.clientHeight - toolTipHeight - toolTipMargin, coordinate + toolTipMargin))
  //     toolTip.style.left = shiftedCoordinate + 'px'
  //     toolTip.style.top = coordinateY + 'px'
  //   }
  // })

  return [
    $wrapNativeElement(containerEl)(sty, style({ position: 'relative', flex: 1, }), sampleContainerDimension(observer.resize({ box: "content-box" })))(
      chain(data => {
        seriesApi.update(data)
        return never()
      }, dataSource)
    ),

    {
      crosshairMove,
      click,
      visibleLogicalRangeChange,
      visibleTimeRangeChange,
    }
  ]
})


