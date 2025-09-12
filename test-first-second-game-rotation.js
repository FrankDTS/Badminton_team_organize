const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('🔍 測試第一場和第二場是否會換人')
console.log('問題：同一個場地的第一場和第二場都不會換人')
console.log('='.repeat(60))

function testFirstSecondGameRotation(participants, courts, testName) {
  console.log(`\n📋 ${testName}`)
  console.log(`參與者: ${participants.length}人, 場地: ${courts.length}個`)
  console.log('-'.repeat(40))
  
  const algorithm = new TeamAllocationAlgorithm()
  
  // 第一場分配
  console.log('🎮 第1場分配:')
  const game1Allocations = algorithm.allocateTeams(participants, courts, 1)
  
  let game1Results = []
  game1Allocations.forEach(allocation => {
    const playerNames = allocation.players.map(p => p.name).join('')
    const playerIds = allocation.players.map(p => p.id).sort()
    console.log(`  ${allocation.courtName}: [${playerNames}] (${playerIds.join('-')})`)
    
    game1Results.push({
      courtId: allocation.courtId,
      courtName: allocation.courtName,
      playerIds: playerIds,
      playerNames: playerNames,
      teamKey: playerIds.join('-')
    })
  })
  
  // 更新參與者狀態
  const currentRound1 = algorithm.calculateRound(1, courts.length)
  game1Allocations.forEach(allocation => {
    allocation.players.forEach(player => {
      const participant = participants.find(p => p.id === player.id)
      if (participant) {
        participant.gamesPlayed++
        participant.lastPlayedRound = currentRound1
      }
    })
  })
  
  // 第二場分配
  console.log('\n🎮 第2場分配:')
  const game2Allocations = algorithm.allocateTeams(participants, courts, 2)
  
  let game2Results = []
  let rotationIssues = []
  
  game2Allocations.forEach(allocation => {
    const playerNames = allocation.players.map(p => p.name).join('')
    const playerIds = allocation.players.map(p => p.id).sort()
    console.log(`  ${allocation.courtName}: [${playerNames}] (${playerIds.join('-')})`)
    
    game2Results.push({
      courtId: allocation.courtId,
      courtName: allocation.courtName,
      playerIds: playerIds,
      playerNames: playerNames,
      teamKey: playerIds.join('-')
    })
    
    // 檢查是否與第一場相同
    const game1SameCourt = game1Results.find(g1 => g1.courtId === allocation.courtId)
    if (game1SameCourt) {
      if (game1SameCourt.teamKey === playerIds.join('-')) {
        console.log(`    ❌ 完全相同: ${allocation.courtName}第1場和第2場都是[${playerNames}]`)
        rotationIssues.push({
          court: allocation.courtName,
          issue: '完全相同的4人',
          game1Team: game1SameCourt.playerNames,
          game2Team: playerNames
        })
      } else {
        // 計算重疊人數
        const game1Ids = new Set(game1SameCourt.playerIds)
        const overlapCount = playerIds.filter(id => game1Ids.has(id)).length
        
        if (overlapCount === 4) {
          console.log(`    ❌ 4人完全相同: ${allocation.courtName} [${game1SameCourt.playerNames}] → [${playerNames}]`)
          rotationIssues.push({
            court: allocation.courtName,
            issue: '4人完全相同',
            game1Team: game1SameCourt.playerNames,
            game2Team: playerNames
          })
        } else if (overlapCount >= 3) {
          console.log(`    ⚠️  ${overlapCount}人重複: ${allocation.courtName} [${game1SameCourt.playerNames}] → [${playerNames}]`)
          rotationIssues.push({
            court: allocation.courtName,
            issue: `${overlapCount}人重複`,
            game1Team: game1SameCourt.playerNames,
            game2Team: playerNames
          })
        } else {
          console.log(`    ✅ 良好輪換: ${allocation.courtName} [${game1SameCourt.playerNames}] → [${playerNames}] (${overlapCount}人重複)`)
        }
      }
    }
  })
  
  return {
    game1Results,
    game2Results,
    rotationIssues,
    hasRotationProblems: rotationIssues.length > 0
  }
}

