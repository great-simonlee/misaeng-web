import type { ReactNode, SVGProps } from 'react'

/** Ellieo line icons (24px grid, 1.75 stroke). Decorative: always paired with a text label. */
type IconProps = SVGProps<SVGSVGElement> & { className?: string }

function Base({ children, className = 'size-5', ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.75}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z' />
  </Base>
)

export const KeyIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M4 20V9.5L12 4l8 5.5V20H4Z' />
    <path d='M9.5 20v-5.5h5V20' />
    <path d='M9 10.5h6' />
  </Base>
)

export const BowlIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z' />
    <path d='M8 8c0-1.2 1-1.6 1-2.8M12 8c0-1.2 1-1.6 1-2.8M16 8c0-1.2 1-1.6 1-2.8' />
  </Base>
)

export const PassportIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x='5' y='3.5' width='14' height='17' rx='2' />
    <circle cx='12' cy='10.5' r='3' />
    <path d='M9 16.5h6' />
  </Base>
)

export const BriefcaseIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x='3.5' y='7' width='17' height='12.5' rx='2' />
    <path d='M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17' />
  </Base>
)

export const UsersIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx='9' cy='8.5' r='3.25' />
    <path d='M3.5 19.5a5.5 5.5 0 0 1 11 0' />
    <path d='M15.5 5.5a3.25 3.25 0 0 1 0 6.25M17 14.2a5.5 5.5 0 0 1 3.5 5.3' />
  </Base>
)

export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M20 12a7.5 7.5 0 0 1-11.1 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12Z' />
    <path d='M9 11h.01M12 11h.01M15 11h.01' strokeWidth={2.4} />
  </Base>
)

export const BagIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M5 8h14l-1 12H6L5 8Z' />
    <path d='M9 8V6.5a3 3 0 0 1 6 0V8' />
  </Base>
)

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x='3.5' y='5' width='17' height='15' rx='2' />
    <path d='M3.5 10h17M8 3v4M16 3v4' />
  </Base>
)

export const GridIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x='4' y='4' width='6.5' height='6.5' rx='1.5' />
    <rect x='13.5' y='4' width='6.5' height='6.5' rx='1.5' />
    <rect x='4' y='13.5' width='6.5' height='6.5' rx='1.5' />
    <rect x='13.5' y='13.5' width='6.5' height='6.5' rx='1.5' />
  </Base>
)

export const UserIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx='12' cy='8.5' r='3.75' />
    <path d='M4.5 20a7.5 7.5 0 0 1 15 0' />
  </Base>
)

export const PinIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z' />
    <circle cx='12' cy='10' r='2.25' />
  </Base>
)

export const ShieldCheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M12 3.5 19 6v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-2.5Z' />
    <path d='m9 12 2.2 2.2L15.5 10' />
  </Base>
)

export const BadgeCheckIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx='12' cy='12' r='8.5' />
    <path d='m8.5 12.2 2.4 2.3 4.6-4.8' />
  </Base>
)

export const FlagIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M5 21V4.5M5 4.5h11l-2 4 2 4H5' />
  </Base>
)

export const NoCashIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x='3' y='6.5' width='18' height='11' rx='2' />
    <circle cx='12' cy='12' r='2.25' />
    <path d='M4 4l16 16' />
  </Base>
)

export const ArrowRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M5 12h14M13 6l6 6-6 6' />
  </Base>
)

export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='m6 9 6 6 6-6' />
  </Base>
)

export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M6 6l12 12M18 6 6 18' />
  </Base>
)

export const MailIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x='3.5' y='5.5' width='17' height='13' rx='2' />
    <path d='m4 7 8 6 8-6' />
  </Base>
)

export const BookIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z' />
  </Base>
)

export const HeartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z' />
  </Base>
)

export const TrainIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x='5' y='3.5' width='14' height='13' rx='3' />
    <path d='M5 10.5h14M9 13.5h.01M15 13.5h.01M8.5 20.5l1.5-4M15.5 20.5l-1.5-4' />
  </Base>
)
