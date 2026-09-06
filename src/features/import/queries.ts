import "server-only"

import { prisma } from "@/lib/db/prisma"

export type ImportHistoryRow = {
  id: string
  fileName: string
  createdAt: Date
  createdByName: string
  totalRows: number
  importedRows: number
  updatedRows: number
  skippedRows: number
  failedRows: number
}

export async function listRecentImports(
  organizationId: string
): Promise<ImportHistoryRow[]> {
  const rows = await prisma.dataImport.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      fileName: true,
      createdAt: true,
      totalRows: true,
      importedRows: true,
      updatedRows: true,
      skippedRows: true,
      failedRows: true,
      createdBy: {
        select: { profile: { select: { fullName: true, email: true } } },
      },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    createdAt: r.createdAt,
    createdByName:
      r.createdBy.profile.fullName?.trim() || r.createdBy.profile.email,
    totalRows: r.totalRows,
    importedRows: r.importedRows,
    updatedRows: r.updatedRows,
    skippedRows: r.skippedRows,
    failedRows: r.failedRows,
  }))
}
