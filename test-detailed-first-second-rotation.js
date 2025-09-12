const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('🔎 詳細測試第一場和第二場輪換問題')
console.log('嘗試重現你描述的同一場地第一場和第二場不換人的問題')
console.log('='.repeat(70))

function runDetailedRotationTest(participants, courts, testName, iterations = 5) {
  console.log(`\n📋 ${testName}`)
  console.log(`參與者: ${participants.length}人, 場地: ${courts.length}個`)
  console.log(`測試${iterations}次不同的分配`)
  console.log('-'.repeat(50))
  
  let problemCount = 0
  let allResults = []
  
  for (let test = 1; test <= iterations; test++) {
    console.log(`\n🎲 測試 ${test}:`)
    
    // 重新初始化參與者狀態
    const testParticipants = participants.map(p => ({
      ...p,
      gamesPlayed: 0,
      lastPlayedRound: 0
    }))
    
    const algorithm = new TeamAllocationAlgorithm()
    
    // 第1場
    const game1 = algorithm.allocateTeams(testParticipants, courts, 1)
    console.log(`  第1場:`, game1.map(a => `${a.courtName}:[${a.players.map(p => p.name).join('')}]`).join(', '))
    
    // 更新狀態
    const round1 = algorithm.calculateRound(1, courts.length)
    game1.forEach(allocation => {
      allocation.players.forEach(player => {
        const participant = testParticipants.find(p => p.id === player.id)
        if (participant) {
          participant.gamesPlayed++
          participant.lastPlayedRound = round1
        }
      })
    })
    
    // 第2場
    const game2 = algorithm.allocateTeams(testParticipants, courts, 2)
    console.log(`  第2場:`, game2.map(a => `${a.courtName}:[${a.players.map(p => p.name).join('')}]`).join(', '))
    
    // 檢查問題
    let testProblems = []
    
    game2.forEach(allocation2 => {
      const game1SameCourt = game1.find(a1 => a1.courtId === allocation2.courtId)
      if (game1SameCourt) {
        const game1Ids = game1SameCourt.players.map(p => p.id).sort()
        const game2Ids = allocation2.players.map(p => p.id).sort()
        
        // 檢查完全相同
        if (game1Ids.join('-') === game2Ids.join('-')) {
          console.log(`    ❌ ${allocation2.courtName}: 完全相同的4人`)
          testProblems.push({
            court: allocation2.courtName,
            type: '完全相同',
            game1: game1SameCourt.players.map(p => p.name).join(''),
            game2: allocation2.players.map(p => p.name).join('')
          })
        } else {
          // 檢查重疊程度
          const game1IdSet = new Set(game1Ids)
          const overlapCount = game2Ids.filter(id => game1IdSet.has(id)).length
          
          if (overlapCount >= 3) {
            console.log(`    ⚠️  ${allocation2.courtName}: ${overlapCount}/4人重疊`)
            testProblems.push({
              court: allocation2.courtName,
              type: `${overlapCount}人重疊`,
              game1: game1SameCourt.players.map(p => p.name).join(''),
              game2: allocation2.players.map(p => p.name).join('')
            })
          } else {
            console.log(`    ✅ ${allocation2.courtName}: 良好輪換 (${overlapCount}人重疊)`)
          }
        }
      }
    })
    
    if (testProblems.length > 0) {
      problemCount++
    }
    
    allResults.push({
      test,
      game1,
      game2,
      problems: testProblems
    })
  }
  
  return { problemCount, allResults, totalTests: iterations }
}

