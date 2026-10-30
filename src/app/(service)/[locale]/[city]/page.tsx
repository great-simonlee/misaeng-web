import { BRAND_CONFIG } from '@lib/brand'
import { EllieoHomeScreen } from '@screens/ellieo/EllieoHomeScreen'
import { NycHubScreen } from '@screens/nyc/NycHubScreen'

/** 도시 홈: 브랜드 테마별 화면 (기능·정보 구조는 같고 화면만 다르다) */
const HomeScreen = BRAND_CONFIG.theme === 'ellieo' ? EllieoHomeScreen : NycHubScreen

export default function NycPage() {
  return <HomeScreen />
}
