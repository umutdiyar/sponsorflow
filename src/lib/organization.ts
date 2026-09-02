/**
 * The single active organization for this phase. When multi-org support lands
 * this becomes a per-request lookup; the shape is kept minimal on purpose.
 */
export const CURRENT_ORGANIZATION = {
  id: "aws-sbg-okan",
  name: "AWS Student Builder Group at Okan University",
  shortName: "AWS SBG Okan",
} as const

export type Organization = typeof CURRENT_ORGANIZATION
