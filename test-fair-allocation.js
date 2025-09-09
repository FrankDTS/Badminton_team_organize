// 測試公平分配算法 - 確保所有玩家都有上場機會
const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts');

// 創建測試參與者（模擬實際情況：14名玩家，2個場地）
const createTestParticipants = () => {
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

const createCourts = () => {
  return [
    { id: "1", name: "場地 1", isActive: true, currentPlayers: [] },
    { id: "2", name: "場地 2", isActive: true, currentPlayers: [] },
  ];
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

const runFairAllocationTest = () => {
  console.log('=== 公平分配測試開始 ===\n');
  
  const algorithm = new TeamAllocationAlgorithm();
  const participants = createTestParticipants();
  const courts = createCourts();
  
  let gameNumber = 1;
  const maxGames = 10; // 測試10場遊戲
  
  console.log(`測試設定: ${participants.length}名玩家, ${courts.length}個場地`);
  console.log(`每場遊戲: ${courts.length * 4}人上場, ${participants.length - courts.length * 4}人輪休\n`);
  
  // 運行多場遊戲
  for (let game = 1; game <= maxGames; game++) {
    console.log(`=== 第 ${game} 場遊戲 ===`);
    
    // 分配前狀態
    const beforeStats = getPlayerStats(participants);
    console.log(`分配前場次分佈: 最少${beforeStats.minGames}場, 最多${beforeStats.maxGames}場, 差距${beforeStats.difference}`);
    
    // 執行分隊
    const allocations = algorithm.allocateTeams(participants, courts, gameNumber);
    
    if (allocations.length === 0) {
      console.log(`❌ 第${game}場無法分配`);
      break;
    }
    
    console.log(`✅ 成功分配 ${allocations.length} 場比賽:`);
    allocations.forEach(alloc => {
      const playerInfo = alloc.players.map(p => `${p.name}(${p.gamesPlayed})`).join(', ');
      console.log(`  ${alloc.courtName}: ${playerInfo}`);
    });
    
    // 更新參與者狀態
    updateParticipants(participants, allocations, gameNumber, courts.length);
    
    // 分配後狀態
    const afterStats = getPlayerStats(participants);
    console.log(`分配後場次分佈: 最少${afterStats.minGames}場, 最多${afterStats.maxGames}場, 差距${afterStats.difference}`);
    
    // 檢查未上場玩家
    const neverPlayedPlayers = participants.filter(p => p.gamesPlayed === 0);
    if (neverPlayedPlayers.length > 0 && game >= 3) {
      console.log(`⚠️ 警告: ${neverPlayedPlayers.length}名玩家尚未上場: ${neverPlayedPlayers.map(p => p.name).join(', ')}`);
    }
    
    gameNumber++;
    console.log('');
  }
  
  // 最終統計
  console.log('=== 最終統計 ===');
  const finalStats = getPlayerStats(participants);
  console.log(`場次差距: ${finalStats.difference} (最少${finalStats.minGames}場，最多${finalStats.maxGames}場)`);
  
  console.log('\n各玩家最終場次:');
  participants.sort((a, b) => a.gamesPlayed - b.gamesPlayed).forEach(p => {
    console.log(`  ${p.name}: ${p.gamesPlayed}場`);
  });
  
  // 檢查公平性
  const neverPlayedPlayers = participants.filter(p => p.gamesPlayed === 0);
  const success = neverPlayedPlayers.length === 0 && finalStats.difference <= 2;
  
  console.log(`\n=== 測試結果: ${success ? '✅ 通過' : '❌ 失敗'} ===`);
  
  if (neverPlayedPlayers.length > 0) {
    console.log(`❌ ${neverPlayedPlayers.length}名玩家從未上場: ${neverPlayedPlayers.map(p => p.name).join(', ')}`);
  }
  
  if (finalStats.difference > 2) {
    console.log(`❌ 場次差距過大: ${finalStats.difference}場`);
  }
  
  if (success) {
    console.log('✅ 所有玩家都有上場機會，場次分配相對公平');
  }
  
  return success;
};

const getPlayerStats = (participants) => {
  const gamesPlayed = participants.map(p => p.gamesPlayed);
  const minGames = Math.min(...gamesPlayed);
  const maxGames = Math.max(...gamesPlayed);
  const difference = maxGames - minGames;
  
  return { minGames, maxGames, difference };
};

// 運行測試
if (require.main === module) {
  runFairAllocationTest();
}

module.exports = { runFairAllocationTest };