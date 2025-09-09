// 簡化的6輪測試 - 專注於場次差距控制
const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts');

const createParticipants = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `player${i + 1}`,
    name: `Player ${i + 1}`,
    skillLevel: ((i % 3) + 2), // 技能等級2-4
    gamesPlayed: 0,
    lastPlayedRound: 0,
  }));
};

const createCourts = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `court${i + 1}`,
    name: `Court ${i + 1}`,
    isActive: true,
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
  };
};

const runSimpleTest = () => {
  console.log('=== 簡化6輪測試 - 專注場次差距控制 ===\n');
  
  const algorithm = new TeamAllocationAlgorithm();
  const participants = createParticipants(8); // 8位玩家，剛好每輪都能上場
  const courts = createCourts(2); // 2個場地
  
  let gameNumber = 1;
  let success = true;
  
  // 運行6輪
  for (let round = 1; round <= 6; round++) {
    console.log(`=== 第 ${round} 輪 ===`);
    
    // 每輪2場比賽
    for (let gameInRound = 1; gameInRound <= courts.length; gameInRound++) {
      console.log(`第 ${gameNumber} 場:`);
      
      // 分配前檢查
      const beforeValidation = validateGamesDifference(participants);
      console.log(`  分配前: 差距=${beforeValidation.difference} (${beforeValidation.minGames}-${beforeValidation.maxGames})`);
      
      // 執行分隊
      const allocations = algorithm.allocateTeams(participants, courts, gameNumber);
      
      if (allocations.length === 0) {
        console.log(`  ❌ 無法分配`);
        success = false;
        break;
      }
      
      console.log(`  分配: ${allocations.length}場比賽`);
      allocations.forEach((alloc, index) => {
        console.log(`    場地${index+1}: ${alloc.players.map(p => p.name).join(', ')}`);
      });
      
      // 更新參與者狀態
      updateParticipants(participants, allocations, gameNumber, courts.length);
      
      // 分配後檢查
      const afterValidation = validateGamesDifference(participants);
      console.log(`  分配後: 差距=${afterValidation.difference} (${afterValidation.minGames}-${afterValidation.maxGames})`);
      
      if (!afterValidation.isValid) {
        console.log(`  ❌ 場次差距超過1!`);
        success = false;
        break;
      }
      
      gameNumber++;
    }
    
    if (!success) break;
    
    // 顯示每輪結束時的狀態
    console.log(`  輪次結束狀態:`);
    participants.forEach(p => {
      console.log(`    ${p.name}: ${p.gamesPlayed}場`);
    });
    console.log('');
  }
  
  // 最終結果
  console.log('=== 最終結果 ===');
  const finalValidation = validateGamesDifference(participants);
  console.log(`場次差距: ${finalValidation.difference} (最少${finalValidation.minGames}場，最多${finalValidation.maxGames}場)`);
  
  participants.forEach(p => {
    console.log(`  ${p.name}: ${p.gamesPlayed}場 (上次第${p.lastPlayedRound}輪)`);
  });
  
  if (success && finalValidation.isValid) {
    console.log('\n✅ 測試成功 - 6輪測試完成，場次差距始終控制在1以內');
  } else {
    console.log('\n❌ 測試失敗');
  }
  
  return success && finalValidation.isValid;
};

if (require.main === module) {
  runSimpleTest();
}

module.exports = { runSimpleTest };