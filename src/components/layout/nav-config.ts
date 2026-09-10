import {
  ActivityIcon,
  Building2Icon,
  CalendarDaysIcon,
  DownloadIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  PackageIcon,
  SettingsIcon,
  UploadIcon,
  UsersIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

export type NavSection = {
  label: string
  items: NavItem[]
  /** Collapsible sections keep a per-section expand state (default open). */
  collapsible?: boolean
}

/** Standalone links rendered above the sections (the "Genel" group). */
export const NAV_TOP: NavItem[] = [
  { title: "Genel Bakış", href: "/dashboard", icon: LayoutDashboardIcon },
]

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Sponsorluk",
    collapsible: true,
    items: [
      { title: "Firmalar", href: "/companies", icon: Building2Icon },
      { title: "Kişiler", href: "/contacts", icon: UsersIcon },
      { title: "Pipeline", href: "/pipeline", icon: GitBranchIcon },
      { title: "Sponsorluk Paketleri", href: "/packages", icon: PackageIcon },
    ],
  },
  {
    label: "Operasyon",
    collapsible: true,
    items: [
      { title: "Planlama", href: "/tasks", icon: CalendarDaysIcon },
      { title: "Aktiviteler", href: "/activities", icon: ActivityIcon },
      { title: "Ekip", href: "/team", icon: UsersRoundIcon },
    ],
  },
  {
    label: "Veri",
    collapsible: true,
    items: [
      { title: "İçe Aktar", href: "/import", icon: UploadIcon },
      { title: "Dışa Aktar", href: "/export", icon: DownloadIcon },
      { title: "Ayarlar", href: "/settings", icon: SettingsIcon },
    ],
  },
]

export const NAV_ITEMS: NavItem[] = [
  ...NAV_TOP,
  ...NAV_SECTIONS.flatMap((section) => section.items),
]

/**
 * Titles for routes that are still reachable (deep links, background entities)
 * but deliberately not shown in the sidebar — e.g. the sponsorship-process
 * (opportunity) pages, which are surfaced through Pipeline / company views.
 */
const EXTRA_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/opportunities", title: "Sponsorluk Süreci" },
]

/** Resolve the page title for a pathname (longest matching prefix wins). */
export function getPageTitle(pathname: string): string {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
  if (match) return match.title

  const extra = EXTRA_TITLES.find(
    (e) => pathname === e.prefix || pathname.startsWith(`${e.prefix}/`)
  )
  return extra?.title ?? "SponsorFlow"
}
