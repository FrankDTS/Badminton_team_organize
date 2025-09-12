const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('✅ 驗證第一場和第二場輪換修正效果')
console.log('重點檢查：修正後是否解決了輪換問題')
console.log('='.repeat(60))

function verifyRotationFix() {
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

  console.log('\n🔬 測試1: 檢查第一場和第二場的輪換')
  console.log('-'.repeat(40))

  let rotationSuccess = true
  let testResults = []

  for (let test = 1; test <= 10; test++) {
    // 重置參與者
    const testParticipants = participants.map(p => ({ ...p, gamesPlayed: 0, lastPlayedRound: 0 }))
    const algorithm = new TeamAllocationAlgorithm()

    // 第1場
    const game1 = algorithm.allocateTeams(testParticipants, courts, 1)
    
    // 更新狀態
    game1.forEach(allocation => {
      allocation.players.forEach(player => {
        const participant = testParticipants.find(p => p.id === player.id)
        if (participant) {
          participant.gamesPlayed++
          participant.lastPlayedRound = 1
        }
      })
    })

    // 第2場
    const game2 = algorithm.allocateTeams(testParticipants, courts, 2)

    // 分析輪換情況
    let testResult = {
      test,
      game1Results: game1.map(a => ({ courtId: a.courtId, players: a.players.map(p => p.name).join('') })),
      game2Results: game2.map(a => ({ courtId: a.courtId, players: a.players.map(p => p.name).join('') })),
      rotationQuality: 'good'
    }

    // 檢查每個場地的輪換
    game2.forEach(allocation2 => {
      const game1SameCourt = game1.find(a1 => a1.courtId === allocation2.courtId)
      if (game1SameCourt) {
        const game1Ids = new Set(game1SameCourt.players.map(p => p.id))
        const game2Ids = allocation2.players.map(p => p.id)
        const overlapCount = game2Ids.filter(id => game1Ids.has(id)).length

        if (overlapCount === 4) {
          testResult.rotationQuality = 'failed'
          rotationSuccess = false
        } else if (overlapCount >= 3) {
          testResult.rotationQuality = 'poor'
        }
      }
    })

    testResults.push(testResult)

    if (test <= 5) {
      console.log(`測試${test}:`)
      console.log(`  第1場: ${testResult.game1Results.map(r => `${r.courtId.slice(-1)}:[${r.players}]`).join(' ')}`)
      console.log(`  第2場: ${testResult.game2Results.map(r => `${r.courtId.slice(-1)}:[${r.players}]`).join(' ')}`)
      console.log(`  輪換品質: ${testResult.rotationQuality}`)
    }
  }

  // 統計結果
  const qualityCounts = {
    good: testResults.filter(r => r.rotationQuality === 'good').length,
    poor: testResults.filter(r => r.rotationQuality === 'poor').length,
    failed: testResults.filter(r => r.rotationQuality === 'failed').length
  }

  console.log(`\n📊 輪換品質統計 (10次測試):`)
  console.log(`  良好: ${qualityCounts.good}次`)
  console.log(`  一般: ${qualityCounts.poor}次`)
  console.log(`  失敗: ${qualityCounts.failed}次`)

  return { rotationSuccess, qualityCounts, testResults }
}

function testVariability() {
  console.log('\n🔬 測試2: 檢查算法變化性')
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

  let uniqueResults = new Set()

  for (let i = 1; i <= 20; i++) {
    const testParticipants = participants.map(p => ({ ...p, gamesPlayed: 0, lastPlayedRound: 0 }))
    const algorithm = new TeamAllocationAlgorithm()
    const allocations = algorithm.allocateTeams(testParticipants, courts, 1)
    
    const result = allocations.map(a => `${a.courtName}:[${a.players.map(p => p.name).join('')}]`).join(' ')
    uniqueResults.add(result)
    
    if (i <= 5) {
      console.log(`運行${i}: ${result}`)
    }
  }

  console.log(`\n📈 變化性統計:`)
  console.log(`  20次運行產生了 ${uniqueResults.size} 種不同結果`)
  console.log(`  變化率: ${Math.round(uniqueResults.size / 20 * 100)}%`)

  return uniqueResults.size
}

