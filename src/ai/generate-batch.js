#!/usr/bin/env node
/**
 * 生成 OpenAI Batch 输入文件（JSONL）：把各类数据切片成可投喂的小包
 *
 * 用法：
 *   OPENAI_MODEL=gpt-4o-mini node src/ai/generate-batch.js
 *
 * 输出：
 *   ai/hot_events_packs.json
 *   ai/batch_all.jsonl
 *
 * 支持的任务类型：
 *   - event_XX: 热点事件解读
 *   - month_XX: 月度主题总结
 *   - award_XX: 年度奖项颁奖词
 *   - user_XX: 用户画像生成
 *   - quote_01: 金句精选
 *   - joker_XX: 乐子人分析（可选，默认关闭）
 *   - sentiment_01: 深度情感分析
 *   - group_summary_01: 本群年度总结（锐评版）
 */

const fs = require('fs');
const path = require('path');

require('./load-env').loadEnv();

const { INPUT_FILE, TARGET_YEAR } = require('../config');
const ChatAnalyzer = require('../analyzer/ChatAnalyzer');
const {
    buildEventBatchRequest,
    buildMonthBatchRequest,
    buildAwardBatchRequest,
    buildUserProfileBatchRequest,
    buildQuoteBatchRequest,
    buildJokerBatchRequest,
    buildSentimentBatchRequest,
    buildGroupSummaryBatchRequest,
} = require('./prompts');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, obj) {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf-8');
}

function writeJsonl(filePath, lines) {
    fs.writeFileSync(filePath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf-8');
}

// ============================================
// 热点事件采样
// ============================================

function generateEventPacks(analyzer, targetYear, model, config) {
    const { hotLimit, msgLimit, perUserCap } = config;
    
    const hotEvents = analyzer.getHotEvents(hotLimit);
    if (!hotEvents.length) {
        console.log('ℹ️  没有检测到热点事件（或数据不足）');
        return { packs: [], requests: [] };
    }

    const packs = hotEvents.map((ev, idx) => {
        const messages = analyzer.getRepresentativeMessagesInRange(ev.startDate, ev.endDate, {
            limit: msgLimit,
            perUserCap,
            keywordHints: (ev.keywords || []).map((k) => k.word).filter(Boolean),
        });
        return {
            id: `event_${String(idx + 1).padStart(2, '0')}`,
            year: targetYear,
            startDate: ev.startDate,
            endDate: ev.endDate,
            peakDate: ev.peakDate,
            totalCount: ev.totalCount,
            peakCount: ev.peakCount,
            keywords_from_local: (ev.keywords || []).map((k) => k.word).filter(Boolean),
            messages,
        };
    });

    const requests = packs.map((p) => ({
        custom_id: p.id,
        method: 'POST',
        url: '/v1/responses',
        body: buildEventBatchRequest({
            model,
            year: p.year,
            time_range: `${p.startDate} ~ ${p.endDate}`,
            message_count: p.totalCount,
            keywords_from_local: p.keywords_from_local,
            messages: p.messages,
        }),
    }));

    console.log(`📰 热点事件: ${packs.length} 个`);
    return { packs, requests };
}

// ============================================
// 月度主题采样
// ============================================

function generateMonthPacks(analyzer, targetYear, model, config) {
    const { monthMsgLimit, perUserCap } = config;
    
    const monthlyKeywords = analyzer.getMonthlyKeywords(6);
    const packs = [];
    const requests = [];

    for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        const startDate = `${targetYear}-${monthStr}-01`;
        const endDate = `${targetYear}-${monthStr}-${new Date(targetYear, month, 0).getDate()}`;
        
        const messages = analyzer.getRepresentativeMessagesInRange(startDate, endDate, {
            limit: monthMsgLimit,
            perUserCap,
        });
        
        if (!messages.length) continue;

        const kwData = monthlyKeywords.find((m) => m.month === month) || { keywords: [] };
        const keywords = (kwData.keywords || []).map((k) => k.word).filter(Boolean);

        const pack = {
            id: `month_${monthStr}`,
            year: targetYear,
            month,
            startDate,
            endDate,
            keywords_from_local: keywords,
            message_count: messages.length,
            messages,
        };
        packs.push(pack);

        requests.push({
            custom_id: pack.id,
            method: 'POST',
            url: '/v1/responses',
            body: buildMonthBatchRequest({
                model,
                year: targetYear,
                month,
                message_count: messages.length,
                keywords_from_local: keywords,
                messages,
            }),
        });
    }

    console.log(`📅 月度主题: ${packs.length} 个月`);
    return { packs, requests };
}

