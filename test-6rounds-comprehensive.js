// 綜合6輪測試 - 驗證場次差距控制
const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts');

// 模擬參與者數據
const createParticipants = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `player${i + 1}`,
    name: `Player ${i + 1}`,
    skillLevel: Math.floor(Math.random() * 5) + 1, // 1-5級技能等級
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
    details: participants.map(p => ({ name: p.name, games: p.gamesPlayed }))
  };
};

// 運行測試
const runComprehensiveTest = () => {
  console.log('=== 6輪綜合測試開始 ===\n');
  
  const algorithm = new TeamAllocationAlgorithm();
  const participants = createParticipants(12); // 12位玩家
  const courts = createCourts(2); // 2個場地
  
  let gameNumber = 1;
  let allocationHistory = [];
  
  // 運行6輪 (每輪2場，共12場)
  for (let round = 1; round <= 6; round++) {
    console.log(`--- 第 ${round} 輪 ---`);
    
    // 每輪有2場比賽（2個場地）
    for (let gameInRound = 1; gameInRound <= courts.length; gameInRound++) {
      console.log(`第 ${gameNumber} 場 (第${round}輪第${gameInRound}場):`);
      
      // 驗證分配前的狀態
      const beforeValidation = validateGamesDifference(participants);
      console.log(`  分配前場次差距: ${beforeValidation.difference} (min: ${beforeValidation.minGames}, max: ${beforeValidation.maxGames})`);
      
      if (!beforeValidation.isValid) {
        console.log(`  ❌ 分配前已違反場次差距規則! 差距: ${beforeValidation.difference}`);
        console.log(`  詳細: ${JSON.stringify(beforeValidation.details, null, 2)}`);
        return false;
      }
      
      // 執行分隊
      const allocations = algorithm.allocateTeams(participants, courts, gameNumber);
      
      if (allocations.length === 0) {
        console.log(`  ⚠️ 無法分配 - 可能受到場次差距限制`);
        gameNumber++;
        continue;
      }
      
      console.log(`  分配結果: ${allocations.length} 場比賽`);
      allocations.forEach((alloc, index) => {
        console.log(`    ${alloc.courtName}: ${alloc.players.map(p => p.name).join(', ')}`);
      });
      
      // 更新參與者狀態
      updateParticipants(participants, allocations, gameNumber, courts.length);
      allocationHistory.push({ gameNumber, round, allocations });
      
      // 驗證分配後的狀態
      const afterValidation = validateGamesDifference(participants);
      console.log(`  分配後場次差距: ${afterValidation.difference} (min: ${afterValidation.minGames}, max: ${afterValidation.maxGames})`);
      
      if (!afterValidation.isValid) {
        console.log(`  ❌ 分配後違反場次差距規則! 差距: ${afterValidation.difference}`);
        console.log(`  詳細: ${JSON.stringify(afterValidation.details, null, 2)}`);
        return false;
      }
      
      gameNumber++;
    }
    console.log('');
  }
  
  // 最終統計
  console.log('=== 最終統計 ===');
  const finalValidation = validateGamesDifference(participants);
  console.log(`場次差距: ${finalValidation.difference} (min: ${finalValidation.minGames}, max: ${finalValidation.maxGames})`);
  console.log('各玩家場次分佈:');
  finalValidation.details.forEach(detail => {
    console.log(`  ${detail.name}: ${detail.games} 場`);
  });
  
  // 檢查每兩輪規則
  console.log('\n=== 每兩輪規則檢查 ===');
  let everyTwoRoundsValid = true;
  for (let round = 2; round <= 6; round++) {
    const validation = algorithm.validateEveryTwoRoundsRule(participants, round);
    if (!validation.isValid) {
      console.log(`第 ${round} 輪違反每兩輪規則:`);
      validation.violations.forEach(v => console.log(`  ${v}`));
      everyTwoRoundsValid = false;
    }
  }
  
  const success = finalValidation.isValid && everyTwoRoundsValid;
  console.log(`\n=== 測試結果: ${success ? '✅ 通過' : '❌ 失敗'} ===`);
  
  if (success) {
    console.log('✅ 所有6輪測試成功完成');
    console.log('✅ 場次差距始終控制在1以內');
    console.log('✅ 每兩輪規則符合要求');
  }
  
  return success;
};

// 運行測試
if (require.main === module) {
  runComprehensiveTest();
}

module.exports = { runComprehensiveTest };