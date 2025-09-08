import type { Participant, Court, GameAllocation } from "./app-context"

interface AllocationConstraints {
  maxSkillLevelDifference: number
  playersPerCourt: number
}

interface PlayerWithPriority extends Participant {
  priority: number // Lower number = higher priority to play
  rotationScore: number // 添加轮换评分
}

export class TeamAllocationAlgorithm {
  private constraints: AllocationConstraints = {
    maxSkillLevelDifference: 2,
    playersPerCourt: 4,
  }

  /**
   * 智能分队算法主函数（支持轮换）
   * @param participants 所有参与者
   * @param courts 可用场地
   * @param gameNumber 当前轮次
   * @returns 分队结果
   */
  public allocateTeams(participants: Participant[], courts: Court[], gameNumber: number): GameAllocation[] {
    const activeCourts = courts.filter((court) => court.isActive)

    if (participants.length === 0 || activeCourts.length === 0) {
      return []
    }

    const playersWithPriority = this.calculateRotationPriorities(participants, gameNumber)

    // 按轮换优先级和技能等级排序
    const sortedPlayers = this.sortPlayersByRotationAndSkill(playersWithPriority)

    // 执行分队
    const allocations = this.performAllocation(sortedPlayers, activeCourts, gameNumber)

    return allocations
  }

  /**
   * 计算参与者轮换优先级（替换原来的calculatePlayerPriorities）
   */
  private calculateRotationPriorities(participants: Participant[], currentRound: number): PlayerWithPriority[] {
    const minGamesPlayed = Math.min(...participants.map((p) => p.gamesPlayed))
    const maxLastPlayedRound = Math.max(...participants.map((p) => p.lastPlayedRound))

    return participants.map((participant) => {
      // 基础优先级：参与场次差距
      const gamesPriorityScore = participant.gamesPlayed - minGamesPlayed

      // 轮换优先级：距离上次参与的轮次数
      const roundsSinceLastPlayed = currentRound - participant.lastPlayedRound
      const rotationPriorityScore = maxLastPlayedRound > 0 ? -roundsSinceLastPlayed : 0

      // 手动调整的优先级
      const manualPriorityScore = participant.rotationPriority * 0.1

      // 综合轮换评分（越小优先级越高）
      const rotationScore = gamesPriorityScore + rotationPriorityScore + manualPriorityScore

      return {
        ...participant,
        priority: gamesPriorityScore, // 保持原有逻辑兼容性
        rotationScore,
      }
    })
  }

  /**
   * 按轮换优先级和技能等级排序参与者
   */
  private sortPlayersByRotationAndSkill(players: PlayerWithPriority[]): PlayerWithPriority[] {
    return players.sort((a, b) => {
      // 首先按轮换评分排序（轮换优先级）
      if (a.rotationScore !== b.rotationScore) {
        return a.rotationScore - b.rotationScore
      }
      // 然后按技能等级排序，便于后续匹配
      return a.skillLevel - b.skillLevel
    })
  }

  /**
   * 执行分队分配
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
        break // 剩余人数不足一个场地
      }

      const courtPlayers = this.selectPlayersForCourt(availablePlayers)

      if (courtPlayers.length === this.constraints.playersPerCourt) {
        // 从可用列表中移除已分配的参与者
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
   * 为单个场地选择参与者
   */
  private selectPlayersForCourt(availablePlayers: PlayerWithPriority[]): Participant[] {
    if (availablePlayers.length < this.constraints.playersPerCourt) {
      return []
    }

    const selectedPlayers: Participant[] = []
    const remainingPlayers = [...availablePlayers]

    // 选择第一个参与者（优先级最高的）
    const firstPlayer = remainingPlayers.shift()!
    selectedPlayers.push(firstPlayer)

    // 为剩余位置选择合适的参与者
    while (selectedPlayers.length < this.constraints.playersPerCourt && remainingPlayers.length > 0) {
      const nextPlayer = this.findBestMatchingPlayer(selectedPlayers, remainingPlayers)

      if (nextPlayer) {
        selectedPlayers.push(nextPlayer)
        const index = remainingPlayers.findIndex((p) => p.id === nextPlayer.id)
        remainingPlayers.splice(index, 1)
      } else {
        // 如果找不到合适的匹配，选择优先级最高的剩余参与者
        const fallbackPlayer = remainingPlayers.shift()!
        selectedPlayers.push(fallbackPlayer)
      }
    }

    return selectedPlayers.length === this.constraints.playersPerCourt ? selectedPlayers : []
  }

