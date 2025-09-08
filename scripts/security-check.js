#!/usr/bin/env node

/**
 * 安全檢查腳本
 * 檢查應用程式的基本安全配置
 */

const fs = require('fs')
const path = require('path')

console.log('🔒 羽球分隊管理系統 - 安全檢查')
console.log('================================\n')

const checks = []

// 檢查環境變數檔案
function checkEnvironmentFiles() {
  const envExample = path.join(process.cwd(), '.env.example')
  const envLocal = path.join(process.cwd(), '.env.local')
  
  if (fs.existsSync(envExample)) {
    checks.push({ name: '✅ .env.example 存在', status: 'pass' })
  } else {
    checks.push({ name: '❌ .env.example 不存在', status: 'fail' })
  }
  
  if (fs.existsSync(envLocal)) {
    checks.push({ name: '✅ .env.local 存在', status: 'pass' })
  } else {
    checks.push({ name: '⚠️  .env.local 不存在', status: 'warn' })
  }
}

// 檢查安全檔案
function checkSecurityFiles() {
  const securityFiles = [
    'middleware.ts',
    'lib/security.ts',
    'SECURITY.md'
  ]
  
  securityFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      checks.push({ name: `✅ ${file} 已安裝`, status: 'pass' })
    } else {
      checks.push({ name: `❌ ${file} 缺失`, status: 'fail' })
    }
  })
}

// 檢查package.json中的安全依賴
function checkSecurityDependencies() {
  const packagePath = path.join(process.cwd(), 'package.json')
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    const securityDeps = [
      'helmet',
      'rate-limiter-flexible',
      'sanitize-html',
      'bcryptjs',
      'jose',
      'zod'
    ]
    
    securityDeps.forEach(dep => {
      if (deps[dep]) {
        checks.push({ name: `✅ ${dep} 已安裝`, status: 'pass' })
      } else {
        checks.push({ name: `❌ ${dep} 未安裝`, status: 'fail' })
      }
    })
  }
}

// 檢查gitignore
function checkGitIgnore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
    if (gitignoreContent.includes('.env')) {
      checks.push({ name: '✅ .env 檔案已在 .gitignore 中', status: 'pass' })
    } else {
      checks.push({ name: '❌ .env 檔案未在 .gitignore 中', status: 'fail' })
    }
  } else {
    checks.push({ name: '⚠️  .gitignore 不存在', status: 'warn' })
  }
}

// 執行檢查
checkEnvironmentFiles()
checkSecurityFiles()
checkSecurityDependencies()
checkGitIgnore()

// 顯示結果
console.log('檢查結果：')
console.log('--------')

let passCount = 0
let failCount = 0
let warnCount = 0

checks.forEach(check => {
  console.log(check.name)
  switch (check.status) {
    case 'pass':
      passCount++
      break
    case 'fail':
      failCount++
      break
    case 'warn':
      warnCount++
      break
  }
})

console.log('\n統計：')
console.log(`✅ 通過: ${passCount}`)
console.log(`❌ 失敗: ${failCount}`)
console.log(`⚠️  警告: ${warnCount}`)

if (failCount > 0) {
  console.log('\n⚠️  發現安全問題需要修復！')
  process.exit(1)
} else if (warnCount > 0) {
  console.log('\n✨ 基本安全配置完成，建議處理警告項目')
  process.exit(0)
} else {
  console.log('\n🎉 所有安全檢查通過！')
  process.exit(0)
}