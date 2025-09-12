const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

// 創建12個人的測試情況，這樣在2個場地的情況下會有更多組合可能性
const participants = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '7', name: 'G', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '8', name: 'H', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '9', name: 'I', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '10', name: 'J', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '11', name: 'K', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '12', name: 'L', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

// 創建場地
const courts = [
  { id: 'court-1', name: '場地1', isActive: true },
  { id: 'court-2', name: '場地2', isActive: true }
]

console.log('🔍 連續場次Bug檢測器')
console.log('情況：12人2場地，檢測同樣4個人是否會在同一場地連續打兩場')
console.log('='.repeat(60))

const algorithm = new TeamAllocationAlgorithm()
let allResults = [] // 儲存所有結果用於分析
let violationCount = 0

// 進行10場分配測試
for (let game = 1; game <= 10; game++) {
  console.log(`\n🎮 第 ${game} 場分配:`)
  
  const allocations = algorithm.allocateTeams(participants, courts, game)
  
  let gameData = {
    game: game,
    round: algorithm.calculateRound(game, courts.length),
    allocations: []
  }
  
  if (allocations.length === 0) {
    console.log('  ❌ 沒有分配結果')
    allResults.push(gameData)
    continue
  }
  
  allocations.forEach((allocation, index) => {
    const playerNames = allocation.players.map(p => p.name).join('')
    const playerIds = allocation.players.map(p => p.id).sort()
    const teamKey = playerIds.join('-')
    
    console.log(`  ${allocation.courtName}: [${playerNames}] (${teamKey})`)
    
    gameData.allocations.push({
      courtId: allocation.courtId,
      courtName: allocation.courtName,
      playerIds: playerIds,
      playerNames: playerNames,
      teamKey: teamKey
    })
    
    // 詳細檢查是否違反連續場地規則
    const violatesRule = algorithm.isConsecutiveSameTeamOnSameCourt(
      playerIds,
      allocation.courtId,
      game,
      courts.length
    )
    
    if (violatesRule) {
      console.log(`    ❌ 檢測到違規：同樣4人在${allocation.courtName}連續出現！`)
      violationCount++
    } else {
      // 手動檢查上一場是否有相同組合在同一場地
      if (game > 1 && allResults.length > 0) {
        const prevGame = allResults[allResults.length - 1]
        const prevSameCourt = prevGame.allocations.find(a => a.courtId === allocation.courtId)
        
        if (prevSameCourt && prevSameCourt.teamKey === teamKey) {
          console.log(`    ⚠️  手動檢測發現問題：連續場次在${allocation.courtName}有相同4人組合！`)
          console.log(`       上一場: ${prevSameCourt.playerNames} vs 這一場: ${playerNames}`)
          violationCount++
        }
      }
    }
  })
  
  allResults.push(gameData)
  
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
  
  // 顯示當前參與狀態（簡化版）
  const playingCount = allocations.reduce((count, a) => count + a.players.length, 0)
  const waitingCount = participants.length - playingCount
  console.log(`  狀態: ${playingCount}人上場, ${waitingCount}人等待`)
}

// 詳細分析連續性問題
console.log('\n📊 連續性分析:')
console.log('='.repeat(60))

for (let i = 1; i < allResults.length; i++) {
  const prev = allResults[i - 1]
  const curr = allResults[i]
  
  if (prev.allocations.length === 0 || curr.allocations.length === 0) {
    continue
  }
  
  console.log(`\n第${prev.game}場 → 第${curr.game}場 (輪次${prev.round} → ${curr.round}):`)
  
  // 檢查每個場地的連續性
  courts.forEach(court => {
    const prevCourt = prev.allocations.find(a => a.courtId === court.id)
    const currCourt = curr.allocations.find(a => a.courtId === court.id)
    
    if (prevCourt && currCourt) {
      if (prevCourt.teamKey === currCourt.teamKey) {
        console.log(`  ❌ ${court.name}: [${prevCourt.playerNames}] → [${currCourt.playerNames}] 完全相同！`)
      } else {
        // 檢查重疊人數
        const prevIds = new Set(prevCourt.playerIds)
        const currIds = new Set(currCourt.playerIds)
        const overlap = prevCourt.playerIds.filter(id => currIds.has(id)).length
        
        if (overlap === 4) {
          console.log(`  ❌ ${court.name}: [${prevCourt.playerNames}] → [${currCourt.playerNames}] 4人完全相同！`)
        } else if (overlap >= 2) {
          console.log(`  ⚠️  ${court.name}: [${prevCourt.playerNames}] → [${currCourt.playerNames}] 有${overlap}人重複`)
        } else {
          console.log(`  ✅ ${court.name}: [${prevCourt.playerNames}] → [${currCourt.playerNames}] 變化良好`)
        }
      }
    } else if (prevCourt && !currCourt) {
      console.log(`  - ${court.name}: [${prevCourt.playerNames}] → [空] 未安排`)
    } else if (!prevCourt && currCourt) {
      console.log(`  - ${court.name}: [空] → [${currCourt.playerNames}] 新安排`)
    }
  })
}

// 最終統計
console.log('\n🏁 最終結果:')
console.log('='.repeat(60))
console.log(`總共檢測到 ${violationCount} 次違規情況`)

if (violationCount > 0) {
  console.log('❌ 測試失敗：檢測到連續場次同樣4人在同一場地的問題')
} else {
  console.log('✅ 測試通過：未檢測到連續場次問題')
}

// 參與者統計
console.log('\n👥 參與者統計:')
participants.forEach(p => {
  console.log(`  ${p.name}: ${p.gamesPlayed}場 (上次第${p.lastPlayedRound}輪)`)
})

const gameStats = participants.map(p => p.gamesPlayed)
const minGames = Math.min(...gameStats)
const maxGames = Math.max(...gameStats)
console.log(`\n場次分佈: ${minGames}-${maxGames} (差距: ${maxGames - minGames})`)