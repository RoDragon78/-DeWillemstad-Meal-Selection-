"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Search, Plus, Trash2, Edit, Save, X, Download, AlertCircle, CheckCircle, Users, Settings } from "lucide-react"

import { logChange, extractGuestData } from "@/lib/change-logger"

interface Guest {
  id: string
  guest_name: string
  cabin_nr: string
  nationality: string
  booking_number: string
  cruise_id: string
  table_nr?: number
}

interface GuestManifestEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDataChange?: () => void
}

export function GuestManifestEditor({ open, onOpenChange, onDataChange }: GuestManifestEditorProps) {
  const supabase = createClientComponentClient()
  const [activeTab, setActiveTab] = useState("manage-guests")
  const [guests, setGuests] = useState<Guest[]>([])
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    nationality: "all",
    tableStatus: "all",
  })

  // Advanced features state
  const [availableNationalities, setAvailableNationalities] = useState<string[]>([])
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set())
  const [editingGuest, setEditingGuest] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<Guest>>({})

  // Add guest form state
  const [newGuest, setNewGuest] = useState<Partial<Guest>>({
    guest_name: "",
    cabin_nr: "",
    nationality: "",
    booking_number: "",
    cruise_id: "",
  })

  // Virtual scrolling state
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 })
  const itemHeight = 45
  const containerHeight = 400
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Fetch guests from database
  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("guest_manifest").select("*").order("guest_name", { ascending: true })

      if (error) {
        console.error("Error fetching guests:", error)
        throw error
      }

      setGuests(data || [])

      const nationalities = Array.from(new Set(data?.map((g) => g.nationality).filter(Boolean) || []))
      setAvailableNationalities(nationalities.sort())
    } catch (error) {
      console.error("Error fetching guests:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to fetch guest data. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Apply filters
  useEffect(() => {
    let result = [...guests]

    if (filters.search) {
      const term = filters.search.toLowerCase()
      result = result.filter(
        (guest) =>
          guest.guest_name?.toLowerCase().includes(term) ||
          guest.cabin_nr?.toLowerCase().includes(term) ||
          guest.nationality?.toLowerCase().includes(term),
      )
    }

    if (filters.nationality !== "all") {
      result = result.filter((guest) => guest.nationality === filters.nationality)
    }

    if (filters.tableStatus !== "all") {
      if (filters.tableStatus === "assigned") {
        result = result.filter((guest) => guest.table_nr)
      } else if (filters.tableStatus === "unassigned") {
        result = result.filter((guest) => !guest.table_nr)
      }
    }

    setFilteredGuests(result)
    setVisibleRange({ start: 0, end: Math.min(100, result.length) })
  }, [guests, filters])

  // Virtual scrolling handler
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, clientHeight } = event.currentTarget
      const start = Math.floor(scrollTop / itemHeight)
      const end = Math.min(start + Math.ceil(clientHeight / itemHeight) + 10, filteredGuests.length)
      setVisibleRange({ start, end })
    },
    [filteredGuests.length, itemHeight],
  )

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      fetchGuests()
    }
  }, [open, fetchGuests])

  // Add new guest
  const handleAddGuest = async () => {
    if (!newGuest.guest_name || !newGuest.cabin_nr) {
      setStatusMessage({
        type: "error",
        message: "Guest name and cabin number are required.",
      })
      return
    }

    try {
      setSaving(true)
      const { data: insertedGuest, error } = await supabase.from("guest_manifest").insert([newGuest]).select().single()

      if (error) {
        console.error("Error adding guest:", error)
        throw error
      }

      // Log the guest creation
      if (insertedGuest) {
        await logChange({
          type: "CREATE",
          operation: "CREATE_GUEST",
          guests: [extractGuestData(insertedGuest)],
          method: "MANUAL",
          userAction: "Added new guest via Guest Manifest Editor",
          additionalContext: {
            nationality: insertedGuest.nationality,
            booking_number: insertedGuest.booking_number,
            cruise_id: insertedGuest.cruise_id,
          },
        })
      }

      setNewGuest({
        guest_name: "",
        cabin_nr: "",
        nationality: "",
        booking_number: "",
        cruise_id: "",
      })
      await fetchGuests()
      onDataChange?.()

      setStatusMessage({
        type: "success",
        message: "Guest added successfully.",
      })
    } catch (error) {
      console.error("Error adding guest:", error)

      // Log the error
      await logChange({
        type: "SYSTEM",
        operation: "CREATE_GUEST",
        method: "MANUAL",
        userAction: "Attempted to add new guest",
        errorDetails: error.message,
        additionalContext: {
          attempted_name: newGuest.guest_name,
          attempted_cabin: newGuest.cabin_nr,
        },
      })

      setStatusMessage({
        type: "error",
        message: "Failed to add guest. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  // Save guest changes
  const saveGuestChanges = async () => {
    if (!editingGuest || !editingData) return

    try {
      setSaving(true)

      // Get the original guest data for comparison
      const originalGuest = guests.find((g) => g.id === editingGuest)
      if (!originalGuest) {
        throw new Error("Original guest data not found")
      }

      // Calculate what changed
      const changes = []
      const fieldsToCheck = ["guest_name", "cabin_nr", "nationality", "booking_number", "cruise_id", "table_nr"]

      fieldsToCheck.forEach((field) => {
        const oldValue = originalGuest[field]
        const newValue = editingData[field]
        if (oldValue !== newValue) {
          changes.push({
            field: field,
            old_value: oldValue,
            new_value: newValue,
          })
        }
      })

      if (changes.length === 0) {
        setEditingGuest(null)
        setEditingData({})
        return
      }

      const { error } = await supabase.from("guest_manifest").update(editingData).eq("id", editingGuest)

      if (error) {
        console.error("Error updating guest:", error)
        throw error
      }

      // Log each field change
      for (const change of changes) {
        let operation = "UPDATE_GUEST"
        if (change.field === "table_nr") operation = "ASSIGN_TABLE"
        else if (change.field === "cabin_nr") operation = "UPDATE_CABIN"
        else if (change.field === "nationality") operation = "UPDATE_NATIONALITY"
        else if (change.field === "guest_name") operation = "UPDATE_NAME"
        else if (change.field === "booking_number") operation = "UPDATE_BOOKING"

        await logChange({
          type: "UPDATE",
          operation: operation,
          guests: [extractGuestData(originalGuest)],
          changes: [change],
          method: "MANUAL",
          userAction: "Edited guest via Guest Manifest Editor",
          additionalContext: {
            editedField: change.field,
            editMethod: "inline_edit",
          },
        })
      }

      await fetchGuests()
      onDataChange?.()
      setEditingGuest(null)
      setEditingData({})

      setStatusMessage({
        type: "success",
        message: "Guest updated successfully.",
      })
    } catch (error) {
      console.error("Error updating guest:", error)

      // Log the error
      await logChange({
        type: "SYSTEM",
        operation: "UPDATE_GUEST",
        method: "MANUAL",
        userAction: "Attempted to update guest",
        errorDetails: error.message,
        additionalContext: {
          guestId: editingGuest,
          attemptedChanges: Object.keys(editingData),
        },
      })

      setStatusMessage({
        type: "error",
        message: "Failed to update guest. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  // Delete guest
  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm("Are you sure you want to delete this guest?")) return

    try {
      setSaving(true)

      // Get guest data before deletion for logging
      const guestToDelete = guests.find((g) => g.id === guestId)
      if (!guestToDelete) {
        throw new Error("Guest not found")
      }

      const { error } = await supabase.from("guest_manifest").delete().eq("id", guestId)

      if (error) {
        console.error("Error deleting guest:", error)
        throw error
      }

      // Log the deletion
      await logChange({
        type: "DELETE",
        operation: "DELETE_GUEST",
        guests: [extractGuestData(guestToDelete)],
        method: "MANUAL",
        userAction: "Clicked delete button in Guest Manifest Editor",
        additionalContext: {
          table_nr: guestToDelete.table_nr,
          nationality: guestToDelete.nationality,
          booking_number: guestToDelete.booking_number,
        },
      })

      await fetchGuests()
      onDataChange?.()

      setStatusMessage({
        type: "success",
        message: "Guest deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting guest:", error)

      // Log the error
      await logChange({
        type: "SYSTEM",
        operation: "DELETE_GUEST",
        method: "MANUAL",
        userAction: "Attempted to delete guest",
        errorDetails: error.message,
        additionalContext: {
          guestId: guestId,
        },
      })

      setStatusMessage({
        type: "error",
        message: "Failed to delete guest. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  // Export to CSV
  const handleExport = () => {
    const headers = ["Guest Name", "Cabin", "Nationality", "Booking Number", "Cruise ID", "Table"]
    const csvContent = [
      headers.join(","),
      ...filteredGuests.map((guest) =>
        [
          `"${guest.guest_name || ""}"`,
          `"${guest.cabin_nr || ""}"`,
          `"${guest.nationality || ""}"`,
          `"${guest.booking_number || ""}"`,
          `"${guest.cruise_id || ""}"`,
          guest.table_nr || "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `guest_manifest_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: "",
      nationality: "all",
      tableStatus: "all",
    })
  }

  // Toggle guest selection
  const toggleGuestSelection = (guestId: string) => {
    const newSelection = new Set(selectedGuests)
    if (newSelection.has(guestId)) {
      newSelection.delete(guestId)
    } else {
      newSelection.add(guestId)
    }
    setSelectedGuests(newSelection)
  }

  // Select all visible guests
  const toggleSelectAll = () => {
    if (selectedGuests.size === filteredGuests.length) {
      setSelectedGuests(new Set())
    } else {
      setSelectedGuests(new Set(filteredGuests.map((g) => g.id)))
    }
  }

  const visibleGuests = filteredGuests.slice(visibleRange.start, visibleRange.end)

  const cancelEdit = () => {
    setEditingGuest(null)
    setEditingData({})
  }

  const startEditGuest = (guest: Guest) => {
    setEditingGuest(guest.id)
    setEditingData({ ...guest })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Guest Manifest Editor
            <Badge variant="outline">{guests.length} total guests</Badge>
          </DialogTitle>
        </DialogHeader>

        {statusMessage && (
          <Alert
            className={statusMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={statusMessage.type === "success" ? "text-green-700" : "text-red-700"}>
              {statusMessage.message}
            </AlertDescription>
            <Button variant="ghost" size="sm" className="ml-auto h-8 w-8 p-0" onClick={() => setStatusMessage(null)}>
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manage-guests" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Manage Guests
              <Badge variant="secondary">{filteredGuests.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="add-guest" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Guest
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Tools
            </TabsTrigger>
          </TabsList>

          {/* Manage Guests Tab */}
          <TabsContent value="manage-guests" className="space-y-4">
            {/* Filters */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, cabin, nationality"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-8"
                  />
                </div>

                <Select
                  value={filters.nationality}
                  onValueChange={(value) => setFilters({ ...filters, nationality: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Nationality" />
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

                <Select
                  value={filters.tableStatus}
                  onValueChange={(value) => setFilters({ ...filters, tableStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Table Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Guests</SelectItem>
                    <SelectItem value="assigned">Assigned to Table</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <Button onClick={clearFilters} variant="outline" size="sm" className="flex items-center gap-1">
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                  <Button onClick={handleExport} variant="outline" size="sm" className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedGuests.size === filteredGuests.length && filteredGuests.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm">Select All Visible</span>
                </div>
              </div>
            </div>

            {/* Guest List */}
            {loading ? (
              <LoadingSpinner size={24} text="Loading guests..." />
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 border-b">
                  <div className="grid grid-cols-12 gap-2 p-2 text-sm font-medium">
                    <div className="col-span-1"></div>
                    <div className="col-span-3">Guest Name</div>
                    <div className="col-span-2">Cabin</div>
                    <div className="col-span-2">Nationality</div>
                    <div className="col-span-2">Booking</div>
                    <div className="col-span-1">Table</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                </div>

                {/* Virtual Scrolled Content */}
                <div
                  ref={scrollContainerRef}
                  className="overflow-auto"
                  style={{ height: `${containerHeight}px` }}
                  onScroll={handleScroll}
                >
                  <div style={{ height: `${filteredGuests.length * itemHeight}px`, position: "relative" }}>
                    {visibleGuests.map((guest, index) => {
                      const actualIndex = visibleRange.start + index
                      const isEditing = editingGuest === guest.id

                      return (
                        <div
                          key={guest.id}
                          className="absolute w-full border-b hover:bg-gray-50"
                          style={{
                            top: `${actualIndex * itemHeight}px`,
                            height: `${itemHeight}px`,
                          }}
                        >
                          <div className="grid grid-cols-12 gap-2 p-2 h-full items-center text-sm">
                            <div className="col-span-1">
                              <Checkbox
                                checked={selectedGuests.has(guest.id)}
                                onCheckedChange={() => toggleGuestSelection(guest.id)}
                              />
                            </div>
                            <div className="col-span-3">
                              {isEditing ? (
                                <Input
                                  value={editingData.guest_name || ""}
                                  onChange={(e) => setEditingData({ ...editingData, guest_name: e.target.value })}
                                  className="h-8"
                                />
                              ) : (
                                <span className="truncate">{guest.guest_name}</span>
                              )}
                            </div>
                            <div className="col-span-2">
                              {isEditing ? (
                                <Input
                                  value={editingData.cabin_nr || ""}
                                  onChange={(e) => setEditingData({ ...editingData, cabin_nr: e.target.value })}
                                  className="h-8"
                                />
                              ) : (
                                <span>{guest.cabin_nr}</span>
                              )}
                            </div>
                            <div className="col-span-2">
                              {isEditing ? (
                                <Input
                                  value={editingData.nationality || ""}
                                  onChange={(e) => setEditingData({ ...editingData, nationality: e.target.value })}
                                  className="h-8"
                                />
                              ) : (
                                <span className="truncate">{guest.nationality}</span>
                              )}
                            </div>
                            <div className="col-span-2">
                              {isEditing ? (
                                <Input
                                  value={editingData.booking_number || ""}
                                  onChange={(e) => setEditingData({ ...editingData, booking_number: e.target.value })}
                                  className="h-8"
                                />
                              ) : (
                                <span className="truncate">{guest.booking_number}</span>
                              )}
                            </div>
                            <div className="col-span-1">
                              {guest.table_nr ? (
                                <Badge variant="outline">{guest.table_nr}</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
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
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteGuest(guest.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Add New Guest Tab */}
          <TabsContent value="add-guest" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="guest-name" className="text-sm font-medium">
                  Guest Name *
                </Label>
                <Input
                  id="guest-name"
                  placeholder="Enter guest name"
                  value={newGuest.guest_name}
                  onChange={(e) => setNewGuest({ ...newGuest, guest_name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="cabin-number" className="text-sm font-medium">
                  Cabin Number *
                </Label>
                <Input
                  id="cabin-number"
                  placeholder="Enter cabin number"
                  value={newGuest.cabin_nr}
                  onChange={(e) => setNewGuest({ ...newGuest, cabin_nr: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="nationality" className="text-sm font-medium">
                  Nationality
                </Label>
                <Input
                  id="nationality"
                  placeholder="Enter nationality"
                  value={newGuest.nationality}
                  onChange={(e) => setNewGuest({ ...newGuest, nationality: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="booking-number" className="text-sm font-medium">
                  Booking Number
                </Label>
                <Input
                  id="booking-number"
                  placeholder="Enter booking number"
                  value={newGuest.booking_number}
                  onChange={(e) => setNewGuest({ ...newGuest, booking_number: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="cruise-id" className="text-sm font-medium">
                  Cruise ID
                </Label>
                <Input
                  id="cruise-id"
                  placeholder="Enter cruise ID"
                  value={newGuest.cruise_id}
                  onChange={(e) => setNewGuest({ ...newGuest, cruise_id: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  setNewGuest({
                    guest_name: "",
                    cabin_nr: "",
                    nationality: "",
                    booking_number: "",
                    cruise_id: "",
                  })
                }
              >
                Clear Form
              </Button>
              <Button onClick={handleAddGuest} disabled={saving} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Guest
              </Button>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <div className="text-center py-8">
              <p className="text-gray-500">Basic tools functionality available.</p>
              <p className="text-sm text-gray-400 mt-2">Advanced import/export and data management tools.</p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
