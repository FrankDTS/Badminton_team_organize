import type { Participant, Court, GameAllocation } from "./app-context"

interface AllocationConstraints {
  maxSkillLevelDifference: number
  playersPerCourt: number
  maxGamesDifference: number // 最大場次差異限制
  maxSkillGap: number // 技能等級最大落差限制（避免9級配2級）
}

interface PlayerWithPriority extends Participant {
  priority: number // 落後程度（正數表示落後場次）
  rotationScore: number // 綜合輪換評分
  expectedGames?: number // 理論應參與場次
  gamesBehind?: number // 落後場次數
  recentTeammates?: string[] // 最近合作過的隊友ID列表
}

export class TeamAllocationAlgorithm {
  private constraints: AllocationConstraints = {
    maxSkillLevelDifference: 2,
    playersPerCourt: 4,
    maxGamesDifference: 2, // 強制限制：場次差異不超過2場
    maxSkillGap: 5, // 技能等級最大落差：9級不配2級（7級差距）
  }

  /**
   * 智能分隊算法主函數（支持輪換）
   * @param participants 所有參與者
   * @param courts 可用場地
   * @param gameNumber 當前輪次
   * @returns 分隊結果
   */
  public allocateTeams(participants: Participant[], courts: Court[], gameNumber: number): GameAllocation[] {
    const activeCourts = courts.filter((court) => court.isActive)

    if (participants.length === 0 || activeCourts.length === 0) {
      return []
    }

    const playersWithPriority = this.calculateRotationPriorities(participants, gameNumber, activeCourts.length)

    // 按輪換優先級和技能等級排序
    const sortedPlayers = this.sortPlayersByRotationAndSkill(playersWithPriority)

    // 執行分隊
    const allocations = this.performAllocation(sortedPlayers, activeCourts, gameNumber)

    return allocations
  }

  /**
   * 計算參與者輪換優先級（嚴格公平輪換模式）
   */
  private calculateRotationPriorities(participants: Participant[], currentRound: number, numCourts: number): PlayerWithPriority[] {
    const totalParticipants = participants.length
    const playersPerRound = numCourts * this.constraints.playersPerCourt
    
    // 計算每個玩家在當前輪次應該參與的理論次數
    const expectedGamesPerPlayer = this.calculateExpectedGames(currentRound, totalParticipants, playersPerRound)
    
    return participants.map((participant) => {
      // 計算該玩家相對於理論值的落後程度
      const gamesBehind = expectedGamesPerPlayer - participant.gamesPlayed
      
      // 基礎優先級：嚴格按照落後程度排序（權重極大）
      const gamesPriorityScore = gamesBehind * 100
      
      // 輪換公平性：確保輪換順序公平
      const roundsSinceLastPlayed = currentRound - participant.lastPlayedRound
      const rotationBonus = roundsSinceLastPlayed * 10
      
      // 絕對禁止連續比賽（除非嚴重落後）
      const playedLastRound = participant.lastPlayedRound === (currentRound - 1)
      const severelyBehind = gamesBehind >= 2 // 落後2場以上才允許連續
      const consecutivePenalty = playedLastRound && !severelyBehind ? 1000 : 0 // 極重懲罰
      
      // 手動調整
      const manualPriorityScore = participant.rotationPriority * 1
      
      // 確保從未參與的玩家有最高優先級
      const neverPlayedBonus = participant.gamesPlayed === 0 ? -2000 : 0
      
      // 綜合評分（越小優先級越高）
      const rotationScore = -gamesPriorityScore + rotationBonus - consecutivePenalty + manualPriorityScore + neverPlayedBonus

      return {
        ...participant,
        priority: gamesBehind, // 清晰的落後程度
        rotationScore,
        expectedGames: expectedGamesPerPlayer,
        gamesBehind,
      }
    })
  }