// ============================================
// 年度奖项采样
// ============================================

function generateAwardPacks(analyzer, targetYear, model, config) {
    const { awardMsgLimit, perUserCap } = config;
    
    const awards = analyzer.getAwards();
    if (!awards.length) {
        console.log('ℹ️  没有检测到年度奖项（或数据不足）');
        return { packs: [], requests: [] };
    }

    const packs = [];
    const requests = [];

    awards.forEach((award, idx) => {
        // 跳过多用户奖项（如年度CP）
        if (award.users && !award.user) return;
        
        const userName = award.user?.name || award.userLabel || '神秘群友';
        const userId = award.user?.id || userName;
        
        // 获取该用户的代表消息
        const userMessages = analyzer.getUserSampleMessages?.(userId, awardMsgLimit) || [];
        
        // 收集用户统计数据
        const stats = {
            '奖项数值': award.value || 'N/A',
            '奖项描述': award.desc || 'N/A',
        };

        const pack = {
            id: `award_${String(idx + 1).padStart(2, '0')}`,
            year: targetYear,
            award_name: award.title,
            award_icon: award.icon,
            user_name: userName,
            stats,
            sample_messages: userMessages,
        };
        packs.push(pack);

        requests.push({
            custom_id: pack.id,
            method: 'POST',
            url: '/v1/responses',
            body: buildAwardBatchRequest({
                model,
                award_name: award.title,
                award_icon: award.icon,
                user_name: userName,
                stats,
                sample_messages: userMessages,
            }),
        });
    });

    console.log(`🏆 年度奖项: ${packs.length} 个`);
    return { packs, requests };
}

// ============================================
// 用户画像采样
// ============================================

function generateUserProfilePacks(analyzer, targetYear, model, config) {
    const { userProfileLimit, userMsgLimit } = config;
    
    const userRanking = analyzer.getUserRanking(userProfileLimit);
    if (!userRanking.length) {
        console.log('ℹ️  没有检测到活跃用户（或数据不足）');
        return { packs: [], requests: [] };
    }

    const packs = [];
    const requests = [];

    userRanking.forEach((user, idx) => {
        const userName = user.name || user.id || '神秘群友';
        const userId = user.id || userName;
        
        // 获取该用户的代表消息
        const userMessages = analyzer.getUserSampleMessages?.(userId, userMsgLimit) || [];
        
        // 收集用户统计数据
        const userStats = analyzer.getUserStats?.(userId) || {};
        const stats = {
            '总发言数': user.count || userStats.count || 'N/A',
            '日均发言': userStats.dailyAvg ? userStats.dailyAvg.toFixed(1) : 'N/A',
            '活跃天数': userStats.activeDays || 'N/A',
            '深夜发言数': userStats.nightCount || 'N/A',
            '最爱用词': (userStats.topWords || []).slice(0, 3).join('、') || 'N/A',
        };

        const pack = {
            id: `user_${String(idx + 1).padStart(2, '0')}`,
            year: targetYear,
            user_name: userName,
            user_id: userId,
            stats,
            sample_messages: userMessages,
        };
        packs.push(pack);

        requests.push({
            custom_id: pack.id,
            method: 'POST',
            url: '/v1/responses',
            body: buildUserProfileBatchRequest({
                model,
                user_name: userName,
                stats,
                sample_messages: userMessages,
            }),
        });
    });

    console.log(`👤 用户画像: ${packs.length} 个`);
    return { packs, requests };
}

// ============================================
// 金句精选采样
// ============================================

