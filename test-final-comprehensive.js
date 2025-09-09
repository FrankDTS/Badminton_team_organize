// 最終綜合測試 - 12人3場地6輪測試
const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts');

const createParticipants = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `player${i + 1}`,
    name: `Player ${i + 1}`,
    skillLevel: (i % 5) + 1, // 技能等級1-5循環
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
    distribution: gamesPlayed.reduce((acc, games) => {
      acc[games] = (acc[games] || 0) + 1;
      return acc;
    }, {})
  };
};

const runFinalTest = () => {
  console.log('=== 最終綜合測試：12人3場地6輪 ===\n');
  
  const algorithm = new TeamAllocationAlgorithm();
  const participants = createParticipants(12); // 12位玩家
  const courts = createCourts(3); // 3個場地，每輪12人上場，0人輪休
  
  let gameNumber = 1;
  let success = true;
  const roundResults = [];
  
  console.log('初始設定:');
  console.log(`  參與者: ${participants.length}人`);
  console.log(`  場地: ${courts.length}個`);
  console.log(`  每輪上場人數: ${courts.length * 4}人`);
  console.log(`  每輪輪休人數: ${participants.length - courts.length * 4}人\n`);
  
  // 運行6輪
  for (let round = 1; round <= 6; round++) {
    console.log(`=== 第 ${round} 輪 ===`);
    const roundData = { round, games: [] };
    
    // 每輪3場比賽
    for (let gameInRound = 1; gameInRound <= courts.length; gameInRound++) {
      console.log(`第 ${gameNumber} 場 (第${round}輪第${gameInRound}場):`);
      
      // 分配前檢查
      const beforeValidation = validateGamesDifference(participants);
      console.log(`  分配前: 差距=${beforeValidation.difference}, 分佈=${JSON.stringify(beforeValidation.distribution)}`);
      
      if (!beforeValidation.isValid) {
        console.log(`  ❌ 分配前場次差距已超過1!`);
        success = false;
        break;
      }
      
      // 執行分隊
      const allocations = algorithm.allocateTeams(participants, courts, gameNumber);
      
      if (allocations.length === 0) {
        console.log(`  ❌ 無法分配`);
        success = false;
        break;
      }
      
      console.log(`  分配: ${allocations.length}場比賽`);
      allocations.forEach(alloc => {
        const playerInfo = alloc.players.map(p => `${p.name}(${p.gamesPlayed})`).join(', ');
        console.log(`    ${alloc.courtName}: ${playerInfo}`);
      });
      
      // 顯示輪休玩家
      const playingPlayerIds = new Set();
      allocations.forEach(alloc => {
        alloc.players.forEach(p => playingPlayerIds.add(p.id));
      });
      const waitingPlayers = participants.filter(p => !playingPlayerIds.has(p.id));
      if (waitingPlayers.length > 0) {
        const waitingInfo = waitingPlayers.map(p => `${p.name}(${p.gamesPlayed})`).join(', ');
        console.log(`    輪休: ${waitingInfo}`);
      }
      
      // 更新參與者狀態
      updateParticipants(participants, allocations, gameNumber, courts.length);
      roundData.games.push({ gameNumber, allocations });
      
      // 分配後檢查
      const afterValidation = validateGamesDifference(participants);
      console.log(`  分配後: 差距=${afterValidation.difference}, 分佈=${JSON.stringify(afterValidation.distribution)}`);
      
      if (!afterValidation.isValid) {
        console.log(`  ❌ 場次差距超過1!`);
        success = false;
        break;
      }
      
      gameNumber++;
    }
    
    if (!success) break;
    
    roundResults.push(roundData);
    
    // 顯示每輪結束時的狀態
    const roundValidation = validateGamesDifference(participants);
    console.log(`  輪次結束: 差距=${roundValidation.difference}, 分佈=${JSON.stringify(roundValidation.distribution)}`);
    console.log('');
  }
  
  // 最終結果
  console.log('=== 最終結果 ===');
  const finalValidation = validateGamesDifference(participants);
  console.log(`場次差距: ${finalValidation.difference} (最少${finalValidation.minGames}場，最多${finalValidation.maxGames}場)`);
  console.log(`場次分佈: ${JSON.stringify(finalValidation.distribution)}`);
  
  console.log('\n各玩家最終狀態:');
  participants.forEach(p => {
    console.log(`  ${p.name}: ${p.gamesPlayed}場 (上次第${p.lastPlayedRound}輪)`);
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
    } else {
      console.log(`第 ${round} 輪: ✅ 符合每兩輪規則`);
    }
  }
  
  const overallSuccess = success && finalValidation.isValid && everyTwoRoundsValid;
  
  console.log(`\n=== 測試結果: ${overallSuccess ? '✅ 完全成功' : '❌ 有問題'} ===`);
  
  if (overallSuccess) {
    console.log('✅ 6輪測試完全成功');
    console.log('✅ 場次差距始終控制在1以內');
    console.log('✅ 每兩輪規則完全符合');
    console.log('✅ 算法可以支持長期運行');
  } else {
    console.log('❌ 測試未完全通過，需要進一步調整');
  }
  
  return overallSuccess;
};

if (require.main === module) {
  runFinalTest();
}

module.exports = { runFinalTest };