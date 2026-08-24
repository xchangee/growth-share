import { spawnSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..')
const publicDirectory = join(projectRoot, 'public')

const expectedPublicFiles = new Set([
  'assets/avatar-atlas.png',
  'assets/motif-unit-id.svg',
  'assets/open-memory-symbol.svg',
  'assets/paper-grain.svg',
  'assets/pattern-texture.svg',
  'favicon.svg',
])

const forbiddenFilePatterns = [
  /business-forum/i,
  /background-music/i,
  /noto-sans/i,
  /\.(?:mp3|m4a|ogg|wav|ttf|otf|woff2?)$/i,
]

const forbiddenRuntimeStrings = [
  '好未来',
  '业务论坛',
  '爱与科技助力终身成长',
  'BUSINESS FORUM',
  '23RD ANNIVERSARY',
  'TAL / XES',
  'I ❤ TAL',
  'I ❤ XES',
]

async function listFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(path))
    else if (entry.isFile()) files.push(path)
    else throw new Error(`Unexpected non-file public entry: ${path}`)
  }
  return files
}

async function listRuntimeTextFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listRuntimeTextFiles(path))
    else if (/\.(?:css|html|js|jsx|mjs|ts|tsx|svg)$/.test(entry.name)) files.push(path)
  }
  return files
}

function validateGeneratedTextures() {
  const result = spawnSync(
    process.execPath,
    [join(scriptDirectory, 'generate-demo-textures.mjs'), '--check'],
    { cwd: projectRoot, encoding: 'utf8' },
  )
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'texture check failed').trim())
  }
  return result.stdout.trim()
}

async function main() {
  const publicFiles = await listFiles(publicDirectory)
  const relativePublicFiles = publicFiles
    .map((path) => relative(publicDirectory, path))
    .sort()

  const missing = [...expectedPublicFiles].filter(
    (path) => !relativePublicFiles.includes(path),
  )
  const unexpected = relativePublicFiles.filter(
    (path) => !expectedPublicFiles.has(path),
  )
  if (missing.length || unexpected.length) {
    throw new Error(
      `Public asset allowlist mismatch; missing=${missing.join(', ') || 'none'}; `
      + `unexpected=${unexpected.join(', ') || 'none'}`,
    )
  }

  const forbiddenFiles = relativePublicFiles.filter((path) =>
    forbiddenFilePatterns.some((pattern) => pattern.test(path)))
  if (forbiddenFiles.length) {
    throw new Error(`Forbidden public media remains: ${forbiddenFiles.join(', ')}`)
  }

  const runtimeTextFiles = [
    join(projectRoot, 'index.html'),
    ...await listRuntimeTextFiles(join(projectRoot, 'src')),
    ...publicFiles.filter((path) => /\.(?:html|js|mjs|svg)$/.test(path)),
  ]
  const leakedStrings = []
  for (const path of runtimeTextFiles) {
    const content = await readFile(path, 'utf8')
    for (const value of forbiddenRuntimeStrings) {
      if (content.includes(value)) leakedStrings.push(`${relative(projectRoot, path)}: ${value}`)
    }
  }
  if (leakedStrings.length) {
    throw new Error(`Legacy brand or event strings remain:\n${leakedStrings.join('\n')}`)
  }

  const siteConfig = await readFile(join(projectRoot, 'src/config/site.ts'), 'utf8')
  if (!/source:\s*null\s+as\s+string\s*\|\s*null/.test(siteConfig)) {
    throw new Error('Public template must keep bundled music disabled by default')
  }

  const generatedResult = validateGeneratedTextures()
  process.stdout.write(
    `${JSON.stringify({ publicFiles: relativePublicFiles.length, generatedResult }, null, 2)}\n`,
  )
}

await main()
