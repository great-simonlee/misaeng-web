/**
 * 채용 공고 분류 코드. 화면 문구는 src/messages/<locale>/companies.json 의 postings.* 에 있다.
 */

/** 직무 분류 (ellieo-erp src/app/util/jobPostingRules.mjs JOB_FUNCTIONS 와 같은 코드, 같은 순서) → 문구 키 */
export const JOB_FUNCTION_LABELS = {
  tech: 'postings.jobFunction.tech',
  data: 'postings.jobFunction.data',
  product_design: 'postings.jobFunction.product_design',
  finance: 'postings.jobFunction.finance',
  accounting: 'postings.jobFunction.accounting',
  strategy: 'postings.jobFunction.strategy',
  operations: 'postings.jobFunction.operations',
  sales: 'postings.jobFunction.sales',
  marketing: 'postings.jobFunction.marketing',
  hr: 'postings.jobFunction.hr',
  legal_risk: 'postings.jobFunction.legal_risk',
  other: 'postings.jobFunction.other',
} as const

export type JobFunction = keyof typeof JOB_FUNCTION_LABELS

/** 지원 대상 학위 (ellieo-erp DEGREE_LEVELS 와 같은 코드) → 문구 키 (`useT('companies')`로 번역) */
export const DEGREE_LABELS = {
  undergraduate: 'postings.degree.undergraduate',
  graduate: 'postings.degree.graduate',
  both: 'postings.degree.both',
  unspecified: 'postings.degree.unspecified',
} as const

export type DegreeLevel = keyof typeof DEGREE_LABELS
export const JOB_FUNCTIONS = Object.keys(JOB_FUNCTION_LABELS) as JobFunction[]
