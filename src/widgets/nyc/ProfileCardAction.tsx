import { cn } from '@lib'

type Variant =
  | 'profile'
  | 'identity'
  | 'school'
  | 'workplace'
  | 'workplacePending'

type Props = {
  variant: Variant
  onClick: () => void
  className?: string
}

const VARIANTS = {
  profile: {
    title: '프로필을 완성해 보세요',
    description: '닉네임·MBTI·성별·직업을 설정해요',
    descriptionDesktop: '기본 정보를 설정해요',
    shell:
      'border-[#F64310]/18 bg-[linear-gradient(180deg,#fffaf8_0%,#fff3ee_100%)] ring-[#F64310]/8 hover:border-[#F64310]/28 hover:bg-[#fff3ee]',
    icon: 'bg-[#F64310]/10 text-[#F64310]',
    titleColor: 'text-[#C9340A]',
    chevron: 'text-[#F64310]/45 group-hover:text-[#F64310]',
    Icon: ProfileCompleteIcon,
  },
  identity: {
    title: '본인 인증해 보세요',
    description: '학교 메일 또는 직장 메일로 인증해요',
    descriptionDesktop: '학교·직장 메일로 인증해요',
    shell:
      'border-[#F64310]/18 bg-[linear-gradient(180deg,#fffaf8_0%,#fff3ee_100%)] ring-[#F64310]/8 hover:border-[#F64310]/28 hover:bg-[#fff3ee]',
    icon: 'bg-[#F64310]/10 text-[#F64310]',
    titleColor: 'text-[#C9340A]',
    chevron: 'text-[#F64310]/45 group-hover:text-[#F64310]',
    Icon: IdentityVerifyIcon,
  },
  school: {
    title: '학교 이메일 인증해 보세요',
    description: '학교 메일로 학생 인증을 완료해요',
    descriptionDesktop: '학생 인증을 진행해요',
    shell:
      'border-[#57068c]/16 bg-[linear-gradient(180deg,#fbf9ff_0%,#f5f0ff_100%)] ring-[#57068c]/8 hover:border-[#57068c]/24 hover:bg-[#f5f0ff]',
    icon: 'bg-[#57068c]/10 text-[#57068c]',
    titleColor: 'text-[#57068c]',
    chevron: 'text-[#57068c]/45 group-hover:text-[#57068c]',
    Icon: SchoolVerifyIcon,
  },
  workplace: {
    title: '직장인 인증해 보세요',
    description: '직장 메일과 회사 이름으로 인증해요',
    descriptionDesktop: '직장인 인증을 진행해요',
    shell:
      'border-[#0f766e]/16 bg-[linear-gradient(180deg,#f4fbfa_0%,#ecf8f6_100%)] ring-[#0f766e]/8 hover:border-[#0f766e]/24 hover:bg-[#ecf8f6]',
    icon: 'bg-[#0f766e]/10 text-[#0f766e]',
    titleColor: 'text-[#0f766e]',
    chevron: 'text-[#0f766e]/45 group-hover:text-[#0f766e]',
    Icon: WorkplaceVerifyIcon,
  },
  workplacePending: {
    title: '직장인 인증을 확인하고 있어요',
    description: '이메일 인증은 끝났어요. 미생 팀 확인을 기다려 주세요',
    descriptionDesktop: '미생 팀 확인을 기다려 주세요',
    shell:
      'border-amber-200/80 bg-[linear-gradient(180deg,#fffbeb_0%,#fef3c7_100%)] ring-amber-200/50 hover:border-amber-300 hover:bg-[#fef3c7]',
    icon: 'bg-amber-100 text-amber-700',
    titleColor: 'text-amber-800',
    chevron: 'text-amber-400/70 group-hover:text-amber-600',
    Icon: WorkplaceVerifyIcon,
  },
} as const

export function ProfileCardAction({ variant, onClick, className }: Props) {
  const config = VARIANTS[variant]
  const Icon = config.Icon

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'group mt-4 w-full rounded-2xl border px-4 py-3.5 text-left ring-1 transition duration-200 active:scale-[0.99] lg:mt-3 lg:px-3.5 lg:py-3',
        config.shell,
        className,
      )}
    >
      <span className='flex items-center gap-3 lg:gap-2.5'>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl lg:size-8',
            config.icon,
          )}
        >
          <Icon />
        </span>
        <span className='min-w-0 flex-1'>
          <span
            className={cn(
              'block text-[13px] font-semibold leading-snug tracking-tight lg:text-[12px]',
              config.titleColor,
            )}
          >
            {config.title}
          </span>
          <span className='mt-0.5 block text-[11px] leading-snug text-[var(--muted)] lg:hidden'>
            {config.description}
          </span>
          <span className='mt-0.5 hidden text-[11px] leading-snug text-[var(--muted)] lg:block'>
            {config.descriptionDesktop}
          </span>
        </span>
        <ChevronIcon className={cn(config.chevron, 'lg:size-3.5')} />
      </span>
    </button>
  )
}

function ProfileCompleteIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className='size-[18px]'
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM6 21v-1a6 6 0 0 1 12 0v1'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M19 8v3m1.5-1.5H17.5'
      />
    </svg>
  )
}

function IdentityVerifyIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className='size-[18px]'
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M12 3 3.5 7.5 12 12l8.5-4.5L12 3Z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M6.2 10.2V16c0 1.2 2.6 2.4 5.8 2.4s5.8-1.2 5.8-2.4v-5.8'
      />
    </svg>
  )
}

function WorkplaceVerifyIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className='size-[18px]'
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M4.5 9.5h15v9a1.5 1.5 0 0 1-1.5 1.5h-12a1.5 1.5 0 0 1-1.5-1.5v-9Z'
      />
      <path strokeLinecap='round' strokeLinejoin='round' d='M4.5 13h15' />
    </svg>
  )
}

function SchoolVerifyIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className='size-[18px]'
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M12 3 2 8.25 12 13.5l10-5.25L12 3Z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M6.5 10.8V16c0 .9 2.46 2.25 5.5 2.25s5.5-1.35 5.5-2.25v-5.2'
      />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      className={cn('size-4 shrink-0 transition', className)}
      aria-hidden
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='m9 6 6 6-6 6' />
    </svg>
  )
}
