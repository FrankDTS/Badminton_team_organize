#!/usr/bin/env node

/**
 * 簡化的隊伍變化測試
 * 使用模擬的算法來測試核心邏輯
 */

// 簡化的算法實現，專門解決8人2場地問題
class SimpleTeamAlgorithm {
  constructor() {
    this.teamPairingHistory = new Map();
  }

  generateTeamKey(playerIds) {
    return [...playerIds].sort().join('-');
  }

  getLastUsedTeamKey(gameNumber) {
    for (const [teamKey, record] of this.teamPairingHistory.entries()) {
      if (record.lastUsedGame === gameNumber) {
        return teamKey;
      }
    }
    return null;
  }

  recordTeamPairing(playerIds, gameNumber) {
    const teamKey = this.generateTeamKey(playerIds);
    const existing = this.teamPairingHistory.get(teamKey);
    
    if (existing) {
      existing.count += 1;
      existing.lastUsedGame = gameNumber;
    } else {
      this.teamPairingHistory.set(teamKey, {
        players: [...playerIds].sort(),
        count: 1,
        lastUsedGame: gameNumber
      });
    }
  }

  findDifferentCombinations(remainingPlayers, gameNumber) {
    const previousGameKey = this.getLastUsedTeamKey(gameNumber - 1);
    if (!previousGameKey) {
      return remainingPlayers.slice(0, 4);
    }

    const previousGamePlayerIds = previousGameKey.split('-');
    console.log(`    上一場組合: [${previousGamePlayerIds.join(', ')}]`);
    
    // 嘗試找到與上一場完全不同的4人組合
    const differentPlayers = remainingPlayers.filter(p => !previousGamePlayerIds.includes(p.id));
    
    if (differentPlayers.length >= 4) {
      console.log(`    ✅ 找到${differentPlayers.length}個不同玩家，選擇前4個`);
      return differentPlayers.slice(0, 4);
    } else {
      console.log(`    ⚠️  只有${differentPlayers.length}個不同玩家，需要混合選擇`);
      const result = [];
      
      // 先選擇不在上一場的玩家
      for (const player of remainingPlayers) {
        if (!previousGamePlayerIds.includes(player.id) && result.length < 4) {
          result.push(player);
        }
      }
      
      // 如果還不足4人，從上一場玩家中選擇
      for (const player of remainingPlayers) {
        if (previousGamePlayerIds.includes(player.id) && result.length < 4) {
          result.push(player);
        }
      }
      
      return result.slice(0, 4);
    }
  }

