import { BRAND_CONFIG } from '@lib/brand'
import { EllieoPartnersScreen } from '@screens/ellieo/EllieoPartnersScreen'
import { PartnerSchoolsScreen } from '@screens/nyc/PartnerSchoolsScreen'

/** Partners: Misaeng shows its Korean student associations, Ellieo its VSAs and creators */
const PartnersScreen = BRAND_CONFIG.theme === 'ellieo' ? EllieoPartnersScreen : PartnerSchoolsScreen

export default function NycPartnersPage() {
  return <PartnersScreen />
}
