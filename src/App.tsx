import { useEffect, useEffectEvent, useRef, useState } from 'react'
import './App.css'
import { TextureStage } from './components/TextureStage'
import { ArchiveRail, WelcomeOverlay } from './components/WelcomeOverlay'
import { siteConfig } from './config/site'
import { syntheticProfileIds } from './data/syntheticProfiles.generated'

type ExperienceMode =
  | 'letters'
  | 'profile'
  | 'profile04'

const PROFILE_HOLD_DURATION = 3000

function isProfileMode(mode: ExperienceMode) {
  return mode === 'profile'
    || mode === 'profile04'
}

function isMainVisualMode(mode: ExperienceMode) {
  return mode === 'profile04'
}

function isLettersMode(mode: ExperienceMode) {
  return mode === 'letters'
}

function createShuffledProfileIds(avoidFirstId?: string) {
  const shuffled = [...syntheticProfileIds]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const currentValue = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = currentValue
  }

  if (avoidFirstId && shuffled[0] === avoidFirstId && shuffled.length > 1) {
    const replacementIndex = shuffled.findIndex(
      (profileId) => profileId !== avoidFirstId,
    )
    const firstValue = shuffled[0]
    shuffled[0] = shuffled[replacementIndex]
    shuffled[replacementIndex] = firstValue
  }

  return shuffled
}

const experienceOptions: readonly {
  mode: ExperienceMode
  number: string
  label: string
  description: string
  keyboardShortcut?: 'q' | 'w' | 'e'
}[] = siteConfig.experienceOptions

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches)

    syncPreference()
    mediaQuery.addEventListener('change', syncPreference)
    return () => mediaQuery.removeEventListener('change', syncPreference)
  }, [])

  return prefersReducedMotion
}

