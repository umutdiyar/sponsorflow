"use client"

import { useEffect, useId, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { toast } from "sonner"

import { createCompany, updateCompany } from "@/features/companies/actions"
import {
  companyFormSchema,
  INDUSTRY_OPTIONS,
  SOURCE_OPTIONS,
  type CompanyFormInput,
} from "@/features/companies/schema"
import type { MemberOption } from "@/features/companies/queries"

export type CompanyFormTarget = {
  id: string
  name: string
  website: string | null
  industry: string | null
  linkedinUrl: string | null
  city: string | null
  country: string | null
  source: string | null
  ownerMembershipId: string | null
}

type CompanyFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: MemberOption[]
  /** Present = edit mode, absent = create mode. */
  company?: CompanyFormTarget | null
  onSaved?: (id: string) => void
}

function toDefaults(company?: CompanyFormTarget | null): CompanyFormInput {
  return {
    name: company?.name ?? "",
    website: company?.website ?? "",
    industry: company?.industry ?? "",
    linkedinUrl: company?.linkedinUrl ?? "",
    city: company?.city ?? "",
    country: company?.country ?? "",
    source: company?.source ?? "",
    ownerMembershipId: company?.ownerMembershipId ?? "",
  }
}

export function CompanyFormSheet({
  open,
  onOpenChange,
  members,
  company,
  onSaved,
}: CompanyFormSheetProps) {
  const router = useRouter()
  const listId = useId()
  const [isPending, startTransition] = useTransition()
  const isEdit = Boolean(company)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormInput>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: toDefaults(company),
  })

  useEffect(() => {
    if (open) reset(toDefaults(company))
  }, [open, company, reset])

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateCompany(company!.id, values)
        : await createCompany(values)

      if (result.ok) {
        toast.success(isEdit ? "Firma güncellendi." : "Firma eklendi.")
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
          <SheetTitle>{isEdit ? "Firmayı düzenle" : "Firma ekle"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Firma bilgilerini güncelle."
              : "Sponsorluk sürecine yeni bir firma ekle."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <Field label="Firma Adı" required error={errors.name?.message}>
              <Input
                autoFocus
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </Field>

            <Field label="Web Sitesi" error={errors.website?.message}>
              <Input
                placeholder="https://ornek.com"
                inputMode="url"
                aria-invalid={Boolean(errors.website)}
                {...register("website")}
              />
            </Field>

            <Field label="Sektör">
              <Input
                list={`${listId}-industry`}
                placeholder="Örn. Teknoloji & Yazılım"
                {...register("industry")}
              />
              <datalist id={`${listId}-industry`}>
                {INDUSTRY_OPTIONS.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </Field>

            <Field label="LinkedIn" error={errors.linkedinUrl?.message}>
              <Input
                placeholder="https://linkedin.com/company/…"
                inputMode="url"
                aria-invalid={Boolean(errors.linkedinUrl)}
                {...register("linkedinUrl")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Şehir">
                <Input {...register("city")} />
              </Field>
              <Field label="Ülke">
                <Input {...register("country")} />
              </Field>
            </div>

            <Field label="Kaynak">
              <Input
                list={`${listId}-source`}
                placeholder="Örn. LinkedIn"
                {...register("source")}
              />
              <datalist id={`${listId}-source`}>
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </Field>

            <Field label="Sorumlu">
              <select
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
                {...register("ownerMembershipId")}
              >
                <option value="">Atanmamış</option>
                {members.map((m) => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
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
                "Firma Ekle"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

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
