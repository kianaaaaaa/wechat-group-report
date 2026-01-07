/**
 * 年度报告生成器 - 数据分析模块
 * @module analyzer/ChatAnalyzer
 */

const { STOP_WORDS } = require('../config');

// === Social / NLP-lite parameters (tunable) ===
const REPLY_WINDOW_MS = 5 * 60 * 1000;      // 多久内算“接话/回复”
const ECHO_WINDOW_MS = 10 * 60 * 1000;      // 多久内算“复读”
const IMPACT_WINDOW_MS = 10 * 60 * 1000;    // “引起轰动”观察窗口：发言后 N 分钟
const APPEAR_GAP_MS = 30 * 60 * 1000;       // “每次出来”：同一人两次出场最小间隔

// === NLP-lite parameters (tunable) ===
const KEYWORD_MIN_LEN = 2;
const KEYWORD_MAX_LEN = 12;
const KEYWORD_MAX_CN_SEQ = 24;              // 单段中文串的最大参与长度（过长会产生大量 n-gram）
const KEYWORD_NGRAM_MIN = 2;
const KEYWORD_NGRAM_MAX = 4;
const KEYWORD_MAX_TOKENS_PER_MSG = 60;      // 每条消息最多产出多少关键词（控制性能/噪声）
const KEYWORD_MAX_GRAMS_PER_N = 6;          // 长中文串每个 n 最多取多少个 gram（均匀采样）
const KEYWORD_MIN_COUNT = 2;                // 过滤掉全年仅出现 1 次的词，减少噪声

const SENTIMENT_MIN_TEXT_MSGS = 30;          // 参与“正能量/丧气王”评选的最低文本消息数

function normalizeText(text) {
    if (!text) return '';
    return String(text).replace(/\s+/g, ' ').trim();
}

function stripMentions(text) {
    // 微信导出的 @提及，常见形式：@张三 或 @张三 （含一些特殊空白字符）
    // 注意：群昵称可能包含空格/标点（如“自在飞花轻似梦 无边丝雨细如愁”），所以用“提及分隔符”来截断。
    // 这里强制要求后面带有 U+2005 等特殊空白（微信 @ 提及插入），避免误伤 email/URL。
    return String(text ?? '').replace(/@[^\u2005\u2006\u2009\u202f\u00a0\r\n\t]{1,80}[\u2005\u2006\u2009\u202f\u00a0]+[\s\u2005\u2006\u2009\u202f\u00a0]*/g, ' ');
}

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

function percentile(sortedNums, p) {
    if (!sortedNums.length) return 0;
    const idx = clamp(Math.floor((sortedNums.length - 1) * p), 0, sortedNums.length - 1);
    return sortedNums[idx];
}

function stddev(nums) {
    if (!nums.length) return 0;
    const mean = nums.reduce((s, x) => s + x, 0) / nums.length;
    const v = nums.reduce((s, x) => s + (x - mean) * (x - mean), 0) / nums.length;
    return Math.sqrt(v);
}

function isAllSameChar(s) {
    if (!s || s.length <= 1) return true;
    const c0 = s[0];
    for (let i = 1; i < s.length; i++) if (s[i] !== c0) return false;
    return true;
}

function isStopToken(token) {
    if (!token) return true;
    if (token.length < KEYWORD_MIN_LEN || token.length > KEYWORD_MAX_LEN) return true;
    if (STOP_WORDS.has(token)) return true;
    if (/^\d+$/.test(token)) return true;
    if (isAllSameChar(token)) return true;
    if (/^[哈呵嘿嘻呜嗯哦啊哎]+$/.test(token)) return true;
    if (/[?？!！]+/.test(token)) return true;
    return false;
}

function emitKeyword(map, token, inc = 1) {
    if (!token) return;
    const t = String(token).trim();
    if (!t) return;
    if (isStopToken(t)) return;
    map[t] = (map[t] || 0) + inc;
}

function extractKeywords(text) {
    const out = [];
    const seen = new Set();
    const raw = normalizeText(text);
    if (!raw) return out;

    const pushToken = (t) => {
        if (!t) return;
        if (out.length >= KEYWORD_MAX_TOKENS_PER_MSG) return;
        const token = String(t).trim();
        if (!token) return;
        if (isStopToken(token)) return;
        if (seen.has(token)) return;
        seen.add(token);
        out.push(token);
    };

    // 1) English / numbers
    const lower = raw.toLowerCase();
    const latin = lower.match(/[a-z][a-z0-9_]{1,15}/g);
    if (latin) {
        latin.forEach(pushToken);
    }

    // 2) Chinese + digits mixed tokens (e.g. 双11 / 618 / 双十一)
    const mixed = raw.match(/[\u4e00-\u9fa5]{1,6}\d{1,4}[\u4e00-\u9fa5]{0,4}/g);
    if (mixed) {
        mixed.forEach(pushToken);
    }

    // 3) Chinese sequences: take short ones as-is; for long ones generate n-grams
    const cnSeqs = raw.match(/[\u4e00-\u9fa5]{2,}/g);
    if (cnSeqs) {
        cnSeqs.forEach((seq) => {
            const s = String(seq);
            // 直接把“短语”作为候选：长度允许到 KEYWORD_MAX_LEN（默认 12）
            if (s.length <= KEYWORD_MAX_LEN) pushToken(s);

            const capped = s.length > KEYWORD_MAX_CN_SEQ ? s.slice(0, KEYWORD_MAX_CN_SEQ) : s;
            // 对“长句子”不要大量产出 2-gram（会让词云看起来全是两个字）
            const minN = capped.length >= 7 ? Math.max(3, KEYWORD_NGRAM_MIN) : KEYWORD_NGRAM_MIN;
            for (let n = minN; n <= KEYWORD_NGRAM_MAX; n++) {
                if (capped.length < n) continue;
                const total = capped.length - n + 1;
                const step = Math.max(1, Math.ceil(total / KEYWORD_MAX_GRAMS_PER_N));
                for (let i = 0, taken = 0; i <= capped.length - n && taken < KEYWORD_MAX_GRAMS_PER_N; i += step, taken++) {
                    pushToken(capped.slice(i, i + n));
                }
            }
        });
    }

    return out;
}

function scoreSentiment(text) {
    const raw = normalizeText(text);
    if (!raw) return { score: 0, pos: 0, neg: 0 };
    const lower = raw.toLowerCase();

    const posPatterns = [
        /哈哈|嘿嘿|嘻嘻|笑死|开心|高兴|快乐|好耶|太好了|太棒了|棒|赞|牛|厉害|不错|爱了|喜欢|感谢|谢谢/g,
        /666|6666|yyds|nice|good|great|love|happy/g,
        /[😂🤣😄😁😆😊😍🥰😘👍💪🎉✨❤️]+/g,
    ];
    const negPatterns = [
        /累|烦|烦死|无语|崩溃|难受|难过|郁闷|emo|抑郁|生气|气死|垃圾|烂|讨厌|恶心|痛苦|死了/g,
        /wtf|shit|fxxk|fuck|hate|sad|angry/g,
        /[😢😭😡🤬😞😔😩😫💔]+/g,
    ];

    let pos = 0;
    let neg = 0;
    posPatterns.forEach((re) => { const m = lower.match(re); if (m) pos += m.length; });
    negPatterns.forEach((re) => { const m = lower.match(re); if (m) neg += m.length; });

    // 轻微加权：感叹号倾向正向，省略号倾向负向/无奈（非常弱）
    const exclaim = (raw.match(/[!！]/g) || []).length;
    const dots = (raw.match(/\.{3,}|…{1,}/g) || []).length;
    pos += Math.min(2, exclaim > 0 ? 1 : 0);
    neg += Math.min(1, dots > 0 ? 1 : 0);

    return { score: pos - neg, pos, neg };
}

function guessImageMimeFromBase64(base64) {
    const b64 = String(base64 || '');
    if (!b64) return null;
    if (b64.startsWith('data:')) return b64.slice(5).split(';', 1)[0] || null;
    if (b64.startsWith('iVBOR')) return 'image/png';
    if (b64.startsWith('R0lGOD')) return 'image/gif';
    if (b64.startsWith('/9j/')) return 'image/jpeg';
    return 'image/jpeg';
}

function toDataUrl(base64) {
    const b64 = String(base64 || '');
    if (!b64) return null;
    if (b64.startsWith('data:')) return b64;
    const mime = guessImageMimeFromBase64(b64);
    return mime ? `data:${mime};base64,${b64}` : null;
}

/**
 * 群聊数据分析器
 * 负责解析原始聊天数据并生成各类统计信息
 */
