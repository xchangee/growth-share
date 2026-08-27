import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { siteConfig } from '../config/site'
import { motifFlickerTiming } from '../motifFlicker'
import {
  syntheticProfiles,
  type SyntheticProfile,
} from '../data/syntheticProfiles.generated'

type ProfileCopy = {
  memoryLine: string
  companionshipCopy: string
}

const memoryLineVariants = siteConfig.profileCopy.memoryLines
const companionshipVariants = siteConfig.profileCopy.companionship
const englishMemoryLineVariants = siteConfig.profileCopy.englishMemoryLines
const englishCompanionshipVariants =
  siteConfig.profileCopy.englishCompanionship

function hasLatinName(name: string) {
  return /[A-Za-z]/.test(name)
}

function hashProfileId(profileId: string) {
  let hash = 2166136261

  for (const character of profileId) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function getProfileCopy(profile: SyntheticProfile): ProfileCopy {
  const hash = hashProfileId(profile.profileId)
  const usesEnglish = hasLatinName(profile.displayName)
  const memoryLine = usesEnglish
    ? englishMemoryLineVariants[hash % englishMemoryLineVariants.length]
    : memoryLineVariants[hash % memoryLineVariants.length]

  return {
    memoryLine,
    companionshipCopy: usesEnglish
      ? englishCompanionshipVariants[
          (hash >>> 8) % englishCompanionshipVariants.length
        ]
      : companionshipVariants[(hash >>> 8) % companionshipVariants.length],
  }
}

const archiveMarqueePhrases = siteConfig.archive.marquee
const archiveMarqueeCopies = [0, 1, 2] as const

export const ArchiveRail = memo(function ArchiveRail({
  position,
}: {
  position: 'top' | 'bottom'
}) {
  if (position === 'top') {
    return (
      <header className="archive-rail archive-rail--top" aria-hidden="true">
        {siteConfig.archive.topRail.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </header>
    )
  }

  return (
    <footer
      className="archive-rail archive-rail--bottom"
      aria-label={siteConfig.archive.marqueeAriaLabel}
    >
      <div className="archive-marquee__track" aria-hidden="true">
        {archiveMarqueeCopies.map((copy) => (
          <div className="archive-marquee__group" key={copy}>
            {[0, 1].flatMap((sequence) =>
              archiveMarqueePhrases.map((phrase) => (
                <span key={`${sequence}-${phrase}`}>{phrase}</span>
              )),
            )}
          </div>
        ))}
      </div>
    </footer>
  )
})

type WelcomeOverlayProps = {
  reducedMotion: boolean
  profileId: string
  showProfileContent: boolean
}

const syntheticProfilesById = new Map(
  syntheticProfiles.map((profile) => [profile.profileId, profile]),
)

type ArchiveSceneVariant = {
  avatarOffset: number
  motifSeed: number
  toneOffset: number
  texturePosition: string
}

const mosaicAvatarModules = import.meta.glob(
  '../assets/synthetic-avatars/*.svg',
  {
    eager: true,
    query: '?url&v=synthetic-portrait-v2',
    import: 'default',
  },
) as Record<string, string>

function getAvatarFilename(path: string) {
  return path.slice(path.lastIndexOf('/') + 1)
}

function createAvatarSourceMap(modules: Record<string, string>) {
  return new Map(
    Object.entries(modules).map(([path, source]) => [
      getAvatarFilename(path),
      source,
    ]),
  )
}

function requireAvatarSource(
  sources: ReadonlyMap<string, string>,
  filename: string,
) {
  const source = sources.get(filename)
  if (!source) {
    throw new Error(`Missing profile avatar asset: ${filename}`)
  }
  return source
}

const avatarSourcesByFilename = createAvatarSourceMap(mosaicAvatarModules)
const mosaicAvatarFilenames = [...avatarSourcesByFilename.keys()].sort(
  (leftFilename, rightFilename) =>
    leftFilename.localeCompare(rightFilename),
)

type MosaicAvatar = {
  profileId: string
  source: string
}

const allMosaicAvatars: readonly MosaicAvatar[] = mosaicAvatarFilenames.map(
  (filename) => ({
    profileId: filename.replace(/\.svg$/, ''),
    source: requireAvatarSource(avatarSourcesByFilename, filename),
  }),
)

// Side scenes use their own seeds and are deliberately independent from the
// active profile. Individual tiles adopt the latest scene only while flickering.
function getArchiveScene(
  sceneSeed: string,
  avatarCount = allMosaicAvatars.length,
): ArchiveSceneVariant {
  const hash = hashProfileId(sceneSeed)
  const horizontal = 12 + (hash % 80)
  const vertical = 12 + ((hash >>> 9) % 76)

  return {
    avatarOffset: hash % avatarCount,
    motifSeed: 11 + (hash % 997),
    toneOffset: (hash >>> 5) % 6,
    texturePosition: `${horizontal}% ${vertical}%`,
  }
}

const archiveFrameScene = getArchiveScene('archive-frame-base')

const archivePattern = {
  width: 1920,
  height: 1080,
  columns: 24,
  rows: 13,
}

// These coordinates address one cell from each generated seal-frame family.
// Every selected cell has empty horizontal neighbours, so their strokes cannot
// bleed into the isolated motif crop used by the narrow topic strip.
const archiveMotifCells = [
  { column: 5, row: 0 },
  { column: 11, row: 1 },
  { column: 4, row: 2 },
  { column: 10, row: 3 },
  { column: 3, row: 4 },
  { column: 9, row: 5 },
  { column: 2, row: 6 },
  { column: 8, row: 7 },
] as const

function getArchiveMotifStyle(seed: number) {
  const stableRandom = Math.imul(seed + 1, 0x9e3779b1) >>> 0
  const crop = archiveMotifCells[stableRandom % archiveMotifCells.length]

  return {
    '--archive-motif-x': `${(crop.column / (archivePattern.columns - 1)) * 100}%`,
    '--archive-motif-y': `${(crop.row / (archivePattern.rows - 1)) * 100}%`,
    '--archive-motif-width': `${archivePattern.columns * 100}%`,
    '--archive-motif-height': `${archivePattern.rows * 100}%`,
  } as CSSProperties
}

type ArchiveMosaicProps = {
  side: 'left' | 'right'
  flicker: ArchiveFlickerState
  targetScene: ArchiveSceneVariant
  sceneRevision: number
  reducedMotion: boolean
  avatars: readonly MosaicAvatar[]
}

type ArchiveTileKind = 'portrait' | 'motif' | 'ghost' | 'empty'

const leftMosaicLayout = [
  'g.gpmp',
  '.g.mpm',
  'g.gpmp',
  'g.mmpm',
  '.g.pmp',
  'gm.mpm',
  '..gpmp',
  'g.pmpm',
  'g.mpmp',
  'g..mpm',
] as const

const leftDenseToneLayout = [
  [5, 0, 3],
  [0, 2, 4],
  [3, 4, 5],
  [0, 2, 4],
  [5, 0, 3],
  [4, 2, 0],
  [3, 4, 5],
  [0, 2, 4],
  [5, 0, 3],
  [4, 2, 0],
] as const

const rightMosaicLayout = [
  'pmpg.g',
  'mpm.g.',
  'pmpg.g',
  'mpmm.g',
  'pmp.g.',
  'mpm.mg',
  'pmpg..',
  'mpmp.g',
  'pmpm.g',
  'mpm..g',
] as const

type ArchiveMosaicRegion = 'left' | 'right'
type ArchiveFlickerScope = ArchiveMosaicRegion

const mosaicLayouts = {
  left: leftMosaicLayout,
  right: rightMosaicLayout,
} as const

type ArchiveFlickerTile = {
  minimum: number
  maximum: number
  duration: number
  entryDuration: number
  stage: 'active' | 'leaving'
}

type ArchiveFlickerState = {
  round: number
  phase: 'idle' | 'active' | 'crossfade'
  roundDuration: number
  exitDuration: number
  tiles: Record<string, ArchiveFlickerTile>
}

const emptyArchiveFlickerState: ArchiveFlickerState = {
  round: 0,
  phase: 'idle',
  roundDuration: 0,
  exitDuration: 0,
  tiles: {},
}

const archiveFlickerInitialDelay: Record<ArchiveFlickerScope, number> = {
  left: 1800,
  right: 4200,
}
const archiveSideRefreshDuration = 6

function randomBetween(minimum: number, maximum: number) {
  return minimum + Math.random() * (maximum - minimum)
}

function randomInteger(minimum: number, maximum: number) {
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1))
}

