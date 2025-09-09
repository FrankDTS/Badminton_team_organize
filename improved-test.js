// 改進的算法測試 - 加入配對歷史檢查

const CONSTRAINTS = {
  maxTeamSkillDifference: 2,
  maxPlayerSkillDifference: 4,
  playersPerCourt: 4,
}

// 全局配對歷史
const teamPairingHistory = new Map()

// 測試數據 - 增加更多人員來測試輪換
const participants = [
  { id: '1', name: 'Alice', skillLevel: 1, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: 'Bob', skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: 'Charlie', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: 'David', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '5', name: 'Eve', skillLevel: 1, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: 'Frank', skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '7', name: 'Grace', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '8', name: 'Henry', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '9', name: 'Ivy', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '10', name: 'Jack', skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '11', name: 'Kate', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '12', name: 'Leo', skillLevel: 1, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '13', name: 'Mike', skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '14', name: 'Nina', skillLevel: 3, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '15', name: 'Oscar', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
]

const courts = [
  { id: '1', name: '場地1', isActive: true },
  { id: '2', name: '場地2', isActive: true },
  { id: '3', name: '場地3', isActive: true },
]

function generateTeamKey(playerIds) {
  return [...playerIds].sort().join('-')
}

function hasPlayedTogetherLastRound(playerIds, currentRound) {
  const teamKey = generateTeamKey(playerIds)
  const record = teamPairingHistory.get(teamKey)
  return record && record.lastUsedRound === (currentRound - 1)
}

function recordTeamPairing(playerIds, gameNumber) {
  const teamKey = generateTeamKey(playerIds)
  teamPairingHistory.set(teamKey, {
    players: [...playerIds].sort(),
    lastUsedRound: gameNumber
  })
}

function fairAllocation(participants, courts, round) {
  const requiredPlayers = courts.length * CONSTRAINTS.playersPerCourt
  
  // 計算優先級
  const playersWithPriority = participants.map(p => {
    const waitingRounds = p.lastPlayedRound === 0 ? round : Math.max(0, round - p.lastPlayedRound - 1)
    let priority = waitingRounds * 10 - p.gamesPlayed * 2
    
    // 如果等待超過場地數量，給予額外優先級
    const maxWaitingRounds = Math.floor(participants.length / CONSTRAINTS.playersPerCourt)
    if (waitingRounds >= maxWaitingRounds) {
      priority += 50
    }
    
    return { ...p, waitingRounds, priority }
  })
  
  // 按優先級排序，但需要足夠多的人員來進行輪換
  playersWithPriority.sort((a, b) => b.priority - a.priority)
  
  // 選擇最佳分配
  const allocations = []
  const remainingPlayers = [...playersWithPriority]
  
  for (const court of courts) {
    if (remainingPlayers.length < 4) break
    
    // 選擇最佳4人組合（考慮配對歷史）
    const courtPlayers = selectBestTeamWithHistory(remainingPlayers, round)
    if (courtPlayers.length === 4) {
      // 從剩餘玩家中移除
      courtPlayers.forEach(player => {
        const index = remainingPlayers.findIndex(p => p.id === player.id)
        if (index > -1) remainingPlayers.splice(index, 1)
      })
      
      const avgSkill = courtPlayers.reduce((sum, p) => sum + p.skillLevel, 0) / 4
      allocations.push({
        courtId: court.id,
        courtName: court.name,
        players: courtPlayers,
        averageSkillLevel: Math.round(avgSkill * 10) / 10,
        gameNumber: round,
      })
      
      // 記錄配對歷史
      recordTeamPairing(courtPlayers.map(p => p.id), round)
    }
  }
  
  return allocations
}

function selectBestTeamWithHistory(players, currentRound) {
  if (players.length < 4) return []
  
  let bestTeam = []
  let bestScore = -1
  
  // 搜索最佳4人組合
  const searchLimit = Math.min(players.length, 16)
  
  for (let i = 0; i < searchLimit - 3; i++) {
    for (let j = i + 1; j < searchLimit - 2; j++) {
      for (let k = j + 1; k < searchLimit - 1; k++) {
        for (let l = k + 1; l < searchLimit; l++) {
          const team = [players[i], players[j], players[k], players[l]]
          const playerIds = team.map(p => p.id)
          
          // 檢查是否剛在上一輪配對過
          if (hasPlayedTogetherLastRound(playerIds, currentRound)) {
            continue
          }
          
          if (isSkillBalanced(team)) {
            const score = calculateTeamScore(team)
            if (score > bestScore) {
              bestScore = score
              bestTeam = team
            }
          }
        }
      }
    }
  }
  
  // 如果找不到沒有重複配對的組合，放寬條件選擇技能平衡的組合
  if (bestTeam.length === 0) {
    for (let i = 0; i < searchLimit - 3; i++) {
      for (let j = i + 1; j < searchLimit - 2; j++) {
        for (let k = j + 1; k < searchLimit - 1; k++) {
          for (let l = k + 1; l < searchLimit; l++) {
            const team = [players[i], players[j], players[k], players[l]]
            
            if (isSkillBalanced(team)) {
              const score = calculateTeamScore(team)
              if (score > bestScore) {
                bestScore = score
                bestTeam = team
              }
            }
          }
        }
      }
    }
  }
  
  // 最後的容錯機制：選擇優先級最高的4人
  if (bestTeam.length === 0) {
    bestTeam = players.slice(0, 4)
  }
  
  return bestTeam
}

function isSkillBalanced(team) {
  const skillLevels = team.map(p => p.skillLevel)
  const minSkill = Math.min(...skillLevels)
  const maxSkill = Math.max(...skillLevels)
  
  // 檢查個人技能差距
  if (maxSkill - minSkill > CONSTRAINTS.maxPlayerSkillDifference) {
    return false
  }
  
  // 檢查隊伍平衡（嘗試三種配對方式）
  const pairings = [
    { team1: [0, 1], team2: [2, 3] },
    { team1: [0, 2], team2: [1, 3] },
    { team1: [0, 3], team2: [1, 2] }
  ]
  
  for (const pairing of pairings) {
    const team1Sum = pairing.team1.reduce((sum, idx) => sum + skillLevels[idx], 0)
    const team2Sum = pairing.team2.reduce((sum, idx) => sum + skillLevels[idx], 0)
    
    if (Math.abs(team1Sum - team2Sum) <= CONSTRAINTS.maxTeamSkillDifference) {
      return true
    }
  }
  
  return false
}

function calculateTeamScore(team) {
  const totalWaiting = team.reduce((sum, p) => sum + p.waitingRounds, 0)
  const totalGames = team.reduce((sum, p) => sum + p.gamesPlayed, 0)
  return totalWaiting * 10 - totalGames * 2
}

function validateAllocation(allocation, round) {
  const violations = []
  
  // 檢查人數
  if (allocation.players.length !== 4) {
    violations.push(`場地人數不正確: ${allocation.players.length}/4`)
  }
  
  // 檢查技能平衡
  if (!isSkillBalanced(allocation.players)) {
    violations.push('技能不平衡')
  }
  
  // 檢查是否剛在上一輪配對過
  const playerIds = allocation.players.map(p => p.id)
  if (hasPlayedTogetherLastRound(playerIds, round)) {
    violations.push('剛在上一輪配對過')
  }
  
  return violations
}

function updatePlayerStats(participants, allocations, round) {
  const playingPlayerIds = new Set(allocations.flatMap(a => a.players.map(p => p.id)))
  
  participants.forEach(participant => {
    if (playingPlayerIds.has(participant.id)) {
      participant.gamesPlayed += 1
      participant.lastPlayedRound = round
    }
  })
}

// 執行測試
console.log('🏸 開始測試改進的分隊算法...\n')
console.log(`測試設定:`)
console.log(`- 參與者: ${participants.length} 人`)
console.log(`- 場地: ${courts.length} 個`)
console.log(`- 每輪上場: ${courts.length * 4} 人`)
console.log(`- 最大場地技能差: ${CONSTRAINTS.maxTeamSkillDifference}級`)
console.log(`- 最大個人技能差: ${CONSTRAINTS.maxPlayerSkillDifference}級`)

// 進行5輪測試
for (let round = 1; round <= 5; round++) {
  console.log(`\n=== 第${round}輪 ===`)
  
  const allocations = fairAllocation(participants, courts, round)
  
  // 驗證結果
  let hasViolations = false
  allocations.forEach(allocation => {
    const violations = validateAllocation(allocation, round)
    if (violations.length > 0) {
      console.log(`❌ ${allocation.courtName}: ${violations.join(', ')}`)
      hasViolations = true
    }
  })
  
  if (!hasViolations) {
    console.log('✅ 所有約束條件符合要求')
  }
  
  // 顯示分配結果
  allocations.forEach(allocation => {
    const players = allocation.players.map(p => `${p.name}(${p.skillLevel})`).join(', ')
    console.log(`${allocation.courtName}: ${players}`)
  })
  
  // 顯示等待玩家
  const playingPlayerIds = new Set(allocations.flatMap(a => a.players.map(p => p.id)))
  const waitingPlayers = participants.filter(p => !playingPlayerIds.has(p.id))
  
  if (waitingPlayers.length > 0) {
    const waiting = waitingPlayers.map(p => `${p.name}(${p.skillLevel})`).join(', ')
    console.log(`等待: ${waiting}`)
  }
  
  // 檢查公平性
  const totalPlaying = allocations.length * 4
  const fairnessRatio = (totalPlaying / participants.length) * 100
  console.log(`本輪公平性: ${totalPlaying}/${participants.length} = ${fairnessRatio.toFixed(1)}% 上場`)
  
  // 更新玩家狀態
  updatePlayerStats(participants, allocations, round)
}

// 最終統計
console.log('\n=== 最終統計 ===')
const finalGames = participants.map(p => p.gamesPlayed)
const minGames = Math.min(...finalGames)
const maxGames = Math.max(...finalGames)

console.log(`場次分佈: 最少 ${minGames} 場，最多 ${maxGames} 場，差距 ${maxGames - minGames} 場`)

participants.forEach(p => {
  console.log(`${p.name}: ${p.gamesPlayed} 場 (等級 ${p.skillLevel})`)
})

if (maxGames - minGames <= 1) {
  console.log('✅ 最終公平性測試通過！')
} else {
  console.log('❌ 最終公平性測試失敗！')
}

// 檢查等待時間
const maxWaitingRounds = Math.floor(participants.length / (courts.length * 4))
console.log(`\n=== 等待時間分析 ===`)
console.log(`場地數量: ${courts.length}, 理論最大等待輪數: ${maxWaitingRounds}`)

let waitingViolations = 0
participants.forEach(p => {
  const waitingRounds = p.lastPlayedRound === 0 ? 5 : Math.max(0, 5 - p.lastPlayedRound - 1)
  if (waitingRounds > maxWaitingRounds) {
    console.log(`❌ ${p.name} 等待 ${waitingRounds} 輪，超過限制 ${maxWaitingRounds}`)
    waitingViolations++
  }
})

if (waitingViolations === 0) {
  console.log('✅ 等待時間符合要求')
}

console.log('\n🎉 測試完成！')