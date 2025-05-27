import { logChange, getChangeHistory, type ChangeLogEntry } from "./change-logger"

export interface PerformanceMetrics {
  operationId: string
  operation: string
  startTime: number
  endTime?: number
  duration?: number
  success: boolean
  errorType?: string
  resourcesAffected: number
  memoryUsage?: number
  dbQueries?: number
}

export interface UserBehaviorMetrics {
  sessionId: string
  userId?: string
  timestamp: string
  action: string
  duration: number
  clickPath: string[]
  errorEncountered: boolean
  deviceInfo: {
    userAgent: string
    viewport: { width: number; height: number }
    connection?: string
  }
}

export interface SystemHealthMetrics {
  timestamp: string
  cpuUsage?: number
  memoryUsage: number
  activeUsers: number
  operationsPerMinute: number
  errorRate: number
  averageResponseTime: number
  databaseConnections: number
  cacheHitRate?: number
}

export interface AdvancedFilterOptions {
  dateRange: {
    start: Date
    end: Date
  }
  operations: string[]
  actionTypes: string[]
  methods: string[]
  users: string[]
  affectedGuests: string[]
  errorStatus: "all" | "success" | "errors"
  batchOperations: boolean
  searchTerm: string
  sortBy: "timestamp" | "operation" | "affected_count" | "duration"
  sortOrder: "asc" | "desc"
  limit: number
  offset: number
}

class AdvancedChangeLogger {
  private performanceMetrics: PerformanceMetrics[] = []
  private userBehaviorMetrics: UserBehaviorMetrics[] = []
  private systemHealthMetrics: SystemHealthMetrics[] = []
  private currentSession: string = this.generateSessionId()
  private clickPath: string[] = []

  constructor() {
    this.initializeMonitoring()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeMonitoring() {
    // Track page visibility changes
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        this.trackUserBehavior("page_visibility_change", {
          visible: !document.hidden,
        })
      })

      // Track clicks for user behavior analysis
      document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement
        const elementInfo = this.getElementInfo(target)
        this.clickPath.push(elementInfo)

