import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl'
import {
  letterSequence,
  type LetterSequenceEntry,
  type LetterWord,
} from '../config/site'
import { motifFlickerTiming } from '../motifFlicker'
import { palettes } from '../palettes'

type TextureStageProps = {
  reducedMotion: boolean
  sequenceMode: SequenceMode
}

type SequenceMode = 'ambient' | 'letters'

type LetterSequenceTiming = {
  initialDelay: number
  randomDuration: number
  visibleDuration: number
  interval: number
  easeInDuration: number
  easeOutDuration: number
}

type SmoothRandomValue = {
  current: number
  from: number
  target: number
  elapsed: number
  duration: number
  min: number
  max: number
  maxStep: number
}

type LetterMode = 0 | LetterSequenceEntry['mode']
type ActiveLetterMode = Exclude<LetterMode, 0>

type ExperimentLetterMode = 3 | 4 | 5

type LetterMaskPreset = {
  fontSize: number
  strokeWidth: number
  letterSpacing: number
  maxWidth: number
  aspect: number
}

type ExperimentTrackingLayout = {
  prefix: '' | 'I ❤ '
  glyphs: string
  tracking: readonly number[]
}

const LETTER_SEQUENCE: readonly LetterSequenceEntry[] = letterSequence

const LETTER_MASK_WORDS = LETTER_SEQUENCE

type LetterSequenceState = {
  mode: LetterMode
  phase: 'ambient' | 'initial-random' | 'random' | LetterWord
  blend: number
  phaseElapsed: number
  activeWord: LetterWord | null
  nextWord: LetterWord
}

const AMBIENT_LETTER_SEQUENCE_STATE: LetterSequenceState = {
  mode: 0,
  phase: 'ambient',
  blend: 0,
  phaseElapsed: 0,
  activeWord: null,
  nextWord: LETTER_SEQUENCE[0].word,
}

type AvatarRoundState = {
  anchors: number[]
  avatarIndices: number[]
}

const MAX_DEVICE_PIXEL_RATIO = 1.75
// Render the 6144x2304 installation at its native pixel count. The previous
// 8 MP cap produced a 4618x1732 backing buffer that the browser enlarged to
// the wall, softening every WebGL-composited SVG edge and portrait stamp.
const MAX_RENDER_PIXELS = 6144 * 2304
const MIN_RANDOM_DURATION = 20
const MAX_RANDOM_DURATION = 48
const PATTERN_DENSITY = 2
const MOTIF_VISUAL_SCALE = 1 / PATTERN_DENSITY
const SOURCE_MOTIF_COLUMNS = 24
const SOURCE_MOTIF_ROWS = 13
const UNIQUE_SOURCE_MOTIF_ROWS = 12
const COMPLETE_SOURCE_MOTIF_COLUMNS = 23
const SOURCE_TEXTURE_HEIGHT = 1080
// The thirteenth row repeats the first. Their measured center-to-center distance
// is the true vertical period, so the duplicate row is skipped without changing
// motif size or stretching the source artwork.
const UNIQUE_PATTERN_HEIGHT = 1000.914
const UNIQUE_PATTERN_HEIGHT_UV = UNIQUE_PATTERN_HEIGHT / SOURCE_TEXTURE_HEIGHT
const HORIZONTAL_STATE_TILES = PATTERN_DENSITY
const VERTICAL_STATE_TILES = Math.ceil(
  PATTERN_DENSITY / UNIQUE_PATTERN_HEIGHT_UV,
)
const MOTIF_COLUMNS = SOURCE_MOTIF_COLUMNS * HORIZONTAL_STATE_TILES
const MOTIF_ROWS = UNIQUE_SOURCE_MOTIF_ROWS * VERTICAL_STATE_TILES
const MOTIF_OPACITY_MIN = motifFlickerTiming.opacityMin
const MOTIF_OPACITY_MAX = motifFlickerTiming.opacityMax
const MOTIF_LOW_OPACITY_MAX = motifFlickerTiming.lowOpacityMax
const MOTIF_HIGH_OPACITY_MIN = motifFlickerTiming.highOpacityMin
const MOTIF_FREQUENCY_MIN = motifFlickerTiming.frequencyMin
const MOTIF_FREQUENCY_MAX = motifFlickerTiming.frequencyMax
const MOTIF_ROUND_MIN_DURATION = motifFlickerTiming.roundMinDuration
const MOTIF_ROUND_MAX_DURATION = motifFlickerTiming.roundMaxDuration
const MOTIF_LEAVE_START = motifFlickerTiming.leaveStart
const MOTIF_PULSE_HOLD_END = motifFlickerTiming.pulseHoldEnd
const MOTIF_PULSE_PEAK_START = motifFlickerTiming.pulsePeakStart
const MOTIF_PULSE_DECAY_START = motifFlickerTiming.pulseDecayStart
const LETTER_TIMING: LetterSequenceTiming = {
  initialDelay: 3,
  randomDuration: 6,
  visibleDuration: 6,
  interval: 12,
  easeInDuration: 0.35,
  easeOutDuration: 0.65,
}
const LETTER_MASK_WIDTH = 2048
const LETTER_MASK_ROW_HEIGHT = 512
const LETTER_MASK_HEIGHT = LETTER_MASK_ROW_HEIGHT * LETTER_MASK_WORDS.length
// Noto Sans uppercase ink sits about 34 px above the middle of its authored
// mask row. Compensate the ink rather than the font line box so every word is
// visually centered on the 6144x2304 installation canvas.
const LETTER_MASK_VISUAL_CENTER_OFFSET = 34
const LETTER_FONT_SIZE = 470
const LETTER_STROKE_WIDTH = 24
const CLASSIC_LETTER_MAX_WIDTH = 940
const CLASSIC_WORD_ASPECT = 2.45
const CLASSIC_MASK_PRESET: LetterMaskPreset = {
  fontSize: LETTER_FONT_SIZE,
  strokeWidth: LETTER_STROKE_WIDTH,
  letterSpacing: 0,
  maxWidth: CLASSIC_LETTER_MAX_WIDTH,
  aspect: CLASSIC_WORD_ASPECT,
}
const EXPERIMENT_WIDE_MASK_PRESET: LetterMaskPreset = {
  fontSize: 535,
  strokeWidth: 24,
  letterSpacing: 0,
  maxWidth: 1880,
  aspect: 4,
}
const EXPERIMENT_LONG_MASK_PRESET: LetterMaskPreset = {
  ...EXPERIMENT_WIDE_MASK_PRESET,
  // A slightly narrower horizontal base makes room for explicit glyph gaps;
  // the approved 535px vertical size stays unchanged.
  maxWidth: 1800,
}
const EXPERIMENT_MASK_PRESETS: Record<
  ExperimentLetterMode,
  LetterMaskPreset
> = {
  3: EXPERIMENT_LONG_MASK_PRESET,
  4: EXPERIMENT_WIDE_MASK_PRESET,
  5: EXPERIMENT_WIDE_MASK_PRESET,
}
// The 6144x2304 wall resolves the experiment word box to roughly 40 portrait
// columns. These pair-specific offsets leave at least one complete empty
// portrait column between every tracked pair without changing the 535px
// height; love phrases also keep the spacing inside the `I ❤ ` prefix.
const EXPERIMENT_TRACKING_LAYOUTS: Record<
  ExperimentLetterMode,
  ExperimentTrackingLayout
> = {
  3: {
    prefix: '',
    glyphs: 'TOGETHER',
    tracking: [18, 24, 20, 18, 24, 20, 18],
  },
  4: {
    prefix: 'I ❤ ',
    glyphs: 'IDEAS',
    tracking: [32, 28, 32, 28],
  },
  5: {
    prefix: 'I ❤ ',
    glyphs: 'COMMUNITY',
    tracking: [12, 10, 12, 12, 10, 12, 10, 12],
  },
}
const EXPERIMENT_I_BAR_WIDTH = 230
const EXPERIMENT_I_STEM_WIDTH = 82
const EXPERIMENT_I_HEIGHT = 407
const EXPERIMENT_I_BAR_HEIGHT = 72
const EXPERIMENT_I_VERTICAL_OFFSET = -38.5
const EXPERIMENT_HEART_HEIGHT = EXPERIMENT_I_HEIGHT
const EXPERIMENT_HEART_VERTICAL_OFFSET = EXPERIMENT_I_VERTICAL_OFFSET
const EXPERIMENT_HEART_ATLAS_CENTER_X = 634.5
const EXPERIMENT_HEART_CELL_WIDTH = 51.435090965
const LETTER_FONT_STACK =
  '"Growth Noto Sans", "Noto Sans", "Arial Black", "Helvetica Neue", Arial, sans-serif'
const AVATAR_COUNT = 674
const AVATAR_MAP_SOURCE = `${import.meta.env.BASE_URL}assets/avatar-atlas.png?v=synthetic-portrait-v2`
const ALL_AVATAR_INDICES = Array.from(
  { length: AVATAR_COUNT },
  (_, index) => index,
)
const AVATAR_ATLAS_COLUMNS = 32
const AVATAR_ATLAS_ROWS = 22
const AVATAR_ATLAS_CELL_SIZE = 96
const AVATAR_ATLAS_GUTTER = 0
const AVATAR_BLOCK_SIZE = 1
const ACTIVE_AVATAR_COUNT = 12
const AVATAR_OPACITY_MIN = 0.22
const AVATAR_OPACITY_MAX = 0.92
const WORD_AVATAR_OPACITY_MIN = 0.9
const WORD_AVATAR_OPACITY_MAX = 1
const WORD_AVATAR_FREQUENCY_MIN = 0.28
const WORD_AVATAR_FREQUENCY_MAX = 0.43
// 223 is coprime with 674, so a fixed letter cell visits every avatar before
// the rotation repeats. The row-major assignment is collision-free across any
// 13 contiguous motif rows, which covers the active word band at runtime.
const WORD_AVATAR_CURSOR_STEP = 223
const WORD_SURROUNDING_OPACITY_MIN = 0.1
const WORD_SURROUNDING_OPACITY_MAX = 0.4
const EXPERIMENT_PATTERN_OPACITY_MIN = 0.05
const EXPERIMENT_PATTERN_OPACITY_MAX = 0.16
const EXPERIMENT_SURROUNDING_AVATAR_OPACITY_MIN = 0.02
const EXPERIMENT_SURROUNDING_AVATAR_OPACITY_MAX = 0.08
const EXPERIMENT_WORD_AVATAR_OPACITY_MIN = 0.96
const EXPERIMENT_WORD_AVATAR_OPACITY_MAX = 1
const AMBIENT_PATTERN_OPACITY = WORD_SURROUNDING_OPACITY_MIN
const AVATAR_ENTER_END = 0.14
const AVATAR_LEAVE_START = 0.84
const SOURCE_TEXTURE_WIDTH = 1920
const SOURCE_COLUMN_CENTER_START = 38.02
const SOURCE_COLUMN_STEP = 83.402
const SOURCE_ROW_CENTER_START = 39.55
const SOURCE_MOTIF_COUNT =
  COMPLETE_SOURCE_MOTIF_COLUMNS * UNIQUE_SOURCE_MOTIF_ROWS
