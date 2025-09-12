const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('🔧 修正版連續場次檢測器')
console.log('目標：正確檢測同樣4人在同一場地的連續使用問題')
console.log('='.repeat(70))

/**
 * 修正版連續場次檢測函數
 * 此函數考慮了實際場地使用的連續性，而不只是場次編號的連續性
 * @param {Array} allResults - 所有場次的結果
 * @param {string} courtId - 場地ID
 * @param {string} teamKey - 團隊組合key
 * @param {number} currentGame - 當前場次
 * @returns {boolean} 是否為連續使用
 */
function detectActualConsecutiveUsage(allResults, courtId, teamKey, currentGame) {
  if (allResults.length === 0) return false
  
  // 找出這個場地上一次被使用的場次
  let lastUsedGame = -1
  let lastUsedTeamKey = null
  
  // 從最近的場次往前找
  for (let i = allResults.length - 1; i >= 0; i--) {
    const gameResult = allResults[i]
    const courtAllocation = gameResult.allocations.find(a => a.courtId === courtId)
    
    if (courtAllocation) {
      lastUsedGame = gameResult.game
      lastUsedTeamKey = courtAllocation.teamKey
      break
    }
  }
  
  // 如果找到了上一次使用，且是相同的團隊組合，就是連續使用
  if (lastUsedGame > 0 && lastUsedTeamKey === teamKey) {
    return true
  }
  
  return false
}

/**
 * 增強版測試函數
 */
function runEnhancedTest(testName, participants, courts) {
  console.log(`\n📋 ${testName}`)
  console.log('-'.repeat(50))
  
  const algorithm = new TeamAllocationAlgorithm()
  let allResults = []
  let violations = []
  let consecutiveDetections = []
  
  for (let game = 1; game <= 10; game++) {
    console.log(`\n🎮 第 ${game} 場:`)
    
    const allocations = algorithm.allocateTeams(participants, courts, game)
    
    if (allocations.length === 0) {
      console.log(`  ❌ 無分配結果（可能被保護機制阻止）`)
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
    
    // 檢查每個分配
    gameData.allocations.forEach(alloc => {
      console.log(`  ${alloc.courtName}: [${alloc.playerNames}] (${alloc.teamKey})`)
      
      // 原始算法檢測
      const algorithmDetection = algorithm.isConsecutiveSameTeamOnSameCourt(
        alloc.playerIds,
        alloc.courtId,
        game,
        courts.length
      )
      
      // 修正版檢測
      const actualConsecutive = detectActualConsecutiveUsage(allResults, alloc.courtId, alloc.teamKey, game)
      
      if (algorithmDetection) {
        console.log(`    🔍 算法檢測: 連續場次`)
        consecutiveDetections.push({
          game,
          court: alloc.courtName,
          team: alloc.playerNames,
          detectionType: 'algorithm'
        })
      }
      
      if (actualConsecutive) {
        console.log(`    ⚠️  實際連續: 同樣4人在${alloc.courtName}連續使用`)
        violations.push({
          game,
          court: alloc.courtName,
          team: alloc.playerNames,
          teamKey: alloc.teamKey,
          type: 'actual_consecutive'
        })
      }
      
      if (!algorithmDetection && actualConsecutive) {
        console.log(`    💥 檢測漏洞: 算法未檢測到實際連續使用`)
      }
      
      if (algorithmDetection && !actualConsecutive) {
        console.log(`    ✅ 算法成功防止連續`)
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
  }
  
  return { violations, consecutiveDetections, allResults }
}

// 測試案例1：8人2場地 - 標準情況
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

const result1 = runEnhancedTest('測試1: 8人2場地', [...participants1], courts)

// 測試案例2：4人1場地 - 必然連續的極端情況
const participants2 = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

const courts2 = [
  { id: 'court-1', name: '場地1', isActive: true }
]

const result2 = runEnhancedTest('測試2: 4人1場地（極端情況）', [...participants2], courts2)

// 詳細分析
console.log('\n' + '='.repeat(70))
console.log('📊 詳細分析報告')
console.log('='.repeat(70))

function analyzeResults(testName, result) {
  console.log(`\n${testName}:`)
  console.log(`  實際連續違規: ${result.violations.length}`)
  console.log(`  算法檢測次數: ${result.consecutiveDetections.length}`)
  
  if (result.violations.length > 0) {
    console.log(`  違規詳情:`)
    result.violations.forEach((v, index) => {
      console.log(`    ${index + 1}. 第${v.game}場 ${v.court}: [${v.team}]`)
    })
  }
  
  // 分析場地使用模式
  const courtUsagePattern = {}
  result.allResults.forEach(gameResult => {
    gameResult.allocations.forEach(alloc => {
      if (!courtUsagePattern[alloc.courtId]) {
        courtUsagePattern[alloc.courtId] = []
      }
      courtUsagePattern[alloc.courtId].push({
        game: gameResult.game,
        team: alloc.playerNames,
        teamKey: alloc.teamKey
      })
    })
  })
  
  console.log(`  場地使用模式:`)
  Object.keys(courtUsagePattern).forEach(courtId => {
    const usage = courtUsagePattern[courtId]
    console.log(`    ${courtId}: ${usage.map(u => `第${u.game}場[${u.team}]`).join(' → ')}`)
    
    // 檢查連續使用
    for (let i = 1; i < usage.length; i++) {
      if (usage[i-1].teamKey === usage[i].teamKey) {
        console.log(`      ⚠️  連續: 第${usage[i-1].game}場→第${usage[i].game}場 都是[${usage[i].team}]`)
      }
    }
  })
}

analyzeResults('測試1結果', result1)
analyzeResults('測試2結果', result2)

// 總結和建議
console.log('\n' + '='.repeat(70))
console.log('🎯 總結和建議')
console.log('='.repeat(70))

const totalViolations = result1.violations.length + result2.violations.length

console.log(`\n📈 統計:`)
console.log(`  總實際違規數: ${totalViolations}`)
console.log(`  測試1違規數: ${result1.violations.length}`)
console.log(`  測試2違規數: ${result2.violations.length}`)

if (totalViolations > 0) {
  console.log(`\n❌ 檢測到連續場次問題！`)
  console.log(`\n🛠️  建議修正方案:`)
  console.log(`1. 修改 isConsecutiveSameTeamOnSameCourt 函數`)
  console.log(`2. 不只檢查 lastUsedGame + 1 === gameNumber`)
  console.log(`3. 檢查該場地上一次實際使用是否為相同團隊`)
  console.log(`4. 考慮跨越空場次的連續性`)
  
  console.log(`\n💡 修正後的檢測邏輯:`)
  console.log(`   - 找出該場地上一次被使用的場次`)
  console.log(`   - 檢查上一次使用的團隊是否與當前相同`)
  console.log(`   - 如果相同，就是連續使用（無論中間有多少空場次）`)
} else {
  console.log(`\n✅ 未檢測到連續場次問題`)
  console.log(`算法的保護機制運作良好`)
}

console.log(`\n📝 測試檔案使用說明:`)
console.log(`1. 此測試能夠準確檢測實際的連續使用問題`)
console.log(`2. 區分算法檢測和實際連續的差異`)
console.log(`3. 提供詳細的場地使用模式分析`)
console.log(`4. 適用於各種人數和場地組合的測試`)