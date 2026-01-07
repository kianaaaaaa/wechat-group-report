/**
 * Parse OpenAI Batch output JSONL (OpenAI-compatible gateways included).
 * Normalizes AI-generated content keyed by custom_id.
 *
 * 支持的类型前缀：
 * - event_XX: 热点事件解读
 * - month_XX: 月度主题总结
 * - award_XX: 年度奖项颁奖词
 * - user_XX: 用户画像生成
 * - quote_01: 金句精选
 * - joker_XX: 乐子人分析
 * - sentiment_01: 深度情感分析
 * - group_summary_01: 本群年度总结（锐评版）
 */

const fs = require('fs');
const path = require('path');

function extractBalanced(text, startIdx, openCh, closeCh) {
    const s = String(text || '');
    if (startIdx < 0 || startIdx >= s.length) return null;

    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIdx; i < s.length; i++) {
        const ch = s[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        if (inString) {
            if (ch === '\\') {
                escapeNext = true;
                continue;
            }
            if (ch === '"') inString = false;
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }

        if (ch === openCh) depth++;
        if (ch === closeCh) {
            depth--;
            if (depth === 0) return s.slice(startIdx, i + 1);
        }
    }

    return null;
}

function findFirstKeyIndex(text, keys) {
    const s = String(text || '');
    const ks = Array.isArray(keys) ? keys : [keys];
    let best = -1;
    ks.forEach((k) => {
        if (!k) return;
        const quoted = s.indexOf(`"${k}"`);
        if (quoted >= 0 && (best < 0 || quoted < best)) best = quoted;
    });
    return best;
}

function extractJsonStringAfterKey(text, keys) {
    const s = String(text || '');
    const idx = findFirstKeyIndex(s, keys);
    if (idx < 0) return null;

    const colon = s.indexOf(':', idx);
    if (colon < 0) return null;

    let i = colon + 1;
    while (i < s.length && /\s/.test(s[i])) i++;
    if (s[i] !== '"') return null;

    i++; // skip opening "
    let out = '';
    let escapeNext = false;
    for (; i < s.length; i++) {
        const ch = s[i];
        if (escapeNext) {
            out += ch;
            escapeNext = false;
            continue;
        }
        if (ch === '\\') {
            escapeNext = true;
            continue;
        }
        if (ch === '"') return out.trim() || null;
        out += ch;
    }

    return null;
}

function extractJsonArrayAfterKey(text, keys) {
    const s = String(text || '');
    const idx = findFirstKeyIndex(s, keys);
    if (idx < 0) return null;

    const colon = s.indexOf(':', idx);
    if (colon < 0) return null;

    const bracketStart = s.indexOf('[', colon);
    if (bracketStart < 0) return null;

    const arrayText = extractBalanced(s, bracketStart, '[', ']');
    if (!arrayText) return null;

    try {
        return JSON.parse(arrayText);
    } catch {
        // fallback: extract quoted strings
        const items = [];
        const re = /"((?:\\.|[^"\\])*)"/g;
        let m;
        while ((m = re.exec(arrayText))) {
            const v = String(m[1] || '').replace(/\\"/g, '"').trim();
            if (v) items.push(v);
        }
        return items.length ? items : null;
    }
}

function safeJsonParse(text) {
    try { return JSON.parse(text); } catch { /* ignore */ }
    const s = String(text || '').trim();
    if (!s) return null;

    // Strip ```json ... ``` fences if present
    const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced && fenced[1]) {
        try { return JSON.parse(fenced[1]); } catch { /* ignore */ }
    }

    // Best-effort: take substring between first { and last }
    const i = s.indexOf('{');
    const j = s.lastIndexOf('}');
    if (i >= 0 && j > i) {
        const sub = s.slice(i, j + 1);
        try { return JSON.parse(sub); } catch { /* ignore */ }
    }
    
    // 尝试修复被截断的 JSON（针对数组类型，如金句精选）
    const repaired = tryRepairTruncatedJson(s);
    if (repaired) return repaired;
    
    return null;
}

/**
 * 尝试修复被截断的 JSON
 * 主要针对数组类型的输出（如 { "quotes": [...] } 或 { "年度金句": [...] }）
 */
