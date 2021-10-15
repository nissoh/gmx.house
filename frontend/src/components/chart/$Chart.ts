import { Behavior, fromCallback, O, Op } from "@aelea/core"
import { $wrapNativeElement, component, INode, style } from "@aelea/dom"
import { observer } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { chain, empty, filter, map, mergeArray, multicast, now, switchLatest, take } from '@most/core'
import { disposeWith } from '@most/disposable'
import { Stream } from '@most/types'
import { ChartOptions, createChart, DeepPartial, IChartApi, ISeriesApi, LineStyle, MouseEventParams, SeriesDataItemTypeMap, SeriesMarker, SeriesType, Time, TimeRange } from 'lightweight-charts-baseline'

export interface IMarker extends SeriesMarker<Time> {

}

export interface IChart<T extends SeriesType> {
  chartConfig?: DeepPartial<ChartOptions>
  realtimeSource?: Stream<SeriesDataItemTypeMap[T]>

  containerOp?: Op<INode, INode>

  markers?: Stream<IMarker[]>

  initializeSeries: Op<IChartApi, ISeriesApi<T>>
}

export const $Chart = <T extends SeriesType>({ chartConfig, realtimeSource, initializeSeries, containerOp = O(), markers = empty() }: IChart<T>) => component((
  // [sampleCrosshairMove, crosshairMove]: Behavior<MouseEventParams, MouseEventParams>,
  [containerDimension, sampleContainerDimension]: Behavior<INode, ResizeObserverEntry[]>
) => {

  const containerEl = document.createElement('chart')


  
  const api = createChart(containerEl, {
    rightPriceScale: {
      visible: false,
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
      visible: false,
      scaleMargins: {
        bottom: 0,
        top: 0,
      }
    },
    layout: {
      textColor: pallete.message,
      backgroundColor: 'transparent',
      fontFamily: 'RelativeMono',
      fontSize: 12
    },
    timeScale: {
      rightOffset: 0,
      secondsVisible: true,
      timeVisible: true,
      lockVisibleTimeRangeOnResize: true,
      
    },
    crosshair: {
      horzLine: {
        labelBackgroundColor: pallete.background,
        color: pallete.horizon,
        width: 2,
        visible: false,
        style: LineStyle.Dashed,
      },
      vertLine: {
        color: pallete.horizon,
        labelBackgroundColor: pallete.background,
        width: 3,
        style: LineStyle.Solid,
      }
    },
    ...chartConfig
  })
  
  

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


  const initialRender = take(1, map(entries => {
    const entry = entries[0]
    const { width, height } = entry.contentRect

    api.resize(width, height)

  }, containerDimension))
  const newLocal = chain(x => initializeSeries(now(api)), initialRender)
  
  const ignoreAll = filter(() => false)
  return [
    $wrapNativeElement(containerEl)(
      style({ position: 'relative', minHeight: '30px', flex: 1 }),
      sampleContainerDimension(observer.resize()),
      containerOp,
    )(

      switchLatest(
        map((seriesApi) => {

          return ignoreAll(
            mergeArray([

              map(entries => {
                const entry = entries[0]
                const { width, height } = entry.contentRect

                api.resize(width, height)

              }, containerDimension),

              realtimeSource
                ? map(data => {
                  seriesApi.update(data)
                  return empty()
                }, realtimeSource)
                : empty(),

              // chain(s => {
              //   seriesApi.setMarkers(s)
              //   return empty()
              // }, map),
            ])
          )
        
        }, newLocal)
      )
      
      
    ),

    {
      crosshairMove,
      click,
      visibleLogicalRangeChange,
      visibleTimeRangeChange,
    }
  ]
})