function generateQuotePack(analyzer, targetYear, model, config) {
    const { quoteCandidateLimit } = config;
    
    // 获取候选金句：高热度、高表情符号、高回复的消息
    const candidates = analyzer.getQuoteCandidates?.(quoteCandidateLimit) || [];
    
    if (!candidates.length) {
        // 回退：从热点事件中提取代表消息
        const hotEvents = analyzer.getHotEvents(6);
        hotEvents.forEach((ev) => {
            const msgs = analyzer.getRepresentativeMessagesInRange(ev.startDate, ev.endDate, {
                limit: 10,
                perUserCap: 3,
            });
            candidates.push(...msgs);
        });
    }

    if (!candidates.length) {
        console.log('ℹ️  没有足够的金句候选（或数据不足）');
        return { packs: [], requests: [] };
    }

    // 去重并限制数量
    const uniqueCandidates = [...new Set(candidates)].slice(0, quoteCandidateLimit);

    const pack = {
        id: 'quote_01',
        year: targetYear,
        candidate_count: uniqueCandidates.length,
        candidates: uniqueCandidates,
    };

    const request = {
        custom_id: pack.id,
        method: 'POST',
        url: '/v1/responses',
        body: buildQuoteBatchRequest({
            model,
            year: targetYear,
            candidates: uniqueCandidates,
        }),
    };

    console.log(`💬 金句候选: ${uniqueCandidates.length} 条`);
    return { packs: [pack], requests: [request] };
}

// ============================================
// 乐子人分析采样
// ============================================

function generateJokerPacks(analyzer, targetYear, model, config) {
    const { jokerLimit, jokerMsgLimit } = config;
    
    const jokers = analyzer.getJokerAnalysis?.() || [];
    if (!jokers.length) {
        console.log('ℹ️  没有检测到乐子人（或数据不足）');
        return { packs: [], requests: [] };
    }

    const packs = [];
    const requests = [];

    // 只取前 jokerLimit 个乐子人进行 AI 分析
    jokers.slice(0, jokerLimit).forEach((joker, idx) => {
        const userName = joker.name || joker.id || '神秘群友';
        const userId = joker.id || userName;
        
        // 获取该用户的代表消息
        const userMessages = analyzer.getUserSampleMessages?.(userId, jokerMsgLimit) || [];
        
        // 收集用户统计数据（包含乐子人相关指标）
        const userStats = analyzer.getUserStats?.(userId) || {};
        const stats = {
            '乐子指数': joker.jokerIndex || 'N/A',
            '哈哈次数': joker.laughCount || userStats.laughCount || 'N/A',
            '666次数': joker.sixCount || userStats.sixCount || 'N/A',
            '表情包数': joker.emojiCount || userStats.emojiCount || 'N/A',
            '复读次数': userStats.echoCount || 'N/A',
            '总发言数': userStats.count || 'N/A',
            '回复次数': userStats.replyCount || 'N/A',
        };

        const pack = {
            id: `joker_${String(idx + 1).padStart(2, '0')}`,
            year: targetYear,
            user_name: userName,
            user_id: userId,
            stats,
            sample_messages: userMessages,
        };
        packs.push(pack);

        requests.push({
            custom_id: pack.id,
            method: 'POST',
            url: '/v1/responses',
            body: buildJokerBatchRequest({
                model,
                user_name: userName,
                stats,
                sample_messages: userMessages,
            }),
        });
    });

    console.log(`🤡 乐子人分析: ${packs.length} 个`);
    return { packs, requests };
}

// ============================================
// 情感分析采样
// ============================================

function generateSentimentPack(analyzer, targetYear, model, config) {
    const { sentimentMsgLimit } = config;
    
    // 获取本地情感分析结果
    const localSentiment = analyzer.getSentimentSummary?.() || null;
    
    // 采样各月消息用于AI分析
    const messages = [];
    for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        const startDate = `${targetYear}-${monthStr}-01`;
        const endDate = `${targetYear}-${monthStr}-${new Date(targetYear, month, 0).getDate()}`;
        
        const monthMsgs = analyzer.getRepresentativeMessagesInRange(startDate, endDate, {
            limit: Math.ceil(sentimentMsgLimit / 12),
            perUserCap: 2,
        });
        messages.push(...monthMsgs);
    }

    if (!messages.length) {
        console.log('ℹ️  没有足够的消息用于情感分析');
        return { packs: [], requests: [] };
    }

    const pack = {
        id: 'sentiment_01',
        year: targetYear,
        local_sentiment: localSentiment,
        message_count: messages.length,
        messages,
    };

    const request = {
        custom_id: pack.id,
        method: 'POST',
        url: '/v1/responses',
        body: buildSentimentBatchRequest({
            model,
            year: targetYear,
            local_sentiment: localSentiment,
            messages,
        }),
    };

    console.log(`🎭 情感采样: ${messages.length} 条`);
    return { packs: [pack], requests: [request] };
}

