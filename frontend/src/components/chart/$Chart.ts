import { $wrapNativeElement, Behavior, component, INode, style, styleBehavior } from '@aelea/core'
import { observer } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { fromCallback, O, Op } from '@aelea/utils'
import { chain, empty, map, mergeArray, multicast } from '@most/core'
import { disposeWith } from '@most/disposable'
import { Stream } from '@most/types'
import { ChartOptions, createChart, DeepPartial, IChartApi, ISeriesApi, LineStyle, MouseEventParams, Nominal, SeriesDataItemTypeMap, SeriesMarker, SeriesType, Time, TimeRange, UTCTimestamp } from 'lightweight-charts'
import { intervalInMsMap } from '../../logic/constant'

export interface IMarker extends SeriesMarker<Time> {

}

export interface IChart<T extends SeriesType> {
  chartConfig?: DeepPartial<ChartOptions>
  realtimeSource?: Stream<SeriesDataItemTypeMap[T]>
  historicalData?: SeriesDataItemTypeMap[T][]

  containerOp?: Op<INode, INode>

  markers?: Stream<IMarker[]>

  initializeSeries: (api: IChartApi) => ISeriesApi<T>
}

export const $Chart = <T extends SeriesType>({ chartConfig, realtimeSource, initializeSeries, historicalData, containerOp = O(), markers = empty() }: IChart<T>) => component((
  // [sampleCrosshairMove, crosshairMove]: Behavior<MouseEventParams, MouseEventParams>,
  [containerDimension, sampleContainerDimension]: Behavior<INode, ResizeObserverEntry[]>
) => {

  const containerEl = document.createElement('chart')


  const api = createChart(containerEl, {
    rightPriceScale: {
      visible: false
    },
    handleScale: {
          
    },
    grid: {
      horzLines: {
        color: '#eee',
        visible: false,
      },
      vertLines: {
        color: 'transparent',
        visible: false
      },
    },
    overlayPriceScales: {
      borderVisible: false,
    },
    leftPriceScale: {
      visible: false
    },
    layout: {
      textColor: pallete.message,
      backgroundColor: 'transparent',
      fontFamily: 'Work Sans'
    },
    timeScale: {
      secondsVisible: true,
      timeVisible: true,
      lockVisibleTimeRangeOnResize: true
    },
    crosshair: {
      horzLine: {
        color: pallete.horizon,
        width: 2,
        visible: false,
        style: LineStyle.Dashed,
      },
      vertLine: {
        color: pallete.horizon,
        width: 3,
        style: LineStyle.Solid,
      }
    },
    ...chartConfig
  })


  
  const seriesApi = initializeSeries(api)

  console.log(
    api.timeScale().getVisibleLogicalRange(),
    api.timeScale().getVisibleRange()
  )

  if (historicalData) {
    seriesApi.setData(historicalData)
  }
  
  // api.timeScale().resetTimeScale()

  // setTimeout(() => {
  // api.timeScale().scrollToRealTime()
  // }, 1000)

  const now = Date.now()



  // api.timeScale().setVisibleLogicalRange({
  //   from: 0,
  //   to: 677,
  // })

  const sty = styleBehavior(
    map(enties => {
      const entry = enties[0]
      const { width, height } = entry.contentRect

      const targetContent: HTMLElement = entry.target.querySelector('.tv-lightweight-charts')!
      console.log(width, height)

      // targetContent.style.position = 'absolute'
      // timeScale.scrollToPosition(0, false)

      api.resize(width, height)
      api.timeScale().fitContent()

      return {}
    }, containerDimension)
  )


  const crosshairMove = fromCallback<MouseEventParams>(
    cb => {
      api.subscribeCrosshairMove(cb)
      disposeWith(handler => api.unsubscribeCrosshairMove(handler), cb)
    }
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


  return [
    $wrapNativeElement(containerEl)(
      sty,
      style({ position: 'relative', minHeight: '30px' }), sampleContainerDimension(observer.resize({ box: "content-box" })),
      containerOp
    )(
      mergeArray([
        realtimeSource
          ? chain(data => {
            seriesApi.update(data)
            return empty()
          }, realtimeSource)
          : empty(),

        chain(s => {
          seriesApi.setMarkers(s)
          return empty()
        }, markers),
        
        // historicalData
        //   ? chain(data => {
        //     seriesApi.setData(data)
        //     // api.timeScale().resetTimeScale()

        //     // api.timeScale().fitContent()
        //     // setTimeout(() => {
        //     //   api.timeScale().scrollToRealTime()
        //     // }, 1000)

        //     const now = Date.now()

        //     api.timeScale().setVisibleRange({
        //       from: (now - intervalInMsMap.DAY * 7) / 1000 as Time,
        //       to: now / 1000 as Time,
        //     })
        //     return empty()
        //   }, historicalData)
        //   : empty()
      ])
    ),

    {
      crosshairMove,
      click,
      visibleLogicalRangeChange,
      visibleTimeRangeChange,
    }
  ]
})


