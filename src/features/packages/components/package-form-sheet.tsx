"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { createPackage, updatePackage } from "@/features/packages/actions"
import {
  CURRENCY_OPTIONS,
  packageFormSchema,
} from "@/features/packages/schema"
import type { PackageRow } from "@/features/packages/queries"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pkg?: PackageRow | null
  onSaved?: (id: string) => void
}

const selectClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"

export function PackageFormSheet({
  open,
  onOpenChange,
  pkg,
  onSaved,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = Boolean(pkg)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [currency, setCurrency] = useState("TRY")
  const [benefitsText, setBenefitsText] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Seed the fields from `pkg` each time the sheet opens.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setName(pkg?.name ?? "")
      setDescription(pkg?.description ?? "")
      setPrice(pkg?.price != null ? String(pkg.price) : "")
      setCurrency(pkg?.currency ?? "TRY")
      setBenefitsText((pkg?.benefits ?? []).join("\n"))
      setIsActive(pkg?.isActive ?? true)
      setError(null)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const benefits = benefitsText
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean)

    const parsed = packageFormSchema.safeParse({
      name,
      description,
      price,
      currency,
      benefits,
      isActive,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Form geçersiz.")
      return
    }

    startTransition(async () => {
      const result = isEdit
        ? await updatePackage(pkg!.id, parsed.data)
        : await createPackage(parsed.data)
      if (result.ok) {
        toast.success(isEdit ? "Paket güncellendi." : "Paket oluşturuldu.")
        onOpenChange(false)
        router.refresh()
        onSaved?.(result.id)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>
            {isEdit ? "Paketi düzenle" : "Sponsorluk paketi ekle"}
          </SheetTitle>
          <SheetDescription>
            Sponsorlara sunduğun seviyeyi ve sağlanan avantajları tanımla.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <Field label="Paket Adı" required>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Altın Sponsor"
              />
            </Field>

            <Field label="Açıklama">
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <Field label="Fiyat">
                <Input
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="50000"
                />
              </Field>
              <Field label="Para Birimi">
                <select
                  className={selectClass}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Avantajlar (her satıra bir madde)">
              <Textarea
                rows={5}
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
                placeholder={"Sahne konuşması\nStant alanı\nLogo görünürlüğü"}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
              />
              Aktif (fırsatlarda seçilebilir)
            </label>

            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : null}
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
                "Paket Ekle"
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
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  )
}