// ============================================
// 本群年度总结采样
// ============================================

function generateGroupSummaryPack(analyzer, targetYear, model, config, monthPacks) {
    const { groupSummaryMsgLimit } = config;
    
    // 获取群名
    const chatName = analyzer.getChatName?.() || analyzer.chatName || '神秘群聊';
    
    // 获取基础统计
    const stats = {
        '总消息数': analyzer.stats?.totalMessages || 'N/A',
        '活跃天数': analyzer.stats?.activeDays || 'N/A',
        '群成员数': analyzer.stats?.totalUsers || 'N/A',
        '日均消息': analyzer.stats?.totalMessages && analyzer.stats?.activeDays
            ? (analyzer.stats.totalMessages / analyzer.stats.activeDays).toFixed(1)
            : 'N/A',
        '最热月份': analyzer.stats?.monthlyData
            ? Object.entries(analyzer.stats.monthlyData).sort((a, b) => b[1] - a[1])[0]?.[0] + '月'
            : 'N/A',
        '消息类型分布': analyzer.stats?.messageTypes
            ? Object.entries(analyzer.stats.messageTypes)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([k, v]) => `${k}:${v}`)
                .join(', ')
            : 'N/A',
    };
    
    // 获取活跃用户排行
    const userRanking = analyzer.getUserRanking?.(10) || [];
    const topUsers = userRanking.map(u => ({
        name: u.name || u.id || '神秘群友',
        count: u.count || 0,
    }));
    
    // 从月度主题中提取已有信息
    const monthlyThemes = (monthPacks || []).map(p => ({
        month: p.month,
        theme: p.keywords_from_local?.slice(0, 3)?.join('、') || '无主题',
    }));
    
    // 采样全年代表消息
    const messages = [];
    for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        const startDate = `${targetYear}-${monthStr}-01`;
        const endDate = `${targetYear}-${monthStr}-${new Date(targetYear, month, 0).getDate()}`;
        
        const monthMsgs = analyzer.getRepresentativeMessagesInRange(startDate, endDate, {
            limit: Math.ceil(groupSummaryMsgLimit / 12),
            perUserCap: 3,
        });
        messages.push(...monthMsgs);
    }

    if (!messages.length && !topUsers.length) {
        console.log('ℹ️  没有足够的数据用于本群总结');
        return { packs: [], requests: [] };
    }

    const pack = {
        id: 'group_summary_01',
        year: targetYear,
        chat_name: chatName,
        stats,
        top_users: topUsers,
        monthly_themes: monthlyThemes,
        sample_messages: messages,
    };

    const request = {
        custom_id: pack.id,
        method: 'POST',
        url: '/v1/responses',
        body: buildGroupSummaryBatchRequest({
            model,
            year: targetYear,
            chat_name: chatName,
            stats,
            top_users: topUsers,
            sample_messages: messages,
            monthly_themes: monthlyThemes,
        }),
    };

    console.log(`📋 本群总结: 1 个（含 ${messages.length} 条采样消息）`);
    return { packs: [pack], requests: [request] };
}

// ============================================
// 主函数
// ============================================

