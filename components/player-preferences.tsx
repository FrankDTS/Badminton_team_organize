"use client"

import { useState } from "react"
import { useAppContext, type Participant, type PlayerPreference } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Heart, X, Plus, Settings } from "lucide-react"

interface PlayerPreferencesProps {
  participantId: string
}

export function PlayerPreferences({ participantId }: PlayerPreferencesProps) {
  const { state, dispatch } = useAppContext()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [preferenceType, setPreferenceType] = useState<'preferred' | 'avoided'>('preferred')

  const participant = state.participants.find(p => p.id === participantId)
  if (!participant) return null

  // 獲取其他可選擇的玩家（排除自己）
  const availablePlayers = state.participants.filter(p => 
    p.id !== participantId && 
    !participant.preferences.some(pref => pref.playerId === p.id)
  )

  const handleAddPreference = () => {
    if (!selectedPlayerId) return

    const targetPlayer = state.participants.find(p => p.id === selectedPlayerId)
    if (!targetPlayer) return

    const newPreference: PlayerPreference = {
      playerId: selectedPlayerId,
      playerName: targetPlayer.name,
      preference: preferenceType
    }

    const updatedParticipant: Participant = {
      ...participant,
      preferences: [...participant.preferences, newPreference]
    }

    dispatch({
      type: "UPDATE_PARTICIPANT",
      payload: updatedParticipant
    })

    setSelectedPlayerId("")
  }

  const handleRemovePreference = (playerId: string) => {
    const updatedParticipant: Participant = {
      ...participant,
      preferences: participant.preferences.filter(pref => pref.playerId !== playerId)
    }

    dispatch({
      type: "UPDATE_PARTICIPANT",
      payload: updatedParticipant
    })
  }

  const preferredPlayers = participant.preferences.filter(pref => pref.preference === 'preferred')
  const avoidedPlayers = participant.preferences.filter(pref => pref.preference === 'avoided')

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 gap-1"
        >
          <Settings className="w-3 h-3" />
          偏好設定
          {participant.preferences.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
              {participant.preferences.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {participant.name} 的配對偏好
          </DialogTitle>
          <DialogDescription>
            設定希望配對或避免配對的夥伴
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 添加新偏好 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">新增偏好設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="選擇玩家" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlayers.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name} (等級 {player.skillLevel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={preferenceType} 
                  onValueChange={(value: 'preferred' | 'avoided') => setPreferenceType(value)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preferred">偏好</SelectItem>
                    <SelectItem value="avoided">避免</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleAddPreference} 
                disabled={!selectedPlayerId}
                className="w-full"
                size="sm"
              >
                <Plus className="w-3 h-3 mr-1" />
                新增偏好
              </Button>
            </CardContent>
          </Card>

          {/* 目前的偏好設定 */}
          <div className="space-y-3">
            {/* 偏好配對 */}
            {preferredPlayers.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1 text-green-600">
                    <Heart className="w-3 h-3" />
                    希望配對 ({preferredPlayers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1">
                      {preferredPlayers.map(pref => (
                        <div key={pref.playerId} className="flex items-center justify-between py-1">
                          <span className="text-sm">{pref.playerName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePreference(pref.playerId)}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* 避免配對 */}
            {avoidedPlayers.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1 text-red-600">
                    <X className="w-3 h-3" />
                    避免配對 ({avoidedPlayers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1">
                      {avoidedPlayers.map(pref => (
                        <div key={pref.playerId} className="flex items-center justify-between py-1">
                          <span className="text-sm">{pref.playerName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePreference(pref.playerId)}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* 空狀態 */}
            {participant.preferences.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">尚未設定任何偏好</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 說明 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>偏好配對</strong>：系統會優先安排與這些玩家一起比賽</p>
            <p><strong>避免配對</strong>：系統會盡量避免與這些玩家配對</p>
            <p>注意：系統會在滿足公平性的前提下考慮偏好設定</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}