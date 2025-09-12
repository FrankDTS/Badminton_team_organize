import type { Participant, Court, GameAllocation } from "./app-context"

interface AllocationConstraints {
  maxSkillLevelDifference: number // 兩隊技能等級總和最大差異
  playersPerCourt: number
  maxGamesDifference: number // 任何人之間的場次差距不能超過1
  minGamesInRound2: number // 第二輪時每個人至少要上場的次數
  enforceEveryTwoRoundsRule: boolean // 是否強制執行每兩輪都要上場的規則
}

interface PlayerWithPriority extends Participant {
  waitingGames: number // 已等待的遊戲次數
  canPlayThisGame: boolean // 本場是否可以上場
  partnerHistory: { [playerId: string]: number } // 與其他玩家配對次數歷史
  currentRound: number // 當前是第幾輪
  priorityScore: number // 優先級分數（越小優先級越高）
}

interface TeamPairingRecord {
  players: string[] // 4個玩家的ID，已排序
  count: number // 配對次數
  lastUsedGame?: number // 最後使用的場次
  lastUsedCourt?: string // 最後使用的場地ID
}

export class TeamAllocationAlgorithm {
  private constraints: AllocationConstraints = {
    maxSkillLevelDifference: 3, // 兩隊等級總合不能差異超過3級
    playersPerCourt: 4,
    maxGamesDifference: 1, // 場次差距不能超過1
    minGamesInRound2: 1, // 第二輪時每個人至少要上場1次
    enforceEveryTwoRoundsRule: true, // 強制執行每兩輪都要上場的規則
  }
  
  private teamPairingHistory: Map<string, TeamPairingRecord> = new Map() // 4人組合配對歷史
  private gamePlayerStats?: Map<string, any> // 場次參與者統計
  private totalGamesCount: number = 0 // 總場次計數器

  /**
   * 計算輪次 - 基於場地數量動態計算輪次
   * @param gameNumber 當前場次編號 (1-based)
   * @param courtsCount 場地數量
   * @returns 當前輪次 (1-based)
   */
  public calculateRound(gameNumber: number, courtsCount: number): number {
    if (gameNumber <= 0 || courtsCount <= 0) {
      throw new Error('場次編號和場地數量必須大於0')
    }
    return Math.floor((gameNumber - 1) / courtsCount) + 1
  }

  /**
   * 取得輪次範圍 - 給定輪次的場次範圍
   * @param round 輪次 (1-based)
   * @param courtsCount 場地數量
   * @returns 該輪次的場次範圍 {start, end}
   */
  public getRoundRange(round: number, courtsCount: number): { start: number, end: number } {
    if (round <= 0 || courtsCount <= 0) {
      throw new Error('輪次和場地數量必須大於0')
    }
    const start = (round - 1) * courtsCount + 1
    const end = round * courtsCount
    return { start, end }
  }

  /**
   * 規則2: 檢查所有人在每兩輪是否都有上場
   * @param participants 所有參與者
   * @param currentRound 當前輪次
   * @returns 驗證結果
   */
  public validateEveryTwoRoundsRule(participants: Participant[], currentRound: number): {
    isValid: boolean
    violations: string[]
    violatingPlayers: Participant[]
  } {
    const violations: string[] = []
    const violatingPlayers: Participant[] = []

    if (!this.constraints.enforceEveryTwoRoundsRule || currentRound < 2) {
      return { isValid: true, violations: [], violatingPlayers: [] }
    }

    // 檢查每兩輪規則：當前是第n輪時，檢查每個人在前n-1輪中是否至少上場過
    if (currentRound >= 2) {
      participants.forEach(participant => {
        const hasPlayedInRequiredRounds = participant.lastPlayedRound >= Math.max(1, currentRound - 1)
        
        if (!hasPlayedInRequiredRounds) {
          violations.push(`${participant.name} 在第${currentRound}輪前未符合每兩輪上場規則`)
          violatingPlayers.push(participant)
        }
      })
    }

    return {
      isValid: violations.length === 0,
      violations,
      violatingPlayers
    }
  }

  /**
   * 規則3: 檢查場次差距是否超過1
   * @param participants 所有參與者
   * @returns 驗證結果
   */
  public validateGamesDifferenceRule(participants: Participant[]): {
    isValid: boolean
    violations: string[]
    maxDifference: number
    minGames: number
    maxGames: number
  } {
    if (participants.length === 0) {
      return { isValid: true, violations: [], maxDifference: 0, minGames: 0, maxGames: 0 }
    }

    const gamesPlayed = participants.map(p => p.gamesPlayed)
    const minGames = Math.min(...gamesPlayed)
    const maxGames = Math.max(...gamesPlayed)
    const maxDifference = maxGames - minGames

    const violations: string[] = []
    
    if (maxDifference > this.constraints.maxGamesDifference) {
      violations.push(`場次差距過大: ${maxDifference} > ${this.constraints.maxGamesDifference}`)
      
      // 列出場次最多和最少的玩家
      const minPlayers = participants.filter(p => p.gamesPlayed === minGames)
      const maxPlayers = participants.filter(p => p.gamesPlayed === maxGames)
      
      violations.push(`最少場次 (${minGames}): ${minPlayers.map(p => p.name).join(', ')}`)
      violations.push(`最多場次 (${maxGames}): ${maxPlayers.map(p => p.name).join(', ')}`)
    }

    return {
      isValid: violations.length === 0,
      violations,
      maxDifference,
      minGames,
      maxGames
    }
  }

  /**
   * 智能分隊算法主函數
   * @param participants 所有參與者
   * @param courts 可用場地
   * @param gameNumber 當前場次編號
   * @returns 分隊結果
   */
  public allocateTeams(participants: Participant[], courts: Court[], gameNumber: number): GameAllocation[] {
    const activeCourts = courts.filter((court) => court.isActive)

    if (participants.length === 0 || activeCourts.length === 0) {
      return []
    }
    
    // 更新總場次計數器
    this.totalGamesCount = gameNumber

    const playersWithPriority = this.calculatePlayerPriorities(participants, gameNumber, activeCourts.length)

    // 執行分隊
    const allocations = this.performAllocation(playersWithPriority, activeCourts, gameNumber)

    return allocations
  }

