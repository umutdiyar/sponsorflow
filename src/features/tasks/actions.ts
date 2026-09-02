"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db/prisma"
import { ForbiddenError, requirePermission } from "@/lib/auth/membership"
import { parseIstanbulDate } from "@/lib/format"
import {
  taskDueSchema,
  taskFormSchema,
  taskStatusSchema,
  type TaskDueInput,
  type TaskFormInput,
  type TaskStatusInput,
} from "@/features/tasks/schema"

export type TaskActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

const GENERIC = "İşlem tamamlanamadı. Lütfen tekrar dene."

async function resolveLinks(
  organizationId: string,
  input: { companyId?: string; opportunityId?: string; assignedToMembershipId: string }
): Promise<{ companyId: string | null; opportunityId: string | null }> {
  const assignee = await prisma.organizationMembership.findFirst({
    where: { id: input.assignedToMembershipId, organizationId },
    select: { id: true },
  })
  if (!assignee) {
    throw new ForbiddenError("Seçilen sorumlu bu organizasyona ait değil.")
  }

  let companyId = input.companyId ?? null
  let opportunityId: string | null = null

  if (input.opportunityId) {
    const opp = await prisma.opportunity.findFirst({
      where: { id: input.opportunityId, organizationId },
      select: { id: true, companyId: true },
    })
    if (!opp) throw new ForbiddenError("Seçilen fırsat bulunamadı.")
    opportunityId = opp.id
    companyId = companyId ?? opp.companyId
  }

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, organizationId },
      select: { id: true },
    })
    if (!company) throw new ForbiddenError("Seçilen firma bulunamadı.")
  }

  return { companyId, opportunityId }
}

export async function createTask(
  input: TaskFormInput
): Promise<TaskActionResult> {
  const parsed = taskFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("task:create")
    const data = parsed.data
    const links = await resolveLinks(membership.organizationId, {
      companyId: data.companyId,
      opportunityId: data.opportunityId,
      assignedToMembershipId: data.assignedToMembershipId,
    })

    const created = await prisma.task.create({
      data: {
        organizationId: membership.organizationId,
        title: data.title,
        description: data.description ?? null,
        assignedToMembershipId: data.assignedToMembershipId,
        createdByMembershipId: membership.membershipId,
        companyId: links.companyId,
        opportunityId: links.opportunityId,
        priority: data.priority,
        status: data.status,
        dueAt: data.dueAt ? parseIstanbulDate(data.dueAt) : null,
        completedAt: data.status === "DONE" ? new Date() : null,
      },
      select: { id: true },
    })

    revalidateTasks(links.opportunityId, links.companyId)
    return { ok: true, id: created.id }
  } catch (error) {
    return failure(error, "createTask")
  }
}

export async function updateTask(
  id: string,
  input: TaskFormInput
): Promise<TaskActionResult> {
  const parsed = taskFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("task:update")
    const data = parsed.data

    const current = await prisma.task.findFirst({
      where: { id, organizationId: membership.organizationId },
      select: { id: true, completedAt: true },
    })
    if (!current) return { ok: false, error: "Görev bulunamadı." }

    const links = await resolveLinks(membership.organizationId, {
      companyId: data.companyId,
      opportunityId: data.opportunityId,
      assignedToMembershipId: data.assignedToMembershipId,
    })

    await prisma.task.update({
      where: { id: current.id },
      data: {
        title: data.title,
        description: data.description ?? null,
        assignedToMembershipId: data.assignedToMembershipId,
        companyId: links.companyId,
        opportunityId: links.opportunityId,
        priority: data.priority,
        status: data.status,
        dueAt: data.dueAt ? parseIstanbulDate(data.dueAt) : null,
        completedAt:
          data.status === "DONE"
            ? (current.completedAt ?? new Date())
            : null,
      },
    })

    revalidateTasks(links.opportunityId, links.companyId)
    return { ok: true, id }
  } catch (error) {
    return failure(error, "updateTask")
  }
}

export async function updateTaskStatus(
  id: string,
  input: TaskStatusInput
): Promise<TaskActionResult> {
  const parsed = taskStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: GENERIC }
  }

  try {
    const membership = await requirePermission("task:update")
    const { status } = parsed.data

    const result = await prisma.task.updateMany({
      where: { id, organizationId: membership.organizationId },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : null,
      },
    })
    if (result.count === 0) {
      return { ok: false, error: "Görev bulunamadı." }
    }
    revalidateTasks(null, null)
    return { ok: true, id }
  } catch (error) {
    return failure(error, "updateTaskStatus")
  }
}

export async function updateTaskDue(
  id: string,
  input: TaskDueInput
): Promise<TaskActionResult> {
  const parsed = taskDueSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("task:update")
    const result = await prisma.task.updateMany({
      where: { id, organizationId: membership.organizationId },
      data: {
        dueAt: parsed.data.dueAt ? parseIstanbulDate(parsed.data.dueAt) : null,
      },
    })
    if (result.count === 0) {
      return { ok: false, error: "Görev bulunamadı." }
    }
    revalidateTasks(null, null)
    return { ok: true, id }
  } catch (error) {
    return failure(error, "updateTaskDue")
  }
}

export async function archiveTask(id: string): Promise<TaskActionResult> {
  try {
    const membership = await requirePermission("task:archive")
    const result = await prisma.task.updateMany({
      where: {
        id,
        organizationId: membership.organizationId,
        archivedAt: null,
      },
      data: { archivedAt: new Date() },
    })
    if (result.count === 0) {
      return { ok: false, error: "Görev bulunamadı." }
    }
    revalidateTasks(null, null)
    return { ok: true, id }
  } catch (error) {
    return failure(error, "archiveTask")
  }
}

function revalidateTasks(
  opportunityId: string | null,
  companyId: string | null
) {
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  if (opportunityId) revalidatePath(`/opportunities/${opportunityId}`)
  if (companyId) revalidatePath(`/companies/${companyId}`)
}

function failure(
  error: unknown,
  tag: string
): { ok: false; error: string } {
  if (error instanceof ForbiddenError) {
    return { ok: false, error: error.message }
  }
  console.error(tag, error)
  return { ok: false, error: GENERIC }
}