function getFlickerTileKey(
  region: ArchiveMosaicRegion,
  row: number,
  column: number,
) {
  return `${region}-${row}-${column}`
}

function getSquareTileKeys(region: ArchiveMosaicRegion) {
  return mosaicLayouts[region].flatMap((row, rowIndex) =>
    [...row].flatMap((marker, columnIndex) =>
      marker === 'p' || marker === 'm'
        ? [getFlickerTileKey(region, rowIndex, columnIndex)]
        : [],
    ),
  )
}

function getGhostTileKeys(region: ArchiveMosaicRegion) {
  return mosaicLayouts[region].flatMap((row, rowIndex) =>
    [...row].flatMap((marker, columnIndex) =>
      marker === 'g'
        ? [getFlickerTileKey(region, rowIndex, columnIndex)]
        : [],
    ),
  )
}

const archiveTopicStripMotifs = [
  { row: 1, seed: 7, opacity: 0.28, scale: 0.84 },
  { row: 2, seed: 2, opacity: 0.46, scale: 0.92 },
  { row: 3, seed: 0, opacity: 0.88, scale: 1 },
  { row: 4, seed: 5, opacity: 0.34, scale: 0.86 },
  { row: 5, seed: 1, opacity: 0.6, scale: 0.94 },
  { row: 6, seed: 4, opacity: 0.82, scale: 1 },
  { row: 7, seed: 7, opacity: 0.42, scale: 0.9 },
  { row: 8, seed: 6, opacity: 0.86, scale: 1.02 },
  { row: 9, seed: 4, opacity: 0.52, scale: 0.94 },
  { row: 10, seed: 2, opacity: 0.3, scale: 0.86 },
] as const

