import { PageSkeleton } from "@/components/common/page-skeleton"

/**
 * Segment-level loading boundary for every route in the dashboard group. Gives
 * client-side navigation an instant fallback (and makes dynamic routes
 * prefetchable down to this boundary) while the target page renders.
 */
export default function DashboardSegmentLoading() {
  return <PageSkeleton />
}