class ChatAnalyzer {
    /**
     * @param {Object} rawData - 原始群聊数据
     * @param {number} targetYear - 目标统计年份
     */
    constructor(rawData, targetYear) {
        this.rawData = rawData;
        this.targetYear = targetYear;
        this.messages = rawData.messages || [];
        this.chatName = rawData.session?.displayName || '未知群聊';

        // 成员原名/头像索引（用于：不显示备注、显示头像）
        this.groupMembers = rawData.groupMembers || [];
        this.avatars = rawData.avatars || {};
        this._memberByUsername = new Map();
        this._usernameByAlias = new Map(); // originalName/remark/displayName -> username
        this._avatarKeyByUsername = Object.create(null); // username -> avatarKey
        this.userMeta = Object.create(null); // username -> { id, name, avatarUrl }

        this.groupMembers.forEach((m) => {
            if (!m || !m.username) return;
            this._memberByUsername.set(m.username, m);
        });

        const addAlias = (alias, username) => {
            const key = String(alias || '').trim();
            if (!key || !username) return;
            if (!this._usernameByAlias.has(key)) this._usernameByAlias.set(key, username);
        };

        // Prefer originalName; also index remark/displayName for mention resolution.
        this.groupMembers.forEach((m) => {
            if (!m || !m.username) return;
            addAlias(m.originalName, m.username);
            addAlias(m.remark, m.username);
        });
        Object.entries(this.avatars).forEach(([avatarKey, a]) => {
            addAlias(a?.displayName, avatarKey);
        });
        
        // 初始化统计数据结构
        this.stats = {
            totalMessages: 0,
            uniqueUsers: new Set(),
            activeDays: new Set(),
            monthlyData: new Array(12).fill(0),
            hourlyData: new Array(24).fill(0),
            weekdayData: new Array(7).fill(0),
            dailyData: {},
            userStats: {},
            messageTypes: {},
            wordFreq: {},
            monthlyWordFreq: new Array(12).fill(null).map(() => Object.create(null)),
            dailyWordFreq: Object.create(null), // YYYY-MM-DD -> { word: count }
            nightOwls: {},
            earlyBirds: {},
            interactions: {},
            laughCount: {},
            sixCount: {},
            emojiCount: {},
            repeatedTextFreq: {},
            longestMessage: null,
            firstMessage: null,
            lastMessage: null,
            mostActiveDay: null,
            sentiment: {
                textMsgCount: 0,
                posMsgCount: 0,
                negMsgCount: 0,
                scoreSum: 0,
            },
        };
        
        this.analyze();
    }

    _resolveUsernameFromName(nameOrAlias) {
        const key = String(nameOrAlias || '').trim();
        if (!key) return null;
        if (this.userMeta[key]) return key;
        return this._usernameByAlias.get(key) || null;
    }

    _ensureUserMeta(username, msg = {}) {
        const id = String(username || '').trim();
        if (!id) return { id: null, name: '神秘群友', avatarUrl: null };

        const existing = this.userMeta[id];
        const member = this._memberByUsername.get(id);
        const name = (member && member.originalName)
            || existing?.name
            || (msg && msg.senderDisplayName)
            || '神秘群友';

        const avatarKey = (msg && msg.senderAvatarKey)
            || this._avatarKeyByUsername[id]
            || id;
        this._avatarKeyByUsername[id] = avatarKey;

        const avatarBase64 = this.avatars?.[avatarKey]?.base64;
        const avatarUrl = existing?.avatarUrl || toDataUrl(avatarBase64);

        this.userMeta[id] = { id, name, avatarUrl };
        return this.userMeta[id];
    }

    _asUser(userKey) {
        const key = String(userKey || '').trim();
        if (!key) return { id: null, name: '神秘群友' };
        if (this.userMeta[key]) return { id: key, name: this.userMeta[key].name };
        const resolved = this._resolveUsernameFromName(key);
        if (resolved && this.userMeta[resolved]) return { id: resolved, name: this.userMeta[resolved].name };
        return { id: null, name: key };
    }

    getUserMeta() {
        const out = Object.create(null);
        Object.entries(this.userMeta).forEach(([id, meta]) => {
            out[id] = { name: meta?.name || id, avatarUrl: meta?.avatarUrl || null };
        });
        return out;
    }
    
    /**
     * 执行完整的数据分析
     */
    analyze() {
        console.log('📊 开始分析数据...');
        const startTime = Date.now();

        // 社交关系 / 复读 / 高冷帝：基于“消息顺序 + 时间窗”的线性统计
        let lastMsgMeta = null; // { sender, timeMs, textNorm }
        const processedCountBySender = {};
        let processedTotal = 0;
        const impactEvents = []; // { expireTimeMs, sender, startTotal, startSelf }
        let impactEventIndex = 0;
        const lastAppearTimeBySender = {};

        const flushExpiredImpactEvents = (nowMs) => {
            while (impactEventIndex < impactEvents.length && impactEvents[impactEventIndex].expireTimeMs <= nowMs) {
                const ev = impactEvents[impactEventIndex++];
                const totalDelta = processedTotal - ev.startTotal;
                const selfDelta = (processedCountBySender[ev.sender] || 0) - ev.startSelf;
                const othersDelta = Math.max(0, totalDelta - selfDelta);
                const userStat = this.stats.userStats[ev.sender];
                if (userStat) {
                    userStat.impactSum += othersDelta;
                    userStat.impactEvents++;
                    userStat.impactMax = Math.max(userStat.impactMax, othersDelta);
                }
            }
        };
        
        this.messages.forEach((msg) => {
            const date = new Date(msg.createTime * 1000);
            if (date.getFullYear() !== this.targetYear) return;

            const timeMs = date.getTime();
            flushExpiredImpactEvents(timeMs);
            
            this.stats.totalMessages++;
            
            const senderUsername = msg.senderUsername || msg.senderAvatarKey || msg.senderDisplayName || '神秘群友';
            const senderMeta = this._ensureUserMeta(senderUsername, msg);
            const sender = senderMeta.id || '神秘群友';
            const content = msg.content || '';
            const msgType = msg.type || '未知';
            const hour = date.getHours();
            const month = date.getMonth();
            const weekday = date.getDay();
            const dateStr = this.formatDate(date);
            const textNorm = msgType === '文本消息' ? normalizeText(content) : '';
            
            // 基础统计
            this._updateBasicStats(sender, dateStr, month, hour, weekday, msgType);
            
            // 用户统计
            this._updateUserStats(sender, hour, dateStr, msgType, content, msg, date);

            // === 社交关系补充指标 ===
            const userStat = this.stats.userStats[sender];

            // 1) “回复/接话”：与上一条不同人，且时间间隔较短
            if (lastMsgMeta && lastMsgMeta.sender !== sender && (timeMs - lastMsgMeta.timeMs) <= REPLY_WINDOW_MS) {
                userStat.replyCount++;
            }

            // 2) “引用消息”使用次数
            if (msgType === '引用消息') {
                userStat.quoteCount++;
            }

            // 3) 复读机：复读上一条（不同人）文本
            if (textNorm && lastMsgMeta && lastMsgMeta.sender !== sender && lastMsgMeta.textNorm && (timeMs - lastMsgMeta.timeMs) <= ECHO_WINDOW_MS) {
                if (textNorm === lastMsgMeta.textNorm) {
                    userStat.echoCount++;
                }
            }

            // 4) 群内“完全重复”的文本统计（年度复读最多的一句话）
            if (textNorm) {
                this.stats.repeatedTextFreq[textNorm] = (this.stats.repeatedTextFreq[textNorm] || 0) + 1;
            }
            
            // 消息内容分析
            this._analyzeMessageContent(sender, msgType, content, msg, date);
            
            // 时间段统计
            this._updateTimeStats(sender, hour);
            
            // 首尾消息记录
            this._updateFirstLastMessage(msg, sender, date);

            // === 高冷帝：按“出场事件”统计发言后的带动量（10分钟内他人消息数）===
            processedTotal++;
            processedCountBySender[sender] = (processedCountBySender[sender] || 0) + 1;

            const lastAppear = lastAppearTimeBySender[sender];
            if (lastAppear == null || (timeMs - lastAppear) >= APPEAR_GAP_MS) {
                impactEvents.push({
                    expireTimeMs: timeMs + IMPACT_WINDOW_MS,
                    sender,
                    startTotal: processedTotal,
                    startSelf: processedCountBySender[sender],
                });
                lastAppearTimeBySender[sender] = timeMs;
            }

            lastMsgMeta = { sender, timeMs, textNorm };
        });

        // flush remaining impact events (year end truncation)
        flushExpiredImpactEvents(Number.POSITIVE_INFINITY);
        
        // 计算最活跃的一天
        this._calculateMostActiveDay();
        
        console.log(`✅ 分析完成! 耗时 ${Date.now() - startTime}ms`);
        console.log(`   - 总消息数: ${this.stats.totalMessages}`);
        console.log(`   - 活跃用户: ${this.stats.uniqueUsers.size}`);
    }
    
