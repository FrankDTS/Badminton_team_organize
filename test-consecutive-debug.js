const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

// 創建測試參與者
const participants = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '7', name: 'G', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '8', name: 'H', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

// 創建場地
const courts = [
  { id: 'court-1', name: '場地1', isActive: true },
  { id: 'court-2', name: '場地2', isActive: true }
]

console.log('🔍 除錯測試：檢查連續場地規則')
console.log('='.repeat(50))

const algorithm = new TeamAllocationAlgorithm()
let allGameResults = []

// 進行4場分配測試，詳細記錄
for (let game = 1; game <= 4; game++) {
  console.log(`\n🎮 第 ${game} 場分配:`)
  
  const allocations = algorithm.allocateTeams(participants, courts, game)
  
  let gameResult = { game, courts: [] }
  
  allocations.forEach((allocation, index) => {
    const playerNames = allocation.players.map(p => p.name).join('')
    const playerIds = allocation.players.map(p => p.id).sort().join('-')
    
    console.log(`  ${allocation.courtName}: [${playerNames}] (IDs: ${playerIds})`)
    
    gameResult.courts.push({
      courtId: allocation.courtId,
      courtName: allocation.courtName,
      playerIds: playerIds,
      playerNames: playerNames
    })
    
    // 檢查是否違反連續規則
    if (game > 1) {
      const prevGame = allGameResults[allGameResults.length - 1]
      if (prevGame) {
        const prevCourt = prevGame.courts.find(c => c.courtId === allocation.courtId)
        if (prevCourt && prevCourt.playerIds === playerIds) {
          console.log(`    ⚠️  違規！同樣4人 [${playerNames}] 連續在 ${allocation.courtName} 出現`)
        }
      }
    }
  })
  
  allGameResults.push(gameResult)
  
  // 更新參與者狀態
  const currentRound = algorithm.calculateRound(game, courts.length)
  allocations.forEach(allocation => {
    allocation.players.forEach(player => {
      const participant = participants.find(p => p.id === player.id)
      if (participant) {
        participant.gamesPlayed++
        participant.lastPlayedRound = currentRound
      }
    })
  })
}

// 分析結果
console.log('\n📊 詳細分析:')
for (let i = 0; i < allGameResults.length - 1; i++) {
  const current = allGameResults[i]
  const next = allGameResults[i + 1]
  
  console.log(`\n第${current.game}場 → 第${next.game}場比較:`)
  
  current.courts.forEach(currentCourt => {
    const nextCourt = next.courts.find(c => c.courtId === currentCourt.courtId)
    if (nextCourt) {
      if (currentCourt.playerIds === nextCourt.playerIds) {
        console.log(`  ❌ ${currentCourt.courtName}: [${currentCourt.playerNames}] → [${nextCourt.playerNames}] 相同！`)
      } else {
        console.log(`  ✅ ${currentCourt.courtName}: [${currentCourt.playerNames}] → [${nextCourt.playerNames}] 不同`)
      }
    }
  })
}

console.log('\n✅ 除錯測試完成')