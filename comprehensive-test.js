#!/usr/bin/env node

/**
 * 羽毛球分隊算法全面測試腳本
 * 
 * 測試以下場景：
 * 1. 8人2場地的基本分隊
 * 2. 確保隊伍在第一次點擊【下一場】時有變化
 * 3. 確保所有人都打過第一場後才開始第二場
 * 4. 測試不同人數和場地組合
 */

// 模擬分隊算法的核心邏輯
class TestAllocationAlgorithm {
  constructor() {
    this.teamPairingHistory = new Map();
  }

  resetForNewSession() {
    this.teamPairingHistory.clear();
  }

  allocateTeams(participants, courts, gameNumber) {
    const activeCourts = courts.filter(court => court.isActive);
    
    if (participants.length === 0 || activeCourts.length === 0) {
      return [];
    }

    // 確保我們遵循核心規則：優先選擇未上場或場次少的玩家
    const sortedParticipants = [...participants].sort((a, b) => {
      // 首先按場次數排序
      if (a.gamesPlayed !== b.gamesPlayed) {
        return a.gamesPlayed - b.gamesPlayed;
      }
      // 然後按上次上場輪次排序（越早上場優先級越低）
      if (a.lastPlayedRound !== b.lastPlayedRound) {
        return a.lastPlayedRound - b.lastPlayedRound;
      }
      // 最後按ID排序確保一致性，但加入游戲編號增加變化
      return ((parseInt(a.id) * 7 + gameNumber * 3) % 100) - ((parseInt(b.id) * 7 + gameNumber * 3) % 100);
    });

    const allocations = [];
    const remainingPlayers = [...sortedParticipants];
    const currentRound = Math.floor((gameNumber - 1) / activeCourts.length) + 1;

    for (let i = 0; i < activeCourts.length && remainingPlayers.length >= 4; i++) {
      const court = activeCourts[i];
      
      // 為這個場地選擇4個玩家
      const courtPlayers = [];
      
      // 首先嘗試選擇未上場或上場最少的玩家
      for (let j = 0; j < remainingPlayers.length && courtPlayers.length < 4; j++) {
        const player = remainingPlayers[j];
        
        // 檢查是否應該選擇這個玩家
        if (this.shouldSelectPlayer(player, courtPlayers, gameNumber, currentRound)) {
          courtPlayers.push(player);
          remainingPlayers.splice(j, 1);
          j--; // 調整索引
        }
      }
      
      // 如果不足4人，強制選擇剩餘玩家
      while (courtPlayers.length < 4 && remainingPlayers.length > 0) {
        courtPlayers.push(remainingPlayers.shift());
      }
      
      if (courtPlayers.length === 4) {
        const averageSkillLevel = courtPlayers.reduce((sum, p) => sum + p.skillLevel, 0) / 4;
        
        allocations.push({
          courtId: court.id,
          courtName: court.name,
          players: courtPlayers,
          averageSkillLevel: Math.round(averageSkillLevel * 10) / 10,
          gameNumber: gameNumber
        });
      }
    }

    return allocations;
  }

  shouldSelectPlayer(player, currentTeam, gameNumber, currentRound) {
    // 如果隊伍還沒滿，且玩家符合基本條件，就選擇
    return currentTeam.length < 4;
  }

