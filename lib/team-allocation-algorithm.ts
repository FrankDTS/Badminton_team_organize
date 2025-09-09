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
      const gamesCountDistribution = {}
      participants.forEach(p => {
        gamesCountDistribution[p.gamesPlayed] = (gamesCountDistribution[p.gamesPlayed] || 0) + 1
      })
      
      // 規則0：初期公平性 - 如果有人比最少場次多2場以上，降低其優先級
      if (participant.gamesPlayed > minGames + 1) {
        priorityScore += 10000 // 極低優先級
      }
      
      // 特別處理：如果有人還沒打過，且此玩家已打過，大幅降低優先級
      const hasUnplayedPlayers = participants.some(p => p.gamesPlayed === 0)
      if (hasUnplayedPlayers && participant.gamesPlayed >= 1) {
        priorityScore += 5000 // 很低優先級
      }
      
      // 規則1：場次少的玩家最優先（權重最高）
      priorityScore += participant.gamesPlayed * 1000
      
      // 規則2：等待時間長的玩家優先
      priorityScore -= waitingGames * 100
      
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
   * 檢查4個玩家是否已經配對超過2次
   */
  private hasPlayedTogetherTooMuch(playerIds: string[]): boolean {
    const teamKey = this.generateTeamKey(playerIds)
    const record = this.teamPairingHistory.get(teamKey)
    return record ? record.count >= 2 : false
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
      
      // 首先選擇優先級最高的玩家
      for (const player of sortedByPriority) {
        if (eligiblePlayers.length >= this.constraints.playersPerCourt) break
        
        // 計算選中此玩家後的場次差距
        const wouldBeGames = player.gamesPlayed + 1
        
        // 計算選中此玩家後，全體玩家的場次分佈
        const allSelectedPlayerIds = []
        for (const alloc of allocations) {
          allSelectedPlayerIds.push(...alloc.players.map(pl => pl.id))
        }
        allSelectedPlayerIds.push(...eligiblePlayers.map(p => p.id))
        allSelectedPlayerIds.push(player.id)
        
        const allGamesAfter = playersWithPriority.map(p => {
          return allSelectedPlayerIds.includes(p.id) ? p.gamesPlayed + 1 : p.gamesPlayed
        })
        
        const newMinGames = Math.min(...allGamesAfter)
        const newMaxGames = Math.max(...allGamesAfter)
        const newDifference = newMaxGames - newMinGames
        
        // 更寬鬆的差距控制：場次差距大時優先選場次少的，否則允許適當差距
        const maxAllowedDifference = currentGamesDifference >= 2 ? 2 : 3
        
        if (newDifference <= maxAllowedDifference || player.gamesPlayed === currentMinGames) {
          eligiblePlayers.push(player)
        }
      }
      
      // 如果仍不足4人，強制選擇優先級最高的玩家
      if (eligiblePlayers.length < this.constraints.playersPerCourt) {
        eligiblePlayers = sortedByPriority.slice(0, this.constraints.playersPerCourt)
      }
      
      // 最終排序：使用優先級分數
      eligiblePlayers.sort((a, b) => {
        return a.priorityScore - b.priorityScore
      })

      const courtPlayers = this.selectBestTeam(eligiblePlayers, gameNumber, courts.length)
      
      if (courtPlayers.length === this.constraints.playersPerCourt) {
        // 雙重驗證：再次檢查分配後全體玩家的場次差距
        const selectedPlayerIds = courtPlayers.map(p => p.id)
        
        // 計算所有已分配的玩家ID（包括之前的場地和當前場地）
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
          this.recordTeamPairing(playerIds, gameNumber)
          
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
  private recordTeamPairing(playerIds: string[], gameNumber: number): void {
    const teamKey = this.generateTeamKey(playerIds)
    const existing = this.teamPairingHistory.get(teamKey)
    
    if (existing) {
      existing.count += 1
      existing.lastUsedGame = gameNumber
    } else {
      this.teamPairingHistory.set(teamKey, {
        players: [...playerIds].sort(),
        count: 1,
        lastUsedGame: gameNumber
      })
    }
  }

  /**
   * 選擇最佳的4人組合
   */
  private selectBestTeam(eligiblePlayers: PlayerWithPriority[], gameNumber: number, courtsCount: number): Participant[] {
    if (eligiblePlayers.length < 4) {
      return []
    }
    
    // 計算當前輪次（基於場地數量）
    const currentRound = this.calculateRound(gameNumber, courtsCount)
    
    // 找出必須上場的玩家（第二輪未達到最低場次的）
    const mustPlayByRound2 = eligiblePlayers.filter(p => 
      currentRound >= 2 && p.gamesPlayed < this.constraints.minGamesInRound2
    )
    
    if (mustPlayByRound2.length >= 4) {
      // 如果第二輪規則的人數≥4，優先選擇他們
      return this.selectFromMustPlayPlayers(mustPlayByRound2)
    } else if (mustPlayByRound2.length > 0) {
      // 如果有部分人必須第二輪上場，確保他們都被包含
      return this.selectWithMustPlayPlayers(mustPlayByRound2, eligiblePlayers)
    }
    
    // 沒有特別的第二輪限制時，嘗試選擇更多樣化的組合
    return this.selectDiverseTeam(eligiblePlayers, gameNumber)
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
    
    // 嘗試不同的4人組合，選擇最佳的
    const maxCombinations = Math.min(100, this.getCombinations(eligiblePlayers.length, 4)) // 限制組合數量避免性能問題
    
    for (let attempt = 0; attempt < maxCombinations; attempt++) {
      const candidateTeam = this.selectCandidateTeam(eligiblePlayers, attempt)
      
      if (candidateTeam.length === 4) {
        const score = this.evaluateTeamScore(candidateTeam, gameNumber)
        
        if (score > bestScore) {
          bestScore = score
          bestTeam = candidateTeam
        }
      }
    }
    
    // 如果沒有找到好的組合，回到簡單策略
    if (bestTeam.length === 0) {
      return eligiblePlayers.slice(0, 4)
    }
    
    return bestTeam
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
  private selectCandidateTeam(eligiblePlayers: PlayerWithPriority[], attempt: number): PlayerWithPriority[] {
    // 根據attempt選擇不同的策略
    const strategies = [
      () => eligiblePlayers.slice(0, 4), // 前4名
      () => this.selectByGamesAndWaiting(eligiblePlayers), // 場次和等待時間平衡
      () => this.selectBySkillBalance(eligiblePlayers), // 技能平衡
      () => this.selectRandomly(eligiblePlayers), // 隨機選擇
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
   * 隨機選擇
   */
  private selectRandomly(eligiblePlayers: PlayerWithPriority[]): PlayerWithPriority[] {
    const shuffled = [...eligiblePlayers]
    
    // 簡單的洗牌算法
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
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