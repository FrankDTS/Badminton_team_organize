"use client"

import type React from "react"
import { createContext, useContext, useReducer, type ReactNode } from "react"

export interface PlayerPreference {
  playerId: string
  playerName: string
  preference: 'preferred' | 'avoided' // 偏好或避免
}

export interface Participant {
  id: string
  name: string
  skillLevel: number
  gamesPlayed: number
  lastPlayedRound: number // 添加最後參與輪次記錄
  rotationPriority: number // 添加輪換優先級
  preferences: PlayerPreference[] // 玩家偏好設定
}

export interface Court {
  id: string
  name: string
  isActive: boolean
  currentPlayers: Participant[]
}

export interface GameAllocation {
  courtId: string
  courtName: string
  players: Participant[]
  averageSkillLevel: number
  gameNumber: number
}

export interface RotationQueue {
  waitingPlayers: Participant[]
  nextUpPlayers: Participant[]
  rotationHistory: {
    round: number
    playingPlayers: string[]
    waitingPlayers: string[]
  }[]
}

interface AppState {
  participants: Participant[]
  courts: Court[]
  currentAllocations: GameAllocation[]
  gameHistory: GameAllocation[][]
  currentGameNumber: number // 當前遊戲編號（取代輪次）
  rotationQueue: RotationQueue // 添加輪換隊列狀態
}

type AppAction =
  | { type: "ADD_PARTICIPANT"; payload: Participant }
  | { type: "REMOVE_PARTICIPANT"; payload: string }
  | { type: "REMOVE_ALL_PARTICIPANTS" }
  | { type: "UPDATE_PARTICIPANT"; payload: Participant }
  | { type: "SET_COURTS"; payload: Court[] }
  | { type: "UPDATE_COURT"; payload: Court }
  | { type: "SET_ALLOCATIONS"; payload: GameAllocation[] }
  | { type: "COMPLETE_GAME_FOR_COURT"; payload: { courtId: string } } // 新增：完成某場地的遊戲
  | { type: "UPDATE_ROTATION_QUEUE"; payload: RotationQueue }
  | { type: "ADJUST_ROTATION_PRIORITY"; payload: { participantId: string; newPriority: number } }
  | { type: "NEXT_ROUND" }
  | { type: "RESET_GAME" }