  /**
   * 計算每個玩家在指定輪次應該參與的理論場次數
   */
  private calculateExpectedGames(currentRound: number, totalParticipants: number, playersPerRound: number): number {
    if (totalParticipants <= playersPerRound) {
      // 如果總人數不超過每輪能參與的人數，每個人每輪都能參與
      return currentRound - 1 // currentRound是下一輪，所以-1
    }
    
    // 計算總的參與機會數
    const totalGameOpportunities = (currentRound - 1) * playersPerRound
    
    // 理論上每個玩家應該參與的場次（向下取整確保公平）
    const baseGames = Math.floor(totalGameOpportunities / totalParticipants)
    
    // 計算剩餘的參與機會（需要分配給部分玩家的額外機會）
    const remainingOpportunities = totalGameOpportunities % totalParticipants
    
    // 在早期輪次中，我們更激進地確保每個人都有機會參與
    const earlyRoundBoost = currentRound <= 3 ? Math.min(1, Math.floor(totalGameOpportunities / totalParticipants)) : 0
    
    return Math.max(baseGames + earlyRoundBoost, 0)
  }

  /**
   * 按輪換優先級和技能等級排序參與者
   */
  private sortPlayersByRotationAndSkill(players: PlayerWithPriority[]): PlayerWithPriority[] {
    return players.sort((a, b) => {
      // 首先按輪換評分排序（輪換優先級）
      if (a.rotationScore !== b.rotationScore) {
        return a.rotationScore - b.rotationScore
      }
      // 然後按技能等級排序，便於後續匹配
      return a.skillLevel - b.skillLevel
    })
  }

  /**
   * 執行分隊分配
   */
  private performAllocation(
    sortedPlayers: PlayerWithPriority[],
    courts: Court[],
    gameNumber: number,
  ): GameAllocation[] {
    const allocations: GameAllocation[] = []
    const availablePlayers = [...sortedPlayers]

    // 先驗證並調整，防止連續比賽情況
    this.preventConsecutiveGames(availablePlayers, gameNumber, courts.length)

    // 強制執行場次差異約束
    this.enforceGamesDifferenceConstraint(availablePlayers)

    for (const court of courts) {
      if (availablePlayers.length < this.constraints.playersPerCourt) {
        break // 剩餘人數不足一個場地
      }

      const courtPlayers = this.selectPlayersForCourt(availablePlayers, courts.length)

      if (courtPlayers.length === this.constraints.playersPerCourt) {
        // 從可用列表中移除已分配的參與者
        courtPlayers.forEach((player) => {
          const index = availablePlayers.findIndex((p) => p.id === player.id)
          if (index > -1) {
            availablePlayers.splice(index, 1)
          }
        })

        const averageSkillLevel = courtPlayers.reduce((sum, p) => sum + p.skillLevel, 0) / courtPlayers.length

        allocations.push({
          courtId: court.id,
          courtName: court.name,
          players: courtPlayers,
          averageSkillLevel: Math.round(averageSkillLevel * 10) / 10,
          gameNumber,
        })
      }
    }

    return allocations
  }

  /**
   * 強制執行嚴格公平性約束
   */
  private enforceGamesDifferenceConstraint(players: PlayerWithPriority[]): void {
    // 按照落後程度重新強制排序
    players.sort((a, b) => {
      // 首先按落後場次排序（落後越多優先級越高）
      const gamesDiff = (b.gamesBehind || 0) - (a.gamesBehind || 0)
      if (gamesDiff !== 0) return gamesDiff
      
      // 然後按等待時間排序
      const waitDiff = b.lastPlayedRound - a.lastPlayedRound
      if (waitDiff !== 0) return waitDiff
      
      // 最後按技能等級排序（便於後續匹配）
      return a.skillLevel - b.skillLevel
    })
    
    // 對於嚴重偏離理論值的玩家進行強制調整
    players.forEach(player => {
      const gamesBehind = player.gamesBehind || 0
      
      if (gamesBehind >= 2) {
        // 嚴重落後的玩家獲得絕對優先級
        player.rotationScore = -10000 - gamesBehind * 1000
      } else if (gamesBehind <= -2) {
        // 嚴重超前的玩家獲得最低優先級
        player.rotationScore = 10000 + Math.abs(gamesBehind) * 1000
      }
    })
  }

