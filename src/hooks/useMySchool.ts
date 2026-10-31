'use client'

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { commuteSchool } from '@lib/housing/commute'

const STORAGE_KEY = 'ellieo.commuteSchool'
const CHANGE_EVENT = 'ellieo:commute-school'

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * The school used for commute times on listings. Picked by the viewer (kept in this browser only);
 * until they pick one, a verified member's own school is used when it's a NYC campus.
 * Every component using the hook stays in sync (same-tab event + storage event).
 */
export function useMySchool(): [string | null, (schoolId: string | null) => void] {
  const { profile } = useAuth()
  const [stored, setStored] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setStored(readStored())
    sync()
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setSchool = useCallback((schoolId: string | null) => {
    try {
      if (schoolId) window.localStorage.setItem(STORAGE_KEY, schoolId)
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage blocked: the choice lasts until reload
    }
    setStored(schoolId)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  const fromProfile = commuteSchool(profile?.verifiedSchoolId ?? null)?.id ?? null
  return [commuteSchool(stored)?.id ?? fromProfile, setSchool]
}
