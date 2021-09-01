import { intervalInMsMap } from "gambit-middleware"


type TimelineTime = {
  time: number
}


export function fillIntervalGap<T extends TimelineTime, R extends TimelineTime>(
  interval: intervalInMsMap, fillMap: (next: T) => R, fillGapMap: (prev: R) => R, squashMap: (prev: R, next: T) => R = fillGapMap
) {
  return (timeline: R[], next: T) => {
    const lastIdx = timeline.length - 1
    const prev = timeline[lastIdx]

    const barSpan = (next.time - prev.time) / interval

    if (barSpan > 1) {
      const barSpanCeil = Math.ceil(barSpan)

      for (let index = 1; index < barSpanCeil; index++) {
        timeline.push({ ...fillGapMap(prev), time: prev.time + interval * index })
      }

      const time = timeline[timeline.length - 1].time + interval

      timeline.push({ ...fillMap(next), time })

      return timeline
    }
    
    if (barSpan < 1) {
      timeline.splice(lastIdx, 1, squashMap(prev, next))
    } else {
      timeline.push(fillMap(next))
    }

    return timeline
  }
}
