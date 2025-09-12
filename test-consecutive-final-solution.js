const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('🎯 最終解決方案：修正連續場次檢測測試')
console.log('問題：算法無法檢測跨越空場次的連續使用')
console.log('解決：提供修正後的檢測邏輯和完整測試')
console.log('='.repeat(70))

/**
 * 修正版連續場次檢測函數
 * 
 * 原問題：算法的 isConsecutiveSameTeamOnSameCourt 只檢查 lastUsedGame + 1 === gameNumber
 * 修正方案：檢查該場地上一次實際使用是否為相同團隊（跨越空場次）
 */
class EnhancedConsecutiveDetector {
  constructor() {
    this.courtUsageHistory = new Map() // 記錄每個場地的使用歷史
  }
  
  /**
   * 檢查是否為連續使用（修正版）
   * @param {string[]} playerIds - 玩家ID陣列
   * @param {string} courtId - 場地ID
   * @param {number} gameNumber - 當前場次
   * @returns {boolean} 是否為連續使用
   */
  isActualConsecutiveUsage(playerIds, courtId, gameNumber) {
    const teamKey = [...playerIds].sort().join('-')
    const courtHistory = this.courtUsageHistory.get(courtId) || []
    
    if (courtHistory.length === 0) {
      return false // 第一次使用
    }
    
    // 找出最後一次使用該場地的記錄
    const lastUsage = courtHistory[courtHistory.length - 1]
    
    // 如果最後一次使用的是相同團隊，就是連續使用
    return lastUsage.teamKey === teamKey
  }
  
  /**
   * 記錄場地使用
   * @param {string[]} playerIds - 玩家ID陣列
   * @param {string} courtId - 場地ID
   * @param {number} gameNumber - 場次編號
   */
  recordUsage(playerIds, courtId, gameNumber) {
    const teamKey = [...playerIds].sort().join('-')
    
    if (!this.courtUsageHistory.has(courtId)) {
      this.courtUsageHistory.set(courtId, [])
    }
    
    this.courtUsageHistory.get(courtId).push({
      gameNumber,
      teamKey,
      playerIds: [...playerIds]
    })
  }
  
  /**
   * 獲取場地使用歷史（用於分析）
   */
  getCourtHistory(courtId) {
    return this.courtUsageHistory.get(courtId) || []
  }
  
  /**
   * 獲取所有連續使用情況
   */
  getAllConsecutiveUsages() {
    const consecutiveUsages = []
    
    for (const [courtId, history] of this.courtUsageHistory.entries()) {
      for (let i = 1; i < history.length; i++) {
        if (history[i-1].teamKey === history[i].teamKey) {
          consecutiveUsages.push({
            courtId,
            prevGame: history[i-1].gameNumber,
            currGame: history[i].gameNumber,
            teamKey: history[i].teamKey
          })
        }
      }
    }
    
    return consecutiveUsages
  }
}

/**
 * 完整測試函數
 */
