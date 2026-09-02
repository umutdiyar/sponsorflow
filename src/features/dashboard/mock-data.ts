import {
  Building2Icon,
  TargetIcon,
  CalendarClockIcon,
  SendIcon,
  TrophyIcon,
  WalletIcon,
} from "lucide-react"

import type {
  ActivityEntry,
  Kpi,
  PipelineRow,
  PipelineStageSummary,
  TodayTask,
} from "@/features/dashboard/types"

/**
 * Mock data for the dashboard. Every export is shaped like the result of a
 * future data query so components can switch to real fetching without a
 * rewrite. Company names are illustrative development seed data only.
 */

export const KPIS: Kpi[] = [
  {
    key: "companies",
    label: "Toplam Firma",
    value: "48",
    hint: "Bu ay +6",
    icon: Building2Icon,
  },
  {
    key: "active-opportunities",
    label: "Aktif Fırsat",
    value: "21",
    hint: "5 aşamada ilerliyor",
    icon: TargetIcon,
  },
  {
    key: "planned-meetings",
    label: "Planlanan Görüşme",
    value: "6",
    hint: "Önümüzdeki 7 gün",
    icon: CalendarClockIcon,
  },
  {
    key: "sent-proposals",
    label: "Gönderilen Teklif",
    value: "4",
    hint: "2 yanıt bekliyor",
    icon: SendIcon,
  },
  {
    key: "won-sponsors",
    label: "Kazanılan Sponsor",
    value: "2",
    hint: "Bu dönem",
    icon: TrophyIcon,
  },
  {
    key: "potential-value",
    label: "Potansiyel Değer",
    value: "₺185.000",
    hint: "Açık fırsatların toplamı",
    icon: WalletIcon,
  },
]

export const TODAY_TASKS: TodayTask[] = [
  {
    id: "t1",
    company: "Insider",
    action: "Takip maili gönder",
    owner: "Yağmur",
    due: "Bugün",
    priority: "high",
  },
  {
    id: "t2",
    company: "Microsoft",
    action: "Sponsorluk teklifini hazırla",
    owner: "Umut",
    due: "Bugün",
    priority: "normal",
  },
  {
    id: "t3",
    company: "Couchbase",
    action: "Görüşme sonrası notları ekle",
    owner: "Ecem",
    due: "Gecikmiş",
    priority: "overdue",
  },
  {
    id: "t4",
    company: "Trendyol",
    action: "İkinci iletişim kişisini teyit et",
    owner: "Yağmur",
    due: "Bugün",
    priority: "normal",
  },
]

export const PIPELINE_SUMMARY: PipelineStageSummary[] = [
  { stage: "Araştırma", count: 12 },
  { stage: "İletişim Bulundu", count: 9 },
  { stage: "İletişime Geçildi", count: 7 },
  { stage: "Yanıt Alındı", count: 5 },
  { stage: "Görüşme", count: 4 },
  { stage: "Teklif", count: 3 },
  { stage: "Müzakere", count: 2 },
  { stage: "Kazanıldı", count: 2 },
]

export const RECENT_ACTIVITIES: ActivityEntry[] = [
  {
    id: "a1",
    actor: "Yağmur",
    message: "Yağmur, Insider fırsatını Görüşme aşamasına taşıdı.",
    timeAgo: "5 dk önce",
  },
  {
    id: "a2",
    actor: "Ecem",
    message: "Ecem, Trendyol için yeni bir iletişim kişisi ekledi.",
    timeAgo: "2 saat önce",
  },
  {
    id: "a3",
    actor: "Umut",
    message: "Umut, Couchbase için takip görevi oluşturdu.",
    timeAgo: "dün",
  },
  {
    id: "a4",
    actor: "Yağmur",
    message: "Yağmur, Microsoft teklifini müzakere aşamasına güncelledi.",
    timeAgo: "2 gün önce",
  },
]

export const PIPELINE_ROWS: PipelineRow[] = [
  {
    id: "p1",
    company: "Insider",
    stage: "Görüşme",
    owner: "Yağmur",
    lastActivity: "5 dk önce",
    nextAction: "Takip maili gönder",
    value: "₺60.000",
  },
  {
    id: "p2",
    company: "Couchbase",
    stage: "Yanıt Alındı",
    owner: "Ecem",
    lastActivity: "dün",
    nextAction: "Görüşme planla",
    value: "₺35.000",
  },
  {
    id: "p3",
    company: "Microsoft",
    stage: "Müzakere",
    owner: "Umut",
    lastActivity: "2 gün önce",
    nextAction: "Teklifi revize et",
    value: "₺50.000",
  },
  {
    id: "p4",
    company: "BestCloudForMe",
    stage: "İletişime Geçildi",
    owner: "Ecem",
    lastActivity: "3 gün önce",
    nextAction: "Tanışma çağrısı ayarla",
    value: "₺20.000",
  },
  {
    id: "p5",
    company: "Parny",
    stage: "Araştırma",
    owner: "Umut",
    lastActivity: "4 gün önce",
    nextAction: "Karar vericiyi belirle",
    value: "₺20.000",
  },
]