    /**
     * 更新基础统计数据
     */
    _updateBasicStats(sender, dateStr, month, hour, weekday, msgType) {
        this.stats.uniqueUsers.add(sender);
        this.stats.activeDays.add(dateStr);
        this.stats.monthlyData[month]++;
        this.stats.hourlyData[hour]++;
        this.stats.weekdayData[weekday]++;
        this.stats.dailyData[dateStr] = (this.stats.dailyData[dateStr] || 0) + 1;
        this.stats.messageTypes[msgType] = (this.stats.messageTypes[msgType] || 0) + 1;
    }
    
    /**
     * 更新用户统计数据
     */
    _updateUserStats(sender, hour, dateStr, msgType, content, msg, date) {
        // 用户统计初始化
        if (!this.stats.userStats[sender]) {
            this.stats.userStats[sender] = {
                count: 0, 
                textLength: 0, 
                types: {}, 
                hours: new Array(24).fill(0),
                activeDays: new Set(), 
                laughCount: 0, 
                sixCount: 0, 
                emojiCount: 0,
                questionCount: 0, 
                mentionCount: 0, 
                nightCount: 0, 
                withdrawCount: 0,
                quoteCount: 0,
                replyCount: 0,
                echoCount: 0,
                impactSum: 0,
                impactEvents: 0,
                impactMax: 0,
                sentimentTextCount: 0,
                sentimentScoreSum: 0,
                sentimentPosMsgCount: 0,
                sentimentNegMsgCount: 0,
            };
        }
        
        const userStat = this.stats.userStats[sender];
        userStat.count++;
        userStat.hours[hour]++;
        userStat.activeDays.add(dateStr);
        userStat.types[msgType] = (userStat.types[msgType] || 0) + 1;
        
        // 文本消息处理
        if (msgType === '文本消息' && content) {
            userStat.textLength += content.length;
            
            // 最长消息记录
            if (content.length > (this.stats.longestMessage?.content?.length || 0)) {
                this.stats.longestMessage = { ...msg, sender, date };
            }
        }
    }
    
    /**
     * 分析消息内容
     */
    _analyzeMessageContent(sender, msgType, content, msg, date) {
        const userStat = this.stats.userStats[sender];
        
        if (msgType === '文本消息' && content) {
            // 词频分析
            const dateStr = this.formatDate(date);
            const month = date.getMonth();
            this.analyzeWords(content, { dateStr, month });
            
            // 哈哈统计
            const laughMatches = content.match(/[哈呵嘿]+/g);
            if (laughMatches) {
                const count = laughMatches.length;
                userStat.laughCount += count;
                this.stats.laughCount[sender] = (this.stats.laughCount[sender] || 0) + count;
            }
            
            // 666统计
            const sixMatches = content.match(/6{2,}/g);
            if (sixMatches) {
                const count = sixMatches.length;
                userStat.sixCount += count;
                this.stats.sixCount[sender] = (this.stats.sixCount[sender] || 0) + count;
            }
            
            // 问号统计
            userStat.questionCount += (content.match(/[?？]/g) || []).length;
            
            // @提及分析
            const mentions = [...String(content).matchAll(/@([^\u2005\u2006\u2009\u202f\u00a0\r\n\t]{1,80})[\u2005\u2006\u2009\u202f\u00a0]+/g)]
                .map((m) => String(m?.[1] || '').trim())
                .filter(Boolean);
            if (mentions) {
                userStat.mentionCount += mentions.length;
                mentions.forEach((mentioned) => {
                    const resolved = this._resolveUsernameFromName(mentioned);
                    const mentionedId = resolved || mentioned;
                    if (resolved) this._ensureUserMeta(resolved, {});
                    const key = `${sender}->${mentionedId}`;
                    this.stats.interactions[key] = (this.stats.interactions[key] || 0) + 1;
                });
            }

            // 情绪分析（NLP-lite）
            const s = scoreSentiment(content);
            this.stats.sentiment.textMsgCount++;
            this.stats.sentiment.scoreSum += s.score;
            if (s.score > 0) this.stats.sentiment.posMsgCount++;
            if (s.score < 0) this.stats.sentiment.negMsgCount++;

            userStat.sentimentTextCount++;
            userStat.sentimentScoreSum += s.score;
            if (s.score > 0) userStat.sentimentPosMsgCount++;
            if (s.score < 0) userStat.sentimentNegMsgCount++;
        }
        
        // 表情包统计
        if (msgType === '动画表情' || msgType === '图片消息') {
            userStat.emojiCount++;
            this.stats.emojiCount[sender] = (this.stats.emojiCount[sender] || 0) + 1;
        }
        
        // 撤回统计
        if (msgType === '系统消息' && content.includes('撤回')) {
            const match = content.match(/"(.+)".*撤回/);
            if (match && match[1]) {
                const id = this._resolveUsernameFromName(match[1]) || match[1];
                if (this.stats.userStats[id]) this.stats.userStats[id].withdrawCount++;
            }
        }
    }
    
    /**
     * 更新时间段统计
     */
    _updateTimeStats(sender, hour) {
        const userStat = this.stats.userStats[sender];
        
        // 深夜统计 (0-6点)
        if (hour >= 0 && hour < 6) {
            userStat.nightCount++;
            this.stats.nightOwls[sender] = (this.stats.nightOwls[sender] || 0) + 1;
        }
        
        // 早起统计 (6-8点)
        if (hour >= 6 && hour < 8) {
            this.stats.earlyBirds[sender] = (this.stats.earlyBirds[sender] || 0) + 1;
        }
    }
    
    /**
     * 更新首尾消息记录
     */
    _updateFirstLastMessage(msg, sender, date) {
        if (!this.stats.firstMessage || date < new Date(this.stats.firstMessage.createTime * 1000)) {
            this.stats.firstMessage = { ...msg, sender, date };
        }
        if (!this.stats.lastMessage || date > new Date(this.stats.lastMessage.createTime * 1000)) {
            this.stats.lastMessage = { ...msg, sender, date };
        }
    }
    
    /**
     * 计算最活跃的一天
     */
    _calculateMostActiveDay() {
        let maxDayCount = 0;
        Object.entries(this.stats.dailyData).forEach(([date, count]) => {
            if (count > maxDayCount) {
                maxDayCount = count;
                this.stats.mostActiveDay = { date, count };
            }
        });
    }
    
    /**
     * 分析文本中的词频
     * @param {string} text - 待分析文本
     * @param {Object} ctx
     * @param {string} ctx.dateStr - YYYY-MM-DD
     * @param {number} ctx.month - 0-11
     */
    analyzeWords(text, ctx = {}) {
        // 关键词统计不应把 @某人 的“人名”算进去（@ 关系已在 interactions 中统计）
        const tokens = extractKeywords(stripMentions(text));
        const month = Number.isFinite(ctx.month) ? ctx.month : null;
        const dateStr = ctx.dateStr || null;
        if (!tokens.length) return;

        tokens.forEach((token) => {
            // 全年词频
            this.stats.wordFreq[token] = (this.stats.wordFreq[token] || 0) + 1;

            // 月度关键词
            if (month != null && month >= 0 && month <= 11) {
                emitKeyword(this.stats.monthlyWordFreq[month], token, 1);
            }

            // 日度关键词（用于爆发事件回溯）
            if (dateStr) {
                if (!this.stats.dailyWordFreq[dateStr]) this.stats.dailyWordFreq[dateStr] = Object.create(null);
                emitKeyword(this.stats.dailyWordFreq[dateStr], token, 1);
            }
        });
    }
    
