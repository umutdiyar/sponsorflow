import {
  ActivityIcon,
  Building2Icon,
  DownloadIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
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
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Genel",
    items: [
      { title: "Genel Bakış", href: "/dashboard", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "Firmalar", href: "/companies", icon: Building2Icon },
      { title: "Kişiler", href: "/contacts", icon: UsersIcon },
      { title: "Fırsatlar", href: "/opportunities", icon: TargetIcon },
      { title: "Pipeline", href: "/pipeline", icon: GitBranchIcon },
      { title: "Aktiviteler", href: "/activities", icon: ActivityIcon },
    ],
  },
  {
    label: "Sponsorluk",
    items: [
      { title: "Kampanyalar", href: "/campaigns", icon: MegaphoneIcon },
      { title: "Sponsorluk Paketleri", href: "/packages", icon: PackageIcon },
    ],
  },
  {
    label: "Ekip",
    items: [
      { title: "Görevler", href: "/tasks", icon: CheckSquareIcon },
      { title: "Ekip", href: "/team", icon: UsersRoundIcon },
    ],
  },
  {
    label: "Veri",
    items: [
      { title: "İçe Aktar", href: "/import", icon: UploadIcon },
      { title: "Dışa Aktar", href: "/export", icon: DownloadIcon },
    ],
  },
  {
    label: "Yönetim",
    items: [{ title: "Ayarlar", href: "/settings", icon: SettingsIcon }],
  },
]

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(
  (section) => section.items
)

/** Resolve the page title for a pathname (longest matching prefix wins). */
export function getPageTitle(pathname: string): string {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
  return match?.title ?? "SponsorFlow"
}