function tryRepairTruncatedJson(text) {
    if (!text) return null;
    
    // 查找数组开始位置
    const arrayStart = text.indexOf('[');
    if (arrayStart < 0) return null;
    
    // 尝试找到最后一个完整的对象 }
    // 从后往前找，找到第一个 } 后面跟着 , 或 ] 的位置
    let lastCompleteObj = -1;
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let idx = arrayStart; idx < text.length; idx++) {
        const ch = text[idx];
        
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        
        if (ch === '\\' && inString) {
            escapeNext = true;
            continue;
        }
        
        if (ch === '"' && !escapeNext) {
            inString = !inString;
            continue;
        }
        
        if (inString) continue;
        
        if (ch === '{') {
            braceCount++;
        } else if (ch === '}') {
            braceCount--;
            if (braceCount === 0) {
                // 找到一个完整的对象
                lastCompleteObj = idx;
            }
        }
    }
    
    if (lastCompleteObj < 0) return null;
    
    // 尝试构建修复后的 JSON
    // 获取数组字段名
    const beforeArray = text.slice(0, arrayStart);
    const keyMatch = beforeArray.match(/"([^"]+)"\s*:\s*$/);
    if (!keyMatch) return null;
    
    const key = keyMatch[1];
    const arrayContent = text.slice(arrayStart, lastCompleteObj + 1);
    
    // 构建修复后的 JSON
    const repaired = `{"${key}": ${arrayContent}]}`;
    
    try {
        return JSON.parse(repaired);
    } catch {
        // 再尝试一次，不加额外的 ]
        try {
            const repaired2 = `{"${key}": ${arrayContent}]}`.replace(']}', ']}');
            return JSON.parse(repaired2);
        } catch {
            return null;
        }
    }
}

function asStringArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v ?? '').trim()).filter(Boolean);
    return [String(value).trim()].filter(Boolean);
}

function normalizeQuotes(obj) {
    if (!obj) return [];

    if (Array.isArray(obj)) {
        return obj.flatMap(normalizeQuotes);
    }
    if (typeof obj === 'string') return [obj.trim()].filter(Boolean);
    if (typeof obj === 'object') {
        const fields = ['quote', 'message', 'text', 'representative_quote'];
        for (const f of fields) {
            if (obj[f]) return [String(obj[f]).trim()].filter(Boolean);
        }
    }
    return [];
}

function normalizeSummary(value) {
    if (!value) return { lines: [], quotes: [] };
    if (Array.isArray(value)) {
        // either array of strings or objects
        const lines = [];
        const quotes = [];
        value.forEach((item) => {
            if (!item) return;
            if (typeof item === 'string') lines.push(item.trim());
            else if (typeof item === 'object') {
                const topic = item.topic ? String(item.topic).trim() : '';
                if (topic) lines.push(topic);
                quotes.push(...normalizeQuotes(item));
            }
        });
        return { lines: lines.filter(Boolean).slice(0, 3), quotes: quotes.filter(Boolean).slice(0, 5) };
    }
    if (typeof value === 'string') return { lines: [value.trim()].filter(Boolean), quotes: [] };
    return { lines: [], quotes: [] };
}

// ============================================
// 热点事件解析
// ============================================

function normalizeEventJson(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;

    const title = String(parsed.title || '').trim() || null;
    const timeRangeRaw = parsed.time_range || parsed.timeRange || null;
    const date = parsed.date || null;
    const time_range = timeRangeRaw
        ? String(timeRangeRaw).trim()
        : (date ? `${date} ~ ${date}` : null);

    const keywords = asStringArray(parsed.keywords).slice(0, 10);

    const summaryNorm = normalizeSummary(parsed.summary);
    const summary = summaryNorm.lines;

    const quotes = []
        .concat(normalizeQuotes(parsed.quotes))
        .concat(normalizeQuotes(parsed.quote))
        .concat(normalizeQuotes(parsed.representative_quotes))
        .concat(normalizeQuotes(parsed.representative_quote))
        .concat(summaryNorm.quotes)
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 5);

    const mood = String(parsed.mood || '').trim() || null;

    return { title, time_range, keywords, summary, representative_quotes: quotes, mood };
}

