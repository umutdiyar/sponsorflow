"use client"

import { useEffect, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { createContact } from "@/features/contacts/actions"
import type { CreatedContact } from "@/features/contacts/actions"
import {
  contactFormSchema,
  type ContactFormInput,
} from "@/features/contacts/schema"

type ContactFormSheetProps = {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (contact: CreatedContact) => void
}

const EMPTY: ContactFormInput = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  department: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  notes: "",
  isPrimary: false,
}

export function ContactFormSheet({
  companyId,
  open,
  onOpenChange,
  onCreated,
}: ContactFormSheetProps) {
  const [isPending, startTransition] = useTransition()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) reset(EMPTY)
  }, [open, reset])

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await createContact(companyId, values)
      if (result.ok) {
        toast.success("Kişi eklendi.")
        onCreated(result.contact)
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    })
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Kişi ekle</SheetTitle>
          <SheetDescription>
            Firmadaki bir iletişim kişisini kaydet.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ad" required error={errors.firstName?.message}>
                <Input
                  autoFocus
                  aria-invalid={Boolean(errors.firstName)}
                  {...register("firstName")}
                />
              </Field>
              <Field label="Soyad" required error={errors.lastName?.message}>
                <Input
                  aria-invalid={Boolean(errors.lastName)}
                  {...register("lastName")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pozisyon">
                <Input {...register("jobTitle")} />
              </Field>
              <Field label="Departman">
                <Input {...register("department")} />
              </Field>
            </div>

            <Field label="E-posta" error={errors.email?.message}>
              <Input
                inputMode="email"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefon">
                <Input inputMode="tel" {...register("phone")} />
              </Field>
              <Field label="LinkedIn" error={errors.linkedinUrl?.message}>
                <Input
                  inputMode="url"
                  aria-invalid={Boolean(errors.linkedinUrl)}
                  {...register("linkedinUrl")}
                />
              </Field>
            </div>

            <Field label="Notlar" error={errors.notes?.message}>
              <Textarea rows={3} {...register("notes")} />
            </Field>

            <Controller
              control={control}
              name="isPrimary"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  Birincil iletişim kişisi
                </label>
              )}
            />
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
              ) : (
                "Kişi Ekle"
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
