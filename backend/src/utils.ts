
export const timespanPassedSinceInvoke = (timespan: number) => {
  let lastTimePasses: null | number = null

  return () => {
    const now = Date.now()

    if (lastTimePasses === null) {
      lastTimePasses = now
      return true
    }

    const timespannedSinceLastSuccess = now - lastTimePasses

    if (timespannedSinceLastSuccess > timespan) {
      lastTimePasses = now
      return true
    }

    return false
  }
}
