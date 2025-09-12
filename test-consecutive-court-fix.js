/**
 * 測試連續場地修正功能
 * 這個測試專門檢查場地A是否會讓同樣的4個人連續打兩場比賽
 */

// 簡化的算法實現用於測試 - 模擬主要邏輯
class TeamAllocationAlgorithm {
  constructor() {
    this.teamPairingHistory = new Map()
    this.constraints = {
      maxSkillLevelDifference: 3,
      playersPerCourt: 4,
      maxGamesDifference: 1
    }
  }
  
  calculateRound(gameNumber, courtsCount) {
    return Math.floor((gameNumber - 1) / courtsCount) + 1
  }
  
  allocateTeams(participants, courts, gameNumber) {
    // 簡化版本 - 使用基本的輪換邏輯
    const activeCourts = courts.filter(c => c.isActive)
    if (participants.length === 0 || activeCourts.length === 0) {
      return []
    }
    
    const allocations = []
    const currentRound = this.calculateRound(gameNumber, activeCourts.length)
    
    // 計算優先級
    const playersWithPriority = participants.map(p => ({
      ...p,
      priorityScore: this.calculatePriority(p, gameNumber, currentRound)
    }))
    
    let remainingPlayers = [...playersWithPriority]
    
    for (const court of activeCourts) {
      if (remainingPlayers.length < 4) break
      
      // 選擇4個玩家
      const selectedPlayers = this.selectTeamForCourt(remainingPlayers, gameNumber, court.id, activeCourts.length)
      
      if (selectedPlayers.length === 4) {
        const playerIds = selectedPlayers.map(p => p.id)
        
        // 檢查是否違反連續規則
        if (!this.isConsecutiveSameTeamOnSameCourt(playerIds, court.id, gameNumber, activeCourts.length)) {
          // 記錄使用歷史
          this.recordTeamPairing(playerIds, gameNumber, court.id)
          
          // 從剩餘玩家中移除
          remainingPlayers = remainingPlayers.filter(p => !playerIds.includes(p.id))
          
          allocations.push({
            courtId: court.id,
            courtName: court.name,
            players: selectedPlayers,
            gameNumber
          })
        }
      }
    }
    
    return allocations
  }
  
  calculatePriority(participant, gameNumber, currentRound) {
    let score = participant.gamesPlayed * 1000 // 場次少的優先
    
    // 避免連續上場
    if (participant.lastPlayedRound > 0) {
      const roundsSinceLastPlay = currentRound - participant.lastPlayedRound
      if (roundsSinceLastPlay === 0) {
        score += 5000 // 剛上場，降低優先級
      } else if (roundsSinceLastPlay >= 2) {
        score -= 800 // 等待很久，提高優先級
      }
    }
    
    return score
  }
  
  selectTeamForCourt(players, gameNumber, courtId, courtsCount) {
    const currentRound = this.calculateRound(gameNumber, courtsCount)
    
    // 嘗試多種組合以避免衝突
    const maxAttempts = 5
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let candidates
      
      if (attempt === 0) {
        // 第一次嘗試：按優先級排序
        candidates = players.sort((a, b) => a.priorityScore - b.priorityScore).slice(0, 4)
      } else {
        // 後續嘗試：輪換選擇
        const sorted = players.sort((a, b) => a.priorityScore - b.priorityScore)
        const startIndex = attempt % Math.max(1, players.length - 3)
        candidates = []
        
        for (let i = 0; i < sorted.length && candidates.length < 4; i++) {
          const index = (startIndex + i) % sorted.length
          if (!candidates.includes(sorted[index])) {
            candidates.push(sorted[index])
          }
        }
      }
      
      if (candidates.length >= 4) {
        const team = candidates.slice(0, 4)
        const playerIds = team.map(p => p.id)
        
        // 檢查是否違反規則
        if (!this.isConsecutiveSameTeamOnSameCourt(playerIds, courtId, gameNumber, courtsCount)) {
          return team
        }
      }
    }
    
    // 如果所有嘗試都失敗，返回按優先級排序的前4人
    const sorted = players.sort((a, b) => a.priorityScore - b.priorityScore)
    return sorted.slice(0, 4)
  }
  
  isConsecutiveSameTeamOnSameCourt(playerIds, courtId, gameNumber, courtsCount) {
    if (gameNumber <= 1) return false
    
    const teamKey = this.generateTeamKey(playerIds)
    const record = this.teamPairingHistory.get(teamKey)
    
    if (record && record.lastUsedGame && record.lastUsedCourt) {
      const currentRound = this.calculateRound(gameNumber, courtsCount)
      const lastGameRound = this.calculateRound(record.lastUsedGame, courtsCount)
      
      // 同一輪次內不能重複使用相同隊伍
      if (currentRound === lastGameRound) {
        return true
      }
      
      // 連續場次且同場地檢查
      const isConsecutiveGame = (record.lastUsedGame + 1 === gameNumber)
      if (isConsecutiveGame && record.lastUsedCourt === courtId) {
        return true
      }
      
      // 對於8人2場地的情況，放寬間隔檢查，只禁止直接連續
      // const gamesSinceLastUse = gameNumber - record.lastUsedGame
      // if (gamesSinceLastUse <= 1) {  // 只禁止直接連續
      //   return true
      // }
    }
    
    return false
  }
  
  generateTeamKey(playerIds) {
    return [...playerIds].sort().join('-')
  }
  
  recordTeamPairing(playerIds, gameNumber, courtId) {
    const teamKey = this.generateTeamKey(playerIds)
    const existing = this.teamPairingHistory.get(teamKey)
    
    if (existing) {
      existing.count += 1
      existing.lastUsedGame = gameNumber
      existing.lastUsedCourt = courtId
    } else {
      this.teamPairingHistory.set(teamKey, {
        players: [...playerIds].sort(),
        count: 1,
        lastUsedGame: gameNumber,
        lastUsedCourt: courtId
      })
    }
  }
}

