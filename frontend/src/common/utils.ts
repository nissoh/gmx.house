import { Op, O } from "@aelea/core"
import { combineArray, tap } from "@most/core"
import { Stream } from "@most/types"
import { ethers } from "ethers"

export function colorLuminocity(color: string, amount: number) {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2))
}


type StreamInput<T> = {
  [P in keyof T]: Stream<T[P]>
}

type StreamInputArray<T extends any[]> = {
  [P in keyof T]: Stream<T[P]>
}


export function combineMap<A>(state: StreamInput<A>): Stream<A> {
  const entries = Object.entries(state)
  const streams = entries.map(entry => entry[1])
  return combineArray((...arrgs) => {
    return arrgs.reduce((seed, val, idx) => ({ ...seed as any, [entries[idx][0]]: val }), {})
  }, streams as any) as any
}


export function combineArrayMap<A extends any[], B>(cb: (...args: A) => B, ...streamList: StreamInputArray<A>): Stream<B> {
  return combineArray((...arrgs) => cb(...arrgs as any), streamList)
}

  
export function groupByCollectionMap<A, B extends A[keyof A]>(list: A[], keyGetter: (v: A) => B) {
  const map = new Map<B, A[]>()

  list.forEach((item) => {
    const key = keyGetter(item)
    const collection = map.get(key)
    if (!collection) {
      map.set(key, [item])
    } else {
      collection.push(item)
    }
  })

  return map
}

export function groupByMap<A, B extends A[keyof A]>(list: A[], keyGetter: (v: A) => B) {
  const map = new Map<B, A>()
  list.forEach((item) => {
    const key = keyGetter(item)
    map.set(key, item)
  })
  return map
}