// ============================================
// 月度主题解析
// ============================================

function normalizeMonthJson(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;

    // 兼容多种字段名格式（AI 可能使用中文字段名）
    // 也支持嵌套在 summary 对象中的格式
    const summary = parsed.summary || parsed;
    
    const theme = String(
        parsed.theme ||
        parsed.theme_name ||
        parsed.themeName ||
        summary.theme ||
        summary.theme_name ||
        summary.themeName ||
        parsed['主题'] ||
        summary['主题'] ||
        ''
    ).trim() || null;
    
    const mood = String(
        parsed.mood ||
        parsed.vibe ||
        parsed.atmosphere ||
        parsed.theme_description ||
        parsed.themeDescription ||
        summary.atmosphere ||
        summary.theme_description ||
        summary.themeDescription ||
        parsed['氛围'] ||
        summary['氛围'] ||
        summary['atmosphere'] ||
        ''
    ).trim() || null;
    
    const highlights = asStringArray(
        parsed.highlights ||
        summary.highlights ||
        parsed['亮点'] ||
        summary['亮点']
    ).slice(0, 3);
    
    const keywords = asStringArray(
        parsed.keywords ||
        summary.keywords ||
        parsed['关键词'] ||
        summary['关键词']
    ).slice(0, 6);

    if (!theme) return null;

    return { theme, mood, highlights, keywords };
}

function normalizeMonthText(text) {
    const theme = extractJsonStringAfterKey(text, ['theme', 'theme_name', 'themeName', '主题']);
    if (!theme) return null;

    const mood = extractJsonStringAfterKey(text, ['mood', 'vibe', 'atmosphere', 'theme_description', 'themeDescription', '氛围']);

    const highlightsArr = extractJsonArrayAfterKey(text, ['highlights', '亮点']);
    const highlights = asStringArray(highlightsArr).slice(0, 3);

    const keywordsArr = extractJsonArrayAfterKey(text, ['keywords', '关键词']);
    const keywords = asStringArray(keywordsArr).slice(0, 6);

    return { theme, mood: mood || null, highlights, keywords };
}

// ============================================
// 奖项颁奖词解析
// ============================================

function normalizeAwardJson(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;

    // 兼容多种字段名格式（AI 可能使用中文字段名或不同的英文字段名）
    // 支持嵌套在 ceremony 对象中的格式
    const ceremony = parsed.ceremony || {};
    
    const citation = String(
        parsed.citation ||
        parsed.speech ||
        parsed.awardWords ||
        parsed.award_commentary ||
        parsed.presentation_speech ||
        parsed.award_speech ||
        ceremony.script ||
        ceremony.speech ||
        parsed['颁奖词'] ||
        parsed['获奖词'] ||
        ''
    ).trim() || null;
    
    const highlight_quote = String(
        parsed.highlight_quote ||
        parsed.highlightQuote ||
        parsed['代表语录'] ||
        parsed['代表发言'] ||
        parsed['金句'] ||
        ''
    ).trim() || null;
    
    const roast_level = String(
        parsed.roast_level ||
        parsed.roastLevel ||
        parsed['毒舌程度'] ||
        parsed['调侃程度'] ||
        ''
    ).trim() || null;

    if (!citation) return null;

    return { citation, highlight_quote, roast_level };
}

// ============================================
// 用户画像解析
// ============================================

function normalizeUserProfileJson(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;

    // 兼容多种字段名格式（AI 可能使用中文字段名或不同的英文字段名）
    const tags = asStringArray(
        parsed.tags ||
        parsed.abstract_tags ||
        parsed['抽象标签'] ||
        parsed['性格标签'] ||
        parsed['标签']
    ).slice(0, 4);
    
    const description = String(
        parsed.description ||
        parsed.toxic_commentary ||
        parsed['毒舌点评'] ||
        parsed['画像描述'] ||
        parsed['描述'] ||
        ''
    ).trim() || null;
    
    // 精神动物可能是字符串或对象
    let spirit_animal = null;
    const spiritRaw = parsed.spirit_animal || parsed['精神动物'];
    if (spiritRaw) {
        if (typeof spiritRaw === 'string') {
            spirit_animal = spiritRaw.trim();
        } else if (typeof spiritRaw === 'object') {
            // 格式如 { emoji: "🦉", 描述: "..." } 或 { emoji: "🦉", description: "..." }
            const emoji = spiritRaw.emoji || '';
            const desc = spiritRaw['描述'] || spiritRaw.description || '';
            spirit_animal = `${emoji} ${desc}`.trim() || null;
        }
    }
    
    const roast_level = String(
        parsed.roast_level ||
        parsed['调侃程度'] ||
        parsed['毒舌程度'] ||
        ''
    ).trim() || null;

    if (!description && tags.length === 0) return null;

    return { tags, description, spirit_animal, roast_level };
}

