export const isDesktopScreen = window.matchMedia('(min-width: 565px)').matches
export const isMobileScreen = !isDesktopScreen