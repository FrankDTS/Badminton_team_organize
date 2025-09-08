"use client"

import type React from "react"
import { createContext, useContext, useReducer, type ReactNode } from "react"

export interface Participant {
  id: string
  name: string
  skillLevel: number
  gamesPlayed: number
  lastPlayedRound: number // 添加最后参与轮次记录
  rotationPriority: number // 添加轮换优先级
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
  rotationQueue: RotationQueue // 添加轮换队列状态
}

type AppAction =
  | { type: "ADD_PARTICIPANT"; payload: Participant }
  | { type: "REMOVE_PARTICIPANT"; payload: string }
  | { type: "REMOVE_ALL_PARTICIPANTS" }
  | { type: "UPDATE_PARTICIPANT"; payload: Participant }
  | { type: "SET_COURTS"; payload: Court[] }
  | { type: "UPDATE_COURT"; payload: Court }
  | { type: "SET_ALLOCATIONS"; payload: GameAllocation[] }
  | { type: "UPDATE_ROTATION_QUEUE"; payload: RotationQueue } // 添加轮换队列更新
  | { type: "ADJUST_ROTATION_PRIORITY"; payload: { participantId: string; newPriority: number } } // 添加手动调整轮换优先级
  | { type: "NEXT_ROUND" }
  | { type: "RESET_GAME" }

const initialState: AppState = {
  participants: [],
  courts: [
    { id: "1", name: "场地 1", isActive: true, currentPlayers: [] },
    { id: "2", name: "场地 2", isActive: true, currentPlayers: [] },
  ],
  currentAllocations: [],
  gameHistory: [],
  currentRound: 1,
  rotationQueue: {
    // 初始化轮换队列
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
            lastPlayedRound: 0, // 初始化新参与者的轮换相关字段
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
    case "UPDATE_ROTATION_QUEUE": // 处理轮换队列更新
      return {
        ...state,
        rotationQueue: action.payload,
      }
    case "ADJUST_ROTATION_PRIORITY": // 处理手动调整轮换优先级
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
          lastPlayedRound: 0, // 重置轮换相关字段
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