// ============================================
// 金句精选解析
// ============================================

function normalizeQuoteSelectionJson(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;

    // 兼容多种字段名格式
    const quotesRaw =
        parsed.quotes ||
        parsed.quote ||
        parsed['年度金句'] ||
        parsed['金句'] ||
        parsed['精选'] ||
        parsed.annual_golden_sentences ||
        parsed['annual_golden_sentences'];
    if (!Array.isArray(quotesRaw)) return null;

    const quotes = quotesRaw
        .map((q) => {
            if (!q) return null;
            if (typeof q === 'string') {
                const s = q.trim();
                if (!s) return null;
                const [maybeUser, rest] = s.split(/[:：]/, 2);
                const hasUser = rest && maybeUser && maybeUser.length <= 20;
                return {
                    content: hasUser ? rest.trim() : s,
                    user: hasUser ? maybeUser.trim() : '（未知）',
                    comment: '',
                    category: '金句',
                };
            }
            if (typeof q !== 'object') return null;

            const content = String(
                q.content ||
                q.sentence ||
                q.text ||
                q['内容'] ||
                q['金句'] ||
                q['句子'] ||
                q['sentence'] ||
                ''
            ).trim();

            let user = String(q.user || q['作者'] || q['用户'] || q['发言人'] || '').trim();
            if (!user) {
                const [maybeUser, rest] = content.split(/[:：]/, 2);
                if (rest && maybeUser && maybeUser.length <= 20) user = maybeUser.trim();
            }
            if (!user) user = '（未知）';

            const c =
                q.commentary ||
                q.comment ||
                q['点评'] ||
                q['评语'] ||
                q['锐评'] ||
                null;

            const comment = typeof c === 'string'
                ? c.trim()
                : (typeof c === 'object' && c)
                    ? String(c.reason_for_inclusion || c.exposure || c.mindset || '').trim()
                    : '';

            const category = String(q.category || q['分类'] || q['类别'] || '').trim() || '金句';

            return { content, user, comment, category };
        })
        .filter(Boolean)
        .filter((q) => q.content)
        .slice(0, 5);

    if (quotes.length === 0) return null;

    return { quotes };
}

function normalizeQuoteSelectionText(text) {
    const arr =
        extractJsonArrayAfterKey(text, ['quotes', 'quote', '年度金句', '金句', '精选']) ||
        extractJsonArrayAfterKey(text, ['annual_golden_sentences', 'annualGoldenSentences']);
    if (!arr) return null;

    const parsed = {
        quotes: arr,
        annual_golden_sentences: arr,
        '年度金句': arr,
        '金句': arr,
        '精选': arr,
    };
    return normalizeQuoteSelectionJson(parsed);
}

function normalizeByTypeFromText(type, text) {
    switch (type) {
        case 'month':
            return normalizeMonthText(text);
        case 'quote':
            return normalizeQuoteSelectionText(text);
        case 'group_summary':
            return normalizeGroupSummaryText(text);
        default:
            return null;
    }
}

// ============================================
// 乐子人分析解析
// ============================================