const initialState: AppState = {
  participants: [
    // 5級玩家 (6個)
    { id: "1", name: "玩家1", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 0, preferences: [] },
    { id: "2", name: "玩家2", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1, preferences: [] },
    { id: "3", name: "玩家3", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 2, preferences: [] },
    { id: "4", name: "玩家4", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 3, preferences: [] },
    { id: "5", name: "玩家5", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 4, preferences: [] },
    { id: "6", name: "玩家6", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 5, preferences: [] },
    // 9級玩家 (3個)
    { id: "7", name: "玩家7", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 6, preferences: [] },
    { id: "8", name: "玩家8", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 7, preferences: [] },
    { id: "9", name: "玩家9", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 8, preferences: [] },
    // 2級玩家 (3個)
    { id: "10", name: "玩家10", skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 9, preferences: [] },
    { id: "11", name: "玩家11", skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 10, preferences: [] },
    { id: "12", name: "玩家12", skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 11, preferences: [] },
    // 7級玩家 (2個)
    { id: "13", name: "玩家13", skillLevel: 7, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 12, preferences: [] },
    { id: "14", name: "玩家14", skillLevel: 7, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 13, preferences: [] },
  ],
  courts: [
    { id: "1", name: "場地 1", isActive: true, currentPlayers: [] },
    { id: "2", name: "場地 2", isActive: true, currentPlayers: [] },
  ],
  currentAllocations: [],
  gameHistory: [],
  currentGameNumber: 1,
  rotationQueue: {
    // 初始化輪換隊列
    waitingPlayers: [],
    nextUpPlayers: [],
    rotationHistory: [],
  },
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "ADD_PARTICIPANT":
      return {
        ...state,
        participants: [
          ...state.participants,
          {
            ...action.payload,
            lastPlayedRound: 0, // 初始化新參與者的輪換相關字段
            rotationPriority: state.participants.length,
            preferences: [], // 初始化偏好設定為空陣列
          },
        ],
      }
    case "REMOVE_PARTICIPANT":
      return {
        ...state,
        participants: state.participants.filter((p) => p.id !== action.payload),
      }
    case "REMOVE_ALL_PARTICIPANTS":
      return {
        ...state,
        participants: [],
        currentAllocations: [],
        rotationQueue: {
          waitingPlayers: [],
          nextUpPlayers: [],
          rotationHistory: [],
        },
      }
    case "UPDATE_PARTICIPANT":
      const updatedParticipants = state.participants.map((p) => (p.id === action.payload.id ? action.payload : p))
      
      // 檢查是否有參與者的 gamesPlayed 被修改
      const originalParticipant = state.participants.find(p => p.id === action.payload.id)
      const gamesPlayedChanged = originalParticipant && originalParticipant.gamesPlayed !== action.payload.gamesPlayed
      
      return {
        ...state,
        participants: updatedParticipants,
        // 如果場次數據被修改，清空當前分配以觸發重新分隊
        currentAllocations: gamesPlayedChanged ? [] : state.currentAllocations,
      }
    case "SET_COURTS":
      return {
        ...state,
        courts: action.payload,
      }
    case "UPDATE_COURT":
      return {
        ...state,
        courts: state.courts.map((c) => (c.id === action.payload.id ? action.payload : c)),
      }
    case "SET_ALLOCATIONS":
      const playingPlayerIds = action.payload.flatMap((a) => a.players.map((p) => p.id))
      const waitingPlayers = state.participants.filter((p) => !playingPlayerIds.includes(p.id))

      return {
        ...state,
        currentAllocations: action.payload,
        rotationQueue: {
          ...state.rotationQueue,
          waitingPlayers,
          rotationHistory: [
            ...state.rotationQueue.rotationHistory,
            {
              round: state.currentGameNumber,
              playingPlayers: playingPlayerIds,
              waitingPlayers: waitingPlayers.map((p) => p.id),
            },
          ],
        },
      }
    case "UPDATE_ROTATION_QUEUE": // 處理輪換隊列更新
      return {
        ...state,
        rotationQueue: action.payload,
      }
    case "COMPLETE_GAME_FOR_COURT": // 處理某場地遊戲完成
      const courtAllocation = state.currentAllocations.find(alloc => alloc.courtId === action.payload.courtId)
      
      if (!courtAllocation) {
        return state // 如果沒有找到對應的分配，直接返回原狀態
      }
      
      // 計算當前輪次
      const activeCourts = state.courts.filter(c => c.isActive)
      const currentRound = Math.floor((state.currentGameNumber - 1) / activeCourts.length) + 1
      
      // 更新參與該場地遊戲的玩家統計
      const updatedParticipantsAfterGame = state.participants.map(p => {
        const wasPlayingOnThisCourt = courtAllocation.players.some(player => player.id === p.id)
        
        if (wasPlayingOnThisCourt) {
          return {
            ...p,
            gamesPlayed: p.gamesPlayed + 1,
            lastPlayedRound: currentRound,
          }
        }
        return p
      })
      
      return {
        ...state,
        participants: updatedParticipantsAfterGame,
      }
      
    case "ADJUST_ROTATION_PRIORITY": // 處理手動調整輪換優先級
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.payload.participantId ? { ...p, rotationPriority: action.payload.newPriority } : p,
        ),
      }
    case "NEXT_ROUND":
      const activeCourtsList = state.courts.filter(c => c.isActive)
      const courtsCount = activeCourtsList.length
      
      const participantsAfterRound = state.participants.map((p) => {
        const wasPlaying = state.currentAllocations.some((alloc) => alloc.players.some((player) => player.id === p.id))
        
        if (wasPlaying) {
          // 計算新的lastPlayedRound（基於遊戲編號計算輪次）
          const newRound = Math.floor((state.currentGameNumber - 1) / courtsCount) + 1
          return {
            ...p,
            gamesPlayed: p.gamesPlayed + 1,
            lastPlayedRound: newRound,
          }
        }
        return p
      })

      return {
        ...state,
        gameHistory: [...state.gameHistory, state.currentAllocations],
        currentAllocations: [],
        currentGameNumber: state.currentGameNumber + 1,
        participants: participantsAfterRound,
        rotationQueue: {
          waitingPlayers: [],
          nextUpPlayers: [],
          rotationHistory: state.rotationQueue.rotationHistory,
        },
      }
    case "RESET_GAME":
      return {
        ...initialState,
        courts: state.courts,
        currentGameNumber: 1,
        participants: state.participants.map((p) => ({
          ...p,
          gamesPlayed: 0,
          lastPlayedRound: 0, // 重置輪換相關字段
          rotationPriority: p.rotationPriority,
        })),
      }
    default:
      return state
  }
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider")
  }
  return context
}
