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

export function ParticipantManager() {
  const { state, dispatch } = useAppContext()
  const [newName, setNewName] = useState("")
  const [newSkillLevel, setNewSkillLevel] = useState<number>(5)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSkillLevel, setEditSkillLevel] = useState<number>(5)

  const addParticipant = () => {
    if (newName.trim()) {
      const newParticipant: Participant = {
        id: Date.now().toString(),
        name: newName.trim(),
        skillLevel: newSkillLevel,
        gamesPlayed: 0,
      }
      dispatch({ type: "ADD_PARTICIPANT", payload: newParticipant })
      setNewName("")
      setNewSkillLevel(5)
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

  const saveSkillLevel = (participant: Participant) => {
    const updatedParticipant: Participant = {
      ...participant,
      skillLevel: editSkillLevel,
    }
    dispatch({ type: "UPDATE_PARTICIPANT", payload: updatedParticipant })
    setEditingId(null)
    setEditSkillLevel(5)
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
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addParticipant()}
              />
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
                        <span className="text-sm font-medium">{participant.gamesPlayed}</span>
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
