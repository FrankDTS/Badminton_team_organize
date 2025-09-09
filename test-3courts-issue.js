// 測試3場地情況下的分配不均問題
const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts');

// 創建14名玩家（模擬實際情況）
const createParticipants = () => {
  return [
    // 5級玩家 (6個)
    { id: "1", name: "玩家1", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "2", name: "玩家2", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "3", name: "玩家3", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "4", name: "玩家4", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "5", name: "玩家5", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "6", name: "玩家6", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    // 9級玩家 (3個)
    { id: "7", name: "玩家7", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "8", name: "玩家8", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "9", name: "玩家9", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0 },
    // 2級玩家 (3個)
    { id: "10", name: "玩家10", skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "11", name: "玩家11", skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "12", name: "玩家12", skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0 },
    // 7級玩家 (2個)
    { id: "13", name: "玩家13", skillLevel: 7, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "14", name: "玩家14", skillLevel: 7, gamesPlayed: 0, lastPlayedRound: 0 },
  ];
};

const createCourts = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: (i + 1).toString(),
    name: `場地 ${i + 1}`,
    isActive: true,
    currentPlayers: []
  }));
};

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

const analyzeDistribution = (participants) => {
  const gamesPlayed = participants.map(p => p.gamesPlayed);
  const minGames = Math.min(...gamesPlayed);
  const maxGames = Math.max(...gamesPlayed);
  const difference = maxGames - minGames;
  
  // 統計各場次的玩家數量
  const distribution = {};
  gamesPlayed.forEach(games => {
    distribution[games] = (distribution[games] || 0) + 1;
  });
  
  return { minGames, maxGames, difference, distribution };
};

const test3CourtsAllocation = () => {
  console.log('=== 3場地分配測試 ===\n');
  
  const algorithm = new TeamAllocationAlgorithm();
  const participants = createParticipants();
  const courts = createCourts(3); // 3個場地
  
  let gameNumber = 1;
  const maxRounds = 8; // 測試8輪
  
  console.log(`測試設定: ${participants.length}名玩家, ${courts.length}個場地`);
  console.log(`每輪: ${courts.length * 4}人上場, ${participants.length - courts.length * 4}人輪休\n`);
  
  // 按輪次進行測試
  for (let round = 1; round <= maxRounds; round++) {
    console.log(`=== 第 ${round} 輪 ===`);
    
    // 每輪有3場比賽（3個場地）
    for (let gameInRound = 1; gameInRound <= courts.length; gameInRound++) {
      const currentGame = (round - 1) * courts.length + gameInRound;
      console.log(`第 ${currentGame} 場 (第${round}輪第${gameInRound}場):`);
      
      // 分配前統計
      const beforeStats = analyzeDistribution(participants);
      console.log(`  分配前: 差距${beforeStats.difference} (${beforeStats.minGames}-${beforeStats.maxGames}) 分佈:${JSON.stringify(beforeStats.distribution)}`);
      
      // 執行分隊
      const allocations = algorithm.allocateTeams(participants, courts, currentGame);
      
      if (allocations.length === 0) {
        console.log(`  ❌ 無法分配`);
        continue;
      }
      
      console.log(`  ✅ 分配結果:`);
      allocations.forEach(alloc => {
        const playerInfo = alloc.players.map(p => `${p.name}(${p.gamesPlayed})`).join(', ');
        console.log(`    ${alloc.courtName}: ${playerInfo}`);
      });
      
      // 更新參與者狀態
      updateParticipants(participants, allocations, currentGame, courts.length);
      
      // 分配後統計
      const afterStats = analyzeDistribution(participants);
      console.log(`  分配後: 差距${afterStats.difference} (${afterStats.minGames}-${afterStats.maxGames}) 分佈:${JSON.stringify(afterStats.distribution)}`);
      
      gameNumber++;
    }
    
    // 每輪結束後的整體分析
    const roundStats = analyzeDistribution(participants);
    console.log(`第${round}輪結束: 最大差距${roundStats.difference}, 分佈${JSON.stringify(roundStats.distribution)}`);
    
    // 檢查是否有玩家差距過大
    if (roundStats.difference > 2) {
      console.log(`⚠️ 警告: 場次差距過大(${roundStats.difference})`);
      
      // 顯示差距最大的玩家
      const sortedPlayers = [...participants].sort((a, b) => a.gamesPlayed - b.gamesPlayed);
      const leastPlayed = sortedPlayers.filter(p => p.gamesPlayed === roundStats.minGames);
      const mostPlayed = sortedPlayers.filter(p => p.gamesPlayed === roundStats.maxGames);
      
      console.log(`  最少場次(${roundStats.minGames}): ${leastPlayed.map(p => p.name).join(', ')}`);
      console.log(`  最多場次(${roundStats.maxGames}): ${mostPlayed.map(p => p.name).join(', ')}`);
    }
    
    console.log('');
  }
  
  // 最終結果
  console.log('=== 最終統計 ===');
  const finalStats = analyzeDistribution(participants);
  console.log(`最終場次差距: ${finalStats.difference} (${finalStats.minGames}-${finalStats.maxGames})`);
  console.log(`場次分佈: ${JSON.stringify(finalStats.distribution)}`);
  
  console.log('\n各玩家最終場次:');
  const sortedPlayers = [...participants].sort((a, b) => a.gamesPlayed - b.gamesPlayed);
  sortedPlayers.forEach(p => {
    console.log(`  ${p.name}: ${p.gamesPlayed}場`);
  });
  
  // 評估結果
  const isAcceptable = finalStats.difference <= 1;
  console.log(`\n=== 測試結果: ${isAcceptable ? '✅ 通過' : '❌ 失敗'} ===`);
  
  if (!isAcceptable) {
    console.log(`❌ 場次差距過大: ${finalStats.difference}場`);
    console.log("需要進一步優化算法");
  } else {
    console.log("✅ 分配相對公平");
  }
  
  return isAcceptable;
};

// 運行測試
if (require.main === module) {
  test3CourtsAllocation();
}

module.exports = { test3CourtsAllocation };