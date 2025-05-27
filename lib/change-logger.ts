export interface ChangeLogEntry {
  id: string
  timestamp: string
  action_type: "CREATE" | "UPDATE" | "DELETE" | "BULK_OPERATION" | "IMPORT" | "SYSTEM"
  operation: string
  affected_guests: {
    id: string
    name: string
    cabin: string
  }[]
  changes: {
    field: string
    old_value: any
    new_value: any
  }[]
  description: string
  method: "MANUAL" | "BULK" | "IMPORT" | "AUTO_ASSIGN" | "API"
  user_action: string
  batch_id?: string
  file_name?: string
  error_details?: string
  affected_count?: number
}

interface LogChangeParams {
  type: "CREATE" | "UPDATE" | "DELETE" | "BULK_OPERATION" | "IMPORT" | "SYSTEM"
  operation: string
  guests?: Array<{
    id: string
    name: string
    cabin: string
  }>
  changes?: Array<{
    field: string
    old_value: any
    new_value: any
  }>
  method: "MANUAL" | "BULK" | "IMPORT" | "AUTO_ASSIGN" | "API"
  userAction: string
  batchId?: string
  fileName?: string
  errorDetails?: string
  affectedCount?: number
  additionalContext?: Record<string, any>
}

const generateDetailedDescription = (params: LogChangeParams): string => {
  const { operation, guests, changes, affectedCount, fileName, additionalContext } = params

  switch (operation) {
    case "CREATE_GUEST":
      if (guests && guests.length > 0) {
        const guest = guests[0]
        const nationality = additionalContext?.nationality || "Unknown"
        const booking = additionalContext?.booking_number || "No booking"
        return `Guest '${guest.name}' added to Cabin ${guest.cabin} (Nationality: ${nationality}, Booking: ${booking})`
      }
      return "New guest added to manifest"

    case "ASSIGN_TABLE":
      if (guests && guests.length > 0 && changes && changes.length > 0) {
        const guest = guests[0]
        const tableChange = changes.find((c) => c.field === "table_nr")
        if (tableChange) {
          const oldTable = tableChange.old_value
          const newTable = tableChange.new_value
          return `Guest '${guest.name}' (Cabin ${guest.cabin}) ${
            oldTable ? `moved from Table ${oldTable} to` : "assigned to"
          } Table ${newTable}`
        }
      }
      return "Table assignment updated"

    case "ASSIGN_CABIN_TO_TABLE":
      if (affectedCount && additionalContext?.cabin && additionalContext?.table) {
        return `Cabin ${additionalContext.cabin} (${affectedCount} guests) assigned to Table ${additionalContext.table}`
      }
      return "Cabin assigned to table"

    case "REMOVE_FROM_TABLE":
      if (guests && guests.length > 0 && additionalContext?.table) {
        const guest = guests[0]
        return `Guest '${guest.name}' (Cabin ${guest.cabin}) removed from Table ${additionalContext.table}`
      }
      return "Guest removed from table"

    case "UPDATE_CABIN":
      if (guests && guests.length > 0 && changes && changes.length > 0) {
        const guest = guests[0]
        const cabinChange = changes.find((c) => c.field === "cabin_nr")
        if (cabinChange) {
          return `Guest '${guest.name}' cabin changed from ${cabinChange.old_value} to ${cabinChange.new_value}`
        }
      }
      return "Cabin assignment changed"

    case "UPDATE_NATIONALITY":
      if (guests && guests.length > 0 && changes && changes.length > 0) {
        const guest = guests[0]
        const nationalityChange = changes.find((c) => c.field === "nationality")
        if (nationalityChange) {
          return `Guest '${guest.name}' (Cabin ${guest.cabin}) nationality updated from '${nationalityChange.old_value}' to '${nationalityChange.new_value}'`
        }
      }
      return "Guest nationality updated"

    case "DELETE_GUEST":
      if (guests && guests.length > 0) {
        const guest = guests[0]
        const table = additionalContext?.table_nr ? `, Table ${additionalContext.table_nr}` : ""
        return `Guest '${guest.name}' (Cabin ${guest.cabin}${table}) removed from manifest`
      }
      return "Guest removed from manifest"

    case "BULK_IMPORT":
      const successCount = additionalContext?.successCount || 0
      const errorCount = additionalContext?.errorCount || 0
      return `Bulk import from '${fileName}': ${successCount} guests imported successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}`

    case "AUTO_ASSIGN_TABLES":
      const assignedCount = affectedCount || 0
      const tableCount = additionalContext?.tableCount || 0
      return `Automatic table assignment: ${assignedCount} guests distributed across ${tableCount} tables using optimization algorithm`

    case "CLEAR_ALL_ASSIGNMENTS":
      const clearedCount = affectedCount || 0
      const clearedTables = additionalContext?.tableCount || 0
      return `All table assignments cleared: ${clearedCount} guests unassigned from ${clearedTables} tables`

    case "BULK_CABIN_UPDATE":
      const updatedCount = affectedCount || 0
      const prefix = additionalContext?.prefix || ""
      return `Bulk cabin update: ${updatedCount} guests updated with prefix '${prefix}'`

    case "CABIN_SWAP":
      const cabin1 = additionalContext?.cabin1 || ""
      const cabin2 = additionalContext?.cabin2 || ""
      return `Cabin swap completed: Guests in Cabin ${cabin1} ↔ Cabin ${cabin2}`

    default:
      return `${operation}: ${affectedCount || guests?.length || 1} record(s) affected`
  }
}

export const logChange = async (params: LogChangeParams): Promise<void> => {
  try {
    const entry: ChangeLogEntry = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action_type: params.type,
      operation: params.operation,
      affected_guests: params.guests || [],
      changes: params.changes || [],
      description: generateDetailedDescription(params),
      method: params.method,
      user_action: params.userAction,
      batch_id: params.batchId,
      file_name: params.fileName,
      error_details: params.errorDetails,
      affected_count: params.affectedCount,
    }

    // Store in localStorage for now (in production, this would go to a database)
    const existingLogs = getChangeHistory()
    const updatedLogs = [entry, ...existingLogs].slice(0, 1000) // Keep last 1000 entries

    if (typeof window !== "undefined") {
      localStorage.setItem("dewillemstad_change_history", JSON.stringify(updatedLogs))
    }

    console.log("Change logged:", entry)
  } catch (error) {
    console.error("Failed to log change:", error)
  }
}

export const getChangeHistory = (): ChangeLogEntry[] => {
  try {
    if (typeof window === "undefined") return []

    const stored = localStorage.getItem("dewillemstad_change_history")
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error("Failed to get change history:", error)
    return []
  }
}

export const clearChangeHistory = (): void => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("dewillemstad_change_history")
    }
  } catch (error) {
    console.error("Failed to clear change history:", error)
  }
}

// Helper function to generate batch ID for related operations
export const generateBatchId = (): string => {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Helper function to extract guest data for logging
export const extractGuestData = (guest: any) => ({
  id: guest.id,
  name: guest.guest_name || "Unknown",
  cabin: guest.cabin_nr || "Unknown",
})
