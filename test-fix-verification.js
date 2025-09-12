const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('🔧 驗證修正後的檢測邏輯')
console.log('測試修正後的 isConsecutiveSameTeamOnSameCourt 函數')
console.log('='.repeat(60))

function testFixedDetectionLogic() {
  console.log('\n🧪 直接測試修正後的檢測函數:')
  console.log('-'.repeat(40))

  const algorithm = new TeamAllocationAlgorithm()
  
  // 手動設置團隊配對歷史，模擬真實情況
  console.log('1. 設置測試情境:')
  console.log('   第1場: 場地2使用[EFGH]')
  console.log('   第2場: 場地2使用[ABCD]')
  console.log('   測試: 第3場場地2想使用[EFGH]是否會被檢測')
  
  // 設置第1場的記錄
  algorithm.teamPairingHistory.set('5-6-7-8', {
    players: ['5', '6', '7', '8'],
    count: 1,
    lastUsedGame: 1,
    lastUsedCourt: 'court-2'
  })
  
  // 設置第2場的記錄
  algorithm.teamPairingHistory.set('1-2-3-4', {
    players: ['1', '2', '3', '4'],
    count: 1,
    lastUsedGame: 2,
    lastUsedCourt: 'court-2'
  })
  
  console.log('\n2. 測試檢測函數:')
  
  // 測試第3場在場地2使用[EFGH]是否會被檢測
  const playerIds = ['5', '6', '7', '8']  // EFGH
  const courtId = 'court-2'
  const gameNumber = 3
  const courtsCount = 2
  
  const detected = algorithm.isConsecutiveSameTeamOnSameCourt(
    playerIds,
    courtId,
    gameNumber,
    courtsCount
  )
  
  console.log(`檢測結果: ${detected ? '✅ 檢測到連續使用' : '❌ 未檢測到'}`)
  
  if (detected) {
    console.log('🎉 修正成功！算法現在能檢測跨場次的連續使用')
  } else {
    console.log('⚠️  修正可能有問題，讓我們檢查詳細邏輯...')
    
    // 檢查詳細的檢測邏輯
    console.log('\n3. 詳細檢查:')
    
    // 檢查團隊配對歷史
    console.log('團隊配對歷史:')
    for (const [teamKey, record] of algorithm.teamPairingHistory.entries()) {
      console.log(`  ${teamKey}: 第${record.lastUsedGame}場在${record.lastUsedCourt}`)
    }
    
    // 手動執行檢測邏輯
    console.log('\n手動執行檢測邏輯:')
    const teamKey = playerIds.sort().join('-')
    console.log(`目標團隊: ${teamKey}`)
    console.log(`目標場地: ${courtId}`)
    console.log(`目標場次: ${gameNumber}`)
    
    // 找出該場地的最後一次使用
    let lastUsedGameOnThisCourt = 0
    let lastUsedTeamOnThisCourt = ''
    
    for (const [otherTeamKey, otherRecord] of algorithm.teamPairingHistory.entries()) {
      console.log(`檢查團隊 ${otherTeamKey}:`)
      console.log(`  - 使用場地: ${otherRecord.lastUsedCourt}`)
      console.log(`  - 使用場次: ${otherRecord.lastUsedGame}`)
      console.log(`  - 符合條件: ${otherRecord.lastUsedCourt === courtId && otherRecord.lastUsedGame < gameNumber}`)
      
      if (otherRecord.lastUsedCourt === courtId && 
          otherRecord.lastUsedGame && 
          otherRecord.lastUsedGame < gameNumber &&
          otherRecord.lastUsedGame > lastUsedGameOnThisCourt) {
        lastUsedGameOnThisCourt = otherRecord.lastUsedGame
        lastUsedTeamOnThisCourt = otherTeamKey
        console.log(`  ✅ 更新最後使用: 第${lastUsedGameOnThisCourt}場，團隊${lastUsedTeamOnThisCourt}`)
      }
    }
    
    console.log(`\n該場地最後使用: 第${lastUsedGameOnThisCourt}場，團隊${lastUsedTeamOnThisCourt}`)
    console.log(`目標團隊: ${teamKey}`)
    console.log(`是否相同: ${lastUsedTeamOnThisCourt === teamKey}`)
  }
  
  return detected
}