const MOTIF_UNITS = Array.from(
  {
    length:
      SOURCE_MOTIF_COUNT * HORIZONTAL_STATE_TILES * VERTICAL_STATE_TILES,
  },
  (_, index) => {
    const tile = Math.floor(index / SOURCE_MOTIF_COUNT)
    const sourceIndex = index % SOURCE_MOTIF_COUNT
    const tileRow = Math.floor(tile / HORIZONTAL_STATE_TILES)
    const tileColumn = tile % HORIZONTAL_STATE_TILES
    const sourceRow = Math.floor(sourceIndex / COMPLETE_SOURCE_MOTIF_COLUMNS)
    const sourceColumn = sourceIndex % COMPLETE_SOURCE_MOTIF_COLUMNS
    const row = tileRow * UNIQUE_SOURCE_MOTIF_ROWS + sourceRow
    const column = tileColumn * SOURCE_MOTIF_COLUMNS + sourceColumn
    return row * MOTIF_COLUMNS + column
  },
)
const ACTIVE_MOTIF_COUNT = Math.round(MOTIF_UNITS.length * 0.1)
const AVATAR_BLOCK_ANCHORS = (() => {
  const anchors: number[] = []
  for (let row = 0; row < MOTIF_ROWS; row += AVATAR_BLOCK_SIZE) {
    for (let column = 0; column < MOTIF_COLUMNS; column += AVATAR_BLOCK_SIZE) {
      const sourceColumn = column % SOURCE_MOTIF_COLUMNS
      if (sourceColumn + AVATAR_BLOCK_SIZE > COMPLETE_SOURCE_MOTIF_COLUMNS) {
        continue
      }
      anchors.push(row * MOTIF_COLUMNS + column)
    }
  }
  return anchors
})()
const firstPalette = palettes[0]

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragment = /* glsl */ `
  precision highp float;

  uniform sampler2D tMap;
  uniform sampler2D tUnitMap;
  uniform sampler2D tUnitState;
  uniform sampler2D tLetterMap;
  uniform sampler2D tAvatarMap;
  uniform sampler2D tAvatarState;
  uniform sampler2D tWordAvatarState;
  uniform vec2 uResolution;
  uniform float uDriftPhase;
  uniform float uBreathPhase;
  uniform float uBreathDepth;
  uniform float uColorPhase;
  uniform float uPaletteProgress;
  uniform vec3 uBackgroundFrom;
  uniform vec3 uBackgroundTo;
  uniform vec3 uTextureFrom;
  uniform vec3 uTextureTo;
  uniform float uUnitProgress;
  uniform float uUnitTime;
  uniform float uUnitEffectEnabled;
  uniform float uLetterMode;
  uniform float uLetterBlend;
  uniform float uLetterSeed;
  uniform float uAvatarEffectEnabled;

  varying vec2 vUv;

  const float IMAGE_ASPECT = 1.777777778;
  const vec3 AVATAR_PAPER_COLOR = vec3(0.894118, 0.745098, 0.545098);
  const vec3 AVATAR_INK_COLOR = vec3(0.635294, 0.329412, 0.235294);
  const vec2 SOURCE_UNIT_ID_GRID = vec2(
    ${SOURCE_MOTIF_COLUMNS.toFixed(1)},
    ${SOURCE_MOTIF_ROWS.toFixed(1)}
  );
  const vec2 STATE_UNIT_GRID = vec2(
    ${MOTIF_COLUMNS.toFixed(1)},
    ${MOTIF_ROWS.toFixed(1)}
  );
  const vec2 STATE_TILE_GRID = vec2(
    ${HORIZONTAL_STATE_TILES.toFixed(1)},
    ${VERTICAL_STATE_TILES.toFixed(1)}
  );
  const float PATTERN_DENSITY = ${PATTERN_DENSITY.toFixed(1)};
  const float UNIQUE_SOURCE_ROWS = ${UNIQUE_SOURCE_MOTIF_ROWS.toFixed(1)};
  const float UNIQUE_SOURCE_HEIGHT = ${UNIQUE_PATTERN_HEIGHT_UV.toFixed(9)};
  const float UNIQUE_SOURCE_OFFSET = ${(1 - UNIQUE_PATTERN_HEIGHT_UV).toFixed(9)};
  const float COMPLETE_SOURCE_COLUMNS = ${COMPLETE_SOURCE_MOTIF_COLUMNS.toFixed(1)};
  const vec2 AVATAR_ATLAS_GRID = vec2(
    ${AVATAR_ATLAS_COLUMNS.toFixed(1)},
    ${AVATAR_ATLAS_ROWS.toFixed(1)}
  );
  const float AVATAR_BLOCK_SIZE = ${AVATAR_BLOCK_SIZE.toFixed(1)};
  const float SOURCE_TEXTURE_WIDTH = ${SOURCE_TEXTURE_WIDTH.toFixed(1)};
  const float SOURCE_TEXTURE_HEIGHT = ${SOURCE_TEXTURE_HEIGHT.toFixed(1)};
  const float SOURCE_COLUMN_CENTER_START = ${SOURCE_COLUMN_CENTER_START.toFixed(3)};
  const float SOURCE_COLUMN_STEP = ${SOURCE_COLUMN_STEP.toFixed(3)};
  const float SOURCE_ROW_CENTER_START = ${SOURCE_ROW_CENTER_START.toFixed(3)};
  const float AVATAR_ATLAS_PADDING = ${(
    (AVATAR_ATLAS_GUTTER + 0.5) /
    AVATAR_ATLAS_CELL_SIZE
  ).toFixed(6)};
  const vec2 WORD_GRID_COMPACT = vec2(11.0, 5.0);
  const vec2 WORD_GRID_WIDE = vec2(17.0, 7.0);
  const float LETTER_MASK_ROWS = ${LETTER_MASK_WORDS.length.toFixed(1)};
  const float CLASSIC_WORD_ASPECT = ${CLASSIC_WORD_ASPECT.toFixed(2)};
  const float EXPERIMENT_MODE_3_ASPECT = ${EXPERIMENT_MASK_PRESETS[3].aspect.toFixed(2)};
  const float EXPERIMENT_MODE_4_ASPECT = ${EXPERIMENT_MASK_PRESETS[4].aspect.toFixed(2)};
  const float EXPERIMENT_MODE_5_ASPECT = ${EXPERIMENT_MASK_PRESETS[5].aspect.toFixed(2)};

  float smootherstep(float value) {
    float t = clamp(value, 0.0, 1.0);
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  float sameCell(float value, float target) {
    return 1.0 - step(0.25, abs(value - target));
  }

  float sourceRowCenter(float row) {
    if (row < 0.5) return 39.55;
    if (row < 1.5) return 123.19;
    if (row < 2.5) return 207.34;
    if (row < 3.5) return 291.42;
    if (row < 4.5) return 375.51;
    if (row < 5.5) return 459.53;
    if (row < 6.5) return 539.84;
    if (row < 7.5) return 623.93;
    if (row < 8.5) return 708.01;
    if (row < 9.5) return 792.04;
    if (row < 10.5) return 872.35;
    return 956.43;
  }

  float compactGlyphT(vec2 cell) {
    return clamp(sameCell(cell.y, 4.0) + sameCell(cell.x, 1.0), 0.0, 1.0);
  }

  float compactGlyphA(vec2 cell) {
    float top = sameCell(cell.x, 1.0) * sameCell(cell.y, 4.0);
    float sides = clamp(
      sameCell(cell.x, 0.0) + sameCell(cell.x, 2.0),
      0.0,
      1.0
    ) * (1.0 - sameCell(cell.y, 4.0));
    float middle = sameCell(cell.y, 2.0);
    return clamp(top + sides + middle, 0.0, 1.0);
  }

  float compactGlyphL(vec2 cell) {
    return clamp(sameCell(cell.x, 0.0) + sameCell(cell.y, 0.0), 0.0, 1.0);
  }

  float compactGlyphX(vec2 cell) {
    float diagonalSides = clamp(
      sameCell(cell.x, 0.0) + sameCell(cell.x, 2.0),
      0.0,
      1.0
    ) * clamp(
      sameCell(cell.y, 0.0) +
      sameCell(cell.y, 1.0) +
      sameCell(cell.y, 3.0) +
      sameCell(cell.y, 4.0),
      0.0,
      1.0
    );
    float center = sameCell(cell.x, 1.0) * sameCell(cell.y, 2.0);
    return clamp(diagonalSides + center, 0.0, 1.0);
  }

  float compactGlyphE(vec2 cell) {
    float bars = clamp(
      sameCell(cell.y, 0.0) +
      sameCell(cell.y, 2.0) +
      sameCell(cell.y, 4.0),
      0.0,
      1.0
    );
    return clamp(sameCell(cell.x, 0.0) + bars, 0.0, 1.0);
  }

  float compactGlyphS(vec2 cell) {
    float bars = clamp(
      sameCell(cell.y, 0.0) +
      sameCell(cell.y, 2.0) +
      sameCell(cell.y, 4.0),
      0.0,
      1.0
    );
    float upperLeft = sameCell(cell.x, 0.0) * sameCell(cell.y, 3.0);
    float lowerRight = sameCell(cell.x, 2.0) * sameCell(cell.y, 1.0);
    return clamp(bars + upperLeft + lowerRight, 0.0, 1.0);
  }

  float compactWordPixel(vec2 cell, float letterMode) {
    float glyphIndex = floor(cell.x / 4.0);
    float glyphColumn = mod(cell.x, 4.0);
    float isGlyphColumn = 1.0 - step(2.5, glyphColumn);
    vec2 glyphCell = vec2(glyphColumn, cell.y);
    float pixel = 0.0;

    if (letterMode < 1.5) {
      if (glyphIndex < 0.5) pixel = compactGlyphT(glyphCell);
      else if (glyphIndex < 1.5) pixel = compactGlyphA(glyphCell);
      else pixel = compactGlyphL(glyphCell);
    } else {
      if (glyphIndex < 0.5) pixel = compactGlyphX(glyphCell);
      else if (glyphIndex < 1.5) pixel = compactGlyphE(glyphCell);
      else pixel = compactGlyphS(glyphCell);
    }

    return pixel * isGlyphColumn * (1.0 - step(2.5, glyphIndex));
  }

  float wideGlyphT(vec2 cell) {
    return clamp(sameCell(cell.y, 6.0) + sameCell(cell.x, 2.0), 0.0, 1.0);
  }

  float wideGlyphA(vec2 cell) {
    float top =
      step(0.5, cell.x) * step(cell.x, 3.5) * sameCell(cell.y, 6.0);
    float sides = clamp(
      sameCell(cell.x, 0.0) + sameCell(cell.x, 4.0),
      0.0,
      1.0
    ) * (1.0 - sameCell(cell.y, 6.0));
    return clamp(top + sides + sameCell(cell.y, 3.0), 0.0, 1.0);
  }

  float wideGlyphL(vec2 cell) {
    return clamp(sameCell(cell.x, 0.0) + sameCell(cell.y, 0.0), 0.0, 1.0);
  }

  float wideGlyphX(vec2 cell) {
    float outerRows = clamp(
      sameCell(cell.y, 0.0) + sameCell(cell.y, 6.0),
      0.0,
      1.0
    ) * clamp(sameCell(cell.x, 0.0) + sameCell(cell.x, 4.0), 0.0, 1.0);
    float innerRows = clamp(
      sameCell(cell.y, 1.0) +
      sameCell(cell.y, 2.0) +
      sameCell(cell.y, 4.0) +
      sameCell(cell.y, 5.0),
      0.0,
      1.0
    ) * clamp(sameCell(cell.x, 1.0) + sameCell(cell.x, 3.0), 0.0, 1.0);
    float center = sameCell(cell.x, 2.0) * sameCell(cell.y, 3.0);
    return clamp(outerRows + innerRows + center, 0.0, 1.0);
  }

  float wideGlyphE(vec2 cell) {
    float bars = clamp(
      sameCell(cell.y, 0.0) +
      sameCell(cell.y, 3.0) +
      sameCell(cell.y, 6.0),
      0.0,
      1.0
    );
    return clamp(sameCell(cell.x, 0.0) + bars, 0.0, 1.0);
  }

  float wideGlyphS(vec2 cell) {
    float bars = clamp(
      sameCell(cell.y, 0.0) +
      sameCell(cell.y, 3.0) +
      sameCell(cell.y, 6.0),
      0.0,
      1.0
    );
    float upperLeft = sameCell(cell.x, 0.0) * clamp(
      sameCell(cell.y, 4.0) + sameCell(cell.y, 5.0),
      0.0,
      1.0
    );
    float lowerRight = sameCell(cell.x, 4.0) * clamp(
      sameCell(cell.y, 1.0) + sameCell(cell.y, 2.0),
      0.0,
      1.0
    );
    return clamp(bars + upperLeft + lowerRight, 0.0, 1.0);
  }

  float wideWordPixel(vec2 cell, float letterMode) {
    float glyphIndex = floor(cell.x / 6.0);
    float glyphColumn = mod(cell.x, 6.0);
    float isGlyphColumn = 1.0 - step(4.5, glyphColumn);
    vec2 glyphCell = vec2(glyphColumn, cell.y);
    float pixel = 0.0;

    if (letterMode < 1.5) {
      if (glyphIndex < 0.5) pixel = wideGlyphT(glyphCell);
      else if (glyphIndex < 1.5) pixel = wideGlyphA(glyphCell);
      else pixel = wideGlyphL(glyphCell);
    } else {
      if (glyphIndex < 0.5) pixel = wideGlyphX(glyphCell);
      else if (glyphIndex < 1.5) pixel = wideGlyphE(glyphCell);
      else pixel = wideGlyphS(glyphCell);
    }

    return pixel * isGlyphColumn * (1.0 - step(2.5, glyphIndex));
  }

  void main() {
    float eased = smootherstep(uPaletteProgress);
    float breathWave = 0.5 + 0.5 * sin(uBreathPhase);
    float colorFieldA = sin(vUv.x * 2.15 + vUv.y * 1.35 + uColorPhase);
    float colorFieldB = sin(vUv.y * 2.35 - vUv.x * 0.75 - uColorPhase * 0.72);
    float colorField = 0.5 + 0.25 * (colorFieldA + colorFieldB);
    float fieldEnvelope = 4.0 * eased * (1.0 - eased);
    float localMix = clamp(
      eased +
        (colorField - 0.5) * 0.10 * fieldEnvelope +
        (breathWave - 0.5) * uBreathDepth * 0.14 * fieldEnvelope,
      0.0,
      1.0
    );

    vec3 backgroundColor = mix(uBackgroundFrom, uBackgroundTo, localMix);
    vec3 textureColor = mix(uTextureFrom, uTextureTo, localMix);

    float canvasAspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 centered = vUv - 0.5;

    if (canvasAspect > IMAGE_ASPECT) {
      centered.y *= IMAGE_ASPECT / canvasAspect;
    } else {
      centered.x *= canvasAspect / IMAGE_ASPECT;
    }

    // The source image repeats as rigid planes. Its duplicate thirteenth row is
    // omitted from the vertical period; geometry never deforms.
    vec2 uv = 0.5 + centered * 0.92;
    vec2 rigidDrift = vec2(
      sin(uDriftPhase * 0.83) + sin(uDriftPhase * 0.31) * 0.36,
      cos(uDriftPhase * 0.71) + sin(uDriftPhase * 0.27) * 0.30
    ) * 0.0052;
    uv += rigidDrift;

    vec2 repeatedUv = uv * PATTERN_DENSITY;
    vec2 tileIndex = clamp(
      vec2(
        floor(repeatedUv.x),
        floor(repeatedUv.y / UNIQUE_SOURCE_HEIGHT)
      ),
      vec2(0.0),
      STATE_TILE_GRID - vec2(1.0)
    );
    vec2 sampledUv = vec2(
      fract(repeatedUv.x),
      UNIQUE_SOURCE_OFFSET + mod(repeatedUv.y, UNIQUE_SOURCE_HEIGHT)
    );
    sampledUv = clamp(
      sampledUv,
      vec2(0.001, UNIQUE_SOURCE_OFFSET + 0.001),
      vec2(0.999)
    );

    // The portrait grid is derived from the same measured motif centers, but
    // it covers the whole cell rather than the old SVG paths. This prevents a
    // face from being fragmented by the disconnected pieces in tUnitMap.
    float sourceRowStep = UNIQUE_SOURCE_HEIGHT * SOURCE_TEXTURE_HEIGHT /
      UNIQUE_SOURCE_ROWS;
    vec2 sourceCellCoord = vec2(
      (sampledUv.x * SOURCE_TEXTURE_WIDTH -
        (SOURCE_COLUMN_CENTER_START - SOURCE_COLUMN_STEP * 0.5)) /
        SOURCE_COLUMN_STEP,
      ((1.0 - sampledUv.y) * SOURCE_TEXTURE_HEIGHT -
        (SOURCE_ROW_CENTER_START - sourceRowStep * 0.5)) /
        sourceRowStep
    );
    vec2 sourceCellIndex = floor(sourceCellCoord);
    vec2 sourceCellUv = fract(sourceCellCoord);
    float avatarCellExists =
      step(0.0, sourceCellIndex.x) *
      step(sourceCellIndex.x, COMPLETE_SOURCE_COLUMNS - 1.0) *
      step(0.0, sourceCellIndex.y) *
      step(sourceCellIndex.y, UNIQUE_SOURCE_ROWS - 1.0);
    sourceCellIndex = clamp(
      sourceCellIndex,
      vec2(0.0),
      vec2(COMPLETE_SOURCE_COLUMNS - 1.0, UNIQUE_SOURCE_ROWS - 1.0)
    );
    vec2 avatarUnitIndex = vec2(
      tileIndex.x * SOURCE_UNIT_ID_GRID.x + sourceCellIndex.x,
      tileIndex.y * UNIQUE_SOURCE_ROWS + sourceCellIndex.y
    );
    vec4 avatarState = texture2D(
      tAvatarState,
      (avatarUnitIndex + 0.5) / STATE_UNIT_GRID
    );
    float avatarIsSelected = step(0.001, avatarState.a) * avatarCellExists;
    vec2 avatarBlockUv =
      (mod(avatarUnitIndex, AVATAR_BLOCK_SIZE) + sourceCellUv) /
      AVATAR_BLOCK_SIZE;

    // The font mask is sampled once at the center of each full portrait cell.
    // Its strokes therefore become a mosaic of intact 1x1 portrait stamps,
    // never clipped fragments of the underlying pattern.
    float experimentWord = step(2.5, uLetterMode);
    float useWideLayout = step(0.95, canvasAspect);
    float useFontLayout = max(useWideLayout, experimentWord);
    float desiredWordWidth = mix(
      mix(0.98, 0.95, useWideLayout),
      0.94,
      experimentWord
    );
    float maximumWordHeight = mix(
      mix(0.46, 0.88, useWideLayout),
      0.78,
      experimentWord
    );
    float experimentWordAspect = mix(
      EXPERIMENT_MODE_3_ASPECT,
      EXPERIMENT_MODE_4_ASPECT,
      step(3.5, uLetterMode)
    );
    experimentWordAspect = mix(
      experimentWordAspect,
      EXPERIMENT_MODE_5_ASPECT,
      step(4.5, uLetterMode)
    );
    float wordAspect = mix(
      mix(2.20, CLASSIC_WORD_ASPECT, useWideLayout),
      experimentWordAspect,
      experimentWord
    );
    float wordWidth = min(
      desiredWordWidth,
      maximumWordHeight * wordAspect / canvasAspect
    );
    float wordHeight = wordWidth * canvasAspect / wordAspect;
    vec2 wordSize = vec2(wordWidth, wordHeight);
    vec2 avatarBlockAnchor =
      avatarUnitIndex - mod(avatarUnitIndex, AVATAR_BLOCK_SIZE);
    vec2 avatarSourceAnchor = vec2(
      mod(avatarBlockAnchor.x, SOURCE_UNIT_ID_GRID.x),
      mod(avatarBlockAnchor.y, UNIQUE_SOURCE_ROWS)
    );
    float avatarBlockCenterOffset = (AVATAR_BLOCK_SIZE - 1.0) * 0.5;
    vec2 avatarRepeatedCenter = vec2(
      tileIndex.x +
        (SOURCE_COLUMN_CENTER_START +
          (avatarSourceAnchor.x + avatarBlockCenterOffset) *
            SOURCE_COLUMN_STEP) /
        SOURCE_TEXTURE_WIDTH,
      tileIndex.y * UNIQUE_SOURCE_HEIGHT +
        (1.0 -
          (SOURCE_ROW_CENTER_START +
            (avatarSourceAnchor.y + avatarBlockCenterOffset) * sourceRowStep) /
          SOURCE_TEXTURE_HEIGHT) -
        UNIQUE_SOURCE_OFFSET
    );
    vec2 avatarBlockMotifUv = avatarRepeatedCenter / PATTERN_DENSITY;
    vec2 avatarBlockCentered =
      (avatarBlockMotifUv - rigidDrift - 0.5) / 0.92;
    if (canvasAspect > IMAGE_ASPECT) {
      avatarBlockCentered.y *= canvasAspect / IMAGE_ASPECT;
    } else {
      avatarBlockCentered.x *= IMAGE_ASPECT / canvasAspect;
    }
    vec2 avatarBlockScreenUv = avatarBlockCentered + 0.5;
    vec2 avatarWordUv =
      (avatarBlockScreenUv - (vec2(0.5) - wordSize * 0.5)) / wordSize;
    float avatarWordBounds =
      step(0.0, avatarWordUv.x) * step(avatarWordUv.x, 1.0) *
      step(0.0, avatarWordUv.y) * step(avatarWordUv.y, 1.0);
    float localLetterX = clamp(avatarWordUv.x, 0.001, 0.999);
    float classicLetterX = 0.25 + localLetterX * 0.5;
    float letterRow = max(uLetterMode - 1.0, 0.0);
    vec2 avatarLetterUv = vec2(
      mix(classicLetterX, localLetterX, experimentWord),
      (letterRow + 1.0 - clamp(avatarWordUv.y, 0.001, 0.999)) /
        LETTER_MASK_ROWS
    );
    float fontLetterAlpha = texture2D(tLetterMap, avatarLetterUv).a;
    float fontLetterPixel = mix(
      step(0.28, fontLetterAlpha),
      smoothstep(0.42, 0.58, fontLetterAlpha),
      experimentWord
    );
    vec2 compactLetterCell = floor(
      clamp(avatarWordUv, 0.0, 0.999) * WORD_GRID_COMPACT
    );
    float compactLetterPixel = compactWordPixel(
      compactLetterCell,
      uLetterMode
    );
    float avatarLetterPixel = mix(
      compactLetterPixel,
      fontLetterPixel,
      useFontLayout
    );
    float wordActive = step(0.5, uLetterMode);
    float wordCellCoverage =
      avatarWordBounds * avatarLetterPixel * avatarCellExists * wordActive;
    // Atlas identity stays discrete, while experiment edge opacity keeps the
    // full smooth coverage instead of jumping from zero to a half-visible tile.
    float wordCell = step(0.001, wordCellCoverage);
    float wordBlend =
      wordCell *
      mix(1.0, wordCellCoverage, experimentWord) *
      uLetterBlend;

    // The CPU writes one shuffled 667-avatar cycle into this texture. Using a
    // separate state map keeps word identities stable for the full visible
    // phase while admitting portraits, text avatars, and face-detector misses.
    vec4 wordAvatarState = texture2D(
      tWordAvatarState,
      (avatarUnitIndex + 0.5) / STATE_UNIT_GRID
    );
    float letterAvatarHash = fract(
      sin(
        dot(
          avatarUnitIndex + vec2(
            uLetterMode * 17.0 + uLetterSeed * 0.73,
            uLetterMode * 31.0 + uLetterSeed * 1.17
          ),
          vec2(12.9898, 78.233)
        )
      ) * 43758.5453
    );
    vec2 letterAvatarAtlasCell = vec2(
      floor(wordAvatarState.r * AVATAR_ATLAS_GRID.x),
      floor(wordAvatarState.g * AVATAR_ATLAS_GRID.y)
    );
    vec2 randomAvatarAtlasCell = vec2(
      floor(avatarState.r * AVATAR_ATLAS_GRID.x),
      floor(avatarState.g * AVATAR_ATLAS_GRID.y)
    );
    vec2 avatarAtlasCell = mix(
      randomAvatarAtlasCell,
      letterAvatarAtlasCell,
      wordCell
    );
    vec2 avatarAtlasLocalUv = mix(
      vec2(AVATAR_ATLAS_PADDING),
      vec2(1.0 - AVATAR_ATLAS_PADDING),
      clamp(avatarBlockUv, 0.0, 1.0)
    );
    vec2 avatarAtlasUv =
      (avatarAtlasCell + avatarAtlasLocalUv) / AVATAR_ATLAS_GRID;
    float avatarLuminance = texture2D(tAvatarMap, avatarAtlasUv).r;

    float mask = texture2D(tMap, sampledUv).a;

    // The ID map assigns every disconnected piece of one visual motif the same
    // row/column color, so opacity changes always affect a complete motif.
    vec4 unitPixel = texture2D(tUnitMap, sampledUv);
    vec2 sourceUnitIndex = floor(unitPixel.rg * SOURCE_UNIT_ID_GRID);
    vec2 unitIndex = vec2(
      tileIndex.x * SOURCE_UNIT_ID_GRID.x + sourceUnitIndex.x,
      tileIndex.y * UNIQUE_SOURCE_ROWS + sourceUnitIndex.y
    );
    vec2 unitStateUv = (unitIndex + 0.5) / STATE_UNIT_GRID;
    vec4 unitState = texture2D(tUnitState, unitStateUv);
    float unitIsSelected = step(0.001, unitState.a);
    float unitExists = step(0.001, unitPixel.a);
    float unitFrequency = mix(
      ${MOTIF_FREQUENCY_MIN.toFixed(1)},
      ${MOTIF_FREQUENCY_MAX.toFixed(1)},
      unitState.a
    );
    float unitCycle = fract(uUnitTime * unitFrequency + unitState.b);
    float unitRise = smootherstep(
      (unitCycle - ${MOTIF_PULSE_HOLD_END.toFixed(2)}) /
      (${MOTIF_PULSE_PEAK_START.toFixed(2)} - ${MOTIF_PULSE_HOLD_END.toFixed(2)})
    );
    float unitFall = 1.0 - smootherstep(
      (unitCycle - ${MOTIF_PULSE_DECAY_START.toFixed(2)}) /
      (1.0 - ${MOTIF_PULSE_DECAY_START.toFixed(2)})
    );
    // An asymmetric double-eased pulse: a short dim hold, a quick flare,
    // then a softer fall. It never uses a linear opacity ramp.
    float unitPulse = smootherstep(unitRise * unitFall);
    float unitOpacity = mix(
      unitState.r,
      unitState.g,
      unitPulse
    );
    float unitLeave = 1.0 - smootherstep(
      (uUnitProgress - ${MOTIF_LEAVE_START.toFixed(2)}) /
      (1.0 - ${MOTIF_LEAVE_START.toFixed(2)})
    );
    // The next group starts immediately at the round boundary, so there is no
    // all-opaque pause between groups. The outgoing group alone eases away.
    float unitEnvelope = unitLeave;
    float unitMix = unitEnvelope * unitIsSelected * unitExists * uUnitEffectEnabled;
    // 01 uses the same low-ink field as 02: most motifs hold at 10%, while the
    // selected cells retain their rhythm inside 02's 10%-40% colour range.
    float unitOpacityProgress = clamp(
      (unitOpacity - ${MOTIF_OPACITY_MIN.toFixed(2)}) /
        (${MOTIF_OPACITY_MAX.toFixed(2)} - ${MOTIF_OPACITY_MIN.toFixed(2)}),
      0.0,
      1.0
    );
    float randomPulseOpacity = mix(
      ${WORD_SURROUNDING_OPACITY_MIN.toFixed(2)},
      ${WORD_SURROUNDING_OPACITY_MAX.toFixed(2)},
      unitOpacityProgress
    );
    float randomOpacity = mix(
      ${AMBIENT_PATTERN_OPACITY.toFixed(2)},
      randomPulseOpacity,
      unitMix
    );

    // Wide feature words use an independent per-motif pulse for the field.
    // The eased word envelope crossfades every non-letter motif into 10%-40%,
    // preserving motion while increasing contrast around the portrait letters.
    float surroundingHash = fract(
      sin(
        dot(
          unitIndex + vec2(
            uLetterMode * 19.0 + uLetterSeed * 0.41,
            uLetterMode * 37.0 + uLetterSeed * 0.89
          ),
          vec2(39.3468, 11.1351)
        )
      ) * 24634.6345
    );
    float surroundingFrequency = mix(
      ${WORD_AVATAR_FREQUENCY_MIN.toFixed(2)},
      ${WORD_AVATAR_FREQUENCY_MAX.toFixed(2)},
      fract(surroundingHash * 73.0 + 0.29)
    );
    float surroundingCycle = fract(
      uUnitTime * surroundingFrequency + surroundingHash
    );
    float surroundingRise = smootherstep(
      (surroundingCycle - ${MOTIF_PULSE_HOLD_END.toFixed(2)}) /
      (${MOTIF_PULSE_PEAK_START.toFixed(2)} - ${MOTIF_PULSE_HOLD_END.toFixed(2)})
    );
    float surroundingFall = 1.0 - smootherstep(
      (surroundingCycle - ${MOTIF_PULSE_DECAY_START.toFixed(2)}) /
      (1.0 - ${MOTIF_PULSE_DECAY_START.toFixed(2)})
    );
    float surroundingPulse = smootherstep(surroundingRise * surroundingFall);
    float surroundingOpacity = mix(
      ${WORD_SURROUNDING_OPACITY_MIN.toFixed(2)},
      ${WORD_SURROUNDING_OPACITY_MAX.toFixed(2)},
      surroundingPulse
    );
    float experimentPatternOpacity = mix(
      ${EXPERIMENT_PATTERN_OPACITY_MIN.toFixed(2)},
      ${EXPERIMENT_PATTERN_OPACITY_MAX.toFixed(2)},
      surroundingPulse
    );
    surroundingOpacity = mix(
      surroundingOpacity,
      experimentPatternOpacity,
      experimentWord
    );
    float scenePatternOpacity = mix(
      randomOpacity,
      surroundingOpacity,
      uLetterBlend
    );

    float avatarFrequency = mix(
      ${MOTIF_FREQUENCY_MIN.toFixed(1)},
      ${MOTIF_FREQUENCY_MAX.toFixed(1)},
      avatarState.a
    );
    float avatarCycle = fract(uUnitTime * avatarFrequency + avatarState.b);
    float avatarRise = smootherstep(
      (avatarCycle - ${MOTIF_PULSE_HOLD_END.toFixed(2)}) /
      (${MOTIF_PULSE_PEAK_START.toFixed(2)} - ${MOTIF_PULSE_HOLD_END.toFixed(2)})
    );
    float avatarFall = 1.0 - smootherstep(
      (avatarCycle - ${MOTIF_PULSE_DECAY_START.toFixed(2)}) /
      (1.0 - ${MOTIF_PULSE_DECAY_START.toFixed(2)})
    );
    float avatarPulse = smootherstep(avatarRise * avatarFall);
    float avatarOpacity = mix(
      ${AVATAR_OPACITY_MIN.toFixed(2)},
      ${AVATAR_OPACITY_MAX.toFixed(2)},
      avatarPulse
    );
    float avatarEnter = smootherstep(
      uUnitProgress / ${AVATAR_ENTER_END.toFixed(2)}
    );
    float avatarLeave = 1.0 - smootherstep(
      (uUnitProgress - ${AVATAR_LEAVE_START.toFixed(2)}) /
      (1.0 - ${AVATAR_LEAVE_START.toFixed(2)})
    );
    float avatarEnvelope = avatarEnter * avatarLeave;

    // Re-clip every source stamp to one inner safe area before drawing the same
    // analytic octagon around it. This preserves a visible paper gap even when
    // a dark shoulder, text block, or logo touched the authored bottom edge.
    vec2 avatarStampPoint = abs(avatarBlockUv - 0.5);
    float avatarFrameOuterBox = 1.0 - smootherstep(
      (max(avatarStampPoint.x, avatarStampPoint.y) - 0.463) / 0.006
    );
    float avatarFrameOuterDiagonal = 1.0 - smootherstep(
      (avatarStampPoint.x + avatarStampPoint.y - 0.858) / 0.010
    );
    float avatarFrameOuter = avatarFrameOuterBox * avatarFrameOuterDiagonal;
    float avatarFrameInnerBox = 1.0 - smootherstep(
      (max(avatarStampPoint.x, avatarStampPoint.y) - 0.445) / 0.006
    );
    float avatarFrameInnerDiagonal = 1.0 - smootherstep(
      (avatarStampPoint.x + avatarStampPoint.y - 0.822) / 0.010
    );
    float avatarFrameInner = avatarFrameInnerBox * avatarFrameInnerDiagonal;
    float avatarFrame = clamp(avatarFrameOuter - avatarFrameInner, 0.0, 1.0);
    float avatarContentBox = 1.0 - smootherstep(
      (max(avatarStampPoint.x, avatarStampPoint.y) - 0.415) / 0.010
    );
    float avatarContentDiagonal = 1.0 - smootherstep(
      (avatarStampPoint.x + avatarStampPoint.y - 0.770) / 0.016
    );
    float avatarContentMask = avatarContentBox * avatarContentDiagonal;
    float avatarSourceInk = 1.0 - smoothstep(0.42, 0.86, avatarLuminance);
    float avatarPortrait = max(
      avatarSourceInk * avatarContentMask,
      avatarFrame
    );
    float avatarOuter = avatarFrameOuter;
    float avatarBlend =
      avatarIsSelected *
      avatarEnvelope *
      avatarOpacity *
      uAvatarEffectEnabled;

    float wordAvatarPhase = fract(letterAvatarHash * 37.0 + 0.17);
    float wordAvatarFrequency = mix(
      ${WORD_AVATAR_FREQUENCY_MIN.toFixed(2)},
      ${WORD_AVATAR_FREQUENCY_MAX.toFixed(2)},
      fract(letterAvatarHash * 91.0 + 0.43)
    );
    float wordAvatarCycle = fract(
      uUnitTime * wordAvatarFrequency + wordAvatarPhase
    );
    float wordAvatarRise = smootherstep(
      (wordAvatarCycle - ${MOTIF_PULSE_HOLD_END.toFixed(2)}) /
      (${MOTIF_PULSE_PEAK_START.toFixed(2)} - ${MOTIF_PULSE_HOLD_END.toFixed(2)})
    );
    float wordAvatarFall = 1.0 - smootherstep(
      (wordAvatarCycle - ${MOTIF_PULSE_DECAY_START.toFixed(2)}) /
      (1.0 - ${MOTIF_PULSE_DECAY_START.toFixed(2)})
    );
    float wordAvatarPulse = smootherstep(wordAvatarRise * wordAvatarFall);
    float wordAvatarOpacity = mix(
      ${WORD_AVATAR_OPACITY_MIN.toFixed(2)},
      ${WORD_AVATAR_OPACITY_MAX.toFixed(2)},
      wordAvatarPulse
    );
    float experimentWordAvatarOpacity = mix(
      ${EXPERIMENT_WORD_AVATAR_OPACITY_MIN.toFixed(2)},
      ${EXPERIMENT_WORD_AVATAR_OPACITY_MAX.toFixed(2)},
      wordAvatarPulse
    );
    wordAvatarOpacity = mix(
      wordAvatarOpacity,
      experimentWordAvatarOpacity,
      experimentWord
    );

    // During wide feature words, both the surrounding motifs and the few normal random
    // portraits stay within 10%-40%. Letter portraits remain independently at
    // 90%-100%, creating a clear focal contrast without freezing the motion.
    float surroundingAvatarOpacity = mix(
      ${WORD_SURROUNDING_OPACITY_MIN.toFixed(2)},
      ${WORD_SURROUNDING_OPACITY_MAX.toFixed(2)},
      wordAvatarPulse
    );
    float experimentSurroundingAvatarOpacity = mix(
      ${EXPERIMENT_SURROUNDING_AVATAR_OPACITY_MIN.toFixed(2)},
      ${EXPERIMENT_SURROUNDING_AVATAR_OPACITY_MAX.toFixed(2)},
      wordAvatarPulse
    );
    surroundingAvatarOpacity = mix(
      surroundingAvatarOpacity,
      experimentSurroundingAvatarOpacity,
      experimentWord
    );
    float surroundingAvatarBlend =
      avatarIsSelected *
      avatarEnvelope *
      surroundingAvatarOpacity *
      uAvatarEffectEnabled;
    float sceneAvatarBlend = mix(
      avatarBlend,
      surroundingAvatarBlend,
      uLetterBlend
    );
    float patternAlpha = mask * scenePatternOpacity;
    float randomAvatarComposite =
      avatarOuter * sceneAvatarBlend * (1.0 - wordBlend);
    vec3 basePatternColor = mix(
      backgroundColor,
      textureColor,
      patternAlpha
    );
    vec3 avatarStampColor = mix(
      AVATAR_PAPER_COLOR,
      AVATAR_INK_COLOR,
      avatarPortrait
    );
    vec3 baseWithRandomAvatar = mix(
      basePatternColor,
      avatarStampColor,
      randomAvatarComposite
    );
    float wordAvatarComposite =
      avatarOuter *
      wordAvatarOpacity *
      uAvatarEffectEnabled *
      wordBlend;
    vec3 finalColor = mix(
      baseWithRandomAvatar,
      avatarStampColor,
      wordAvatarComposite
    );

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randomInteger(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function selectMotifUnits(previousSelection: Set<number>) {
  const candidates = MOTIF_UNITS.filter((unit) => !previousSelection.has(unit))

  for (let index = 0; index < ACTIVE_MOTIF_COUNT; index += 1) {
    const randomIndex = randomInteger(index, candidates.length - 1)
    const candidate = candidates[index]
    candidates[index] = candidates[randomIndex]
    candidates[randomIndex] = candidate
  }

  return candidates.slice(0, ACTIVE_MOTIF_COUNT)
}

function shuffled<T>(values: T[]) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInteger(0, index)
    const value = result[index]
    result[index] = result[randomIndex]
    result[randomIndex] = value
  }
  return result
}

function selectAvatarAnchors(previousSelection: Set<number>) {
  const candidates = AVATAR_BLOCK_ANCHORS.filter(
    (anchor) => !previousSelection.has(anchor),
  )
  return shuffled(candidates).slice(0, ACTIVE_AVATAR_COUNT)
}

function createAvatarStateData() {
  return new Uint8Array(MOTIF_COLUMNS * MOTIF_ROWS * 4)
}

function writeWordAvatarAssignments(
  data: Uint8Array,
  avatarOrder: number[],
  cursor: number,
) {
  for (let unit = 0; unit < MOTIF_COLUMNS * MOTIF_ROWS; unit += 1) {
    const avatarIndex = avatarOrder[(unit + cursor) % avatarOrder.length]
    const atlasColumn = avatarIndex % AVATAR_ATLAS_COLUMNS
    const atlasRow = Math.floor(avatarIndex / AVATAR_ATLAS_COLUMNS)
    const offset = unit * 4
    data[offset] = Math.round(
      ((atlasColumn + 0.5) / AVATAR_ATLAS_COLUMNS) * 255,
    )
    data[offset + 1] = Math.round(
      ((atlasRow + 0.5) / AVATAR_ATLAS_ROWS) * 255,
    )
    data[offset + 2] = 0
    data[offset + 3] = 255
  }
}

function writeAvatarRound(
  data: Uint8Array,
  anchors: number[],
  avatarIndices: number[],
): AvatarRoundState {
  data.fill(0)

  anchors.forEach((anchor, selectionIndex) => {
    const avatarIndex = avatarIndices[selectionIndex]
    const atlasColumn = avatarIndex % AVATAR_ATLAS_COLUMNS
    const atlasRow = Math.floor(avatarIndex / AVATAR_ATLAS_COLUMNS)
    const atlasColumnByte = Math.round(
      ((atlasColumn + 0.5) / AVATAR_ATLAS_COLUMNS) * 255,
    )
    const atlasRowByte = Math.round(
      ((atlasRow + 0.5) / AVATAR_ATLAS_ROWS) * 255,
    )
    const phaseByte = randomInteger(0, 255)
    const frequencyByte = randomInteger(1, 255)

    for (let rowOffset = 0; rowOffset < AVATAR_BLOCK_SIZE; rowOffset += 1) {
      for (
        let columnOffset = 0;
        columnOffset < AVATAR_BLOCK_SIZE;
        columnOffset += 1
      ) {
        const unit = anchor + rowOffset * MOTIF_COLUMNS + columnOffset
        const offset = unit * 4
        data[offset] = atlasColumnByte
        data[offset + 1] = atlasRowByte
        data[offset + 2] = phaseByte
        data[offset + 3] = frequencyByte
      }
    }
  })

  return { anchors, avatarIndices }
}

function createMotifStateData() {
  const data = new Uint8Array(MOTIF_COLUMNS * MOTIF_ROWS * 4)
  for (let unit = 0; unit < MOTIF_COLUMNS * MOTIF_ROWS; unit += 1) {
    const offset = unit * 4
    data[offset] = 255
    data[offset + 1] = 255
  }
  return data
}

function writeMotifSelection(data: Uint8Array, selection: number[]) {
  for (let unit = 0; unit < MOTIF_COLUMNS * MOTIF_ROWS; unit += 1) {
    const offset = unit * 4
    data[offset] = 255
    data[offset + 1] = 255
    data[offset + 2] = 0
    data[offset + 3] = 0
  }

  const minimumByte = Math.ceil(MOTIF_OPACITY_MIN * 255)
  const lowMaximumByte = Math.floor(MOTIF_LOW_OPACITY_MAX * 255)
  const highMinimumByte = Math.ceil(MOTIF_HIGH_OPACITY_MIN * 255)
  const maximumByte = Math.floor(MOTIF_OPACITY_MAX * 255)

  selection.forEach((unit) => {
    const offset = unit * 4
    const lowByte = randomInteger(minimumByte, lowMaximumByte)
    const highByte = randomInteger(highMinimumByte, maximumByte)
    const phaseByte = randomInteger(0, 255)
    const frequencyByte = randomInteger(1, 255)
    data[offset] = lowByte
    data[offset + 1] = highByte
    data[offset + 2] = phaseByte
    data[offset + 3] = frequencyByte
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function smootherstep(value: number) {
  const t = clamp(value, 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function getLetterMaskPreset(mode: ActiveLetterMode) {
  return mode <= 2
    ? CLASSIC_MASK_PRESET
    : EXPERIMENT_MASK_PRESETS[mode as ExperimentLetterMode]
}

function getActiveLetterSequence(_mode: SequenceMode) {
  return LETTER_SEQUENCE
}

function getLetterSequenceTiming(_mode: SequenceMode) {
  return LETTER_TIMING
}

function getLetterSequenceState(
  elapsed: number,
  sequenceMode: SequenceMode,
): LetterSequenceState {
  const sequence = getActiveLetterSequence(sequenceMode)
  const timing = getLetterSequenceTiming(sequenceMode)
  const firstEntry = sequence[0]

  if (elapsed < timing.initialDelay) {
    return {
      mode: 0,
      phase: 'initial-random',
      blend: 0,
      phaseElapsed: elapsed,
      activeWord: null,
      nextWord: firstEntry.word,
    }
  }

  const elapsedAfterDelay = elapsed - timing.initialDelay
  const cycleIndex = Math.floor(elapsedAfterDelay / timing.interval)
  const cycleElapsed = elapsedAfterDelay % timing.interval
  const scheduledEntry = sequence[cycleIndex % sequence.length]
  const nextEntry = sequence[(cycleIndex + 1) % sequence.length]
  const isLetterVisible = cycleElapsed < timing.visibleDuration

  if (!isLetterVisible) {
    return {
      mode: 0,
      phase: 'random',
      blend: 0,
      phaseElapsed: cycleElapsed - timing.visibleDuration,
      activeWord: null,
      nextWord: nextEntry.word,
    }
  }

  const fadeIn = smootherstep(cycleElapsed / timing.easeInDuration)
  const fadeOut =
    1 -
    smootherstep(
      (cycleElapsed - (timing.visibleDuration - timing.easeOutDuration)) /
        timing.easeOutDuration,
    )

  return {
    mode: scheduledEntry.mode,
    phase: scheduledEntry.word,
    blend: Math.min(fadeIn, fadeOut),
    phaseElapsed: cycleElapsed,
    activeWord: scheduledEntry.word,
    nextWord: nextEntry.word,
  }
}

function makeSmoothRandomValue(
  initial: number,
  min: number,
  max: number,
  maxStep: number,
): SmoothRandomValue {
  return {
    current: initial,
    from: initial,
    target: clamp(initial + randomBetween(-maxStep, maxStep), min, max),
    elapsed: 0,
    duration: randomBetween(MIN_RANDOM_DURATION, MAX_RANDOM_DURATION),
    min,
    max,
    maxStep,
  }
}

function advanceSmoothRandomValue(value: SmoothRandomValue, deltaSeconds: number) {
  value.elapsed += deltaSeconds
  const progress = clamp(value.elapsed / value.duration, 0, 1)
  const eased = smootherstep(progress)
  value.current = value.from + (value.target - value.from) * eased

  if (progress >= 1) {
    value.from = value.target
    value.target = clamp(
      value.target + randomBetween(-value.maxStep, value.maxStep),
      value.min,
      value.max,
    )
    value.elapsed = 0
    value.duration = randomBetween(MIN_RANDOM_DURATION, MAX_RANDOM_DURATION)
  }

  return value.current
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ]
}

function drawMaskText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth?: number,
) {
  if (maxWidth === undefined) {
    context.strokeText(text, x, y)
    context.fillText(text, x, y)
    return
  }

  context.strokeText(text, x, y, maxWidth)
  context.fillText(text, x, y, maxWidth)
}

function drawExperimentI(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scaleX: number,
) {
  // Dimensions are authored in final atlas pixels. Dividing the horizontal
  // values by scaleX keeps both love phrases on the same portrait grid even
  // though their base text compression differs slightly.
  const barWidth = EXPERIMENT_I_BAR_WIDTH / scaleX
  const stemWidth = EXPERIMENT_I_STEM_WIDTH / scaleX
  const adjustedCenterY = centerY + EXPERIMENT_I_VERTICAL_OFFSET
  const top = adjustedCenterY - EXPERIMENT_I_HEIGHT / 2
  const bottomBarTop =
    adjustedCenterY + EXPERIMENT_I_HEIGHT / 2 - EXPERIMENT_I_BAR_HEIGHT

  context.fillRect(
    centerX - barWidth / 2,
    top,
    barWidth,
    EXPERIMENT_I_BAR_HEIGHT,
  )
  context.fillRect(
    centerX - stemWidth / 2,
    top + EXPERIMENT_I_BAR_HEIGHT,
    stemWidth,
    EXPERIMENT_I_HEIGHT - EXPERIMENT_I_BAR_HEIGHT * 2,
  )
  context.fillRect(
    centerX - barWidth / 2,
    bottomBarTop,
    barWidth,
    EXPERIMENT_I_BAR_HEIGHT,
  )
}

function drawExperimentHeart(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scaleX: number,
) {
  // A smooth font/path heart can still pick up an extra portrait on one side
  // as the rigid motif grid drifts. These authored bands sit between the
  // 6144px wall's sample rows and mirror around a half-pixel atlas axis, so the
  // visible eight-row portrait heart stays symmetric throughout that drift.
  const cellWidth = EXPERIMENT_HEART_CELL_WIDTH / scaleX
  const top =
    centerY +
    EXPERIMENT_HEART_VERTICAL_OFFSET -
    EXPERIMENT_HEART_HEIGHT / 2
  const row = [
    0,
    32.2459,
    83.6856,
    135.1253,
    186.5651,
    238.0048,
    289.4445,
    340.8842,
    EXPERIMENT_HEART_HEIGHT,
  ]
  const fillColumns = (
    firstColumn: number,
    lastColumn: number,
    rowTop: number,
    rowBottom: number,
  ) => {
    context.fillRect(
      centerX + (firstColumn - 0.5) * cellWidth,
      top + rowTop,
      (lastColumn - firstColumn + 1) * cellWidth,
      rowBottom - rowTop,
    )
  }

  fillColumns(-2, -1, row[0], row[1])
  fillColumns(1, 2, row[0], row[1])
  fillColumns(-4, -1, row[1], row[2])
  fillColumns(1, 4, row[1], row[2])
  fillColumns(-4, 4, row[2], row[4])
  fillColumns(-3, 3, row[4], row[5])
  fillColumns(-2, 2, row[5], row[6])
  fillColumns(-1, 1, row[6], row[7])
  fillColumns(0, 0, row[7], row[8])
}

function drawTrackedExperimentWord(
  context: CanvasRenderingContext2D,
  entry: LetterSequenceEntry,
  centerY: number,
  preset: LetterMaskPreset,
) {
  if (entry.mode < 3) return false
  const layout =
    EXPERIMENT_TRACKING_LAYOUTS[entry.mode as ExperimentLetterMode]

  const fullWidth = context.measureText(entry.word).width
  const scaleX = Math.min(1, preset.maxWidth / Math.max(fullWidth, 1))
  const trackingTotal = layout.tracking.reduce(
    (total, tracking) => total + tracking,
    0,
  )
  const expandedWidth = fullWidth + trackingTotal / scaleX
  let appliedTracking = 0

  context.save()
  context.translate(LETTER_MASK_WIDTH / 2, 0)
  context.scale(scaleX, 1)
  context.textAlign = 'left'
  context.letterSpacing = '0px'

  const startX = -expandedWidth / 2
  if (layout.prefix) {
    const iWidth = context.measureText('I').width
    // Both love phrases share the nominal center of the 6144px portrait grid.
    // Keeping the suffix advances font-authored but snapping only the visible
    // heart prevents the two love phrases from sampling opposite sides of the same curve.
    const heartCenterX =
      (EXPERIMENT_HEART_ATLAS_CENTER_X - LETTER_MASK_WIDTH / 2) / scaleX
    drawExperimentI(context, startX + iWidth / 2, centerY, scaleX)
    drawExperimentHeart(context, heartCenterX, centerY, scaleX)
  }

  Array.from(layout.glyphs).forEach((glyph, index) => {
    // Measuring each shaped substring preserves the font's existing kerning;
    // only the declared glyph boundaries receive additional atlas spacing.
    const shapedPrefix = `${layout.prefix}${layout.glyphs.slice(0, index + 1)}`
    const glyphX =
      startX +
      context.measureText(shapedPrefix).width -
      context.measureText(glyph).width +
      appliedTracking / scaleX
    drawMaskText(context, glyph, glyphX, centerY)
    appliedTracking += layout.tracking[index] ?? 0
  })

  context.restore()
  return true
}

function drawLetterMask(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) return false

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fontKerning = 'normal'
  context.lineJoin = 'round'
  context.miterLimit = 2
  context.strokeStyle = '#ffffff'

  LETTER_MASK_WORDS.forEach((entry, index) => {
    const centerY =
      (index + 0.5) * LETTER_MASK_ROW_HEIGHT +
      LETTER_MASK_VISUAL_CENTER_OFFSET
    const preset = getLetterMaskPreset(entry.mode)

    context.save()
    context.beginPath()
    context.rect(
      0,
      index * LETTER_MASK_ROW_HEIGHT,
      LETTER_MASK_WIDTH,
      LETTER_MASK_ROW_HEIGHT,
    )
    context.clip()
    context.font = `900 ${preset.fontSize}px ${LETTER_FONT_STACK}`
    context.lineWidth = preset.strokeWidth
    context.letterSpacing = `${preset.letterSpacing}px`

    if (!drawTrackedExperimentWord(context, entry, centerY, preset)) {
      drawMaskText(
        context,
        entry.word,
        LETTER_MASK_WIDTH / 2,
        centerY,
        preset.maxWidth,
      )
    }
    context.restore()
  })
  return true
}

function createLetterMaskCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = LETTER_MASK_WIDTH
  canvas.height = LETTER_MASK_HEIGHT
  drawLetterMask(canvas)
  return canvas
}

function getRenderDpr(width: number, height: number) {
  const deviceDpr = window.devicePixelRatio || 1
  const pixelBudgetDpr = Math.sqrt(MAX_RENDER_PIXELS / Math.max(width * height, 1))
  return Math.min(deviceDpr, MAX_DEVICE_PIXEL_RATIO, pixelBudgetDpr)
}

export function TextureStage({
  reducedMotion,
  sequenceMode,
}: TextureStageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sequenceModeRef = useRef(sequenceMode)
  const [rendererVersion, setRendererVersion] = useState(0)
  const [assetFailed, setAssetFailed] = useState(false)
  const [rendererState, setRendererState] = useState<'loading' | 'ready' | 'fallback'>(
    reducedMotion ? 'fallback' : 'loading',
  )

  useEffect(() => {
    sequenceModeRef.current = sequenceMode
  }, [sequenceMode])

  useEffect(() => {
    const host = hostRef.current
    if (!host || reducedMotion || assetFailed) {
      setRendererState('fallback')
      return
    }

    setRendererState('loading')

    let renderer: Renderer
    try {
      renderer = new Renderer({
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
        dpr: 1,
      })
    } catch {
      setRendererState('fallback')
      return
    }

    const gl = renderer.gl
    if (!gl) {
      setRendererState('fallback')
      return
    }

    gl.canvas.className = 'texture-canvas'
    gl.canvas.setAttribute('aria-hidden', 'true')
    host.appendChild(gl.canvas)

    const texture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      premultiplyAlpha: false,
    })
    const unitMapTexture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      premultiplyAlpha: false,
    })
    const letterMaskCanvas = createLetterMaskCanvas()
    const letterMaskTexture = new Texture(gl, {
      image: letterMaskCanvas,
      width: LETTER_MASK_WIDTH,
      height: LETTER_MASK_HEIGHT,
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      flipY: false,
      premultiplyAlpha: false,
    })
    letterMaskTexture.needsUpdate = true
    const avatarMapTexture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      // Keep the authored top row at atlas row 0 so the face-only prefix can be
      // addressed directly by the runtime state and deterministic word hash.
      flipY: false,
      premultiplyAlpha: false,
    })
    const avatarStateData = createAvatarStateData()
    let avatarQueue = shuffled(ALL_AVATAR_INDICES)
    let avatarQueueIndex = 0
    const takeAvatarBatch = () => {
      const batch: number[] = []
      while (batch.length < ACTIVE_AVATAR_COUNT) {
        if (avatarQueueIndex >= avatarQueue.length) {
          avatarQueue = shuffled(ALL_AVATAR_INDICES)
          avatarQueueIndex = 0
        }
        batch.push(avatarQueue[avatarQueueIndex])
        avatarQueueIndex += 1
      }
      return batch
    }
    let avatarRoundState = writeAvatarRound(
      avatarStateData,
      selectAvatarAnchors(new Set()),
      takeAvatarBatch(),
    )
    const avatarStateTexture = new Texture(gl, {
      image: avatarStateData,
      width: MOTIF_COLUMNS,
      height: MOTIF_ROWS,
      generateMipmaps: false,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      flipY: false,
      premultiplyAlpha: false,
    })
    const wordAvatarStateData = createAvatarStateData()
    const wordAvatarOrder = shuffled(ALL_AVATAR_INDICES)
    let wordAvatarCursor = 0
    writeWordAvatarAssignments(
      wordAvatarStateData,
      wordAvatarOrder,
      wordAvatarCursor,
    )
    const wordAvatarStateTexture = new Texture(gl, {
      image: wordAvatarStateData,
      width: MOTIF_COLUMNS,
      height: MOTIF_ROWS,
      generateMipmaps: false,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      flipY: false,
      premultiplyAlpha: false,
    })
    const motifStateData = createMotifStateData()
    let motifSelection = selectMotifUnits(new Set())
    writeMotifSelection(motifStateData, motifSelection)
    const motifStateTexture = new Texture(gl, {
      image: motifStateData,
      width: MOTIF_COLUMNS,
      height: MOTIF_ROWS,
      generateMipmaps: false,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      flipY: false,
      premultiplyAlpha: false,
    })

    const activePalettes = palettes
    let paletteFromIndex = 0
    let paletteToIndex = 1
    let paletteDuration = randomBetween(112, 152)
    let paletteElapsed = paletteDuration * 0.18
    let driftPhase = 0
    let breathPhase = 0
    let colorPhase = 0
    let motifElapsed = 0
    let motifAnimationTime = 0
    let activeSequenceMode = sequenceModeRef.current
    let letterSequenceElapsed =
      activeSequenceMode === 'ambient'
        ? 0
        : getLetterSequenceTiming(activeSequenceMode).initialDelay
    let letterSequenceState = AMBIENT_LETTER_SEQUENCE_STATE
    let letterAvatarGeneration = 0
    let letterAvatarSeed = randomBetween(1, 4096)
    let motifDuration = randomBetween(
      MOTIF_ROUND_MIN_DURATION,
      MOTIF_ROUND_MAX_DURATION,
    )
    const flowRate = makeSmoothRandomValue(0.029, 0.015, 0.045, 0.012)
    const breathRate = makeSmoothRandomValue(0.053, 0.035, 0.07, 0.013)
    const breathDepth = makeSmoothRandomValue(0.04, 0.025, 0.055, 0.009)

    const fromPalette = activePalettes[paletteFromIndex]
    const toPalette = activePalettes[paletteToIndex]
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: false,
      cullFace: false,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tMap: { value: texture },
        tUnitMap: { value: unitMapTexture },
        tUnitState: { value: motifStateTexture },
        tLetterMap: { value: letterMaskTexture },
        tAvatarMap: { value: avatarMapTexture },
        tAvatarState: { value: avatarStateTexture },
        tWordAvatarState: { value: wordAvatarStateTexture },
        uResolution: { value: [window.innerWidth, window.innerHeight] },
        uDriftPhase: { value: driftPhase },
        uBreathPhase: { value: breathPhase },
        uBreathDepth: { value: breathDepth.current },
        uColorPhase: { value: colorPhase },
        uPaletteProgress: { value: paletteElapsed / paletteDuration },
        uBackgroundFrom: { value: hexToRgb(fromPalette.background) },
        uBackgroundTo: { value: hexToRgb(toPalette.background) },
        uTextureFrom: { value: hexToRgb(fromPalette.texture) },
        uTextureTo: { value: hexToRgb(toPalette.texture) },
        uUnitProgress: { value: 0 },
        uUnitTime: { value: 0 },
        uUnitEffectEnabled: { value: 0 },
        uLetterMode: { value: letterSequenceState.mode },
        uLetterBlend: { value: letterSequenceState.blend },
        uLetterSeed: { value: letterAvatarSeed },
        uAvatarEffectEnabled: { value: 0 },
      },
    })
    const geometry = new Triangle(gl)
    const mesh = new Mesh(gl, { geometry, program })

    let previousTime = performance.now()
    let rafId = 0
    let disposed = false
    let textureReady = false
    let unitMapReady = false
    let avatarMapReady = false
    let contextLost = false

    void document.fonts
      .load(
        `900 ${LETTER_FONT_SIZE}px "Growth Noto Sans"`,
        LETTER_MASK_WORDS.map((entry) => entry.word).join(''),
      )
      .then((fontFaces) => {
        if (disposed || fontFaces.length === 0) return
        drawLetterMask(letterMaskCanvas)
        letterMaskTexture.needsUpdate = true
      })
      .catch(() => undefined)

    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      renderer.dpr = getRenderDpr(width, height)
      renderer.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
      program.uniforms.uResolution.value = [width, height]
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    const renderFrame = (now: number) => {
      rafId = 0
      if (disposed) return

      const realDeltaSeconds = Math.max((now - previousTime) / 1000, 0)
      const deltaSeconds = Math.min(realDeltaSeconds, 0.05)
      previousTime = now

      const currentFlowRate = advanceSmoothRandomValue(flowRate, deltaSeconds)
      const currentBreathRate = advanceSmoothRandomValue(breathRate, deltaSeconds)
      const currentBreathDepth = advanceSmoothRandomValue(breathDepth, deltaSeconds)
      driftPhase += deltaSeconds * currentFlowRate
      breathPhase += deltaSeconds * currentBreathRate
      colorPhase += deltaSeconds * (0.018 + currentFlowRate * 0.42)
      paletteElapsed += deltaSeconds
      motifElapsed += deltaSeconds
      motifAnimationTime += deltaSeconds
      // Do not start the word clock until both maps required by a portrait
      // letter are available. Otherwise a fast ID-map load and a slower avatar
      // atlas load can spend part of the first visible word phase blank.
      const requestedSequenceMode = sequenceModeRef.current
      if (requestedSequenceMode !== activeSequenceMode) {
        activeSequenceMode = requestedSequenceMode
        letterSequenceElapsed =
          activeSequenceMode === 'ambient'
            ? 0
            : getLetterSequenceTiming(activeSequenceMode).initialDelay
        letterSequenceState = AMBIENT_LETTER_SEQUENCE_STATE
      }

      if (
        activeSequenceMode !== 'ambient' &&
        unitMapReady &&
        avatarMapReady
      ) {
        letterSequenceElapsed += deltaSeconds
        const nextLetterSequenceState = getLetterSequenceState(
          letterSequenceElapsed,
          activeSequenceMode,
        )
        if (
          nextLetterSequenceState.mode !== 0 &&
          nextLetterSequenceState.mode !== letterSequenceState.mode
        ) {
          if (letterAvatarGeneration > 0) {
            wordAvatarCursor =
              (wordAvatarCursor + WORD_AVATAR_CURSOR_STEP) %
              wordAvatarOrder.length
          }
          writeWordAvatarAssignments(
            wordAvatarStateData,
            wordAvatarOrder,
            wordAvatarCursor,
          )
          wordAvatarStateTexture.needsUpdate = true
          letterAvatarGeneration += 1
          letterAvatarSeed = randomBetween(1, 4096)
          program.uniforms.uLetterSeed.value = letterAvatarSeed
        }
        letterSequenceState = nextLetterSequenceState
      } else if (activeSequenceMode === 'ambient') {
        letterSequenceState = AMBIENT_LETTER_SEQUENCE_STATE
      }

      if (paletteElapsed >= paletteDuration) {
        paletteFromIndex = paletteToIndex
        paletteToIndex = (paletteToIndex + 1) % activePalettes.length
        paletteElapsed = 0
        paletteDuration = randomBetween(112, 152)
        program.uniforms.uBackgroundFrom.value = hexToRgb(
          activePalettes[paletteFromIndex].background,
        )
        program.uniforms.uBackgroundTo.value = hexToRgb(
          activePalettes[paletteToIndex].background,
        )
        program.uniforms.uTextureFrom.value = hexToRgb(
          activePalettes[paletteFromIndex].texture,
        )
        program.uniforms.uTextureTo.value = hexToRgb(
          activePalettes[paletteToIndex].texture,
        )
      }

      if (motifElapsed >= motifDuration) {
        motifSelection = selectMotifUnits(new Set(motifSelection))
        writeMotifSelection(motifStateData, motifSelection)
        motifStateTexture.needsUpdate = true
        avatarRoundState = writeAvatarRound(
          avatarStateData,
          selectAvatarAnchors(new Set(avatarRoundState.anchors)),
          takeAvatarBatch(),
        )
        avatarStateTexture.needsUpdate = true
        motifElapsed = 0
        motifDuration = randomBetween(
          MOTIF_ROUND_MIN_DURATION,
          MOTIF_ROUND_MAX_DURATION,
        )
      }

      program.uniforms.uDriftPhase.value = driftPhase
      program.uniforms.uBreathPhase.value = breathPhase
      program.uniforms.uBreathDepth.value = currentBreathDepth
      program.uniforms.uColorPhase.value = colorPhase
      program.uniforms.uPaletteProgress.value = paletteElapsed / paletteDuration
      program.uniforms.uUnitProgress.value = motifElapsed / motifDuration
      program.uniforms.uUnitTime.value = motifAnimationTime
      program.uniforms.uLetterMode.value = letterSequenceState.mode
      program.uniforms.uLetterBlend.value = letterSequenceState.blend
      renderer.render({ scene: mesh })

      rafId = requestAnimationFrame(renderFrame)
    }

    const start = () => {
      if (rafId || disposed || document.hidden || !textureReady || contextLost) return
      previousTime = performance.now()
      rafId = requestAnimationFrame(renderFrame)
    }
    const stop = () => {
      if (!rafId) return
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    const handleVisibilityChange = () => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      contextLost = true
      stop()
      setRendererState('fallback')
    }
    const handleContextRestored = () => {
      if (disposed) return
      contextLost = false
      setRendererVersion((version) => version + 1)
    }
    gl.canvas.addEventListener('webglcontextlost', handleContextLost)
    gl.canvas.addEventListener('webglcontextrestored', handleContextRestored)

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => {
      if (disposed) return
      texture.image = image
      texture.needsUpdate = true
      textureReady = true
      setRendererState('ready')
      start()
    }
    image.onerror = () => {
      if (disposed) return
      setRendererState('fallback')
      setAssetFailed(true)
    }
    image.src = `${import.meta.env.BASE_URL}assets/pattern-texture.svg`

    const unitMapImage = new Image()
    unitMapImage.crossOrigin = 'anonymous'
    unitMapImage.decoding = 'async'
    unitMapImage.onload = () => {
      if (disposed) return
      unitMapTexture.image = unitMapImage
      unitMapTexture.needsUpdate = true
      unitMapReady = true
      program.uniforms.uUnitEffectEnabled.value = 1
    }
    unitMapImage.onerror = () => {
      if (disposed) return
      unitMapReady = false
      program.uniforms.uUnitEffectEnabled.value = 0
    }
    unitMapImage.src = `${import.meta.env.BASE_URL}assets/motif-unit-id.svg`

    const avatarMapImage = new Image()
    avatarMapImage.crossOrigin = 'anonymous'
    avatarMapImage.decoding = 'async'
    avatarMapImage.onload = () => {
      if (disposed) return
      avatarMapTexture.image = avatarMapImage
      avatarMapTexture.needsUpdate = true
      avatarMapReady = true
      program.uniforms.uAvatarEffectEnabled.value = 1
    }
    avatarMapImage.onerror = () => {
      if (disposed) return
      avatarMapReady = false
      program.uniforms.uAvatarEffectEnabled.value = 0
    }
    avatarMapImage.src = AVATAR_MAP_SOURCE

    return () => {
      disposed = true
      stop()
      image.onload = null
      image.onerror = null
      unitMapImage.onload = null
      unitMapImage.onerror = null
      avatarMapImage.onload = null
      avatarMapImage.onerror = null
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      gl.canvas.removeEventListener('webglcontextlost', handleContextLost)
      gl.canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      if (!contextLost) {
        geometry.remove()
        program.remove()
        gl.deleteTexture(texture.texture)
        gl.deleteTexture(unitMapTexture.texture)
        gl.deleteTexture(motifStateTexture.texture)
        gl.deleteTexture(letterMaskTexture.texture)
        gl.deleteTexture(avatarMapTexture.texture)
        gl.deleteTexture(avatarStateTexture.texture)
        gl.deleteTexture(wordAvatarStateTexture.texture)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }
      gl.canvas.remove()
    }
  }, [assetFailed, reducedMotion, rendererVersion])

  const fallbackStyle = {
    '--fallback-background': firstPalette.background,
    '--fallback-texture': firstPalette.texture,
    '--motif-scale': `${MOTIF_VISUAL_SCALE * 100}%`,
  } as CSSProperties

  return (
    <div
      className="texture-stage"
      style={fallbackStyle}
      data-renderer={rendererState}
      aria-hidden="true"
    >
      <div className="static-background" />
      <div className="texture-fallback" />
      <div ref={hostRef} className="webgl-host" />
    </div>
  )
}