function App() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [experienceMode, setExperienceMode] =
    useState<ExperienceMode>('profile')
  const [profileIndex, setProfileIndex] = useState(0)
  const [profileOrder, setProfileOrder] = useState(createShuffledProfileIds)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = siteConfig.music.volume

    const syncPlayingState = () => setIsMusicPlaying(!audio.paused)
    const tryAutoplay = async () => {
      try {
        await audio.play()
      } catch {
        setIsMusicPlaying(false)
      }
    }

    audio.addEventListener('play', syncPlayingState)
    audio.addEventListener('pause', syncPlayingState)
    void tryAutoplay()

    return () => {
      audio.removeEventListener('play', syncPlayingState)
      audio.removeEventListener('pause', syncPlayingState)
    }
  }, [])

  useEffect(() => {
    if (!isProfileMode(experienceMode)) return

    const timer = window.setTimeout(() => {
      if (profileIndex === profileOrder.length - 1) {
        const previousLastId = profileOrder[profileIndex]
        setProfileOrder(createShuffledProfileIds(previousLastId))
        setProfileIndex(0)
        return
      }

      setProfileIndex((current) => current + 1)
    }, PROFILE_HOLD_DURATION)

    return () => window.clearTimeout(timer)
  }, [experienceMode, profileIndex, profileOrder])

  const toggleMusic = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      try {
        await audio.play()
      } catch {
        setIsMusicPlaying(false)
      }
      return
    }

    audio.pause()
  }

  const selectExperienceMode = (mode: ExperienceMode) => {
    const shouldResetProfileOrder =
      isProfileMode(mode) && !isProfileMode(experienceMode)

    if (shouldResetProfileOrder) {
      const previousProfileId = profileOrder[profileIndex]
      setProfileOrder(createShuffledProfileIds(previousProfileId))
      setProfileIndex(0)
    }
    setExperienceMode(mode)
  }

  const selectExperienceModeFromKeyboard = useEffectEvent(
    (event: KeyboardEvent) => {
      const target = event.target
      const isEnteringText = target instanceof HTMLElement && (
        target.isContentEditable
        || target.closest('input, textarea, select, [role="textbox"]')
      )

      if (
        event.defaultPrevented
        || event.repeat
        || event.isComposing
        || event.metaKey
        || event.ctrlKey
        || event.altKey
        || isEnteringText
      ) return

      const option = experienceOptions.find(
        ({ keyboardShortcut }) => keyboardShortcut === event.key.toLowerCase(),
      )
      if (!option) return

      event.preventDefault()
      selectExperienceMode(option.mode)
    },
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      selectExperienceModeFromKeyboard(event)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const currentProfileId = profileOrder[profileIndex]
  const isProfileExperience = isProfileMode(experienceMode)
  const isLettersExperience = isLettersMode(experienceMode)
  const profileVariant = isMainVisualMode(experienceMode) ? '04' : '03'
  const backgroundMusicSource = siteConfig.music.source
    ? `${import.meta.env.BASE_URL}${siteConfig.music.source}`
    : null

  return (
    <main
      className="texture-lab"
      data-experience-id={experienceMode}
      data-experience-mode={isProfileExperience ? 'profile' : 'letters'}
      data-profile-variant={isProfileExperience ? profileVariant : undefined}
      aria-label={siteConfig.pageAriaLabel}
    >
      <h1 className="sr-only">{siteConfig.title}</h1>
      <TextureStage
        reducedMotion={prefersReducedMotion}
        sequenceMode={experienceMode === 'letters' ? 'letters' : 'ambient'}
      />
      {isLettersExperience ? (
        <aside
          className="future-memory future-memory--archive letters-archive-rails"
          aria-label={siteConfig.railAriaLabel}
        >
          <ArchiveRail position="top" />
          <ArchiveRail position="bottom" />
        </aside>
      ) : null}
      {isProfileExperience ? (
        <WelcomeOverlay
          reducedMotion={prefersReducedMotion}
          profileId={currentProfileId}
          showProfileContent={!isMainVisualMode(experienceMode)}
        />
      ) : null}
      {backgroundMusicSource ? (
        <audio
          ref={audioRef}
          src={backgroundMusicSource}
          autoPlay
          loop
          preload="auto"
        />
      ) : null}
      <div className="top-controls">
        <nav className="experience-switcher" aria-label="效果版本切换">
          {experienceOptions.map((option) => {
            const isActive = option.mode === experienceMode

            return (
              <button
                className="experience-switcher__button"
                type="button"
                key={option.mode}
                data-experience-option={option.mode}
                aria-label={option.description}
                aria-keyshortcuts={option.keyboardShortcut?.toUpperCase()}
                aria-pressed={isActive}
                title={option.description}
                onClick={() => selectExperienceMode(option.mode)}
              >
                <span className="experience-switcher__number" aria-hidden="true">
                  {option.number}
                </span>
                <span>{option.label}</span>
              </button>
            )
          })}
        </nav>

        <button
          className="music-toggle"
          type="button"
          aria-label={backgroundMusicSource
            ? isMusicPlaying
              ? '暂停背景音乐'
              : '播放背景音乐'
            : siteConfig.music.unavailableLabel}
          aria-pressed={isMusicPlaying}
          title={backgroundMusicSource
            ? isMusicPlaying
              ? '暂停背景音乐'
              : '播放背景音乐'
            : siteConfig.music.unavailableLabel}
          disabled={!backgroundMusicSource}
          onClick={() => void toggleMusic()}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 8H7L11 5V15L7 12H4V8Z" fill="currentColor" />
            {isMusicPlaying ? (
              <>
                <path d="M13 8C13.75 8.65 14.1 9.26 14.1 10C14.1 10.74 13.75 11.35 13 12" />
                <path d="M15.2 6.3C16.45 7.38 17 8.58 17 10C17 11.42 16.45 12.62 15.2 13.7" />
              </>
            ) : (
              <path d="M13.2 8.2L16.8 11.8M16.8 8.2L13.2 11.8" />
            )}
          </svg>
        </button>
      </div>
    </main>
  )
}

export default App