  /**
   * 找到最佳匹配的参与者
   */
  private findBestMatchingPlayer(
    selectedPlayers: Participant[],
    remainingPlayers: PlayerWithPriority[],
  ): Participant | null {
    const currentSkillLevels = selectedPlayers.map((p) => p.skillLevel)
    const minSkill = Math.min(...currentSkillLevels)
    const maxSkill = Math.max(...currentSkillLevels)

    // 寻找技能等级在允许范围内的参与者
    const suitablePlayers = remainingPlayers.filter((player) => {
      const wouldBeMinSkill = Math.min(minSkill, player.skillLevel)
      const wouldBeMaxSkill = Math.max(maxSkill, player.skillLevel)
      return wouldBeMaxSkill - wouldBeMinSkill <= this.constraints.maxSkillLevelDifference
    })

    if (suitablePlayers.length === 0) {
      return null
    }

    // 在合适的参与者中选择优先级最高的（参与场次最少的）
    return suitablePlayers.reduce((best, current) => (current.priority < best.priority ? current : best))
  }

  /**
   * 验证分队结果是否符合约束条件
   */
  public validateAllocation(allocation: GameAllocation): {
    isValid: boolean
    violations: string[]
  } {
    const violations: string[] = []

    // 检查人数
    if (allocation.players.length !== this.constraints.playersPerCourt) {
      violations.push(`场地人数不正确: ${allocation.players.length}/4`)
    }

    // 检查技能等级差距
    const skillLevels = allocation.players.map((p) => p.skillLevel)
    const minSkill = Math.min(...skillLevels)
    const maxSkill = Math.max(...skillLevels)
    const skillDifference = maxSkill - minSkill

    if (skillDifference > this.constraints.maxSkillLevelDifference) {
      violations.push(`技能等级差距过大: ${skillDifference} (最大允许: ${this.constraints.maxSkillLevelDifference})`)
    }

    return {
      isValid: violations.length === 0,
      violations,
    }
  }

  /**
   * 获取分队统计信息
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

    // 计算平衡分数（各场地平均技能等级的标准差，越小越平衡）
    const courtAverages = allocations.map((a) => a.averageSkillLevel)
    const overallAverage = courtAverages.reduce((sum, avg) => sum + avg, 0) / courtAverages.length
    const variance =
      courtAverages.reduce((sum, avg) => sum + Math.pow(avg - overallAverage, 2), 0) / courtAverages.length
    const balanceScore = Math.round((10 - Math.sqrt(variance)) * 10) / 10 // 10分制，分数越高越平衡

    return {
      totalPlayers,
      averageSkillLevel: Math.round(averageSkillLevel * 10) / 10,
      skillLevelDistribution,
      balanceScore: Math.max(0, balanceScore),
    }
  }

  /**
   * 预测下次轮换安排
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

    // 计算轮换优先级
    const playersWithPriority = this.calculateRotationPriorities(participants, currentRound + 1)
    const sortedPlayers = this.sortPlayersByRotationAndSkill(playersWithPriority)

    const nextUpPlayers = sortedPlayers.slice(0, maxPlayersPerRound)
    const waitingPlayers = sortedPlayers.slice(maxPlayersPerRound)

    // 估算等待轮次
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
   * 获取轮换统计信息
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

    // 公平性评分（10分制，差距越小分数越高）
    const fairnessScore = Math.max(0, 10 - maxGamesDifference * 2)

    // 平均等待时间（轮次）
    const averageWaitTime =
      participants.reduce((sum, p) => {
        return sum + (currentRound - p.lastPlayedRound)
      }, 0) / participants.length

    // 轮换效率（基于参与者分布的均匀程度）
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
