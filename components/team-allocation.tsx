"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Shuffle, Users, AlertCircle, TrendingUp, BarChart3, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAppContext } from "@/lib/app-context"
import { TeamAllocationAlgorithm } from "@/lib/team-allocation-algorithm"

export function TeamAllocation() {
  const { state, dispatch } = useAppContext()
  const [isAllocating, setIsAllocating] = useState(false)
  const [isProcessingNextRound, setIsProcessingNextRound] = useState(false)
  const [allocationStats, setAllocationStats] = useState<any>(null)
  const [validationResults, setValidationResults] = useState<any[]>([])

  const algorithm = new TeamAllocationAlgorithm()

  const handleAllocate = async () => {
    if (state.participants.length === 0) {
      return
    }

    setIsAllocating(true)

    // 模擬處理時間
    await new Promise((resolve) => setTimeout(resolve, 1500))

    try {
      const allocations = algorithm.allocateTeams(state.participants, state.courts, state.currentGameNumber)

      if (allocations.length === 0) {
        throw new Error("無法生成有效的分隊組合，請檢查參與者數量和場地設置")
      }

      // 驗證分隊結果
      const validations = allocations.map((allocation) => ({
        courtId: allocation.courtId,
        ...algorithm.validateAllocation(allocation),
      }))

      // 檢查是否有驗證失敗的分配
      const hasValidationErrors = validations.some(v => !v.isValid)
      if (hasValidationErrors) {
        console.warn("分隊結果包含驗證錯誤:", validations.filter(v => !v.isValid))
      }

      // 計算統計信息
      const stats = algorithm.getAllocationStats(allocations)

      dispatch({ type: "SET_ALLOCATIONS", payload: allocations })
      setValidationResults(validations)
      setAllocationStats(stats)
    } catch (error) {
      console.error("分隊演算法執行失敗:", error)
      // 向用戶顯示更具體的錯誤信息
      const errorMessage = error instanceof Error ? error.message : '請稍後再試'
      alert(`分隊過程中發生錯誤：${errorMessage}`)
    } finally {
      setIsAllocating(false)
    }
  }

  const handleNextRound = async () => {
    setIsProcessingNextRound(true)
    
    // Simulate brief processing time for better UX feedback
    setTimeout(() => {
      dispatch({ type: "NEXT_ROUND" })
      setAllocationStats(null)
      setValidationResults([])
      setIsProcessingNextRound(false)
    }, 400)
  }

  const handleResetGame = () => {
    dispatch({ type: "RESET_GAME" })
    setAllocationStats(null)
    setValidationResults([])
  }

  const getSkillLevelColor = (level: number) => {
    if (level <= 3) return "bg-red-100 text-red-800 border-red-200"
    if (level <= 6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (level <= 8) return "bg-blue-100 text-blue-800 border-blue-200"
    return "bg-green-100 text-green-800 border-green-200"
  }

  const activeCourts = state.courts.filter((court) => court.isActive)
  const maxPossiblePlayers = activeCourts.length * 4
  const canAllocate = state.participants.length >= 4 && activeCourts.length > 0

  return (
    <div className="space-y-6">
      {/* Allocation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5" />
            智慧分隊 - 第 {state.currentGameNumber} 場
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                分隊演算法將確保：1) 所有人都要先打過1場才能開始打第二場 2) 場次差距不超過1 3) 各場地實力盡量均衡
              </AlertDescription>
            </Alert>

            {/* Status Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{state.participants.length}</div>
                <div className="text-sm text-muted-foreground">總參與者</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{activeCourts.length}</div>
                <div className="text-sm text-muted-foreground">可用場地</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.min(maxPossiblePlayers, state.participants.length)}
                </div>
                <div className="text-sm text-muted-foreground">本輪參與</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.max(0, state.participants.length - maxPossiblePlayers)}
                </div>
                <div className="text-sm text-muted-foreground">輪空人數</div>
              </div>
            </div>

            {!canAllocate && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {state.participants.length < 4
                    ? "至少需要4名參與者才能開始分隊"
                    : "沒有可用的場地，請在場地設置中啟用至少一個場地"}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAllocate} disabled={isAllocating || !canAllocate} className="flex-1" size="lg">
                {isAllocating ? (
                  <>
                    <Shuffle className="w-4 h-4 mr-2 animate-spin" />
                    正在智慧分隊中...
                  </>
                ) : (
                  <>
                    <Shuffle className="w-4 h-4 mr-2" />
                    開始智慧分隊
                  </>
                )}
              </Button>

              {state.currentAllocations.length > 0 && (
                <>
                  <Button 
                    onClick={handleNextRound} 
                    variant="outline" 
                    size="lg"
                    className="transition-all duration-200 active:scale-95 hover:shadow-md"
                    disabled={isProcessingNextRound}
                  >
                    {isProcessingNextRound ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        處理中...
                      </>
                    ) : (
                      '下一場'
                    )}
                  </Button>
                  <Button onClick={handleResetGame} variant="outline" size="lg">
                    重設
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocation Statistics */}
      {allocationStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              分隊統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">平均技能等級</span>
                  <Badge variant="secondary">{allocationStats.averageSkillLevel}級</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">參與人數</span>
                  <span className="font-medium">{allocationStats.totalPlayers}人</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">平衡分數</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>實力均衡度</span>
                    <span>{allocationStats.balanceScore}/10</span>
                  </div>
                  <Progress value={allocationStats.balanceScore * 10} className="h-2" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">等級分佈</span>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(allocationStats.skillLevelDistribution).map(([level, count]) => (
                    <div key={level} className="flex justify-between">
                      <span>{level}級:</span>
                      <span>{count}人</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allocation Results */}
      {state.currentAllocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              分隊結果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {state.currentAllocations.map((allocation, index) => {
                const validation = validationResults.find((v) => v.courtId === allocation.courtId)

                return (
                  <Card key={allocation.courtId} className="border-2 border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{allocation.courtName}</span>
                        <div className="flex items-center gap-2">
                          {validation?.isValid ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <Badge variant="secondary">{allocation.players.length}/4 人</Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {allocation.players.map((player, playerIndex) => (
                          <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{player.name}</span>
                              <Badge className={getSkillLevelColor(player.skillLevel)}>{player.skillLevel}級</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">已參與 {player.gamesPlayed} 場</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">平均等級:</span>
                          <span className="font-medium">{allocation.averageSkillLevel}級</span>
                        </div>

                        {validation && !validation.isValid && (
                          <div className="text-xs text-red-600">
                            <div className="font-medium">約束違反:</div>
                            {validation.violations.map((violation: string, i: number) => (
                              <div key={i}>• {violation}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waiting Players */}
      {state.currentAllocations.length > 0 && state.participants.length > allocationStats?.totalPlayers && (
        <Card>
          <CardHeader>
            <CardTitle>輪空選手</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {state.participants
                .filter(
                  (participant) =>
                    !state.currentAllocations.some((allocation) =>
                      allocation.players.some((player) => player.id === participant.id),
                    ),
                )
                .map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">{participant.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getSkillLevelColor(participant.skillLevel)}>{participant.skillLevel}級</Badge>
                      <span className="text-sm text-muted-foreground">已參與 {participant.gamesPlayed} 場</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