// 測試案例1：8人2場地
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

const result1 = testFirstSecondGameRotation([...participants1], courts, '測試1: 8人2場地')

// 測試案例2：12人2場地
const participants2 = [
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

const result2 = testFirstSecondGameRotation([...participants2], courts, '測試2: 12人2場地')

// 測試案例3：10人2場地
const participants3 = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '7', name: 'G', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '8', name: 'H', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '9', name: 'I', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '10', name: 'J', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

const result3 = testFirstSecondGameRotation([...participants3], courts, '測試3: 10人2場地')

// 分析結果
console.log('\n' + '='.repeat(60))
console.log('📊 問題分析報告')
console.log('='.repeat(60))

function analyzeRotationProblems(testName, result) {
  console.log(`\n${testName}:`)
  
  if (result.hasRotationProblems) {
    console.log(`  ❌ 檢測到 ${result.rotationIssues.length} 個輪換問題`)
    result.rotationIssues.forEach((issue, index) => {
      console.log(`    ${index + 1}. ${issue.court}: ${issue.issue}`)
      console.log(`       第1場: [${issue.game1Team}] → 第2場: [${issue.game2Team}]`)
    })
  } else {
    console.log(`  ✅ 無輪換問題`)
  }
  
  // 分析場地使用模式
  console.log(`  場地分配模式:`)
  const courtsUsed = new Set([...result.game1Results.map(r => r.courtId), ...result.game2Results.map(r => r.courtId)])
  
  courtsUsed.forEach(courtId => {
    const game1Court = result.game1Results.find(r => r.courtId === courtId)
    const game2Court = result.game2Results.find(r => r.courtId === courtId)
    
    const courtName = game1Court?.courtName || game2Court?.courtName || courtId
    const game1Team = game1Court ? game1Court.playerNames : '空'
    const game2Team = game2Court ? game2Court.playerNames : '空'
    
    console.log(`    ${courtName}: [${game1Team}] → [${game2Team}]`)
  })
}

analyzeRotationProblems('測試1結果', result1)
analyzeRotationProblems('測試2結果', result2)
analyzeRotationProblems('測試3結果', result3)

// 總結
console.log('\n' + '='.repeat(60))
console.log('🎯 總結和建議')
console.log('='.repeat(60))

const totalProblems = result1.rotationIssues.length + result2.rotationIssues.length + result3.rotationIssues.length
console.log(`\n檢測到的總問題數: ${totalProblems}`)

if (totalProblems > 0) {
  console.log(`\n❌ 確認存在第一場和第二場不換人的問題`)
  console.log(`\n🔍 問題特徵:`)
  console.log(`- 同一場地在第1場和第2場可能使用相同的4人組合`)
  console.log(`- 在人數較少的情況下問題更明顯`)
  console.log(`- 算法傾向於重複使用相同的組合`)
  
  console.log(`\n💡 可能的原因:`)
  console.log(`1. 算法的優先級計算在第1輪內傾向於選擇相同的玩家`)
  console.log(`2. 當可選擇的組合有限時，算法缺乏強制輪換機制`)
  console.log(`3. 場次平衡邏輯可能在第1輪內不夠積極`)
  
  console.log(`\n🛠️  修正方向:`)
  console.log(`1. 在第1輪內加強輪換機制`)
  console.log(`2. 修正優先級計算，避免在第1輪內重複選擇`)
  console.log(`3. 加入強制變化邏輯，確保第2場與第1場不同`)
} else {
  console.log(`\n✅ 未檢測到第一場和第二場不換人的問題`)
}

console.log(`\n📝 下一步:`)
console.log(`1. 如果確認有問題，需要修改算法中的選擇邏輯`)
console.log(`2. 重點檢查 calculatePlayerPriorities 和 performAllocation 函數`)
console.log(`3. 特別關注第1輪內的輪換機制`)
console.log(`4. 測試修正後的效果`)