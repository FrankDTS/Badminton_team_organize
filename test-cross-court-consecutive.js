const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('🔍 測試跨越其他場地的連續使用問題')
console.log('場景：一個場地按兩次【下一場】後，另一個場地才打完比賽')
console.log('需求：確保同一場地不會有同樣4個人連續打比賽')
console.log('='.repeat(70))

/**
 * 模擬跨場地的連續使用場景
 */
function testCrossCourtConsecutive() {
  console.log('\n📋 測試場景說明:')
  console.log('- 場地1: 第1場 [ABCD] → 第2場 [EFGH] → 第3場 [????]')
  console.log('- 場地2: 第1場 [EFGH] → (還在比賽中)')
  console.log('- 問題: 第3場如果又是 [ABCD]，就會在場地1連續使用')
  console.log('-'.repeat(50))

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
  let allResults = []
  
  // 第1場分配
  console.log('\n🎮 第1場分配:')
  const game1 = algorithm.allocateTeams(participants, courts, 1)
  game1.forEach(allocation => {
    const playerNames = allocation.players.map(p => p.name).join('')
    console.log(`  ${allocation.courtName}: [${playerNames}]`)
  })
  
  // 記錄第1場結果
  const game1Results = game1.map(allocation => ({
    courtId: allocation.courtId,
    courtName: allocation.courtName,
    playerIds: allocation.players.map(p => p.id).sort(),
    playerNames: allocation.players.map(p => p.name).join(''),
    teamKey: allocation.players.map(p => p.id).sort().join('-')
  }))
  allResults.push({ game: 1, results: game1Results })

  // 更新參與者狀態
  game1.forEach(allocation => {
    allocation.players.forEach(player => {
      const participant = participants.find(p => p.id === player.id)
      if (participant) {
        participant.gamesPlayed++
        participant.lastPlayedRound = 1
      }
    })
  })

  // 第2場分配
  console.log('\n🎮 第2場分配:')
  const game2 = algorithm.allocateTeams(participants, courts, 2)
  game2.forEach(allocation => {
    const playerNames = allocation.players.map(p => p.name).join('')
    console.log(`  ${allocation.courtName}: [${playerNames}]`)
  })

  // 記錄第2場結果
  const game2Results = game2.map(allocation => ({
    courtId: allocation.courtId,
    courtName: allocation.courtName,
    playerIds: allocation.players.map(p => p.id).sort(),
    playerNames: allocation.players.map(p => p.name).join(''),
    teamKey: allocation.players.map(p => p.id).sort().join('-')
  }))
  allResults.push({ game: 2, results: game2Results })

  // 更新參與者狀態
  game2.forEach(allocation => {
    allocation.players.forEach(player => {
      const participant = participants.find(p => p.id === player.id)
      if (participant) {
        participant.gamesPlayed++
        participant.lastPlayedRound = 1  // 還是第1輪
      }
    })
  })

  // 第3場分配 - 這是關鍵測試
  console.log('\n🎮 第3場分配 (關鍵測試):')
  const game3 = algorithm.allocateTeams(participants, courts, 3)
  
  if (game3.length === 0) {
    console.log('  ❌ 無分配結果（可能被算法阻止）')
  } else {
    game3.forEach(allocation => {
      const playerNames = allocation.players.map(p => p.name).join('')
      console.log(`  ${allocation.courtName}: [${playerNames}]`)
    })
  }

  // 記錄第3場結果
  const game3Results = game3.map(allocation => ({
    courtId: allocation.courtId,
    courtName: allocation.courtName,
    playerIds: allocation.players.map(p => p.id).sort(),
    playerNames: allocation.players.map(p => p.name).join(''),
    teamKey: allocation.players.map(p => p.id).sort().join('-')
  }))
  allResults.push({ game: 3, results: game3Results })

  return { allResults, participants }
}

/**
 * 檢測跨場地連續使用問題
 */
function analyzeConsecutiveIssues(allResults) {
  console.log('\n🔍 分析跨場地連續使用問題:')
  console.log('-'.repeat(50))

  let violations = []

  // 檢查每個場地的使用歷史
  const courtUsageHistory = new Map()

  // 建立每個場地的使用歷史
  allResults.forEach(gameResult => {
    gameResult.results.forEach(allocation => {
      if (!courtUsageHistory.has(allocation.courtId)) {
        courtUsageHistory.set(allocation.courtId, [])
      }
      courtUsageHistory.get(allocation.courtId).push({
        game: gameResult.game,
        teamKey: allocation.teamKey,
        playerNames: allocation.playerNames
      })
    })
  })

  // 檢查每個場地是否有連續使用問題
  for (const [courtId, history] of courtUsageHistory.entries()) {
    const courtName = allResults[0].results.find(r => r.courtId === courtId)?.courtName || courtId
    console.log(`\n${courtName} 使用歷史:`)
    
    history.forEach((usage, index) => {
      console.log(`  第${usage.game}場: [${usage.playerNames}] (${usage.teamKey})`)
    })

    // 檢查連續使用
    for (let i = 1; i < history.length; i++) {
      const current = history[i]
      const previous = history[i - 1]
      
      if (current.teamKey === previous.teamKey) {
        const violation = {
          courtName,
          courtId,
          teamKey: current.teamKey,
          playerNames: current.playerNames,
          games: [previous.game, current.game],
          type: '直接連續'
        }
        violations.push(violation)
        console.log(`    ❌ 直接連續: 第${previous.game}場 → 第${current.game}場 都是 [${current.playerNames}]`)
      }
    }

    // 檢查跨越其他場次的連續使用 (這是新的檢查邏輯)
    for (let i = 0; i < history.length; i++) {
      for (let j = i + 2; j < history.length; j++) {  // 跨越至少一個場次
        const first = history[i]
        const later = history[j]
        
        if (first.teamKey === later.teamKey) {
          const violation = {
            courtName,
            courtId,
            teamKey: first.teamKey,
            playerNames: first.playerNames,
            games: [first.game, later.game],
            type: '跨場次連續'
          }
          violations.push(violation)
          console.log(`    ⚠️  跨場次連續: 第${first.game}場 → 第${later.game}場 都是 [${first.playerNames}]`)
        }
      }
    }
  }

  return violations
}

