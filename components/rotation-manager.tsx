"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, TrendingUp, Clock, ArrowUp, ArrowDown, Shuffle } from "lucide-react"
import { useAppContext } from "@/lib/app-context"
import { TeamAllocationAlgorithm } from "@/lib/team-allocation-algorithm"

export function RotationManager() {
  const { state, dispatch } = useAppContext()
  const [rotationPrediction, setRotationPrediction] = useState<any>(null)
  const [rotationStats, setRotationStats] = useState<any>(null)

  const algorithm = new TeamAllocationAlgorithm()

  useEffect(() => {
    if (state.participants.length > 0) {
      const prediction = algorithm.predictNextRotation(state.participants, state.courts, state.currentRound)
      const stats = algorithm.getRotationStats(state.participants, state.currentRound)
      
      setRotationPrediction(prediction)
      setRotationStats(stats)
    }
  }, [state.participants, state.courts, state.currentRound])

  const activeCourts = state.courts.filter(court => court.isActive)
  const maxPlayersPerRound = activeCourts.length * 4
  const needsRotation = state.participants.length > maxPlayersPerRound

  const adjustPriority = (participantId: string, direction: 'up' | 'down') => {
    const participant = state.participants.find(p => p.id === participantId)
    if (!participant) return

    const currentPriority = participant.rotationPriority
    const newPriority = direction === 'up' 
      ? Math.max(0, currentPriority - 1)
      : currentPriority + 1

    dispatch({
      type: "ADJUST_ROTATION_PRIORITY",
      payload: { participantId, newPriority }
    })
  }

  const getSkillLevelColor = (level: number) => {
    if (level <= 3) return "bg-red-100 text-red-800 border-red-200"
    if (level <= 6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (level <= 8) return "bg-blue-100 text-blue-800 border-blue-200"
    return "bg-green-100 text-green-800 border-green-200"
  }

  if (!needsRotation) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-2">當前不需要輪換</p>
          <p className="text-sm text-muted-foreground">
            參與者數量 ({state.participants.length}) 未超過場地容量 ({maxPlayersPerRound})
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rotation Statistics */}
      {rotationStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              轮换统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">公平性评分</span>
                  <Badge variant="secondary">{rotationStats.fairnessScore}/10</Badge>
                </div>
                <Progress value={rotationStats.fairnessScore * 10} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">轮换效率</span>
                  <Badge variant="secondary">{rotationStats.rotationEfficiency}/10</Badge>
                </div>
                <Progress value={rotationStats.rotationEfficiency * 10} className="h-2" />
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{rotationStats.maxGamesDifference}</div>
                <div className="text-sm text-muted-foreground">最大場次差距</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{rotationStats.averageWaitTime}</div>
                <div className="text-sm text-muted-foreground">平均等待轮次</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Round Prediction */}
      {rotationPrediction && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Next Up Players */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="w-5 h-5" />
                下轮上场预测
                <Badge variant="default">{rotationPrediction.nextUpPlayers.length} 人</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rotationPrediction.nextUpPlayers.map((player: any, index: number) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <span className="font-medium">{player.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getSkillLevelColor(player.skillLevel)} size="sm">
                            {player.skillLevel}级
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            已参与 {player.gamesPlayed} 场
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => adjustPriority(player.id, 'up')}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => adjustPriority(player.id, 'down')}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Waiting Players */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                輪空隊列
                <Badge variant="secondary">{rotationPrediction.waitingPlayers.length} 人</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rotationPrediction.waitingPlayers.map((player: any, index: number) => {
                  const waitRounds = rotationPrediction.estimatedWaitRounds[player.id] || 0
                  
                  return (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <span className="font-medium">{player.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getSkillLevelColor(player.skillLevel)} size="sm">
                              {player.skillLevel}级
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              已参与 {player.gamesPlayed} 场
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-orange-600">
                          预计等待 {waitRounds} 轮
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => adjustPriority(player.id, 'up')}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => adjustPriority(player.id, 'down')}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