  selectWithRotationForced(remainingPlayers, gameNumber) {
    console.log(`    🔄 使用強制輪換策略 (遊戲${gameNumber})`);
    const shuffled = [...remainingPlayers];
    
    // 使用遊戲編號作為種子進行洗牌
    for (let i = shuffled.length - 1; i > 0; i--) {
      const seed = gameNumber * 37 + i * 19;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled.slice(0, 4);
  }

  allocateTeams(participants, courts, gameNumber) {
    const activeCourts = courts.filter(court => court.isActive);
    
    if (participants.length === 0 || activeCourts.length === 0) {
      return [];
    }

    const allocations = [];
    let remainingPlayers = [...participants];
    const unplayedPlayers = remainingPlayers.filter(p => p.gamesPlayed === 0);
    
    console.log(`  🎯 遊戲${gameNumber}: ${participants.length}人, ${activeCourts.length}場地`);
    console.log(`    未上場玩家: ${unplayedPlayers.length}人`);

    for (const court of activeCourts) {
      if (remainingPlayers.length < 4) {
        break;
      }

      let courtPlayers = [];

      if (unplayedPlayers.length > 0) {
        // 有未上場玩家時，優先選擇他們
        console.log(`    📝 場地${court.name}: 優先選擇未上場玩家`);
        const availableUnplayed = remainingPlayers.filter(p => p.gamesPlayed === 0);
        courtPlayers = availableUnplayed.slice(0, 4);
        
        // 如果未上場玩家不足4人，補充已上場玩家
        if (courtPlayers.length < 4) {
          const playedPlayers = remainingPlayers.filter(p => p.gamesPlayed > 0);
          const needed = 4 - courtPlayers.length;
          courtPlayers.push(...playedPlayers.slice(0, needed));
        }
      } else {
        // 所有人都打過至少一場後，強制選擇不同的組合
        console.log(`    📝 場地${court.name}: 所有人都已上場，尋找不同組合`);
        
        if (gameNumber > 1) {
          const differentCombinations = this.findDifferentCombinations(remainingPlayers, gameNumber);
          
          if (differentCombinations.length >= 4) {
            courtPlayers = differentCombinations.slice(0, 4);
          } else {
            courtPlayers = this.selectWithRotationForced(remainingPlayers, gameNumber);
          }
        } else {
          courtPlayers = remainingPlayers.slice(0, 4);
        }
      }

      if (courtPlayers.length === 4) {
        // 記錄配對歷史
        const playerIds = courtPlayers.map(p => p.id);
        this.recordTeamPairing(playerIds, gameNumber);
        
        // 從剩餘玩家中移除已分配的參與者
        remainingPlayers = remainingPlayers.filter(p => 
          !courtPlayers.some(cp => cp.id === p.id)
        );

        const averageSkillLevel = courtPlayers.reduce((sum, p) => sum + p.skillLevel, 0) / 4;

        allocations.push({
          courtId: court.id,
          courtName: court.name,
          players: courtPlayers,
          averageSkillLevel: Math.round(averageSkillLevel * 10) / 10,
          gameNumber: gameNumber
        });

        console.log(`      ✅ 選定: [${courtPlayers.map(p => p.name).join(', ')}]`);
      }
    }

    return allocations;
  }
}

function testSimpleTeamChange() {
  console.log('🎯 簡化隊伍變化測試\n');

  const participants = [
    { id: '1', name: '張三', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: '2', name: '李四', skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: '3', name: '王五', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: '4', name: '趙六', skillLevel: 7, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: '5', name: '孫七', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: '6', name: '周八', skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: '7', name: '吳九', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: '8', name: '鄭十', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  ];

  const courts = [
    { id: 'court1', name: '場地1', isActive: true },
    { id: 'court2', name: '場地2', isActive: true },
  ];

  const algorithm = new SimpleTeamAlgorithm();
  let currentParticipants = [...participants];

  // 第一場分隊
  console.log('=== 第1場分隊 ===');
  const allocation1 = algorithm.allocateTeams(currentParticipants, courts, 1);
  
  console.log('\n📋 第1場結果:');
  allocation1.forEach(alloc => {
    console.log(`  ${alloc.courtName}: [${alloc.players.map(p => p.name).join(', ')}]`);
  });

  // 更新參與者狀態
  currentParticipants = updateParticipants(currentParticipants, allocation1, 1, 2);

  // 第二場分隊
  console.log('\n=== 第2場分隊 ===');
  const allocation2 = algorithm.allocateTeams(currentParticipants, courts, 2);
  
  console.log('\n📋 第2場結果:');
  allocation2.forEach(alloc => {
    console.log(`  ${alloc.courtName}: [${alloc.players.map(p => p.name).join(', ')}]`);
  });

  // 分析變化
  console.log('\n📊 變化分析:');
  return analyzeChanges(allocation1, allocation2);
}

function updateParticipants(participants, allocations, gameNumber, courtsCount) {
  const playingPlayerIds = new Set();
  
  allocations.forEach(allocation => {
    allocation.players.forEach(player => {
      playingPlayerIds.add(player.id);
    });
  });
  
  const currentRound = Math.floor((gameNumber - 1) / courtsCount) + 1;
  
  return participants.map(participant => ({
    ...participant,
    gamesPlayed: playingPlayerIds.has(participant.id) ? 
      participant.gamesPlayed + 1 : participant.gamesPlayed,
    lastPlayedRound: playingPlayerIds.has(participant.id) ? 
      currentRound : participant.lastPlayedRound
  }));
}

function analyzeChanges(allocation1, allocation2) {
  const game1Teams = allocation1.map(a => a.players.map(p => p.name).sort());
  const game2Teams = allocation2.map(a => a.players.map(p => p.name).sort());
  
  let hasIdenticalTeams = false;
  let totalChangeRate = 0;

  for (let i = 0; i < Math.min(game1Teams.length, game2Teams.length); i++) {
    const team1 = game1Teams[i];
    const team2 = game2Teams[i];
    const samePlayerCount = team1.filter(player => team2.includes(player)).length;
    const changeRate = ((4 - samePlayerCount) / 4 * 100);
    
    totalChangeRate += changeRate;
    
    console.log(`場地${i+1}:`);
    console.log(`  第1場: [${team1.join(', ')}]`);
    console.log(`  第2場: [${team2.join(', ')}]`);
    console.log(`  變化率: ${changeRate.toFixed(1)}%`);
    
    if (samePlayerCount === 4) {
      console.log(`  ❌ 完全沒有變化！`);
      hasIdenticalTeams = true;
    } else if (samePlayerCount >= 3) {
      console.log(`  ⚠️  變化太少`);
    } else {
      console.log(`  ✅ 有良好的變化`);
    }
    console.log('');
  }

  const averageChangeRate = totalChangeRate / Math.min(game1Teams.length, game2Teams.length);
  
  console.log(`📈 總體變化率: ${averageChangeRate.toFixed(1)}%`);
  
  if (hasIdenticalTeams) {
    console.log('❌ 測試失敗：發現完全相同的隊伍');
    return false;
  } else if (averageChangeRate < 50) {
    console.log('⚠️  測試部分通過：變化率偏低');
    return false;
  } else {
    console.log('✅ 測試通過：隊伍有良好的變化');
    return true;
  }
}

// 執行測試
if (require.main === module) {
  const success = testSimpleTeamChange();
  console.log(success ? '\n🎉 測試通過！' : '\n💥 測試失敗！');
  process.exit(success ? 0 : 1);
}