"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, CheckCircle, Eye, EyeOff, Lock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SecurityMetrics {
  rateLimit: {
    apiRequests: number
    blockedRequests: number
  }
  validation: {
    validInputs: number
    invalidInputs: number
  }
  general: {
    secureHeaders: boolean
    httpsEnabled: boolean
    csrfProtection: boolean
  }
}

export function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    rateLimit: { apiRequests: 0, blockedRequests: 0 },
    validation: { validInputs: 0, invalidInputs: 0 },
    general: { secureHeaders: true, httpsEnabled: true, csrfProtection: true }
  })
  const [showDetails, setShowDetails] = useState(false)

  const securityChecks = [
    {
      name: "安全標頭",
      status: "active",
      description: "X-Frame-Options, CSP, HSTS 已啟用"
    },
    {
      name: "輸入驗證",
      status: "active", 
      description: "所有用戶輸入經過驗證和清理"
    },
    {
      name: "速率限制",
      status: "active",
      description: "API 請求速率限制已生效"
    },
    {
      name: "會話管理",
      status: "active",
      description: "安全會話管理已實施"
    },
    {
      name: "HTTPS",
      status: process.env.NODE_ENV === 'production' ? "active" : "warning",
      description: process.env.NODE_ENV === 'production' ? "HTTPS 已強制執行" : "開發環境 (HTTPS 未強制)"
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'error': return <AlertTriangle className="w-4 h-4" />
      default: return <Shield className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            安全狀態總覽
          </CardTitle>
          <CardDescription>
            應用程式安全防護狀態監控
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {securityChecks.map((check, index) => (
              <Card key={index} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{check.name}</h3>
                    <Badge className={getStatusColor(check.status)}>
                      {getStatusIcon(check.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{check.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="protection" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="protection">防護機制</TabsTrigger>
          <TabsTrigger value="monitoring">監控數據</TabsTrigger>
          <TabsTrigger value="settings">安全設置</TabsTrigger>
        </TabsList>

        <TabsContent value="protection">
          <Card>
            <CardHeader>
              <CardTitle>已啟用的防護機制</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>內容安全政策 (CSP)</strong> - 防止 XSS 攻擊和惡意腳本注入
                </AlertDescription>
              </Alert>
              
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <strong>速率限制</strong> - API: 每15分鐘100次請求，表單提交: 每分鐘10次
                </AlertDescription>
              </Alert>
              
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>輸入驗證</strong> - 所有用戶輸入使用 Zod 進行驗證和 HTML 清理
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>安全監控數據</CardTitle>
              <CardDescription>即時安全事件和指標</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.rateLimit.apiRequests}
                  </div>
                  <div className="text-sm text-muted-foreground">API 請求</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {metrics.rateLimit.blockedRequests}
                  </div>
                  <div className="text-sm text-muted-foreground">已阻擋請求</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.validation.validInputs}
                  </div>
                  <div className="text-sm text-muted-foreground">有效輸入</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {metrics.validation.invalidInputs}
                  </div>
                  <div className="text-sm text-muted-foreground">無效輸入</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>安全設置</CardTitle>
              <CardDescription>查看和管理安全配置選項</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">顯示詳細安全資訊</h3>
                  <p className="text-sm text-muted-foreground">開發模式下顯示額外的安全調試資訊</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              
              {showDetails && process.env.NODE_ENV === 'development' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>開發模式</strong> - 某些安全功能在開發環境中可能被簡化。
                    生產環境將啟用完整的安全防護。
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}