  /**
   * 防止連續比賽的額外檢查和調整
   */
  private preventConsecutiveGames(players: PlayerWithPriority[], currentRound: number, numCourts: number): void {
    const averageGames = players.reduce((sum, p) => sum + p.gamesPlayed, 0) / players.length
    const catchUpThreshold = Math.max(1, Math.floor(numCourts / 2))
    
    // 對連續上場的玩家進行額外的優先級調整
    players.forEach(player => {
      const playedLastRound = player.lastPlayedRound === (currentRound - 1)
      const gamesBehind = averageGames - player.gamesPlayed
      
      if (playedLastRound && gamesBehind < catchUpThreshold) {
        // 如果上一輪參與且不急需追趕，進一步降低優先級
        player.rotationScore += 10 // 額外懲罰
      }
      
      // 如果等待時間過長，提高優先級
      const roundsSinceLastPlayed = currentRound - player.lastPlayedRound
      if (roundsSinceLastPlayed >= 3) {
        player.rotationScore -= 5 // 額外獎勵
      }
    })
    
    // 重新排序以反映調整後的優先級
    players.sort((a, b) => a.rotationScore - b.rotationScore)
  }

  /**
   * 為單個場地選擇參與者（嚴格公平模式）
   */
  private selectPlayersForCourt(availablePlayers: PlayerWithPriority[], numCourts: number): Participant[] {
    if (availablePlayers.length < this.constraints.playersPerCourt) {
      return []
    }

    const selectedPlayers: Participant[] = []
    const remainingPlayers = [...availablePlayers]

    // 第一優先級：必須參與的落後玩家（理論上應該參與但還沒參與的）
    const mustPlayPlayers = remainingPlayers.filter(p => (p.gamesBehind || 0) >= 1)
    
    if (mustPlayPlayers.length >= this.constraints.playersPerCourt) {
      // 如果落後玩家足夠組成整個場地，直接選擇他們
      return this.selectFromPriorityPool(mustPlayPlayers, this.constraints.playersPerCourt)
    }
    
    // 先選擇所有必須參與的落後玩家
    if (mustPlayPlayers.length > 0) {
      selectedPlayers.push(...mustPlayPlayers)
      mustPlayPlayers.forEach(player => {
        const index = remainingPlayers.findIndex(p => p.id === player.id)
        if (index > -1) remainingPlayers.splice(index, 1)
      })
    }

    // 第二優先級：過濾出沒有連續比賽違規的玩家（需要當前輪次信息）
    const nonConsecutivePlayers = remainingPlayers.filter(p => {
      // 檢查是否上一輪剛參與（這裡需要從外部傳入當前輪次，暫時使用rotationScore判斷）
      const playedLastRound = p.rotationScore > 1000 // 根據之前的連續比賽懲罰邏輯判斷
      const severelyBehind = (p.gamesBehind || 0) >= 2
      return !playedLastRound || severelyBehind
    })

    // 如果有足夠的非連續玩家，優先選擇他們
    const eligiblePlayers = nonConsecutivePlayers.length >= (this.constraints.playersPerCourt - selectedPlayers.length)
      ? nonConsecutivePlayers 
      : remainingPlayers

    // 按優先級排序（已經在外部排序過，但再次確保）
    eligiblePlayers.sort((a, b) => a.rotationScore - b.rotationScore)

    // 補足剩餘位置，優先考慮技能平衡
    while (selectedPlayers.length < this.constraints.playersPerCourt && eligiblePlayers.length > 0) {
      const nextPlayer = this.findBestMatchingPlayer(selectedPlayers, eligiblePlayers, numCourts)

      if (nextPlayer) {
        selectedPlayers.push(nextPlayer)
        const index = eligiblePlayers.findIndex((p) => p.id === nextPlayer.id)
        eligiblePlayers.splice(index, 1)
      } else {
        // 如果技能匹配失敗，直接選擇優先級最高的
        const fallbackPlayer = eligiblePlayers.shift()!
        selectedPlayers.push(fallbackPlayer)
      }
    }

    return selectedPlayers.length === this.constraints.playersPerCourt ? selectedPlayers : []
  }

