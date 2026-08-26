import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const scriptDirectory = dirname(scriptPath)
const projectRoot = resolve(scriptDirectory, '..')
const publicDirectory = join(projectRoot, 'public')
const assetDirectory = join(publicDirectory, 'assets')
const lucideDirectory = join(projectRoot, 'node_modules', 'lucide-static')
const lucideIconDirectory = join(lucideDirectory, 'icons')
const manifestPath = join(scriptDirectory, 'demo-textures.manifest.json')

const WIDTH = 1920
const HEIGHT = 1080
const COLUMNS = 24
const ROWS = 13

const ICON_NAMES = [
  'activity', 'airplay', 'anchor', 'aperture', 'archive', 'atom', 'award',
  'badge-check', 'battery-charging', 'bell', 'bike', 'binoculars', 'blend',
  'blocks', 'book-open', 'bot', 'box', 'brain', 'briefcase', 'brush',
  'building-2', 'cable', 'camera', 'chart-no-axes-combined', 'circle-dashed',
  'circle-dot', 'clock-3', 'cloud', 'code-2', 'coffee', 'compass', 'cpu',
  'database', 'diamond', 'dna', 'drafting-compass', 'dumbbell', 'earth', 'eye',
  'feather', 'file-code-2', 'film', 'fingerprint', 'flame', 'flask-conical',
  'flower-2', 'folder-open', 'gamepad-2', 'gem', 'gift', 'globe-2',
  'graduation-cap', 'grid-2x2', 'hand-heart', 'handshake', 'headphones', 'heart',
  'hexagon', 'image', 'infinity', 'keyboard', 'lamp', 'layers-3', 'leaf',
  'lightbulb', 'link-2', 'magnet', 'map', 'medal', 'megaphone',
  'message-circle', 'microscope', 'monitor', 'moon-star', 'mountain', 'music-2',
  'network', 'orbit', 'palette', 'pen-tool', 'pencil-ruler', 'person-standing',
  'piano', 'plug-zap', 'puzzle', 'radio', 'rocket', 'route', 'scan-face',
  'school', 'send', 'shapes', 'shield-check', 'sparkles', 'speech', 'star',
  'sun', 'telescope', 'tent-tree', 'terminal', 'trophy', 'users',
  'wand-sparkles', 'waves', 'wifi', 'wrench', 'zap',
]

const PATTERN_ICON_NAMES = [
  'aperture', 'atom', 'blend', 'compass', 'diamond', 'flower-2', 'gem',
  'infinity', 'leaf', 'moon-star', 'orbit', 'shapes', 'sparkles', 'star', 'sun',
  'waves',
]

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

function number(value) {
  return Number(value.toFixed(6)).toString()
}

function hexByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
}

async function readLucideIcon(name) {
  const source = await readFile(join(lucideIconDirectory, `${name}.svg`), 'utf8')
  const match = source.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/i)
  if (!match) throw new Error(`Invalid Lucide SVG: ${name}`)
  return match[1].replace(/<!--[\s\S]*?-->/g, '').trim()
}

function wrapIcon(inner, transform, strokeWidth = 1.8) {
  return [
    `  <g transform="${transform}" fill="none" stroke="#ffffff"`,
    `     stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`,
    ...inner.split('\n').map((line) => `    ${line.trim()}`),
    '  </g>',
  ].join('\n')
}

