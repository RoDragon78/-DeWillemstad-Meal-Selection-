"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Zap,
  Eye,
  AlertCircle,
  CheckCircle,
  Target,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Cpu,
  HardDrive,
  Wifi,
  Database,
} from "lucide-react"

import {
  getFilteredHistory,
  getPerformanceAnalytics,
  getUserBehaviorAnalytics,
  getSystemHealthAnalytics,
  trackUserBehavior,
  type AdvancedFilterOptions,
} from "@/lib/advanced-change-logger"

interface AdvancedMonitoringDashboardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdvancedMonitoringDashboard({ open, onOpenChange }: AdvancedMonitoringDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Filter state
  const [filters, setFilters] = useState<Partial<AdvancedFilterOptions>>({
    dateRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date(),
    },
    errorStatus: "all",
    sortBy: "timestamp",
    sortOrder: "desc",
    limit: 100,
    offset: 0,
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Analytics data
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [behaviorData, setBehaviorData] = useState<any>(null)
  const [healthData, setHealthData] = useState<any>(null)
  const [filteredChanges, setFilteredChanges] = useState<any[]>([])

  // Track user interactions
  useEffect(() => {
    if (open) {
      trackUserBehavior("monitoring_dashboard_opened")
    }
  }, [open])

  useEffect(() => {
    trackUserBehavior("monitoring_tab_changed", { tab: activeTab })
  }, [activeTab])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !open) return

    const interval = setInterval(() => {
      refreshData()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, open])

  // Initial data load
  useEffect(() => {
    if (open) {
      refreshData()
    }
  }, [open, filters])

  const refreshData = async () => {
    try {
      const [performance, behavior, health] = await Promise.all([
        getPerformanceAnalytics(),
        getUserBehaviorAnalytics(),
        getSystemHealthAnalytics(),
      ])

      setPerformanceData(performance)
      setBehaviorData(behavior)
      setHealthData(health)

      // Get filtered change history
      const changes = getFilteredHistory({
        ...filters,
        searchTerm,
      })
      setFilteredChanges(changes)

      setLastRefresh(new Date())
    } catch (error) {
      console.error("Failed to refresh monitoring data:", error)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const clearFilters = () => {
    setFilters({
      dateRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      errorStatus: "all",
      sortBy: "timestamp",
      sortOrder: "desc",
      limit: 100,
      offset: 0,
    })
    setSearchTerm("")
  }

  const exportData = (type: "performance" | "behavior" | "health" | "changes") => {
    let data: any
    let filename: string

    switch (type) {
      case "performance":
        data = performanceData
        filename = "performance_analytics"
        break
      case "behavior":
        data = behaviorData
        filename = "user_behavior_analytics"
        break
      case "health":
        data = healthData
        filename = "system_health_analytics"
        break
      case "changes":
        data = filteredChanges
        filename = "filtered_change_history"
        break
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    trackUserBehavior("data_exported", { type })
  }

  // Calculate health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50"
    if (score >= 70) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes.toFixed(1)}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Advanced Monitoring Dashboard
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <TrendingUp className="h-3 w-3 mr-1" />
              Live Analytics
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Control Panel */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshData} className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <span className="text-sm">Auto-refresh every</span>
              <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(Number.parseInt(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">1m</SelectItem>
                  <SelectItem value="300">5m</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-xs text-gray-500">Last updated: {lastRefresh.toLocaleTimeString()}</div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="behavior">User Behavior</TabsTrigger>
            <TabsTrigger value="health">System Health</TabsTrigger>
            <TabsTrigger value="history">Change History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* System Health Alerts */}
            {healthData?.alerts && healthData.alerts.length > 0 && (
              <div className="space-y-2">
                {healthData.alerts.map((alert: any, index: number) => (
                  <Alert
                    key={index}
                    className={
                      alert.type === "critical" ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
                    }
                  >
                    <AlertTriangle
                      className={`h-4 w-4 ${alert.type === "critical" ? "text-red-600" : "text-yellow-600"}`}
                    />
                    <AlertDescription className={alert.type === "critical" ? "text-red-700" : "text-yellow-700"}>
                      {alert.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="h-5 w-5 text-blue-600 mr-2" />
                    <div className={`text-2xl font-bold ${getHealthScoreColor(healthData?.performanceScore || 0)}`}>
                      {healthData?.performanceScore?.toFixed(0) || 0}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Performance Score</div>
                  <div className="text-xs text-gray-500">Overall system health</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {performanceData?.successRate?.toFixed(1) || 0}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                  <div className="text-xs text-gray-500">Last 24 hours</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-purple-600 mr-2" />
                    <div className="text-2xl font-bold text-purple-600">
                      {formatDuration(performanceData?.averageDuration || 0)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Avg Response</div>
                  <div className="text-xs text-gray-500">Operation duration</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-5 w-5 text-orange-600 mr-2" />
                    <div className="text-2xl font-bold text-orange-600">{behaviorData?.totalSessions || 0}</div>
                  </div>
                  <div className="text-sm text-gray-600">Active Sessions</div>
                  <div className="text-xs text-gray-500">Current period</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Operations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceData?.operationFrequency?.slice(0, 5).map((op: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{op.operation}</span>
                        <Badge variant="outline">{op.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Error Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceData?.errorPatterns?.slice(0, 5).map((error: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-red-600">{error.pattern}</span>
                        <Badge variant="destructive">{error.count}</Badge>
                      </div>
                    ))}
                    {(!performanceData?.errorPatterns || performanceData.errorPatterns.length === 0) && (
                      <div className="text-sm text-gray-500 text-center py-4">No error patterns detected</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Performance Analytics</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportData("performance")}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Operation Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{performanceData?.totalOperations || 0}</div>
                        <div className="text-sm text-gray-600">Total Ops</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {performanceData?.successRate?.toFixed(1) || 0}%
                        </div>
                        <div className="text-sm text-gray-600">Success Rate</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {formatDuration(performanceData?.averageDuration || 0)}
                        </div>
                        <div className="text-sm text-gray-600">Avg Duration</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Slowest Operations</h4>
                      {performanceData?.slowestOperations?.slice(0, 5).map((op: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{op.operation}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-red-600">{formatDuration(op.duration)}</span>
                            <Badge variant={op.success ? "default" : "destructive"}>
                              {op.success ? "Success" : "Failed"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceData?.performanceTrends?.slice(-12).map((trend: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{new Date(trend.hour).toLocaleTimeString()}</span>
                          <span>{trend.operationCount} ops</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, (trend.averageDuration / 1000) * 10)}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">{formatDuration(trend.averageDuration)}</span>
                        </div>
                        {trend.errorRate > 0 && (
                          <div className="text-xs text-red-600">Error rate: {trend.errorRate.toFixed(1)}%</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Behavior Tab */}
          <TabsContent value="behavior" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">User Behavior Analytics</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportData("behavior")}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Session Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{behaviorData?.totalSessions || 0}</div>
                      <div className="text-sm text-gray-600">Total Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        {formatDuration(behaviorData?.averageSessionDuration || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Avg Session Duration</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Popular Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {behaviorData?.mostCommonActions?.slice(0, 5).map((action: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{action.action}</span>
                        <Badge variant="outline">{action.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Device Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {behaviorData?.deviceBreakdown?.map((device: any, index: number) => {
                      const Icon =
                        device.device === "Mobile" ? Smartphone : device.device === "Tablet" ? Tablet : Monitor
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{device.device}</span>
                          </div>
                          <Badge variant="outline">{device.count}</Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error-Prone Paths */}
            {behaviorData?.errorPronePaths && behaviorData.errorPronePaths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Error-Prone User Paths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {behaviorData.errorPronePaths.map((path: any, index: number) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-red-800">{path.path}</div>
                            <div className="text-xs text-red-600 mt-1">
                              {path.count} error{path.count !== 1 ? "s" : ""} encountered
                            </div>
                          </div>
                          <Badge variant="destructive">{path.count}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Peak Usage Times */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Peak Usage Times
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  {behaviorData?.peakUsageTimes?.map((time: any, index: number) => (
                    <div key={index} className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{time.hour}:00</div>
                      <div className="text-sm text-gray-600">{time.count} actions</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="health" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">System Health Monitoring</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportData("health")}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>

            {/* Current Health Status */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Cpu className="h-5 w-5 text-blue-600 mr-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      {healthData?.currentHealth?.operationsPerMinute || 0}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Ops/Min</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <HardDrive className="h-5 w-5 text-green-600 mr-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {formatBytes(healthData?.currentHealth?.memoryUsage || 0)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Memory Usage</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Wifi className="h-5 w-5 text-purple-600 mr-2" />
                    <div className="text-2xl font-bold text-purple-600">
                      {formatDuration(healthData?.currentHealth?.averageResponseTime || 0)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Response Time</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Database className="h-5 w-5 text-orange-600 mr-2" />
                    <div className="text-2xl font-bold text-orange-600">
                      {healthData?.currentHealth?.errorRate?.toFixed(1) || 0}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Error Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* Health Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {healthData?.resourceUsage?.slice(-12).map((usage: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{new Date(usage.timestamp).toLocaleTimeString()}</span>
                        <span>{usage.operationsPerMinute} ops/min</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Memory: {formatBytes(usage.memoryUsage)}</span>
                          <span>Response: {formatDuration(usage.responseTime)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, usage.memoryUsage)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${usage.responseTime > 1000 ? "bg-red-500" : usage.responseTime > 500 ? "bg-yellow-500" : "bg-green-500"}`}
                                style={{ width: `${Math.min(100, usage.responseTime / 10)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {usage.errorRate > 0 && (
                          <div className="text-xs text-red-600">Error rate: {usage.errorRate.toFixed(1)}%</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Change History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Advanced Change History</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-1"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData("changes")}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Search and Basic Filters */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search changes, operations, guests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filters.errorStatus} onValueChange={(value) => handleFilterChange("errorStatus", value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Changes</SelectItem>
                  <SelectItem value="success">Success Only</SelectItem>
                  <SelectItem value="errors">Errors Only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Date Range</label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="datetime-local"
                          value={filters.dateRange?.start.toISOString().slice(0, 16)}
                          onChange={(e) =>
                            handleFilterChange("dateRange", {
                              ...filters.dateRange,
                              start: new Date(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="datetime-local"
                          value={filters.dateRange?.end.toISOString().slice(0, 16)}
                          onChange={(e) =>
                            handleFilterChange("dateRange", {
                              ...filters.dateRange,
                              end: new Date(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Sort By</label>
                      <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange("sortBy", value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="timestamp">Timestamp</SelectItem>
                          <SelectItem value="operation">Operation</SelectItem>
                          <SelectItem value="affected_count">Affected Count</SelectItem>
                          <SelectItem value="duration">Duration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Sort Order</label>
                      <Select
                        value={filters.sortOrder}
                        onValueChange={(value) => handleFilterChange("sortOrder", value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Newest First</SelectItem>
                          <SelectItem value="asc">Oldest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Change History List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredChanges.map((change) => (
                <Card key={change.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={change.action_type === "SYSTEM" ? "destructive" : "default"}
                          className="text-xs"
                        >
                          {change.action_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {change.method}
                        </Badge>
                        {change.batch_id && (
                          <Badge variant="secondary" className="text-xs">
                            Batch
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{new Date(change.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="mb-2">
                      <p className="text-sm font-medium">{change.description}</p>
                      <p className="text-xs text-gray-600">{change.user_action}</p>
                    </div>

                    {change.affected_guests.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-gray-700 mb-1">
                          Affected Guests ({change.affected_guests.length}):
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {change.affected_guests.slice(0, 3).map((guest: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {guest.name} (Cabin {guest.cabin})
                            </Badge>
                          ))}
                          {change.affected_guests.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{change.affected_guests.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {change.changes && change.changes.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-gray-700 mb-1">Field Changes:</div>
                        <div className="space-y-1">
                          {change.changes.map((fieldChange: any, index: number) => (
                            <div key={index} className="text-xs bg-gray-50 p-2 rounded flex items-center gap-2">
                              <span className="font-medium">{fieldChange.field}:</span>
                              <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
                                {fieldChange.old_value || "None"}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                                {fieldChange.new_value || "None"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {change.error_details && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        <strong>Error:</strong> {change.error_details}
                      </div>
                    )}

                    {change.affected_count && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">
                        <strong>Summary:</strong> {change.affected_count} record(s) affected
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {filteredChanges.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No changes found matching your filters</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredChanges.length >= (filters.limit || 100) && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleFilterChange("offset", Math.max(0, (filters.offset || 0) - (filters.limit || 100)))
                  }
                  disabled={(filters.offset || 0) === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange("offset", (filters.offset || 0) + (filters.limit || 100))}
                >
                  Next
                </Button>
              </div>
            )}
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
