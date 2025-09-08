"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { MapPin, Plus, Minus, Settings, CheckCircle } from "lucide-react"
import { useAppContext } from "@/lib/app-context"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function CourtManager() {
  const { state, dispatch } = useAppContext()
  const [courtCount, setCourtCount] = useState(state.courts.length)

  useEffect(() => {
    setCourtCount(state.courts.length)
  }, [state.courts.length])

  const updateCourtCount = (newCount: number) => {
    if (newCount < 1 || newCount > 10) return

    const currentCourts = [...state.courts]

    if (newCount > currentCourts.length) {
      // Add new courts
      for (let i = currentCourts.length; i < newCount; i++) {
        currentCourts.push({
          id: (i + 1).toString(),
          name: `場地 ${i + 1}`,
          isActive: true,
          currentPlayers: [],
        })
      }
    } else if (newCount < currentCourts.length) {
      // Remove courts (keep only the first newCount courts)
      currentCourts.splice(newCount)
    }

    setCourtCount(newCount)
    dispatch({ type: "SET_COURTS", payload: currentCourts })
  }

  const updateCourtName = (courtId: string, name: string) => {
    const court = state.courts.find((c) => c.id === courtId)
    if (court) {
      dispatch({
        type: "UPDATE_COURT",
        payload: { ...court, name: name.trim() || `場地 ${courtId}` },
      })
    }
  }

  const toggleCourtActive = (courtId: string) => {
    const court = state.courts.find((c) => c.id === courtId)
    if (court) {
      dispatch({
        type: "UPDATE_COURT",
        payload: { ...court, isActive: !court.isActive },
      })
    }
  }

  const activeCourts = state.courts.filter((court) => court.isActive)
  const totalCapacity = activeCourts.length * 4
  const occupiedSlots = activeCourts.reduce((sum, court) => sum + court.currentPlayers.length, 0)

  return (
    <div className="space-y-6">
      {/* Court Count Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            場地數量設置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="court-count" className="text-sm font-medium">
                場地數量:
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateCourtCount(courtCount - 1)}
                  disabled={courtCount <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="w-16 text-center">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {courtCount}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateCourtCount(courtCount + 1)}
                  disabled={courtCount >= 10}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">每個場地可容納 4 人</div>
            </div>

            {state.participants.length > totalCapacity && (
              <Alert>
                <AlertDescription>
                  目前參與者 ({state.participants.length} 人) 超過場地總容量 ({totalCapacity} 人)。
                  建議增加場地數量或進行輪換安排。
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Court Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>場地配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.courts.map((court) => (
              <Card key={court.id} className={`border-2 ${court.isActive ? "border-primary/20" : "border-muted"}`}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`court-name-${court.id}`} className="text-sm font-medium">
                        場地名稱
                      </Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`court-active-${court.id}`} className="text-sm">
                          啟用
                        </Label>
                        <Switch
                          id={`court-active-${court.id}`}
                          checked={court.isActive}
                          onCheckedChange={() => toggleCourtActive(court.id)}
                        />
                      </div>
                    </div>

                    <Input
                      id={`court-name-${court.id}`}
                      value={court.name}
                      onChange={(e) => updateCourtName(court.id, e.target.value)}
                      placeholder={`場地 ${court.id}`}
                      disabled={!court.isActive}
                    />

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">目前狀態:</span>
                      <Badge variant={court.isActive ? "default" : "secondary"}>
                        {court.isActive ? "啟用" : "禁用"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">目前人數:</span>
                      <span className="font-medium">{court.currentPlayers.length}/4</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Court Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            場地概覽
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {activeCourts.map((court) => (
              <Card key={court.id} className="border-2 border-primary/20">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <MapPin className="w-8 h-8 text-primary" />
                    {court.currentPlayers.length === 4 && <CheckCircle className="w-4 h-4 text-green-500 ml-1" />}
                  </div>
                  <h3 className="font-semibold mb-1">{court.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{court.currentPlayers.length}/4 人</p>
                  <Badge variant={court.currentPlayers.length === 4 ? "default" : "outline"} className="text-xs">
                    {court.currentPlayers.length === 4 ? "已滿" : "等待分配"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{state.courts.length}</div>
                <div className="text-sm text-muted-foreground">總場地數</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{activeCourts.length}</div>
                <div className="text-sm text-muted-foreground">啟用場地</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{totalCapacity}</div>
                <div className="text-sm text-muted-foreground">總容量</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{totalCapacity - occupiedSlots}</div>
                <div className="text-sm text-muted-foreground">可用位置</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
