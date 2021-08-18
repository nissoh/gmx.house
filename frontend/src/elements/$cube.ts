import { $node, $wrapNativeElement, style } from "@aelea/core"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import { tap } from "@most/core"
import { disposeWith } from "@most/disposable"

interface IPosition{
  x: number;
  y: number;
}

interface ITint {
  color: number[]
  shading: number[]
}

interface ICube {
  tint: ITint
  size: number;
  left: number;
  top: number;
  fragment: any;
  cube: HTMLElement;
  state: IPosition;
  speed: IPosition;
  sides: unknown[];
}



const Strut = {
  random: function (e: number, t: number) {
    return Math.random() * (t - e) + e
  },
  arrayRandom: function (e: string | any[]) {
    return e[Math.floor(Math.random() * e.length)]
  },
  interpolate: function (e: number, t: number, n: number) {
    return e * (1 - n) + t * n
  },
  rangePosition: function (e: number, t: number, n: number) {
    return (n - e) / (t - e)
  },
  clamp: function (min: number, max: number, n: number) {
    return Math.max(Math.min(min, n), max)
  },
  queryArray: function (e: any, t: Element) {
    return t || (t = document.body), Array.prototype.slice.call(t.querySelectorAll(e))
  },
  ready: function (e: any) {
    document.readyState == 'complete' ? e() : document.addEventListener('DOMContentLoaded', e)
  }
}
const reduceMotion = matchMedia("(prefers-reduced-motion)").matches


const setState = (state: IPosition, speed: IPosition) =>
  directions.forEach(axis => {
    state[axis] += speed[axis]
    if (Math.abs(state[axis]) < 360) return
    const max = Math.max(state[axis], 360)
    const min = max == 360 ? Math.abs(state[axis]) : 360
    state[axis] = max - min
  })



const template = document.getElementById("cube-template") as HTMLTemplateElement

const directions = ["x", "y"] as const
// rgb(39 38 38)
const palette = {
  background: theme.name === 'dark'
    ? {
      color: [22, 39, 58], // rgb(56 26 99)
      shading: [0, 0, 0] // rgb(39 38 38)
    }
    : {
      color: [255, 255, 255], // rgb(56 26 99)
      shading: [154, 156, 160] // rgb(39 38 38)
    },
  // 181 115 255
  middleground: theme.name === 'dark'
    ?  {
      color: [22, 12, 17],
      shading: [0, 0, 0]
    }
    : {
      color: [67, 80, 88], // 67 80 88
      shading: [0, 35, 0]
    },
  primary: theme.name === 'dark'
    ?  {
      color: [7, 157, 250], // rgb(255 54 191)
      shading: [16, 38, 51] // rgb(86 16 64)
    }
    : {
      color: [181, 115, 255],
      shading: [77, 35, 123]
    }
}


