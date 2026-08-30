import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import {
  COMMUNITY_CREDIT_REDEEM_OPTIONS,
} from '@lib/constants/communityCredit'
import {
  COFFEE_CHAT_DEFAULT_MEETING_FORMAT,
  CREDIT_REDEEM_DETAIL_MAX,
  CREDIT_REDEEM_TOPIC_MAX,
  isCoffeeChatAcademicLevel,
  isCoffeeChatMatchFocus,
  isLawyerConsultCategory,
} from '@lib/constants/creditRedeemRequest'
import { getCommunityCreditSummary } from '@lib/community/creditLedger'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import {
  isCreditRedeemStorageConfigured,
  saveStoredCreditRedeemRequest,
  type CoffeeChatRedeemRequest,
  type LawyerConsultRedeemRequest,
} from '@lib/supabase/communityCreditRedeem.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function newRequestId(type: string) {
  return `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(request: Request) {
  try {
    if (!isCreditRedeemStorageConfigured()) {
      return NextResponse.json(
        { error: 'Supabase 설정이 필요해요.' },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid || !user.email) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null
    if (!body) {
      return NextResponse.json({ error: '요청 본문이 필요해요.' }, { status: 400 })
    }

    const type = body.type
    if (type !== 'coffee-chat' && type !== 'lawyer-consult') {
      return NextResponse.json({ error: '잘못된 신청 유형이에요.' }, { status: 400 })
    }

    const option = COMMUNITY_CREDIT_REDEEM_OPTIONS.find((item) => item.id === type)
    if (!option || option.comingSoon) {
      return NextResponse.json(
        { error: '아직 신청할 수 없는 보상이에요.' },
        { status: 400 },
      )
    }

    const summary = await getCommunityCreditSummary(user.uid)
    if (summary.balance < option.cost) {
      return NextResponse.json(
        {
          error: `크레딧이 부족해요. ${option.cost - summary.balance} 크레딧이 더 필요해요.`,
        },
        { status: 400 },
      )
    }

    const profile = await getSupabaseProfile(user.uid)
    const nickname =
      profile?.nickname?.trim() ||
      null
    const now = Date.now()
    const detail = String(body.detail || '').trim()
    if (detail.length < 10) {
      return NextResponse.json(
        { error: '내용을 조금 더 자세히 적어 주세요. (10자 이상)' },
        { status: 400 },
      )
    }
    if (detail.length > CREDIT_REDEEM_DETAIL_MAX) {
      return NextResponse.json(
        { error: `내용은 ${CREDIT_REDEEM_DETAIL_MAX}자까지 입력할 수 있어요.` },
        { status: 400 },
      )
    }

    if (type === 'coffee-chat') {
      const matchFocus = String(body.matchFocus || '').trim()
      if (!isCoffeeChatMatchFocus(matchFocus)) {
        return NextResponse.json(
          { error: '매칭 유형을 선택해 주세요.' },
          { status: 400 },
        )
      }
      const field = String(body.field || '').trim()
      if (!field) {
        return NextResponse.json(
          { error: '관심 분야를 입력해 주세요.' },
          { status: 400 },
        )
      }
      if (field.length > CREDIT_REDEEM_TOPIC_MAX) {
        return NextResponse.json(
          { error: `관심 분야는 ${CREDIT_REDEEM_TOPIC_MAX}자까지예요.` },
          { status: 400 },
        )
      }

      let company: string | null = null
      let academicLevel: CoffeeChatRedeemRequest['academicLevel'] = null

      if (matchFocus === 'academic') {
        const level = String(body.academicLevel || '').trim()
        if (!isCoffeeChatAcademicLevel(level)) {
          return NextResponse.json(
            { error: '석사·박사·포닥 중 하나를 선택해 주세요.' },
            { status: 400 },
          )
        }
        academicLevel = level
      }

      const meetingFormat = COFFEE_CHAT_DEFAULT_MEETING_FORMAT

      const saved: CoffeeChatRedeemRequest = {
        id: newRequestId('coffee'),
        type: 'coffee-chat',
        cost: option.cost,
        status: 'pending',
        authorUid: user.uid,
        authorEmail: user.email,
        authorNickname: nickname,
        matchFocus,
        field,
        company,
        academicLevel,
        meetingFormat,
        detail,
        createdAt: now,
        updatedAt: now,
      }

      await saveStoredCreditRedeemRequest(saved)
      return NextResponse.json({ request: saved })
    }

    const categoriesRaw = Array.isArray(body.categories) ? body.categories : []
    const categories = categoriesRaw
      .map((item) => String(item || '').trim())
      .filter(isLawyerConsultCategory)
    if (categories.length === 0) {
      return NextResponse.json(
        { error: '자문 카테고리를 하나 이상 선택해 주세요.' },
        { status: 400 },
      )
    }

    const saved: LawyerConsultRedeemRequest = {
      id: newRequestId('lawyer'),
      type: 'lawyer-consult',
      cost: option.cost,
      status: 'pending',
      authorUid: user.uid,
      authorEmail: user.email,
      authorNickname: nickname,
      categories,
      detail,
      createdAt: now,
      updatedAt: now,
    }

    await saveStoredCreditRedeemRequest(saved)
    return NextResponse.json({ request: saved })
  } catch (error) {
    console.error('Credit redeem POST error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '신청을 접수하지 못했어요.',
      },
      { status: 500 },
    )
  }
}
