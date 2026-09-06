"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowUpRightIcon,
  ExternalLinkIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  StarIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMoney, formatTimeAgo } from "@/lib/format"
import { fetchCompanyQuickView } from "@/features/companies/search"
import { assignCompanyOwner } from "@/features/companies/actions"
import { OwnerAssignPopover } from "@/features/companies/components/owner-assign-popover"
import { ActivityIcon } from "@/features/activities/components/activity-icon"
import {
  ACTIVITY_CHANNEL_LABELS,
  ACTIVITY_KIND_LABELS,
} from "@/features/activities/schema"
import { QuickLogCommunication } from "@/features/activities/components/activity-quick-add"
import { StagePill } from "@/features/opportunities/components/stage-pill"
import type {
  CompanyQuickView,
  MemberOption,
} from "@/features/companies/queries"
import type {
  ActivityChannel,
  ActivityDirection,
  ActivityKind,
} from "@/generated/prisma/enums"

type Props = {
  companyId: string | null
  onOpenChange: (open: boolean) => void
  members: MemberOption[]
  canAssign: boolean
  canEdit: boolean
  canLogActivity: boolean
  onEdit: (companyId: string) => void
}

export function CompanyQuickViewSheet({
  companyId,
  onOpenChange,
  members,
  canAssign,
  canEdit,
  canLogActivity,
  onEdit,
}: Props) {
  const router = useRouter()
  const [state, setState] = useState<{
    id: string
    data: CompanyQuickView | null
  } | null>(null)
  const [, startAssign] = useTransition()
  const [logOpen, setLogOpen] = useState(false)

  // Fetch whenever the opened company changes. `state` carries the id it
  // belongs to so a stale response for a previous company is ignored.
  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    fetchCompanyQuickView(companyId)
      .then((result) => {
        if (!cancelled) setState({ id: companyId, data: result })
      })
      .catch(() => {
        if (!cancelled) setState({ id: companyId, data: null })
      })
    return () => {
      cancelled = true
    }
  }, [companyId])

  const data = state && state.id === companyId ? state.data : null

  function onAssign(membershipId: string | null) {
    if (!data || !state) return
    const prev = state
    const member = members.find((m) => m.membershipId === membershipId) ?? null
    setState({
      id: state.id,
      data: {
        ...data,
        owner: member
          ? { membershipId: member.membershipId, name: member.name }
          : null,
      },
    })
    startAssign(async () => {
      const result = await assignCompanyOwner(data.id, membershipId)
      if (!result.ok) {
        setState(prev)
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <Sheet
        open={companyId !== null}
        onOpenChange={(o) => {
          if (!o) onOpenChange(false)
        }}
      >
        <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
          {!data ? (
            <div className="flex flex-col gap-4 p-4">
              <SheetHeader className="sr-only">
                <SheetTitle>Firma hızlı görünümü</SheetTitle>
              </SheetHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <SheetHeader className="gap-2 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <SheetTitle className="truncate">{data.name}</SheetTitle>
                    <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {data.industry ? <span>{data.industry}</span> : null}
                      {data.website ? (
                        <a
                          href={data.website}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground inline-flex items-center gap-1"
                        >
                          {data.website.replace(/^https?:\/\//, "")}
                          <ExternalLinkIcon className="size-3" />
                        </a>
                      ) : null}
                    </SheetDescription>
                  </div>
                  <Link
                    href={`/companies/${data.id}`}
                    className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline underline-offset-2"
                  >
                    Tam sayfa
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {canLogActivity ? (
                    <Button size="sm" onClick={() => setLogOpen(true)}>
                      <PlusIcon />
                      İletişim Ekle
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.push(`/opportunities?new=1&company=${data.id}`)
                    }
                  >
                    <PlusIcon />
                    Fırsat Ekle
                  </Button>
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(data.id)}
                    >
                      <PencilIcon />
                      Düzenle
                    </Button>
                  ) : null}
                </div>
              </SheetHeader>

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
                <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Sorumlu</dt>
                  <dd>
                    <OwnerAssignPopover
                      members={members}
                      currentMembershipId={data.owner?.membershipId ?? null}
                      currentName={data.owner?.name ?? null}
                      onAssign={onAssign}
                      disabled={!canAssign}
                      variant="cell"
                    />
                  </dd>
                  <dt className="text-muted-foreground">Kaynak</dt>
                  <dd>{data.source ?? "—"}</dd>
                  <dt className="text-muted-foreground">Konum</dt>
                  <dd>
                    {[data.city, data.country].filter(Boolean).join(", ") ||
                      "—"}
                  </dd>
                  <dt className="text-muted-foreground">LinkedIn</dt>
                  <dd>
                    {data.linkedinUrl ? (
                      <a
                        href={data.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-foreground inline-flex items-center gap-1 underline underline-offset-2"
                      >
                        Profil <ExternalLinkIcon className="size-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </dl>

                <Section title={`Kişiler (${data.contacts.length})`}>
                  {data.contacts.length === 0 ? (
                    <Empty>Kişi eklenmemiş.</Empty>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {data.contacts.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="flex items-center gap-1 font-medium">
                              {c.name}
                              {c.isPrimary ? (
                                <StarIcon className="text-brand size-3" />
                              ) : null}
                            </span>
                            {c.jobTitle ? (
                              <span className="text-muted-foreground truncate text-xs">
                                {c.jobTitle}
                              </span>
                            ) : null}
                          </span>
                          {c.email ? (
                            <a
                              href={`mailto:${c.email}`}
                              aria-label={`${c.name} e-posta`}
                              className="text-muted-foreground hover:text-foreground rounded p-1"
                            >
                              <MailIcon className="size-3.5" />
                            </a>
                          ) : null}
                          {c.linkedinUrl ? (
                            <a
                              href={c.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${c.name} LinkedIn`}
                              className="text-muted-foreground hover:text-foreground rounded p-1"
                            >
                              <Share2Icon className="size-3.5" />
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section title={`Fırsatlar (${data.opportunities.length})`}>
                  {data.opportunities.length === 0 ? (
                    <Empty>Açık fırsat yok.</Empty>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {data.opportunities.map((o) => (
                        <li key={o.id}>
                          <Link
                            href={`/opportunities/${o.id}`}
                            className="hover:bg-muted -mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {o.title}
                            </span>
                            <StagePill name={o.stageName} type={o.stageType} />
                            {o.estimatedValue != null ? (
                              <span className="text-muted-foreground tabular-nums">
                                {formatMoney(o.estimatedValue, o.currency)}
                              </span>
                            ) : null}
                            <ArrowUpRightIcon className="text-muted-foreground size-3.5" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section title="Son iletişim">
                  {data.activities.length === 0 ? (
                    <Empty>Kayıt yok.</Empty>
                  ) : (
                    <ul className="flex flex-col gap-2.5">
                      {data.activities.map((a) => (
                        <li key={a.id} className="flex gap-2.5 text-sm">
                          <ActivityIcon
                            channel={a.channel as ActivityChannel}
                            direction={a.direction as ActivityDirection}
                          />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate">
                              {a.title?.trim() ||
                                `${ACTIVITY_CHANNEL_LABELS[a.channel as ActivityChannel]} · ${ACTIVITY_KIND_LABELS[a.kind as ActivityKind]}`}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                              {a.author}
                              {a.contactName ? ` · ${a.contactName}` : ""} ·{" "}
                              {formatTimeAgo(a.occurredAt)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {data ? (
        <QuickLogCommunication
          open={logOpen}
          onOpenChange={setLogOpen}
          companyId={data.id}
          contacts={data.contacts.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            linkedinUrl: c.linkedinUrl,
          }))}
          onLogged={(activity) => {
            setState((s) =>
              s && s.data
                ? {
                    id: s.id,
                    data: {
                      ...s.data,
                      activities: [
                        {
                          id: activity.id,
                          channel: activity.channel,
                          kind: activity.kind,
                          direction: activity.direction,
                          title: activity.title,
                          description: activity.description,
                          occurredAt: activity.occurredAt,
                          author: activity.author,
                          contactName: activity.contactName,
                        },
                        ...s.data.activities,
                      ],
                    },
                  }
                : s
            )
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>
}
