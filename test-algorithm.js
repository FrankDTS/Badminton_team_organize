// 測試分隊算法確保等待場次不超過場地數量
const { TeamAllocationAlgorithm } = require('./lib/team-allocation-algorithm.js');

// 模擬數據
const participants = [
  { id: "1", name: "張三", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "2", name: "李四", skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "3", name: "王五", skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "4", name: "趙六", skillLevel: 7, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "5", name: "錢七", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "6", name: "孫八", skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "7", name: "周九", skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "8", name: "吳十", skillLevel: 8, gamesPlayed: 0, lastPlayedRound: 0 },
];

const courts = [
  { id: "1", name: "場地1", isActive: true, currentPlayers: [] },
  { id: "2", name: "場地2", isActive: true, currentPlayers: [] }
];

console.log("=== 測試分隊算法 ===");
console.log(`參與者數量: ${participants.length}`);
console.log(`場地數量: ${courts.length}`);
console.log("目標：確保所有人等待場次不超過場地數量\n");

const algorithm = new TeamAllocationAlgorithm();

// 模擬多輪分隊
for (let round = 1; round <= 6; round++) {
  console.log(`\n--- 第 ${round} 輪 ---`);
  
  const allocations = algorithm.allocateTeams(participants, courts, round);
  
  console.log(`本輪分隊結果:`);
  allocations.forEach(allocation => {
    console.log(`  ${allocation.courtName}: ${allocation.players.map(p => p.name).join(', ')}`);
    console.log(`    平均技能: ${allocation.averageSkillLevel}，玩家等待輪數: ${allocation.players.map(p => {
      const participant = participants.find(part => part.id === p.id);
      const waitingRounds = participant.lastPlayedRound === 0 
        ? Math.max(0, round - 1)
        : Math.max(0, round - participant.lastPlayedRound - 1);
      return `${p.name}(${waitingRounds})`;
    }).join(', ')}`);
  });
  
  // 更新參與者統計
  allocations.forEach(allocation => {
    allocation.players.forEach(player => {
      const participant = participants.find(p => p.id === player.id);
      if (participant) {
        participant.gamesPlayed += 1;
        participant.lastPlayedRound = round;
      }
    });
  });
  
  // 顯示所有參與者狀態
  console.log(`\n  所有參與者狀態:`);
  participants.forEach(p => {
    const waitingRounds = p.lastPlayedRound === 0 
      ? Math.max(0, round)
      : Math.max(0, round - p.lastPlayedRound);
    console.log(`    ${p.name}: 已打${p.gamesPlayed}場, 等待${waitingRounds}輪 (最後上場輪次: ${p.lastPlayedRound || '未上場'})`);
  });
  
  // 檢查等待限制
  const maxWaitingRounds = Math.max(...participants.map(p => {
    const waitingRounds = p.lastPlayedRound === 0 
      ? Math.max(0, round)
      : Math.max(0, round - p.lastPlayedRound);
    return waitingRounds;
  }));
  
  const isViolated = maxWaitingRounds > courts.length;
  console.log(`\n  ✓ 最大等待輪數: ${maxWaitingRounds} (限制: ${courts.length}) ${isViolated ? '❌ 違反限制!' : '✅ 符合限制'}`);
}

console.log("\n=== 測試完成 ===");