const archiveFlickerCandidates = {
  left: getSquareTileKeys('left'),
  leftEdge: getGhostTileKeys('left'),
  topic: archiveTopicStripMotifs.map((_, index) => `topic-${index}`),
  right: getSquareTileKeys('right'),
  rightEdge: getGhostTileKeys('right'),
}

const archiveFlickerGroups: Record<
  ArchiveFlickerScope,
  readonly { candidates: string[]; count: number }[]
> = {
  left: [
    {
      candidates: archiveFlickerCandidates.left,
      count: Math.round(archiveFlickerCandidates.left.length / 4),
    },
    {
      candidates: archiveFlickerCandidates.leftEdge,
      count: Math.round(archiveFlickerCandidates.leftEdge.length / 4),
    },
    {
      candidates: archiveFlickerCandidates.topic,
      count: Math.round(archiveFlickerCandidates.topic.length / 4),
    },
  ],
  right: [
    {
      candidates: archiveFlickerCandidates.right,
      count: Math.round(archiveFlickerCandidates.right.length / 4),
    },
    {
      candidates: archiveFlickerCandidates.rightEdge,
      count: Math.round(archiveFlickerCandidates.rightEdge.length / 4),
    },
  ],
}

function selectFlickerTiles(
  candidates: string[],
  count: number,
  previousSelection: Set<string>,
) {
  const available = candidates.filter((candidate) => !previousSelection.has(candidate))

  for (let index = 0; index < count; index += 1) {
    const randomIndex = randomInteger(index, available.length - 1)
    const candidate = available[index]
    available[index] = available[randomIndex]
    available[randomIndex] = candidate
  }

  return available.slice(0, count)
}

function selectArchiveFlickerTiles(
  scope: ArchiveFlickerScope,
  previousSelection: Set<string>,
) {
  return archiveFlickerGroups[scope].flatMap(({ candidates, count }) =>
    selectFlickerTiles(candidates, count, previousSelection),
  )
}

function createArchiveFlickerTile(
  entryDuration: number,
): ArchiveFlickerTile {
  const frequency = randomBetween(
    motifFlickerTiming.frequencyMin,
    motifFlickerTiming.frequencyMax,
  )
  const duration = 1 / frequency

  return {
    minimum: randomBetween(
      motifFlickerTiming.opacityMin,
      motifFlickerTiming.lowOpacityMax,
    ),
    maximum: randomBetween(
      motifFlickerTiming.highOpacityMin,
      motifFlickerTiming.opacityMax,
    ),
    duration,
    entryDuration,
    stage: 'active',
  }
}

function createArchiveFlickerTiles(
  selection: string[],
  entryDuration: number,
) {
  return Object.fromEntries(
    selection.map((key) => [key, createArchiveFlickerTile(entryDuration)]),
  )
}

function getArchiveFlickerStyle(
  flickerTile: ArchiveFlickerTile | undefined,
  exitDuration: number,
) {
  if (!flickerTile) return {}

  return {
    '--archive-flicker-minimum': flickerTile.minimum,
    '--archive-flicker-maximum': flickerTile.maximum,
    '--archive-flicker-duration': `${flickerTile.duration}s`,
    '--archive-flicker-entry-duration': `${flickerTile.entryDuration}s`,
    '--archive-flicker-exit-duration': `${exitDuration}s`,
  } as CSSProperties
}

