'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { EllieoDots } from '@components/EllieoDots'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { useEllieoViewer } from '@hooks/useEllieoViewer'
import { getCommunityAuthorDisplayName } from '@lib/community/author'
import { captureReferralFromLocation } from '@lib/community/referral'
import { normalizeMarketZip } from '@lib/community/marketplace'
import { cityLoginPath, hrefForCommunityPost, hrefForHousingListing, type CityId } from '@lib/constants/cities'
import {
  formatListingBedBath,
  getHousingUnitRent,
  getListingArea,
  getListingDisplayAddress,
  getListingImages,
} from '@lib/constants/housingMock'
import { getVerifiedSchool } from '@lib/constants/schools'
import { fetchHousingListings } from '@lib/housing/fetchListings'
import { useFormat, useT } from '@lib/i18n/client'
import type { CommunityPost, HousingListing } from '@/types/nyc'
import { EllieoFeedCard } from '@widgets/ellieo/EllieoFeedCard'
import { EllieoPhotoTile } from '@widgets/ellieo/EllieoPhotoTile'
import { communityForBoard } from '@widgets/ellieo/communities'
import { BowlIcon, ChevronRightIcon, HomeIcon, StoreIcon } from '@widgets/ellieo/icons'
import { getRoommatePhotoUrls } from '@widgets/nyc/RoommatePostCard'

/** Board block after every 6 tiles (spec: "after every 6 tiles insert a full-width board block") */
const TILES_PER_BLOCK = 6
const BOARD_ROWS = 4

type Tile =
  | { kind: 'listing'; at: number; listing: HousingListing }
  | { kind: 'post'; at: number; post: CommunityPost }