function normalizeJokerJson(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;

    // 兼容多种字段名格式
    const joker_type = String(
        parsed.joker_type ||
        parsed['乐子人类型'] ||
        parsed['类型'] ||
        ''
    ).trim() || null;
    
    const joker_title = String(
        parsed.joker_title ||
        parsed['乐子人称号'] ||
        parsed['称号'] ||
        ''
    ).trim() || null;
    
    const joker_description = String(
        parsed.joker_description ||
        parsed['乐子人描述'] ||
        parsed['描述'] ||
        ''
    ).trim() || null;
    
    const signature_behaviors = asStringArray(
        parsed.signature_behaviors ||
        parsed['标志性行为'] ||
        parsed['行为特征']
    ).slice(0, 3);
    
    const representative_quote = String(
        parsed.representative_quote ||
        parsed['代表发言'] ||
        parsed['金句'] ||
        ''
    ).trim() || null;

    if (!joker_type && !joker_description) return null;

    return { joker_type, joker_title, joker_description, signature_behaviors, representative_quote };
}

// ============================================
// 情感分析解析
// ============================================

function normalizeSentimentJson(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;

    // 兼容多种字段名格式
    const overall_mood = String(
        parsed.overall_mood ||
        parsed['整体氛围评估'] ||
        parsed['整体氛围'] ||
        parsed['氛围'] ||
        ''
    ).trim() || null;
    
    const mood_score = typeof parsed.mood_score === 'number' ? parsed.mood_score : null;
    
    const characteristics = asStringArray(
        parsed.characteristics ||
        parsed['情感特征'] ||
        parsed['特征']
    ).slice(0, 5);
    
    // trend 可能是对象（包含年初/年中/年末）或字符串
    let trend = parsed.trend || parsed['氛围变化趋势'] || parsed['变化趋势'] || null;
    if (trend && typeof trend === 'string') {
        trend = trend.trim() || null;
    }
    
    const group_personality = String(
        parsed.group_personality ||
        parsed['群聊性格总结'] ||
        parsed['群聊性格'] ||
        parsed['性格总结'] ||
        ''
    ).trim() || null;

    if (!overall_mood) return null;

    return { overall_mood, mood_score, characteristics, trend, group_personality };
}

// ============================================
// 本群年度总结解析
// ============================================

function normalizeGroupSummaryJson(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;

    // 群身份
    let group_identity = null;
    const identityRaw = parsed.group_identity || parsed['群身份'] || parsed['群的身份'];
    if (identityRaw && typeof identityRaw === 'object') {
        group_identity = {
            name: String(
                identityRaw.name ||
                identityRaw['名称'] ||
                identityRaw['这个群自称是什么？'] ||
                identityRaw['自称'] ||
                ''
            ).trim() || null,
            nature: String(
                identityRaw.nature ||
                identityRaw['性质'] ||
                identityRaw['表面性质'] ||
                identityRaw['如果让外人来定义，这是一个怎样的群？'] ||
                ''
            ).trim() || null,
            real_nature: String(
                identityRaw.real_nature ||
                identityRaw['真实性质'] ||
                identityRaw['实际性质'] ||
                identityRaw['实际上它是什么？'] ||
                ''
            ).trim() || null,
        };
    }

    // 群目的
    let group_purpose = null;
    const purposeRaw = parsed.group_purpose || parsed['群目的'] || parsed['群的目的'];
    if (purposeRaw && typeof purposeRaw === 'object') {
        group_purpose = {
            stated_purpose: String(
                purposeRaw.stated_purpose ||
                purposeRaw['声称目的'] ||
                purposeRaw['表面目的'] ||
                purposeRaw['这个群声称的目的是什么？'] ||
                ''
            ).trim() || null,
            actual_purpose: String(
                purposeRaw.actual_purpose ||
                purposeRaw['实际目的'] ||
                purposeRaw['真实目的'] ||
                purposeRaw['实际上群成员来这里是为了什么？'] ||
                ''
            ).trim() || null,
            gap_analysis: String(
                purposeRaw.gap_analysis ||
                purposeRaw['差距分析'] ||
                purposeRaw['分析'] ||
                purposeRaw['理想与现实之间的差距说明了什么？'] ||
                ''
            ).trim() || null,
        };
    }

    // 成员画像
    const archetypesRaw = parsed.member_archetypes || parsed['成员画像'] || parsed['典型角色'] || [];
    const member_archetypes = (Array.isArray(archetypesRaw) ? archetypesRaw : [])
        .filter(a => a && typeof a === 'object')
        .map(a => ({
            archetype: String(a.archetype || a['角色'] || a['类型'] || '').trim(),
            description: String(a.description || a['描述'] || '').trim(),
            psychological_need: String(a.psychological_need || a['心理需求'] || a['需求'] || '').trim(),
        }))
        .filter(a => a.archetype)
        .slice(0, 6);

    // 集体幻觉
    const delusionsRaw = parsed.collective_delusions || parsed['集体幻觉'] || parsed['集体自欺'] || [];
    const collective_delusions = (Array.isArray(delusionsRaw) ? delusionsRaw : [])
        .filter(d => d && typeof d === 'object')
        .map(d => ({
            delusion: String(d.delusion || d['幻觉'] || d['自欺'] || '').trim(),
            reality: String(d.reality || d['现实'] || d['真相'] || '').trim(),
            why_they_believe: String(d.why_they_believe || d['为什么相信'] || d['原因'] || '').trim(),
        }))
        .filter(d => d.delusion)
        .slice(0, 5);

    // 残酷真相
    const brutalRaw =
        parsed.brutal_truths ||
        parsed['残酷真相'] ||
        parsed['真相'] ||
        parsed['不愿面对的真相'];

    let brutal_truths = [];
    if (brutalRaw && typeof brutalRaw === 'object' && !Array.isArray(brutalRaw)) {
        brutal_truths = [
            brutalRaw['如果你是这群人的敌人，你会说什么？'],
            brutalRaw['敌人视角'],
            brutalRaw['敌人会说'],
        ]
            .map((v) => String(v || '').trim())
            .filter(Boolean)
            .slice(0, 6);
    } else {
        brutal_truths = asStringArray(brutalRaw).slice(0, 6);
    }

    // 年度一句话总结
    const year_in_one_sentence = String(
        parsed.year_in_one_sentence ||
        parsed['年度一句话总结'] ||
        parsed['一句话总结'] ||
        ''
    ).trim() || null;

    // 忠告
    const advice_if_any = String(
        parsed.advice_if_any ||
        parsed['忠告'] ||
        parsed['建议'] ||
        ''
    ).trim() || null;

    // 至少需要有一句话总结才算有效
    if (!year_in_one_sentence && brutal_truths.length === 0) return null;

    return {
        group_identity,
        group_purpose,
        member_archetypes,
        collective_delusions,
        brutal_truths,
        year_in_one_sentence,
        advice_if_any,
    };
}