// 模擬8個玩家，2個場地的情況
const participants = [
  { id: '1', name: 'Alice', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'Bob', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'Charlie', skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'David', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '5', name: 'Eve', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: 'Frank', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '7', name: 'Grace', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '8', name: 'Henry', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 }
]

const courts = [
  { id: 'A', name: '場地A', isActive: true },
  { id: 'B', name: '場地B', isActive: true }
]

const algorithm = new TeamAllocationAlgorithm()

console.log('=== 連續場地問題測試 ===\n')
console.log('測試情境：8個玩家，2個場地')
console.log('檢查場地A是否會讓同樣4個人連續打兩場\n')

// 模擬多輪遊戲
const gameHistory = []
const totalGames = 8 // 4輪 × 2場地

for (let gameNumber = 1; gameNumber <= totalGames; gameNumber++) {
  console.log(`--- 第${gameNumber}場 ---`)
  
  // 執行分隊
  const allocations = algorithm.allocateTeams([...participants], courts, gameNumber)
  
  if (allocations.length === 0) {
    console.log('無法分配隊伍')
    break
  }
  
  // 顯示分配結果
  for (const allocation of allocations) {
    const playerNames = allocation.players.map(p => p.name).join(', ')
    const playerIds = allocation.players.map(p => p.id).sort().join('-')
    
    console.log(`${allocation.courtName}: ${playerNames}`)
    console.log(`  隊伍ID: ${playerIds}`)
    
    gameHistory.push({
      gameNumber,
      courtId: allocation.courtId,
      courtName: allocation.courtName,
      playerIds,
      playerNames
    })
  }
  
  // 更新玩家統計
  for (const allocation of allocations) {
    for (const player of allocation.players) {
      const participantIndex = participants.findIndex(p => p.id === player.id)
      if (participantIndex !== -1) {
        participants[participantIndex].gamesPlayed++
        participants[participantIndex].lastPlayedRound = algorithm.calculateRound(gameNumber, courts.length)
      }
    }
  }
  
  console.log()
}

// 分析結果
console.log('=== 分析結果 ===\n')

// 檢查連續場地問題
console.log('1. 連續場地檢查：')
let consecutiveIssues = []

for (let i = 1; i < gameHistory.length; i++) {
  const current = gameHistory[i]
  const previous = gameHistory[i - 1]
  
  // 檢查是否同樣隊伍在同一場地連續出現
  if (current.courtId === previous.courtId && current.playerIds === previous.playerIds) {
    consecutiveIssues.push({
      court: current.courtName,
      games: [previous.gameNumber, current.gameNumber],
      team: current.playerNames
    })
  }
}

if (consecutiveIssues.length === 0) {
  console.log('✅ 沒有發現連續場地問題')
} else {
  console.log('❌ 發現連續場地問題：')
  consecutiveIssues.forEach(issue => {
    console.log(`  ${issue.court}：第${issue.games[0]}場和第${issue.games[1]}場都是 ${issue.team}`)
  })
}

// 檢查同輪次內隊伍重複
console.log('\n2. 同輪次隊伍重複檢查：')
const roundTeams = new Map()

for (const game of gameHistory) {
  const round = algorithm.calculateRound(game.gameNumber, courts.length)
  if (!roundTeams.has(round)) {
    roundTeams.set(round, [])
  }
  roundTeams.get(round).push({
    court: game.courtName,
    team: game.playerIds,
    playerNames: game.playerNames
  })
}

let sameRoundIssues = []
for (const [round, teams] of roundTeams.entries()) {
  const teamIds = teams.map(t => t.team)
  const uniqueTeams = new Set(teamIds)
  
  if (teamIds.length !== uniqueTeams.size) {
    sameRoundIssues.push({
      round,
      teams: teams
    })
  }
}

if (sameRoundIssues.length === 0) {
  console.log('✅ 沒有發現同輪次隊伍重複問題')
} else {
  console.log('❌ 發現同輪次隊伍重複問題：')
  sameRoundIssues.forEach(issue => {
    console.log(`  第${issue.round}輪：`)
    issue.teams.forEach(team => {
      console.log(`    ${team.court}: ${team.playerNames}`)
    })
  })
}

// 檢查場次分配公平性
console.log('\n3. 場次分配公平性：')
const gameStats = new Map()

for (const participant of participants) {
  gameStats.set(participant.name, participant.gamesPlayed)
}

const gameCounts = Array.from(gameStats.values())
const minGames = Math.min(...gameCounts)
const maxGames = Math.max(...gameCounts)
const difference = maxGames - minGames

console.log(`場次差距：${difference} (最少${minGames}場，最多${maxGames}場)`)

for (const [name, count] of gameStats.entries()) {
  console.log(`  ${name}: ${count}場`)
}

if (difference <= 1) {
  console.log('✅ 場次分配公平')
} else {
  console.log('❌ 場次分配不夠公平')
}

// 顯示完整的場次歷史
console.log('\n=== 完整場次歷史 ===')
for (const game of gameHistory) {
  const round = algorithm.calculateRound(game.gameNumber, courts.length)
  console.log(`第${game.gameNumber}場 (第${round}輪) - ${game.courtName}: ${game.playerNames}`)
}

console.log('\n測試完成！')