  /**
   * 從優先級池中選擇參與者（考慮技能平衡）
   */
  private selectFromPriorityPool(players: PlayerWithPriority[], count: number): Participant[] {
    if (players.length < count) {
      return []
    }

    // 按優先級排序（落後程度和等待時間）
    players.sort((a, b) => a.rotationScore - b.rotationScore)

    const selected: Participant[] = []
    const remaining = [...players]

    // 選擇優先級最高的玩家
    selected.push(remaining.shift()!)

    // 為其他位置選擇技能匹配的玩家
    while (selected.length < count && remaining.length > 0) {
      const currentSkillLevels = selected.map(p => p.skillLevel)
      const minSkill = Math.min(...currentSkillLevels)
      const maxSkill = Math.max(...currentSkillLevels)

      // 尋找技能等級匹配的玩家
      let bestIndex = -1
      for (let i = 0; i < remaining.length; i++) {
        const player = remaining[i]
        const wouldBeMinSkill = Math.min(minSkill, player.skillLevel)
        const wouldBeMaxSkill = Math.max(maxSkill, player.skillLevel)
        
        if (wouldBeMaxSkill - wouldBeMinSkill <= this.constraints.maxSkillLevelDifference) {
          bestIndex = i
          break
        }
      }

      // 如果找到匹配的，選擇它；否則選擇優先級最高的
      const selectedIndex = bestIndex >= 0 ? bestIndex : 0
      selected.push(remaining.splice(selectedIndex, 1)[0])
    }

    return selected.length === count ? selected : []
  }

  /**
   * 從受約束的玩家池中選擇參與者（確保技能等級平衡）
   */
  private selectFromConstrainedPool(players: PlayerWithPriority[], count: number): Participant[] {
    if (players.length < count) {
      return []
    }

    // 按輪換優先級和技能等級排序
    players.sort((a, b) => {
      if (a.rotationScore !== b.rotationScore) {
        return a.rotationScore - b.rotationScore
      }
      return a.skillLevel - b.skillLevel
    })

    const selected: Participant[] = []
    const remaining = [...players]

    // 選擇第一個玩家
    selected.push(remaining.shift()!)

    // 為其他位置選擇技能等級匹配的玩家
    while (selected.length < count && remaining.length > 0) {
      const currentSkillLevels = selected.map(p => p.skillLevel)
      const minSkill = Math.min(...currentSkillLevels)
      const maxSkill = Math.max(...currentSkillLevels)

      // 尋找技能等級匹配的玩家
      let bestIndex = 0
      for (let i = 1; i < remaining.length; i++) {
        const player = remaining[i]
        const wouldBeMinSkill = Math.min(minSkill, player.skillLevel)
        const wouldBeMaxSkill = Math.max(maxSkill, player.skillLevel)
        
        if (wouldBeMaxSkill - wouldBeMinSkill <= this.constraints.maxSkillLevelDifference) {
          bestIndex = i
          break
        }
      }

      selected.push(remaining.splice(bestIndex, 1)[0])
    }

    return selected.length === count ? selected : []
  }