// 測試多種情況
const testCases = [
  {
    name: '8人2場地',
    participants: [
      { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '7', name: 'G', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '8', name: 'H', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
    ],
    courts: [
      { id: 'court-1', name: '場地1', isActive: true },
      { id: 'court-2', name: '場地2', isActive: true }
    ]
  },
  {
    name: '9人2場地',
    participants: [
      { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '7', name: 'G', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '8', name: 'H', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '9', name: 'I', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
    ],
    courts: [
      { id: 'court-1', name: '場地1', isActive: true },
      { id: 'court-2', name: '場地2', isActive: true }
    ]
  },
  {
    name: '6人2場地',
    participants: [
      { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
    ],
    courts: [
      { id: 'court-1', name: '場地1', isActive: true },
      { id: 'court-2', name: '場地2', isActive: true }
    ]
  },
  {
    name: '8人3場地',
    participants: [
      { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '7', name: 'G', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
      { id: '8', name: 'H', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
    ],
    courts: [
      { id: 'court-1', name: '場地1', isActive: true },
      { id: 'court-2', name: '場地2', isActive: true },
      { id: 'court-3', name: '場地3', isActive: true }
    ]
  }
]

let allTestResults = []

testCases.forEach(testCase => {
  const result = runDetailedRotationTest(testCase.participants, testCase.courts, testCase.name, 3)
  allTestResults.push({ name: testCase.name, ...result })
})

// 詳細分析
console.log('\n' + '='.repeat(70))
console.log('📊 綜合分析報告')
console.log('='.repeat(70))

allTestResults.forEach(result => {
  console.log(`\n${result.name}:`)
  console.log(`  問題出現率: ${result.problemCount}/${result.totalTests} (${Math.round(result.problemCount/result.totalTests*100)}%)`)
  
  if (result.problemCount > 0) {
    console.log(`  問題詳情:`)
    result.allResults.forEach((test, index) => {
      if (test.problems.length > 0) {
        console.log(`    測試${test.test}:`)
        test.problems.forEach(problem => {
          console.log(`      - ${problem.court}: ${problem.type} [${problem.game1}]→[${problem.game2}]`)
        })
      }
    })
  }
})

// 尋找算法中的問題點
console.log('\n' + '='.repeat(70))
console.log('🔍 算法行為分析')
console.log('='.repeat(70))

// 分析優先級計算是否有問題
console.log('\n🧮 優先級計算測試:')
const algorithm = new TeamAllocationAlgorithm()

const testParticipants = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '7', name: 'G', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '8', name: 'H', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

const testCourts = [
  { id: 'court-1', name: '場地1', isActive: true },
  { id: 'court-2', name: '場地2', isActive: true }
]

// 檢查連續多次分配的穩定性
console.log('\n🔄 連續分配穩定性測試:')
let stabilityResults = []

for (let i = 1; i <= 5; i++) {
  // 重置狀態
  const participants = testParticipants.map(p => ({ ...p, gamesPlayed: 0, lastPlayedRound: 0 }))
  const algo = new TeamAllocationAlgorithm()
  
  const allocations = algo.allocateTeams(participants, testCourts, 1)
  const result = allocations.map(a => `${a.courtName}:[${a.players.map(p => p.name).join('')}]`).join(' ')
  
  stabilityResults.push(result)
  console.log(`  分配${i}: ${result}`)
}

// 檢查結果是否總是相同
const isStable = stabilityResults.every(result => result === stabilityResults[0])
console.log(`算法穩定性: ${isStable ? '穩定 (總是相同結果)' : '不穩定 (結果會變化)'}`)

if (isStable) {
  console.log('⚠️  算法過於穩定，可能缺乏隨機性或輪換機制')
}

// 總結
console.log('\n' + '='.repeat(70))
console.log('🎯 總結和診斷')
console.log('='.repeat(70))

const totalProblems = allTestResults.reduce((sum, result) => sum + result.problemCount, 0)
const totalTests = allTestResults.reduce((sum, result) => sum + result.totalTests, 0)

console.log(`\n📈 整體統計:`)
console.log(`  總測試次數: ${totalTests}`)
console.log(`  發現問題次數: ${totalProblems}`)
console.log(`  問題比率: ${Math.round(totalProblems/totalTests*100)}%`)

if (totalProblems > 0) {
  console.log(`\n❌ 確認存在輪換問題`)
  
  console.log(`\n🔍 可能的原因:`)
  console.log(`1. 算法的輪換機制在某些情況下失效`)
  console.log(`2. 優先級計算過於確定性，缺乏變化`)
  console.log(`3. 場次平衡邏輯可能覆蓋了輪換需求`)
  console.log(`4. 第一輪內的輪換機制不夠強制`)
} else {
  console.log(`\n🤔 未重現你描述的問題`)
  console.log(`\n💡 可能的情況:`)
  console.log(`1. 問題可能在特定條件下才出現`)
  console.log(`2. 問題可能已經在最近的算法更新中修復`)
  console.log(`3. 問題可能與特定的參與者配置或技能等級分佈有關`)
  console.log(`4. 問題可能與實際使用的條件不同`)
  
  console.log(`\n🔧 建議進一步測試:`)
  console.log(`1. 提供具體的重現步驟或參與者配置`)
  console.log(`2. 測試不同的技能等級分佈`)
  console.log(`3. 檢查實際應用中的條件是否與測試不同`)
}

console.log(`\n📝 如果問題確實存在，修正方向:`)
console.log(`1. 在算法中加入強制輪換機制`)
console.log(`2. 增加隨機性因子，避免過於確定的選擇`)
console.log(`3. 在第一輪內優先考慮輪換而非其他因素`)
console.log(`4. 修改優先級計算，確保不同場次有不同的選擇傾向`)