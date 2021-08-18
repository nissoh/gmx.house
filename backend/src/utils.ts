
export const timespanPassedSinceInvoke = (timespan: number) => {
  let lastTimePasses = 0

  return () => {
    const now = Date.now()

    if (now - lastTimePasses > timespan) {
      lastTimePasses = now
      return true
    }

    return false
  }
}