    /**
     * 格式化日期为 YYYY-MM-DD 字符串
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    formatDateTime(date) {
        return `${this.formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    _parseDateStr(dateStr) {
        const [y, m, d] = String(dateStr || '').split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d, 0, 0, 0, 0);
    }

    /**
     * 从某段时间里抽取“代表消息”（用于 AI 总结/命名）
     * - 去 @ 提及
     * - 去明显灌水/重复
     * - 兼顾关键词提示与用户多样性
     */
    getRepresentativeMessagesInRange(startDate, endDate, {
        limit = 40,
        perUserCap = 6,
        maxTextLen = 140,
        keywordHints = [],
    } = {}) {
        const start = this._parseDateStr(startDate);
        const end = this._parseDateStr(endDate);
        if (!start || !end) return [];
        const startMs = start.getTime();
        const endMs = end.getTime() + 24 * 3600 * 1000 - 1;

        const hints = (keywordHints || []).map((k) => String(k || '').trim()).filter(Boolean);
        const hintSet = new Set(hints);

        const maxCandidates = Math.max(120, limit * 12);
        const candidates = [];
        const dedupe = new Set();

        const addCandidate = (c) => {
            if (candidates.length < maxCandidates) {
                candidates.push(c);
                return;
            }
            let minIdx = 0;
            for (let i = 1; i < candidates.length; i++) {
                if (candidates[i].score < candidates[minIdx].score) minIdx = i;
            }
            if (c.score > candidates[minIdx].score) candidates[minIdx] = c;
        };

        const isNoisy = (t) => {
            const s = String(t || '').trim();
            if (!s) return true;
            if (s.length < 2) return true;
            if (STOP_WORDS.has(s)) return true;
            if (/^\d+$/.test(s)) return true;
            if (/^[哈呵嘿嘻呜嗯哦啊哎]+$/.test(s)) return true;
            if (/^(ok|okay|\+1)$/i.test(s)) return true;
            // 纯链接/很短的链接分享
            if (/^https?:\/\//i.test(s) && s.length < 60) return true;
            return false;
        };

        const scoreText = (t) => {
            const s = String(t || '');
            const len = s.length;
            const lengthScore = clamp(len, 6, 140) / 140;
            let hintHits = 0;
            hintSet.forEach((k) => { if (k && s.includes(k)) hintHits++; });
            const hintScore = Math.min(1.2, hintHits * 0.35);
            const punct = (s.match(/[?？!！]/g) || []).length;
            const punctScore = Math.min(0.2, punct > 0 ? 0.1 : 0);
            return lengthScore + hintScore + punctScore;
        };

        this.messages.forEach((msg) => {
            const date = new Date(msg.createTime * 1000);
            if (date.getFullYear() !== this.targetYear) return;
            const timeMs = date.getTime();
            if (timeMs < startMs || timeMs > endMs) return;
            if (msg.type !== '文本消息') return;

            const raw = normalizeText(msg.content || '');
            const cleaned = normalizeText(stripMentions(raw));
            if (isNoisy(cleaned)) return;

            const key = cleaned.toLowerCase().replace(/\s+/g, '');
            if (!key) return;
            if (dedupe.has(key)) return;
            dedupe.add(key);

            const senderUsername = msg.senderUsername || msg.senderAvatarKey || msg.senderDisplayName || '神秘群友';
            const sender = this._ensureUserMeta(senderUsername, msg).id || '神秘群友';
            const user = this._asUser(sender);
            const text = cleaned.length > maxTextLen ? `${cleaned.slice(0, maxTextLen)}…` : cleaned;

            addCandidate({
                timeMs,
                time: this.formatDateTime(date),
                user: user?.name || '神秘群友',
                sender,
                text,
                score: scoreText(cleaned),
            });
        });

        candidates.sort((a, b) => b.score - a.score);
        const picked = [];
        const perUser = Object.create(null);
        for (const c of candidates) {
            if (picked.length >= limit) break;
            const used = perUser[c.sender] || 0;
            if (used >= perUserCap) continue;
            perUser[c.sender] = used + 1;
            picked.push(c);
        }

        picked.sort((a, b) => a.timeMs - b.timeMs);
        return picked.map((m) => `[${m.time}] ${m.user}: ${m.text}`);
    }
    
    /**
     * 获取年度奖项列表
     * @returns {Array} 奖项数组
     */
    getAwards() {
        const awards = [];
        if (this.stats.totalMessages === 0) return awards;

        const users = Object.entries(this.stats.userStats)
            .map(([id, stat]) => ({ id, ...stat }))
            .filter(u => u.count > 10);

        if (users.length === 0) return awards;

        const byCount = [...users].sort((a, b) => b.count - a.count);

        // === 发言类称号 ===
        if (byCount[0]) {
            awards.push({
                icon: '🏆', title: '年度话痨王', user: this._asUser(byCount[0].id), value: byCount[0].count,
                desc: `全年发言 ${byCount[0].count.toLocaleString()} 条，占总量 ${(byCount[0].count / this.stats.totalMessages * 100).toFixed(1)}%`,
            });
        }
        if (byCount[1]) {
            awards.push({ icon: '🥈', title: '银嘴巴', user: this._asUser(byCount[1].id), value: byCount[1].count, desc: `全年发言 ${byCount[1].count.toLocaleString()} 条` });
        }
        if (byCount[2]) {
            awards.push({ icon: '🥉', title: '铜舌头', user: this._asUser(byCount[2].id), value: byCount[2].count, desc: `全年发言 ${byCount[2].count.toLocaleString()} 条` });
        }

        // 长篇大论家 - 平均消息长度最长
        const byAvgLength = users
            .filter(u => u.types['文本消息'] > 50)
            .map(u => ({ ...u, avgLength: u.textLength / (u.types['文本消息'] || 1) }))
            .sort((a, b) => b.avgLength - a.avgLength);
        if (byAvgLength[0] && byAvgLength[0].avgLength > 20) {
            awards.push({ icon: '📝', title: '长篇大论家', user: this._asUser(byAvgLength[0].id), value: Math.round(byAvgLength[0].avgLength), desc: `平均每条消息 ${Math.round(byAvgLength[0].avgLength)} 字` });
        }

        // 闪电侠 - 平均消息长度最短
        const byShortLength = users
            .filter(u => u.types['文本消息'] > 100)
            .map(u => ({ ...u, avgLength: u.textLength / (u.types['文本消息'] || 1) }))
            .sort((a, b) => a.avgLength - b.avgLength);
        if (byShortLength[0] && byShortLength[0].avgLength < 10) {
            awards.push({ icon: '⚡', title: '闪电侠', user: this._asUser(byShortLength[0].id), value: Math.round(byShortLength[0].avgLength), desc: `平均每条仅 ${Math.round(byShortLength[0].avgLength)} 字，言简意赅` });
        }

        // === 时间类称号 ===
        const nightOwls = Object.entries(this.stats.nightOwls).sort((a, b) => b[1] - a[1]);
        if (nightOwls[0] && nightOwls[0][1] > 50) {
            awards.push({ icon: '🌙', title: '深夜守护者', user: this._asUser(nightOwls[0][0]), value: nightOwls[0][1], desc: `凌晨发送 ${nightOwls[0][1]} 条消息` });
        }

        const earlyBirds = Object.entries(this.stats.earlyBirds).sort((a, b) => b[1] - a[1]);
        if (earlyBirds[0] && earlyBirds[0][1] > 30) {
            awards.push({ icon: '🌅', title: '早起鸟', user: this._asUser(earlyBirds[0][0]), value: earlyBirds[0][1], desc: `清晨6-8点发送 ${earlyBirds[0][1]} 条消息` });
        }

        // 午间摸鱼王 - 11-13点发言最多
        const lunchUsers = {};
        this.messages.forEach(msg => {
            const date = new Date(msg.createTime * 1000);
            if (date.getFullYear() !== this.targetYear) return;
            const hour = date.getHours();
            if (hour >= 11 && hour < 14) {
                const senderUsername = msg.senderUsername || msg.senderAvatarKey || msg.senderDisplayName || '神秘群友';
                const sender = this._ensureUserMeta(senderUsername, msg).id || '神秘群友';
                lunchUsers[sender] = (lunchUsers[sender] || 0) + 1;
            }
        });
        const lunchSorted = Object.entries(lunchUsers).sort((a, b) => b[1] - a[1]);
        if (lunchSorted[0] && lunchSorted[0][1] > 100) {
            awards.push({ icon: '🍜', title: '午间摸鱼王', user: this._asUser(lunchSorted[0][0]), value: lunchSorted[0][1], desc: `午间时段发送 ${lunchSorted[0][1]} 条消息` });
        }

        // 全勤冠军
        const byActiveDays = users.map(u => ({ ...u, activeDaysCount: u.activeDays.size })).sort((a, b) => b.activeDaysCount - a.activeDaysCount);
        if (byActiveDays[0]) {
            awards.push({ icon: '💪', title: '全勤冠军', user: this._asUser(byActiveDays[0].id), value: byActiveDays[0].activeDaysCount, desc: `${byActiveDays[0].activeDaysCount} 天都有发言` });
        }

        // === 内容类称号 ===
        const laughSorted = Object.entries(this.stats.laughCount).sort((a, b) => b[1] - a[1]);
        if (laughSorted[0] && laughSorted[0][1] > 50) {
            awards.push({ icon: '😂', title: '快乐源泉', user: this._asUser(laughSorted[0][0]), value: laughSorted[0][1], desc: `发送 ${laughSorted[0][1]} 次"哈哈"` });
        }

        const sixSorted = Object.entries(this.stats.sixCount).sort((a, b) => b[1] - a[1]);
        if (sixSorted[0] && sixSorted[0][1] > 30) {
            awards.push({ icon: '🔥', title: '666贡献者', user: this._asUser(sixSorted[0][0]), value: sixSorted[0][1], desc: `发送 ${sixSorted[0][1]} 次"666"` });
        }

        const emojiSorted = Object.entries(this.stats.emojiCount).sort((a, b) => b[1] - a[1]);
        if (emojiSorted[0] && emojiSorted[0][1] > 100) {
            awards.push({ icon: '🤪', title: '表情包大师', user: this._asUser(emojiSorted[0][0]), value: emojiSorted[0][1], desc: `发送 ${emojiSorted[0][1]} 个表情包` });
        }

        // 问题宝宝
        const byQuestion = [...users].sort((a, b) => b.questionCount - a.questionCount);
        if (byQuestion[0] && byQuestion[0].questionCount > 100) {
            awards.push({ icon: '❓', title: '问题宝宝', user: this._asUser(byQuestion[0].id), value: byQuestion[0].questionCount, desc: `发送 ${byQuestion[0].questionCount} 个问号` });
        }

        // 记录生活家 - 图片发送最多
        const byImages = users.filter(u => u.types['图片消息']).sort((a, b) => (b.types['图片消息'] || 0) - (a.types['图片消息'] || 0));
        if (byImages[0] && byImages[0].types['图片消息'] > 50) {
            awards.push({ icon: '📸', title: '记录生活家', user: this._asUser(byImages[0].id), value: byImages[0].types['图片消息'], desc: `分享了 ${byImages[0].types['图片消息']} 张图片` });
        }

        // 视频达人
        const byVideos = users.filter(u => u.types['视频消息']).sort((a, b) => (b.types['视频消息'] || 0) - (a.types['视频消息'] || 0));
        if (byVideos[0] && byVideos[0].types['视频消息'] > 20) {
            awards.push({ icon: '🎬', title: '视频达人', user: this._asUser(byVideos[0].id), value: byVideos[0].types['视频消息'], desc: `分享了 ${byVideos[0].types['视频消息']} 个视频` });
        }

        // === 社交类称号 ===
        // 年度CP
        const cpPairs = {};
        Object.entries(this.stats.interactions).forEach(([key, count]) => {
            const [a, b] = key.split('->');
            if (!a || !b) return;
            const pairKey = [a, b].sort().join('|');
            cpPairs[pairKey] = (cpPairs[pairKey] || 0) + count;
        });
        const cpSorted = Object.entries(cpPairs).sort((a, b) => b[1] - a[1]);
        if (cpSorted[0] && cpSorted[0][1] > 50) {
            const ids = cpSorted[0][0].split('|');
            const users = ids.map((id) => this._asUser(id));
            awards.push({
                icon: '💑',
                title: '年度CP',
                users,
                userLabel: users.map(u => u.name).join(' ❤️ '),
                value: cpSorted[0][1],
                desc: `互动 ${cpSorted[0][1]} 次`,
            });
        }

        // 人气王 - 被@最多
        const mentionedCount = {};
        Object.entries(this.stats.interactions).forEach(([key, count]) => {
            const target = key.split('->')[1];
            mentionedCount[target] = (mentionedCount[target] || 0) + count;
        });
        const mentionedSorted = Object.entries(mentionedCount).sort((a, b) => b[1] - a[1]);
        if (mentionedSorted[0] && mentionedSorted[0][1] > 30) {
            awards.push({ icon: '👑', title: '人气王', user: this._asUser(mentionedSorted[0][0]), value: mentionedSorted[0][1], desc: `被提及 ${mentionedSorted[0][1]} 次` });
        }

        // 交际花 - 与最多人互动
        const interactedUsers = {};
        Object.keys(this.stats.interactions).forEach(key => {
            const [source, target] = key.split('->');
            if (!interactedUsers[source]) interactedUsers[source] = new Set();
            interactedUsers[source].add(target);
        });
        const bySocialRange = Object.entries(interactedUsers).map(([name, targets]) => ({ name, count: targets.size })).sort((a, b) => b.count - a.count);
        if (bySocialRange[0] && bySocialRange[0].count > 5) {
            awards.push({ icon: '🤝', title: '交际花', user: this._asUser(bySocialRange[0].name), value: bySocialRange[0].count, desc: `与 ${bySocialRange[0].count} 人互动` });
        }

        // 回复之神 - 提及他人最多
        const byMention = [...users].sort((a, b) => b.mentionCount - a.mentionCount);
        if (byMention[0] && byMention[0].mentionCount > 50) {
            awards.push({ icon: '💬', title: '回复之神', user: this._asUser(byMention[0].id), value: byMention[0].mentionCount, desc: `提及他人 ${byMention[0].mentionCount} 次` });
        }

        // === 趣味类称号 ===
        // 后悔药大王 - 撤回最多
        const byWithdraw = [...users].sort((a, b) => b.withdrawCount - a.withdrawCount);
        if (byWithdraw[0] && byWithdraw[0].withdrawCount > 10) {
            awards.push({ icon: '🔙', title: '后悔药大王', user: this._asUser(byWithdraw[0].id), value: byWithdraw[0].withdrawCount, desc: `撤回了 ${byWithdraw[0].withdrawCount} 条消息` });
        }

        // 年度第一条
        if (this.stats.firstMessage) {
            awards.push({ icon: '🎯', title: '年度第一声', user: this._asUser(this.stats.firstMessage.sender), value: 1, desc: `发送了年度第一条消息` });
        }

        // 年度收官者
        if (this.stats.lastMessage) {
            awards.push({ icon: '🌟', title: '年度收官者', user: this._asUser(this.stats.lastMessage.sender), value: 1, desc: `发送了年度最后一条消息` });
        }

        // 周末战士 - 周末发言最多
        const weekendUsers = {};
        this.messages.forEach(msg => {
            const date = new Date(msg.createTime * 1000);
            if (date.getFullYear() !== this.targetYear) return;
            const day = date.getDay();
            if (day === 0 || day === 6) {
                const senderUsername = msg.senderUsername || msg.senderAvatarKey || msg.senderDisplayName || '神秘群友';
                const sender = this._ensureUserMeta(senderUsername, msg).id || '神秘群友';
                weekendUsers[sender] = (weekendUsers[sender] || 0) + 1;
            }
        });
        const weekendSorted = Object.entries(weekendUsers).sort((a, b) => b[1] - a[1]);
        if (weekendSorted[0] && weekendSorted[0][1] > 200) {
            awards.push({ icon: '🎉', title: '周末战士', user: this._asUser(weekendSorted[0][0]), value: weekendSorted[0][1], desc: `周末发送 ${weekendSorted[0][1]} 条消息` });
        }

        // 工作狂 - 工作日发言最多
        const weekdayUsers = {};
        this.messages.forEach(msg => {
            const date = new Date(msg.createTime * 1000);
            if (date.getFullYear() !== this.targetYear) return;
            const day = date.getDay();
            if (day >= 1 && day <= 5) {
                const senderUsername = msg.senderUsername || msg.senderAvatarKey || msg.senderDisplayName || '神秘群友';
                const sender = this._ensureUserMeta(senderUsername, msg).id || '神秘群友';
                weekdayUsers[sender] = (weekdayUsers[sender] || 0) + 1;
            }
        });
        const weekdaySorted = Object.entries(weekdayUsers).sort((a, b) => b[1] - a[1]);
        if (weekdaySorted[0] && weekdaySorted[0][1] > 500) {
            awards.push({ icon: '💼', title: '工作狂', user: this._asUser(weekdaySorted[0][0]), value: weekdaySorted[0][1], desc: `工作日发送 ${weekdaySorted[0][1]} 条消息` });
        }

        return awards;
    }
    
    /**
     * 获取乐子人分析数据
     * @returns {Array} 乐子人排行榜
     */
    getJokerAnalysis() {
        return Object.entries(this.stats.userStats)
            .filter(([_, stat]) => stat.count > 50)
            .map(([id, stat]) => {
                const score = Math.min(100, Math.round(
                    (stat.laughCount * 2 + stat.sixCount * 1.5 + stat.emojiCount) / stat.count * 100
                ));
                const user = this._asUser(id);
                return { 
                    id: user.id,
                    name: user.name,
                    jokerIndex: score, 
                    laughCount: stat.laughCount, 
                    sixCount: stat.sixCount, 
                    emojiCount: stat.emojiCount 
                };
            })
            .sort((a, b) => b.jokerIndex - a.jokerIndex)
            .slice(0, 5);
    }
    
    /**
     * 获取热词排行榜
     * @param {number} limit - 返回数量限制
     * @returns {Array} 热词数组
     */
    getTopWords(limit = 20) {
        return Object.entries(this.stats.wordFreq)
            .filter(([word, count]) => word && count >= KEYWORD_MIN_COUNT)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([word, count]) => ({ word, count }));
    }
    