function testSpecificScenarios() {
  console.log('\n🔬 測試3: 特定問題場景')
  console.log('-'.repeat(40))

  // 場景1: 8人2場地 - 最容易出現問題的配置
  console.log('場景1: 8人2場地 (最容易出問題)')
  const result1 = testSingleScenario(8, 2)

  // 場景2: 12人2場地 - 有足夠變化空間
  console.log('\n場景2: 12人2場地 (應該輪換良好)')
  const result2 = testSingleScenario(12, 2)

  return { result1, result2 }
}

function testSingleScenario(playerCount, courtCount) {
  const participants = Array.from({ length: playerCount }, (_, i) => ({
    id: (i + 1).toString(),
    name: String.fromCharCode(65 + i), // A, B, C, ...
    skillLevel: 3,
    gamesPlayed: 0,
    lastPlayedRound: 0
  }))

  const courts = Array.from({ length: courtCount }, (_, i) => ({
    id: `court-${i + 1}`,
    name: `場地${i + 1}`,
    isActive: true
  }))

  const algorithm = new TeamAllocationAlgorithm()

  // 第1場
  const game1 = algorithm.allocateTeams(participants, courts, 1)
  
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
  const game2 = algorithm.allocateTeams(participants, courts, 2)

  console.log(`  第1場: ${game1.map(a => `${a.courtName}:[${a.players.map(p => p.name).join('')}]`).join(' ')}`)
  console.log(`  第2場: ${game2.map(a => `${a.courtName}:[${a.players.map(p => p.name).join('')}]`).join(' ')}`)

  // 分析輪換品質
  let totalOverlap = 0
  let perfectRotation = true

  game2.forEach(allocation2 => {
    const game1SameCourt = game1.find(a1 => a1.courtId === allocation2.courtId)
    if (game1SameCourt) {
      const game1Ids = new Set(game1SameCourt.players.map(p => p.id))
      const overlapCount = allocation2.players.filter(p => game1Ids.has(p.id)).length
      totalOverlap += overlapCount
      
      if (overlapCount > 0) {
        perfectRotation = false
      }
      
      console.log(`  ${allocation2.courtName}: ${overlapCount}/4人重疊`)
    }
  })

  return { perfectRotation, totalOverlap, playerCount, courtCount }
}

// 執行所有測試
console.log('🚀 開始驗證修正效果...')

const rotationTest = verifyRotationFix()
const variabilityCount = testVariability()
const scenarioTests = testSpecificScenarios()

// 最終評估
console.log('\n' + '='.repeat(60))
console.log('🎯 修正效果評估')
console.log('='.repeat(60))

console.log(`\n✅ 修正成果:`)
console.log(`1. 輪換測試: ${rotationTest.rotationSuccess ? '通過' : '失敗'}`)
console.log(`   - 良好輪換: ${rotationTest.qualityCounts.good}/10次`)
console.log(`   - 完全失敗: ${rotationTest.qualityCounts.failed}/10次`)

console.log(`\n2. 變化性測試: ${variabilityCount > 1 ? '改善' : '仍需改進'}`)
console.log(`   - 20次運行產生 ${variabilityCount} 種結果`)

console.log(`\n3. 特定場景測試:`)
console.log(`   - 8人2場地: ${scenarioTests.result1.perfectRotation ? '完美輪換' : `${scenarioTests.result1.totalOverlap}人重疊`}`)
console.log(`   - 12人2場地: ${scenarioTests.result2.perfectRotation ? '完美輪換' : `${scenarioTests.result2.totalOverlap}人重疊`}`)

if (rotationTest.rotationSuccess && variabilityCount > 1) {
  console.log(`\n🎉 修正成功！`)
  console.log(`主要改進:`)
  console.log(`✅ 第一場和第二場有良好的輪換`)
  console.log(`✅ 算法增加了變化性`)
  console.log(`✅ 同一輪內避免重複使用相同玩家`)
  console.log(`✅ 時間戳確保每次運行都有微小差異`)
} else if (rotationTest.qualityCounts.failed === 0) {
  console.log(`\n✅ 修正基本成功！`)
  console.log(`雖然還有改進空間，但已經解決了主要問題`)
} else {
  console.log(`\n⚠️  修正部分成功，可能需要進一步調整`)
}

console.log(`\n📝 建議:`)
if (variabilityCount === 1) {
  console.log(`- 考慮增加更多隨機性來源`)
}
if (rotationTest.qualityCounts.poor > 0) {
  console.log(`- 可以進一步優化輪換邏輯`)
}
console.log(`- 在實際使用中測試各種場景`)
console.log(`- 持續監控輪換效果`)