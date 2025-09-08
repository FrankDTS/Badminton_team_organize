"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Play, Pause, RotateCcw, Trophy, Users, Timer, History, TrendingUp } from "lucide-react"
import { useAppContext } from "@/lib/app-context"

interface GameTimer {
  startTime: Date | null
  duration: number // in minutes
  isRunning: boolean
}

export function GameSchedule() {
  const { state } = useAppContext()
  const [gameTimer, setGameTimer] = useState<GameTimer>({
    startTime: null,
    duration: 0,
    isRunning: false,
  })
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!gameTimer.startTime || !gameTimer.isRunning) {
      return gameTimer.duration
    }

    const elapsed = Math.floor((currentTime.getTime() - gameTimer.startTime.getTime()) / 1000 / 60)
    return gameTimer.duration + elapsed
  }

  const startTimer = () => {
    setGameTimer({
      startTime: new Date(),
      duration: gameTimer.duration,
      isRunning: true,
    })
  }

  const pauseTimer = () => {
    if (gameTimer.startTime) {
      const elapsed = Math.floor((currentTime.getTime() - gameTimer.startTime.getTime()) / 1000 / 60)
      setGameTimer({
        startTime: null,
        duration: gameTimer.duration + elapsed,
        isRunning: false,
      })
    }
  }

  const resetTimer = () => {
    setGameTimer({
      startTime: null,
      duration: 0,
      isRunning: false,
    })
  }

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hrs > 0 ? `${hrs}小時${mins}分鐘` : `${mins}分鐘`
  }

  const getSkillLevelColor = (level: number) => {
    if (level <= 3) return "bg-red-100 text-red-800 border-red-200"
    if (level <= 6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (level <= 8) return "bg-blue-100 text-blue-800 border-blue-200"
    return "bg-green-100 text-green-800 border-green-200"
  }

  const totalGamesPlayed = state.gameHistory.length
  const currentElapsedTime = getElapsedTime()

  return (
    <div className="space-y-6">
      {/* Game Timer and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            比賽計時器
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{formatTime(currentElapsedTime)}</div>
              <div className="text-sm text-muted-foreground">{gameTimer.isRunning ? "比賽進行中" : "比賽暫停"}</div>
            </div>

            <div className="flex justify-center gap-2">
              {!gameTimer.isRunning ? (
                <Button onClick={startTimer} className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  開始
                </Button>
              ) : (
                <Button onClick={pauseTimer} variant="outline" className="flex items-center gap-2 bg-transparent">
                  <Pause className="w-4 h-4" />
                  暫停
                </Button>
              )}

              <Button onClick={resetTimer} variant="outline" className="flex items-center gap-2 bg-transparent">
                <RotateCcw className="w-4 h-4" />
                重設
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Round Status */}
      {state.currentAllocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              目前比賽 - 第 {state.currentRound} 輪
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.currentAllocations.map((allocation) => (
                <Card key={allocation.courtId} className="border-2 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{allocation.courtName}</span>
                      <Badge
                        variant={gameTimer.isRunning ? "default" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        {gameTimer.isRunning ? (
                          <>
                            <Play className="w-3 h-3" />
                            進行中
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3" />
                            暫停
                          </>
                        )}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {allocation.players.map((player) => (
                        <div key={player.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{player.name}</span>
                          <Badge className={getSkillLevelColor(player.skillLevel)} size="sm">
                            {player.skillLevel}級
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>平均等級:</span>
                        <span className="font-medium">{allocation.averageSkillLevel}級</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            比賽統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{state.currentRound}</div>
              <div className="text-sm text-muted-foreground">目前輪次</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalGamesPlayed}</div>
              <div className="text-sm text-muted-foreground">已完成輪次</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {state.participants.length > 0
                  ? Math.round(
                      (state.participants.reduce((sum, p) => sum + p.gamesPlayed, 0) / state.participants.length) * 10,
                    ) / 10
                  : 0}
              </div>
              <div className="text-sm text-muted-foreground">平均參與場次</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatTime(currentElapsedTime)}</div>
              <div className="text-sm text-muted-foreground">總用時</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participant Progress */}
      {state.participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              參與者進度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {state.participants
                .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
                .map((participant) => {
                  const maxGames = Math.max(...state.participants.map((p) => p.gamesPlayed))
                  const progressPercentage = maxGames > 0 ? (participant.gamesPlayed / maxGames) * 100 : 0

                  return (
                    <div key={participant.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{participant.name}</span>
                          <Badge className={getSkillLevelColor(participant.skillLevel)} size="sm">
                            {participant.skillLevel}級
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{participant.gamesPlayed} 場</div>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game History */}
      {state.gameHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              比賽歷史
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {state.gameHistory.map((round, roundIndex) => (
                <Card key={roundIndex} className="border border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="w-4 h-4" />第 {roundIndex + 1} 輪
                      <Badge variant="outline" size="sm">
                        已完成
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {round.map((allocation) => (
                        <div key={allocation.courtId} className="p-3 bg-muted rounded-lg">
                          <div className="font-medium text-sm mb-2">{allocation.courtName}</div>
                          <div className="space-y-1">
                            {allocation.players.map((player) => (
                              <div key={player.id} className="flex items-center justify-between text-xs">
                                <span>{player.name}</span>
                                <Badge className={getSkillLevelColor(player.skillLevel)} size="sm">
                                  {player.skillLevel}
                                </Badge>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                            平均: {allocation.averageSkillLevel}級
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {state.currentAllocations.length === 0 && state.gameHistory.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-2">尚未開始比賽</p>
            <p className="text-sm text-muted-foreground">請先在「分隊安排」頁面進行智慧分隊，然後回到這裡檢視比賽進度</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