async function fetchBoard(board: string, city: CityId, limit: number): Promise<CommunityPost[]> {
  try {
    const params = new URLSearchParams({ board, city, limit: String(limit) })
    if (board === 'marketplace') params.set('active', '1')
    const res = await fetch(`/api/community?${params}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as { posts?: CommunityPost[] }
    return Array.isArray(data.posts) ? data.posts : []
  } catch {
    return []
  }
}

function postPhoto(post: CommunityPost): string | null {
  if (post.categoryId === 'roommate') return getRoommatePhotoUrls(post)[0] ?? null
  return post.thumbnailUrl || post.galleryPhotos?.find((photo) => photo.imageUrl)?.imageUrl || null
}

/**
 * Ellieo city home, classifieds portal v4 (docs/design/ellieo-classifieds.md): "All" = photo tiles (rent,
 * roommates with photos, market, food) newest first in a 2/4-column grid, with a Visa & Q&A board block after every
 * 6 tiles. Visitors get one slim join row on top.
 */
export function EllieoHomeScreen() {
  const t = useT('hub')
  const city = useCity()
  const cityInfo = useCityInfo()
  const [tiles, setTiles] = useState<Tile[] | null>(null)
  const [boardRows, setBoardRows] = useState<CommunityPost[]>([])

  useEffect(() => {
    captureReferralFromLocation()
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([
      fetchHousingListings(city),
      fetchBoard('marketplace', city, 24),
      fetchBoard('food', city, 12),
      fetchBoard('roommate', city, 12),
      fetchBoard('status', city, BOARD_ROWS * 2),
      fetchBoard('anonymous', city, BOARD_ROWS * 2),
    ]).then(([listings, market, food, roommates, visa, ask]) => {
      if (!alive) return
      const next: Tile[] = [
        ...listings.map((listing) => ({ kind: 'listing' as const, at: listing.createdAt, listing })),
        ...[...market, ...food, ...roommates.filter((post) => postPhoto(post))].map((post) => ({
          kind: 'post' as const,
          at: post.createdAt,
          post,
        })),
      ].sort((a, b) => b.at - a.at)
      setTiles(next)
      setBoardRows([...visa, ...ask].sort((a, b) => b.createdAt - a.createdAt))
    })
    return () => {
      alive = false
    }
  }, [city])

  const chunks: Tile[][] = []
  for (let i = 0; i < (tiles?.length ?? 0); i += TILES_PER_BLOCK) chunks.push(tiles!.slice(i, i + TILES_PER_BLOCK))

  return (
    <div className='min-w-0 flex-1 bg-white'>
      <h1 className='sr-only'>{t('ellieo.intro.title', { city: cityInfo.shortLabel })}</h1>
      <div className='mx-auto w-full max-w-[67.5rem] px-4 pb-6 pt-1 lg:pt-4'>
        <JoinRow />
        {tiles === null ? (
          <div className='flex justify-center py-20'>
            <EllieoDots />
          </div>
        ) : chunks.length === 0 ? (
          <BoardBlock rows={boardRows} />
        ) : (
          chunks.map((chunk, index) => (
            <div key={index}>
              <TileGrid tiles={chunk} />
              {/* Board block after every 6 tiles (each block shows the next 4 rows) */}
              {boardRows.length > index * BOARD_ROWS ? (
                <BoardBlock rows={boardRows.slice(index * BOARD_ROWS, (index + 1) * BOARD_ROWS)} />
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ---------- Logged out: one slim join row ---------- */

function JoinRow() {
  const tn = useT('nav')
  const city = useCity()
  const cityInfo = useCityInfo()
  const { user, loading } = useEllieoViewer()
  if (loading || user) return null
  return (
    <div className='flex items-center gap-3 border-b border-[var(--border)] py-2.5'>
      <p className='min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-[var(--foreground)]'>
        {tn('ellieo.joinRow', { city: cityInfo.name })}
      </p>
      <Link
        href={`${cityLoginPath(city)}?mode=signup`}
        className='inline-flex h-8 shrink-0 items-center rounded-full bg-[var(--brand)] px-3.5 text-[13px] font-semibold text-white transition hover:bg-[var(--brand-hover)]'
      >
        {tn('ellieo.signUp')}
      </Link>
    </div>
  )
}

/* ---------- Photo tiles: 2 columns on phones, 4 from 1024px ---------- */

function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <ul className='grid grid-cols-2 gap-x-3 gap-y-5 py-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-4'>
      {tiles.map((tile) => (
        <li key={tile.kind === 'listing' ? `l-${tile.listing.id}` : `p-${tile.post.id}`} className='min-w-0'>
          {tile.kind === 'listing' ? <ListingTile listing={tile.listing} /> : <PostTile post={tile.post} />}
        </li>
      ))}
    </ul>
  )
}

export function ListingTile({ listing }: { listing: HousingListing }) {
  const tn = useT('nav')
  const format = useFormat()
  const [cover] = getListingImages(listing)
  const rooms = listing.unit.rooms ?? []
  const roomPrices = rooms.map((room) => room.price).filter((price): price is number => typeof price === 'number' && price > 0)
  const price =
    roomPrices.length > 1
      ? tn('ellieo.from', { price: format.usd(Math.min(...roomPrices), 0) })
      : format.usd(getHousingUnitRent(listing), 0)
  return (
    <EllieoPhotoTile
      href={hrefForHousingListing(listing)}
      photo={cover ?? null}
      price={price}
      icon={HomeIcon}
      location={getListingArea(listing)}
      title={[getListingDisplayAddress(listing), formatListingBedBath(listing)].filter(Boolean).join(' · ')}
      time={format.relative(listing.createdAt)}
    />
  )
}

export function PostTile({ post }: { post: CommunityPost }) {
  const tn = useT('nav')
  const tc = useT('community')
  const format = useFormat()
  const city = useCity()
  const isMarket = post.categoryId === 'marketplace'
  const isRoommate = post.categoryId === 'roommate'
  const price =
    isMarket && post.price != null
      ? post.price === 0
        ? tn('ellieo.free')
        : format.usd(post.price, 0)
      : isRoommate && post.roommateBudgetMax
        ? format.usd(post.roommateBudgetMax, 0)
        : null
  const status =
    isMarket && (post.marketStatus === 'reserved' || post.marketStatus === 'sold')
      ? tc(`ellieoMarket.status.${post.marketStatus}`)
      : null
  const location = isMarket ? normalizeMarketZip(post.location) : post.location || null
  return (
    <EllieoPhotoTile
      href={hrefForCommunityPost(post, city)}
      photo={postPhoto(post)}
      price={price}
      icon={isMarket ? StoreIcon : post.categoryId === 'food' ? BowlIcon : HomeIcon}
      status={status}
      dim={post.marketStatus === 'sold'}
      location={location}
      title={post.title}
      time={format.relative(post.createdAt)}
    />
  )
}

/* ---------- Board block: Visa & Q&A, latest rows ---------- */

function BoardBlock({ rows }: { rows: CommunityPost[] }) {
  const tn = useT('nav')
  const href = useCityPath()
  if (rows.length === 0) return null
  return (
    <section className='border-y border-[var(--border)] py-2'>
      <div className='flex items-center justify-between py-1.5'>
        <h2 className='text-[15px] font-bold text-[var(--foreground)]'>{tn('ellieo.boardBlock')}</h2>
        <Link href={href('/status')} className='inline-flex items-center gap-0.5 text-[13px] font-medium text-[var(--muted-foreground)]'>
          {tn('ellieo.more')}
          <ChevronRightIcon className='size-3.5' />
        </Link>
      </div>
      <ul className='[&>li:last-child_article]:border-b-0'>
        {rows.map((post) => (
          <li key={post.id}>
            <BoardRow post={post} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function BoardRow({ post }: { post: CommunityPost }) {
  const t = useT('community')
  const format = useFormat()
  const city = useCity()
  const anonymous = post.categoryId === 'anonymous' && !post.showNickname
  const name = anonymous ? t('author.anonymous') : getCommunityAuthorDisplayName(post, null, t)
  const school = anonymous ? null : getVerifiedSchool(post.authorSchoolId ?? '')?.shortName ?? null
  const photo = post.thumbnailUrl || post.galleryPhotos?.find((item) => item.imageUrl)?.imageUrl || null
  return (
    <EllieoFeedCard
      href={hrefForCommunityPost(post, city)}
      name={name}
      verified={Boolean(school)}
      meta={[school, format.relative(post.createdAt)].filter(Boolean).join(' · ')}
      community={communityForBoard(post.categoryId)}
      title={post.title}
      photo={anonymous ? null : photo}
      comments={post.commentCount}
      views={post.viewCount}
    />
  )
}
