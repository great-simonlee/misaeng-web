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

/** Housing everywhere (tab bar, board chips/tags, shortcuts). The Home tab uses GridIcon */
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

/** Home tab: 2×2 rounded tiles (pass fill='currentColor' for the active state) */
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

export const MenuIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M4 7h16M4 12h16M4 17h16' />
  </Base>
)

export const CompassIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx='12' cy='12' r='8.5' />
    <path d='m15.5 8.5-2 5-5 2 2-5 5-2Z' />
  </Base>
)

export const BellIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M6.5 10a5.5 5.5 0 0 1 11 0c0 4.5 2 6 2 6h-15s2-1.5 2-6Z' />
    <path d='M10 19a2 2 0 0 0 4 0' />
  </Base>
)

export const InboxIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 17 17h-6.5L6 20.5V17h0a2.5 2.5 0 0 1-1.5-2.3v-8.2Z' />
  </Base>
)

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M12 5v14M5 12h14' />
  </Base>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='m9 6 6 6-6 6' />
  </Base>
)

export const CommentIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M20 12a7.5 7.5 0 0 1-11.2 6.5L4 20l1.5-4.6A7.5 7.5 0 1 1 20 12Z' />
  </Base>
)

export const EyeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z' />
    <circle cx='12' cy='12' r='2.75' />
  </Base>
)

export const StarIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='m12 3.75 2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.77l-5.1 2.68.98-5.68-4.13-4.02 5.7-.83L12 3.75Z' />
  </Base>
)

export const SproutIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M12 20v-8' />
    <path d='M12 12c0-3.5-2.5-6-6.5-6 0 3.5 2.5 6 6.5 6Z' />
    <path d='M12 14c0-3.2 2.3-5.5 6.5-5.5 0 3.2-2.3 5.5-6.5 5.5Z' />
  </Base>
)

export const GlobeIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx='12' cy='12' r='8.5' />
    <path d='M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5Z' />
  </Base>
)

export const GiftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M4.5 9.5h15v3h-15zM5.5 12.5h13V20h-13zM12 9.5V20' />
    <path d='M12 9.5c-1-2.8-4.5-3.6-4.5-1.3 0 1.3 2 1.3 4.5 1.3Zm0 0c1-2.8 4.5-3.6 4.5-1.3 0 1.3-2 1.3-4.5 1.3Z' />
  </Base>
)

export const SparkleIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M12 4.5 13.8 10l5.7 2-5.7 2L12 19.5 10.2 14l-5.7-2 5.7-2L12 4.5Z' />
  </Base>
)

export const AlertIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M12 4 21 19.5H3L12 4Z' />
    <path d='M12 10v4M12 16.8v.2' />
  </Base>
)

export const BanIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx='12' cy='12' r='8.5' />
    <path d='m6 6 12 12' />
  </Base>
)

export const PencilIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M4.5 19.5 5.6 15 15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L9 18.4l-4.5 1.1Z' />
  </Base>
)

/** Apartment building (no longer used for Housing: Housing = HomeIcon, the Home tab = GridIcon, user 11-16) */
export const BuildingIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M5 20.5V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5v15M15 9.5h3.5A1.5 1.5 0 0 1 20 11v9.5M3.5 20.5h17' />
    <path d='M8 7.5h1M11 7.5h1M8 10.5h1M11 10.5h1M8 13.5h1M11 13.5h1M17.5 13h0M17.5 16h0M9.5 20.5v-3h1v3' />
  </Base>
)

/** Visa (tab bar, board icon): an airplane, same as the iOS/Android apps. Pass fill='currentColor' when active */
export const PlaneIcon = (p: IconProps) => (
  <Base {...p}>
    <path d='M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z' />
  </Base>
)
