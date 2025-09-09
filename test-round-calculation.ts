import { TeamAllocationAlgorithm } from './lib/team-allocation-algorithm'

/**
 * 測試輪次計算邏輯
 * 規則1: 輪次計算 - 基於場地數量動態計算輪次
 * 例如2場地的話，場次1-2是第1輪，場次3-4是第2輪
 */

function testRoundCalculation() {
  const algorithm = new TeamAllocationAlgorithm()
  
  console.log('=== 輪次計算測試 ===\n')
  
  // 測試案例1: 2個場地
  console.log('📍 測試案例1: 2個場地')
  const courts2 = 2
  const testCases2 = [
    { game: 1, expectedRound: 1 },
    { game: 2, expectedRound: 1 },
    { game: 3, expectedRound: 2 },
    { game: 4, expectedRound: 2 },
    { game: 5, expectedRound: 3 },
    { game: 6, expectedRound: 3 },
    { game: 7, expectedRound: 4 },
    { game: 8, expectedRound: 4 }
  ]
  
  testCases2.forEach(({ game, expectedRound }) => {
    const actualRound = algorithm.calculateRound(game, courts2)
    const status = actualRound === expectedRound ? '✅' : '❌'
    console.log(`  場次 ${game} -> 輪次 ${actualRound} (期望: ${expectedRound}) ${status}`)
  })
  
  // 測試案例2: 3個場地
  console.log('\n📍 測試案例2: 3個場地')
  const courts3 = 3
  const testCases3 = [
    { game: 1, expectedRound: 1 },
    { game: 2, expectedRound: 1 },
    { game: 3, expectedRound: 1 },
    { game: 4, expectedRound: 2 },
    { game: 5, expectedRound: 2 },
    { game: 6, expectedRound: 2 },
    { game: 7, expectedRound: 3 },
    { game: 8, expectedRound: 3 },
    { game: 9, expectedRound: 3 },
    { game: 10, expectedRound: 4 }
  ]
  
  testCases3.forEach(({ game, expectedRound }) => {
    const actualRound = algorithm.calculateRound(game, courts3)
    const status = actualRound === expectedRound ? '✅' : '❌'
    console.log(`  場次 ${game} -> 輪次 ${actualRound} (期望: ${expectedRound}) ${status}`)
  })
  
  // 測試案例3: 1個場地
  console.log('\n📍 測試案例3: 1個場地')
  const courts1 = 1
  const testCases1 = [
    { game: 1, expectedRound: 1 },
    { game: 2, expectedRound: 2 },
    { game: 3, expectedRound: 3 },
    { game: 4, expectedRound: 4 },
    { game: 5, expectedRound: 5 }
  ]
  
  testCases1.forEach(({ game, expectedRound }) => {
    const actualRound = algorithm.calculateRound(game, courts1)
    const status = actualRound === expectedRound ? '✅' : '❌'
    console.log(`  場次 ${game} -> 輪次 ${actualRound} (期望: ${expectedRound}) ${status}`)
  })
}

function testRoundRange() {
  const algorithm = new TeamAllocationAlgorithm()
  
  console.log('\n=== 輪次範圍測試 ===\n')
  
  // 測試案例1: 2個場地的輪次範圍
  console.log('📍 測試案例1: 2個場地的輪次範圍')
  const courts2 = 2
  const roundRangeTests2 = [
    { round: 1, expectedStart: 1, expectedEnd: 2 },
    { round: 2, expectedStart: 3, expectedEnd: 4 },
    { round: 3, expectedStart: 5, expectedEnd: 6 },
    { round: 4, expectedStart: 7, expectedEnd: 8 }
  ]
  
  roundRangeTests2.forEach(({ round, expectedStart, expectedEnd }) => {
    const { start, end } = algorithm.getRoundRange(round, courts2)
    const status = (start === expectedStart && end === expectedEnd) ? '✅' : '❌'
    console.log(`  第${round}輪 -> 場次 ${start}-${end} (期望: ${expectedStart}-${expectedEnd}) ${status}`)
  })
  
  // 測試案例2: 3個場地的輪次範圍
  console.log('\n📍 測試案例2: 3個場地的輪次範圍')
  const courts3 = 3
  const roundRangeTests3 = [
    { round: 1, expectedStart: 1, expectedEnd: 3 },
    { round: 2, expectedStart: 4, expectedEnd: 6 },
    { round: 3, expectedStart: 7, expectedEnd: 9 },
    { round: 4, expectedStart: 10, expectedEnd: 12 }
  ]
  
  roundRangeTests3.forEach(({ round, expectedStart, expectedEnd }) => {
    const { start, end } = algorithm.getRoundRange(round, courts3)
    const status = (start === expectedStart && end === expectedEnd) ? '✅' : '❌'
    console.log(`  第${round}輪 -> 場次 ${start}-${end} (期望: ${expectedStart}-${expectedEnd}) ${status}`)
  })
}

