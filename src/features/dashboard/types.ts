import type { LucideIcon } from "lucide-react"

export type PipelineStage =
  | "Araştırma"
  | "İletişim Bulundu"
  | "İletişime Geçildi"
  | "Yanıt Alındı"
  | "Görüşme"
  | "Teklif"
  | "Müzakere"
  | "Kazanıldı"

export type TaskPriority = "normal" | "high" | "overdue"

export type Kpi = {
  key: string
  label: string
  value: string
  hint: string
  icon: LucideIcon
}

export type TodayTask = {
  id: string
  company: string
  action: string
  owner: string
  due: string
  priority: TaskPriority
}

export type PipelineStageSummary = {
  stage: PipelineStage
  count: number
}

export type ActivityEntry = {
  id: string
  actor: string
  message: string
  timeAgo: string
}

export type PipelineRow = {
  id: string
  company: string
  stage: PipelineStage
  owner: string
  lastActivity: string
  nextAction: string
  value: string
}