  /**
   * 計算玩家優先級
   */
  private calculatePlayerPriorities(participants: Participant[], currentGame: number, courtsCount: number): PlayerWithPriority[] {
    // 計算當前是第幾輪（一輪 = 場地數量個場次）
    const currentRound = this.calculateRound(currentGame, courtsCount)
    
    // 全局場次分析
    const allGamesPlayed = participants.map(p => p.gamesPlayed)
    const minGames = Math.min(...allGamesPlayed)
    const maxGames = Math.max(...allGamesPlayed)
    const currentGamesDiff = maxGames - minGames
    
    return participants.map((participant) => {
      // 計算已等待場次數
      let waitingGames = 0
      if (participant.lastPlayedRound === 0) {
        // 從未上場，等待場次數等於當前場次減1
        waitingGames = Math.max(0, currentGame - 1)
      } else {
        // 計算上次上場是第幾場
        const lastPlayedGame = (participant.lastPlayedRound - 1) * courtsCount + 1
        waitingGames = Math.max(0, currentGame - lastPlayedGame - 1)
      }
      
      // 計算優先級分數（數字越小優先級越高）
      let priorityScore = 0
      
      // 檢查初期公平性（確保場次均勻分佈）
      const gamesCountDistribution: { [key: number]: number } = {}
      participants.forEach(p => {
        gamesCountDistribution[p.gamesPlayed] = (gamesCountDistribution[p.gamesPlayed] || 0) + 1
      })
      
      // 規則0：初期公平性 - 如果有人比最少場次多2場以上，降低其優先級
      if (participant.gamesPlayed > minGames + 1) {
        priorityScore += 10000 // 極低優先級
      }
      
      // 特別處理：在第一輪內確保輪換
      const hasUnplayedPlayers = participants.some(p => p.gamesPlayed === 0)
      if (hasUnplayedPlayers && participant.gamesPlayed >= 1) {
        // 在第一輪內，給予已參與者適度懲罰，但仍允許必要時參與
        if (currentRound === 1) {
          priorityScore += participant.gamesPlayed * 3000 // 第一輪內懲罰適中
        } else {
          priorityScore += participant.gamesPlayed * 5000 // 跨輪次懲罰較重
        }
      }
      
      // 規則1：場次少的玩家最優先（權重最高）
      priorityScore += participant.gamesPlayed * 1000
      
      // 規則2：等待時間長的玩家優先
      priorityScore -= waitingGames * 100
      
      // 規則2.5：強化避免連續上場的機制
      if (participant.lastPlayedRound > 0) {
        const roundsSinceLastPlay = currentRound - participant.lastPlayedRound
        if (roundsSinceLastPlay === 0) {
          // 剛剛才上場，大幅降低優先級避免連續上場
          priorityScore += 5000 // 大幅增強懲罰力度，幾乎排除連續上場可能性
        } else if (roundsSinceLastPlay === 1) {
          // 上一輪上場，也給予較重懲罰
          priorityScore += 1500 // 增強懲罰
        } else if (roundsSinceLastPlay >= 2) {
          // 已經等待很久，大幅提高優先級
          priorityScore -= 800 // 增強獎勵
        }
      }
      
      // 規則2.6：基於場次的輪換機制（確保2輪內所有人上場）
      if (currentRound <= 2 && participant.gamesPlayed === 0) {
        priorityScore -= 1000 // 前兩輪內未上場者優先級極高
      }
      
      // 規則3：第二輪規則加分
      const mustPlayByRound2 = currentRound >= 2 && participant.gamesPlayed < this.constraints.minGamesInRound2
      if (mustPlayByRound2) {
        priorityScore -= 500 // 很高的優先級
      }
      
      // 規則4：場次平衡加分
      const mustPlayForBalance = currentGamesDiff >= this.constraints.maxGamesDifference && 
                                 participant.gamesPlayed === minGames
      if (mustPlayForBalance) {
        priorityScore -= 300 // 高優先級
      }
      
      // 規則5：添加基於遊戲編號的輪換因子，確保隊伍變化
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
      }
      
      // 檢查是否可以本場上場（更寬鬆的條件）
      const canPlayThisGame = mustPlayByRound2 || mustPlayForBalance || 
                             (participant.gamesPlayed <= minGames + 1) // 允許稍微超過最少場次
      
      // 初始化配對歷史（如果不存在）
      const partnerHistory: { [playerId: string]: number } = {}
      
      return {
        ...participant,
        waitingGames,
        canPlayThisGame,
        partnerHistory,
        currentRound,
        priorityScore // 添加優先級分數
      }
    })
  }

  /**
   * 生成4人組合的唯一鍵
   */
  private generateTeamKey(playerIds: string[]): string {
    return [...playerIds].sort().join('-')
  }

  /**
   * 檢查玩家組合的偏好兼容性
   * @param players 要檢查的玩家陣列
   * @returns 偏好評分（越高越好，負數表示有避免偏好）
   */
  private calculatePreferenceScore(players: Participant[]): number {
    let score = 0
    
    // 檢查每對玩家之間的偏好設定
    for (let i = 0; i < players.length; i++) {
      const player1 = players[i]
      
      for (let j = i + 1; j < players.length; j++) {
        const player2 = players[j]
        
        // 檢查 player1 對 player2 的偏好
        const preference1 = player1.preferences.find(pref => pref.playerId === player2.id)
        if (preference1) {
          if (preference1.preference === 'preferred') {
            score += 10 // 偏好配對加分
          } else if (preference1.preference === 'avoided') {
            score -= 50 // 避免配對大幅扣分
          }
        }
        
        // 檢查 player2 對 player1 的偏好
        const preference2 = player2.preferences.find(pref => pref.playerId === player1.id)
        if (preference2) {
          if (preference2.preference === 'preferred') {
            score += 10 // 偏好配對加分
          } else if (preference2.preference === 'avoided') {
            score -= 50 // 避免配對大幅扣分
          }
        }
      }
    }
    
    return score
  }

  /**
   * 檢查玩家組合是否有嚴重的偏好衝突
   * @param players 要檢查的玩家陣列
   * @returns 如果有玩家明確避免與組合中其他玩家配對，返回 true
   */
  private hasPreferenceConflict(players: Participant[]): boolean {
    for (let i = 0; i < players.length; i++) {
      const player1 = players[i]
      
      for (let j = i + 1; j < players.length; j++) {
        const player2 = players[j]
        
        // 檢查是否有任一方明確避免與對方配對
        const hasAvoidance1 = player1.preferences.some(pref => 
          pref.playerId === player2.id && pref.preference === 'avoided'
        )
        const hasAvoidance2 = player2.preferences.some(pref => 
          pref.playerId === player1.id && pref.preference === 'avoided'
        )
        
        if (hasAvoidance1 || hasAvoidance2) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * 生成玩家組合（從 n 個玩家中選 k 個）
   * @param players 可選擇的玩家陣列
   * @param k 要選擇的玩家數量
   * @returns 所有可能的 k 個玩家組合，按偏好分數排序
   */
  private generateCombinations(players: PlayerWithPriority[], k: number): PlayerWithPriority[][] {
    if (k > players.length) return []
    if (k === 1) return players.map(p => [p])
    if (k === players.length) return [players]
    
    const combinations: PlayerWithPriority[][] = []
    
    // 限制組合數量以避免性能問題
    const maxCombinations = Math.min(100, this.getCombinationCount(players.length, k))
    
    const generate = (start: number, current: PlayerWithPriority[]) => {
      if (combinations.length >= maxCombinations) return
      
      if (current.length === k) {
        combinations.push([...current])
        return
      }
      
      for (let i = start; i < players.length && combinations.length < maxCombinations; i++) {
        current.push(players[i])
        generate(i + 1, current)
        current.pop()
      }
    }
    
    generate(0, [])
    
    // 按偏好分數和優先級分數排序
    return combinations.sort((a, b) => {
      const preferenceScoreA = this.calculatePreferenceScore(a)
      const preferenceScoreB = this.calculatePreferenceScore(b)
      
      if (preferenceScoreA !== preferenceScoreB) {
        return preferenceScoreB - preferenceScoreA // 偏好分數高的優先
      }
      
      // 偏好分數相同時，按優先級分數排序
      const priorityScoreA = a.reduce((sum, p) => sum + p.priorityScore, 0)
      const priorityScoreB = b.reduce((sum, p) => sum + p.priorityScore, 0)
      return priorityScoreA - priorityScoreB // 優先級分數低的優先
    })
  }

  /**
   * 計算組合數量 C(n,k)
   */
  private getCombinationCount(n: number, k: number): number {
    if (k > n) return 0
    if (k === 0 || k === n) return 1
    
    let result = 1
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1)
    }
    return Math.floor(result)
  }

  /**
   * 尋找與上一場不同的組合
   */
  private findDifferentCombinations(remainingPlayers: PlayerWithPriority[], gameNumber: number, courtsCount: number): PlayerWithPriority[] {
    // 獲取上一場的組合
    const previousGameKey = this.getLastUsedTeamKey(gameNumber - 1)
    if (!previousGameKey) {
      // 如果沒有上一場記錄，返回按優先級排序的玩家
      return [...remainingPlayers].sort((a, b) => a.priorityScore - b.priorityScore)
    }

    const previousGamePlayerIds = previousGameKey.split('-')
    
    // 嘗試找到與上一場完全不同的4人組合
    const differentPlayers = remainingPlayers.filter(p => !previousGamePlayerIds.includes(p.id))
    
    if (differentPlayers.length >= 4) {
      // 如果有足夠的不同玩家，選擇他們
      return differentPlayers
        .sort((a, b) => a.priorityScore - b.priorityScore)
        .slice(0, 4)
    } else {
      // 如果沒有足夠的完全不同玩家，至少確保有50%以上不同
      const sortedPlayers = [...remainingPlayers].sort((a, b) => a.priorityScore - b.priorityScore)
      const result = []
      
      // 先選擇不在上一場的玩家
      for (const player of sortedPlayers) {
        if (!previousGamePlayerIds.includes(player.id) && result.length < 4) {
          result.push(player)
        }
      }
      
      // 如果還不足4人，從上一場玩家中選擇
      for (const player of sortedPlayers) {
        if (previousGamePlayerIds.includes(player.id) && result.length < 4) {
          result.push(player)
        }
      }
      
      return result
    }
  }

  /**
   * 新增：強化的隊伍輪換選擇機制
   * 確保與同輪次和前一輪的隊伍組合都不相同，並考慮玩家偏好
   */
  private selectTeamWithEnhancedRotation(
    remainingPlayers: PlayerWithPriority[], 
    gameNumber: number, 
    courtsCount: number,
    sameRoundTeams: Set<string>,
    previousGamePlayers: Set<string>
  ): PlayerWithPriority[] {
    // 策略1：優先選擇在當前輪次還未上場的玩家，並考慮偏好
    const notInCurrentRound = remainingPlayers.filter(p => !previousGamePlayers.has(p.id))
    if (notInCurrentRound.length >= 4) {
      // 嘗試多種組合以找到最佳偏好匹配
      const combinations = this.generateCombinations(notInCurrentRound, 4)
      
      for (const combination of combinations) {
        const teamKey = this.generateTeamKey(combination.map(p => p.id))
        
        // 檢查是否已在同輪次使用過
        if (sameRoundTeams.has(teamKey)) continue
        
        // 檢查是否有嚴重偏好衝突
        if (this.hasPreferenceConflict(combination)) continue
        
        return combination.sort((a, b) => a.priorityScore - b.priorityScore)
      }
    }
    
    // 策略2：如果策略1失敗，使用多元化選擇並考慮偏好
    const maxAttempts = 20 // 增加嘗試次數以考慮偏好
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidates = this.selectWithVariation(remainingPlayers, gameNumber, attempt)
      if (candidates.length >= 4) {
        const team = candidates.slice(0, 4)
        const teamKey = this.generateTeamKey(team.map(p => p.id))
        
        // 檢查是否已在同輪次使用過
        if (sameRoundTeams.has(teamKey)) continue
        
        // 檢查偏好衝突，但在多次嘗試後放寬限制
        if (attempt < 15 && this.hasPreferenceConflict(team)) continue
        
        return team
      }
    }
    
    // 策略3：最後的備用方案 - 使用優先級排序但嘗試避免重複
    const sortedByPriority = [...remainingPlayers].sort((a, b) => a.priorityScore - b.priorityScore)
    
    // 嘗試不同的起始位置
    for (let offset = 0; offset < Math.min(4, sortedByPriority.length); offset++) {
      const candidates = []
      for (let i = 0; i < sortedByPriority.length && candidates.length < 4; i++) {
        const index = (offset + i) % sortedByPriority.length
        candidates.push(sortedByPriority[index])
      }
      
      if (candidates.length >= 4) {
        const teamKey = this.generateTeamKey(candidates.slice(0, 4).map(p => p.id))
        if (!sameRoundTeams.has(teamKey)) {
          return candidates.slice(0, 4)
        }
      }
    }
    
    // 如果所有嘗試都失敗，返回優先級最高的玩家
    return sortedByPriority.slice(0, 4)
  }
  
  /**
   * 新增：變化選擇策略
   */
  private selectWithVariation(players: PlayerWithPriority[], gameNumber: number, variation: number): PlayerWithPriority[] {
    const strategies = [
      // 策略1: 按優先級選擇
      () => players.sort((a, b) => a.priorityScore - b.priorityScore),
      // 策略2: 按等待時間選擇
      () => players.sort((a, b) => b.waitingGames - a.waitingGames),
      // 策略3: 按場次數選擇
      () => players.sort((a, b) => a.gamesPlayed - b.gamesPlayed),
      // 策略4: 基於遊戲編號的偽隨機選擇
      () => {
        const shuffled = [...players]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const seed = gameNumber * 37 + variation * 19 + i * 13
          const j = seed % (i + 1)
          ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
      }
    ]
    
    const strategy = strategies[variation % strategies.length]
    return strategy()
  }
  
  /**
   * 強制輪換選擇，確保與上一場不同 (保留原有功能以兼容性)
   */
  private selectWithRotationForced(remainingPlayers: PlayerWithPriority[], gameNumber: number): PlayerWithPriority[] {
    // 基於遊戲編號的偽隨機選擇，但確保與上一場不同
    const shuffled = [...remainingPlayers]
    
    // 使用遊戲編號作為種子進行洗牌
    for (let i = shuffled.length - 1; i > 0; i--) {
      const seed = gameNumber * 37 + i * 19  // 使用不同的乘數確保變化
      const j = seed % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return shuffled.slice(0, 4)
  }

  /**
   * 获取指定场次使用的队伍组合键
   */
  private getLastUsedTeamKey(gameNumber: number): string | null {
    for (const [teamKey, record] of this.teamPairingHistory.entries()) {
      if (record.lastUsedGame === gameNumber) {
        return teamKey
      }
    }
    return null
  }

  /**
   * 檢查4個玩家是否已經配對超過2次
   */
  private hasPlayedTogetherTooMuch(playerIds: string[]): boolean {
    const teamKey = this.generateTeamKey(playerIds)
    const record = this.teamPairingHistory.get(teamKey)
    return record ? record.count >= 2 : false
  }

  /**
   * 檢查同樣4個人是否在同一場地連續打兩場
   * 修正版：更嚴格的連續場地檢測，確保隊伍輪換
   * @param playerIds 玩家ID陣列
   * @param courtId 場地ID  
   * @param gameNumber 當前場次
   * @param courtsCount 場地總數
   * @returns 是否違反連續場地規則
   */
  public isConsecutiveSameTeamOnSameCourt(
    playerIds: string[], 
    courtId: string, 
    gameNumber: number, 
    courtsCount: number
  ): boolean {
    if (gameNumber <= 1) return false

    const teamKey = this.generateTeamKey(playerIds)
    const currentRound = this.calculateRound(gameNumber, courtsCount)
    
    // 檢查該團隊的使用記錄
    const record = this.teamPairingHistory.get(teamKey)
    
    if (record && record.lastUsedGame && record.lastUsedCourt) {
      const lastGameRound = this.calculateRound(record.lastUsedGame, courtsCount)
      
      // 強化檢查1：同一輪次內不能重複使用相同隊伍
      if (currentRound === lastGameRound) {
        return true // 同輪次內禁止相同隊伍
      }
      
      // 強化檢查2：連續場次檢查 (上一場 + 1 = 當前場)
      const isConsecutiveGame = (record.lastUsedGame + 1 === gameNumber)
      
      if (isConsecutiveGame) {
        // 檢查是否在同一場地 - 直接比較場地ID
        const isSameCourt = (record.lastUsedCourt === courtId)
        
        if (isSameCourt) return true
        
        // 檢查場地位置：如果場地在輪次中的位置相同，也算連續
        const currentCourtPosition = ((gameNumber - 1) % courtsCount)
        const lastGameCourtPosition = ((record.lastUsedGame - 1) % courtsCount)
        
        if (currentCourtPosition === lastGameCourtPosition) return true
      }
      
      // 強化檢查3：在少數玩家情況下，避免太快重複相同組合
      // 如果上一場剛使用過，且間隔場次不足，則避免重複
      const gamesSinceLastUse = gameNumber - record.lastUsedGame
      if (gamesSinceLastUse <= courtsCount) {
        return true // 間隔太短，避免重複
      }
    }
    
    return false
  }

  /**
   * 執行分隊分配
   */
  private performAllocation(
    playersWithPriority: PlayerWithPriority[],
    courts: Court[],
    gameNumber: number,
  ): GameAllocation[] {
    const allocations: GameAllocation[] = []
    
    // 每次分配前都重新計算場次差距，因為每分配一場都會改變狀況
    let remainingPlayers = [...playersWithPriority]
    
    for (const court of courts) {
      if (remainingPlayers.length < this.constraints.playersPerCourt) {
        break
      }

      // 重新計算當前剩餘玩家的場次差距
      const currentGamesPlayed = remainingPlayers.map(p => p.gamesPlayed)
      const currentMinGames = Math.min(...currentGamesPlayed)
      const currentMaxGames = Math.max(...currentGamesPlayed)
      const currentGamesDifference = currentMaxGames - currentMinGames
      
      // 智能控制：優先確保場次少的玩家能上場，適度控制場次差距
      let eligiblePlayers: PlayerWithPriority[]
      
      // 使用優先級分數排序（分數低的優先）
      const sortedByPriority = [...remainingPlayers].sort((a, b) => {
        return a.priorityScore - b.priorityScore
      })
      
      // 更簡化但更公平的選擇邏輯
      eligiblePlayers = []
      
      // 檢查是否有人從未上場過
      const unplayedPlayers = remainingPlayers.filter(p => p.gamesPlayed === 0)
      
      // 強化檢查上一場和同輪次的參賽者（避免連續上場和隊伍重複）  
      const previousGamePlayers = new Set<string>()
      const sameRoundTeams = new Set<string>()
      
      if (gameNumber > 1) {
        // 在同輪次內強制隊伍變化：檢查當前輪次所有已分配場次
        const currentRound = this.calculateRound(gameNumber, courts.length)
        const roundStart = (currentRound - 1) * courts.length + 1
        
        // 檢查當前輪次內所有已分配的場次
        for (let prevGameInRound = roundStart; prevGameInRound < gameNumber; prevGameInRound++) {
          const previousTeamKey = this.getLastUsedTeamKey(prevGameInRound)
          if (previousTeamKey) {
            const previousPlayerIds = previousTeamKey.split('-')
            previousPlayerIds.forEach(id => previousGamePlayers.add(id))
            sameRoundTeams.add(previousTeamKey) // 記錄同輪次已使用的隊伍組合
          }
        }
        
        // 額外檢查：避免與前一輪次相同的隊伍組合
        if (currentRound > 1) {
          const prevRoundStart = (currentRound - 2) * courts.length + 1
          const prevRoundEnd = (currentRound - 1) * courts.length
          
          for (let prevRoundGame = prevRoundStart; prevRoundGame <= prevRoundEnd; prevRoundGame++) {
            const prevRoundTeamKey = this.getLastUsedTeamKey(prevRoundGame)
            if (prevRoundTeamKey) {
              sameRoundTeams.add(prevRoundTeamKey) // 前一輪的隊伍也要避免立即重複
            }
          }
        }
      }
      
      // 強化的選擇策略：確保隊伍變化和輪換公平
      if (unplayedPlayers.length > 0) {
        // 有未上場玩家時，優先選擇他們
        eligiblePlayers = [...unplayedPlayers.sort((a, b) => a.priorityScore - b.priorityScore)]
        
        // 如果未上場玩家不足4人，從已上場玩家中補充
        if (eligiblePlayers.length < this.constraints.playersPerCourt) {
          // 優先選擇還未在當前輪次上場的玩家
          const availablePlayedPlayers = remainingPlayers
            .filter(p => p.gamesPlayed > 0)
            .filter(p => !previousGamePlayers.has(p.id))
            .sort((a, b) => a.priorityScore - b.priorityScore)
          
          for (const player of availablePlayedPlayers) {
            if (eligiblePlayers.length >= this.constraints.playersPerCourt) break
            eligiblePlayers.push(player)
          }
          
          // 最後才考慮當前輪次已上場的玩家（但要避免重複組合）
          if (eligiblePlayers.length < this.constraints.playersPerCourt) {
            const currentRoundPlayers = remainingPlayers
              .filter(p => previousGamePlayers.has(p.id))
              .sort((a, b) => a.gamesPlayed - b.gamesPlayed)
            
            for (const player of currentRoundPlayers) {
              if (eligiblePlayers.length >= this.constraints.playersPerCourt) break
              eligiblePlayers.push(player)
            }
          }
        }
      } else {
        // 所有人都打過至少一場後，強制確保隊伍輪換
        eligiblePlayers = this.selectTeamWithEnhancedRotation(
          remainingPlayers, 
          gameNumber, 
          courts.length,
          sameRoundTeams,
          previousGamePlayers
        )
      }
      
      // 確保我們有足夠的玩家
      if (eligiblePlayers.length < this.constraints.playersPerCourt) {
        // 如果合格玩家不足，從所有剩餘玩家中選擇
        eligiblePlayers = remainingPlayers.slice(0, this.constraints.playersPerCourt)
      }
      
      // 如果不足4人，強制選擇優先級最高的玩家補充
      if (eligiblePlayers.length < this.constraints.playersPerCourt) {
        eligiblePlayers = sortedByPriority.slice(0, this.constraints.playersPerCourt)
      }
      
      // 最終排序：使用優先級分數
      eligiblePlayers.sort((a, b) => {
        return a.priorityScore - b.priorityScore
      })

      // 嘗試多種組合，直到找到不違規的
      let courtPlayers: Participant[] = []
      let attempts = 0
      const maxAttempts = 10
      
      while (attempts < maxAttempts && courtPlayers.length === 0) {
        const candidatePlayers = this.selectBestTeam(eligiblePlayers, gameNumber, courts.length, attempts)
        
        if (candidatePlayers.length === this.constraints.playersPerCourt) {
          const selectedPlayerIds = candidatePlayers.map(p => p.id)
          
          // 檢查同樣4個人是否在同一場地連續打兩場
          const violatesConsecutiveRule = this.isConsecutiveSameTeamOnSameCourt(
            selectedPlayerIds, 
            court.id, 
            gameNumber, 
            courts.length
          )
          
          if (!violatesConsecutiveRule) {
            courtPlayers = candidatePlayers
          }
        }
        attempts++
      }
      
      if (courtPlayers.length === this.constraints.playersPerCourt) {
        const selectedPlayerIds = courtPlayers.map(p => p.id)
        
        // 雙重驗證：再次檢查分配後全體玩家的場次差距
        const allSelectedPlayerIds: string[] = []
        for (const alloc of allocations) {
          allSelectedPlayerIds.push(...alloc.players.map(p => p.id))
        }
        allSelectedPlayerIds.push(...selectedPlayerIds)
        
        const afterAllocation = playersWithPriority.map(p => ({
          ...p,
          gamesPlayed: allSelectedPlayerIds.includes(p.id) ? p.gamesPlayed + 1 : p.gamesPlayed
        }))
        
        const allGamesAfter = afterAllocation.map(p => p.gamesPlayed)
        const minGamesAfter = Math.min(...allGamesAfter)
        const maxGamesAfter = Math.max(...allGamesAfter)
        const gamesDiffAfter = maxGamesAfter - minGamesAfter
        
        // 適度控制場次差距，優先保證場次少的玩家能上場
        const acceptableDifference = Math.max(this.constraints.maxGamesDifference, 2) // 允許最大差距為2
        if (gamesDiffAfter <= acceptableDifference) {
          // 記錄配對歷史
          const playerIds = courtPlayers.map(p => p.id)
          this.recordTeamPairing(playerIds, gameNumber, court.id)
          
          // 從剩餘玩家列表中移除已分配的參與者
          remainingPlayers = remainingPlayers.filter(p => 
            !selectedPlayerIds.includes(p.id)
          )

          const averageSkillLevel = courtPlayers.reduce((sum, p) => sum + p.skillLevel, 0) / courtPlayers.length

          allocations.push({
            courtId: court.id,
            courtName: court.name,
            players: courtPlayers,
            averageSkillLevel: Math.round(averageSkillLevel * 10) / 10,
            gameNumber,
          })
        } else {
          // 如果會違反規則，跳過這個場地的分配
          break
        }
      }
    }

    return allocations
  }

  /**
   * 記錄4人組合配對歷史
   */
  private recordTeamPairing(playerIds: string[], gameNumber: number, courtId?: string): void {
    const teamKey = this.generateTeamKey(playerIds)
    const existing = this.teamPairingHistory.get(teamKey)
    
    if (existing) {
      existing.count += 1
      existing.lastUsedGame = gameNumber
      existing.lastUsedCourt = courtId
    } else {
      this.teamPairingHistory.set(teamKey, {
        players: [...playerIds].sort(),
        count: 1,
        lastUsedGame: gameNumber,
        lastUsedCourt: courtId
      })
    }
  }

  /**
   * 選擇最佳的4人組合
   */
  private selectBestTeam(eligiblePlayers: PlayerWithPriority[], gameNumber: number, courtsCount: number, attempt: number = 0): Participant[] {
    if (eligiblePlayers.length < 4) {
      return []
    }
    
    // 根據嘗試次數調整選擇邏輯
    const candidates = [...eligiblePlayers]
    
    // 使用嘗試次數來產生不同的組合
    const seed = gameNumber * 37 + attempt * 19 + Date.now() % 100
    
    // 洗牌算法，根據種子產生不同的排列
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = (seed * (i + 1) + attempt * 13) % (i + 1)
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    
    // 嘗試不同的起始點來產生多種組合
    const startIndex = attempt % Math.max(1, candidates.length - 3)
    const combo = []
    
    for (let i = 0; i < candidates.length && combo.length < 4; i++) {
      const index = (startIndex + i) % candidates.length
      if (!combo.includes(candidates[index])) {
        combo.push(candidates[index])
      }
    }
    
    return combo
  }

  /**
   * 從必須上場的玩家中選擇4人組合，加入變化避免重複
   */
  private selectFromMustPlayPlayersWithVariation(mustPlayPlayers: PlayerWithPriority[], gameNumber: number): Participant[] {
    if (mustPlayPlayers.length === 4) {
      return mustPlayPlayers
    }
    
    // 如果超過4人都必須上場，使用多種策略避免重複
    const strategies = [
      // 策略1: 按優先級分數排序
      () => mustPlayPlayers.sort((a, b) => a.priorityScore - b.priorityScore),
      // 策略2: 按等待時間排序
      () => mustPlayPlayers.sort((a, b) => b.waitingGames - a.waitingGames),
      // 策略3: 按技能等級分散度排序
      () => this.sortBySkillDispersion(mustPlayPlayers),
      // 策略4: 基於輪換優先級
      () => mustPlayPlayers.sort((a, b) => a.rotationPriority - b.rotationPriority)
    ]
    
    // 根據遊戲編號選擇不同的策略
    const strategyIndex = (gameNumber - 1) % strategies.length
    const sortedPlayers = strategies[strategyIndex]()
    
    return sortedPlayers.slice(0, 4)
  }

  /**
   * 按技能分散度排序，嘗試選擇技能分佈更均勻的組合
   */
  private sortBySkillDispersion(players: PlayerWithPriority[]): PlayerWithPriority[] {
    // 先按技能等級分組
    const skillGroups = new Map<number, PlayerWithPriority[]>()
    players.forEach(p => {
      if (!skillGroups.has(p.skillLevel)) {
        skillGroups.set(p.skillLevel, [])
      }
      skillGroups.get(p.skillLevel)!.push(p)
    })
    
    // 嘗試從不同技能等級選擇玩家
    const result: PlayerWithPriority[] = []
    const sortedSkillLevels = Array.from(skillGroups.keys()).sort()
    
    // 輪流從每個技能等級選擇玩家
    let skillIndex = 0
    while (result.length < players.length && result.length < 10) { // 防止無限循環
      const currentSkillLevel = sortedSkillLevels[skillIndex % sortedSkillLevels.length]
      const group = skillGroups.get(currentSkillLevel)!
      
      if (group.length > 0) {
        const player = group.shift()! // 取出第一個玩家
        result.push(player)
      }
      
      skillIndex++
    }
    
    return result
  }

  /**
   * 從必須上場的玩家中選擇4人組合
   */
  private selectFromMustPlayPlayers(mustPlayPlayers: PlayerWithPriority[]): Participant[] {
    if (mustPlayPlayers.length === 4) {
      return mustPlayPlayers
    }
    
    // 如果超過4人都必須上場，按優先級排序選擇前4人
    const sortedMustPlay = mustPlayPlayers.sort((a, b) => {
      // 第二輪規則優先級最高
      const aNeedsRound2 = a.currentRound >= 2 && a.gamesPlayed < this.constraints.minGamesInRound2
      const bNeedsRound2 = b.currentRound >= 2 && b.gamesPlayed < this.constraints.minGamesInRound2
      
      if (aNeedsRound2 && !bNeedsRound2) return -1
      if (!aNeedsRound2 && bNeedsRound2) return 1
      
      // 先按等待場次排序
      if (a.waitingGames !== b.waitingGames) {
        return b.waitingGames - a.waitingGames
      }
      // 再按參與場次排序
      if (a.gamesPlayed !== b.gamesPlayed) {
        return a.gamesPlayed - b.gamesPlayed
      }
      return 0
    })
    
    return sortedMustPlay.slice(0, 4)
  }

  /**
   * 選擇包含必須上場玩家的組合
   */
  private selectWithMustPlayPlayers(mustPlayPlayers: PlayerWithPriority[], allPlayers: PlayerWithPriority[]): Participant[] {
    const remainingSlots = 4 - mustPlayPlayers.length
    const otherPlayers = allPlayers.filter(p => !mustPlayPlayers.some(mp => mp.id === p.id))
    
    if (otherPlayers.length < remainingSlots) {
      // 不足4人，盡量組合
      return [...mustPlayPlayers, ...otherPlayers].slice(0, 4)
    }
    
    // 從其他玩家中選擇最佳組合補充
    const sortedOthers = otherPlayers.sort((a, b) => {
      // 優先選擇等待場次長的
      if (a.waitingGames !== b.waitingGames) {
        return b.waitingGames - a.waitingGames
      }
      // 再選擇參與場次少的
      if (a.gamesPlayed !== b.gamesPlayed) {
        return a.gamesPlayed - b.gamesPlayed
      }
      return 0
    })
    
    return [...mustPlayPlayers, ...sortedOthers.slice(0, remainingSlots)]
  }

  /**
   * 選擇多樣化的4人組合
   */
  private selectDiverseTeam(eligiblePlayers: PlayerWithPriority[], gameNumber: number): Participant[] {
    // 如果玩家數量剛好等於4，直接返回
    if (eligiblePlayers.length === 4) {
      return eligiblePlayers
    }
    
    let bestTeam: PlayerWithPriority[] = []
    let bestScore = -1
    
    // 嘗試不同的4人組合，選擇最佳的，但優先避免重複組合
    const maxCombinations = Math.min(20, this.getCombinations(eligiblePlayers.length, 4)) // 減少組合數量提高性能
    
    for (let attempt = 0; attempt < maxCombinations; attempt++) {
      const candidateTeam = this.selectCandidateTeam(eligiblePlayers, attempt, gameNumber)
      
      if (candidateTeam.length === 4) {
        const score = this.evaluateTeamScore(candidateTeam, gameNumber)
        
        // 檢查是否重複組合，如果是重複組合則扣分
        const playerIds = candidateTeam.map(p => p.id)
        const teamKey = this.generateTeamKey(playerIds)
        const record = this.teamPairingHistory.get(teamKey)
        
        let adjustedScore = score
        if (record && record.count > 0) {
          adjustedScore -= record.count * 100 // 重複組合扣分
        }
        
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore
          bestTeam = candidateTeam
        }
      }
    }
    
    // 如果沒有找到好的組合，使用基於遊戲編號的輪換策略
    if (bestTeam.length === 0) {
      return this.selectWithRotationStrategy(eligiblePlayers, gameNumber)
    }
    
    return bestTeam
  }
  
  /**
   * 基於輪換策略選擇玩家
   */
  private selectWithRotationStrategy(eligiblePlayers: PlayerWithPriority[], gameNumber: number): PlayerWithPriority[] {
    // 根據遊戲編號選擇不同的起始點，避免總是選擇相同的玩家
    const startIndex = (gameNumber - 1) % eligiblePlayers.length
    const rotatedPlayers = [
      ...eligiblePlayers.slice(startIndex),
      ...eligiblePlayers.slice(0, startIndex)
    ]
    
    return rotatedPlayers.slice(0, 4)
  }
  
  /**
   * 計算組合數量
   */
  private getCombinations(n: number, k: number): number {
    if (k > n) return 0
    if (k === 0 || k === n) return 1
    
    let result = 1
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1)
    }
    return Math.floor(result)
  }
  
  /**
   * 選擇候選團隊
   */
  private selectCandidateTeam(eligiblePlayers: PlayerWithPriority[], attempt: number, gameNumber: number = 1): PlayerWithPriority[] {
    // 根據attempt和gameNumber選擇不同的策略
    const strategies = [
      () => eligiblePlayers.slice(0, 4), // 前4名
      () => this.selectByGamesAndWaiting(eligiblePlayers), // 場次和等待時間平衡
      () => this.selectBySkillBalance(eligiblePlayers), // 技能平衡
      () => this.selectRandomly(eligiblePlayers, gameNumber), // 基於遊戲編號的偽隨機選擇
      () => this.selectWithRotationStrategy(eligiblePlayers, gameNumber), // 輪換策略
    ]
    
    const strategy = strategies[attempt % strategies.length]
    return strategy()
  }
  
  /**
   * 按場次和等待時間平衡選擇
   */
  private selectByGamesAndWaiting(eligiblePlayers: PlayerWithPriority[]): PlayerWithPriority[] {
    // 綜合考慮場次和等待時間
    const scored = eligiblePlayers.map(player => ({
      player,
      score: (player.waitingGames * 2) - player.gamesPlayed // 等待時間權重更高
    }))
    
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 4).map(s => s.player)
  }
  
  /**
   * 按技能平衡選擇
   */
  private selectBySkillBalance(eligiblePlayers: PlayerWithPriority[]): PlayerWithPriority[] {
    // 嘗試選擇技能等級分佈較均勻的組合
    const sortedBySkill = [...eligiblePlayers].sort((a, b) => a.skillLevel - b.skillLevel)
    
    // 嘗試選擇不同技能等級的玩家
    const selected: PlayerWithPriority[] = []
    const usedSkillLevels = new Set<number>()
    
    // 先選擇不同技能等級的玩家
    for (const player of sortedBySkill) {
      if (!usedSkillLevels.has(player.skillLevel) && selected.length < 4) {
        selected.push(player)
        usedSkillLevels.add(player.skillLevel)
      }
    }
    
    // 如果不足4人，補充剩餘的
    while (selected.length < 4 && selected.length < eligiblePlayers.length) {
      for (const player of eligiblePlayers) {
        if (!selected.includes(player) && selected.length < 4) {
          selected.push(player)
        }
      }
    }
    
    return selected
  }
  
  /**
   * 基於遊戲編號的偽隨機選擇
   */
  private selectRandomly(eligiblePlayers: PlayerWithPriority[], gameNumber: number = 1): PlayerWithPriority[] {
    const shuffled = [...eligiblePlayers]
    
    // 使用基於遊戲編號的偽隨機洗牌算法，確保相同輸入產生不同結果
    for (let i = shuffled.length - 1; i > 0; i--) {
      // 基於遊戲編號和索引生成偽隨機數
      const seed = gameNumber * 17 + i * 23
      const j = seed % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return shuffled.slice(0, 4)
  }
  
  /**
   * 評估團隊分數
   */
  private evaluateTeamScore(team: PlayerWithPriority[], gameNumber: number): number {
    let score = 0
    
    // 場次平衡分數（等待時間長的玩家優先）
    const totalWaiting = team.reduce((sum, p) => sum + p.waitingGames, 0)
    score += totalWaiting * 10
    
    // 場次均勻分數（場次少的玩家優先）
    const avgGames = team.reduce((sum, p) => sum + p.gamesPlayed, 0) / 4
    const gameVariance = team.reduce((sum, p) => sum + Math.pow(p.gamesPlayed - avgGames, 2), 0) / 4
    score += (10 - gameVariance) * 5 // 方差越小分數越高
    
    // 技能平衡分數
    const skillLevels = team.map(p => p.skillLevel)
    const avgSkill = skillLevels.reduce((sum, s) => sum + s, 0) / 4
    const skillVariance = skillLevels.reduce((sum, s) => sum + Math.pow(s - avgSkill, 2), 0) / 4
    score += (10 - skillVariance) * 3 // 技能分散度適中最好
    
    // 組合新穎度分數（避免重複組合）
    const playerIds = team.map(p => p.id)
    const teamKey = this.generateTeamKey(playerIds)
    const record = this.teamPairingHistory.get(teamKey)
    const repeatCount = record ? record.count : 0
    score -= repeatCount * 20 // 重複越多扣分越多
    
    return score
  }

  /**
   * 從場次平衡的玩家中選擇4人組合
   */
  private selectFromGameBalancedPlayers(gameBalancedPlayers: PlayerWithPriority[], mustPlayPlayers: PlayerWithPriority[]): Participant[] {
    // 確保必須上場的人被包含（如果他們也在場次平衡的範圍內）
    const validMustPlay = mustPlayPlayers.filter(mp => 
      gameBalancedPlayers.some(gbp => gbp.id === mp.id)
    )
    
    if (validMustPlay.length >= 4) {
      return this.selectFromMustPlayPlayers(validMustPlay)
    } else if (validMustPlay.length > 0) {
      return this.selectWithMustPlayPlayers(validMustPlay, gameBalancedPlayers)
    }
    
    // 沒有必須上場的限制時，從場次平衡的玩家中選擇最佳組合
    const sortedBalanced = gameBalancedPlayers.sort((a, b) => {
      // 按等待場次排序
      if (a.waitingGames !== b.waitingGames) {
        return b.waitingGames - a.waitingGames
      }
      // 按技能等級排序，方便配對
      return a.skillLevel - b.skillLevel
    })
    
    return sortedBalanced.slice(0, 4)
  }

  /**
   * 檢查4人組合是否有效
   */
  private isValidTeam(team: PlayerWithPriority[]): boolean {
    const playerIds = team.map(p => p.id)
    
    // 規則2: 同樣的4個人不能被配對超過2次
    if (this.hasPlayedTogetherTooMuch(playerIds)) {
      return false
    }
    
    // 規則3: 兩隊的等級總合不能差異超過3級
    // 嘗試三種配對方式找出最佳配對
    const pairings = [
      { team1: [0, 1], team2: [2, 3] }, // 前兩個vs後兩個
      { team1: [0, 2], team2: [1, 3] }, // 第1、3個vs第2、4個
      { team1: [0, 3], team2: [1, 2] }  // 第1、4個vs第2、3個
    ]
    
    for (const pairing of pairings) {
      const team1Sum = pairing.team1.reduce((sum, idx) => sum + team[idx].skillLevel, 0)
      const team2Sum = pairing.team2.reduce((sum, idx) => sum + team[idx].skillLevel, 0)
      
      if (Math.abs(team1Sum - team2Sum) <= this.constraints.maxSkillLevelDifference) {
        return true // 至少有一種配對方式符合約束
      }
    }
    
    return false // 所有配對方式都不符合約束
  }

  /**
   * 比較兩個團隊，返回true如果第一個團隊更好
   */
  private compareTeams(team1: PlayerWithPriority[], team2: PlayerWithPriority[]): boolean {
    // 計算場次差距影響
    const team1MaxGames = Math.max(...team1.map(p => p.gamesPlayed))
    const team1MinGames = Math.min(...team1.map(p => p.gamesPlayed))
    const team1GamesDiff = team1MaxGames - team1MinGames
    
    const team2MaxGames = Math.max(...team2.map(p => p.gamesPlayed))
    const team2MinGames = Math.min(...team2.map(p => p.gamesPlayed))
    const team2GamesDiff = team2MaxGames - team2MinGames
    
    // 優先選擇不會增加場次差距的團隊
    if (team1GamesDiff !== team2GamesDiff) {
      return team1GamesDiff < team2GamesDiff
    }
    
    // 其次選擇總參與場次更少的團隊（保持場次平衡）
    const team1TotalGames = team1.reduce((sum, p) => sum + p.gamesPlayed, 0)
    const team2TotalGames = team2.reduce((sum, p) => sum + p.gamesPlayed, 0)
    
    if (team1TotalGames !== team2TotalGames) {
      return team1TotalGames < team2TotalGames
    }
    
    // 再次選擇等待時間更長的團隊
    const team1TotalWaiting = team1.reduce((sum, p) => sum + p.waitingGames, 0)
    const team2TotalWaiting = team2.reduce((sum, p) => sum + p.waitingGames, 0)
    
    if (team1TotalWaiting !== team2TotalWaiting) {
      return team1TotalWaiting > team2TotalWaiting
    }
    
    // 最後選擇技能等級更平衡的團隊
    const team1SkillVariance = this.calculateSkillVariance(team1)
    const team2SkillVariance = this.calculateSkillVariance(team2)
    
    return team1SkillVariance < team2SkillVariance
  }

  /**
   * 計算團隊技能等級方差
   */
  private calculateSkillVariance(team: PlayerWithPriority[]): number {
    const skillLevels = team.map(p => p.skillLevel)
    const mean = skillLevels.reduce((sum, level) => sum + level, 0) / skillLevels.length
    const variance = skillLevels.reduce((sum, level) => sum + Math.pow(level - mean, 2), 0) / skillLevels.length
    return variance
  }

  /**
   * 簡單選擇策略 - 當約束太嚴格時的備用方案
   */
  private selectWithSimpleStrategy(eligiblePlayers: PlayerWithPriority[]): Participant[] {
    if (eligiblePlayers.length < 4) {
      return []
    }
    
    // 排序玩家：優先等待時間長的、場次少的
    const sortedPlayers = [...eligiblePlayers].sort((a, b) => {
      // 首先按等待輪數排序
      if (a.waitingGames !== b.waitingGames) {
        return b.waitingGames - a.waitingGames
      }
      // 然後按參與場次排序
      if (a.gamesPlayed !== b.gamesPlayed) {
        return a.gamesPlayed - b.gamesPlayed
      }
      return 0
    })
    
    // 選擇前4名，但嘗試避免技能差距過大
    const selected = []
    const remaining = [...sortedPlayers]
    
    // 選擇第一個玩家
    selected.push(remaining.shift()!)
    
    // 選擇剩下的3個玩家，考慮技能平衡
    while (selected.length < 4 && remaining.length > 0) {
      let bestIndex = 0
      let bestScore = -1
      
      for (let i = 0; i < remaining.length; i++) {
        const tempTeam = [...selected, remaining[i]]
        const skillLevels = tempTeam.map(p => p.skillLevel)
        const maxSkill = Math.max(...skillLevels)
        const minSkill = Math.min(...skillLevels)
        const skillRange = maxSkill - minSkill
        
        // 優先選擇技能範圍較小的組合，但也考慮等待時間
        const score = remaining[i].waitingGames * 10 - skillRange
        
        if (score > bestScore) {
          bestScore = score
          bestIndex = i
        }
      }
      
      selected.push(remaining.splice(bestIndex, 1)[0])
    }
    
    return selected
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

    // 檢查技能等級差距（這裡檢查4人中最大最小差距）
    const skillLevels = allocation.players.map((p) => p.skillLevel)
    const minSkill = Math.min(...skillLevels)
    const maxSkill = Math.max(...skillLevels)
    const skillDifference = maxSkill - minSkill

    if (skillDifference > 6) { // 允許較大的個人差距，因為我們主要關注隊伍平衡
      violations.push(`個人技能等級差距過大: ${skillDifference}級`)
    }

    return {
      isValid: violations.length === 0,
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
   * 獲取詳細的輪次分析報告
   */
  public getRoundAnalysis(
    participants: Participant[],
    currentRound: number,
    allocations: GameAllocation[]
  ): {
    playingPlayers: number
    waitingPlayers: number
    averageSkillBalance: number
    skillDistribution: { [courtId: string]: { min: number, max: number, avg: number } }
    repeatPairings: number
  } {
    const playingPlayerIds = new Set(allocations.flatMap(a => a.players.map(p => p.id)))
    const playingPlayers = playingPlayerIds.size
    const waitingPlayers = participants.length - playingPlayers
    
    // 計算技能平衡
    const skillBalances = allocations.map(allocation => {
      const skillLevels = allocation.players.map(p => p.skillLevel)
      const min = Math.min(...skillLevels)
      const max = Math.max(...skillLevels)
      const avg = skillLevels.reduce((sum, s) => sum + s, 0) / skillLevels.length
      
      return { min, max, avg, range: max - min }
    })
    
    const averageSkillBalance = skillBalances.reduce((sum, b) => sum + b.range, 0) / skillBalances.length
    
    const skillDistribution: { [courtId: string]: { min: number, max: number, avg: number } } = {}
    allocations.forEach((allocation, index) => {
      const balance = skillBalances[index] // 找對應的平衡數據
      if (balance) {
        skillDistribution[allocation.courtId] = {
          min: balance.min,
          max: balance.max,
          avg: Math.round(balance.avg * 10) / 10
        }
      }
    })
    
    // 檢查重複配對
    let repeatPairings = 0
    allocations.forEach(allocation => {
      const playerIds = allocation.players.map(p => p.id)
      const teamKey = this.generateTeamKey(playerIds)
      const record = this.teamPairingHistory.get(teamKey)
      if (record && record.lastUsedGame === (currentRound - 1)) {
        repeatPairings++
      }
    })
    
    return {
      playingPlayers,
      waitingPlayers,
      averageSkillBalance: Math.round(averageSkillBalance * 10) / 10,
      skillDistribution,
      repeatPairings
    }
  }
  
  /**
   * 重置算法狀態（新輪次開始時使用）
   */
  public resetForNewSession(): void {
    this.teamPairingHistory.clear()
    this.totalGamesCount = 0
    if (this.gamePlayerStats) {
      this.gamePlayerStats.clear()
    }
  }
  
  /**
   * 獲取算法配置
   */
  public getConstraints(): AllocationConstraints {
    return { ...this.constraints }
  }
  
  /**
   * 更新算法配置
   */
  public updateConstraints(newConstraints: Partial<AllocationConstraints>): void {
    this.constraints = { ...this.constraints, ...newConstraints }
  }
}