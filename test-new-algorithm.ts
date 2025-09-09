// 測試新分隊算法的腳本
import { TeamAllocationAlgorithm } from './lib/team-allocation-algorithm'
import type { Participant, Court } from './lib/app-context'

// 創建測試數據
function createTestParticipants(): Participant[] {
  return [
    { id: '1', name: 'Alice', skillLevel: 1, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '2', name: 'Bob', skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '3', name: 'Charlie', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '4', name: 'David', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '5', name: 'Eve', skillLevel: 1, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '6', name: 'Frank', skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '7', name: 'Grace', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '8', name: 'Henry', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '9', name: 'Ivy', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '10', name: 'Jack', skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '11', name: 'Kate', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
    { id: '12', name: 'Leo', skillLevel: 1, gamesPlayed: 0, lastPlayedRound: 0, rotationPriority: 1 },
  ]
}

function createTestCourts(): Court[] {
  return [
    { id: '1', name: '場地1', isActive: true, currentPlayers: [] },
    { id: '2', name: '場地2', isActive: true, currentPlayers: [] },
    { id: '3', name: '場地3', isActive: true, currentPlayers: [] },
  ]
}

// 驗證分隊結果
function validateResults(allocations: any[], participants: Participant[], round: number, maxWaitingRounds: number) {
  console.log(`\n=== 第${round}輪驗證結果 ===`)
  
  // 1. 檢查每個人等待的場次不能超過場地數量
  const playingPlayerIds = new Set(allocations.flatMap((a: any) => a.players.map((p: any) => p.id)))
  const waitingPlayers = participants.filter(p => !playingPlayerIds.has(p.id))
  
  let maxWaitingViolation = false
  waitingPlayers.forEach(player => {
    const waitingRounds = player.lastPlayedRound === 0 ? round : Math.max(0, round - player.lastPlayedRound - 1)
    if (waitingRounds > maxWaitingRounds) {
      console.log(`❌ ${player.name} 等待 ${waitingRounds} 輪，超過限制 ${maxWaitingRounds}`)
      maxWaitingViolation = true
    }
  })
  if (!maxWaitingViolation) {
    console.log('✅ 等待場次限制符合要求')
  }
  
  // 2. 檢查同場地兩隊等級差不超過2級
  let skillBalanceViolation = false
  allocations.forEach((allocation: any, index: number) => {
    const skillLevels = allocation.players.map((p: any) => p.skillLevel)
    const pairings = [
      { team1: [0, 1], team2: [2, 3] },
      { team1: [0, 2], team2: [1, 3] },
      { team1: [0, 3], team2: [1, 2] }
    ]
    
    let hasValidPairing = false
    for (const pairing of pairings) {
      const team1Sum = pairing.team1.reduce((sum, idx) => sum + skillLevels[idx], 0)
      const team2Sum = pairing.team2.reduce((sum, idx) => sum + skillLevels[idx], 0)
      
      if (Math.abs(team1Sum - team2Sum) <= 2) {
        hasValidPairing = true
        break
      }
    }
    
    if (!hasValidPairing) {
      console.log(`❌ ${allocation.courtName} 兩隊等級差超過2級: ${skillLevels}`)
      skillBalanceViolation = true
    }
  })
  if (!skillBalanceViolation) {
    console.log('✅ 同場地兩隊等級差符合要求')
  }
  
  // 3. 檢查公平性（每一輪都有足夠人數上場）
  const totalPlaying = allocations.length * 4
  const totalAvailable = participants.length
  const fairnessRatio = totalPlaying / totalAvailable
  console.log(`✅ 本輪公平性：${totalPlaying}/${totalAvailable} = ${(fairnessRatio * 100).toFixed(1)}% 上場`)
  
  // 4. 檢查高低等級混合情況
  let skillDifferenceViolation = false
  allocations.forEach((allocation: any) => {
    const skillLevels = allocation.players.map((p: any) => p.skillLevel)
    const maxSkill = Math.max(...skillLevels)
    const minSkill = Math.min(...skillLevels)
    
    if (maxSkill - minSkill > 4) {
      console.log(`❌ ${allocation.courtName} 個人技能差距過大: ${minSkill}-${maxSkill}`)
      skillDifferenceViolation = true
    }
  })
  if (!skillDifferenceViolation) {
    console.log('✅ 避免高低等級混合符合要求')
  }
  
  // 顯示詳細分配情況
  console.log('\n詳細分配:')
  allocations.forEach((allocation: any) => {
    const players = allocation.players.map((p: any) => `${p.name}(${p.skillLevel})`).join(', ')
    console.log(`${allocation.courtName}: ${players}`)
  })
  
  if (waitingPlayers.length > 0) {
    const waiting = waitingPlayers.map((p: any) => `${p.name}(${p.skillLevel})`).join(', ')
    console.log(`等待: ${waiting}`)
  }
}

// 更新玩家狀態
function updatePlayerStats(participants: Participant[], allocations: any[], round: number) {
  const playingPlayerIds = new Set(allocations.flatMap((a: any) => a.players.map((p: any) => p.id)))
  
  participants.forEach(participant => {
    if (playingPlayerIds.has(participant.id)) {
      participant.gamesPlayed += 1
      participant.lastPlayedRound = round
    }
  })
}

// 主測試函數
function runTest() {
  console.log('🏸 開始測試新的分隊算法...\n')
  
  const algorithm = new TeamAllocationAlgorithm()
  const participants = createTestParticipants()
  const courts = createTestCourts()
  const maxWaitingRounds = courts.filter(c => c.isActive).length
  
  console.log(`測試設定：`)
  console.log(`- 參與者: ${participants.length} 人`)
  console.log(`- 場地: ${courts.filter(c => c.isActive).length} 個`)
  console.log(`- 每輪最多等待: ${maxWaitingRounds} 輪`)
  console.log(`- 最大場地技能差: 2級`)
  console.log(`- 最大個人技能差: 4級`)
  
  // 進行5輪測試
  for (let round = 1; round <= 5; round++) {
    const allocations = algorithm.allocateTeams(participants, courts, round)
    validateResults(allocations, participants, round, maxWaitingRounds)
    updatePlayerStats(participants, allocations, round)
    
    // 顯示輪換統計
    const stats = algorithm.getRotationStats(participants, round)
    console.log(`輪換統計: 公平性=${stats.fairnessScore}, 最大場次差=${stats.maxGamesDifference}, 平均等待=${stats.averageWaitTime}, 效率=${stats.rotationEfficiency}`)
  }
  
  // 最終統計
  console.log('\n=== 最終統計 ===')
  const finalGames = participants.map(p => p.gamesPlayed)
  const minGames = Math.min(...finalGames)
  const maxGames = Math.max(...finalGames)
  
  console.log(`場次分佈: 最少 ${minGames} 場，最多 ${maxGames} 場，差距 ${maxGames - minGames} 場`)
  
  participants.forEach((p: any) => {
    console.log(`${p.name}: ${p.gamesPlayed} 場 (等級 ${p.skillLevel})`)
  })
  
  if (maxGames - minGames <= 1) {
    console.log('✅ 最終公平性測試通過！')
  } else {
    console.log('❌ 最終公平性測試失敗！')
  }
}

// 執行測試
runTest()