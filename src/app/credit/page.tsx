import { redirect } from 'next/navigation'

/** 구 경로 → /nyc/credit */
export default function CreditRedirectPage() {
  redirect('/nyc/credit')
}