/**
 * 測試現有算法的檢測能力
 */
function testCurrentDetectionLogic(allResults) {
  console.log('\n🧪 測試現有算法檢測能力:')
  console.log('-'.repeat(50))

  const algorithm = new TeamAllocationAlgorithm()
  
  // 測試第3場的檢測
  if (allResults.length >= 3 && allResults[2].results.length > 0) {
    const game3Allocation = allResults[2].results[0]
    const playerIds = game3Allocation.teamKey.split('-')
    
    // 檢查算法是否能檢測到這個問題
    const algorithmDetected = algorithm.isConsecutiveSameTeamOnSameCourt(
      playerIds,
      game3Allocation.courtId,
      3,
      2  // 2個場地
    )
    
    console.log(`算法檢測結果: ${algorithmDetected ? '檢測到連續使用' : '未檢測到問題'}`)
    
    // 手動檢查第1場和第3場是否在同一場地使用相同團隊
    const game1SameCourt = allResults[0].results.find(r => r.courtId === game3Allocation.courtId)
    if (game1SameCourt && game1SameCourt.teamKey === game3Allocation.teamKey) {
      console.log(`⚠️  實際問題: 第1場和第3場在${game3Allocation.courtName}都是[${game3Allocation.playerNames}]`)
      
      if (!algorithmDetected) {
        console.log(`💥 檢測漏洞: 算法未能檢測到跨場次的連續使用`)
      }
    }
  }
}

/**
 * 多次測試以確保問題重現
 */
function runMultipleTests() {
  console.log('\n🔄 多次測試以確認問題:')
  console.log('-'.repeat(50))

  let totalViolations = 0
  let totalTests = 5

  for (let test = 1; test <= totalTests; test++) {
    console.log(`\n測試 ${test}:`)
    const { allResults } = testCrossCourtConsecutive()
    const violations = analyzeConsecutiveIssues(allResults)
    
    if (violations.length > 0) {
      totalViolations += violations.length
      console.log(`  發現 ${violations.length} 個違規`)
    } else {
      console.log(`  ✅ 無違規`)
    }
    
    testCurrentDetectionLogic(allResults)
  }

  return { totalViolations, totalTests }
}

// 執行測試
console.log('🚀 開始測試...')

const { allResults, participants } = testCrossCourtConsecutive()
const violations = analyzeConsecutiveIssues(allResults)
testCurrentDetectionLogic(allResults)

// 多次測試確認
const multiTestResults = runMultipleTests()

// 總結
console.log('\n' + '='.repeat(70))
console.log('📊 測試總結')
console.log('='.repeat(70))

console.log(`\n🔍 單次測試結果:`)
console.log(`  檢測到違規: ${violations.length}個`)
if (violations.length > 0) {
  violations.forEach((v, index) => {
    console.log(`    ${index + 1}. ${v.courtName}: ${v.type} - 第${v.games.join('場、第')}場都是[${v.playerNames}]`)
  })
}

console.log(`\n🔄 多次測試結果:`)
console.log(`  總測試次數: ${multiTestResults.totalTests}`)
console.log(`  總違規次數: ${multiTestResults.totalViolations}`)
console.log(`  違規率: ${Math.round(multiTestResults.totalViolations / multiTestResults.totalTests * 100)}%`)

if (multiTestResults.totalViolations > 0) {
  console.log(`\n❌ 確認存在跨場地連續使用問題`)
  
  console.log(`\n🔍 問題分析:`)
  console.log(`1. 現有的 isConsecutiveSameTeamOnSameCourt 只檢查 lastUsedGame + 1 === gameNumber`)
  console.log(`2. 無法檢測跨越其他場次的連續使用 (如第1場→第3場)`)
  console.log(`3. 需要檢查該場地的完整使用歷史，而不只是上一場`)
  
  console.log(`\n🛠️  修正方向:`)
  console.log(`1. 修改檢測邏輯，檢查該場地的最後一次使用`)
  console.log(`2. 不論中間隔了多少場次，只要是同一場地的連續使用就要阻止`)
  console.log(`3. 建立更完整的場地使用歷史追蹤`)
} else {
  console.log(`\n✅ 未檢測到跨場地連續使用問題`)
  console.log(`現有算法可能已經能夠處理這種情況`)
}

console.log(`\n📝 下一步:`)
if (multiTestResults.totalViolations > 0) {
  console.log(`1. 修正 isConsecutiveSameTeamOnSameCourt 函數`)
  console.log(`2. 改為檢查該場地的最後一次使用，而非只檢查上一場次`)
  console.log(`3. 測試修正後的效果`)
} else {
  console.log(`1. 算法運作良好，但建議進行更多邊界條件測試`)
  console.log(`2. 可以考慮增加更多測試場景`)
}