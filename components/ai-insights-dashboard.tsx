"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
  Eye,
  Lightbulb,
  Activity,
  BarChart3,
  RefreshCw,
  Download,
  Play,
  Pause,
  ArrowRight,
  Star,
  Cpu,
  Database,
  Shield,
  Rocket,
  Award,
  Info,
} from "lucide-react"

import {
  getAIDashboard,
  runAIAnalysis,
  markRecommendationImplemented,
  resolveAnomaly,
  type AIInsightsDashboard as AIDashboardType,
  type PredictiveInsight,
  type AnomalyDetection,
  type SmartRecommendation,
} from "@/lib/ai-analytics-engine"

interface AIInsightsDashboardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIInsightsDashboard({ open, onOpenChange }: AIInsightsDashboardProps) {
  const [dashboard, setDashboard] = useState<AIDashboardType | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<PredictiveInsight | null>(null)
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyDetection | null>(null)
  const [selectedRecommendation, setSelectedRecommendation] = useState<SmartRecommendation | null>(null)
  const [implementingRecommendation, setImplementingRecommendation] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadDashboard()
    }
  }, [open])

  useEffect(() => {
    if (!autoRefresh || !open) return

    const interval = setInterval(() => {
      loadDashboard()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, open])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const dashboardData = await getAIDashboard()
      setDashboard(dashboardData)
    } catch (error) {
      console.error("Failed to load AI dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const runFullAnalysis = async () => {
    try {
      setLoading(true)
      await runAIAnalysis()
      await loadDashboard()
    } catch (error) {
      console.error("Failed to run AI analysis:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveAnomaly = async (anomalyId: string) => {
    try {
      resolveAnomaly(anomalyId)
      await loadDashboard()
    } catch (error) {
      console.error("Failed to resolve anomaly:", error)
    }
  }

  const handleImplementRecommendation = async (recommendationId: string) => {
    try {
      setImplementingRecommendation(recommendationId)
      // Simulate implementation
      await new Promise((resolve) => setTimeout(resolve, 2000))
      markRecommendationImplemented(recommendationId, { success: true, implementedAt: new Date().toISOString() })
      await loadDashboard()
    } catch (error) {
      console.error("Failed to implement recommendation:", error)
    } finally {
      setImplementingRecommendation(null)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200"
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200"
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "low":
        return "text-blue-600 bg-blue-50 border-blue-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600 bg-red-50"
      case "high":
        return "text-orange-600 bg-orange-50"
      case "medium":
        return "text-yellow-600 bg-yellow-50"
      case "low":
        return "text-blue-600 bg-blue-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getSystemScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const exportDashboard = () => {
    if (!dashboard) return

    const exportData = {
      timestamp: new Date().toISOString(),
      systemScore: dashboard.systemScore,
      insights: dashboard.insights,
      anomalies: dashboard.anomalies,
      recommendations: dashboard.recommendations,
      trendAnalysis: dashboard.trendAnalysis,
      predictedMetrics: dashboard.predictedMetrics,
      mlModelAccuracy: dashboard.mlModelAccuracy,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ai_insights_dashboard_${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!dashboard) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Loading AI Insights...
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Insights Dashboard
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              <Zap className="h-3 w-3 mr-1" />
              Smart Analytics
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Control Panel */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runFullAnalysis}
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Analyzing..." : "Run Analysis"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1 ${autoRefresh ? "bg-green-50 text-green-700" : ""}`}
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              Auto-refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportDashboard} className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              System Score:{" "}
              <span className={`font-bold ${getSystemScoreColor(dashboard.systemScore)}`}>
                {dashboard.systemScore}/100
              </span>
            </div>
            <div className="text-sm text-gray-600">
              ML Accuracy:{" "}
              <span className="font-bold text-blue-600">
                {Math.round(
                  Object.values(dashboard.mlModelAccuracy).reduce((sum, acc) => sum + acc, 0) /
                    Object.values(dashboard.mlModelAccuracy).length,
                )}
                %
              </span>
            </div>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Brain className="h-5 w-5 text-purple-600 mr-2" />
                <div className={`text-2xl font-bold ${getSystemScoreColor(dashboard.systemScore)}`}>
                  {dashboard.systemScore}
                </div>
              </div>
              <div className="text-sm text-gray-600">AI System Score</div>
              <Progress value={dashboard.systemScore} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Eye className="h-5 w-5 text-blue-600 mr-2" />
                <div className="text-2xl font-bold text-blue-600">{dashboard.insights.length}</div>
              </div>
              <div className="text-sm text-gray-600">Active Insights</div>
              <div className="text-xs text-gray-500">Predictive analysis</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                <div className="text-2xl font-bold text-orange-600">
                  {dashboard.anomalies.filter((a) => !a.autoResolved).length}
                </div>
              </div>
              <div className="text-sm text-gray-600">Active Anomalies</div>
              <div className="text-xs text-gray-500">Requires attention</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Lightbulb className="h-5 w-5 text-green-600 mr-2" />
                <div className="text-2xl font-bold text-green-600">
                  {dashboard.recommendations.filter((r) => !r.implemented).length}
                </div>
              </div>
              <div className="text-sm text-gray-600">Recommendations</div>
              <div className="text-xs text-gray-500">Ready to implement</div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Analysis */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              System Trends & Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Current Trends</h4>
                <div className="space-y-3">
                  {Object.entries(dashboard.trendAnalysis).map(([metric, trend]) => (
                    <div key={metric} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium capitalize">{metric.replace(/([A-Z])/g, " $1")}</span>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(trend)}
                        <span
                          className={`text-sm font-medium ${
                            trend === "improving"
                              ? "text-green-600"
                              : trend === "declining"
                                ? "text-red-600"
                                : "text-gray-600"
                          }`}
                        >
                          {trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Predicted Metrics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm font-medium">Next Hour Load</span>
                    <span className="text-sm font-bold text-blue-600">{dashboard.predictedMetrics.nextHourLoad}%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <span className="text-sm font-medium">Peak Usage Time</span>
                    <span className="text-sm font-bold text-purple-600">
                      {dashboard.predictedMetrics.peakUsageTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <span className="text-sm font-medium">Expected Errors</span>
                    <span className="text-sm font-bold text-orange-600">
                      {dashboard.predictedMetrics.expectedErrors}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-sm font-medium">Capacity Utilization</span>
                    <span className="text-sm font-bold text-green-600">
                      {dashboard.predictedMetrics.capacityUtilization}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="insights" className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="insights" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Insights ({dashboard.insights.length})
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Anomalies ({dashboard.anomalies.filter((a) => !a.autoResolved).length})
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-1">
              <Lightbulb className="h-4 w-4" />
              Recommendations ({dashboard.recommendations.filter((r) => !r.implemented).length})
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-1">
              <Cpu className="h-4 w-4" />
              ML Models
            </TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {dashboard.insights.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No insights available</p>
                <p className="text-sm">Run analysis to generate AI insights</p>
              </div>
            ) : (
              dashboard.insights.map((insight) => (
                <Card key={insight.id} className={`border-l-4 ${getSeverityColor(insight.severity).split(" ")[2]}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(insight.severity)}>{insight.severity.toUpperCase()}</Badge>
                        <Badge variant="outline">{insight.type}</Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Target className="h-3 w-3" />
                          {insight.confidence}% confidence
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInsight(insight)}
                        className="flex items-center gap-1"
                      >
                        <Info className="h-4 w-4" />
                        Details
                      </Button>
                    </div>

                    <h3 className="font-semibold mb-2">{insight.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{insight.description}</p>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">AI Prediction</span>
                      </div>
                      <p className="text-sm text-blue-700">{insight.prediction}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Timeframe: {insight.timeframe}</span>
                      <span>Created: {new Date(insight.createdAt).toLocaleString()}</span>
                    </div>

                    {insight.impact && Object.keys(insight.impact).length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm font-medium mb-2">Expected Impact:</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(insight.impact).map(([key, value]) => (
                            <Badge
                              key={key}
                              variant="outline"
                              className={value! > 0 ? "text-green-600" : "text-red-600"}
                            >
                              {key}: {value! > 0 ? "+" : ""}
                              {value}%
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-4">
            {dashboard.anomalies.filter((a) => !a.autoResolved).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                <p>No active anomalies detected</p>
                <p className="text-sm">System is operating normally</p>
              </div>
            ) : (
              dashboard.anomalies
                .filter((a) => !a.autoResolved)
                .map((anomaly) => (
                  <Card key={anomaly.id} className={`border-l-4 ${getSeverityColor(anomaly.severity).split(" ")[2]}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(anomaly.severity)}>{anomaly.severity.toUpperCase()}</Badge>
                          <Badge variant="outline">{anomaly.type.replace(/_/g, " ")}</Badge>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Target className="h-3 w-3" />
                            {anomaly.confidence}% confidence
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAnomaly(anomaly)}
                            className="flex items-center gap-1"
                          >
                            <Info className="h-4 w-4" />
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveAnomaly(anomaly.id)}
                            className="flex items-center gap-1 text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Resolve
                          </Button>
                        </div>
                      </div>

                      <h3 className="font-semibold mb-2">{anomaly.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{anomaly.description}</p>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <div className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">Baseline:</span>
                            <span>{JSON.stringify(anomaly.baseline)}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">Current:</span>
                            <span>{JSON.stringify(anomaly.current)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Deviation:</span>
                            <span className="text-red-600 font-bold">{anomaly.deviation.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        Detected: {new Date(anomaly.detectedAt).toLocaleString()}
                      </div>

                      {anomaly.affectedMetrics.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm font-medium mb-2">Affected Metrics:</div>
                          <div className="flex flex-wrap gap-1">
                            {anomaly.affectedMetrics.map((metric) => (
                              <Badge key={metric} variant="outline" className="text-xs">
                                {metric.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {dashboard.recommendations.filter((r) => !r.implemented).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No recommendations available</p>
                <p className="text-sm">System is optimally configured</p>
              </div>
            ) : (
              dashboard.recommendations
                .filter((r) => !r.implemented)
                .map((recommendation) => (
                  <Card key={recommendation.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(recommendation.priority)}>
                            {recommendation.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{recommendation.category.replace(/_/g, " ")}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {recommendation.implementationEffort} effort
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRecommendation(recommendation)}
                            className="flex items-center gap-1"
                          >
                            <Info className="h-4 w-4" />
                            Details
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleImplementRecommendation(recommendation.id)}
                            disabled={implementingRecommendation === recommendation.id}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                          >
                            {implementingRecommendation === recommendation.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Rocket className="h-4 w-4" />
                            )}
                            {implementingRecommendation === recommendation.id ? "Implementing..." : "Implement"}
                          </Button>
                        </div>
                      </div>

                      <h3 className="font-semibold mb-2">{recommendation.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Expected Benefit</span>
                        </div>
                        <p className="text-sm text-green-700">{recommendation.expectedBenefit}</p>
                      </div>

                      <div className="text-xs text-gray-500 mb-3">
                        <div>Created: {new Date(recommendation.createdAt).toLocaleString()}</div>
                        <div>Valid until: {new Date(recommendation.validUntil).toLocaleString()}</div>
                      </div>

                      {recommendation.estimatedImpact && Object.keys(recommendation.estimatedImpact).length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm font-medium mb-2">Estimated Impact:</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(recommendation.estimatedImpact).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-green-600">
                                {key}: +{value}%
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* ML Models Tab */}
          <TabsContent value="models" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(dashboard.mlModelAccuracy).map(([model, accuracy]) => (
                <Card key={model}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold capitalize">{model.replace(/([A-Z])/g, " $1")}</h3>
                      <Badge
                        className={
                          accuracy >= 90
                            ? "bg-green-100 text-green-800"
                            : accuracy >= 80
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {accuracy}%
                      </Badge>
                    </div>
                    <Progress value={accuracy} className="mb-3" />
                    <div className="text-sm text-gray-600">
                      Model performance:{" "}
                      {accuracy >= 90
                        ? "Excellent"
                        : accuracy >= 80
                          ? "Good"
                          : accuracy >= 70
                            ? "Fair"
                            : "Needs Improvement"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Model Training Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">1,247</div>
                    <div className="text-sm text-gray-600">Training Samples</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-gray-600">Data Quality</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">24h</div>
                    <div className="text-sm text-gray-600">Last Updated</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Insight Detail Modal */}
        <Dialog open={!!selectedInsight} onOpenChange={() => setSelectedInsight(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Insight Details
              </DialogTitle>
            </DialogHeader>
            {selectedInsight && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityColor(selectedInsight.severity)}>
                    {selectedInsight.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{selectedInsight.type}</Badge>
                  <div className="text-sm text-gray-600">{selectedInsight.confidence}% confidence</div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{selectedInsight.title}</h3>
                  <p className="text-gray-600 mb-4">{selectedInsight.description}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">AI Prediction</h4>
                  <p className="text-blue-700">{selectedInsight.prediction}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Recommended Actions</h4>
                  <ul className="space-y-1">
                    {selectedInsight.recommendedActions.map((action, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedInsight.dataPoints.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Supporting Data</h4>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <pre className="text-xs text-gray-600">{JSON.stringify(selectedInsight.dataPoints, null, 2)}</pre>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-sm text-gray-500">
                  <span>Timeframe: {selectedInsight.timeframe}</span>
                  <span>Expires: {new Date(selectedInsight.expiresAt).toLocaleString()}</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInsight(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Anomaly Detail Modal */}
        <Dialog open={!!selectedAnomaly} onOpenChange={() => setSelectedAnomaly(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Anomaly Details
              </DialogTitle>
            </DialogHeader>
            {selectedAnomaly && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityColor(selectedAnomaly.severity)}>
                    {selectedAnomaly.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{selectedAnomaly.type.replace(/_/g, " ")}</Badge>
                  <div className="text-sm text-gray-600">{selectedAnomaly.confidence}% confidence</div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{selectedAnomaly.title}</h3>
                  <p className="text-gray-600 mb-4">{selectedAnomaly.description}</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-3">Anomaly Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Baseline:</span>
                      <span className="font-mono">{JSON.stringify(selectedAnomaly.baseline)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Current:</span>
                      <span className="font-mono">{JSON.stringify(selectedAnomaly.current)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Deviation:</span>
                      <span className="text-red-600 font-bold">{selectedAnomaly.deviation.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Suggested Actions</h4>
                  <ul className="space-y-1">
                    {selectedAnomaly.suggestedActions.map((action, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Affected Metrics</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedAnomaly.affectedMetrics.map((metric) => (
                      <Badge key={metric} variant="outline" className="text-xs">
                        {metric.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  Detected: {new Date(selectedAnomaly.detectedAt).toLocaleString()}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAnomaly(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (selectedAnomaly) {
                    handleResolveAnomaly(selectedAnomaly.id)
                    setSelectedAnomaly(null)
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolve Anomaly
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Recommendation Detail Modal */}
        <Dialog open={!!selectedRecommendation} onOpenChange={() => setSelectedRecommendation(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-green-600" />
                Recommendation Details
              </DialogTitle>
            </DialogHeader>
            {selectedRecommendation && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(selectedRecommendation.priority)}>
                    {selectedRecommendation.priority.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{selectedRecommendation.category.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedRecommendation.implementationEffort} effort
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{selectedRecommendation.title}</h3>
                  <p className="text-gray-600 mb-4">{selectedRecommendation.description}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Rationale</h4>
                  <p className="text-blue-700 text-sm">{selectedRecommendation.rationale}</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Expected Benefit</h4>
                  <p className="text-green-700 text-sm">{selectedRecommendation.expectedBenefit}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Implementation Steps</h4>
                  <ol className="space-y-1">
                    {selectedRecommendation.actionSteps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {selectedRecommendation.prerequisites.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Prerequisites</h4>
                    <ul className="space-y-1">
                      {selectedRecommendation.prerequisites.map((prereq, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Shield className="h-3 w-3 text-gray-400" />
                          {prereq}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedRecommendation.risks.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Risks & Considerations</h4>
                    <ul className="space-y-1">
                      {selectedRecommendation.risks.map((risk, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-orange-600">
                          <AlertTriangle className="h-3 w-3" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedRecommendation.estimatedImpact &&
                  Object.keys(selectedRecommendation.estimatedImpact).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Estimated Impact</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedRecommendation.estimatedImpact).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 rounded p-2 text-center">
                            <div className="text-lg font-bold text-green-600">+{value}%</div>
                            <div className="text-xs text-gray-600 capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex justify-between text-sm text-gray-500">
                  <span>Created: {new Date(selectedRecommendation.createdAt).toLocaleString()}</span>
                  <span>Valid until: {new Date(selectedRecommendation.validUntil).toLocaleString()}</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRecommendation(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (selectedRecommendation) {
                    handleImplementRecommendation(selectedRecommendation.id)
                    setSelectedRecommendation(null)
                  }
                }}
                disabled={implementingRecommendation === selectedRecommendation?.id}
                className="bg-green-600 hover:bg-green-700"
              >
                {implementingRecommendation === selectedRecommendation?.id ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                {implementingRecommendation === selectedRecommendation?.id ? "Implementing..." : "Implement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
