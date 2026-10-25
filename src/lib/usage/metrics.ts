/**
 * 비용 추적용 사용량 지표 이름 (supabase/usage_daily.sql, ellieo-erp Costs 탭과 같은 이름).
 * 하루 단위로 usage_daily에 더해진다.
 */
export const USAGE_METRICS = {
  placesAutocomplete: 'google.places.autocomplete',
  placesTextSearch: 'google.places.text_search',
  placesDetails: 'google.places.details',
  geocode: 'google.geocode',
  staticMap: 'google.static_map',
  mapViewHousing: 'map_view.housing',
  mapViewFoodPlace: 'map_view.food_place',
  mapViewFoodPosts: 'map_view.food_posts',
} as const

export type UsageMetric = (typeof USAGE_METRICS)[keyof typeof USAGE_METRICS]

export const MAP_VIEW_KINDS = ['housing', 'food_place', 'food_posts'] as const
export type MapViewKind = (typeof MAP_VIEW_KINDS)[number]