    /**
     * 获取用户发言排行榜
     * @param {number} limit - 返回数量限制
     * @returns {Array} 用户排行榜
     */
    getUserRanking(limit = 10) {
        return Object.entries(this.stats.userStats)
            .map(([id, stat]) => {
                const user = this._asUser(id);
                return {
                    id: user.id,
                    name: user.name,
                    count: stat.count,
                    percentage: (stat.count / this.stats.totalMessages * 100).toFixed(1),
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
    
    /**
     * 获取夜猫子排行榜
     * @param {number} limit - 返回数量限制
     * @returns {Array} 夜猫子排行榜
     */
    getNightOwlRanking(limit = 5) {
        return Object.entries(this.stats.nightOwls)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id, count]) => {
                const user = this._asUser(id);
                return { id: user.id, name: user.name, count };
            });
    }
    
    /**
     * 获取日历热力图数据
     * @returns {Array} 日历数据
     */
    getCalendarData() {
        return Object.entries(this.stats.dailyData)
            .map(([date, count]) => ({ date, count }));
    }

    /**
     * 月度关键词演变（TF-IDF 风格）
     * @param {number} limitPerMonth
     * @returns {Array} [{month: 1-12, keywords: [{word,count,score}]}]
     */
    getMonthlyKeywords(limitPerMonth = 5) {
        const monthly = this.stats.monthlyWordFreq || [];
        const df = Object.create(null);
        monthly.forEach((m) => {
            if (!m) return;
            Object.keys(m).forEach((w) => { if (m[w] > 0) df[w] = (df[w] || 0) + 1; });
        });

        const M = 12;
        const out = [];
        for (let i = 0; i < 12; i++) {
            const map = monthly[i] || Object.create(null);
            const keywords = Object.entries(map)
                .filter(([w, c]) => w && c >= KEYWORD_MIN_COUNT)
                .map(([w, c]) => {
                    const idf = Math.log((M + 1) / ((df[w] || 0) + 1));
                    return { word: w, count: c, score: c * idf };
                })
                .sort((a, b) => (b.score - a.score) || (b.count - a.count))
                .slice(0, limitPerMonth)
                .map((k) => ({ word: k.word, count: k.count, score: Number(k.score.toFixed(2)) }));
            out.push({ month: i + 1, keywords });
        }
        return out;
    }

    /**
     * 最热话题/事件：基于日粒度的爆发性发言量 + 当日关键词回溯（近似）
     * @param {number} limit
     * @returns {Array} [{startDate,endDate,peakDate,totalCount,peakCount,keywords:[{word,count}]}]
     */
    getHotEvents(limit = 5) {
        const daily = Object.entries(this.stats.dailyData || {})
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => String(a.date).localeCompare(String(b.date)));

        if (!daily.length) return [];

        const counts = daily.map((d) => d.count).slice().sort((a, b) => a - b);
        const mean = daily.reduce((s, d) => s + d.count, 0) / daily.length;
        const sd = stddev(daily.map((d) => d.count));
        const p95 = percentile(counts, 0.95);
        const minPeak = Math.max(30, Math.round(mean * 2));
        const threshold = Math.max(minPeak, Math.round(Math.max(p95, mean + sd * 1.5)));

        const isPeak = (c) => c >= threshold;
        const peaks = daily.filter((d) => isPeak(d.count));
        if (!peaks.length) {
            // fallback：取最高的若干天
            const top = daily.slice().sort((a, b) => b.count - a.count).slice(0, limit);
            return top.map((d) => this._buildHotEventFromDays([d]));
        }

        // merge consecutive peak days into events
        const toDayNum = (dateStr) => {
            const [y, m, d] = String(dateStr).split('-').map(Number);
            return new Date(y, (m || 1) - 1, d || 1).getTime() / (24 * 3600 * 1000);
        };
        const events = [];
        let cur = [];
        peaks.forEach((d) => {
            if (!cur.length) {
                cur.push(d);
                return;
            }
            const last = cur[cur.length - 1];
            if (toDayNum(d.date) - toDayNum(last.date) <= 1.01) cur.push(d);
            else {
                events.push(this._buildHotEventFromDays(cur));
                cur = [d];
            }
        });
        if (cur.length) events.push(this._buildHotEventFromDays(cur));

        return events
            .sort((a, b) => (b.totalCount - a.totalCount) || (String(a.startDate).localeCompare(String(b.startDate))))
            .slice(0, limit);
    }