function normalizeGroupSummaryText(text) {
    const enemy = extractJsonStringAfterKey(text, ['如果你是这群人的敌人，你会说什么？']);
    const realNature = extractJsonStringAfterKey(text, ['实际上它是什么？']);
    const outsider = extractJsonStringAfterKey(text, ['如果让外人来定义，这是一个怎样的群？']);
    const statedPurpose = extractJsonStringAfterKey(text, ['这个群声称的目的是什么？']);
    const actualPurpose = extractJsonStringAfterKey(text, ['实际上群成员来这里是为了什么？']);

    const brutal_truths = [enemy].filter(Boolean);

    const group_identity = (realNature || outsider) ? {
        name: null,
        nature: outsider || null,
        real_nature: realNature || null,
    } : null;

    const group_purpose = (statedPurpose || actualPurpose) ? {
        stated_purpose: statedPurpose || null,
        actual_purpose: actualPurpose || null,
        gap_analysis: null,
    } : null;

    if (!brutal_truths.length && !group_identity && !group_purpose) return null;

    return {
        group_identity,
        group_purpose,
        member_archetypes: [],
        collective_delusions: [],
        brutal_truths,
        year_in_one_sentence: null,
        advice_if_any: null,
    };
}

// ============================================
// 统一解析入口
// ============================================

function getTypeFromCustomId(customId) {
    if (!customId) return null;
    const id = String(customId);
    if (id.startsWith('event_')) return 'event';
    if (id.startsWith('month_')) return 'month';
    if (id.startsWith('award_')) return 'award';
    if (id.startsWith('user_')) return 'user';
    if (id.startsWith('quote_')) return 'quote';
    if (id.startsWith('joker_')) return 'joker';
    if (id.startsWith('sentiment_')) return 'sentiment';
    if (id.startsWith('group_summary_')) return 'group_summary';
    return null;
}

