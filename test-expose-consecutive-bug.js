const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('🔍 嘗試暴露連續場次Bug')
console.log('策略：手動構造會導致連續場次的情況')
console.log('='.repeat(60))

// 測試案例1：精確8人2場地，這種情況最容易出現連續問題
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

function testCase(participants, testName, gameCount = 6) {
  console.log(`\n📋 ${testName}`)
  console.log('-'.repeat(40))
  
  const algorithm = new TeamAllocationAlgorithm()
  let violations = []
  let allResults = []
  
  for (let game = 1; game <= gameCount; game++) {
    const allocations = algorithm.allocateTeams(participants, courts, game)
    
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
    
    console.log(`第${game}場:`, gameData.allocations.map(a => `${a.courtName}:[${a.playerNames}]`).join(', ') || '無分配')
    
    // 檢查連續性違規
    if (game > 1 && allResults.length > 0) {
      const prevGame = allResults[allResults.length - 1]
      
      gameData.allocations.forEach(currentAlloc => {
        // 檢查同一場地是否有相同組合
        const prevSameCourt = prevGame.allocations.find(a => a.courtId === currentAlloc.courtId)
        if (prevSameCourt && prevSameCourt.teamKey === currentAlloc.teamKey) {
          const violation = {
            prevGame: prevGame.game,
            currGame: game,
            court: currentAlloc.courtName,
            team: currentAlloc.playerNames,
            type: '完全相同組合連續在同一場地'
          }
          violations.push(violation)
          console.log(`  ❌ 違規！${violation.court}連續兩場都是[${violation.team}]`)
        }
        
        // 檢查算法的isConsecutiveSameTeamOnSameCourt方法
        const algorithmDetection = algorithm.isConsecutiveSameTeamOnSameCourt(
          currentAlloc.playerIds,
          currentAlloc.courtId,
          game,
          courts.length
        )
        
        if (algorithmDetection) {
          console.log(`  🔍 算法檢測到連續: ${currentAlloc.courtName}[${currentAlloc.playerNames}]`)
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
  
  console.log(`\n結果: 共發現${violations.length}個違規`)
  violations.forEach(v => {
    console.log(`  - 第${v.prevGame}→${v.currGame}場: ${v.court} [${v.team}] ${v.type}`)
  })
  
  return violations.length
}

// 測試案例1：標準8人2場地
const violations1 = testCase([...participants1], '案例1: 8人2場地', 8)

// 測試案例2：手動製造易出錯情況
console.log('\n' + '='.repeat(60))
console.log('📋 案例2: 手動製造極端情況')
console.log('-'.repeat(40))

// 重置參與者但模擬特定狀態
const participants2 = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 1, lastPlayedRound: 1 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 1, lastPlayedRound: 1 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 1, lastPlayedRound: 1 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 1, lastPlayedRound: 1 },
  { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '7', name: 'G', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '8', name: 'H', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

const algorithm2 = new TeamAllocationAlgorithm()

// 手動設置團隊配對歷史，模擬第1場已經發生過
algorithm2.teamPairingHistory = new Map()
algorithm2.teamPairingHistory.set('1-2-3-4', {
  players: ['1', '2', '3', '4'],
  count: 1,
  lastUsedGame: 1,
  lastUsedCourt: 'court-1'
})

console.log('設置：模擬第1場[ABCD]在場地1，[EFGH]在場地2已經發生')
console.log('現在測試第2場是否會重複...')

const allocations2 = algorithm2.allocateTeams(participants2, courts, 2)
console.log(`第2場分配:`, allocations2.map(a => `${a.courtName}:[${a.players.map(p => p.name).join('')}]`).join(', ') || '無分配')

// 檢查是否有違規
let hasViolation = false
allocations2.forEach(allocation => {
  const playerIds = allocation.players.map(p => p.id).sort()
  const teamKey = playerIds.join('-')
  
  if (teamKey === '1-2-3-4' && allocation.courtId === 'court-1') {
    console.log('❌ 檢測到違規：[ABCD]連續在場地1出現！')
    hasViolation = true
  }
  
  // 檢查算法是否正確檢測
  const detected = algorithm2.isConsecutiveSameTeamOnSameCourt(
    playerIds,
    allocation.courtId,
    2,
    courts.length
  )
  
  if (detected) {
    console.log(`🔍 算法正確檢測到連續: ${allocation.courtName}[${allocation.players.map(p => p.name).join('')}]`)
  }
})

if (!hasViolation) {
  console.log('✅ 未檢測到違規')
}

// 測試案例3：極端情況 - 檢查算法的容錯性
console.log('\n' + '='.repeat(60))
console.log('📋 案例3: 檢查算法在特殊情況下的行為')
console.log('-'.repeat(40))

const algorithm3 = new TeamAllocationAlgorithm()

// 模擬場次記錄已滿的情況
const testPlayerIds = ['1', '2', '3', '4']
console.log('測試1: 檢查連續場次檢測邏輯')

// 場次1在場地1
const test1 = algorithm3.isConsecutiveSameTeamOnSameCourt(testPlayerIds, 'court-1', 1, 2)
console.log(`場次1結果: ${test1} (預期: false)`)

// 設置場次1的記錄
algorithm3.teamPairingHistory.set('1-2-3-4', {
  players: ['1', '2', '3', '4'],
  count: 1,
  lastUsedGame: 1,
  lastUsedCourt: 'court-1'
})

// 測試場次2在同一場地
const test2 = algorithm3.isConsecutiveSameTeamOnSameCourt(testPlayerIds, 'court-1', 2, 2)
console.log(`場次2同場地結果: ${test2} (預期: true)`)

// 測試場次2在不同場地
const test3 = algorithm3.isConsecutiveSameTeamOnSameCourt(testPlayerIds, 'court-2', 2, 2)
console.log(`場次2不同場地結果: ${test3} (預期: false)`)

// 測試場次3（非連續）
const test4 = algorithm3.isConsecutiveSameTeamOnSameCourt(testPlayerIds, 'court-1', 3, 2)
console.log(`場次3結果: ${test4} (預期: false)`)

console.log('\n🏁 測試總結:')
console.log(`案例1違規數: ${violations1}`)
console.log(`案例2是否有違規: ${hasViolation}`)
console.log('檢測邏輯測試: 完成')

if (violations1 > 0 || hasViolation) {
  console.log('❌ 檢測到連續場次問題！')
} else {
  console.log('✅ 未檢測到連續場次問題')
}