    _buildHotEventFromDays(days) {
        const sorted = (days || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
        const startDate = sorted[0]?.date || '';
        const endDate = sorted[sorted.length - 1]?.date || startDate;
        const totalCount = sorted.reduce((s, d) => s + (d.count || 0), 0);
        const peak = sorted.slice().sort((a, b) => b.count - a.count)[0] || { date: startDate, count: 0 };

        const keywordMap = Object.create(null);
        sorted.forEach((d) => {
            const dayMap = this.stats.dailyWordFreq?.[d.date];
            if (!dayMap) return;
            Object.entries(dayMap).forEach(([w, c]) => {
                if (!w || !c) return;
                keywordMap[w] = (keywordMap[w] || 0) + c;
            });
        });
        const keywords = Object.entries(keywordMap)
            .filter(([w, c]) => w && c >= KEYWORD_MIN_COUNT)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([word, count]) => ({ word, count }));

        return {
            startDate,
            endDate,
            peakDate: peak.date,
            totalCount,
            peakCount: peak.count,
            keywords,
        };
    }

    /**
     * 情感分析：群聊整体氛围 + “小太阳/丧气王”
     * @returns {Object}
     */
    getSentimentSummary() {
        const s = this.stats.sentiment || { textMsgCount: 0, posMsgCount: 0, negMsgCount: 0, scoreSum: 0 };
        const total = s.textMsgCount || 0;
        const pos = s.posMsgCount || 0;
        const neg = s.negMsgCount || 0;
        const neu = Math.max(0, total - pos - neg);
        const avgScore = total ? (s.scoreSum || 0) / total : 0;

        let mood = '中性';
        if (avgScore >= 0.25) mood = '正向';
        else if (avgScore <= -0.25) mood = '负向';

        const users = Object.entries(this.stats.userStats || {})
            .map(([id, stat]) => ({
                id,
                textCount: stat.sentimentTextCount || 0,
                scoreSum: stat.sentimentScoreSum || 0,
                avg: (stat.sentimentTextCount ? (stat.sentimentScoreSum || 0) / stat.sentimentTextCount : 0),
            }))
            .filter((u) => u.textCount >= SENTIMENT_MIN_TEXT_MSGS);

        const byAvgDesc = users.slice().sort((a, b) => (b.avg - a.avg) || (b.textCount - a.textCount));
        const byAvgAsc = users.slice().sort((a, b) => (a.avg - b.avg) || (b.textCount - a.textCount));

        const sunshine = byAvgDesc[0]
            ? { user: this._asUser(byAvgDesc[0].id), avg: Number(byAvgDesc[0].avg.toFixed(2)), textCount: byAvgDesc[0].textCount }
            : null;
        const gloomy = byAvgAsc[0]
            ? { user: this._asUser(byAvgAsc[0].id), avg: Number(byAvgAsc[0].avg.toFixed(2)), textCount: byAvgAsc[0].textCount }
            : null;

        return {
            mood,
            avgScore: Number(avgScore.toFixed(2)),
            posRatio: total ? Number((pos / total * 100).toFixed(1)) : 0,
            negRatio: total ? Number((neg / total * 100).toFixed(1)) : 0,
            neutralRatio: total ? Number((neu / total * 100).toFixed(1)) : 0,
            totalTextMessages: total,
            sunshine,
            gloomy,
        };
    }
    
    /**
     * 获取消息类型分布
     * @returns {Array} 消息类型分布数据
     */
    getMessageTypeDistribution() {
        return Object.entries(this.stats.messageTypes)
            .map(([type, count]) => ({ 
                type, 
                count, 
                percentage: (count / this.stats.totalMessages * 100).toFixed(1) 
            }))
            .sort((a, b) => b.count - a.count);
    }
    