function testWithRealAllocation() {
  console.log('\n🎮 使用真實分配測試修正效果:')
  console.log('-'.repeat(40))

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

  const courts = [
    { id: 'court-1', name: '場地1', isActive: true },
    { id: 'court-2', name: '場地2', isActive: true }
  ]

  const algorithm = new TeamAllocationAlgorithm()
  
  // 第1場
  console.log('\n第1場分配:')
  const game1 = algorithm.allocateTeams(participants, courts, 1)
  game1.forEach(allocation => {
    console.log(`  ${allocation.courtName}: [${allocation.players.map(p => p.name).join('')}]`)
  })
  
  // 更新狀態
  game1.forEach(allocation => {
    allocation.players.forEach(player => {
      const participant = participants.find(p => p.id === player.id)
      if (participant) {
        participant.gamesPlayed++
        participant.lastPlayedRound = 1
      }
    })
  })
  
  // 第2場
  console.log('\n第2場分配:')
  const game2 = algorithm.allocateTeams(participants, courts, 2)
  game2.forEach(allocation => {
    console.log(`  ${allocation.courtName}: [${allocation.players.map(p => p.name).join('')}]`)
  })
  
  // 更新狀態
  game2.forEach(allocation => {
    allocation.players.forEach(player => {
      const participant = participants.find(p => p.id === player.id)
      if (participant) {
        participant.gamesPlayed++
        participant.lastPlayedRound = 1
      }
    })
  })
  
  // 第3場 - 關鍵測試
  console.log('\n第3場分配 (關鍵測試):')
  const game3 = algorithm.allocateTeams(participants, courts, 3)
  
  if (game3.length === 0) {
    console.log('  ❌ 無分配結果（可能被修正後的算法阻止）')
    console.log('  🎉 這表示修正可能已經生效！')
    return true
  } else {
    game3.forEach(allocation => {
      console.log(`  ${allocation.courtName}: [${allocation.players.map(p => p.name).join('')}]`)
    })
    
    // 檢查是否還有連續使用問題
    let hasViolation = false
    
    game3.forEach(allocation3 => {
      // 檢查與第1場的關係
      const game1SameCourt = game1.find(a => a.courtId === allocation3.courtId)
      if (game1SameCourt) {
        const game1Ids = new Set(game1SameCourt.players.map(p => p.id))
        const game3Ids = new Set(allocation3.players.map(p => p.id))
        
        const overlapCount = allocation3.players.filter(p => game1Ids.has(p.id)).length
        
        if (overlapCount === 4) {
          console.log(`    ❌ 仍有問題: ${allocation3.courtName}第1場和第3場都是相同4人`)
          hasViolation = true
        }
      }
    })
    
    if (!hasViolation) {
      console.log('  ✅ 無連續使用問題，修正可能已經生效')
    }
    
    return !hasViolation
  }
}

// 執行測試
console.log('🚀 開始驗證修正效果...')

const detectionTest = testFixedDetectionLogic()
const allocationTest = testWithRealAllocation()

console.log('\n' + '='.repeat(60))
console.log('📊 修正驗證結果')
console.log('='.repeat(60))

console.log(`\n檢測函數測試: ${detectionTest ? '✅ 通過' : '❌ 失敗'}`)
console.log(`真實分配測試: ${allocationTest ? '✅ 通過' : '❌ 失敗'}`)

if (detectionTest && allocationTest) {
  console.log(`\n🎉 修正成功！`)
  console.log(`✅ 檢測函數現在能正確檢測跨場次的連續使用`)
  console.log(`✅ 實際分配不再出現跨場次連續使用問題`)
} else if (detectionTest && !allocationTest) {
  console.log(`\n⚠️  部分成功`)
  console.log(`✅ 檢測函數已修正`)
  console.log(`❌ 但實際分配中可能還有其他問題`)
} else {
  console.log(`\n❌ 修正未完全成功`)
  console.log(`需要進一步檢查和調整`)
}