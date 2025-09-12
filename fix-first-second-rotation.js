const fs = require('fs')
const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('🔧 修復第一場和第二場不換人的問題')
console.log('策略：增強第一輪內的輪換機制')
console.log('='.repeat(60))

// 首先創建修正後的算法類別
const originalAlgorithmCode = fs.readFileSync('./lib/team-allocation-algorithm.ts', 'utf8')

// 修正方案：在算法中增加強制輪換邏輯
const enhancedAlgorithmCode = originalAlgorithmCode.replace(
  // 找到優先級計算函數中的輪換因子部分
  /\/\/ 規則5：添加基於遊戲編號的輪換因子，確保隊伍變化[\s\S]*?priorityScore \+= gameBasedRotationFactor/,
  `// 規則5：添加基於遊戲編號的輪換因子，確保隊伍變化
      // 修正版：增加時間戳確保每次調用都有不同的結果
      const timeBasedFactor = Date.now() % 100
      const gameBasedRotationFactor = ((currentGame * 13 + parseInt(participant.id) * 7 + timeBasedFactor) % 100) - 50
      
      // 在第一輪內，大幅增強輪換因子，確保隊伍變化
      if (hasUnplayedPlayers && currentRound === 1) {
        priorityScore += gameBasedRotationFactor * 5 // 增強輪換效果
      } else if (hasUnplayedPlayers) {
        priorityScore += gameBasedRotationFactor * 3 // 其他情況適中加強
      } else {
        priorityScore += gameBasedRotationFactor
      }`
).replace(
  // 增強同一輪內的強制變化邏輯
  /\/\/ 在同輪次內強制隊伍變化：直接檢查上一場的參賽者[\s\S]*?previousPlayerIds\.forEach\(id => previousGamePlayers\.add\(id\)\)/,
  `// 在同輪次內強制隊伍變化：直接檢查上一場的參賽者
        // 這對於8人2場地的情況特別重要
        
        // 修正版：不只檢查上一場，還要檢查同一輪內所有場次
        const currentRound = this.calculateRound(gameNumber, courtsCount)
        const roundStart = (currentRound - 1) * courtsCount + 1
        
        // 檢查當前輪次內所有已分配的場次
        for (let prevGameInRound = roundStart; prevGameInRound < gameNumber; prevGameInRound++) {
          const previousTeamKey = this.getLastUsedTeamKey(prevGameInRound)
          if (previousTeamKey) {
            const previousPlayerIds = previousTeamKey.split('-')
            previousPlayerIds.forEach(id => previousGamePlayers.add(id))
          }
        }`
)

// 如果需要，我們也可以增加新的方法
const additionalMethods = `

  /**
   * 強制輪換選擇 - 專門處理第一輪內的變化
   */
  private forceFirstRoundRotation(remainingPlayers: PlayerWithPriority[], gameNumber: number, courtsCount: number): PlayerWithPriority[] {
    const currentRound = this.calculateRound(gameNumber, courtsCount)
    
    // 只在第一輪內應用
    if (currentRound !== 1) {
      return remainingPlayers
    }
    
    // 如果是第一場，正常返回
    if (gameNumber === 1) {
      return remainingPlayers
    }
    
    // 獲取第一輪內已使用的玩家
    const usedPlayersInRound = new Set<string>()
    const roundStart = (currentRound - 1) * courtsCount + 1
    
    for (let prevGame = roundStart; prevGame < gameNumber; prevGame++) {
      const teamKey = this.getLastUsedTeamKey(prevGame)
      if (teamKey) {
        teamKey.split('-').forEach(id => usedPlayersInRound.add(id))
      }
    }
    
    // 優先選擇未在本輪使用過的玩家
    const unusedPlayers = remainingPlayers.filter(p => !usedPlayersInRound.has(p.id))
    const usedPlayers = remainingPlayers.filter(p => usedPlayersInRound.has(p.id))
    
    // 如果有足夠的未使用玩家，優先使用他們
    if (unusedPlayers.length >= 4) {
      return [...unusedPlayers, ...usedPlayers]
    } else {
      // 混合使用，但優先選擇未使用的
      return [...unusedPlayers, ...usedPlayers]
    }
  }
`

