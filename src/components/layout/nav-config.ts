import {
  ActivityIcon,
  Building2Icon,
  DownloadIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  PackageIcon,
  SettingsIcon,
  TargetIcon,
  UploadIcon,
  UsersIcon,
  UsersRoundIcon,
  CheckSquareIcon,
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

/** Standalone links rendered above the sections. */
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
      { title: "Fırsatlar", href: "/opportunities", icon: TargetIcon },
      { title: "Pipeline", href: "/pipeline", icon: GitBranchIcon },
      { title: "Sponsorluk Paketleri", href: "/packages", icon: PackageIcon },
    ],
  },
  {
    label: "Operasyon",
    collapsible: true,
    items: [
      { title: "Görevler", href: "/tasks", icon: CheckSquareIcon },
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
    ],
  },
]

/** Standalone links rendered below the sections. */
export const NAV_BOTTOM: NavItem[] = [
  { title: "Ayarlar", href: "/settings", icon: SettingsIcon },
]

export const NAV_ITEMS: NavItem[] = [
  ...NAV_TOP,
  ...NAV_SECTIONS.flatMap((section) => section.items),
  ...NAV_BOTTOM,
]

/** Resolve the page title for a pathname (longest matching prefix wins). */
export function getPageTitle(pathname: string): string {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
  return match?.title ?? "SponsorFlow"
}
