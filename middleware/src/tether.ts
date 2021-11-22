import { Pipe } from '@aelea/core'
import { disposeNone, disposeWith } from '@most/disposable'
import { remove } from '@most/prelude'
import { Disposable, Scheduler, Sink, Stream, Time } from '@most/types'


class SourceSink<T> implements Sink<T> {
  hasValue = false
  latestValue!: T

  constructor(private parent: Tether<T>, public sink: Sink<T>) { }

  event(t: number, x: T): void {
    this.latestValue = x
    this.hasValue = true

    this.sink.event(t, x)
    this.parent.tetherSinkList.forEach(s => s.event(t, x))
  }

  end(t: Time) {
    this.sink.end(t)
  }

  error(t: Time, e: Error): void {
    this.sink.error(t, e)
  }
}

class TetherSink<A> extends Pipe<A, A> {

  constructor(public sink: Sink<A>) {
    super(sink)
  }

  event(t: number, x: A): void {
    this.sink.event(t, x)
  }

}



class Tether<T> implements Stream<T> {

  sourceSinkList: SourceSink<T>[] = []
  tetherSinkList: TetherSink<T>[] = []

  sourceDisposable: Disposable = disposeNone()

  constructor(private source: Stream<T>) { }

  run(sink: SourceSink<T> | TetherSink<T>, scheduler: Scheduler): Disposable {

    if (sink instanceof SourceSink) {

      this.sourceDisposable.dispose()
      this.sourceSinkList.push(sink)

      this.sourceDisposable = this.source.run(sink, scheduler)

      return {
        dispose: () => {
          const srcIdx = this.sourceSinkList.indexOf(sink)
          this.sourceSinkList.splice(srcIdx, 1)
          this.sourceDisposable.dispose()
        }
      }
    }

    this.tetherSinkList.push(sink)

    this.sourceSinkList.forEach(s => {
      if (s.hasValue) {
        sink.event(scheduler.currentTime(), s.latestValue)
      }
    })


    return disposeWith(
      ([tetherSinkList, sourceTetherSink]) => {
        sourceTetherSink.end(scheduler.currentTime())
        const sinkIdx = tetherSinkList.indexOf(sourceTetherSink)

        if (sinkIdx > -1) {
          remove(sinkIdx, tetherSinkList)
        }
      },
      [this.tetherSinkList, sink] as const
    )
  }


}



export const tether = <T>(source: Stream<T>): [Stream<T>, Stream<T>] => {
  const tetherSource = new Tether(source)

  return [
    {
      run(sink, scheduler) {
        return tetherSource.run(new SourceSink(tetherSource, sink), scheduler)
      }
    },
    {
      run(sink, scheduler) {
        return tetherSource.run(new TetherSink(sink), scheduler)
      }
    }
  ]
}



