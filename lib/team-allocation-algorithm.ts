import type { Participant, Court, GameAllocation } from "./app-context"

interface AllocationConstraints {
  maxSkillLevelDifference: number
  playersPerCourt: number
}

interface PlayerWithPriority extends Participant {
  priority: number // Lower number = higher priority to play
  rotationScore: number // 添加輪換評分
}

export class TeamAllocationAlgorithm {
  private constraints: AllocationConstraints = {
    maxSkillLevelDifference: 2,
    playersPerCourt: 4,
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

    const playersWithPriority = this.calculateRotationPriorities(participants, gameNumber)

    // 按輪換優先級和技能等級排序
    const sortedPlayers = this.sortPlayersByRotationAndSkill(playersWithPriority)

    // 執行分隊
    const allocations = this.performAllocation(sortedPlayers, activeCourts, gameNumber)

    return allocations
  }

  /**
   * 計算參與者輪換優先級（替換原來的calculatePlayerPriorities）
   */
  private calculateRotationPriorities(participants: Participant[], currentRound: number): PlayerWithPriority[] {
    const minGamesPlayed = Math.min(...participants.map((p) => p.gamesPlayed))
    const maxLastPlayedRound = Math.max(...participants.map((p) => p.lastPlayedRound))

    return participants.map((participant) => {
      // 基础優先級：參與場次差距
      const gamesPriorityScore = participant.gamesPlayed - minGamesPlayed

      // 輪換優先級：距離上次參與的輪次數
      const roundsSinceLastPlayed = currentRound - participant.lastPlayedRound
      const rotationPriorityScore = maxLastPlayedRound > 0 ? -roundsSinceLastPlayed : 0

      // 手動調整的優先級
      const manualPriorityScore = participant.rotationPriority * 0.1

      // 綜合輪換評分（越小優先級越高）
      const rotationScore = gamesPriorityScore + rotationPriorityScore + manualPriorityScore

      return {
        ...participant,
        priority: gamesPriorityScore, // 保持原有邏輯相容性
        rotationScore,
      }
    })
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

    for (const court of courts) {
      if (availablePlayers.length < this.constraints.playersPerCourt) {
        break // 剩餘人數不足一個場地
      }

      const courtPlayers = this.selectPlayersForCourt(availablePlayers)

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
   * 為單個場地選擇參與者
   */
  private selectPlayersForCourt(availablePlayers: PlayerWithPriority[]): Participant[] {
    if (availablePlayers.length < this.constraints.playersPerCourt) {
      return []
    }

    const selectedPlayers: Participant[] = []
    const remainingPlayers = [...availablePlayers]

    // 選擇第一個參與者（優先級最高的）
    const firstPlayer = remainingPlayers.shift()!
    selectedPlayers.push(firstPlayer)

    // 為剩餘位置選擇合適的參與者
    while (selectedPlayers.length < this.constraints.playersPerCourt && remainingPlayers.length > 0) {
      const nextPlayer = this.findBestMatchingPlayer(selectedPlayers, remainingPlayers)

      if (nextPlayer) {
        selectedPlayers.push(nextPlayer)
        const index = remainingPlayers.findIndex((p) => p.id === nextPlayer.id)
        remainingPlayers.splice(index, 1)
      } else {
        // 如果找不到合適的匹配，選擇優先級最高的剩餘參與者
        const fallbackPlayer = remainingPlayers.shift()!
        selectedPlayers.push(fallbackPlayer)
      }
    }

    return selectedPlayers.length === this.constraints.playersPerCourt ? selectedPlayers : []
  }

  /**
   * 找到最佳匹配的參與者
   */
  private findBestMatchingPlayer(
    selectedPlayers: Participant[],
    remainingPlayers: PlayerWithPriority[],
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

    // 在合適的參與者中選擇優先級最高的（參與場次最少的）
    return suitablePlayers.reduce((best, current) => (current.priority < best.priority ? current : best))
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

    // 估算等待輪次
    const estimatedWaitRounds: { [participantId: string]: number } = {}
    waitingPlayers.forEach((player, index) => {
      const position = index + 1
      const roundsToWait = Math.ceil(position / maxPlayersPerRound)
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

    // 輪換效率（基於參與者分佈的均匀程度）
    const totalGames = gamesPlayed.reduce((sum, games) => sum + games, 0)
    const expectedGamesPerPlayer = totalGames / participants.length
    const variance =
      gamesPlayed.reduce((sum, games) => {
        return sum + Math.pow(games - expectedGamesPerPlayer, 2)
      }, 0) / participants.length
    const rotationEfficiency = Math.max(0, 10 - Math.sqrt(variance) * 2)

    return {
      fairnessScore: Math.round(fairnessScore * 10) / 10,
      maxGamesDifference,
      averageWaitTime: Math.round(averageWaitTime * 10) / 10,
      rotationEfficiency: Math.round(rotationEfficiency * 10) / 10,
    }
  }
}
