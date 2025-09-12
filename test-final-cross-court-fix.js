const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts')

console.log('🎯 最終驗證：跨場地連續使用修正效果')
console.log('專注測試算法是否真的阻止了連續使用')
console.log('='.repeat(60))

function testFinalFix() {
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
  let gameResults = []
  let allDetectedViolations = []

  console.log('\n🎮 進行3場分配測試:')
  console.log('-'.repeat(40))

  for (let game = 1; game <= 3; game++) {
    console.log(`\n第 ${game} 場分配:`)
    
    const allocations = algorithm.allocateTeams(participants, courts, game)
    
    if (allocations.length === 0) {
      console.log('  ❌ 無分配結果（被算法阻止）')
      gameResults.push({ game, allocations: [] })
      continue
    }

    let gameData = {
      game,
      allocations: allocations.map(allocation => ({
        courtId: allocation.courtId,
        courtName: allocation.courtName,
        playerIds: allocation.players.map(p => p.id).sort(),
        playerNames: allocation.players.map(p => p.name).join(''),
        teamKey: allocation.players.map(p => p.id).sort().join('-')
      }))
    }

    gameData.allocations.forEach(allocation => {
      console.log(`  ${allocation.courtName}: [${allocation.playerNames}] (${allocation.teamKey})`)
      
      // 直接調用算法的檢測函數
      const detected = algorithm.isConsecutiveSameTeamOnSameCourt(
        allocation.playerIds,
        allocation.courtId,
        game,
        courts.length
      )
      
      if (detected) {
        console.log(`    🔍 算法檢測: 這個分配應該被阻止！`)
        allDetectedViolations.push({
          game,
          court: allocation.courtName,
          team: allocation.playerNames,
          teamKey: allocation.teamKey
        })
      } else {
        console.log(`    ✅ 算法檢測: 通過`)
      }
    })

    gameResults.push(gameData)

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

  return { gameResults, allDetectedViolations }
}

function analyzeResults(gameResults) {
  console.log('\n🔍 結果分析:')
  console.log('-'.repeat(40))

  // 檢查每個場地的使用情況
  const courtUsage = new Map()

  gameResults.forEach(gameResult => {
    if (gameResult.allocations.length > 0) {
      gameResult.allocations.forEach(allocation => {
        if (!courtUsage.has(allocation.courtId)) {
          courtUsage.set(allocation.courtId, [])
        }
        courtUsage.get(allocation.courtId).push({
          game: gameResult.game,
          teamKey: allocation.teamKey,
          playerNames: allocation.playerNames
        })
      })
    }
  })

  let actualViolations = []

  // 分析每個場地的連續使用
  for (const [courtId, usage] of courtUsage.entries()) {
    const courtName = gameResults.find(gr => 
      gr.allocations.some(a => a.courtId === courtId)
    )?.allocations.find(a => a.courtId === courtId)?.courtName || courtId

    console.log(`\n${courtName} 使用記錄:`)
    
    usage.forEach((record, index) => {
      console.log(`  第${record.game}場: [${record.playerNames}] (${record.teamKey})`)
    })

    // 檢查實際的連續使用
    for (let i = 0; i < usage.length; i++) {
      for (let j = i + 1; j < usage.length; j++) {
        if (usage[i].teamKey === usage[j].teamKey) {
          actualViolations.push({
            court: courtName,
            games: [usage[i].game, usage[j].game],
            team: usage[i].playerNames,
            teamKey: usage[i].teamKey
          })
          console.log(`    ❌ 發現違規: 第${usage[i].game}場和第${usage[j].game}場都是[${usage[i].playerNames}]`)
        }
      }
    }

    if (actualViolations.filter(v => v.court === courtName).length === 0) {
      console.log(`    ✅ ${courtName}: 無連續使用問題`)
    }
  }

  return actualViolations
}

function testMultipleRuns() {
  console.log('\n🔄 多次運行測試:')
  console.log('-'.repeat(40))

  let totalViolations = 0
  let totalRuns = 5
  let successfulRuns = 0

  for (let run = 1; run <= totalRuns; run++) {
    console.log(`\n運行 ${run}:`)
    
    try {
      const { gameResults, allDetectedViolations } = testFinalFix()
      const actualViolations = analyzeResults(gameResults)
      
      console.log(`  算法檢測到的違規: ${allDetectedViolations.length}`)
      console.log(`  實際違規: ${actualViolations.length}`)
      
      if (actualViolations.length === 0) {
        successfulRuns++
        console.log(`  ✅ 運行 ${run}: 成功阻止連續使用`)
      } else {
        totalViolations += actualViolations.length
        console.log(`  ❌ 運行 ${run}: 仍有 ${actualViolations.length} 個違規`)
      }
    } catch (error) {
      console.log(`  ⚠️  運行 ${run}: 發生錯誤 - ${error.message}`)
    }
  }

  return { totalViolations, totalRuns, successfulRuns }
}

// 執行測試
console.log('🚀 開始最終驗證...')

const { gameResults, allDetectedViolations } = testFinalFix()
const actualViolations = analyzeResults(gameResults)
const multiRunResults = testMultipleRuns()

// 最終評估
console.log('\n' + '='.repeat(60))
console.log('🏁 最終修正效果評估')
console.log('='.repeat(60))

console.log(`\n📊 單次測試結果:`)
console.log(`  算法檢測到的潛在違規: ${allDetectedViolations.length}`)
console.log(`  實際發生的違規: ${actualViolations.length}`)

console.log(`\n📊 多次運行結果:`)
console.log(`  總運行次數: ${multiRunResults.totalRuns}`)
console.log(`  成功運行次數: ${multiRunResults.successfulRuns}`)
console.log(`  總違規次數: ${multiRunResults.totalViolations}`)
console.log(`  成功率: ${Math.round(multiRunResults.successfulRuns / multiRunResults.totalRuns * 100)}%`)

if (multiRunResults.successfulRuns === multiRunResults.totalRuns) {
  console.log(`\n🎉 修正完全成功！`)
  console.log(`✅ 算法已經能夠完全防止跨場地的連續使用`)
  console.log(`✅ 所有測試運行都沒有出現連續使用問題`)
  
  console.log(`\n🔧 修正要點總結:`)
  console.log(`1. 修正了 isConsecutiveSameTeamOnSameCourt 函數`)
  console.log(`2. 現在檢查團隊在特定場地的歷史使用記錄`)
  console.log(`3. 不論中間隔了多少場次，都能檢測到連續使用`)
  console.log(`4. 算法會自動跳過違規的分配組合`)
  
} else if (multiRunResults.successfulRuns > multiRunResults.totalRuns / 2) {
  console.log(`\n✅ 修正基本成功！`)
  console.log(`大部分情況下都能防止連續使用`)
  console.log(`成功率: ${Math.round(multiRunResults.successfulRuns / multiRunResults.totalRuns * 100)}%`)
  
} else {
  console.log(`\n⚠️  修正效果有限`)
  console.log(`還有改進空間，可能需要進一步調整`)
  
  if (actualViolations.length > 0) {
    console.log(`\n具體問題:`)
    actualViolations.forEach((violation, index) => {
      console.log(`  ${index + 1}. ${violation.court}: 第${violation.games.join('場、第')}場都是[${violation.team}]`)
    })
  }
}

console.log(`\n📝 使用建議:`)
console.log(`1. 修正後的算法能夠檢測跨場地的連續使用`)
console.log(`2. 在實際使用中，請注意觀察是否還有其他邊界情況`)
console.log(`3. 如果發現問題，可以進一步調整檢測邏輯`)
console.log(`4. 算法會自動處理，無需手動干預`)