// 寫入修正後的檔案
const finalEnhancedCode = enhancedAlgorithmCode.replace(
  /export class TeamAllocationAlgorithm \{/,
  `export class TeamAllocationAlgorithm {${additionalMethods}
  
  // 修正標記
  private _isEnhancedVersion = true`
).replace(
  // 在選擇邏輯中應用強制輪換
  /\/\/ 選擇策略：確保隊伍變化/,
  `// 選擇策略：確保隊伍變化 - 修正版
      
      // 應用第一輪強制輪換
      remainingPlayers = this.forceFirstRoundRotation(remainingPlayers, gameNumber, courts.length)`
)

fs.writeFileSync('./lib/team-allocation-algorithm-enhanced.ts', finalEnhancedCode)

console.log('✅ 創建了增強版算法: team-allocation-algorithm-enhanced.ts')

// 測試修正後的效果
console.log('\n🧪 測試修正後的效果')
console.log('-'.repeat(40))

// 創建測試用的動態require來使用新版本
function testEnhancedAlgorithm() {
  // 由於我們無法動態重新載入TypeScript檔案，這裡提供測試建議
  console.log('📝 測試步驟:')
  console.log('1. 將 team-allocation-algorithm-enhanced.ts 替換原本的檔案')
  console.log('2. 或者修改 import 路徑來使用增強版')
  console.log('3. 運行以下測試來驗證修正效果')
  
  console.log('\n💡 主要修正內容:')
  console.log('1. ✅ 增加時間戳到輪換因子計算，確保每次都有不同結果')
  console.log('2. ✅ 增強第一輪內的輪換權重 (3倍 → 5倍)')
  console.log('3. ✅ 改進同輪次檢查邏輯，檢查所有已分配的場次')
  console.log('4. ✅ 新增 forceFirstRoundRotation 方法專門處理第一輪變化')
  console.log('5. ✅ 優先選擇本輪內未使用過的玩家')
}

testEnhancedAlgorithm()

// 提供手動修正指南
console.log('\n🛠️  手動修正指南')
console.log('='.repeat(60))

console.log('\n如果你想手動修正，請在 team-allocation-algorithm.ts 中進行以下修改:')

console.log('\n1. 修正輪換因子計算 (約第262行):')
console.log('原始:')
console.log('const gameBasedRotationFactor = ((currentGame * 13 + parseInt(participant.id) * 7) % 100) - 50')
console.log('\n修正為:')
console.log('const timeBasedFactor = Date.now() % 100')
console.log('const gameBasedRotationFactor = ((currentGame * 13 + parseInt(participant.id) * 7 + timeBasedFactor) % 100) - 50')

console.log('\n2. 增強第一輪輪換權重 (約第266行):')
console.log('原始:')
console.log('priorityScore += gameBasedRotationFactor * 3 // 第一輪內加強輪換效果')
console.log('\n修正為:')
console.log('priorityScore += gameBasedRotationFactor * 5 // 增強輪換效果')

console.log('\n3. 改進同輪次檢查邏輯 (約第460-470行):')
console.log('在現有邏輯前加入:')
console.log(`const currentRound = this.calculateRound(gameNumber, courtsCount)
const roundStart = (currentRound - 1) * courtsCount + 1

// 檢查當前輪次內所有已分配的場次
for (let prevGameInRound = roundStart; prevGameInRound < gameNumber; prevGameInRound++) {
  const previousTeamKey = this.getLastUsedTeamKey(prevGameInRound)
  if (previousTeamKey) {
    const previousPlayerIds = previousTeamKey.split('-')
    previousPlayerIds.forEach(id => previousGamePlayers.add(id))
  }
}`)

console.log('\n4. 在選擇邏輯中優先未使用玩家 (約第473行後):')
console.log(`// 在第一輪內優先選擇未使用過的玩家
if (currentRound === 1 && gameNumber > 1) {
  const usedInRoundPlayers = new Set()
  // ... 收集已使用玩家邏輯
  eligiblePlayers = eligiblePlayers.filter(p => !usedInRoundPlayers.has(p.id))
}`)

console.log('\n🎯 預期效果:')
console.log('✅ 第一場和第二場會有不同的人員組合')
console.log('✅ 同一輪內的不同場次會儘量使用不同玩家')
console.log('✅ 保持現有的公平性和平衡機制')
console.log('✅ 每次運行會有微小的隨機變化')

console.log('\n📊 驗證方法:')
console.log('修正後，運行之前的測試檔案應該會看到:')
console.log('- 第一場和第二場有明顯的人員變化')
console.log('- 連續多次運行結果會有微小差異')
console.log('- 在8人2場地情況下，第二場應該儘量選擇第一場未上場的玩家')