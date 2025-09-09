// 全面測試等待限制為場地數量*2的分隊算法
console.log("=== 全面測試分隊算法 (等待限制=場地*2) ===\n");

function simulateAlgorithm(participants, courtsCount, rounds) {
  let allValid = true;
  const waitingLimit = courtsCount * 2;
  
  console.log(`測試場景: ${participants.length}人, ${courtsCount}場地, 等待限制=${waitingLimit}輪`);
  console.log(`預期: 第${courtsCount * 2}次【下一場】時，所有人都至少上場一次\n`);
  
  for (let round = 1; round <= rounds; round++) {
    // 計算誰應該上場（模擬算法邏輯）
    const waitingTimes = participants.map(p => {
      if (p.lastPlayedRound === 0) {
        return Math.max(0, round - 1);
      } else {
        return Math.max(0, round - p.lastPlayedRound - 1);
      }
    });
    
    // 找到等待時間達到限制的人
    const mustPlayPlayers = participants.filter((p, index) => 
      waitingTimes[index] >= waitingLimit
    );
    
    // 按場次少、等待時間長的順序排序
    const sortedPlayers = [...participants].sort((a, b) => {
      const aWaiting = waitingTimes[participants.indexOf(a)];
      const bWaiting = waitingTimes[participants.indexOf(b)];
      
      // 優先讓達到等待限制的人上場
      const aReachedLimit = aWaiting >= waitingLimit;
      const bReachedLimit = bWaiting >= waitingLimit;
      if (aReachedLimit && !bReachedLimit) return -1;
      if (!aReachedLimit && bReachedLimit) return 1;
      
      // 場次差距控制
      if (a.gamesPlayed !== b.gamesPlayed) {
        return a.gamesPlayed - b.gamesPlayed;
      }
      
      // 等待時間長的優先
      if (aWaiting !== bWaiting) {
        return bWaiting - aWaiting;
      }
      
      return 0;
    });
    
    // 選擇前4人上場
    const playingPlayers = sortedPlayers.slice(0, 4);
    
    console.log(`第${round}輪: ${playingPlayers.map(p => p.name).join(', ')} 上場`);
    
    // 更新統計
    playingPlayers.forEach(p => {
      p.gamesPlayed += 1;
      p.lastPlayedRound = round;
    });
    
    // 檢查約束
    const newWaitingTimes = participants.map(p => {
      if (p.lastPlayedRound === 0) {
        return Math.max(0, round);
      } else {
        return Math.max(0, round - p.lastPlayedRound);
      }
    });
    
    const maxWaiting = Math.max(...newWaitingTimes);
    const games = participants.map(p => p.gamesPlayed);
    const gamesDiff = Math.max(...games) - Math.min(...games);
    const neverPlayed = participants.filter(p => p.gamesPlayed === 0).length;
    
    console.log(`  等待: 最大${maxWaiting}輪 (限制${waitingLimit}), 場次差距: ${gamesDiff}, 未上場: ${neverPlayed}人`);
    
    const waitingValid = maxWaiting <= waitingLimit;
    const gamesDiffValid = gamesDiff <= 1;
    
    if (!waitingValid || !gamesDiffValid) {
      allValid = false;
      console.log(`  ❌ ${!waitingValid ? '等待超限' : ''}${!gamesDiffValid ? '場次差距超限' : ''}`);
    } else {
      console.log(`  ✅ 符合所有限制`);
    }
    
    // 檢查關鍵輪次
    if (round === courtsCount * 2) {
      if (neverPlayed > 0) {
        console.log(`  ❌ 第${round}輪後仍有${neverPlayed}人未上場`);
        allValid = false;
      } else {
        console.log(`  ✅ 第${round}輪後所有人都已上場`);
      }
    }
    
    console.log("");
  }
  
  return allValid;
}

// 測試場景1：6人，2場地
console.log("=== 場景1：6人，2場地 ===");
const participants1 = [
  { name: "張三", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { name: "李四", skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
  { name: "王五", skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { name: "趙六", skillLevel: 7, gamesPlayed: 0, lastPlayedRound: 0 },
  { name: "錢七", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { name: "孫八", skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
];

const result1 = simulateAlgorithm(participants1, 2, 6);

// 測試場景2：9人，3場地
console.log("=== 場景2：9人，3場地 ===");
const participants2 = Array.from({length: 9}, (_, i) => ({
  name: `P${i + 1}`,
  skillLevel: 5 + (i % 3),
  gamesPlayed: 0,
  lastPlayedRound: 0
}));

const result2 = simulateAlgorithm(participants2, 3, 8);

// 測試場景3：15人，1場地（極端情況）
console.log("=== 場景3：15人，1場地 ===");
const participants3 = Array.from({length: 15}, (_, i) => ({
  name: `玩家${i + 1}`,
  skillLevel: 5 + (i % 4),
  gamesPlayed: 0,
  lastPlayedRound: 0
}));

const result3 = simulateAlgorithm(participants3, 1, 5);

console.log("=== 總結 ===");
console.log(`場景1 (6人2場地): ${result1 ? '✅ 通過' : '❌ 失敗'}`);
console.log(`場景2 (9人3場地): ${result2 ? '✅ 通過' : '❌ 失敗'}`);
console.log(`場景3 (15人1場地): ${result3 ? '✅ 通過' : '❌ 失敗'}`);

if (result1 && result2 && result3) {
  console.log("\n🎉 所有測試場景都通過！");
  console.log("算法確保：");
  console.log("✅ 等待時間不超過場地數量*2");
  console.log("✅ 場次差距不超過1");
  console.log("✅ 在指定輪次內所有人都至少上場一次");
} else {
  console.log("\n⚠️  部分測試場景未通過，需要檢查算法");
}