function main() {
    const inputFile = process.env.INPUT_FILE || INPUT_FILE || 'data.json';
    const targetYear = Number(process.env.TARGET_YEAR || TARGET_YEAR || new Date().getFullYear());
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const outDir = path.resolve(process.cwd(), process.env.AI_OUT_DIR || 'ai');
    ensureDir(outDir);

    const inputPath = path.resolve(process.cwd(), inputFile);
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ 找不到输入文件: ${inputPath}`);
        process.exit(1);
    }

    console.log('📂 读取数据…');
    const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    console.log('📊 分析数据…');
    const analyzer = new ChatAnalyzer(rawData, targetYear);

    // 配置参数
    const config = {
        // 热点事件
        hotLimit: Number(process.env.HOT_EVENTS_LIMIT || 6),
        msgLimit: Number(process.env.AI_EVENT_MSG_LIMIT || 40),
        perUserCap: Number(process.env.AI_EVENT_PER_USER_CAP || 6),
        // 月度主题
        monthMsgLimit: Number(process.env.AI_MONTH_MSG_LIMIT || 30),
        // 奖项
        awardMsgLimit: Number(process.env.AI_AWARD_MSG_LIMIT || 10),
        // 用户画像
        userProfileLimit: Number(process.env.AI_USER_PROFILE_LIMIT || 10),
        userMsgLimit: Number(process.env.AI_USER_MSG_LIMIT || 15),
        // 金句
        quoteCandidateLimit: Number(process.env.AI_QUOTE_CANDIDATE_LIMIT || 50),
        // 情感
        sentimentMsgLimit: Number(process.env.AI_SENTIMENT_MSG_LIMIT || 60),
        // 本群总结
        groupSummaryMsgLimit: Number(process.env.AI_GROUP_SUMMARY_MSG_LIMIT || 80),
    };
    
    const enableJoker = String(process.env.AI_ENABLE_JOKER || '').trim() === '1';
    if (enableJoker) {
        config.jokerLimit = Number(process.env.AI_JOKER_LIMIT || 5);
        config.jokerMsgLimit = Number(process.env.AI_JOKER_MSG_LIMIT || 20);
    }

    console.log('');
    console.log('🤖 生成 AI 任务包…');
    console.log('');

    // 收集所有任务
    const allPacks = {};
    const allRequests = [];

    // 1. 热点事件
    const eventResult = generateEventPacks(analyzer, targetYear, model, config);
    allPacks.events = eventResult.packs;
    allRequests.push(...eventResult.requests);

    // 2. 月度主题
    const monthResult = generateMonthPacks(analyzer, targetYear, model, config);
    allPacks.months = monthResult.packs;
    allRequests.push(...monthResult.requests);

    // 3. 年度奖项
    const awardResult = generateAwardPacks(analyzer, targetYear, model, config);
    allPacks.awards = awardResult.packs;
    allRequests.push(...awardResult.requests);

    // 4. 用户画像
    const userResult = generateUserProfilePacks(analyzer, targetYear, model, config);
    allPacks.users = userResult.packs;
    allRequests.push(...userResult.requests);

    // 5. 金句精选
    const quoteResult = generateQuotePack(analyzer, targetYear, model, config);
    allPacks.quotes = quoteResult.packs;
    allRequests.push(...quoteResult.requests);

    // 6. 乐子人分析
    if (enableJoker) {
        const jokerResult = generateJokerPacks(analyzer, targetYear, model, config);
        allPacks.jokers = jokerResult.packs;
        allRequests.push(...jokerResult.requests);
    } else {
        allPacks.jokers = [];
        console.log('🤡 乐子人分析: 已关闭（设置 AI_ENABLE_JOKER=1 可开启）');
    }

    // 7. 情感分析
    const sentimentResult = generateSentimentPack(analyzer, targetYear, model, config);
    allPacks.sentiment = sentimentResult.packs;
    allRequests.push(...sentimentResult.requests);

    // 8. 本群年度总结（锐评版）
    const groupSummaryResult = generateGroupSummaryPack(analyzer, targetYear, model, config, monthResult.packs);
    allPacks.groupSummary = groupSummaryResult.packs;
    allRequests.push(...groupSummaryResult.requests);

    // 输出统计
    console.log('');
    console.log(`📦 共 ${allRequests.length} 个 AI 任务`);

    // 写入文件
    const packsPath = path.join(outDir, 'all_packs.json');
    writeJson(packsPath, allPacks);

    const jsonlPath = path.join(outDir, 'batch_all.jsonl');
    writeJsonl(jsonlPath, allRequests);

    // 兼容：仍然输出 hot_events_packs.json（旧版兼容）
    if (allPacks.events?.length) {
        const legacyPath = path.join(outDir, 'hot_events_packs.json');
        writeJson(legacyPath, allPacks.events);
    }

    console.log('');
    console.log('✅ 已生成：');
    console.log(`   - ${packsPath}`);
    console.log(`   - ${jsonlPath}`);
    console.log('');
    console.log('下一步：');
    console.log('  node src/ai/process-events-sync.js');
    console.log('');
    console.log('或使用 Batch API：');
    console.log('  1) 上传 JSONL 得到 file_id');
    console.log('  2) 创建 batch: endpoint=/v1/responses, input_file_id=...');
}

if (require.main === module) main();

module.exports = {
    generateEventPacks,
    generateMonthPacks,
    generateAwardPacks,
    generateUserProfilePacks,
    generateQuotePack,
    generateJokerPacks,
    generateSentimentPack,
    generateGroupSummaryPack,
};
