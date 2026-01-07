#!/usr/bin/env node
/**
 * AI 增强一键执行脚本
 * 
 * 用法：
 *   node run-all.js
 *
 * 执行流程：
 *   1. 生成所有任务包 (src/ai/generate-batch.js)
 *   2. 调用 API 处理 (src/ai/process-events-sync.js)
 *   3. 生成报告 (src/index.js)
 */

const { spawn } = require('child_process');
const path = require('path');

const steps = [
    {
        name: '生成任务包',
        script: path.join(__dirname, 'src', 'ai', 'generate-batch.js'),
    },
    {
        name: '调用 AI API',
        script: path.join(__dirname, 'src', 'ai', 'process-events-sync.js'),
    },
    {
        name: '生成报告',
        script: path.join(__dirname, 'src', 'index.js'),
    },
];

async function runStep(step, index) {
    return new Promise((resolve, reject) => {
        console.log('');
        console.log('═'.repeat(60));
        console.log(`📌 步骤 ${index + 1}/${steps.length}: ${step.name}`);
        console.log('═'.repeat(60));
        console.log('');

        const child = spawn(process.execPath, [step.script], {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: process.env,
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log('');
                console.log(`✅ ${step.name} 完成`);
                resolve();
            } else {
                reject(new Error(`${step.name} 失败，退出码: ${code}`));
            }
        });

        child.on('error', (err) => {
            reject(new Error(`${step.name} 启动失败: ${err.message}`));
        });
    });
}

async function main() {
    console.log('');
    console.log('🚀 AI 增强年度报告 - 一键生成');
    console.log('');
    console.log('执行流程：');
    steps.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step.name}`);
    });

    const startTime = Date.now();

    try {
        for (let i = 0; i < steps.length; i++) {
            await runStep(steps[i], i);
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('');
        console.log('═'.repeat(60));
        console.log(`🎉 全部完成！耗时 ${elapsed} 秒`);
        console.log('═'.repeat(60));
        console.log('');
        console.log('📄 报告已生成: report.html');
        console.log('');
    } catch (err) {
        console.error('');
        console.error('❌ 执行失败:', err.message);
        console.error('');
        process.exit(1);
    }
}

main();
