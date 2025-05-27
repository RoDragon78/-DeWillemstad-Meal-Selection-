"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ArrowDown, ArrowUp, Download, Search, X, Edit, Trash2, Home, Save } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type SortDirection = "asc" | "desc"
type SortField = "guest_name" | "cabin_nr" | "booking_number" | "table_nr" | "nationality"
type FilterType = "all" | "assigned" | "unassigned" | "table"

export function GuestList() {
  const [guests, setGuests] = useState<any[]>([])
  const [filteredGuests, setFilteredGuests] = useState<any[]>([])
  const [sortField, setSortField] = useState<SortField>("guest_name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [filterTable, setFilterTable] = useState<string>("")
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [availableTables, setAvailableTables] = useState<number[]>([])
  const tableRef = useRef<HTMLTableElement>(null)
  const supabase = createClientComponentClient()

  const [filterNationality, setFilterNationality] = useState("")
  const [availableNationalities, setAvailableNationalities] = useState([])

  const [editingGuestId, setEditingGuestId] = useState(null)
  const [editedGuestData, setEditedGuestData] = useState({})
  const [saving, setSaving] = useState(false)

  // Fetch all guests
  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .order(sortField, { ascending: sortDirection === "asc" })

      if (error) {
        console.error("Error fetching guests:", error)
        throw error
      }
      setGuests(data || [])

      // Get unique table numbers
      const tables = Array.from(new Set(data?.map((g) => g.table_nr).filter(Boolean) || []))
      tables.sort((a, b) => a - b)
      setAvailableTables(tables)

      // Get unique nationalities
      const nationalities = Array.from(new Set(data?.map((g) => g.nationality).filter(Boolean) || []))
      nationalities.sort()
      setAvailableNationalities(nationalities)
    } catch (error) {
      console.error("Error fetching guests:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase, sortField, sortDirection])

  const handleCabinChange = async (guestId, newCabinNumber) => {
    try {
      if (!newCabinNumber.trim()) {
        alert("Cabin number cannot be empty.")
        return
      }

      const { error } = await supabase
        .from("guest_manifest")
        .update({ cabin_nr: newCabinNumber.trim() })
        .eq("id", guestId)

      if (error) {
        console.error("Error updating cabin:", error)
        throw error
      }

      await fetchGuests()
      alert("Cabin number updated successfully.")
    } catch (error) {
      console.error("Error updating cabin:", error)
      alert("Failed to update cabin number.")
    }
  }

  // Apply filters and search
  useEffect(() => {
    if (!guests.length) return

    let result = [...guests]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (guest) =>
          (guest.guest_name && guest.guest_name.toLowerCase().includes(term)) ||
          (guest.cabin_nr && guest.cabin_nr.toLowerCase().includes(term)) ||
          (guest.booking_number && guest.booking_number.toLowerCase().includes(term)) ||
          (guest.nationality && guest.nationality.toLowerCase().includes(term)) ||
          (guest.table_nr && guest.table_nr.toString().includes(term)),
      )
    }

    // Apply type filter
    if (filterType === "assigned") {
      result = result.filter((guest) => guest.table_nr !== null)
    } else if (filterType === "unassigned") {
      result = result.filter((guest) => guest.table_nr === null)
    } else if (filterType === "table" && filterTable) {
      result = result.filter((guest) => guest.table_nr === Number.parseInt(filterTable))
    }

    // Apply nationality filter
    if (filterNationality) {
      result = result.filter((guest) => guest.nationality === filterNationality)
    }

    // Calculate total pages
    setTotalPages(Math.max(1, Math.ceil(result.length / pageSize)))

    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize
    const paginatedResult = result.slice(startIndex, startIndex + pageSize)

    setFilteredGuests(paginatedResult)

    // Reset to first page if filters reduce the page count
    if (currentPage > Math.ceil(result.length / pageSize)) {
      setCurrentPage(1)
    }
  }, [guests, searchTerm, filterType, filterTable, filterNationality, currentPage, pageSize])

  // Set up real-time subscription
  useEffect(() => {
    fetchGuests()

    const subscription = supabase
      .channel("guest_list_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "guest_manifest" }, () => fetchGuests())
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchGuests])

  // Handle sort change
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      // Scroll to top of table
      if (tableRef.current) {
        tableRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  const handleDeleteGuest = async (guestId) => {
    if (window.confirm("Are you sure you want to delete this guest?")) {
      try {
        const { error } = await supabase.from("guest_manifest").delete().eq("id", guestId)

        if (error) {
          console.error("Error deleting guest:", error)
          throw error
        }

        setGuests((prevGuests) => prevGuests.filter((guest) => guest.id !== guestId))
        await fetchGuests()
      } catch (error) {
        console.error("Error deleting guest:", error)
        alert("Failed to delete guest. Please try again.")
      }
    }
  }

  const handleBulkAssignment = async () => {
    alert("Bulk assignment is disabled in this simplified version.")
  }

  // Export to CSV
  const exportToCSV = () => {
    // Get all guests (not just the filtered/paginated ones)
    let dataToExport = [...guests]

    // Apply filters but not pagination
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      dataToExport = dataToExport.filter(
        (guest) =>
          (guest.guest_name && guest.guest_name.toLowerCase().includes(term)) ||
          (guest.cabin_nr && guest.cabin_nr.toLowerCase().includes(term)) ||
          (guest.booking_number && guest.booking_number.toLowerCase().includes(term)) ||
          (guest.nationality && guest.nationality.toLowerCase().includes(term)) ||
          (guest.table_nr && guest.table_nr.toString().includes(term)),
      )
    }

    if (filterType === "assigned") {
      dataToExport = dataToExport.filter((guest) => guest.table_nr !== null)
    } else if (filterType === "unassigned") {
      dataToExport = dataToExport.filter((guest) => guest.table_nr === null)
    } else if (filterType === "table" && filterTable) {
      dataToExport = dataToExport.filter((guest) => guest.table_nr === Number.parseInt(filterTable))
    }

    if (filterNationality) {
      dataToExport = dataToExport.filter((guest) => guest.nationality === filterNationality)
    }

    // Create CSV content with meal data
    const headers = ["Guest Name", "Cabin", "Booking Number", "Table", "Nationality"]
    const csvContent = [
      headers.join(","),
      ...dataToExport.map((guest) => {
        return [
          `"${guest.guest_name || ""}"`,
          `"${guest.cabin_nr || ""}"`,
          `"${guest.booking_number || ""}"`,
          guest.table_nr || "",
          `"${guest.nationality || ""}"`,
        ].join(",")
      }),
    ].join("\n")

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `guest_list_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setFilterType("all")
    setFilterTable("")
    setFilterNationality("")
    setCurrentPage(1)
  }

  const startEditGuest = (guest) => {
    setEditingGuestId(guest.id)
    setEditedGuestData({
      guest_name: guest.guest_name,
      cabin_nr: guest.cabin_nr,
      booking_number: guest.booking_number,
      table_nr: guest.table_nr,
      nationality: guest.nationality,
    })
  }

  const cancelEdit = () => {
    setEditingGuestId(null)
    setEditedGuestData({})
  }

  const handleInputChange = (e, field) => {
    setEditedGuestData({
      ...editedGuestData,
      [field]: e.target.value,
    })
  }

  const saveGuestChanges = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from("guest_manifest")
        .update(editedGuestData)
        .eq("id", editingGuestId)
        .select()

      if (error) {
        console.error("Error updating guest:", error)
        throw error
      }

      setGuests((prevGuests) =>
        prevGuests.map((guest) => (guest.id === editingGuestId ? { ...guest, ...editedGuestData } : guest)),
      )

      setEditingGuestId(null)
      setEditedGuestData({})
      await fetchGuests()
    } catch (error) {
      console.error("Error updating guest:", error)
      alert("Failed to update guest. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Guest List</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search guests..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1) // Reset to first page on search
            }}
            className="pl-8"
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="w-40">
            <Select
              value={filterType}
              onValueChange={(value) => {
                setFilterType(value as FilterType)
                setCurrentPage(1) // Reset to first page on filter change
                if (value !== "table") setFilterTable("")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Guests</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="table">By Table</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterType === "table" && (
            <div className="w-32">
              <Select
                value={filterTable}
                onValueChange={(value) => {
                  setFilterTable(value)
                  setCurrentPage(1) // Reset to first page on filter change
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Table" />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table) => (
                    <SelectItem key={table} value={table.toString()}>
                      Table {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-40">
            <Select
              value={filterNationality}
              onValueChange={(value) => {
                setFilterNationality(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nationality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nationalities</SelectItem>
                {availableNationalities.map((nationality) => (
                  <SelectItem key={nationality} value={nationality}>
                    {nationality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || filterType !== "all" || filterTable || filterNationality) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="flex items-center gap-1">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size={24} text="Loading guest list..." />
      ) : (
        <>
          <div className="overflow-x-auto border rounded-lg">
            <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { id: "guest_name", label: "Guest Name" },
                    { id: "cabin_nr", label: "Cabin" },
                    { id: "booking_number", label: "Booking" },
                    { id: "table_nr", label: "Table" },
                    { id: "nationality", label: "Nationality" },
                    { id: "actions", label: "Actions" },
                  ].map((column) => (
                    <th
                      key={column.id}
                      onClick={() => column.id !== "actions" && handleSort(column.id as SortField)}
                      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.id !== "actions" ? "cursor-pointer hover:bg-gray-100" : ""
                      }`}
                    >
                      <div className="flex items-center">
                        {column.label}
                        {sortField === column.id && column.id !== "actions" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGuests.length > 0 ? (
                  filteredGuests.map((guest) => {
                    const isEditing = editingGuestId === guest.id
                    return (
                      <tr key={guest.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <Input
                              value={editedGuestData.guest_name || ""}
                              onChange={(e) => handleInputChange(e, "guest_name")}
                            />
                          ) : (
                            guest.guest_name || "Unknown"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <Input
                              value={editedGuestData.cabin_nr || ""}
                              onChange={(e) => handleInputChange(e, "cabin_nr")}
                            />
                          ) : (
                            guest.cabin_nr || "Unknown"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <Input
                              value={editedGuestData.booking_number || ""}
                              onChange={(e) => handleInputChange(e, "booking_number")}
                            />
                          ) : (
                            guest.booking_number || "Unknown"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <Input
                              value={editedGuestData.table_nr || ""}
                              onChange={(e) => handleInputChange(e, "table_nr")}
                            />
                          ) : guest.table_nr ? (
                            <span className="font-medium">{guest.table_nr}</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <Input
                              value={editedGuestData.nationality || ""}
                              onChange={(e) => handleInputChange(e, "nationality")}
                            />
                          ) : (
                            guest.nationality || "Unknown"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="col-span-1 flex gap-1">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-green-600"
                                  onClick={saveGuestChanges}
                                  disabled={saving}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancelEdit}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => startEditGuest(guest)}
                                  title="Edit guest details"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                                  onClick={() => {
                                    const newCabin = prompt(`Change cabin for ${guest.guest_name}:`, guest.cabin_nr)
                                    if (newCabin && newCabin !== guest.cabin_nr) {
                                      handleCabinChange(guest.id, newCabin)
                                    }
                                  }}
                                  title="Change cabin number"
                                >
                                  <Home className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteGuest(guest.id)}
                                  title="Delete guest"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                      No guests found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {filteredGuests.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, guests.length)} of {guests.length} guests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum = currentPage
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="mx-1">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handlePageChange(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number.parseInt(value))
                  setCurrentPage(1) // Reset to first page when changing page size
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
