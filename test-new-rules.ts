import { TeamAllocationAlgorithm } from './lib/team-allocation-algorithm'
import type { Participant, Court } from './lib/app-context'

// 創建測試數據
const participants: Participant[] = [
  { id: "1", name: "玩家1", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 0 },
  { id: "2", name: "玩家2", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
  { id: "3", name: "玩家3", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 2 },
  { id: "4", name: "玩家4", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 3 },
  { id: "5", name: "玩家5", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 4 },
  { id: "6", name: "玩家6", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 5 },
  { id: "7", name: "玩家7", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 6 },
  { id: "8", name: "玩家8", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 7 },
  { id: "9", name: "玩家9", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 8 },
  { id: "10", name: "玩家10", skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 9 },
]

const courts: Court[] = [
  { id: "1", name: "場地 1", isActive: true, currentPlayers: [] },
  { id: "2", name: "場地 2", isActive: true, currentPlayers: [] },
]

const algorithm = new TeamAllocationAlgorithm()

function simulateGame(gameNumber: number, participants: Participant[]) {
  console.log(`\n=== 第 ${gameNumber} 場遊戲 ===`)
  const round = Math.floor((gameNumber - 1) / courts.length) + 1
  console.log(`當前輪次: ${round}`)
  
  const allocations = algorithm.allocateTeams(participants, courts, gameNumber)
  
  console.log("分配結果:")
  allocations.forEach((alloc, index) => {
    console.log(`${alloc.courtName}: ${alloc.players.map(p => `${p.name}(${p.gamesPlayed}場)`).join(', ')}`)
  })
  
  // 更新參與者的場次數據
  const updatedParticipants = participants.map(p => {
    const wasPlaying = allocations.some(alloc => alloc.players.some(player => player.id === p.id))
    if (wasPlaying) {
      return {
        ...p,
        gamesPlayed: p.gamesPlayed + 1,
        lastPlayedRound: round
      }
    }
    return p
  })
  
  // 檢查規則
  const gamesPlayed = updatedParticipants.map(p => p.gamesPlayed)
  const minGames = Math.min(...gamesPlayed)
  const maxGames = Math.max(...gamesPlayed)
  const gamesDiff = maxGames - minGames
  
  console.log(`場次分布: 最少${minGames}場, 最多${maxGames}場, 差距${gamesDiff}場`)
  
  // 檢查第二輪規則
  if (round >= 2) {
    const playersNotMeetingMinimum = updatedParticipants.filter(p => p.gamesPlayed < 1)
    if (playersNotMeetingMinimum.length > 0) {
      console.log(`⚠️ 第二輪規則違反: ${playersNotMeetingMinimum.map(p => p.name).join(', ')} 未達最低場次`)
    } else {
      console.log(`✅ 第二輪規則符合: 所有人至少上場1次`)
    }
  }
  
  // 檢查場次差距規則
  if (gamesDiff > 1) {
    console.log(`⚠️ 場次差距規則違反: 差距${gamesDiff}場，超過1場`)
  } else {
    console.log(`✅ 場次差距規則符合: 差距${gamesDiff}場`)
  }
  
  return updatedParticipants
}

// 模擬多場遊戲
let currentParticipants = participants
for (let game = 1; game <= 6; game++) {
  currentParticipants = simulateGame(game, currentParticipants)
}

console.log('\n=== 最終統計 ===')
currentParticipants.forEach(p => {
  console.log(`${p.name}: ${p.gamesPlayed}場, 最後上場輪次: ${p.lastPlayedRound}`)
})