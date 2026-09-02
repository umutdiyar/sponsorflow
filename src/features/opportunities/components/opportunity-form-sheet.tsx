"use client"

import { useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { toDateInputValue } from "@/lib/format"
import {
  createOpportunity,
  updateOpportunity,
} from "@/features/opportunities/actions"
import {
  opportunityFormSchema,
  type OpportunityFormInput,
} from "@/features/opportunities/schema"
import type {
  CompanyRef,
  MemberRef,
  PackageRef,
  StageRef,
} from "@/lib/org/reference"

export type OpportunityFormTarget = {
  id: string
  companyId: string
  title: string
  ownerMembershipId: string
  stageId: string
  packageId: string | null
  estimatedValue: number | null
  probability: number | null
  nextAction: string | null
  nextActionAt: Date | null
  expectedCloseDate: Date | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: CompanyRef[]
  members: MemberRef[]
  stages: StageRef[]
  packages: PackageRef[]
  opportunity?: OpportunityFormTarget | null
  defaultCompanyId?: string
  onSaved?: (id: string) => void
}

function toDefaults(
  target: OpportunityFormTarget | null | undefined,
  fallbackStageId: string,
  defaultCompanyId?: string
): OpportunityFormInput {
  return {
    companyId: target?.companyId ?? defaultCompanyId ?? "",
    title: target?.title ?? "",
    ownerMembershipId: target?.ownerMembershipId ?? "",
    stageId: target?.stageId ?? fallbackStageId,
    packageId: target?.packageId ?? "",
    estimatedValue:
      target?.estimatedValue != null ? String(target.estimatedValue) : "",
    probability:
      target?.probability != null ? String(target.probability) : "",
    nextAction: target?.nextAction ?? "",
    nextActionAt: target?.nextActionAt
      ? toDateInputValue(target.nextActionAt)
      : "",
    expectedCloseDate: target?.expectedCloseDate
      ? toDateInputValue(target.expectedCloseDate)
      : "",
  }
}

export function OpportunityFormSheet({
  open,
  onOpenChange,
  companies,
  members,
  stages,
  packages,
  opportunity,
  defaultCompanyId,
  onSaved,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = Boolean(opportunity)

  const fallbackStageId =
    stages.find((s) => s.type === "OPEN")?.id ?? stages[0]?.id ?? ""

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpportunityFormInput>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: toDefaults(opportunity, fallbackStageId, defaultCompanyId),
  })

  useEffect(() => {
    if (open) {
      reset(toDefaults(opportunity, fallbackStageId, defaultCompanyId))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opportunity, defaultCompanyId])

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateOpportunity(opportunity!.id, values)
        : await createOpportunity(values)

      if (result.ok) {
        toast.success(isEdit ? "Fırsat güncellendi." : "Fırsat oluşturuldu.")
        onOpenChange(false)
        router.refresh()
        onSaved?.(result.id)
      } else {
        toast.error(result.error)
      }
    })
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>
            {isEdit ? "Fırsatı düzenle" : "Fırsat oluştur"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Sponsorluk görüşmesinin bilgilerini güncelle."
              : "Bir firmayla yürütülecek sponsorluk sürecini başlat."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <Field label="Firma" required error={errors.companyId?.message}>
              <select
                className={selectClass}
                aria-invalid={Boolean(errors.companyId)}
                {...register("companyId")}
              >
                <option value="">Firma seç…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Başlık" required error={errors.title?.message}>
              <Input
                autoFocus
                placeholder="Örn. 2026 Bahar Zirvesi sponsorluğu"
                aria-invalid={Boolean(errors.title)}
                {...register("title")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Aşama" required error={errors.stageId?.message}>
                <select
                  className={selectClass}
                  aria-invalid={Boolean(errors.stageId)}
                  {...register("stageId")}
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Sorumlu"
                required
                error={errors.ownerMembershipId?.message}
              >
                <select
                  className={selectClass}
                  aria-invalid={Boolean(errors.ownerMembershipId)}
                  {...register("ownerMembershipId")}
                >
                  <option value="">Seç…</option>
                  {members.map((m) => (
                    <option key={m.membershipId} value={m.membershipId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Sponsorluk Paketi">
              <select className={selectClass} {...register("packageId")}>
                <option value="">Paket yok</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Tahmini Değer"
                error={errors.estimatedValue?.message}
              >
                <Input
                  inputMode="numeric"
                  placeholder="50000"
                  {...register("estimatedValue")}
                />
              </Field>
              <Field
                label="Olasılık (%)"
                error={errors.probability?.message}
              >
                <Input
                  inputMode="numeric"
                  placeholder="40"
                  {...register("probability")}
                />
              </Field>
            </div>

            <Field label="Sonraki Aksiyon" error={errors.nextAction?.message}>
              <Textarea
                rows={2}
                placeholder="Örn. Teklif dokümanını e-posta ile gönder"
                {...register("nextAction")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Sonraki Aksiyon Tarihi"
                error={errors.nextActionAt?.message}
              >
                <Input type="date" {...register("nextActionAt")} />
              </Field>
              <Field
                label="Beklenen Kapanış"
                error={errors.expectedCloseDate?.message}
              >
                <Input type="date" {...register("expectedCloseDate")} />
              </Field>
            </div>
          </div>

          <SheetFooter className="flex-row justify-end border-t">
            <SheetClose
              render={<Button type="button" variant="outline" />}
              disabled={isPending}
            >
              Vazgeç
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Kaydediliyor…
                </>
              ) : isEdit ? (
                "Kaydet"
              ) : (
                "Fırsat Oluştur"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

const selectClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </label>
  )
}