  /**
   * 找到最佳匹配的參與者
   */
  private findBestMatchingPlayer(
    selectedPlayers: Participant[],
    remainingPlayers: PlayerWithPriority[],
    numCourts: number,
  ): Participant | null {
    const currentSkillLevels = selectedPlayers.map((p) => p.skillLevel)
    const minSkill = Math.min(...currentSkillLevels)
    const maxSkill = Math.max(...currentSkillLevels)

    // 尋找技能等級在允許範圍內的參與者
    const suitablePlayers = remainingPlayers.filter((player) => {
      const wouldBeMinSkill = Math.min(minSkill, player.skillLevel)
      const wouldBeMaxSkill = Math.max(maxSkill, player.skillLevel)
      return wouldBeMaxSkill - wouldBeMinSkill <= this.constraints.maxSkillLevelDifference
    })

    if (suitablePlayers.length === 0) {
      return null
    }

    // 動態篩選：根據場地數量調整連續比賽容忍度
    const averageGames = remainingPlayers.reduce((sum, p) => sum + p.gamesPlayed, 0) / remainingPlayers.length
    const catchUpThreshold = Math.max(1, Math.floor(numCourts / 2))
    
    const nonConsecutiveSuitable = suitablePlayers.filter(player => {
      const gamesBehind = averageGames - player.gamesPlayed
      const needsUrgentCatchUp = gamesBehind >= catchUpThreshold
      const playedLastRound = player.rotationScore >= 15 // 根據新的懲罰分數判斷
      return !playedLastRound || needsUrgentCatchUp
    })

    // 強制優先選擇非連續玩家，只有在無可選擇時才考慮連續玩家
    const playersToConsider = nonConsecutiveSuitable.length > 0 ? nonConsecutiveSuitable : suitablePlayers

    // 在符合條件的參與者中選擇輪換評分最佳的（綜合優先級最高的）
    return playersToConsider.reduce((best, current) => (current.rotationScore < best.rotationScore ? current : best))
  }

  /**
   * 驗證分隊結果是否符合約束条件
   */
  public validateAllocation(allocation: GameAllocation): {
    isValid: boolean
    violations: string[]
  } {
    const violations: string[] = []

    // 檢查人數
    if (allocation.players.length !== this.constraints.playersPerCourt) {
      violations.push(`場地人數不正確: ${allocation.players.length}/4`)
    }

    // 檢查技能等級差距
    const skillLevels = allocation.players.map((p) => p.skillLevel)
    const minSkill = Math.min(...skillLevels)
    const maxSkill = Math.max(...skillLevels)
    const skillDifference = maxSkill - minSkill

    if (skillDifference > this.constraints.maxSkillLevelDifference) {
      violations.push(`技能等級差距過大: ${skillDifference} (最大允許: ${this.constraints.maxSkillLevelDifference})`)
    }

    return {
      isValid: violations.length === 0,
      violations,
    }
  }

  /**
   * 驗證所有參與者的場次差異約束
   */
  public validateGamesDifference(participants: Participant[]): {
    isValid: boolean
    maxDifference: number
    violations: string[]
  } {
    const violations: string[] = []
    const gamesPlayed = participants.map(p => p.gamesPlayed)
    const minGames = Math.min(...gamesPlayed)
    const maxGames = Math.max(...gamesPlayed)
    const maxDifference = maxGames - minGames

    if (maxDifference > this.constraints.maxGamesDifference) {
      violations.push(`場次差異過大: ${maxDifference} (最大允許: ${this.constraints.maxGamesDifference})`)
      
      const maxPlayersNames = participants
        .filter(p => p.gamesPlayed === maxGames)
        .map(p => p.name)
        .join(', ')
      
      const minPlayersNames = participants
        .filter(p => p.gamesPlayed === minGames)
        .map(p => p.name)
        .join(', ')

      violations.push(`最多場次(${maxGames}場): ${maxPlayersNames}`)
      violations.push(`最少場次(${minGames}場): ${minPlayersNames}`)
    }

    return {
      isValid: violations.length === 0,
      maxDifference,
      violations,
    }
  }

