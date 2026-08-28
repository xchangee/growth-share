import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_SEED = 'open-creative-wall-public-v2'
// Preserve the reviewed v2 dataset while exposing the new public project name.
const DEFAULT_PROFILE_RANDOM_STATE = 0x1db6f429
const PROFILE_COUNT = 674
const DAY_COUNT_MIN = 90
const DAY_COUNT_MAX = 8600

const surnames = [
  '张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴',
  '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
  '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
  '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕',
  '苏', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛', '叶', '阎',
  '余', '潘', '杜', '戴', '夏', '钟', '汪', '田', '任', '姜',
  '范', '方', '石', '姚', '谭', '廖', '邹', '熊', '金', '陆',
  '郝', '孔', '白', '崔', '康', '毛', '邱', '秦', '江', '史',
  '顾', '侯', '邵', '孟', '龙', '万', '段', '雷', '钱', '汤',
  '尹', '黎', '易', '常', '武', '乔', '贺', '赖', '龚', '文',
]

const givenNames = [
  '娜娜', '逍遥', '子涵', '若溪', '思远', '嘉怡', '宇航', '欣妍',
  '浩然', '雨桐', '梓轩', '诗涵', '俊杰', '佳琪', '天佑', '梦瑶',
  '明轩', '可欣', '博文', '雅婷', '志远', '思琪', '晨曦', '雨辰',
  '若琳', '皓轩', '嘉豪', '心怡', '语桐', '奕辰', '佳怡', '梓涵',
  '睿哲', '一诺', '星宇', '思涵', '嘉悦', '子墨', '安然', '晓彤',
  '俊熙', '若曦', '锦程', '静怡', '文轩', '乐瑶', '思源', '雨萱',
  '浩宇', '依然', '景行', '清妍', '致远', '舒雅', '嘉言', '予安',
  '沐阳', '若安', '知夏', '望舒', '云舟', '南星', '初晴', '书宁',
  '星然', '悠然', '嘉树', '亦航', '景澄', '清越', '言希', '念安',
  '晚晴', '秋实', '知远', '云舒', '向晨', '悦宁', '景明', '心语',
  '明哲', '宁远', '书瑶', '若羽', '夏川', '青禾', '子衿', '安歌',
  '云岚', '清和', '知微', '若水', '泽言', '嘉禾', '清扬', '望月',
  '云帆', '思齐', '景舟', '亦安', '乐川', '澄心', '新月', '佳宁',
  '安琪', '雅雯', '凯文', '晓宇', '明月', '嘉诚', '雨晴', '梓晴',
  '梦琪', '欣怡', '晓晨', '启航', '瑞雪', '思雨', '佳航', '雅宁',
]

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..')
const profileOutputPath = join(
  projectRoot,
  'src/data/syntheticProfiles.generated.ts',
)

function parseSeed(arguments_) {
  let seed = DEFAULT_SEED

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]

    if (argument === '--help' || argument === '-h') {
      process.stdout.write(
        'Usage: node scripts/generate-synthetic-data.mjs [--seed <value>]\n',
      )
      return null
    }

    if (argument === '--seed') {
      const value = arguments_[index + 1]
      if (!value) throw new Error('--seed requires a non-empty value')
      seed = value
      index += 1
      continue
    }

    if (argument.startsWith('--seed=')) {
      const value = argument.slice('--seed='.length)
      if (!value) throw new Error('--seed requires a non-empty value')
      seed = value
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  return seed
}

function hashSeed(value) {
  let hash = 2166136261

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function mulberry32(seed) {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function randomInteger(random, minimum, maximum) {
  return minimum + Math.floor(random() * (maximum - minimum + 1))
}

function shuffled(values, random) {
  const result = [...values]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInteger(random, 0, index)
    const current = result[index]
    result[index] = result[randomIndex]
    result[randomIndex] = current
  }

  return result
}

function createProfiles(seed) {
  const randomState = seed === DEFAULT_SEED
    ? DEFAULT_PROFILE_RANDOM_STATE
    : hashSeed(`${seed}\0profiles`)
  const random = mulberry32(randomState)
  const namePool = surnames.flatMap((surname) =>
    givenNames.map((givenName) => `${surname}${givenName}`),
  )
  const displayNames = shuffled(namePool, random).slice(0, PROFILE_COUNT)

  return Array.from({ length: PROFILE_COUNT }, (_, index) => ({
    profileId: `profile-${String(index + 1).padStart(4, '0')}`,
    displayName: displayNames[index],
    dayCount: randomInteger(random, DAY_COUNT_MIN, DAY_COUNT_MAX),
  }))
}

function validateProfiles(profiles) {
  if (profiles.length !== PROFILE_COUNT) {
    throw new Error(`Expected ${PROFILE_COUNT} profiles, received ${profiles.length}`)
  }

  const profileIds = new Set(profiles.map(({ profileId }) => profileId))
  const displayNames = new Set(profiles.map(({ displayName }) => displayName))

  if (profileIds.size !== PROFILE_COUNT) throw new Error('Profile IDs are not unique')
  if (displayNames.size !== PROFILE_COUNT) throw new Error('Display names are not unique')

  profiles.forEach((profile, index) => {
    const expectedId = `profile-${String(index + 1).padStart(4, '0')}`
    if (profile.profileId !== expectedId) {
      throw new Error(`Unexpected synthetic profile ID: ${profile.profileId}`)
    }
    if (!/^[\u3400-\u9fff]{3}$/.test(profile.displayName)) {
      throw new Error(`Display name is not a natural three-character Chinese name: ${profile.displayName}`)
    }
    if (
      !Number.isInteger(profile.dayCount) ||
      profile.dayCount < DAY_COUNT_MIN ||
      profile.dayCount > DAY_COUNT_MAX
    ) {
      throw new Error(`Invalid day count for ${profile.profileId}`)
    }
  })
}

function createProfileModule(seed, profiles) {
  const rows = profiles.map((profile) => `  ${JSON.stringify(profile)},`)

  return [
    '// Fictional public-demo profiles generated by scripts/generate-synthetic-data.mjs.',
    '// Names are random combinations of common Chinese name parts and are not linked to real people.',
    '// Do not hand-edit generated values.',
    '',
    'export type SyntheticProfile = {',
    '  profileId: string',
    '  displayName: string',
    '  dayCount: number',
    '}',
    '',
    `export const syntheticProfileSeed = ${JSON.stringify(seed)}`,
    '',
    'export const syntheticProfiles: readonly SyntheticProfile[] = [',
    ...rows,
    ']',
    '',
    'export const syntheticProfileIds = syntheticProfiles.map(({ profileId }) => profileId)',
    '',
  ].join('\n')
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function atomicWrite(path, data) {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.tmp-${process.pid}`

  try {
    await writeFile(temporaryPath, data)
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

async function generate(seed) {
  const profiles = createProfiles(seed)
  validateProfiles(profiles)
  const profileModule = createProfileModule(seed, profiles)
  await atomicWrite(profileOutputPath, profileModule)
  const written = await readFile(profileOutputPath)

  return {
    seed,
    profileCount: profiles.length,
    profileModuleSha256: sha256(written),
    sample: {
      first: profiles[0],
      second: profiles[1],
      last: profiles.at(-1),
    },
  }
}

const seed = parseSeed(process.argv.slice(2))

if (seed !== null) {
  const result = await generate(seed)
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}