function testErrorHandling() {
  const algorithm = new TeamAllocationAlgorithm()
  
  console.log('\n=== 錯誤處理測試 ===\n')
  
  // 測試無效輸入
  const errorTests = [
    { game: 0, courts: 2, description: '場次編號為0' },
    { game: -1, courts: 2, description: '場次編號為負數' },
    { game: 1, courts: 0, description: '場地數量為0' },
    { game: 1, courts: -1, description: '場地數量為負數' }
  ]
  
  errorTests.forEach(({ game, courts, description }) => {
    try {
      algorithm.calculateRound(game, courts)
      console.log(`  ${description}: ❌ 應該拋出錯誤但沒有`)
    } catch (error) {
      console.log(`  ${description}: ✅ 正確拋出錯誤`)
    }
  })
  
  // 測試輪次範圍錯誤處理
  const rangeErrorTests = [
    { round: 0, courts: 2, description: '輪次為0' },
    { round: -1, courts: 2, description: '輪次為負數' },
    { round: 1, courts: 0, description: '場地數量為0' },
    { round: 1, courts: -1, description: '場地數量為負數' }
  ]
  
  rangeErrorTests.forEach(({ round, courts, description }) => {
    try {
      algorithm.getRoundRange(round, courts)
      console.log(`  ${description}: ❌ 應該拋出錯誤但沒有`)
    } catch (error) {
      console.log(`  ${description}: ✅ 正確拋出錯誤`)
    }
  })
}

function testRealWorldScenarios() {
  const algorithm = new TeamAllocationAlgorithm()
  
  console.log('\n=== 實際場景測試 ===\n')
  
  // 場景1: 4個場地，12個場次
  console.log('📍 場景1: 4個場地，12個場次')
  const courts4 = 4
  for (let game = 1; game <= 12; game++) {
    const round = algorithm.calculateRound(game, courts4)
    const expectedRound = Math.ceil(game / courts4)
    const status = round === expectedRound ? '✅' : '❌'
    console.log(`  場次 ${game} -> 第${round}輪 (期望: 第${expectedRound}輪) ${status}`)
  }
  
  // 場景2: 驗證輪次範圍與場次計算的一致性
  console.log('\n📍 場景2: 驗證輪次範圍與場次計算的一致性')
  for (let courts = 1; courts <= 5; courts++) {
    for (let round = 1; round <= 3; round++) {
      const { start, end } = algorithm.getRoundRange(round, courts)
      
      // 驗證範圍內的所有場次都屬於該輪次
      let allCorrect = true
      for (let game = start; game <= end; game++) {
        const calculatedRound = algorithm.calculateRound(game, courts)
        if (calculatedRound !== round) {
          allCorrect = false
          break
        }
      }
      
      const status = allCorrect ? '✅' : '❌'
      console.log(`  ${courts}場地, 第${round}輪 (場次${start}-${end}): ${status}`)
    }
  }
}

// 執行所有測試
function runAllTests() {
  console.log('🧪 開始輪次計算邏輯測試...\n')
  
  testRoundCalculation()
  testRoundRange()
  testErrorHandling()
  testRealWorldScenarios()
  
  console.log('\n🎉 測試完成！')
}

// 執行測試
runAllTests()