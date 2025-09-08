"use client"

import type React from "react"
import { createContext, useContext, useReducer, type ReactNode } from "react"

export interface Participant {
  id: string
  name: string
  skillLevel: number
  gamesPlayed: number
  lastPlayedRound: number // 添加最後參與輪次記錄
  rotationPriority: number // 添加輪換優先級
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
  currentRound: number
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
  | { type: "UPDATE_ROTATION_QUEUE"; payload: RotationQueue } // 添加輪換隊列更新
  | { type: "ADJUST_ROTATION_PRIORITY"; payload: { participantId: string; newPriority: number } } // 添加手動調整輪換優先級
  | { type: "NEXT_ROUND" }
  | { type: "RESET_GAME" }

const initialState: AppState = {
  participants: [],
  courts: [
    { id: "1", name: "場地 1", isActive: true, currentPlayers: [] },
    { id: "2", name: "場地 2", isActive: true, currentPlayers: [] },
  ],
  currentAllocations: [],
  gameHistory: [],
  currentRound: 1,
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
      return {
        ...state,
        participants: state.participants.map((p) => (p.id === action.payload.id ? action.payload : p)),
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
              round: state.currentRound,
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
    case "ADJUST_ROTATION_PRIORITY": // 處理手動調整輪換優先級
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.payload.participantId ? { ...p, rotationPriority: action.payload.newPriority } : p,
        ),
      }
    case "NEXT_ROUND":
      const updatedParticipants = state.participants.map((p) => {
        const wasPlaying = state.currentAllocations.some((alloc) => alloc.players.some((player) => player.id === p.id))
        return {
          ...p,
          gamesPlayed: wasPlaying ? p.gamesPlayed + 1 : p.gamesPlayed,
          lastPlayedRound: wasPlaying ? state.currentRound : p.lastPlayedRound,
        }
      })

      return {
        ...state,
        gameHistory: [...state.gameHistory, state.currentAllocations],
        currentAllocations: [],
        currentRound: state.currentRound + 1,
        participants: updatedParticipants,
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
