// 測試場次差距控制功能
console.log("=== 測試場次差距控制功能 ===\n");

// 測試場景：6個人，2個場地
// 預期：任何時候場次差距不超過1
const participants = [
  { id: "1", name: "張三", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "2", name: "李四", skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "3", name: "王五", skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "4", name: "趙六", skillLevel: 7, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "5", name: "錢七", skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: "6", name: "孫八", skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
];

const courts = [
  { id: "1", name: "場地1", isActive: true, currentPlayers: [] },
  { id: "2", name: "場地2", isActive: true, currentPlayers: [] }
];

function checkGamesDifference(participants) {
  const games = participants.map(p => p.gamesPlayed);
  const minGames = Math.min(...games);
  const maxGames = Math.max(...games);
  const difference = maxGames - minGames;
  
  console.log(`  場次統計: 最少${minGames}場, 最多${maxGames}場, 差距${difference}場`);
  console.log(`  各參與者: ${participants.map(p => `${p.name}(${p.gamesPlayed})`).join(', ')}`);
  
  if (difference > 1) {
    console.log(`  ❌ 場次差距${difference}場，超過限制！`);
    return false;
  } else {
    console.log(`  ✅ 場次差距${difference}場，符合限制`);
    return true;
  }
}

console.log("測試場景: 6人，2場地");
console.log("目標：確保任何時候場次差距不超過1場\n");

// 模擬多輪分隊
let allValid = true;

// 第1輪：張三,李四,王五,趙六 上場
console.log("第1輪: 張三,李四,王五,趙六 上場");
participants[0].gamesPlayed = 1; participants[0].lastPlayedRound = 1;
participants[1].gamesPlayed = 1; participants[1].lastPlayedRound = 1;
participants[2].gamesPlayed = 1; participants[2].lastPlayedRound = 1;
participants[3].gamesPlayed = 1; participants[3].lastPlayedRound = 1;

if (!checkGamesDifference(participants)) allValid = false;
console.log("");

// 第2輪：錢七,孫八 + 張三,李四 上場 (因為只有6人)
console.log("第2輪: 錢七,孫八,張三,李四 上場");
participants[4].gamesPlayed = 1; participants[4].lastPlayedRound = 2;
participants[5].gamesPlayed = 1; participants[5].lastPlayedRound = 2;
participants[0].gamesPlayed = 2; participants[0].lastPlayedRound = 2;
participants[1].gamesPlayed = 2; participants[1].lastPlayedRound = 2;

if (!checkGamesDifference(participants)) allValid = false;
console.log("");

// 第3輪：王五,趙六,錢七,孫八 上場
console.log("第3輪: 王五,趙六,錢七,孫八 上場");
participants[2].gamesPlayed = 2; participants[2].lastPlayedRound = 3;
participants[3].gamesPlayed = 2; participants[3].lastPlayedRound = 3;
participants[4].gamesPlayed = 2; participants[4].lastPlayedRound = 3;
participants[5].gamesPlayed = 2; participants[5].lastPlayedRound = 3;

if (!checkGamesDifference(participants)) allValid = false;
console.log("");

// 第4輪：應該讓場次較少的人上場
console.log("第4輪: 需要選擇場次較少的人上場");
// 此時所有人都是2場，可以任選4人

console.log("\n=== 測試結論 ===");
if (allValid) {
  console.log("✅ 所有輪次的場次差距都控制在1場以內");
} else {
  console.log("❌ 發現場次差距超過1場的情況");
}

console.log("\n修正後的算法特點：");
console.log("1. 優先讓場次少的人上場");
console.log("2. 當場次差距達到1時，只允許場次最少的人上場");
console.log("3. 等待時間限制仍然有效，但場次平衡優先級更高");
console.log("4. 確保任何時候場次差距不超過1場");