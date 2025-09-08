"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Play, Users, Settings, Loader2 } from "lucide-react"
import { useAppContext } from "@/lib/app-context"
import { TeamAllocationAlgorithm } from "@/lib/team-allocation-algorithm"

export function CourtDisplay() {
  const { state, dispatch } = useAppContext()
  const [courtCount, setCourtCount] = useState(state.courts.length)
  const [loadingCourts, setLoadingCourts] = useState<Set<string>>(new Set())
  const algorithm = new TeamAllocationAlgorithm()

  const updateCourtCount = () => {
    if (courtCount < 1 || courtCount > 10) {
      alert("場地數量必須介於1-10之間")
      return
    }

    const newCourts = Array.from({ length: courtCount }, (_, i) => ({
      id: (i + 1).toString(),
      name: `場地 ${i + 1}`,
      isActive: true,
      currentPlayers: []
    }))

    dispatch({ type: "SET_COURTS", payload: newCourts })
  }

  const handleNextRoundForCourt = async (courtId: string) => {
    if (state.participants.length < 4) {
      alert("至少需要4名參與者才能開始遊戲")
      return
    }

    // Add loading state
    setLoadingCourts(prev => new Set(prev).add(courtId))

    // 檢查該場地是否已有分配
    const existingCourtAllocation = state.currentAllocations.find(alloc => alloc.courtId === courtId)
    
    // 如果該場地已有分配，更新參與者的遊戲場數
    if (existingCourtAllocation) {
      existingCourtAllocation.players.forEach(player => {
        const participantToUpdate = state.participants.find(p => p.id === player.id)
        if (participantToUpdate) {
          const updatedParticipant = {
            ...participantToUpdate,
            gamesPlayed: participantToUpdate.gamesPlayed + 1,
            lastPlayedRound: state.currentRound
          }
          dispatch({ type: "UPDATE_PARTICIPANT", payload: updatedParticipant })
        }
      })
      
      // 移除該場地的當前分配
      const updatedAllocations = state.currentAllocations.filter(alloc => alloc.courtId !== courtId)
      dispatch({ type: "SET_ALLOCATIONS", payload: updatedAllocations })
    }

    // 為該特定場地分配新的隊伍
    const availableParticipants = state.participants.filter(participant => {
      // 排除其他場地正在使用的參與者
      const isPlayingOnOtherCourts = state.currentAllocations.some(alloc => 
        alloc.courtId !== courtId && alloc.players.some(player => player.id === participant.id)
      )
      return !isPlayingOnOtherCourts
    })

    if (availableParticipants.length < 4) {
      alert("沒有足夠的可用參與者為此場地分隊")
      return
    }

    // 只為這一個場地分配
    const singleCourt = state.courts.find(court => court.id === courtId)
    if (!singleCourt) return

    const newAllocation = algorithm.allocateTeams(availableParticipants, [singleCourt], state.currentRound)
    
    console.log(`Court ${courtId} new allocation:`, newAllocation) // 調試信息
    
    if (newAllocation.length === 0) {
      alert("該場地分隊失敗")
      return
    }

    // 合併新分配到現有分配中
    const updatedAllocations = [
      ...state.currentAllocations.filter(alloc => alloc.courtId !== courtId),
      ...newAllocation
    ]
    
    dispatch({ type: "SET_ALLOCATIONS", payload: updatedAllocations })

    // Simulate brief loading for better UX feedback
    setTimeout(() => {
      setLoadingCourts(prev => {
        const newSet = new Set(prev)
        newSet.delete(courtId)
        return newSet
      })
    }, 300)
  }

  const getSkillLevelColor = (level: number) => {
    if (level <= 3) return "bg-red-100 text-red-800 border-red-200"
    if (level <= 6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (level <= 8) return "bg-blue-100 text-blue-800 border-blue-200"
    return "bg-green-100 text-green-800 border-green-200"
  }

  return (
    <div className="space-y-6">
      {/* Court Count Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            場地設置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="court-count">場地數量</Label>
              <Input
                id="court-count"
                type="number"
                min="1"
                max="10"
                value={courtCount}
                onChange={(e) => setCourtCount(parseInt(e.target.value) || 1)}
                className="w-32"
              />
            </div>
            <Button onClick={updateCourtCount}>
              更新場地
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Player Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            參與者統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{state.participants.length}</div>
              <div className="text-sm text-muted-foreground">總參與人數</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{state.currentRound - 1}</div>
              <div className="text-sm text-muted-foreground">已完成輪次</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {state.courts.filter(court => court.isActive).length * 4}
              </div>
              <div className="text-sm text-muted-foreground">每輪最大容納人數</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courts Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.courts.filter(court => court.isActive).map((court) => {
          const courtAllocation = state.currentAllocations.find(alloc => alloc.courtId === court.id)
          
          // 調試信息
          console.log(`Court ${court.id}:`, {
            courtAllocation,
            currentAllocations: state.currentAllocations,
            participants: state.participants.length,
            currentRound: state.currentRound
          })
          
          return (
            <Card key={court.id} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {court.name}
                  </span>
                  <Button
                    onClick={() => handleNextRoundForCourt(court.id)}
                    className="flex items-center gap-2 transition-all duration-200 active:scale-95 hover:shadow-md"
                    disabled={state.participants.length < 4 || loadingCourts.has(court.id)}
                  >
                    {loadingCourts.has(court.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {loadingCourts.has(court.id) ? '處理中...' : (courtAllocation ? '下一輪' : '開始分隊')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {courtAllocation && courtAllocation.players.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Badge variant="secondary">
                        第 {state.currentRound - 1} 輪 - 平均等級: {courtAllocation.averageSkillLevel}
                      </Badge>
                    </div>
                    
                    {/* 羽球場地圖案 */}
                    <div className="relative bg-green-50 border-2 border-green-300 rounded-lg p-6 min-h-[300px]">
                      {/* 場地邊界線 */}
                      <div className="absolute inset-4 border-2 border-white rounded-sm">
                        {/* 中線 */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white transform -translate-x-0.5"></div>
                        {/* 發球線 */}
                        <div className="absolute left-0 right-0 top-1/4 h-0.5 bg-white"></div>
                        <div className="absolute left-0 right-0 bottom-1/4 h-0.5 bg-white"></div>
                      </div>
                      
                      {/* 球員位置 */}
                      {courtAllocation.players.length >= 4 && (
                        <>
                          {/* 左上球員 */}
                          <div className="absolute top-4 left-4">
                            <div className="bg-blue-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-xs font-bold shadow-lg">
                              <div className="text-center">
                                <div className="text-xs truncate w-12">{courtAllocation.players[0].name}</div>
                                <div className="text-xs">{courtAllocation.players[0].skillLevel}級</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 右上球員 */}
                          <div className="absolute top-4 right-4">
                            <div className="bg-red-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-xs font-bold shadow-lg">
                              <div className="text-center">
                                <div className="text-xs truncate w-12">{courtAllocation.players[1].name}</div>
                                <div className="text-xs">{courtAllocation.players[1].skillLevel}級</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 左下球員 */}
                          <div className="absolute bottom-4 left-4">
                            <div className="bg-blue-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-xs font-bold shadow-lg">
                              <div className="text-center">
                                <div className="text-xs truncate w-12">{courtAllocation.players[2].name}</div>
                                <div className="text-xs">{courtAllocation.players[2].skillLevel}級</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 右下球員 */}
                          <div className="absolute bottom-4 right-4">
                            <div className="bg-red-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-xs font-bold shadow-lg">
                              <div className="text-center">
                                <div className="text-xs truncate w-12">{courtAllocation.players[3].name}</div>
                                <div className="text-xs">{courtAllocation.players[3].skillLevel}級</div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* 中央網子 */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-400 transform -translate-x-0.5 opacity-60"></div>
                      
                      {/* 場地標示 */}
                      <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                        <Badge variant="outline" className="bg-white/80">
                          羽球場
                        </Badge>
                      </div>
                    </div>

                    {/* 隊伍說明 */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">藍隊</span>
                        <div className="text-xs text-muted-foreground">
                          ({courtAllocation.players[0]?.gamesPlayed || 0} + {courtAllocation.players[2]?.gamesPlayed || 0} 場)
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium">紅隊</span>
                        <div className="text-xs text-muted-foreground">
                          ({courtAllocation.players[1]?.gamesPlayed || 0} + {courtAllocation.players[3]?.gamesPlayed || 0} 場)
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>場地空閒中</p>
                    {state.participants.length < 4 ? (
                      <p className="text-sm text-orange-600">需要至少4名參與者才能開始分隊</p>
                    ) : (
                      <p className="text-sm">點擊「下一輪」開始分隊</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* All Players Game Count Display */}
      {state.participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>所有參與者遊戲統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {state.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{participant.name}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge className={`text-xs ${getSkillLevelColor(participant.skillLevel)}`}>
                        {participant.skillLevel}級
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">{participant.gamesPlayed}</div>
                    <div className="text-xs text-muted-foreground">已打場數</div>
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