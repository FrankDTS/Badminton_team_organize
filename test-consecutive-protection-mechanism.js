const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('🛡️ 連續場次保護機制測試')
console.log('目標：驗證算法是否正確防止同樣4人在同一場地連續打兩場')
console.log('='.repeat(70))

function runProtectionTest(testName, participants, courts, forceScenario = null) {
  console.log(`\n📋 ${testName}`)
  console.log('-'.repeat(50))
  
  const algorithm = new TeamAllocationAlgorithm()
  let protectionActivated = false
  let totalViolations = 0
  let allResults = []
  
  // 如果有強制場景，先設置
  if (forceScenario) {
    console.log(`🔧 設置強制場景: ${forceScenario.description}`)
    algorithm.teamPairingHistory = new Map()
    forceScenario.history.forEach(record => {
      algorithm.teamPairingHistory.set(record.teamKey, record.data)
    })
  }
  
  for (let game = 1; game <= 8; game++) {
    console.log(`\n🎮 第 ${game} 場:`)
    
    const allocations = algorithm.allocateTeams(participants, courts, game)
    
    if (allocations.length === 0) {
      console.log(`  ❌ 無分配結果（可能被保護機制阻止）`)
      protectionActivated = true
      continue
    }
    
    let gameData = {
      game: game,
      allocations: allocations.map(a => ({
        courtId: a.courtId,
        courtName: a.courtName,
        playerIds: a.players.map(p => p.id).sort(),
        playerNames: a.players.map(p => p.name).join(''),
        teamKey: a.players.map(p => p.id).sort().join('-')
      }))
    }
    
    // 顯示分配結果
    gameData.allocations.forEach(alloc => {
      console.log(`  ${alloc.courtName}: [${alloc.playerNames}] (${alloc.teamKey})`)
      
      // 手動檢查是否應該被算法阻止
      const shouldBeBlocked = algorithm.isConsecutiveSameTeamOnSameCourt(
        alloc.playerIds,
        alloc.courtId,
        game,
        courts.length
      )
      
      if (shouldBeBlocked) {
        console.log(`    ⚠️  這個分配應該被阻止！(連續場次檢測為true)`)
        totalViolations++
      } else {
        console.log(`    ✅ 通過連續場次檢查`)
      }
    })
    
    // 檢查與上一場的關係
    if (game > 1 && allResults.length > 0) {
      const prevGame = allResults[allResults.length - 1]
      
      gameData.allocations.forEach(currentAlloc => {
        const prevSameCourt = prevGame.allocations.find(a => a.courtId === currentAlloc.courtId)
        
        if (prevSameCourt) {
          if (prevSameCourt.teamKey === currentAlloc.teamKey) {
            console.log(`    💥 實際違規：${currentAlloc.courtName}連續兩場都是[${currentAlloc.playerNames}]`)
            totalViolations++
          } else {
            // 計算重疊人數
            const prevIds = new Set(prevSameCourt.playerIds)
            const overlapCount = currentAlloc.playerIds.filter(id => prevIds.has(id)).length
            
            if (overlapCount > 0) {
              console.log(`    📊 ${currentAlloc.courtName}: ${overlapCount}/4人與上場重疊`)
            }
          }
        }
      })
    }
    
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
  }
  
  console.log(`\n📊 測試結果:`)
  console.log(`  保護機制是否啟動: ${protectionActivated ? '是' : '否'}`)
  console.log(`  檢測到的違規數量: ${totalViolations}`)
  
  return { protectionActivated, totalViolations, results: allResults }
}

// 測試案例1：標準情況 - 8人2場地
const participants1 = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '7', name: 'G', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '8', name: 'H', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

const courts = [
  { id: 'court-1', name: '場地1', isActive: true },
  { id: 'court-2', name: '場地2', isActive: true }
]

const result1 = runProtectionTest('案例1: 標準8人2場地', [...participants1], courts)

// 測試案例2：極端情況 - 4人1場地（必然會有重複）
const participants2 = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

const courts2 = [
  { id: 'court-1', name: '場地1', isActive: true }
]

const result2 = runProtectionTest('案例2: 極端4人1場地', [...participants2], courts2)

// 測試案例3：強制觸發保護機制
const participants3 = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 1, lastPlayedRound: 1 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 1, lastPlayedRound: 1 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 1, lastPlayedRound: 1 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 1, lastPlayedRound: 1 },
  { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '7', name: 'G', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '8', name: 'H', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

const forceScenario = {
  description: '第1場[ABCD]在場地1，現在強制測試第2場',
  history: [
    {
      teamKey: '1-2-3-4',
      data: {
        players: ['1', '2', '3', '4'],
        count: 1,
        lastUsedGame: 1,
        lastUsedCourt: 'court-1'
      }
    }
  ]
}

const result3 = runProtectionTest('案例3: 強制觸發保護機制', [...participants3], courts, forceScenario)

// 總結
console.log('\n' + '='.repeat(70))
console.log('🏁 測試總結報告')
console.log('='.repeat(70))

console.log(`\n案例1 (標準8人2場地):`)
console.log(`  - 保護機制啟動: ${result1.protectionActivated}`)
console.log(`  - 違規次數: ${result1.totalViolations}`)

console.log(`\n案例2 (極端4人1場地):`)
console.log(`  - 保護機制啟動: ${result2.protectionActivated}`)
console.log(`  - 違規次數: ${result2.totalViolations}`)

console.log(`\n案例3 (強制觸發保護):`)
console.log(`  - 保護機制啟動: ${result3.protectionActivated}`)
console.log(`  - 違規次數: ${result3.totalViolations}`)

const totalViolations = result1.totalViolations + result2.totalViolations + result3.totalViolations
const protectionWorking = result2.protectionActivated || result3.protectionActivated

console.log(`\n🎯 結論:`)
if (totalViolations === 0 && protectionWorking) {
  console.log('✅ 連續場次保護機制運作正常')
  console.log('   - 在可能的情況下成功防止連續場次')
  console.log('   - 在無法避免時啟動保護（阻止分配）')
} else if (totalViolations === 0) {
  console.log('⚠️  未檢測到違規，但保護機制可能未充分測試')
} else {
  console.log('❌ 檢測到連續場次問題！')
  console.log(`   - 總違規次數: ${totalViolations}`)
  console.log('   - 建議檢查算法實作')
}

console.log('\n💡 測試建議:')
console.log('1. 如果所有案例都顯示0違規，表示保護機制運作良好')
console.log('2. 案例2應該顯示保護機制啟動（無分配結果）')
console.log('3. 如果發現違規，需要檢查算法中的保護邏輯')