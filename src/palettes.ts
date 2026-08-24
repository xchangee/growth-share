export type Palette = {
  name: string
  background: string
  texture: string
}

// 01 / 02 keep their existing motion, but now stay inside 03's terracotta and
// parchment colour family. The narrow shifts preserve the slow colour drift
// without returning to the previous pink, green, blue, and violet themes.
export const palettes: Palette[] = [
  { name: '03 赤陶', background: '#DC6038', texture: '#F3D8AC' },
  { name: '03 暖朱砂', background: '#D75A36', texture: '#FFF4E4' },
  { name: '03 珊瑚陶', background: '#D7603D', texture: '#E4BE8B' },
]
