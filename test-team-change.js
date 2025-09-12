#!/usr/bin/env node

/**
 * 專門測試第一場和第二場隊伍變化的腳本
 * 重點測試8人2場地的情況，確保沒有相同的4人組合
 */

const fs = require('fs');
const path = require('path');

// 讀取並轉換 TypeScript 算法檔案  
function loadRealAlgorithm() {
  const algorithmPath = path.join(__dirname, 'lib/team-allocation-algorithm.ts');
  let content = fs.readFileSync(algorithmPath, 'utf8');
  
  // 轉換 TypeScript 代碼
  content = content
    .replace(/import.*from.*\n/g, '')
    .replace(/export\s+/g, '')
    .replace(/:\s*[A-Za-z<>[\]{}|&\s,]+(?=\s*[=;{()])/g, '')
    .replace(/interface\s+\w+\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
    .replace(/type\s+\w+\s*=.*$/gm, '');
  
  try {
    eval(content);
    return TeamAllocationAlgorithm;
  } catch (error) {
    console.error('載入算法失敗:', error.message);
    return null;
  }
}

// 測試數據
const testParticipants = [
  { id: '1', name: '張三', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '2', name: '李四', skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '3', name: '王五', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '4', name: '趙六', skillLevel: 7, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '5', name: '孫七', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '6', name: '周八', skillLevel: 6, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '7', name: '吳九', skillLevel: 4, gamesPlayed: 0, lastPlayedRound: 0 },
  { id: '8', name: '鄭十', skillLevel: 5, gamesPlayed: 0, lastPlayedRound: 0 },
];

const testCourts = [
  { id: 'court1', name: '場地1', isActive: true },
  { id: 'court2', name: '場地2', isActive: true },
];

function testTeamChange() {
  console.log('🎯 專門測試隊伍變化問題...\n');
  
  const TeamAllocationAlgorithm = loadRealAlgorithm();
  if (!TeamAllocationAlgorithm) {
    console.log('❌ 無法載入算法');
    return false;
  }
  
  const algorithm = new TeamAllocationAlgorithm();
  let currentParticipants = [...testParticipants];
  
  console.log('📋 測試場景：8人2場地');
  console.log('🎯 目標：確保第一場和第二場的隊伍組合不同\n');
  
  try {
    // 第一場分隊
    console.log('=== 第1場分隊 ===');
    const allocation1 = algorithm.allocateTeams(currentParticipants, testCourts, 1);
    
    if (allocation1.length === 0) {
      console.log('❌ 第1場分隊失敗');
      return false;
    }
    
    console.log('✅ 第1場分隊成功');
    printAllocation(allocation1, '第1場');
    
    // 更新參與者狀態（模擬第一場完成後）
    currentParticipants = updateParticipants(currentParticipants, allocation1, 1, 2);
    
    console.log('\n👥 第1場後參與者狀態:');
    currentParticipants.forEach(p => {
      console.log(`  ${p.name}: ${p.gamesPlayed}場 (最後參與第${p.lastPlayedRound}輪)`);
    });
    
    // 第二場分隊
    console.log('\n=== 第2場分隊 ===');
    const allocation2 = algorithm.allocateTeams(currentParticipants, testCourts, 2);
    
    if (allocation2.length === 0) {
      console.log('❌ 第2場分隊失敗');
      return false;
    }
    
    console.log('✅ 第2場分隊成功');
    printAllocation(allocation2, '第2場');
    
    // 詳細分析隊伍變化
    console.log('\n📊 詳細隊伍變化分析:');
    return analyzeTeamChanges(allocation1, allocation2);
    
  } catch (error) {
    console.log(`❌ 測試出錯: ${error.message}`);
    console.log(error.stack);
    return false;
  }
}

function printAllocation(allocations, roundName) {
  allocations.forEach((allocation, index) => {
    console.log(`  ${allocation.courtName}:`);
    allocation.players.forEach(player => {
      console.log(`    - ${player.name} (${player.skillLevel}級)`);
    });
    console.log(`    平均等級: ${allocation.averageSkillLevel}級`);
  });
}

function updateParticipants(participants, allocations, gameNumber, courtsCount) {
  const playingPlayerIds = new Set();
  
  allocations.forEach(allocation => {
    allocation.players.forEach(player => {
      playingPlayerIds.add(player.id);
    });
  });
  
  const currentRound = Math.floor((gameNumber - 1) / courtsCount) + 1;
  
  return participants.map(participant => ({
    ...participant,
    gamesPlayed: playingPlayerIds.has(participant.id) ? 
      participant.gamesPlayed + 1 : participant.gamesPlayed,
    lastPlayedRound: playingPlayerIds.has(participant.id) ? 
      currentRound : participant.lastPlayedRound
  }));
}

function analyzeTeamChanges(allocation1, allocation2) {
  const game1Teams = allocation1.map(a => a.players.map(p => p.name).sort());
  const game2Teams = allocation2.map(a => a.players.map(p => p.name).sort());
  
  console.log('🔍 第1場隊伍組合:');
  game1Teams.forEach((team, i) => {
    console.log(`  場地${i+1}: [${team.join(', ')}]`);
  });
  
  console.log('\n🔍 第2場隊伍組合:');
  game2Teams.forEach((team, i) => {
    console.log(`  場地${i+1}: [${team.join(', ')}]`);
  });
  
  // 檢查是否有完全相同的隊伍
  let hasIdenticalTeams = false;
  let identicalCount = 0;
  
  console.log('\n🔍 重複檢查結果:');
  game1Teams.forEach((team1, i) => {
    game2Teams.forEach((team2, j) => {
      const isIdentical = team1.length === team2.length && 
        team1.every(player => team2.includes(player));
      if (isIdentical) {
        console.log(`❌ 發現完全相同隊伍: 第1場場地${i+1} = 第2場場地${j+1}`);
        console.log(`   相同組合: [${team1.join(', ')}]`);
        hasIdenticalTeams = true;
        identicalCount++;
      }
    });
  });
  
  // 檢查每個場地的變化率
  console.log('\n📈 場地變化分析:');
  let allGoodChanges = true;
  
  for (let i = 0; i < Math.min(game1Teams.length, game2Teams.length); i++) {
    const team1 = game1Teams[i];
    const team2 = game2Teams[i];
    const samePlayerCount = team1.filter(player => team2.includes(player)).length;
    const changeRate = ((4 - samePlayerCount) / 4 * 100).toFixed(1);
    
    console.log(`  場地${i+1}:`);
    console.log(`    第1場: [${team1.join(', ')}]`);
    console.log(`    第2場: [${team2.join(', ')}]`);
    console.log(`    相同玩家: ${samePlayerCount}/4, 變化率: ${changeRate}%`);
    
    if (samePlayerCount === 4) {
      console.log(`    ❌ 完全沒有變化！`);
      allGoodChanges = false;
    } else if (samePlayerCount >= 3) {
      console.log(`    ⚠️  變化太少`);
      allGoodChanges = false;
    } else {
      console.log(`    ✅ 有良好的變化`);
    }
    console.log('');
  }
  
  // 總結
  console.log('🎯 測試結果總結:');
  if (!hasIdenticalTeams && allGoodChanges) {
    console.log('✅ 測試通過！第1場和第2場的隊伍組合都有良好的變化');
    return true;
  } else {
    if (hasIdenticalTeams) {
      console.log(`❌ 測試失敗！發現 ${identicalCount} 個完全相同的隊伍組合`);
    }
    if (!allGoodChanges) {
      console.log('❌ 測試失敗！部分場地的隊伍變化不足');
    }
    return false;
  }
}

// 執行測試
if (require.main === module) {
  const success = testTeamChange();
  console.log(success ? '\n🎉 所有測試通過！' : '\n💥 測試失敗！');
  process.exit(success ? 0 : 1);
}

module.exports = { testTeamChange };