const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

// 創建只有4個參與者的情況，強制出現可能的違規
const participants = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

// 只有1個場地，強制同樣的4個人可能連續使用
const courts = [
  { id: 'court-1', name: '場地1', isActive: true }
]

console.log('🔍 強制違規測試：只有4人1場地，檢查是否會阻止連續')
console.log('='.repeat(50))

const algorithm = new TeamAllocationAlgorithm()

// 進行連續分配測試
for (let game = 1; game <= 4; game++) {
  console.log(`\n🎮 第 ${game} 場分配:`)
  
  const allocations = algorithm.allocateTeams(participants, courts, game)
  
  if (allocations.length === 0) {
    console.log('  ❌ 沒有可用的分配（可能被算法阻止了）')
  } else {
    allocations.forEach((allocation, index) => {
      const playerNames = allocation.players.map(p => p.name).join('')
      const playerIds = allocation.players.map(p => p.id).sort().join('-')
      
      console.log(`  ${allocation.courtName}: [${playerNames}] (IDs: ${playerIds})`)
      
      // 手動檢查是否真的違反規則
      const violates = algorithm.isConsecutiveSameTeamOnSameCourt(
        allocation.players.map(p => p.id),
        allocation.courtId,
        game,
        courts.length
      )
      if (violates) {
        console.log(`    ⚠️  應該被阻止：同樣4人在場地1連續出現`)
      } else {
        console.log(`    ✅ 通過檢查`)
      }
    })
  }
  
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
  
  // 顯示當前狀態
  console.log('  狀態:', participants.map(p => `${p.name}:${p.gamesPlayed}場`).join(', '))
}

console.log('\n✅ 強制違規測試完成')