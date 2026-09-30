export type AboutTeamMember = {
  id: string
  name: string
  position: string
  role: string
  description: string
  email: string
  photoURL: string
  agentId?: string | null
  sortOrder: number
}

export const DEFAULT_ABOUT_TEAM: AboutTeamMember[] = [
  {
    id: 'seunghoon',
    name: 'Seunghoon Lee',
    position: 'Founder & Managing Member',
    role: 'Strategic Investment & Business Architecture',
    description:
      'As the Founder and Major Investor of Misaeng, I am currently leading the strategic deployment of capital and the establishment of our U.S. operational infrastructure. My focus is on building a scalable business model that brings transparency to the New York City housing market through verified listings and professional, preference-based matching.\n\nTo maintain the highest level of governance, I oversee the high-level corporate strategy and investment roadmap, while our New York-based Operations Manager executes daily field activities and partnership management. This structural separation ensures that our expansion is driven by robust professional standards and long-term investment goals.',
    email: 'simon@misaeng.com',
    photoURL: '/img/simon_image.JPG',
    agentId: null,
    sortOrder: 0,
  },
  {
    id: 'mimi',
    name: 'Mimi Nguyen',
    position: 'Sales Associate',
    role: 'Client Relations & Strategic Partnerships',
    description:
      'As a Sales Client professional, I focus on building strong, long-term relationships with clients and delivering tailored solutions that drive measurable results. My approach centers on understanding client needs, ensuring exceptional service, and creating value at every stage of our partnership.\n\nI am committed to clear communication, attention to detail, and a client-first mindset that supports both immediate goals and long-term success. By aligning our services with each client\'s unique objectives, I help ensure their satisfaction and growth.',
    email: 'mimi@misaeng.com',
    photoURL: '/img/mimi.png',
    agentId: null,
    sortOrder: 1,
  },
  {
    id: 'dalston',
    name: 'Dalston Vuong',
    position: 'Partnership & Operations Intern',
    role: 'Client Outreach & Housing Relations',
    description:
      'As a Partnership & Operations Intern at Misaeng, I focus on connecting students and professionals with verified housing options across New York City. My day to day centers on client outreach — understanding what people are looking for, matching them with the right properties, and making sure the process feels straightforward from first contact to move-in.\n\nGrowing up around rental properties in the NYC area has given me a natural understanding of how the housing market works from both sides of the table. I bring that perspective to every client interaction, alongside a background in business and finance from Binghamton University\'s School of Management.',
    email: 'dalston@misaeng.com',
    photoURL: '/img/dalston.png',
    agentId: null,
    sortOrder: 2,
  },
  {
    id: 'eunice',
    name: 'Eunice Jeon',
    position: 'Partnership & Operations Intern',
    role: 'Client Outreach & Housing Relations',
    description:
      'As a Partnership & Operations Intern at Misaeng, I focus on expanding Ellieo\'s reach by identifying housing providers across New York City and building relationships with clients. Through accurate data collection and organized communication, I connect the right partners with the right opportunities. My hands-on approach to developing a trusted housing community supports platform growth and partner success. By combining outreach efforts and a driven mindset with Ellieo\'s mission, I help students access verified, quality housing.',
    email: 'eunice@misaeng.com',
    photoURL: '/img/eunice.png',
    agentId: null,
    sortOrder: 3,
  },
]

/** 더 이상 사이트에 노출하지 않는 팀원 (저장소에 남아 있어도 숨김) */
export function isHiddenAboutTeamMember(member: Pick<AboutTeamMember, 'id' | 'name' | 'email'>) {
  const id = member.id.trim().toLowerCase()
  const name = member.name.trim().toLowerCase()
  const email = member.email.trim().toLowerCase()
  return (
    id === 'laura' ||
    email === 'laura@misaeng.com' ||
    name === 'laura fanelli' ||
    name.startsWith('laura fanelli')
  )
}

export function descriptionParagraphs(text: string): string[] {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
}