function createSealFrame(variant) {
  switch (variant) {
    case 0:
      return [
        '    <path d="M-22 -31H22L31 -22V22L22 31H-22L-31 22V-22Z"/>',
        '    <path d="M-17 -25H17L25 -17V17L17 25H-17L-25 17V-17Z" opacity=".46"/>',
      ]
    case 1:
      return [
        '    <rect x="-30" y="-30" width="60" height="60" rx="3"/>',
        '    <path d="M-23 -15V-23H-15M15 -23H23V-15M23 15V23H15M-15 23H-23V15" opacity=".58"/>',
      ]
    case 2:
      return [
        '    <circle r="30"/>',
        '    <circle r="24" opacity=".5"/>',
        '    <path d="M0 -34v8M34 0h-8M0 34v-8M-34 0h8"/>',
      ]
    case 3:
      return [
        '    <rect x="-22" y="-22" width="44" height="44" rx="4" transform="rotate(45)"/>',
        '    <rect x="-17" y="-17" width="34" height="34" rx="3" transform="rotate(45)" opacity=".48"/>',
      ]
    case 4:
      return [
        '    <ellipse cx="0" cy="-13" rx="15" ry="19"/>',
        '    <ellipse cx="13" cy="0" rx="19" ry="15"/>',
        '    <ellipse cx="0" cy="13" rx="15" ry="19"/>',
        '    <ellipse cx="-13" cy="0" rx="19" ry="15"/>',
      ]
    case 5:
      return [
        '    <path d="M-12 -31H-31V-12M12 -31H31V-12M31 12V31H12M-31 12V31H-12"/>',
        '    <path d="M0 -35l3 3-3 3-3-3ZM35 0l-3 3-3-3 3-3ZM0 35l-3-3 3-3 3 3ZM-35 0l3-3 3 3-3 3Z" fill="#fff" stroke="none"/>',
      ]
    case 6:
      return [
        '    <path d="M0 -32 28 -16V16L0 32-28 16V-16Z"/>',
        '    <path d="M0 -26 22 -13V13L0 26-22 13V-13Z" opacity=".48"/>',
      ]
    default:
      return [
        '    <path d="M0 -32v7M23 -23l-5 5M32 0h-7M23 23l-5-5M0 32v-7M-23 23l5-5M-32 0h7M-23 -23l5 5"/>',
        '    <circle r="29" stroke-dasharray="2 6" opacity=".62"/>',
      ]
  }
}

function createSealMotif(inner, centerX, centerY, index, variant) {
  const angle = ((index * 7) % 3 - 1) * 1.5
  const unitScale = 1.01 + ((index * 13) % 5) * 0.012
  const iconScales = [1.42, 1.5, 1.38, 1.48, 1.3, 1.68, 1.42, 1.78]
  const iconScale = iconScales[variant]

  return [
    `  <g transform="translate(${number(centerX)} ${number(centerY)}) rotate(${number(angle)}) scale(${number(unitScale)})"`,
    '     fill="none" stroke="#ffffff" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round">',
    ...createSealFrame(variant),
    `    <g transform="scale(${number(iconScale)}) translate(-12 -12)" stroke-width="1.85">`,
    ...inner.split('\n').map((line) => `      ${line.trim()}`),
    '    </g>',
    '  </g>',
  ].join('\n')
}

async function createPatternTexture(iconMap) {
  const cellWidth = WIDTH / COLUMNS
  const cellHeight = HEIGHT / ROWS
  const cells = []

  for (let index = 0; index < COLUMNS * ROWS; index += 1) {
    const column = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    const densityToken = (index * 29 + row * 11 + column * 7) % 13
    if ([1, 8].includes(densityToken)) continue

    const name = PATTERN_ICON_NAMES[(index * 5 + row * 3 + 7) % PATTERN_ICON_NAMES.length]
    const inner = iconMap.get(name)
    const centerX = (column + 0.5) * cellWidth
    const centerY = (row + 0.5) * cellHeight
    const variant = (index * 7 + row * 3 + column) % 8
    cells.push(createSealMotif(inner, centerX, centerY, index, variant))
  }

  return [
    '<!-- Generated by scripts/generate-demo-textures.mjs from Lucide icons (ISC) and project-authored seal frames. -->',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">`,
    ...cells,
    '</svg>',
    '',
  ].join('\n')
}

function createUnitMap() {
  const cellWidth = WIDTH / COLUMNS
  const cellHeight = HEIGHT / ROWS
  const cells = []

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const red = hexByte(((column + 0.5) / COLUMNS) * 255)
      const green = hexByte(((row + 0.5) / ROWS) * 255)
      cells.push(
        `  <rect x="${number(column * cellWidth)}" y="${number(row * cellHeight)}" `
          + `width="${number(cellWidth + 0.02)}" height="${number(cellHeight + 0.02)}" fill="#${red}${green}00"/>`,
      )
    }
  }

  return [
    '<!-- Generated technical ID map; each cell encodes its 24x13 grid coordinate. -->',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" shape-rendering="crispEdges" aria-hidden="true">`,
    ...cells,
    '</svg>',
    '',
  ].join('\n')
}

function createPaperGrain() {
  return [
    '<!-- Generated procedural paper texture; no external visual source. -->',
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" aria-hidden="true">',
    '  <filter id="grain" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">',
    '    <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="3" seed="47" stitchTiles="stitch" result="noise"/>',
    '    <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>',
    '    <feComponentTransfer in="mono">',
    '      <feFuncA type="table" tableValues="0 0.18"/>',
    '    </feComponentTransfer>',
    '  </filter>',
    '  <rect width="256" height="256" fill="#8f7859" filter="url(#grain)"/>',
    '</svg>',
    '',
  ].join('\n')
}

