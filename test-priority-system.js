// 測試新的優先級系統是否能解決不公平分配問題
const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.ts');

// 創建測試場景：模擬單個場地逐個分配的情況
const testSingleCourtAllocation = () => {
  console.log('=== 單場地逐個分配測試 ===\n');
  
  const algorithm = new TeamAllocationAlgorithm();
  
  // 創建14名玩家
  let participants = [
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
  
  const courts = [
    { id: "1", name: "場地 1", isActive: true, currentPlayers: [] },
    { id: "2", name: "場地 2", isActive: true, currentPlayers: [] },
    { id: "3", name: "場地 3", isActive: true, currentPlayers: [] },
  ];
  
  let gameNumber = 1;
  const totalGames = 15; // 測試15場遊戲
  
  console.log(`測試場景: 模擬用戶逐個點擊場地按鈕的情況`);
  console.log(`${participants.length}名玩家, ${courts.length}個場地\n`);
  
  // 模擬逐個場地分配
  for (let game = 1; game <= totalGames; game++) {
    console.log(`=== 第 ${game} 場遊戲 ===`);
    
    // 隨機選擇一個場地進行分配（模擬用戶點擊）
    const courtIndex = (game - 1) % courts.length;
    const singleCourt = [courts[courtIndex]];
    
    // 排除其他場地正在使用的玩家（模擬實際情況）
    const availableParticipants = participants.filter(p => {
      // 在實際應用中，這裡會排除其他場地正在使用的玩家
      return true; // 為簡化，這裡不排除
    });
    
    console.log(`點擊 ${courts[courtIndex].name}:`);
    
    // 分配前統計
    const beforeStats = getPlayerStats(participants);
    console.log(`  分配前: 差距${beforeStats.difference} (${beforeStats.minGames}-${beforeStats.maxGames})`);
    
    // 特別關注玩家7和玩家13
    const player7 = participants.find(p => p.name === "玩家7");
    const player13 = participants.find(p => p.name === "玩家13");
    console.log(`  玩家7: ${player7.gamesPlayed}場, 玩家13: ${player13.gamesPlayed}場`);
    
    // 執行分隊
    const allocations = algorithm.allocateTeams(availableParticipants, singleCourt, game);
    
    if (allocations.length === 0) {
      console.log(`  ❌ 無法分配`);
      continue;
    }
    
    console.log(`  ✅ 分配結果:`);
    allocations.forEach(alloc => {
      const playerInfo = alloc.players.map(p => `${p.name}(${p.gamesPlayed}→${p.gamesPlayed+1})`).join(', ');
      console.log(`    ${alloc.courtName}: ${playerInfo}`);
    });
    
    // 更新參與者狀態
    allocations.forEach(allocation => {
      allocation.players.forEach(player => {
        const participant = participants.find(p => p.id === player.id);
        if (participant) {
          participant.gamesPlayed += 1;
          participant.lastPlayedRound = Math.floor((game - 1) / courts.length) + 1;
        }
      });
    });
    
    // 分配後統計
    const afterStats = getPlayerStats(participants);
    console.log(`  分配後: 差距${afterStats.difference} (${afterStats.minGames}-${afterStats.maxGames})`);
    
    // 檢查是否有人差距過大
    if (afterStats.difference > 3) {
      console.log(`  ⚠️ 警告: 場次差距過大!`);
      
      const sortedPlayers = [...participants].sort((a, b) => a.gamesPlayed - b.gamesPlayed);
      const leastPlayed = sortedPlayers.filter(p => p.gamesPlayed === afterStats.minGames);
      const mostPlayed = sortedPlayers.filter(p => p.gamesPlayed === afterStats.maxGames);
      
      console.log(`    最少場次(${afterStats.minGames}): ${leastPlayed.map(p => p.name).join(', ')}`);
      console.log(`    最多場次(${afterStats.maxGames}): ${mostPlayed.map(p => p.name).join(', ')}`);
    }
    
    gameNumber++;
    console.log('');
  }
  
  // 最終結果
  console.log('=== 最終統計 ===');
  const finalStats = getPlayerStats(participants);
  console.log(`最終場次差距: ${finalStats.difference} (${finalStats.minGames}-${finalStats.maxGames})`);
  
  console.log('\n各玩家最終場次:');
  const sortedPlayers = [...participants].sort((a, b) => a.gamesPlayed - b.gamesPlayed);
  sortedPlayers.forEach(p => {
    const status = p.gamesPlayed === finalStats.minGames ? '(最少)' : 
                   p.gamesPlayed === finalStats.maxGames ? '(最多)' : '';
    console.log(`  ${p.name}: ${p.gamesPlayed}場 ${status}`);
  });
  
  // 重點關注玩家7和13
  const finalPlayer7 = participants.find(p => p.name === "玩家7");
  const finalPlayer13 = participants.find(p => p.name === "玩家13");
  const difference7_13 = Math.abs(finalPlayer7.gamesPlayed - finalPlayer13.gamesPlayed);
  
  console.log(`\n重點檢查:`);
  console.log(`玩家7最終: ${finalPlayer7.gamesPlayed}場`);
  console.log(`玩家13最終: ${finalPlayer13.gamesPlayed}場`);
  console.log(`兩者差距: ${difference7_13}場`);
  
  // 評估改進效果
  const isImproved = finalStats.difference <= 2 && difference7_13 <= 2;
  console.log(`\n=== 測試結果: ${isImproved ? '✅ 改善成功' : '❌ 仍需優化'} ===`);
  
  if (isImproved) {
    console.log('✅ 新的優先級系統有效改善了分配公平性');
  } else {
    console.log('❌ 分配仍然不夠公平，需要進一步調整');
  }
  
  return isImproved;
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
  testSingleCourtAllocation();
}

module.exports = { testSingleCourtAllocation };