    /**
     * 获取峰值活跃小时
     * @returns {Object} 峰值小时数据
     */
    getPeakHour() {
        let maxCount = 0, peakHour = 0;
        this.stats.hourlyData.forEach((count, hour) => {
            if (count > maxCount) {
                maxCount = count;
                peakHour = hour;
            }
        });
        return { hour: peakHour, count: maxCount };
    }

    /**
     * 获取社交关系图谱数据
     * @returns {Object} {nodes: Array, links: Array}
     */
    getRelationsData() {
        const userCounts = {};
        Object.entries(this.stats.userStats).forEach(([id, stat]) => {
            userCounts[id] = stat.count;
        });

        const nodeIds = Object.keys(userCounts).filter(id => userCounts[id] > 20);
        const nameById = Object.create(null);
        nodeIds.forEach((id) => { nameById[id] = this._asUser(id).name; });

        const nodes = nodeIds.map(id => ({
            name: nameById[id],
            symbolSize: Math.min(60, Math.max(15, userCounts[id] / 50)),
            itemStyle: { color: this._getNodeColor(userCounts[id]) }
        }));

        const nodeIdsSet = new Set(nodeIds);
        const links = Object.entries(this.stats.interactions)
            .filter(([key, count]) => {
                const [source, target] = key.split('->');
                return count >= 3 && nodeIdsSet.has(source) && nodeIdsSet.has(target);
            })
            .map(([key, count]) => {
                const [source, target] = key.split('->');
                return { source: nameById[source], target: nameById[target], value: count, lineStyle: { width: Math.min(5, count / 10) } };
            });

        return { nodes, links };
    }

    _getNodeColor(count) {
        if (count > 1000) return '#ffd700';
        if (count > 500) return '#a855f7';
        if (count > 200) return '#3b82f6';
        return '#10b981';
    }

