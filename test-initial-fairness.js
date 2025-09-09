// 測試初期公平性：確保所有人都先打1場，才有人打第2場
const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts');

const createParticipants = () => {
  return [
    { id: "1", name: "玩家1", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "2", name: "玩家2", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "3", name: "玩家3", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "4", name: "玩家4", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "5", name: "玩家5", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "6", name: "玩家6", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "7", name: "玩家7", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "8", name: "玩家8", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "9", name: "玩家9", skillLevel: 9, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "10", name: "玩家10", skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "11", name: "玩家11", skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0 },
    { id: "12", name: "玩家12", skillLevel: 2, gamesPlayed: 0, lastPlayedRound: 0 },
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

const checkInitialFairness = (participants) => {
  const gamesPlayed = participants.map(p => p.gamesPlayed);
  const minGames = Math.min(...gamesPlayed);
  const maxGames = Math.max(...gamesPlayed);
  const unplayedCount = participants.filter(p => p.gamesPlayed === 0).length;
  const playedOnceCount = participants.filter(p => p.gamesPlayed === 1).length;
  const playedTwiceOrMoreCount = participants.filter(p => p.gamesPlayed >= 2).length;
  
  return {
    minGames,
    maxGames,
    difference: maxGames - minGames,
    unplayedCount,
    playedOnceCount, 
    playedTwiceOrMoreCount,
    isInitiallyFair: unplayedCount === 0 || playedTwiceOrMoreCount === 0 // 要嘛所有人都打過，要嘛沒人打2場以上
  };
};

const testInitialFairness = () => {
  console.log('=== 初期公平性測試 ===\n');
  console.log('規則：所有人都先打1場，才允許任何人打第2場\n');
  
  const algorithm = new TeamAllocationAlgorithm();
  const participants = createParticipants();
  const courts = createCourts(3); // 3個場地，每輪12人上場，2人輪休
  
  let gameNumber = 1;
  let violationDetected = false;
  
  console.log(`測試設定: ${participants.length}名玩家, ${courts.length}個場地`);
  console.log(`每輪: ${courts.length * 4}人上場, ${participants.length - courts.length * 4}人輪休\n`);
  
  // 模擬逐場分配，直到所有人都打過1場
  for (let game = 1; game <= 20; game++) {
    console.log(`=== 第 ${game} 場遊戲 ===`);
    
    // 分配前檢查
    const beforeStats = checkInitialFairness(participants);
    console.log(`分配前狀態:`);
    console.log(`  未打過: ${beforeStats.unplayedCount}人`);
    console.log(`  打過1場: ${beforeStats.playedOnceCount}人`);  
    console.log(`  打過2場以上: ${beforeStats.playedTwiceOrMoreCount}人`);
    console.log(`  初期公平性: ${beforeStats.isInitiallyFair ? '✅ 符合' : '❌ 違反'}`);
    
    if (!beforeStats.isInitiallyFair) {
      console.log(`  ❌ 初期公平性違反：有 ${beforeStats.unplayedCount} 人未打過，卻有 ${beforeStats.playedTwiceOrMoreCount} 人已打2場以上`);
      violationDetected = true;
    }
    
    // 如果所有人都打過至少1場，測試完成
    if (beforeStats.unplayedCount === 0) {
      console.log('  🎉 所有人都已打過至少1場，初期公平性測試完成！');
      break;
    }
    
    // 隨機選擇一個場地（模擬用戶點擊）
    const courtIndex = (game - 1) % courts.length;
    const singleCourt = [courts[courtIndex]];
    
    console.log(`點擊 ${courts[courtIndex].name}:`);
    
    // 執行分配
    const allocations = algorithm.allocateTeams(participants, singleCourt, game);
    
    if (allocations.length === 0) {
      console.log(`  ❌ 無法分配`);
      continue;
    }
    
    console.log(`  ✅ 分配結果:`);
    allocations.forEach(alloc => {
      const playerInfo = alloc.players.map(p => {
        const beforeGames = p.gamesPlayed;
        const afterGames = beforeGames + 1;
        const status = beforeGames === 0 ? '(首場)' : `(第${afterGames}場)`;
        return `${p.name}${status}`;
      }).join(', ');
      console.log(`    ${alloc.courtName}: ${playerInfo}`);
    });
    
    // 更新參與者狀態
    updateParticipants(participants, allocations, game, courts.length);
    
    // 分配後檢查
    const afterStats = checkInitialFairness(participants);
    console.log(`  分配後狀態:`);
    console.log(`    未打過: ${afterStats.unplayedCount}人`);
    console.log(`    打過1場: ${afterStats.playedOnceCount}人`);
    console.log(`    打過2場以上: ${afterStats.playedTwiceOrMoreCount}人`);
    console.log(`    初期公平性: ${afterStats.isInitiallyFair ? '✅ 符合' : '❌ 違反'}`);
    
    if (!afterStats.isInitiallyFair) {
      console.log(`    ❌ 分配後初期公平性違反！`);
      violationDetected = true;
    }
    
    console.log('');
  }
  
  // 最終結果
  console.log('=== 最終結果 ===');
  const finalStats = checkInitialFairness(participants);
  
  console.log(`各玩家最終場次:`);
  participants.forEach(p => {
    console.log(`  ${p.name}: ${p.gamesPlayed}場`);
  });
  
  console.log(`\n統計:`);
  console.log(`未打過: ${finalStats.unplayedCount}人`);
  console.log(`打過1場: ${finalStats.playedOnceCount}人`);
  console.log(`打過2場以上: ${finalStats.playedTwiceOrMoreCount}人`);
  console.log(`場次差距: ${finalStats.difference}`);
  
  const success = !violationDetected && finalStats.unplayedCount === 0;
  console.log(`\n=== 測試結果: ${success ? '✅ 完全成功' : '❌ 有問題'} ===`);
  
  if (success) {
    console.log('✅ 初期公平性規則完美執行');
    console.log('✅ 所有人都先打了1場，然後才有人打第2場');
  } else {
    if (violationDetected) {
      console.log('❌ 檢測到初期公平性違反');
    }
    if (finalStats.unplayedCount > 0) {
      console.log(`❌ 仍有 ${finalStats.unplayedCount} 人未打過場`);
    }
  }
  
  return success;
};

// 運行測試
if (require.main === module) {
  testInitialFairness();
}

module.exports = { testInitialFairness };