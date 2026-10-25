import { AboutScreen } from '@screens/about/AboutScreen'
import { getAboutTeamMembers } from '@lib/supabase/aboutTeam.server'

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const members = await getAboutTeamMembers()
  return <AboutScreen members={members} />
}
