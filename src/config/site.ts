export const letterSequence = [
  { mode: 1, word: 'OPEN' },
  { mode: 2, word: 'LAB' },
  { mode: 3, word: 'TOGETHER' },
  { mode: 4, word: 'I ❤ IDEAS' },
  { mode: 5, word: 'I ❤ COMMUNITY' },
] as const

export type LetterSequenceEntry = (typeof letterSequence)[number]
export type LetterWord = LetterSequenceEntry['word']

export const siteConfig = {
  title: '开放创意墙',
  description: '一个仅使用合成资料的开源活动视觉演示',
  pageAriaLabel: '开放创意墙动态视觉页面',
  railAriaLabel: '开放创意墙页眉与页脚',
  experienceOptions: [
    {
      mode: 'profile',
      number: '01',
      label: '创意档案',
      description: '切换到 01 合成创意档案轮播',
      keyboardShortcut: 'q',
    },
    {
      mode: 'letters',
      number: '02',
      label: 'OPEN / LAB',
      description: '切换到 OPEN、LAB 与开放字形循环',
      keyboardShortcut: 'w',
    },
    {
      mode: 'profile04',
      number: '03',
      label: '主视觉',
      description: '切换到 03 开放创意墙主视觉',
      keyboardShortcut: 'e',
    },
  ],
  archive: {
    topRail: ['OPEN COLLABORATION', 'CREATIVE WALL', 'PUBLIC DEMO'],
    marquee: ['LET IDEAS LIGHT EACH OTHER', 'OPEN CREATIVE WALL'],
    marqueeAriaLabel: '让想法彼此照亮',
    profileRibbon: '开放创意墙',
    profileRibbonAriaLabel: '开放创意墙',
    mainVisualAriaLabel: '开放创意墙主视觉',
    mainVisual: {
      eyebrow: 'OPEN LAB',
      title: '开放创意墙',
      statement: '让想法彼此照亮',
    },
    identityLabels: {
      chinese: '伙伴',
      english: 'CREATOR',
      daysChinese: '天',
      daysEnglish: 'DAYS',
    },
  },
  profileCopy: {
    memoryLines: [
      '认真走过的路，都在此刻发光',
      '把每一次同行，写成温暖的回声',
      '向着热爱出发，时间自会回答',
      '日复一日的专注，终会汇成星河',
      '所有并肩的时刻，都值得被记住',
      '一路有你，寻常岁月也有了光',
      '把初心放在心上，也落在每一步',
      '时间记录成长，也珍藏每次相遇',
      '同心向前，让微小坚持长成力量',
      '每一份认真，都在照亮新的远方',
      '脚下有路，心中的热爱自有方向',
      '共同走过的日子，正汇成未来',
      '把可靠写进日常，把温暖留给同行',
      '每一步都算数，每一天都有回响',
      '向新而行，也把珍贵时刻留在这里',
      '平凡的坚持，让共同的记忆闪光',
      '步履不停，热爱就在时间里生长',
      '因为一路同行，远方变得更加清晰',
    ],
    companionship: [
      '，感谢一路相伴，你把认真写进每一个日常。',
      '，一路同行，温暖与笃定都被时间珍藏。',
      '，共同走过的每一步，都因你有了回声。',
      '，并肩向前，你的投入让寻常日子熠熠生辉。',
      '，感谢你始终带着热爱走过这段旅程。',
      '，彼此照亮，你让陪伴成为可靠的力量。',
      '，一路耕耘，每一份认真都在连接更远的未来。',
      '，朝夕相伴，你的坚持为共同成长留下印记。',
    ],
    englishMemoryLines: [
      'Every step we share becomes part of tomorrow',
      'The days we build together continue to shine',
      'Time holds every sincere step along the way',
      'Shared purpose turns ordinary days into light',
      'Every thoughtful step brings the future closer',
      'The road ahead is brighter because we walk together',
    ],
    englishCompanionship: [
      ' — thank you for giving every shared step lasting meaning.',
      ' — your care has made our ordinary days shine.',
      ' — every sincere step in our shared growth is held close in time.',
      ' — your commitment continues to light the way ahead.',
      ' — thank you for making every shared moment count.',
      ' — your steady presence has become a source of warmth.',
    ],
  },
  music: {
    /** Add a redistributable local file path after documenting its license. */
    source: null as string | null,
    volume: 0.28,
    unavailableLabel: '未配置可再分发的背景音乐',
  },
} as const