function createMemorySymbol(sparkles) {
  return [
    '<!-- Generated from Lucide sparkles (ISC) by scripts/generate-demo-textures.mjs. -->',
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" aria-hidden="true">',
    wrapIcon(sparkles, 'translate(64 64) scale(16)', 1.55),
    '</svg>',
    '',
  ].join('\n')
}

function createFavicon(sparkles) {
  return [
    '<!-- Generated from Lucide sparkles (ISC) by scripts/generate-demo-textures.mjs. -->',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '  <title>开放创意墙</title>',
    '  <rect width="64" height="64" rx="15" fill="#c64b2c"/>',
    wrapIcon(sparkles, 'translate(12 12) scale(1.666667)', 2),
    '</svg>',
    '',
  ].join('\n')
}

async function buildExpectedOutputs() {
  const packageMetadata = JSON.parse(
    await readFile(join(lucideDirectory, 'package.json'), 'utf8'),
  )
  if (packageMetadata.version !== '1.33.0' || packageMetadata.license !== 'ISC') {
    throw new Error(
      `Expected lucide-static 1.33.0 / ISC, received ${packageMetadata.version} / ${packageMetadata.license}`,
    )
  }

  const iconEntries = await readdir(lucideIconDirectory)
  const iconNames = new Set(iconEntries.map((entry) => entry.replace(/\.svg$/, '')))
  const missingIcons = ICON_NAMES.filter((name) => !iconNames.has(name))
  if (missingIcons.length) {
    throw new Error(`Missing pinned Lucide icons: ${missingIcons.join(', ')}`)
  }

  const iconMap = new Map()
  for (const name of ICON_NAMES) iconMap.set(name, await readLucideIcon(name))
  const sparkles = iconMap.get('sparkles')

  const outputs = new Map([
    [join(assetDirectory, 'pattern-texture.svg'), await createPatternTexture(iconMap)],
    [join(assetDirectory, 'motif-unit-id.svg'), createUnitMap()],
    [join(assetDirectory, 'paper-grain.svg'), createPaperGrain()],
    [join(assetDirectory, 'open-memory-symbol.svg'), createMemorySymbol(sparkles)],
    [join(publicDirectory, 'favicon.svg'), createFavicon(sparkles)],
  ])

  const generatorSource = await readFile(scriptPath)
  const licenseSource = await readFile(join(lucideDirectory, 'LICENSE'))
  const manifest = {
    schemaVersion: 1,
    generator: {
      path: relative(projectRoot, scriptPath),
      sha256: sha256(generatorSource),
    },
    sourcePackage: {
      name: 'lucide-static',
      version: packageMetadata.version,
      license: packageMetadata.license,
      licenseSha256: sha256(licenseSource),
    },
    grid: { width: WIDTH, height: HEIGHT, columns: COLUMNS, rows: ROWS },
    outputs: [...outputs.entries()].map(([path, content]) => ({
      path: relative(projectRoot, path),
      bytes: Buffer.byteLength(content),
      sha256: sha256(content),
    })),
  }
  outputs.set(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return outputs
}

async function writeAtomically(path, content) {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.tmp-${process.pid}`
  await writeFile(temporaryPath, content)
  await rename(temporaryPath, path)
}

async function main() {
  const checkOnly = process.argv.includes('--check')
  const unexpectedArguments = process.argv.slice(2).filter((value) => value !== '--check')
  if (unexpectedArguments.length) {
    throw new Error(`Unknown arguments: ${unexpectedArguments.join(', ')}`)
  }

  const outputs = await buildExpectedOutputs()
  if (checkOnly) {
    const mismatches = []
    for (const [path, expected] of outputs) {
      const actual = await readFile(path, 'utf8').catch(() => null)
      if (actual !== expected) mismatches.push(relative(projectRoot, path))
    }
    if (mismatches.length) {
      throw new Error(
        `Generated demo textures are stale or missing: ${mismatches.join(', ')}. `
        + 'Run npm run generate:textures.',
      )
    }
    process.stdout.write(`Validated ${outputs.size - 1} generated public textures.\n`)
    return
  }

  for (const [path, content] of outputs) await writeAtomically(path, content)
  process.stdout.write(
    `${JSON.stringify({ generated: outputs.size - 1, manifest: relative(projectRoot, manifestPath) }, null, 2)}\n`,
  )
}

await main()
