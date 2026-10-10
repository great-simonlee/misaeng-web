/**
 * ellieo-erp src/app/util/companyRules.mjs 의 normalizeCompanyKey 와 같은 규칙.
 * 대소문자·공백·점은 무시하고, 둥근 따옴표는 일반 따옴표로 본다.
 */
export function normalizeCompanyKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[\s.]+/g, '')
}

export function companyKeys(company: { name: string; aliases?: string[] }): string[] {
  return [company.name, ...(company.aliases ?? [])].map(normalizeCompanyKey).filter(Boolean)
}

/** 이름·별칭 부분 일치 검색 */
export function companyMatchesQuery(
  company: { name: string; aliases?: string[] },
  query: string,
): boolean {
  const key = normalizeCompanyKey(query)
  if (!key) return true
  return companyKeys(company).some((k) => k.includes(key))
}