  /**
   * 獲取分隊統計信息
   */
  public getAllocationStats(allocations: GameAllocation[]): {
    totalPlayers: number
    averageSkillLevel: number
    skillLevelDistribution: { [key: number]: number }
    balanceScore: number
  } {
    const allPlayers = allocations.flatMap((a) => a.players)
    const totalPlayers = allPlayers.length

    if (totalPlayers === 0) {
      return {
        totalPlayers: 0,
        averageSkillLevel: 0,
        skillLevelDistribution: {},
        balanceScore: 0,
      }
    }

    const averageSkillLevel = allPlayers.reduce((sum, p) => sum + p.skillLevel, 0) / totalPlayers

    const skillLevelDistribution: { [key: number]: number } = {}
    allPlayers.forEach((player) => {
      skillLevelDistribution[player.skillLevel] = (skillLevelDistribution[player.skillLevel] || 0) + 1
    })

    // 計算平衡分數（各場地平均技能等級的標準差，越小越平衡）
    const courtAverages = allocations.map((a) => a.averageSkillLevel)
    const overallAverage = courtAverages.reduce((sum, avg) => sum + avg, 0) / courtAverages.length
    const variance =
      courtAverages.reduce((sum, avg) => sum + Math.pow(avg - overallAverage, 2), 0) / courtAverages.length
    const balanceScore = Math.round((10 - Math.sqrt(variance)) * 10) / 10 // 10分制，分數越高越平衡

    return {
      totalPlayers,
      averageSkillLevel: Math.round(averageSkillLevel * 10) / 10,
      skillLevelDistribution,
      balanceScore: Math.max(0, balanceScore),
    }
  }

  /**
   * 預測下次輪換安排
   */
  public predictNextRotation(
    participants: Participant[],
    courts: Court[],
    currentRound: number,
  ): {
    nextUpPlayers: Participant[]
    waitingPlayers: Participant[]
    estimatedWaitRounds: { [participantId: string]: number }
  } {
    const activeCourts = courts.filter((court) => court.isActive)
    const maxPlayersPerRound = activeCourts.length * this.constraints.playersPerCourt

    if (participants.length <= maxPlayersPerRound) {
      return {
        nextUpPlayers: participants,
        waitingPlayers: [],
        estimatedWaitRounds: {},
      }
    }

    // 計算輪換優先級
    const playersWithPriority = this.calculateRotationPriorities(participants, currentRound + 1)
    const sortedPlayers = this.sortPlayersByRotationAndSkill(playersWithPriority)

    const nextUpPlayers = sortedPlayers.slice(0, maxPlayersPerRound)
    const waitingPlayers = sortedPlayers.slice(maxPlayersPerRound)

    // 確保等待輪次不會超過場地數量 - 每個參與者最多等待場地數量的輪次
    const estimatedWaitRounds: { [participantId: string]: number } = {}
    const numCourts = activeCourts.length
    
    waitingPlayers.forEach((player, index) => {
      // 計算該參與者在隊列中的位置
      const position = index + 1
      
      // 計算在當前輪換週期中的位置
      const positionInCycle = ((position - 1) % maxPlayersPerRound) + 1
      
      // 等待輪次不應超過場地數量，確保輪換公平性
      const roundsToWait = Math.min(
        Math.ceil(positionInCycle / maxPlayersPerRound),
        numCourts
      )
      
      estimatedWaitRounds[player.id] = roundsToWait
    })

    return {
      nextUpPlayers,
      waitingPlayers,
      estimatedWaitRounds,
    }
  }