function normalizeByType(type, parsed) {
    switch (type) {
        case 'event':
            return normalizeEventJson(parsed);
        case 'month':
            return normalizeMonthJson(parsed);
        case 'award':
            return normalizeAwardJson(parsed);
        case 'user':
            return normalizeUserProfileJson(parsed);
        case 'quote':
            return normalizeQuoteSelectionJson(parsed);
        case 'joker':
            return normalizeJokerJson(parsed);
        case 'sentiment':
            return normalizeSentimentJson(parsed);
        case 'group_summary':
            return normalizeGroupSummaryJson(parsed);
        default:
            return null;
    }
}

function extractContent(row) {
    const body = row?.response?.body;
    // OpenAI Chat Completions format
    const chatContent = body?.choices?.[0]?.message?.content;
    if (chatContent && typeof chatContent === 'string') return chatContent;
    
    // OpenAI Responses API format
    const respContent = body?.output?.[0]?.content?.[0]?.text;
    if (respContent && typeof respContent === 'string') return respContent;
    
    // Direct content field
    if (body?.content && typeof body.content === 'string') return body.content;
    
    return null;
}

// ============================================
// 主加载函数
// ============================================

/**
 * 加载并解析所有 AI 输出
 * @param {string} batchOutputPath - JSONL 文件路径
 * @returns {Object} 按类型分组的解析结果
 */
function loadAllAiResults(batchOutputPath) {
    if (!batchOutputPath) return { events: {}, months: {}, awards: {}, users: {}, quotes: null, jokers: {}, sentiment: null, groupSummary: null };
    const p = path.resolve(process.cwd(), batchOutputPath);
    if (!fs.existsSync(p)) return { events: {}, months: {}, awards: {}, users: {}, quotes: null, jokers: {}, sentiment: null, groupSummary: null };

    const lines = fs.readFileSync(p, 'utf-8').split(/\r?\n/).filter(Boolean);
    const result = {
        events: {},
        months: {},
        awards: {},
        users: {},
        quotes: null,
        jokers: {},
        sentiment: null,
        groupSummary: null,
    };

    lines.forEach((line) => {
        const row = safeJsonParse(line);
        const customId = row && row.custom_id ? String(row.custom_id) : null;
        if (!customId) return;

        const type = getTypeFromCustomId(customId);
        if (!type) return;

        const content = extractContent(row);
        if (!content) return;

        const parsed = safeJsonParse(content);
        const normalized = normalizeByType(type, parsed) || normalizeByTypeFromText(type, content);
        if (!normalized) return;

        switch (type) {
            case 'event':
                if (normalized.title) result.events[customId] = normalized;
                break;
            case 'month':
                if (normalized.theme) result.months[customId] = normalized;
                break;
            case 'award':
                if (normalized.citation) result.awards[customId] = normalized;
                break;
            case 'user':
                if (normalized.description || normalized.tags?.length) result.users[customId] = normalized;
                break;
            case 'quote':
                if (normalized.quotes?.length) result.quotes = normalized;
                break;
            case 'joker':
                if (normalized.joker_type || normalized.joker_description) result.jokers[customId] = normalized;
                break;
            case 'sentiment':
                if (normalized.overall_mood) result.sentiment = normalized;
                break;
            case 'group_summary':
                if (normalized.year_in_one_sentence || normalized.brutal_truths?.length) result.groupSummary = normalized;
                break;
        }
    });

    return result;
}

/**
 * 兼容旧版：仅加载事件摘要
 * @param {string} batchOutputPath - JSONL 文件路径
 * @returns {Object} 事件摘要映射 { event_01: {...}, ... }
 */
function loadAiEventSummaries(batchOutputPath) {
    const all = loadAllAiResults(batchOutputPath);
    return all.events || {};
}

module.exports = {
    loadAiEventSummaries,
    loadAllAiResults,
    // 导出各类型解析函数供测试使用
    normalizeEventJson,
    normalizeMonthJson,
    normalizeAwardJson,
    normalizeUserProfileJson,
    normalizeQuoteSelectionJson,
    normalizeJokerJson,
    normalizeSentimentJson,
    normalizeGroupSummaryJson,
};

