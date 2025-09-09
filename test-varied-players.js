// 測試更多變化的玩家組合 - 檢查算法是否真正執行輪換
const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts');

// 模擬參與者數據
const createParticipants = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `player${i + 1}`,
    name: `Player ${i + 1}`,
    skillLevel: (i % 5) + 1, // 1-5級技能等級，循環分配
    gamesPlayed: 0,
    lastPlayedRound: 0,
  }));
};

// 模擬場地數據
const createCourts = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `court${i + 1}`,
    name: `Court ${i + 1}`,
    isActive: true,
  }));
};

// 更新參與者數據
const updateParticipants = (participants, allocations, gameNumber, courtsCount) => {
  const currentRound = Math.floor((gameNumber - 1) / courtsCount) + 1;
  
  allocations.forEach(allocation => {
    allocation.players.forEach(player => {
      const participant = participants.find(p => p.id === player.id);
      if (participant) {
        participant.gamesPlayed += 1;
        participant.lastPlayedRound = currentRound;
      }
    });
  });
};

// 驗證場次差距規則
const validateGamesDifference = (participants) => {
  const gamesPlayed = participants.map(p => p.gamesPlayed);
  const minGames = Math.min(...gamesPlayed);
  const maxGames = Math.max(...gamesPlayed);
  const difference = maxGames - minGames;
  
  return {
    isValid: difference <= 1,
    difference,
    minGames,
    maxGames,
    distribution: gamesPlayed.reduce((acc, games) => {
      acc[games] = (acc[games] || 0) + 1;
      return acc;
    }, {})
  };
};

// 追蹤玩家組合重複
const trackPlayerCombinations = () => {
  const combinations = new Map();
  
  const recordCombination = (players) => {
    const key = players.map(p => p.id).sort().join('-');
    const count = combinations.get(key) || 0;
    combinations.set(key, count + 1);
  };
  
  const getRepeatedCombinations = () => {
    const repeated = [];
    for (const [key, count] of combinations) {
      if (count > 1) {
        repeated.push({ combination: key, count });
      }
    }
    return repeated;
  };
  
  return { recordCombination, getRepeatedCombinations };
};

// 運行變化測試
const runVariedTest = () => {
  console.log('=== 玩家組合變化測試開始 ===\n');
  
  const algorithm = new TeamAllocationAlgorithm();
  const participants = createParticipants(10); // 10位玩家
  const courts = createCourts(2); // 2個場地，每輪8人上場，2人輪休
  
  const combinationTracker = trackPlayerCombinations();
  let gameNumber = 1;
  
  // 顯示初始玩家狀態
  console.log('初始玩家狀態:');
  participants.forEach(p => {
    console.log(`  ${p.name}: 技能等級 ${p.skillLevel}, 場次 ${p.gamesPlayed}`);
  });
  console.log('');
  
  // 運行8輪測試
  for (let round = 1; round <= 8; round++) {
    console.log(`--- 第 ${round} 輪 ---`);
    
    // 每輪有2場比賽（2個場地）
    for (let gameInRound = 1; gameInRound <= courts.length; gameInRound++) {
      console.log(`第 ${gameNumber} 場 (第${round}輪第${gameInRound}場):`);
      
      // 執行分隊
      const allocations = algorithm.allocateTeams(participants, courts, gameNumber);
      
      if (allocations.length === 0) {
        console.log(`  ⚠️ 無法分配`);
        gameNumber++;
        continue;
      }
      
      // 記錄玩家組合
      allocations.forEach(alloc => {
        combinationTracker.recordCombination(alloc.players);
      });
      
      // 顯示分配結果和場次統計
      console.log(`  分配結果:`);
      allocations.forEach(alloc => {
        const playerInfo = alloc.players.map(p => `${p.name}(${p.gamesPlayed})`).join(', ');
        console.log(`    ${alloc.courtName}: ${playerInfo}`);
      });
      
      // 顯示等待的玩家
      const playingPlayerIds = new Set();
      allocations.forEach(alloc => {
        alloc.players.forEach(p => playingPlayerIds.add(p.id));
      });
      const waitingPlayers = participants.filter(p => !playingPlayerIds.has(p.id));
      if (waitingPlayers.length > 0) {
        const waitingInfo = waitingPlayers.map(p => `${p.name}(${p.gamesPlayed})`).join(', ');
        console.log(`    等待: ${waitingInfo}`);
      }
      
      // 更新參與者狀態
      updateParticipants(participants, allocations, gameNumber, courts.length);
      
      // 檢查場次差距
      const validation = validateGamesDifference(participants);
      console.log(`  場次分佈: ${JSON.stringify(validation.distribution)}, 差距: ${validation.difference}`);
      
      if (!validation.isValid) {
        console.log(`  ❌ 違反場次差距規則! 差距: ${validation.difference}`);
        return false;
      }
      
      gameNumber++;
    }
    console.log('');
  }
  
  // 最終統計
  console.log('=== 最終統計 ===');
  const finalValidation = validateGamesDifference(participants);
  console.log(`最終場次差距: ${finalValidation.difference}`);
  console.log(`場次分佈: ${JSON.stringify(finalValidation.distribution)}`);
  
  console.log('\n各玩家最終狀態:');
  participants.forEach(p => {
    console.log(`  ${p.name}: ${p.gamesPlayed} 場 (上次第${p.lastPlayedRound}輪)`);
  });
  
  // 檢查重複組合
  console.log('\n=== 玩家組合重複檢查 ===');
  const repeatedCombinations = combinationTracker.getRepeatedCombinations();
  if (repeatedCombinations.length === 0) {
    console.log('✅ 沒有發現重複的4人組合');
  } else {
    console.log('重複的4人組合:');
    repeatedCombinations.forEach(({ combination, count }) => {
      console.log(`  ${combination}: ${count} 次`);
    });
  }
  
  const success = finalValidation.isValid;
  console.log(`\n=== 測試結果: ${success ? '✅ 通過' : '❌ 失敗'} ===`);
  
  return success;
};

// 運行測試
if (require.main === module) {
  runVariedTest();
}

module.exports = { runVariedTest };