const setCubeStyles = ({ cube, size, left, top }: ICube) => {
  Object.assign(cube.style, {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}px`,
    top: `${top}px`
  })

  const shadowEl: HTMLElement = cube.querySelector(".shadow")!
  shadowEl.style.filter = `blur(${Math.round(size * .6)}px)`
  shadowEl.style.opacity = String(Math.min(size / 120, .4))
}

const createCube = (size: number) => {

  
  const fragment = template.content
  const cube = fragment.querySelector(".cube")!.cloneNode(true)! as Element

  const state = { x: 0,  y: 0 }

  const speed = directions.reduce((object, axis) => {
    const max = size > sizes.m ? .05 : .1
    // @ts-ignore
    object[axis] = Strut.random(-max, max)
    return object
  }, {})

  const sides = Strut.queryArray(".sides div", cube).reduce((object, side) => {
    object[side.className] = {
      side,
      hidden: false,
      rotate: {
        x: 0,
        y: 0
      }
    }
    return object
  }, {})

  sides.top.rotate.x = 90
  sides.bottom.rotate.x = -90
  sides.left.rotate.y = -90
  sides.right.rotate.y = 90
  sides.back.rotate.y = -180

  return { fragment, cube, state, speed, sides: Object.values(sides) }
}

const sizes = {
  xs: 15,
  s: 25,
  m: 40,
  l: 100,
  xl: 120
}
// @ts-ignore
const cubes: ICube[] = [
  { tint: palette.primary, size: sizes.xs, left: 35, top: 465 },
  { tint: palette.background, size: sizes.s, left: 55, top: 415 },
  { tint: palette.background, size: sizes.xl, left: 140, top: 400 },
  { tint: palette.background, size: sizes.l, left: 580, top: 255 },
  { tint: palette.primary, size: sizes.s, left: 780, top: 320 },
  { tint: palette.background, size: sizes.xl, left: 780, top: 120 },
  { tint: palette.middleground, size: sizes.l, left: 900, top: 310 },
  { tint: palette.primary, size: sizes.m, left: 1030, top: 200 }
].map(object => Object.assign(createCube(object.size), object))

cubes.forEach(setCubeStyles)


const getDistance = (state: IPosition, rotate: IPosition): IPosition =>
  directions.reduce((object, axis) => {
    object[axis] = Math.abs(state[axis] + rotate[axis])
    return object
  }, {} as IPosition)

const getRotation = (state: IPosition, size: number, rotate: IPosition) => {
  const axis = rotate.x ? "Z" : "Y"
  const direction = rotate.x > 0 ? -1 : 1

  return `
      rotateX(${state.x + rotate.x}deg)
      rotate${axis}(${direction * (state.y + rotate.y)}deg)
      translateZ(${size / 2}px)
    `
}

const getShading = (tint: ITint, rotate: IPosition, distance: IPosition) => {
  const darken = directions.reduce((object, axis) => {
    const delta = distance[axis]
    const ratio = delta / 180
    object[axis] = delta > 180 ? Math.abs(2 - ratio) : ratio
    return object
  }, {} as IPosition)

  if (rotate.x)
    darken.y = 0
  else {
    const { x } = distance
    if (x > 90 && x < 270)
      directions.forEach(axis => darken[axis] = 1 - darken[axis])
  }

  const alpha = (darken.x + darken.y) / 2
  const blend = (value: number, index: number) => Math.round(Strut.interpolate(value, tint.shading[index], alpha))
  const [r, g, b] = tint.color.map(blend)

  return `rgb(${r}, ${g}, ${b})`
}

const shouldHide = (rotateX: number, x: number, y: number) => {
  if (rotateX)
    return x > 90 && x < 270
  if (x < 90)
    return y > 90 && y < 270
  if (x < 270)
    return y < 90
  return y > 90 && y < 270
}

const updateSides = ({ state, speed, size, tint, sides, left }: ICube) => {
  const animate = (object: { hidden: any; side?: any; rotate?: any }) => {
    const { side, rotate, hidden } = object
    const distance = getDistance(state, rotate)

    // don't animate hidden sides
    if (shouldHide(rotate.x, distance.x, distance.y)) {
      if (!hidden) {
        side.hidden = true
        object.hidden = true
      }
      return
    }

    if (hidden) {
      side.hidden = false
      object.hidden = false
    }

    side.style.transform = getRotation(state, size, rotate)
    side.style.backgroundColor = getShading(tint, rotate, distance)
  }

  setState(state, speed)
  // @ts-ignore
  sides.forEach(animate)
}


let disposed = false
const tick = () => {
  cubes.forEach(updateSides)
  if (disposed || reduceMotion) return
  requestAnimationFrame(tick)
}


// animationFrames(window)

export const $cubes = () => {
  disposed = false

  tick()


  return $node(
    style({ position: 'absolute', color: colorAlpha(pallete.foreground, .5), left: '0', top: '50%', marginLeft: '-25w', marginTop: '-25vh' }),
    tap(x => {
      x.element.classList.add('cubes')
    }),
  )(
    {
      run(sink, sch) {
        return disposeWith(() => disposed = true, null)
      }
    },
    ...cubes.map(({ fragment, cube }) => $wrapNativeElement(cube)())
  )
}