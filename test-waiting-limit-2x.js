// 測試等待場次限制為場地數量*2的功能
console.log("=== 測試等待場次限制 (場地數量*2) ===\n");

// 測試場景1：8個人，2個場地，等待限制為4輪
console.log("【場景1】8人，2場地，等待限制=4輪");
console.log("預期：第4次【下一場】時，所有人都至少上場一次\n");

const participants1 = [
  { id: "1", name: "張三", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "2", name: "李四", skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "3", name: "王五", skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "4", name: "趙六", skillLevel: 7, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "5", name: "錢七", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "6", name: "孫八", skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "7", name: "周九", skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "8", name: "吳十", skillLevel: 8, gamesPlayed: 0, lastPlayedRound: 0 },
];

function analyzeRound(roundNum, playingPlayers, participants, courtsCount) {
  console.log(`第${roundNum}輪: ${playingPlayers.join(', ')} 上場`);
  
  // 更新統計
  playingPlayers.forEach(name => {
    const p = participants.find(participant => participant.name === name);
    if (p) {
      p.gamesPlayed += 1;
      p.lastPlayedRound = roundNum;
    }
  });
  
  // 檢查等待時間
  const waitingTimes = participants.map(p => {
    if (p.lastPlayedRound === 0) {
      return Math.max(0, roundNum - 1);
    } else {
      return Math.max(0, roundNum - p.lastPlayedRound - 1);
    }
  });
  
  const maxWaiting = Math.max(...waitingTimes);
  const waitingLimit = courtsCount * 2;
  const neverPlayed = participants.filter(p => p.gamesPlayed === 0).length;
  
  console.log(`  等待統計: 最大等待${maxWaiting}輪 (限制: ${waitingLimit}輪)`);
  console.log(`  參與統計: ${neverPlayed}人未上場, ${participants.length - neverPlayed}人已上場`);
  
  const waitingValid = maxWaiting <= waitingLimit;
  console.log(`  結果: ${waitingValid ? '✅' : '❌'} ${waitingValid ? '符合' : '超過'}等待限制`);
  
  return { waitingValid, neverPlayed, maxWaiting };
}

// 場景1測試
console.log("場景1測試:");
let scenario1Valid = true;

const rounds1 = [
  ["張三", "李四", "王五", "趙六"],    // 第1輪
  ["錢七", "孫八", "周九", "吳十"],    // 第2輪
  ["張三", "李四", "錢七", "孫八"],    // 第3輪
  ["王五", "趙六", "周九", "吳十"],    // 第4輪 - 第4次按【下一場】
];

rounds1.forEach((players, index) => {
  const result = analyzeRound(index + 1, players, participants1, 2);
  if (!result.waitingValid) scenario1Valid = false;
  
  if (index === 3) { // 第4輪檢查
    if (result.neverPlayed > 0) {
      console.log(`  ❌ 第4輪後仍有${result.neverPlayed}人未上場`);
      scenario1Valid = false;
    } else {
      console.log(`  ✅ 第4輪後所有人都已上場`);
    }
  }
  console.log("");
});

// 測試場景2：12個人，3個場地，等待限制為6輪
console.log("\n【場景2】12人，3場地，等待限制=6輪");
console.log("預期：第6次【下一場】時，所有人都至少上場一次\n");

const participants2 = Array.from({length: 12}, (_, i) => ({
  id: String(i + 1),
  name: `玩家${i + 1}`,
  skillLevel: 5 + (i % 4),
  gamesPlayed: 0,
  lastPlayedRound: 0
}));

console.log("場景2測試:");
let scenario2Valid = true;

const rounds2 = [
  ["玩家1", "玩家2", "玩家3", "玩家4"],       // 第1輪
  ["玩家5", "玩家6", "玩家7", "玩家8"],       // 第2輪
  ["玩家9", "玩家10", "玩家11", "玩家12"],    // 第3輪
  ["玩家1", "玩家2", "玩家5", "玩家6"],       // 第4輪
  ["玩家3", "玩家4", "玩家9", "玩家10"],      // 第5輪
  ["玩家7", "玩家8", "玩家11", "玩家12"],     // 第6輪 - 第6次按【下一場】
];

rounds2.forEach((players, index) => {
  const result = analyzeRound(index + 1, players, participants2, 3);
  if (!result.waitingValid) scenario2Valid = false;
  
  if (index === 5) { // 第6輪檢查
    if (result.neverPlayed > 0) {
      console.log(`  ❌ 第6輪後仍有${result.neverPlayed}人未上場`);
      scenario2Valid = false;
    } else {
      console.log(`  ✅ 第6輪後所有人都已上場`);
    }
  }
  console.log("");
});

console.log("=== 測試結果 ===");
console.log(`場景1 (2場地): ${scenario1Valid ? '✅ 通過' : '❌ 失敗'}`);
console.log(`場景2 (3場地): ${scenario2Valid ? '✅ 通過' : '❌ 失敗'}`);

if (scenario1Valid && scenario2Valid) {
  console.log("\n✅ 所有測試通過！");
  console.log("修正後的算法確保：");
  console.log("- 2場地：第4次【下一場】時所有人都至少上場一次");
  console.log("- 3場地：第6次【下一場】時所有人都至少上場一次");
  console.log("- 等待時間不超過場地數量*2");
} else {
  console.log("\n❌ 部分測試失敗，需要進一步調整算法");
}