  /**
   * 獲取輪換統計信息
   */
  public getRotationStats(
    participants: Participant[],
    currentRound: number,
  ): {
    fairnessScore: number
    maxGamesDifference: number
    averageWaitTime: number
    rotationEfficiency: number
  } {
    if (participants.length === 0) {
      return {
        fairnessScore: 10,
        maxGamesDifference: 0,
        averageWaitTime: 0,
        rotationEfficiency: 10,
      }
    }

    const gamesPlayed = participants.map((p) => p.gamesPlayed)
    const minGames = Math.min(...gamesPlayed)
    const maxGames = Math.max(...gamesPlayed)
    const maxGamesDifference = maxGames - minGames

    // 公平性評分（10分制，差距越小分數越高）
    const fairnessScore = Math.max(0, 10 - maxGamesDifference * 2)

    // 平均等待時間（輪次）
    const averageWaitTime =
      participants.reduce((sum, p) => {
        return sum + (currentRound - p.lastPlayedRound)
      }, 0) / participants.length

    // 連續比賽次數統計（計算連續上場的參與者數量）
    const consecutiveGamesCount = participants.filter(p => p.lastPlayedRound === (currentRound - 1)).length
    const consecutiveGamesPenalty = Math.min(consecutiveGamesCount * 1.0, 5) // 加大懲罰，最多扣除5分

    // 輪換效率（基於參與者分佈的均匀程度和連續比賽情況）
    const totalGames = gamesPlayed.reduce((sum, games) => sum + games, 0)
    const expectedGamesPerPlayer = totalGames / participants.length
    const variance =
      gamesPlayed.reduce((sum, games) => {
        return sum + Math.pow(games - expectedGamesPerPlayer, 2)
      }, 0) / participants.length
    const rotationEfficiency = Math.max(0, 10 - Math.sqrt(variance) * 2 - consecutiveGamesPenalty)

    return {
      fairnessScore: Math.round(fairnessScore * 10) / 10,
      maxGamesDifference,
      averageWaitTime: Math.round(averageWaitTime * 10) / 10,
      rotationEfficiency: Math.round(rotationEfficiency * 10) / 10,
    }
  }

  /**
   * 獲取詳細統計信息（包含連續比賽防止情況）
   */
  public getDetailedStats(
    participants: Participant[],
    currentRound: number,
  ): {
    totalParticipants: number
    playingThisRound: number
    waitingThisRound: number
    consecutivePlayersCount: number
    needsCatchUpCount: number
    rotationHealthScore: number
  } {
    if (participants.length === 0) {
      return {
        totalParticipants: 0,
        playingThisRound: 0,
        waitingThisRound: 0,
        consecutivePlayersCount: 0,
        needsCatchUpCount: 0,
        rotationHealthScore: 10,
      }
    }

    const averageGamesPlayed = participants.reduce((sum, p) => sum + p.gamesPlayed, 0) / participants.length
    const consecutivePlayersCount = participants.filter(p => p.lastPlayedRound === (currentRound - 1)).length
    // 這裡需要場地數量信息，暫時使用保守估計
    const estimatedCourts = Math.max(1, Math.floor(participants.length / 8)) // 估計場地數量
    const catchUpThreshold = Math.max(1, Math.floor(estimatedCourts / 2))
    
    const needsCatchUpCount = participants.filter(p => {
      const gamesBehind = averageGamesPlayed - p.gamesPlayed
      return gamesBehind >= catchUpThreshold
    }).length

    const gamesPlayed = participants.map((p) => p.gamesPlayed)
    const minGames = Math.min(...gamesPlayed)
    const maxGames = Math.max(...gamesPlayed)
    const maxGamesDifference = maxGames - minGames

    // 輪換健康分數：綜合考慮公平性和連續比賽防止
    const fairnessPenalty = maxGamesDifference * 2.0 // 加大公平性權重
    const consecutivePenalty = (consecutivePlayersCount - needsCatchUpCount) * 1.2 // 加大連續比賽懲罰
    const rotationHealthScore = Math.max(0, 10 - fairnessPenalty - consecutivePenalty)

    return {
      totalParticipants: participants.length,
      playingThisRound: 0, // 這個需要在分配後才能確定
      waitingThisRound: 0, // 這個需要在分配後才能確定
      consecutivePlayersCount,
      needsCatchUpCount,
      rotationHealthScore: Math.round(rotationHealthScore * 10) / 10,
    }
  }
}