    /**
     * 获取周-小时热力图数据
     * @returns {Array} [[day, hour, count], ...]
     */
    getWeekdayHourlyData() {
        const data = [];
        const weekdayHourly = {};

        this.messages.forEach(msg => {
            const date = new Date(msg.createTime * 1000);
            if (date.getFullYear() !== this.targetYear) return;
            const day = date.getDay();
            const hour = date.getHours();
            const key = `${day}-${hour}`;
            weekdayHourly[key] = (weekdayHourly[key] || 0) + 1;
        });

        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                data.push([hour, day, weekdayHourly[`${day}-${hour}`] || 0]);
            }
        }
        return data;
    }

    /**
     * 获取年度亮点数据
     * @returns {Object} 亮点数据集
     */
    getHighlights() {
        const firstMsg = this.stats.firstMessage;
        const lastMsg = this.stats.lastMessage;
        const longestMsg = this.stats.longestMessage;
        const mostActiveDay = this.stats.mostActiveDay;

        const formatTime = (d) => {
            if (!d) return '';
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        return {
            longestMsg: longestMsg ? {
                content: longestMsg.content || '',
                user: this._asUser(longestMsg.sender),
                length: (longestMsg.content || '').length,
                time: formatTime(longestMsg.date)
            } : null,
            firstMsg: firstMsg ? {
                content: firstMsg.content || '[非文本消息]',
                user: this._asUser(firstMsg.sender),
                time: formatTime(firstMsg.date)
            } : null,
            lastMsg: lastMsg ? {
                content: lastMsg.content || '[非文本消息]',
                user: this._asUser(lastMsg.sender),
                time: formatTime(lastMsg.date)
            } : null,
            mostActiveDay: mostActiveDay ? {
                date: mostActiveDay.date,
                count: mostActiveDay.count
            } : null
        };
    }

    /**
     * 获取早起鸟排行榜
     * @param {number} limit
     * @returns {Array}
     */
    getEarlyBirdRanking(limit = 5) {
        return Object.entries(this.stats.earlyBirds)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id, count]) => {
                const user = this._asUser(id);
                return { id: user.id, name: user.name, count };
            });
    }

    /**
     * 获取被@排行榜
     * @param {number} limit - 返回数量限制
     * @returns {Array} 被@排行榜数据
     */
    getMentionedRanking(limit = 10) {
        const mentionedCount = {};
        Object.entries(this.stats.interactions).forEach(([key, count]) => {
            const target = key.split('->')[1];
            mentionedCount[target] = (mentionedCount[target] || 0) + count;
        });
        
        return Object.entries(mentionedCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id, count]) => {
                const user = this._asUser(id);
                return { id: user.id, name: user.name, count };
            });
    }

    /**
     * 捧场王：接话/回复次数排行（近似）
     * @param {number} limit
     * @returns {Array}
     */
    getSupporterRanking(limit = 10) {
        return Object.entries(this.stats.userStats)
            .map(([id, stat]) => {
                const user = this._asUser(id);
                return {
                    id: user.id,
                    name: user.name,
                    replyCount: stat.replyCount || 0,
                    quoteCount: stat.quoteCount || 0,
                    supportScore: (stat.replyCount || 0) + (stat.quoteCount || 0) * 2,
                };
            })
            .sort((a, b) => b.supportScore - a.supportScore)
            .slice(0, limit);
    }

    /**
     * 引用大师：引用消息次数排行
     * @param {number} limit
     * @returns {Array}
     */
    getQuoteRanking(limit = 10) {
        return Object.entries(this.stats.userStats)
            .map(([id, stat]) => {
                const user = this._asUser(id);
                return { id: user.id, name: user.name, quoteCount: stat.quoteCount || 0 };
            })
            .filter(u => u.quoteCount > 0)
            .sort((a, b) => b.quoteCount - a.quoteCount)
            .slice(0, limit);
    }

    /**
     * 高冷帝：发言少，但“每次出场”带动聊天量高（10分钟窗口）
     * @param {number} limit
     * @returns {Array}
     */
    getLonerRanking(limit = 5) {
        const users = Object.entries(this.stats.userStats)
            .map(([id, stat]) => ({
                id,
                count: stat.count || 0,
                impactEvents: stat.impactEvents || 0,
                impactAvg: (stat.impactEvents ? stat.impactSum / stat.impactEvents : 0),
                impactMax: stat.impactMax || 0,
            }))
            .filter(u => u.count > 5 && u.count <= 120 && u.impactEvents >= 3);

        return users
            .sort((a, b) => b.impactAvg - a.impactAvg)
            .slice(0, limit)
            .map(u => ({
                id: this._asUser(u.id).id,
                name: this._asUser(u.id).name,
                count: u.count,
                impactAvg: Number(u.impactAvg.toFixed(1)),
                impactMax: u.impactMax,
                impactEvents: u.impactEvents,
            }));
    }

    /**
     * 复读机指数：复读上一条（不同人）文本的频率
     * @param {number} limit
     * @returns {Array}
     */
    getRepeaterRanking(limit = 10) {
        const users = Object.entries(this.stats.userStats)
            .map(([id, stat]) => ({
                id,
                echoCount: stat.echoCount || 0,
                count: stat.count || 0,
                echoIndex: stat.count ? (stat.echoCount || 0) / stat.count : 0,
            }))
            .filter(u => u.echoCount > 0 && u.count >= 20);

        return users
            .sort((a, b) => (b.echoIndex - a.echoIndex) || (b.echoCount - a.echoCount))
            .slice(0, limit)
            .map(u => ({
                id: this._asUser(u.id).id,
                name: this._asUser(u.id).name,
                echoCount: u.echoCount,
                count: u.count,
                echoIndex: Number((u.echoIndex * 100).toFixed(1)), // %
            }));
    }

    /**
     * 年度复读最多的一句话（完全重复，trim+空白归一化后）
     * @param {number} limit
     * @returns {Array}
     */
    getTopRepeatedPhrases(limit = 10) {
        return Object.entries(this.stats.repeatedTextFreq || {})
            .filter(([text, count]) => text && text.length >= 2 && count >= 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([text, count]) => ({ text, count }));
    }

    // ============================================
    // AI 增强模块辅助方法
    // ============================================

    /**
     * 获取指定用户的代表消息（用于 AI 画像/颁奖词）
     * @param {string} userId - 用户ID
     * @param {number} limit - 返回数量限制
     * @returns {Array} 格式化的消息数组
     */
    getUserSampleMessages(userId, limit = 15) {
        const id = String(userId || '').trim();
        if (!id) return [];

        const maxTextLen = 120;
        const candidates = [];
        const dedupe = new Set();

        // 计算消息质量分数
        const scoreText = (text) => {
            const s = String(text || '');
            const len = s.length;
            // 长度分：6-120字内越长越好
            const lengthScore = clamp(len, 6, 120) / 120;
            // 标点分：有问号或感叹号加分
            const punct = (s.match(/[?？!！]/g) || []).length;
            const punctScore = Math.min(0.2, punct > 0 ? 0.15 : 0);
            // emoji分
            const emoji = (s.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
            const emojiScore = Math.min(0.15, emoji * 0.05);
            return lengthScore + punctScore + emojiScore;
        };

        // 噪音过滤
        const isNoisy = (t) => {
            const s = String(t || '').trim();
            if (!s) return true;
            if (s.length < 3) return true;
            if (STOP_WORDS.has(s)) return true;
            if (/^\d+$/.test(s)) return true;
            if (/^[哈呵嘿嘻呜嗯哦啊哎]+$/.test(s)) return true;
            if (/^(ok|okay|\+1|666+)$/i.test(s)) return true;
            if (/^https?:\/\//i.test(s) && s.length < 60) return true;
            return false;
        };

        this.messages.forEach((msg) => {
            const date = new Date(msg.createTime * 1000);
            if (date.getFullYear() !== this.targetYear) return;
            if (msg.type !== '文本消息') return;

            const senderUsername = msg.senderUsername || msg.senderAvatarKey || msg.senderDisplayName || '神秘群友';
            const sender = this._ensureUserMeta(senderUsername, msg).id || '神秘群友';
            if (sender !== id) return;

            const raw = normalizeText(msg.content || '');
            const cleaned = normalizeText(stripMentions(raw));
            if (isNoisy(cleaned)) return;

            const key = cleaned.toLowerCase().replace(/\s+/g, '');
            if (!key) return;
            if (dedupe.has(key)) return;
            dedupe.add(key);

            const text = cleaned.length > maxTextLen ? `${cleaned.slice(0, maxTextLen)}…` : cleaned;
            candidates.push({
                timeMs: date.getTime(),
                time: this.formatDateTime(date),
                text,
                score: scoreText(cleaned),
            });
        });

        // 按分数排序，取前 limit 条
        candidates.sort((a, b) => b.score - a.score);
        const picked = candidates.slice(0, limit);
        
        // 按时间排序输出
        picked.sort((a, b) => a.timeMs - b.timeMs);
        return picked.map((m) => `[${m.time}] ${m.text}`);
    }

    /**
     * 获取指定用户的详细统计数据（用于 AI 画像）
     * @param {string} userId - 用户ID
     * @returns {Object} 用户统计数据
     */
    getUserStats(userId) {
        const id = String(userId || '').trim();
        if (!id) return {};

        const stat = this.stats.userStats[id];
        if (!stat) return {};

        const activeDaysCount = stat.activeDays ? stat.activeDays.size : 0;
        const totalDays = this.stats.activeDays ? this.stats.activeDays.size : 1;
        const dailyAvg = activeDaysCount > 0 ? stat.count / activeDaysCount : 0;

        // 计算该用户最常用的词
        const userWordFreq = Object.create(null);
        this.messages.forEach((msg) => {
            const date = new Date(msg.createTime * 1000);
            if (date.getFullYear() !== this.targetYear) return;
            if (msg.type !== '文本消息') return;

            const senderUsername = msg.senderUsername || msg.senderAvatarKey || msg.senderDisplayName || '神秘群友';
            const sender = this._ensureUserMeta(senderUsername, msg).id || '神秘群友';
            if (sender !== id) return;

            const tokens = extractKeywords(stripMentions(msg.content || ''));
            tokens.forEach((token) => {
                userWordFreq[token] = (userWordFreq[token] || 0) + 1;
            });
        });

        const topWords = Object.entries(userWordFreq)
            .filter(([word, count]) => word && count >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);

        // 计算最活跃的小时
        const peakHour = stat.hours ? stat.hours.indexOf(Math.max(...stat.hours)) : -1;

        return {
            count: stat.count || 0,
            textLength: stat.textLength || 0,
            avgTextLength: stat.types?.['文本消息'] ? Math.round(stat.textLength / stat.types['文本消息']) : 0,
            activeDays: activeDaysCount,
            dailyAvg: dailyAvg,
            nightCount: stat.nightCount || 0,
            laughCount: stat.laughCount || 0,
            sixCount: stat.sixCount || 0,
            emojiCount: stat.emojiCount || 0,
            questionCount: stat.questionCount || 0,
            mentionCount: stat.mentionCount || 0,
            replyCount: stat.replyCount || 0,
            quoteCount: stat.quoteCount || 0,
            echoCount: stat.echoCount || 0,
            peakHour: peakHour >= 0 ? peakHour : null,
            topWords: topWords,
            sentimentAvg: stat.sentimentTextCount ? Number((stat.sentimentScoreSum / stat.sentimentTextCount).toFixed(2)) : 0,
        };
    }

    /**
     * 获取金句候选消息（用于 AI 精选）
     * 选取标准：高表情符号、高回复、有意思的内容
     * @param {number} limit - 返回数量限制
     * @returns {Array} 格式化的候选消息数组
     */
    getQuoteCandidates(limit = 50) {
        const maxTextLen = 100;
        const candidates = [];
        const dedupe = new Set();

        // 计算金句潜力分数
        const scoreQuote = (text, stat) => {
            const s = String(text || '');
            const len = s.length;
            
            // 长度分：太短或太长都不好，20-80字最佳
            let lengthScore = 0;
            if (len >= 20 && len <= 80) lengthScore = 1;
            else if (len >= 10 && len < 20) lengthScore = 0.6;
            else if (len > 80 && len <= 120) lengthScore = 0.7;
            else lengthScore = 0.3;

            // 标点分：有问号或感叹号更有表现力
            const punct = (s.match(/[?？!！]/g) || []).length;
            const punctScore = Math.min(0.3, punct * 0.1);

            // emoji分：适量emoji更生动
            const emoji = (s.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
            const emojiScore = Math.min(0.25, emoji * 0.08);

            // 引号分：有引用更有深度
            const quote = (s.match(/["""''「」『』]/g) || []).length;
            const quoteScore = Math.min(0.2, quote > 0 ? 0.15 : 0);

            // 特殊词汇分：包含有趣词汇
            const funWords = /哈哈|666|yyds|笑死|太典|绝了|离谱|逆天|牛|nice|good/i;
            const funScore = funWords.test(s) ? 0.15 : 0;

            return lengthScore + punctScore + emojiScore + quoteScore + funScore;
        };

        // 噪音过滤（金句标准更严格）
        const isNoisy = (t) => {
            const s = String(t || '').trim();
            if (!s) return true;
            if (s.length < 8) return true; // 金句至少8字
            if (STOP_WORDS.has(s)) return true;
            if (/^\d+$/.test(s)) return true;
            if (/^[哈呵嘿嘻呜嗯哦啊哎]+$/.test(s)) return true;
            if (/^(ok|okay|\+1|666+|好的|收到|嗯嗯|哦哦)$/i.test(s)) return true;
            if (/^https?:\/\//i.test(s)) return true;
            // 纯重复字符
            if (/^(.)\1{5,}$/.test(s)) return true;
            return false;
        };

        this.messages.forEach((msg) => {
            const date = new Date(msg.createTime * 1000);
            if (date.getFullYear() !== this.targetYear) return;
            if (msg.type !== '文本消息') return;

            const raw = normalizeText(msg.content || '');
            const cleaned = normalizeText(stripMentions(raw));
            if (isNoisy(cleaned)) return;

            const key = cleaned.toLowerCase().replace(/\s+/g, '');
            if (!key) return;
            if (dedupe.has(key)) return;
            dedupe.add(key);

            const senderUsername = msg.senderUsername || msg.senderAvatarKey || msg.senderDisplayName || '神秘群友';
            const sender = this._ensureUserMeta(senderUsername, msg).id || '神秘群友';
            const user = this._asUser(sender);
            const stat = this.stats.userStats[sender] || {};

            const text = cleaned.length > maxTextLen ? `${cleaned.slice(0, maxTextLen)}…` : cleaned;
            candidates.push({
                timeMs: date.getTime(),
                time: this.formatDateTime(date),
                user: user?.name || '神秘群友',
                text,
                score: scoreQuote(cleaned, stat),
            });
        });

        // 按分数排序，取前 limit 条
        candidates.sort((a, b) => b.score - a.score);
        const picked = candidates.slice(0, limit);
        
        return picked.map((m) => `[${m.time}] ${m.user}: ${m.text}`);
    }
}

module.exports = ChatAnalyzer;
