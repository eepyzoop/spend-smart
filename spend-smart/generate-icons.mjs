import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'fs'

const svgTemplate = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="7" fill="#059669"/>
  <rect x="7" y="20" width="4.5" height="7" rx="1.25" fill="white" fill-opacity="0.55"/>
  <rect x="13.75" y="14" width="4.5" height="13" rx="1.25" fill="white" fill-opacity="0.8"/>
  <rect x="20.5" y="8" width="4.5" height="19" rx="1.25" fill="white"/>
  <line x1="6.5" y1="27.75" x2="25.5" y2="27.75" stroke="white" stroke-width="1.25" stroke-opacity="0.25" stroke-linecap="round"/>
</svg>`

for (const size of [192, 512]) {
  const resvg = new Resvg(svgTemplate(size), { fitTo: { mode: 'width', value: size } })
  const png = resvg.render().asPng()
  writeFileSync(`public/pwa-${size}x${size}.png`, png)
  console.log(`Generated public/pwa-${size}x${size}.png`)
}

// apple-touch-icon is 180x180
const resvg = new Resvg(svgTemplate(180), { fitTo: { mode: 'width', value: 180 } })
const png = resvg.render().asPng()
writeFileSync('public/apple-touch-icon.png', png)
console.log('Generated public/apple-touch-icon.png')
