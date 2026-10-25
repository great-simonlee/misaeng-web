import { Fragment, type ReactNode } from 'react'

/**
 * 번역 문장 안에 링크·굵은 글씨 같은 React 노드를 끼워 넣는다.
 * `rich(t('agreeTerms'), { terms: <Link …>…</Link> })` — 문구의 `{terms}` 자리에 노드가 들어간다.
 * (t에 params로 넘기지 않은 `{name}`은 그대로 남으므로 여기서 채운다)
 */
export function rich(text: string, nodes: Record<string, ReactNode>): ReactNode {
  const parts = text.split(/(\{\w+\})/g)
  return parts.map((part, index) => {
    const match = /^\{(\w+)\}$/.exec(part)
    if (match && match[1] in nodes) return <Fragment key={index}>{nodes[match[1]]}</Fragment>
    return part ? <Fragment key={index}>{part}</Fragment> : null
  })
}