function runCompleteTest(testName, participants, courts, expectedViolations = 'unknown') {
  console.log(`\n📋 ${testName}`)
  console.log(`預期違規數: ${expectedViolations}`)
  console.log('-'.repeat(50))
  
  const algorithm = new TeamAllocationAlgorithm()
  const detector = new EnhancedConsecutiveDetector()
  let violations = []
  let preventedAllocations = 0
  
  for (let game = 1; game <= 10; game++) {
    console.log(`\n🎮 第 ${game} 場:`)
    
    const allocations = algorithm.allocateTeams(participants, courts, game)
    
    if (allocations.length === 0) {
      console.log(`  ❌ 無分配（被算法阻止）`)
      preventedAllocations++
      continue
    }
    
    allocations.forEach(allocation => {
      const playerIds = allocation.players.map(p => p.id)
      const playerNames = allocation.players.map(p => p.name).join('')
      const teamKey = [...playerIds].sort().join('-')
      
      console.log(`  ${allocation.courtName}: [${playerNames}] (${teamKey})`)
      
      // 原算法檢測
      const algorithmDetected = algorithm.isConsecutiveSameTeamOnSameCourt(
        playerIds,
        allocation.courtId,
        game,
        courts.length
      )
      
      // 修正版檢測
      const actualConsecutive = detector.isActualConsecutiveUsage(
        playerIds,
        allocation.courtId,
        game
      )
      
      if (actualConsecutive) {
        console.log(`    ❌ 連續使用違規！`)
        violations.push({
          game,
          court: allocation.courtName,
          courtId: allocation.courtId,
          team: playerNames,
          teamKey
        })
      }
      
      if (algorithmDetected) {
        console.log(`    🔍 原算法檢測: 連續`)
      }
      
      if (actualConsecutive && !algorithmDetected) {
        console.log(`    💥 檢測漏洞: 原算法未檢測到`)
      }
      
      if (!actualConsecutive) {
        console.log(`    ✅ 通過檢測`)
      }
      
      // 記錄使用
      detector.recordUsage(playerIds, allocation.courtId, game)
    })
    
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
  
  // 詳細分析
  console.log(`\n📊 分析結果:`)
  console.log(`  實際違規數: ${violations.length}`)
  console.log(`  被阻止的分配: ${preventedAllocations}`)
  
  const allConsecutive = detector.getAllConsecutiveUsages()
  console.log(`  檢測到的連續使用: ${allConsecutive.length}`)
  
  if (violations.length > 0) {
    console.log(`\n🚨 違規詳情:`)
    violations.forEach((v, index) => {
      const history = detector.getCourtHistory(v.courtId)
      const violationIndex = history.findIndex(h => h.gameNumber === v.game)
      
      if (violationIndex > 0) {
        const prev = history[violationIndex - 1]
        console.log(`    ${index + 1}. 第${prev.gameNumber}場→第${v.game}場: ${v.court} [${v.team}]`)
      }
    })
  }
  
  // 場地使用模式
  console.log(`\n🏟️  場地使用模式:`)
  for (const [courtId, history] of detector.courtUsageHistory.entries()) {
    const courtName = courts.find(c => c.id === courtId)?.name || courtId
    console.log(`  ${courtName}: ${history.map(h => `第${h.gameNumber}場[${h.teamKey}]`).join(' → ')}`)
  }
  
  return {
    violations: violations.length,
    preventedAllocations,
    actualConsecutive: allConsecutive.length,
    detector
  }
}

// 測試案例1：8人2場地 - 應該沒有違規
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

const result1 = runCompleteTest('測試1: 8人2場地（理想情況）', [...participants1], courts, 0)

// 測試案例2：4人1場地 - 會有違規
const participants2 = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

const courts2 = [
  { id: 'court-1', name: '場地1', isActive: true }
]

const result2 = runCompleteTest('測試2: 4人1場地（問題情況）', [...participants2], courts2, '>0')

// 測試案例3：6人1場地 - 部分違規
const participants3 = [
  { id: '1', name: 'A', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'B', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'C', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'D', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '5', name: 'E', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: 'F', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 }
]

const result3 = runCompleteTest('測試3: 6人1場地（邊界情況）', [...participants3], courts2, '?')

// 最終總結
console.log('\n' + '='.repeat(70))
console.log('🏁 最終測試報告')
console.log('='.repeat(70))

console.log(`\n📊 測試結果統計:`)
console.log(`  測試1 (8人2場地): ${result1.violations}違規, ${result1.preventedAllocations}阻止`)
console.log(`  測試2 (4人1場地): ${result2.violations}違規, ${result2.preventedAllocations}阻止`)
console.log(`  測試3 (6人1場地): ${result3.violations}違規, ${result3.preventedAllocations}阻止`)

const totalViolations = result1.violations + result2.violations + result3.violations

console.log(`\n🎯 結論:`)
if (totalViolations > 0) {
  console.log(`❌ 檢測到 ${totalViolations} 個連續場次問題`)
  console.log(`主要問題: 算法無法檢測跨越空場次的連續使用`)
  
  console.log(`\n🛠️  修正建議:`)
  console.log(`1. 在 team-allocation-algorithm.ts 中修改 isConsecutiveSameTeamOnSameCourt 函數`)
  console.log(`2. 不只檢查 lastUsedGame + 1 === gameNumber`)
  console.log(`3. 改為檢查該場地上一次實際使用的團隊`)
  console.log(`4. 使用類似 EnhancedConsecutiveDetector 的邏輯`)
  
  console.log(`\n💡 修正程式碼建議:`)
  console.log(\`// 在算法類別中加入場地使用追蹤
private courtLastUsage: Map<string, { teamKey: string, gameNumber: number }> = new Map()

// 修正檢測函數
public isConsecutiveSameTeamOnSameCourt(playerIds: string[], courtId: string, gameNumber: number, courtsCount: number): boolean {
  const teamKey = [...playerIds].sort().join('-')
  const lastUsage = this.courtLastUsage.get(courtId)
  
  if (!lastUsage) {
    return false // 第一次使用此場地
  }
  
  return lastUsage.teamKey === teamKey // 如果上次使用的是相同團隊就是違規
}

// 在分配成功後更新記錄
private recordCourtUsage(playerIds: string[], courtId: string, gameNumber: number): void {
  const teamKey = [...playerIds].sort().join('-')
  this.courtLastUsage.set(courtId, { teamKey, gameNumber })
}\`)
} else {
  console.log(`✅ 所有測試通過，未檢測到連續場次問題`)
}

console.log(`\n📝 測試檔案特色:`)
console.log(`1. ✅ 能準確檢測跨越空場次的連續使用`)
console.log(`2. ✅ 提供詳細的場地使用模式分析`)
console.log(`3. ✅ 區分原算法檢測與實際違規`)
console.log(`4. ✅ 適用於各種人數和場地配置`)
console.log(`5. ✅ 提供具體的修正建議和程式碼`)

console.log(`\n🎮 使用說明:`)
console.log(`- 執行此測試檔案可以立即檢測連續場次問題`)
console.log(`- 如果檢測到違規，按照建議修正算法`)
console.log(`- 修正後再次執行此測試驗證結果`)
console.log(`- 此測試可以作為持續整合的一部分`)