function useArchiveMosaicFlicker(
  reducedMotion: boolean,
  scope: ArchiveFlickerScope,
) {
  const [state, setState] = useState<ArchiveFlickerState>(
    emptyArchiveFlickerState,
  )

  useEffect(() => {
    if (reducedMotion) {
      setState(emptyArchiveFlickerState)
      return
    }

    let animationFrame = 0
    let startTimer = 0
    let disposed = false
    let initialized = false
    let previousTime = performance.now()
    let roundElapsed = 0
    let roundDuration = 0
    let nextRoundDuration = 0
    let round = 0
    let crossfading = false
    let currentSelection = new Set<string>()
    let currentTiles: Record<string, ArchiveFlickerTile> = {}
    let pendingTiles: Record<string, ArchiveFlickerTile> = {}

    const startFirstRound = () => {
      roundDuration = archiveSideRefreshDuration
      const transitionDuration =
        roundDuration * (1 - motifFlickerTiming.leaveStart)
      const selection = selectArchiveFlickerTiles(scope, new Set<string>())

      currentSelection = new Set(selection)
      currentTiles = createArchiveFlickerTiles(
        selection,
        transitionDuration,
      )
      round = 1
      roundElapsed = 0
      crossfading = false
      setState({
        round,
        phase: 'active',
        roundDuration,
        exitDuration: transitionDuration,
        tiles: currentTiles,
      })
    }

    const beginCrossfade = () => {
      const transitionDuration =
        roundDuration * (1 - motifFlickerTiming.leaveStart)
      const nextSelection = selectArchiveFlickerTiles(scope, currentSelection)

      pendingTiles = createArchiveFlickerTiles(
        nextSelection,
        transitionDuration,
      )
      nextRoundDuration = archiveSideRefreshDuration
      crossfading = true
      setState({
        round,
        phase: 'crossfade',
        roundDuration,
        exitDuration: transitionDuration,
        tiles: {
          ...Object.fromEntries(
            Object.entries(currentTiles).map(([key, tile]) => [
              key,
              { ...tile, stage: 'leaving' as const },
            ]),
          ),
          ...pendingTiles,
        },
      })
    }

    const promoteNextRound = () => {
      currentTiles = pendingTiles
      currentSelection = new Set(Object.keys(currentTiles))
      pendingTiles = {}
      round += 1
      roundElapsed = 0
      roundDuration = nextRoundDuration
      crossfading = false
      setState({
        round,
        phase: 'active',
        roundDuration,
        exitDuration:
          roundDuration * (1 - motifFlickerTiming.leaveStart),
        tiles: currentTiles,
      })
    }

    const renderFrame = (now: number) => {
      animationFrame = 0
      if (disposed) return

      const deltaSeconds = Math.min(Math.max((now - previousTime) / 1000, 0), 0.05)
      previousTime = now
      roundElapsed += deltaSeconds

      if (
        !crossfading &&
        roundElapsed / roundDuration >= motifFlickerTiming.leaveStart
      ) {
        beginCrossfade()
      }

      if (roundElapsed >= roundDuration) promoteNextRound()
      animationFrame = requestAnimationFrame(renderFrame)
    }

    const start = () => {
      if (!initialized || animationFrame || disposed || document.hidden) return
      previousTime = performance.now()
      animationFrame = requestAnimationFrame(renderFrame)
    }
    const stop = () => {
      if (!animationFrame) return
      cancelAnimationFrame(animationFrame)
      animationFrame = 0
    }
    const handleVisibilityChange = () => {
      if (document.hidden) stop()
      else start()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    startTimer = window.setTimeout(() => {
      if (disposed) return
      initialized = true
      startFirstRound()
      start()
    }, archiveFlickerInitialDelay[scope])

    return () => {
      disposed = true
      window.clearTimeout(startTimer)
      stop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [reducedMotion, scope])

  return state
}

function countPortraits(layout: readonly string[]) {
  return layout.reduce(
    (total, row) => total + [...row].filter((marker) => marker === 'p').length,
    0,
  )
}

const mosaicAvatarOffsets: Record<ArchiveMosaicRegion, number> = {
  left: 0,
  right: countPortraits(leftMosaicLayout),
}

function getMosaicRegion(
  side: ArchiveMosaicProps['side'],
): ArchiveMosaicRegion {
  return side
}

function getTileKind(
  region: ArchiveMosaicRegion,
  row: number,
  column: number,
): ArchiveTileKind {
  const layout = mosaicLayouts[region]
  const marker = layout[row % layout.length]?.[column]

  if (marker === 'p') return 'portrait'
  if (marker === 'm') return 'motif'
  if (marker === 'g') return 'ghost'
  return 'empty'
}

function getPortraitOrdinal(
  region: ArchiveMosaicRegion,
  row: number,
  column: number,
) {
  const layout = mosaicLayouts[region]
  const columns = layout[0].length
  const tileIndex = row * columns + column
  let portraitOrdinal = 0

  for (let index = 0; index < tileIndex; index += 1) {
    const layoutRow = Math.floor(index / columns)
    const layoutColumn = index % columns
    if (layout[layoutRow % layout.length]?.[layoutColumn] === 'p') {
      portraitOrdinal += 1
    }
  }

  return portraitOrdinal
}

function getPortraitAvatar(
  region: ArchiveMosaicRegion,
  row: number,
  column: number,
  avatarOffset: number,
  avatars: readonly MosaicAvatar[],
) {
  const portraitOrdinal = getPortraitOrdinal(region, row, column)
  const portraitSlot = mosaicAvatarOffsets[region] + portraitOrdinal
  const poolIndex = (portraitSlot + avatarOffset) % avatars.length

  return avatars[poolIndex]
}

const ArchivePortrait = memo(function ArchivePortrait({
  avatar,
  slot,
  poolIndex,
}: {
  avatar: MosaicAvatar
  slot: number
  poolIndex: number
}) {
  return (
    <img
      className="archive-tile__portrait"
      src={avatar.source}
      alt=""
      decoding="async"
      data-avatar-slot={slot}
      data-avatar-pool-index={poolIndex}
    />
  )
})

function useArchiveTileScene(
  targetScene: ArchiveSceneVariant,
  sceneRevision: number,
  flickerTile: ArchiveFlickerTile | undefined,
  reducedMotion: boolean,
  preloadSource?: string,
) {
  const [tileState, setTileState] = useState(() => ({
    scene: targetScene,
    revision: sceneRevision,
  }))

  useEffect(() => {
    if (reducedMotion || flickerTile?.stage !== 'active') return

    let disposed = false
    let minimumReached = false
    let sourceReady = preloadSource === undefined
    let image: HTMLImageElement | undefined
    const commit = () => {
      if (disposed || !minimumReached || !sourceReady) return
      setTileState((current) =>
        current.revision === sceneRevision
          ? current
          : { scene: targetScene, revision: sceneRevision },
      )
    }
    const markSourceReady = () => {
      sourceReady = true
      commit()
    }
    const minimumTimer = window.setTimeout(() => {
      minimumReached = true
      commit()
    }, flickerTile.entryDuration * 1000)

    if (preloadSource !== undefined) {
      image = new Image()
      image.decoding = 'async'
      image.src = preloadSource

      if (image.complete) {
        void image.decode().catch(() => undefined).then(markSourceReady)
      } else {
        image.addEventListener('load', markSourceReady, { once: true })
        image.addEventListener('error', markSourceReady, { once: true })
      }
    }

    return () => {
      disposed = true
      window.clearTimeout(minimumTimer)
      image?.removeEventListener('load', markSourceReady)
      image?.removeEventListener('error', markSourceReady)
    }
  }, [
    flickerTile?.entryDuration,
    flickerTile?.stage,
    preloadSource,
    reducedMotion,
    sceneRevision,
    targetScene,
  ])

  return tileState
}

type ArchiveMosaicTileProps = {
  side: ArchiveMosaicProps['side']
  region: ArchiveMosaicRegion
  index: number
  row: number
  column: number
  flickerTile: ArchiveFlickerTile | undefined
  exitDuration: number
  targetScene: ArchiveSceneVariant
  sceneRevision: number
  reducedMotion: boolean
  avatars: readonly MosaicAvatar[]
}

const ArchiveMosaicTile = memo(function ArchiveMosaicTile({
  side,
  region,
  index,
  row,
  column,
  flickerTile,
  exitDuration,
  targetScene,
  sceneRevision,
  reducedMotion,
  avatars,
}: ArchiveMosaicTileProps) {
  const offset = side === 'right' ? 13 : 0
  const tileKind = getTileKind(region, row, column)
  const portraitSlot = tileKind === 'portrait'
    ? mosaicAvatarOffsets[region] + getPortraitOrdinal(region, row, column)
    : undefined
  const targetPortraitAvatar = tileKind === 'portrait'
    ? getPortraitAvatar(
        region,
        row,
        column,
        targetScene.avatarOffset,
        avatars,
      )
    : undefined
  const { scene, revision } = useArchiveTileScene(
    targetScene,
    sceneRevision,
    flickerTile,
    reducedMotion,
    targetPortraitAvatar?.source,
  )
  const denseTone = side === 'left' && column >= 3
    ? leftDenseToneLayout[row % leftDenseToneLayout.length]?.[column - 3]
    : side === 'right' && column < 3
      ? leftDenseToneLayout[row % leftDenseToneLayout.length]?.[2 - column]
      : undefined
  const tone = ((denseTone ?? (index * 11 + offset)) + scene.toneOffset) % 6
  const avatar = tileKind === 'portrait'
    ? getPortraitAvatar(
        region,
        row,
        column,
        scene.avatarOffset,
        avatars,
      )
    : undefined
  const avatarPoolIndex = portraitSlot === undefined
    ? undefined
    : (portraitSlot + scene.avatarOffset) % avatars.length
  const motifStyle = getArchiveMotifStyle(
    index + offset * 97 + scene.motifSeed,
  )
  const isLooseBand =
    (side === 'left' && column < 3) ||
    (side === 'right' && column >= 3)
  const rhythmSeed = Math.imul(index + offset + 37, 0x45d9f3b) >>> 0
  const rhythm = tileKind === 'ghost'
    ? 0.22 + (rhythmSeed % 4) * 0.09
    : tileKind === 'motif' && isLooseBand
      ? 0.58 + (rhythmSeed % 4) * 0.12
      : 1
  const tileStyle = {
    '--archive-tile-rhythm': rhythm,
    '--archive-flicker-baseline': rhythm,
    ...getArchiveFlickerStyle(flickerTile, exitDuration),
  } as CSSProperties

  return (
    <span
      className={`archive-tile archive-tile--${tone} archive-tile--${tileKind}${flickerTile ? ' archive-tile--flicker' : ''}${flickerTile?.stage === 'leaving' ? ' archive-tile--flicker-leaving' : ''}`}
      style={tileStyle}
      data-archive-tile-key={getFlickerTileKey(region, row, column)}
      data-archive-flicker={flickerTile?.stage}
      data-archive-scene-revision={revision}
    >
      {avatar && portraitSlot !== undefined && avatarPoolIndex !== undefined ? (
        <ArchivePortrait
          key={avatar.profileId}
          avatar={avatar}
          slot={portraitSlot}
          poolIndex={avatarPoolIndex}
        />
      ) : null}
      {tileKind === 'motif' || tileKind === 'ghost'
        ? <i style={motifStyle} />
        : null}
    </span>
  )
})

const ArchiveMosaic = memo(function ArchiveMosaic({
  side,
  flicker,
  targetScene,
  sceneRevision,
  reducedMotion,
  avatars,
}: ArchiveMosaicProps) {
  const region = getMosaicRegion(side)
  const columns = 6
  const rowCount = 10
  const tileCount = columns * rowCount
  const mosaicStyle = { '--archive-columns': columns } as CSSProperties

  return (
    <div
      className={`archive-mosaic archive-mosaic--${side}`}
      style={mosaicStyle}
      data-mosaic-rows={rowCount}
      aria-hidden="true"
    >
      {Array.from({ length: tileCount }, (_, index) => {
        const row = Math.floor(index / columns)
        const column = index % columns
        const tileKey = getFlickerTileKey(region, row, column)

        return (
          <ArchiveMosaicTile
            key={`${side}-${index}`}
            side={side}
            region={region}
            index={index}
            row={row}
            column={column}
            flickerTile={flicker.tiles[tileKey]}
            exitDuration={flicker.exitDuration}
            targetScene={targetScene}
            sceneRevision={sceneRevision}
            reducedMotion={reducedMotion}
            avatars={avatars}
          />
        )
      })}
    </div>
  )
})

type ArchiveTopicMotifProps = {
  index: number
  row: number
  seed: number
  opacity: number
  scale: number
  flickerTile: ArchiveFlickerTile | undefined
  exitDuration: number
  targetScene: ArchiveSceneVariant
  sceneRevision: number
  reducedMotion: boolean
}

const ArchiveTopicMotif = memo(function ArchiveTopicMotif({
  index,
  row,
  seed,
  opacity,
  scale,
  flickerTile,
  exitDuration,
  targetScene,
  sceneRevision,
  reducedMotion,
}: ArchiveTopicMotifProps) {
  const { scene, revision } = useArchiveTileScene(
    targetScene,
    sceneRevision,
    flickerTile,
    reducedMotion,
  )
  const tileKey = `topic-${index}`

  return (
    <i
      className={`${flickerTile ? 'archive-topic-strip__motif--flicker' : ''}${flickerTile?.stage === 'leaving' ? ' archive-topic-strip__motif--flicker-leaving' : ''}`}
      data-archive-tile-key={tileKey}
      data-archive-flicker={flickerTile?.stage}
      data-archive-scene-revision={revision}
      style={{
        ...getArchiveMotifStyle(seed + scene.motifSeed),
        '--archive-topic-motif-opacity': opacity,
        '--archive-topic-motif-scale': scale,
        '--archive-flicker-baseline': opacity,
        ...getArchiveFlickerStyle(flickerTile, exitDuration),
        gridRow: row,
      } as CSSProperties}
    />
  )
})

const ArchiveTopicStrip = memo(function ArchiveTopicStrip({
  flicker,
  targetScene,
  sceneRevision,
  reducedMotion,
}: {
  flicker: ArchiveFlickerState
  targetScene: ArchiveSceneVariant
  sceneRevision: number
  reducedMotion: boolean
}) {
  return (
    <span className="archive-topic-strip" aria-hidden="true">
      {archiveTopicStripMotifs.map((motif, index) => (
        <ArchiveTopicMotif
          key={motif.row}
          index={index}
          {...motif}
          flickerTile={flicker.tiles[`topic-${index}`]}
          exitDuration={flicker.exitDuration}
          targetScene={targetScene}
          sceneRevision={sceneRevision}
          reducedMotion={reducedMotion}
        />
      ))}
    </span>
  )
})

export function WelcomeOverlay({
  reducedMotion,
  profileId,
  showProfileContent,
}: WelcomeOverlayProps) {
  const profile = syntheticProfilesById.get(profileId) ?? syntheticProfiles[0]
  const mosaicAvatars = allMosaicAvatars
  const profileCopy = getProfileCopy(profile)
  const usesEnglish = hasLatinName(profile.displayName)
  const nameScale = profile.displayName.length >= 12
    ? 0.44
    : profile.displayName.length >= 8
      ? 0.54
      : profile.displayName.length >= 6
        ? 0.64
        : profile.displayName.length >= 4
          ? 0.8
          : profile.displayName.length === 3
            ? 0.92
            : 1
  const leftFlicker = useArchiveMosaicFlicker(reducedMotion, 'left')
  const rightFlicker = useArchiveMosaicFlicker(reducedMotion, 'right')
  const leftSceneRevision = leftFlicker.round +
    (leftFlicker.phase === 'crossfade' ? 1 : 0)
  const rightSceneRevision = rightFlicker.round +
    (rightFlicker.phase === 'crossfade' ? 1 : 0)
  const leftTargetScene = useMemo(
    () => getArchiveScene(`archive-left-${leftSceneRevision}`),
    [leftSceneRevision],
  )
  const rightTargetScene = useMemo(
    () => getArchiveScene(`archive-right-${rightSceneRevision}`),
    [rightSceneRevision],
  )

  return (
    <aside
      className="future-memory future-memory--archive"
      aria-label={showProfileContent
        ? usesEnglish
          ? `Profile ${profile.profileId} ${profile.displayName}`
          : `个人页面 ${profile.profileId} ${profile.displayName}`
        : siteConfig.archive.mainVisualAriaLabel}
      data-profile-language={usesEnglish ? 'english' : 'chinese'}
      style={{
        '--archive-texture-position': archiveFrameScene.texturePosition,
      } as CSSProperties}
    >
      <ArchiveRail position="top" />

      <div className="archive-frame">
        <span className="archive-frame__cloth" aria-hidden="true" />
        <ArchiveMosaic
          side="left"
          flicker={leftFlicker}
          targetScene={leftTargetScene}
          sceneRevision={leftSceneRevision}
          reducedMotion={reducedMotion}
          avatars={mosaicAvatars}
        />
        <ArchiveTopicStrip
          flicker={leftFlicker}
          targetScene={leftTargetScene}
          sceneRevision={leftSceneRevision}
          reducedMotion={reducedMotion}
        />

        {showProfileContent ? (
          <>
            <section
              className="archive-topic-ribbon"
              aria-label={siteConfig.archive.profileRibbonAriaLabel}
            >
              <span className="archive-topic-ribbon__paper">
                <span
                  className="archive-topic-ribbon__ornament archive-topic-ribbon__ornament--top"
                  aria-hidden="true"
                >
                  <i
                    style={getArchiveMotifStyle(
                      2 + archiveFrameScene.motifSeed,
                    )}
                  />
                </span>
                <span className="archive-topic-ribbon__title" aria-hidden="true">
                  {siteConfig.archive.profileRibbon}
                </span>
                <span
                  className="archive-topic-ribbon__ornament archive-topic-ribbon__ornament--bottom"
                  aria-hidden="true"
                >
                  <i
                    style={getArchiveMotifStyle(
                      5 + archiveFrameScene.motifSeed,
                    )}
                  />
                </span>
              </span>
            </section>

            <section className="archive-canvas">
              <span className="archive-canvas__frame" aria-hidden="true" />
              <span className="archive-canvas__wash" aria-hidden="true" />

            <div
              className="archive-canvas__content"
              key={profile.profileId}
            >
              <div
                className="archive-canvas__identity"
                style={{ '--archive-name-scale': nameScale } as CSSProperties}
              >
                <div className="archive-canvas__memory">
                  <span
                    className="archive-canvas__memory-ornament"
                    aria-hidden="true"
                  >
                    <i
                      style={getArchiveMotifStyle(
                        17 + archiveFrameScene.motifSeed,
                      )}
                    />
                  </span>
                  <p className="archive-canvas__memory-line">
                    {profileCopy.memoryLine}
                  </p>
                </div>
                <div className="archive-canvas__nameplate">
                  <h2>
                    <span>{profile.displayName}</span>
                    <small>
                      {usesEnglish
                        ? siteConfig.archive.identityLabels.english
                        : siteConfig.archive.identityLabels.chinese}
                    </small>
                  </h2>
                </div>
                <p className="archive-canvas__identity-detail">
                  <strong>
                    <span>{profile.dayCount}</span>
                    <small>
                      {usesEnglish
                        ? siteConfig.archive.identityLabels.daysEnglish
                        : siteConfig.archive.identityLabels.daysChinese}
                    </small>
                  </strong>
                  <span>{profileCopy.companionshipCopy}</span>
                </p>
                <span
                  className="archive-canvas__closing-mark"
                  aria-hidden="true"
                >
                  <i />
                </span>
              </div>
            </div>
            </section>
          </>
        ) : (
          <section
            className="archive-canvas archive-main-visual"
            aria-labelledby="archive-main-visual-title"
          >
            <span
              className="archive-canvas__frame archive-main-visual__frame"
              aria-hidden="true"
            />
            <span className="archive-canvas__wash" aria-hidden="true" />
            <span className="archive-main-visual__field" aria-hidden="true" />

            <div className="archive-main-visual__title-band">
              <span
                className="archive-main-visual__rule archive-main-visual__rule--top"
              >
                <span className="archive-main-visual__brand-artwork">
                  {siteConfig.archive.mainVisual.eyebrow}
                </span>
              </span>
              <span
                className="archive-main-visual__ornament archive-main-visual__ornament--left"
                aria-hidden="true"
              >
                <i
                  style={getArchiveMotifStyle(
                    2 + archiveFrameScene.motifSeed,
                  )}
                />
              </span>
              <h2 id="archive-main-visual-title">
                <span className="archive-main-visual__title-artwork">
                  {siteConfig.archive.mainVisual.title}
                </span>
              </h2>
              <span
                className="archive-main-visual__ornament archive-main-visual__ornament--right"
                aria-hidden="true"
              >
                <i
                  style={getArchiveMotifStyle(
                    5 + archiveFrameScene.motifSeed,
                  )}
                />
              </span>
              <span
                className="archive-main-visual__rule archive-main-visual__rule--bottom"
              >
                <span className="archive-main-visual__mission-artwork">
                  {siteConfig.archive.mainVisual.statement}
                </span>
              </span>
            </div>
          </section>
        )}

        <div className="archive-right">
          <ArchiveMosaic
            side="right"
            flicker={rightFlicker}
            targetScene={rightTargetScene}
            sceneRevision={rightSceneRevision}
            reducedMotion={reducedMotion}
            avatars={mosaicAvatars}
          />
        </div>
      </div>

      <ArchiveRail position="bottom" />
    </aside>
  )
}