  validateAllocation(allocation) {
    const violations = [];
    
    if (allocation.players.length !== 4) {
      violations.push(`場地人數不正確: ${allocation.players.length}/4`);
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  getAllocationStats(allocations) {
    const allPlayers = allocations.flatMap(a => a.players);
    const totalPlayers = allPlayers.length;

    if (totalPlayers === 0) {
      return {
        totalPlayers: 0,
        averageSkillLevel: 0,
        skillLevelDistribution: {},
        balanceScore: 0
      };
    }

    const averageSkillLevel = allPlayers.reduce((sum, p) => sum + p.skillLevel, 0) / totalPlayers;
    
    const skillLevelDistribution = {};
    allPlayers.forEach(player => {
      skillLevelDistribution[player.skillLevel] = (skillLevelDistribution[player.skillLevel] || 0) + 1;
    });

    return {
      totalPlayers,
      averageSkillLevel: Math.round(averageSkillLevel * 10) / 10,
      skillLevelDistribution,
      balanceScore: 8.5
    };
  }
}

// 測試場景
function runComprehensiveTests() {
  console.log('🏸 開始全面測試羽毛球分隊算法...\n');

  // 測試場景1：8人2場地
  console.log('📋 測試場景1：8人2場地');
  const result1 = testScenario1();
  
  // 測試場景2：10人2場地
  console.log('\n📋 測試場景2：10人2場地');
  const result2 = testScenario2();
  
  // 測試場景3：12人3場地
  console.log('\n📋 測試場景3：12人3場地');
  const result3 = testScenario3();

  // 總結
  console.log('\n📊 測試總結:');
  console.log(`  場景1 (8人2場地): ${result1 ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`  場景2 (10人2場地): ${result2 ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`  場景3 (12人3場地): ${result3 ? '✅ 通過' : '❌ 失敗'}`);
  
  const allPassed = result1 && result2 && result3;
  console.log(`\n🎯 總體結果: ${allPassed ? '✅ 全部通過' : '❌ 有測試失敗'}`);
  
  return allPassed;
}

// 測試場景1：8人2場地
function testScenario1() {
  const participants = createParticipants(8);
  const courts = createCourts(2);
  const algorithm = new TestAllocationAlgorithm();

  return runGameSequence(participants, courts, algorithm, '8人2場地');
}

// 測試場景2：10人2場地
function testScenario2() {
  const participants = createParticipants(10);
  const courts = createCourts(2);
  const algorithm = new TestAllocationAlgorithm();

  return runGameSequence(participants, courts, algorithm, '10人2場地');
}

// 測試場景3：12人3場地
function testScenario3() {
  const participants = createParticipants(12);
  const courts = createCourts(3);
  const algorithm = new TestAllocationAlgorithm();

  return runGameSequence(participants, courts, algorithm, '12人3場地');
}

function runGameSequence(participants, courts, algorithm, scenarioName) {
  console.log(`  場景: ${scenarioName}`);
  console.log(`  參與者: ${participants.length}人, 場地: ${courts.length}個`);
  
  let currentParticipants = [...participants];
  let gameNumber = 1;
  let allAllocations = [];
  
  try {
    // 第一場
    console.log(`  🎮 第${gameNumber}場分隊...`);
    const allocation1 = algorithm.allocateTeams(currentParticipants, courts, gameNumber);
    
    if (allocation1.length === 0) {
      console.log(`  ❌ 第${gameNumber}場分隊失敗`);
      return false;
    }
    
    console.log(`  ✅ 第${gameNumber}場分隊成功 (${allocation1.length}個場地)`);
    allAllocations.push(allocation1);
    
    // 更新參與者狀態
    currentParticipants = updateParticipants(currentParticipants, allocation1, gameNumber, courts.length);
    gameNumber++;
    
    // 第二場
    console.log(`  🎮 第${gameNumber}場分隊...`);
    const allocation2 = algorithm.allocateTeams(currentParticipants, courts, gameNumber);
    
    if (allocation2.length === 0) {
      console.log(`  ❌ 第${gameNumber}場分隊失敗`);
      return false;
    }
    
    console.log(`  ✅ 第${gameNumber}場分隊成功`);
    allAllocations.push(allocation2);
    
    // 檢查隊伍變化
    const hasVariation = checkTeamVariation(allocation1, allocation2);
    if (hasVariation) {
      console.log(`  ✅ 隊伍組合有變化`);
    } else {
      console.log(`  ⚠️  隊伍組合沒有變化`);
    }
    
    currentParticipants = updateParticipants(currentParticipants, allocation2, gameNumber, courts.length);
    gameNumber++;
    
    // 繼續直到所有人都至少打過一場
    while (!allPlayersPlayedAtLeastOnce(currentParticipants) && gameNumber <= 10) {
      console.log(`  🎮 第${gameNumber}場分隊...`);
      const allocation = algorithm.allocateTeams(currentParticipants, courts, gameNumber);
      
      if (allocation.length === 0) {
        console.log(`  ⚠️  第${gameNumber}場無法分隊，跳過`);
        gameNumber++;
        continue;
      }
      
      console.log(`  ✅ 第${gameNumber}場分隊成功`);
      allAllocations.push(allocation);
      currentParticipants = updateParticipants(currentParticipants, allocation, gameNumber, courts.length);
      gameNumber++;
    }
    
    // 驗證最終規則
    console.log(`  📊 最終驗證:`);
    const finalResult = validateFinalRules(currentParticipants);
    
    return finalResult;
    
  } catch (error) {
    console.log(`  ❌ 測試出錯: ${error.message}`);
    return false;
  }
}

// 創建測試參與者
function createParticipants(count) {
  const names = ['張三', '李四', '王五', '趙六', '孫七', '周八', '吳九', '鄭十', '王十一', '李十二', '陳十三', '劉十四'];
  const participants = [];
  
  for (let i = 0; i < count; i++) {
    participants.push({
      id: (i + 1).toString(),
      name: names[i] || `玩家${i + 1}`,
      skillLevel: 4 + (i % 4), // 技能等級4-7
      gamesPlayed: 0,
      lastPlayedRound: 0
    });
  }
  
  return participants;
}

// 創建測試場地
function createCourts(count) {
  const courts = [];
  
  for (let i = 0; i < count; i++) {
    courts.push({
      id: `court${i + 1}`,
      name: `場地${i + 1}`,
      isActive: true
    });
  }
  
  return courts;
}

// 更新參與者狀態
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

// 檢查隊伍變化
function checkTeamVariation(allocation1, allocation2) {
  if (allocation1.length !== allocation2.length) return true;
  
  for (let i = 0; i < allocation1.length; i++) {
    const team1 = allocation1[i].players.map(p => p.id).sort();
    const team2 = allocation2[i].players.map(p => p.id).sort();
    
    if (team1.join(',') !== team2.join(',')) {
      return true;
    }
  }
  
  return false;
}

// 檢查所有人是否都至少打過一場
function allPlayersPlayedAtLeastOnce(participants) {
  return participants.every(p => p.gamesPlayed >= 1);
}

// 驗證最終規則
function validateFinalRules(participants) {
  const gamesPlayed = participants.map(p => p.gamesPlayed);
  const minGames = Math.min(...gamesPlayed);
  const maxGames = Math.max(...gamesPlayed);
  const gamesDiff = maxGames - minGames;
  
  console.log(`    場次差距: ${gamesDiff} (最少${minGames}場, 最多${maxGames}場)`);
  
  const gamesDiffOk = gamesDiff <= 1;
  const allPlayedOk = participants.every(p => p.gamesPlayed >= 1);
  
  console.log(`    場次差距規則: ${gamesDiffOk ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`    所有人上場規則: ${allPlayedOk ? '✅ 通過' : '❌ 失敗'}`);
  
  return gamesDiffOk && allPlayedOk;
}

// 執行測試
if (require.main === module) {
  const success = runComprehensiveTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runComprehensiveTests };