        // Keep only last 10 clicks
        if (this.clickPath.length > 10) {
          this.clickPath.shift()
        }
      })
    }

    // Start system health monitoring
    this.startSystemHealthMonitoring()
  }

  private getElementInfo(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase()
    const id = element.id ? `#${element.id}` : ""
    const classes = element.className ? `.${element.className.split(" ").join(".")}` : ""
    const text = element.textContent?.slice(0, 20) || ""
    return `${tag}${id}${classes}[${text}]`
  }

  // Enhanced logging with performance tracking
  async logChangeWithPerformance<T>(
    operation: string,
    asyncOperation: () => Promise<T>,
    changeParams: any,
  ): Promise<T> {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = performance.now()
    const startMemory = this.getMemoryUsage()

    let result: T
    let success = true
    let errorType: string | undefined

    try {
      // Execute the operation
      result = await asyncOperation()

      // Log the successful change
      await logChange({
        ...changeParams,
        additionalContext: {
          ...changeParams.additionalContext,
          operationId,
          performanceTracked: true,
        },
      })
    } catch (error) {
      success = false
      errorType = error instanceof Error ? error.constructor.name : "UnknownError"

      // Log the failed operation
      await logChange({
        ...changeParams,
        type: "SYSTEM",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
        additionalContext: {
          ...changeParams.additionalContext,
          operationId,
          performanceTracked: true,
          errorType,
        },
      })

      throw error
    } finally {
      const endTime = performance.now()
      const endMemory = this.getMemoryUsage()

      // Record performance metrics
      const metrics: PerformanceMetrics = {
        operationId,
        operation,
        startTime,
        endTime,
        duration: endTime - startTime,
        success,
        errorType,
        resourcesAffected: changeParams.affectedCount || changeParams.guests?.length || 1,
        memoryUsage: endMemory - startMemory,
      }

      this.performanceMetrics.push(metrics)
      this.pruneMetrics()
    }

    return result!
  }

  // Track user behavior
  trackUserBehavior(action: string, context: any = {}) {
    const metrics: UserBehaviorMetrics = {
      sessionId: this.currentSession,
      timestamp: new Date().toISOString(),
      action,
      duration: context.duration || 0,
      clickPath: [...this.clickPath],
      errorEncountered: context.error || false,
      deviceInfo: {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        viewport:
          typeof window !== "undefined"
            ? { width: window.innerWidth, height: window.innerHeight }
            : { width: 0, height: 0 },
        connection:
          typeof navigator !== "undefined" && "connection" in navigator
            ? (navigator as any).connection?.effectiveType
            : undefined,
      },
    }

    this.userBehaviorMetrics.push(metrics)
    this.pruneMetrics()
  }

  // System health monitoring
  private startSystemHealthMonitoring() {
    setInterval(() => {
      this.recordSystemHealth()
    }, 30000) // Every 30 seconds
  }

  private recordSystemHealth() {
    const now = new Date().toISOString()
    const recentChanges = this.getRecentChanges(1) // Last 1 minute
    const recentErrors = recentChanges.filter((c) => c.action_type === "SYSTEM")

    const metrics: SystemHealthMetrics = {
      timestamp: now,
      memoryUsage: this.getMemoryUsage(),
      activeUsers: this.getActiveUserCount(),
      operationsPerMinute: recentChanges.length,
      errorRate: recentChanges.length > 0 ? (recentErrors.length / recentChanges.length) * 100 : 0,
      averageResponseTime: this.getAverageResponseTime(),
      databaseConnections: 1, // Simplified for demo
      cacheHitRate: Math.random() * 100, // Simulated
    }

    this.systemHealthMetrics.push(metrics)
    this.pruneMetrics()
  }

  private getMemoryUsage(): number {
    if (typeof performance !== "undefined" && "memory" in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024 // MB
    }
    return 0
  }

  private getActiveUserCount(): number {
    // In a real app, this would track active sessions
    return 1
  }

  private getAverageResponseTime(): number {
    const recentMetrics = this.performanceMetrics.slice(-10)
    if (recentMetrics.length === 0) return 0

    const totalDuration = recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0)
    return totalDuration / recentMetrics.length
  }

  private getRecentChanges(minutes: number): ChangeLogEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return getChangeHistory().filter((entry) => new Date(entry.timestamp) > cutoff)
  }

  private pruneMetrics() {
    // Keep only last 1000 entries for each metric type
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000)
    }
    if (this.userBehaviorMetrics.length > 1000) {
      this.userBehaviorMetrics = this.userBehaviorMetrics.slice(-1000)
    }
    if (this.systemHealthMetrics.length > 1000) {
      this.systemHealthMetrics = this.systemHealthMetrics.slice(-1000)
    }
  }

  // Advanced filtering and search
  getFilteredChangeHistory(filters: Partial<AdvancedFilterOptions>): ChangeLogEntry[] {
    let changes = getChangeHistory()

    // Date range filter
    if (filters.dateRange) {
      changes = changes.filter((change) => {
        const changeDate = new Date(change.timestamp)
        return changeDate >= filters.dateRange!.start && changeDate <= filters.dateRange!.end
      })
    }

    // Operation filter
    if (filters.operations && filters.operations.length > 0) {
      changes = changes.filter((change) => filters.operations!.includes(change.operation))
    }

    // Action type filter
    if (filters.actionTypes && filters.actionTypes.length > 0) {
      changes = changes.filter((change) => filters.actionTypes!.includes(change.action_type))
    }

    // Method filter
    if (filters.methods && filters.methods.length > 0) {
      changes = changes.filter((change) => filters.methods!.includes(change.method))
    }

    // Error status filter
    if (filters.errorStatus && filters.errorStatus !== "all") {
      if (filters.errorStatus === "errors") {
        changes = changes.filter((change) => change.error_details)
      } else if (filters.errorStatus === "success") {
        changes = changes.filter((change) => !change.error_details)
      }
    }

    // Batch operations filter
    if (filters.batchOperations === true) {
      changes = changes.filter((change) => change.batch_id)
    } else if (filters.batchOperations === false) {
      changes = changes.filter((change) => !change.batch_id)
    }

    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      changes = changes.filter(
        (change) =>
          change.description.toLowerCase().includes(term) ||
          change.operation.toLowerCase().includes(term) ||
          change.user_action.toLowerCase().includes(term) ||
          change.affected_guests.some(
            (guest) => guest.name.toLowerCase().includes(term) || guest.cabin.toLowerCase().includes(term),
          ),
      )
    }

    // Affected guests filter
    if (filters.affectedGuests && filters.affectedGuests.length > 0) {
      changes = changes.filter((change) =>
        change.affected_guests.some(
          (guest) =>
            filters.affectedGuests!.includes(guest.id) ||
            filters.affectedGuests!.includes(guest.name) ||
            filters.affectedGuests!.includes(guest.cabin),
        ),
      )
    }

    // Sorting
    if (filters.sortBy) {
      changes.sort((a, b) => {
        let aValue: any, bValue: any

        switch (filters.sortBy) {
          case "timestamp":
            aValue = new Date(a.timestamp).getTime()
            bValue = new Date(b.timestamp).getTime()
            break
          case "operation":
            aValue = a.operation
            bValue = b.operation
            break
          case "affected_count":
            aValue = a.affected_count || a.affected_guests.length
            bValue = b.affected_count || b.affected_guests.length
            break
          case "duration":
            // Get duration from performance metrics if available
            const aMetrics = this.performanceMetrics.find(
              (m) => a.id.includes(m.operationId) || a.description.includes(m.operationId),
            )
            const bMetrics = this.performanceMetrics.find(
              (m) => b.id.includes(m.operationId) || b.description.includes(m.operationId),
            )
            aValue = aMetrics?.duration || 0
            bValue = bMetrics?.duration || 0
            break
          default:
            aValue = a.timestamp
            bValue = b.timestamp
        }

        if (filters.sortOrder === "desc") {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        }
      })
    }

    // Pagination
    const offset = filters.offset || 0
    const limit = filters.limit || 50
    return changes.slice(offset, offset + limit)
  }

  // Analytics methods
  getPerformanceAnalytics() {
    const metrics = this.performanceMetrics

    return {
      totalOperations: metrics.length,
      successRate: metrics.length > 0 ? (metrics.filter((m) => m.success).length / metrics.length) * 100 : 0,
      averageDuration: metrics.length > 0 ? metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length : 0,
      slowestOperations: metrics
        .filter((m) => m.duration)
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .slice(0, 10),
      errorPatterns: this.getErrorPatterns(),
      operationFrequency: this.getOperationFrequency(),
      performanceTrends: this.getPerformanceTrends(),
    }
  }

  getUserBehaviorAnalytics() {
    const behaviors = this.userBehaviorMetrics

    return {
      totalSessions: new Set(behaviors.map((b) => b.sessionId)).size,
      averageSessionDuration: this.getAverageSessionDuration(),
      mostCommonActions: this.getMostCommonActions(),
      errorPronePaths: this.getErrorPronePaths(),
      deviceBreakdown: this.getDeviceBreakdown(),
      peakUsageTimes: this.getPeakUsageTimes(),
    }
  }

  getSystemHealthAnalytics() {
    const health = this.systemHealthMetrics

    return {
      currentHealth: health[health.length - 1],
      healthTrends: health.slice(-24), // Last 24 measurements
      alerts: this.generateHealthAlerts(),
      resourceUsage: this.getResourceUsageTrends(),
      performanceScore: this.calculatePerformanceScore(),
    }
  }

  private getErrorPatterns() {
    const errors = this.performanceMetrics.filter((m) => !m.success)
    const patterns: Record<string, number> = {}

    errors.forEach((error) => {
      const key = `${error.operation}_${error.errorType}`
      patterns[key] = (patterns[key] || 0) + 1
    })

    return Object.entries(patterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count }))
  }

  private getOperationFrequency() {
    const operations: Record<string, number> = {}

    this.performanceMetrics.forEach((metric) => {
      operations[metric.operation] = (operations[metric.operation] || 0) + 1
    })

    return Object.entries(operations)
      .sort(([, a], [, b]) => b - a)
      .map(([operation, count]) => ({ operation, count }))
  }

  private getPerformanceTrends() {
    // Group by hour for the last 24 hours
    const hourlyMetrics: Record<string, PerformanceMetrics[]> = {}
    const now = Date.now()

    this.performanceMetrics
      .filter((m) => now - m.startTime < 24 * 60 * 60 * 1000) // Last 24 hours
      .forEach((metric) => {
        const hour = new Date(metric.startTime).toISOString().slice(0, 13) + ":00:00.000Z"
        if (!hourlyMetrics[hour]) hourlyMetrics[hour] = []
        hourlyMetrics[hour].push(metric)
      })

    return Object.entries(hourlyMetrics).map(([hour, metrics]) => ({
      hour,
      averageDuration: metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length,
      operationCount: metrics.length,
      errorRate: (metrics.filter((m) => !m.success).length / metrics.length) * 100,
    }))
  }

  private getAverageSessionDuration(): number {
    const sessions: Record<string, { start: number; end: number }> = {}

    this.userBehaviorMetrics.forEach((behavior) => {
      const timestamp = new Date(behavior.timestamp).getTime()
      if (!sessions[behavior.sessionId]) {
        sessions[behavior.sessionId] = { start: timestamp, end: timestamp }
      } else {
        sessions[behavior.sessionId].end = Math.max(sessions[behavior.sessionId].end, timestamp)
      }
    })

    const durations = Object.values(sessions).map((s) => s.end - s.start)
    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
  }

  private getMostCommonActions() {
    const actions: Record<string, number> = {}

    this.userBehaviorMetrics.forEach((behavior) => {
      actions[behavior.action] = (actions[behavior.action] || 0) + 1
    })

    return Object.entries(actions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }))
  }

  private getErrorPronePaths() {
    const errorBehaviors = this.userBehaviorMetrics.filter((b) => b.errorEncountered)
    const pathPatterns: Record<string, number> = {}

    errorBehaviors.forEach((behavior) => {
      const pathKey = behavior.clickPath.slice(-3).join(" -> ") // Last 3 clicks
      pathPatterns[pathKey] = (pathPatterns[pathKey] || 0) + 1
    })

    return Object.entries(pathPatterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }))
  }

  private getDeviceBreakdown() {
    const devices: Record<string, number> = {}

    this.userBehaviorMetrics.forEach((behavior) => {
      const deviceKey = this.categorizeDevice(behavior.deviceInfo.userAgent)
      devices[deviceKey] = (devices[deviceKey] || 0) + 1
    })

    return Object.entries(devices).map(([device, count]) => ({ device, count }))
  }

  private categorizeDevice(userAgent: string): string {
    if (userAgent.includes("Mobile")) return "Mobile"
    if (userAgent.includes("Tablet")) return "Tablet"
    return "Desktop"
  }

  private getPeakUsageTimes() {
    const hourlyUsage: Record<number, number> = {}

    this.userBehaviorMetrics.forEach((behavior) => {
      const hour = new Date(behavior.timestamp).getHours()
      hourlyUsage[hour] = (hourlyUsage[hour] || 0) + 1
    })

    return Object.entries(hourlyUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([hour, count]) => ({ hour: Number.parseInt(hour), count }))
  }

  private generateHealthAlerts() {
    const current = this.systemHealthMetrics[this.systemHealthMetrics.length - 1]
    const alerts: Array<{ type: "warning" | "critical"; message: string }> = []

    if (current) {
      if (current.errorRate > 10) {
        alerts.push({ type: "critical", message: `High error rate: ${current.errorRate.toFixed(1)}%` })
      } else if (current.errorRate > 5) {
        alerts.push({ type: "warning", message: `Elevated error rate: ${current.errorRate.toFixed(1)}%` })
      }

      if (current.averageResponseTime > 1000) {
        alerts.push({ type: "critical", message: `Slow response time: ${current.averageResponseTime.toFixed(0)}ms` })
      } else if (current.averageResponseTime > 500) {
        alerts.push({ type: "warning", message: `Elevated response time: ${current.averageResponseTime.toFixed(0)}ms` })
      }

      if (current.memoryUsage > 100) {
        alerts.push({ type: "warning", message: `High memory usage: ${current.memoryUsage.toFixed(1)}MB` })
      }
    }

    return alerts
  }

  private getResourceUsageTrends() {
    return this.systemHealthMetrics.slice(-24).map((metric) => ({
      timestamp: metric.timestamp,
      memoryUsage: metric.memoryUsage,
      operationsPerMinute: metric.operationsPerMinute,
      errorRate: metric.errorRate,
      responseTime: metric.averageResponseTime,
    }))
  }

  private calculatePerformanceScore(): number {
    const current = this.systemHealthMetrics[this.systemHealthMetrics.length - 1]
    if (!current) return 100

    let score = 100

    // Deduct points for high error rate
    score -= current.errorRate * 2

    // Deduct points for slow response time
    if (current.averageResponseTime > 500) {
      score -= (current.averageResponseTime - 500) / 10
    }

    // Deduct points for high memory usage
    if (current.memoryUsage > 50) {
      score -= (current.memoryUsage - 50) / 2
    }

    return Math.max(0, Math.min(100, score))
  }

  // Public getters for metrics
  getPerformanceMetrics() {
    return [...this.performanceMetrics]
  }
  getUserBehaviorMetrics() {
    return [...this.userBehaviorMetrics]
  }
  getSystemHealthMetrics() {
    return [...this.systemHealthMetrics]
  }
}

// Export singleton instance
export const advancedLogger = new AdvancedChangeLogger()

// Helper functions for easy integration
export const trackOperation = advancedLogger.logChangeWithPerformance.bind(advancedLogger)
export const trackUserBehavior = advancedLogger.trackUserBehavior.bind(advancedLogger)
export const getFilteredHistory = advancedLogger.getFilteredChangeHistory.bind(advancedLogger)
export const getPerformanceAnalytics = advancedLogger.getPerformanceAnalytics.bind(advancedLogger)
export const getUserBehaviorAnalytics = advancedLogger.getUserBehaviorAnalytics.bind(advancedLogger)
export const getSystemHealthAnalytics = advancedLogger.getSystemHealthAnalytics.bind(advancedLogger)
