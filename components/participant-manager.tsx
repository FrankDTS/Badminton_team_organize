"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, User, Edit, Check, X, UserX } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppContext, type Participant } from "@/lib/app-context"
import { sanitizeParticipantData, participantSchema } from "@/lib/security"
import { PlayerPreferences } from "@/components/player-preferences"

export function ParticipantManager() {
  const { state, dispatch } = useAppContext()
  const [newName, setNewName] = useState("")
  const [newSkillLevel, setNewSkillLevel] = useState<number>(5)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSkillLevel, setEditSkillLevel] = useState<number>(5)
  const [editingGamesId, setEditingGamesId] = useState<string | null>(null)
  const [editGamesPlayed, setEditGamesPlayed] = useState<number>(0)
  const [error, setError] = useState<string>("")

  const addParticipant = () => {
    setError("")
    
    if (!newName.trim()) {
      setError("請輸入參與者姓名")
      return
    }
    
    try {
      const sanitizedData = sanitizeParticipantData({
        name: newName,
        skillLevel: newSkillLevel
      })
      
      const validatedData = participantSchema.parse(sanitizedData)
      
      const newParticipant: Participant = {
        id: Date.now().toString(),
        name: validatedData.name,
        skillLevel: validatedData.skillLevel,
        gamesPlayed: 0,
      }
      dispatch({ type: "ADD_PARTICIPANT", payload: newParticipant })
      setNewName("")
      setNewSkillLevel(5)
      setError("")
    } catch (error: any) {
      if (error.errors && error.errors.length > 0) {
        setError(error.errors[0].message)
      } else {
        setError("新增參與者時發生錯誤，請檢查輸入資料")
      }
      console.error('Invalid participant data:', error)
    }
  }

  const removeParticipant = (id: string) => {
    dispatch({ type: "REMOVE_PARTICIPANT", payload: id })
  }

  const removeAllParticipants = () => {
    if (window.confirm("確定要刪除所有參與者嗎？此操作無法復原。")) {
      dispatch({ type: "REMOVE_ALL_PARTICIPANTS" })
    }
  }

  const startEditing = (participant: Participant) => {
    setEditingId(participant.id)
    setEditSkillLevel(participant.skillLevel)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditSkillLevel(5)
  }

  const startEditingGames = (participant: Participant) => {
    setEditingGamesId(participant.id)
    setEditGamesPlayed(participant.gamesPlayed)
  }

  const cancelEditingGames = () => {
    setEditingGamesId(null)
    setEditGamesPlayed(0)
  }

  const saveSkillLevel = (participant: Participant) => {
    const updatedParticipant: Participant = {
      ...participant,
      skillLevel: editSkillLevel,
    }
    dispatch({ type: "UPDATE_PARTICIPANT", payload: updatedParticipant })
    setEditingId(null)
    setEditSkillLevel(5)
  }

  const saveGamesPlayed = (participant: Participant) => {
    const updatedParticipant: Participant = {
      ...participant,
      gamesPlayed: Math.max(0, editGamesPlayed), // 確保不會是負數
    }
    
    // 檢查是否有場次變化
    const hasGamesChanged = participant.gamesPlayed !== updatedParticipant.gamesPlayed
    
    dispatch({ type: "UPDATE_PARTICIPANT", payload: updatedParticipant })
    setEditingGamesId(null)
    setEditGamesPlayed(0)
    
    // 如果場次有變化，提示用戶
    if (hasGamesChanged) {
      // 可以添加 toast 通知或其他提示
      console.log(`${participant.name} 的場次已更新，當前分隊將被重置`)
    }
  }

  const getSkillLevelColor = (level: number) => {
    if (level <= 3) return "bg-red-100 text-red-800 border-red-200"
    if (level <= 6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (level <= 8) return "bg-blue-100 text-blue-800 border-blue-200"
    return "bg-green-100 text-green-800 border-green-200"
  }

  const getSkillLevelText = (level: number) => {
    if (level <= 3) return "初級"
    if (level <= 6) return "中級"
    if (level <= 8) return "高級"
    return "專業"
  }

  return (
    <div className="space-y-6">
      {/* Add Participant Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            新增參與者
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                placeholder="輸入參與者姓名"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  if (error) setError("")
                }}
                onKeyDown={(e) => e.key === "Enter" && addParticipant()}
                className={error ? "border-red-500" : ""}
              />
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-level">能力等級</Label>
              <Select
                value={newSkillLevel.toString()}
                onValueChange={(value) => setNewSkillLevel(Number.parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇能力等級" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      {level}級 - {getSkillLevelText(level)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addParticipant} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                新增
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="w-5 h-5" />
              參與者列表
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">總計: {state.participants.length} 人</Badge>
              {state.participants.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeAllParticipants}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <UserX className="w-4 h-4 mr-1" />
                  清空全部
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>尚未新增參與者</p>
              <p className="text-sm">請在上方新增參與者資訊</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.participants.map((participant) => (
                <Card key={participant.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{participant.name}</h3>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(participant)}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParticipant(participant.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">能力等級:</span>
                        {editingId === participant.id ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={editSkillLevel.toString()}
                              onValueChange={(value) => setEditSkillLevel(Number.parseInt(value))}
                            >
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                                  <SelectItem key={level} value={level.toString()}>
                                    {level}級
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveSkillLevel(participant)}
                              className="text-green-600 hover:text-green-600 hover:bg-green-600/10 p-1 h-8 w-8"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                              className="text-red-600 hover:text-red-600 hover:bg-red-600/10 p-1 h-8 w-8"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge className={getSkillLevelColor(participant.skillLevel)}>{participant.skillLevel}級</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">已參與場次:</span>
                        {editingGamesId === participant.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                value={editGamesPlayed}
                                onChange={(e) => setEditGamesPlayed(Number.parseInt(e.target.value) || 0)}
                                className="w-16 h-8 text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveGamesPlayed(participant)}
                                className="text-green-600 hover:text-green-600 hover:bg-green-600/10 p-1 h-8 w-8"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditingGames}
                                className="text-red-600 hover:text-red-600 hover:bg-red-600/10 p-1 h-8 w-8"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border">
                              注意：修改場次會重置當前分隊
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{participant.gamesPlayed}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingGames(participant)}
                              className="text-primary hover:text-primary hover:bg-primary/10 p-1 h-8 w-8"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* 偏好設定 */}
                      <div className="pt-2 border-t">
                        <PlayerPreferences participantId={participant.id} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {state.participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>統計資訊</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {state.participants.filter((p) => p.skillLevel <= 3).length}
                </div>
                <div className="text-sm text-muted-foreground">初級選手</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {state.participants.filter((p) => p.skillLevel > 3 && p.skillLevel <= 6).length}
                </div>
                <div className="text-sm text-muted-foreground">中級選手</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {state.participants.filter((p) => p.skillLevel > 6 && p.skillLevel <= 8).length}
                </div>
                <div className="text-sm text-muted-foreground">高級選手</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {state.participants.filter((p) => p.skillLevel > 8).length}
                </div>
                <div className="text-sm text-muted-foreground">專業選手</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
