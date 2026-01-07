/**
 * OpenAI NLP 深度解读 - Prompt + Schema
 * @module ai/prompts
 *
 * 支持的任务类型：
 * - event_XX: 热点事件解读
 * - month_XX: 月度主题总结
 * - award_XX: 年度奖项颁奖词
 * - user_XX: 用户画像生成
 * - quote_XX: 金句精选
 * - sentiment_XX: 深度情感分析
 * - joker_XX: 乐子人分析
 * - group_summary_01: 本群年度总结（锐评版）
 *
 * 风格说明：
 * - roast: 毫不留情的解剖师风格 - 极度诚实、思维发散、刻薄但准确
 * - normal: 普通分析师风格
 */

// ============================================
// 获取风格配置
// ============================================

function getStyleConfig() {
    const style = process.env.AI_STYLE || 'roast';
    const roastLevel = Number(process.env.AI_ROAST_LEVEL || 3);
    return { style, roastLevel };
}

function isRoastStyle() {
    return getStyleConfig().style === 'roast';
}

// ============================================
// 核心风格提示词 - 毫不留情的知识体系解剖师
// ============================================

const DISSECTOR_PERSONA = `你是一个极度诚实、思维发散、不受任何社交礼仪束缚的观察者。
你像一个刻薄但准确的朋友，毫无保留地说出真实想法。

说话风格要求：
- 直接、尖锐、不绕弯子
- 可以讽刺，可以调侃，可以质疑
- 不需要温和，不需要鼓励，不需要安慰
- 敢于指出皇帝的新衣
- 可以推翻常识，可以反向思考
- 越真实越好`;

const DISSECTOR_ANALYSIS_ANGLES = `你可以从任何角度发散思考：
- 这些内容暴露了什么问题？
- 有什么奇怪或可笑的地方？
- 能看出什么认知盲区？
- 在自欺欺人什么？装什么？
- 哪些想法很幼稚？哪些很虚伪？
- 价值观和行为之间有什么矛盾？
- 哪里还很 naive？
- 追求什么？这些追求合理吗？
- 焦虑和困惑反映了什么本质问题？
- 如果你是旁观者，你会如何评价？`;

// ============================================
// 热点事件相关 (保持原有逻辑)
// ============================================

function buildEventSummarySchema() {
    return {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'time_range', 'summary', 'keywords', 'mood', 'representative_quotes', 'notes'],
        properties: {
            title: { type: 'string', minLength: 1, maxLength: 40 },
            time_range: { type: 'string', minLength: 1, maxLength: 40 },
            summary: {
                type: 'array',
                minItems: 1,
                maxItems: 3,
                items: { type: 'string', minLength: 1, maxLength: 120 },
            },
            keywords: {
                type: 'array',
                minItems: 0,
                maxItems: 10,
                items: { type: 'string', minLength: 1, maxLength: 20 },
            },
            mood: {
                type: 'string',
                enum: ['正向', '中性', '负向', '混合', '未知'],
            },
            representative_quotes: {
                type: 'array',
                minItems: 0,
                maxItems: 5,
                items: { type: 'string', minLength: 1, maxLength: 80 },
            },
            notes: { type: 'string', minLength: 0, maxLength: 200 },
        },
    };
}

function buildEventSystemPrompt() {
    return [
        '你是年度群聊报告的分析师。',
        '你必须只基于输入的 messages 进行总结，不能编造未出现的信息。',
        '输出必须严格符合 JSON schema（不要输出 Markdown、不要多余文本）。',
        '标题要像新闻标题，6-16 个汉字优先。',
        '关键词应描述话题，不要包含用户名/群昵称。',
        '代表引语要短（<= 40 字左右），尽量保持原话。',
    ].join('\n');
}

function buildEventUserPrompt({ year, time_range, message_count, keywords_from_local, messages }) {
    const kw = Array.isArray(keywords_from_local) ? keywords_from_local : [];
    const lines = Array.isArray(messages) ? messages : [];
    return [
        '请把下面这段群聊切片总结成 JSON。',
        '',
        'Chunk metadata:',
        `- year: ${year}`,
        `- time_range: ${time_range}`,
        `- message_count: ${message_count}`,
        kw.length ? `- keywords_from_local: ${kw.join(', ')}` : '- keywords_from_local: (none)',
        '',
        'Messages:',
        ...lines,
    ].join('\n');
}

function buildEventBatchRequest({
    model,
    year,
    time_range,
    message_count,
    keywords_from_local,
    messages,
    max_output_tokens = 700,
}) {
    return {
        model,
        input: [
            { role: 'system', content: buildEventSystemPrompt() },
            {
                role: 'user',
                content: buildEventUserPrompt({ year, time_range, message_count, keywords_from_local, messages }),
            },
        ],
        // Structured Outputs (Responses API)
        text: {
            format: {
                type: 'json_schema',
                strict: true,
                schema: buildEventSummarySchema(),
            },
        },
        max_output_tokens,
        // no tools needed
        parallel_tool_calls: false,
    };
}

// ============================================
// 月度主题总结
// ============================================

function buildMonthSummarySchema() {
    return {
        type: 'object',
        additionalProperties: false,
        required: ['theme', 'mood', 'highlights', 'keywords'],
        properties: {
            theme: { type: 'string', minLength: 2, maxLength: 20 },
            mood: { type: 'string', minLength: 5, maxLength: 60 },
            highlights: {
                type: 'array',
                minItems: 1,
                maxItems: 3,
                items: { type: 'string', minLength: 5, maxLength: 80 },
            },
            keywords: {
                type: 'array',
                minItems: 0,
                maxItems: 6,
                items: { type: 'string', minLength: 1, maxLength: 15 },
            },
        },
    };
}

function buildMonthSystemPrompt() {
    if (isRoastStyle()) {
        return [
            DISSECTOR_PERSONA,
            '',
            '你的任务是分析这个月的群聊，像解剖标本一样剖析这群人这个月在干什么。',
            '',
            '分析角度：',
            '- 这个月群里在集体发什么疯？',
            '- 有什么可笑的集体行为或幻觉？',
            '- 这些话题暴露了什么问题？',
            '- 如果让外人看到会觉得多离谱？',
            '',
            '要求：',
            '1. 主题名称要一针见血，2-6个字，可以讽刺',
            '2. 氛围描述要直接，不要粉饰太平（<= 50 字）',
            '3. 高亮只写 3 条，每条 <= 60 字',
            '4. 关键词 0-6 个（不要人名）',
            '5. 输出必须是纯 JSON，且 key 必须严格使用: theme, mood, highlights, keywords（不要 theme_name / atmosphere / summary 等变体；不要嵌套）',
        ].join('\n');
    }
    return [
        '你是年度群聊报告的分析师。',
        '根据群聊消息总结该月的主题和氛围。',
        '输出必须严格符合 JSON schema。',
        '主题名称要简短，2-6个字，如「春节团聚」「考试季」。',
        '输出 JSON key 必须严格使用: theme, mood, highlights, keywords（不要嵌套）。',
    ].join('\n');
}

function buildMonthUserPrompt({ year, month, message_count, keywords_from_local, messages }) {
    const kw = Array.isArray(keywords_from_local) ? keywords_from_local : [];
    const lines = Array.isArray(messages) ? messages : [];
    return [
        `请总结 ${year} 年 ${month} 月的群聊主题和氛围。`,
        '',
        'Metadata:',
        `- year: ${year}`,
        `- month: ${month}`,
        `- message_count: ${message_count}`,
        kw.length ? `- keywords_from_local: ${kw.join(', ')}` : '- keywords_from_local: (none)',
        '',
        'Messages:',
        ...lines,
    ].join('\n');
}

function buildMonthBatchRequest({ model, year, month, message_count, keywords_from_local, messages, max_output_tokens = 650 }) {
    return {
        model,
        input: [
            { role: 'system', content: buildMonthSystemPrompt() },
            { role: 'user', content: buildMonthUserPrompt({ year, month, message_count, keywords_from_local, messages }) },
        ],
        text: {
            format: {
                type: 'json_schema',
                strict: true,
                schema: buildMonthSummarySchema(),
            },
        },
        max_output_tokens,
        parallel_tool_calls: false,
    };
}

// ============================================
// 年度奖项颁奖词
// ============================================

function buildAwardCitationSchema() {
    return {
        type: 'object',
        additionalProperties: false,
        required: ['citation', 'highlight_quote', 'roast_level'],
        properties: {
            citation: { type: 'string', minLength: 20, maxLength: 200 },
            highlight_quote: { type: 'string', minLength: 0, maxLength: 60 },
            roast_level: {
                type: 'string',
                enum: ['轻微调侃', '友好毒舌', '全力输出', '无'],
            },
        },
    };
}

function buildAwardSystemPrompt() {
    if (isRoastStyle()) {
        return [
            DISSECTOR_PERSONA,
            '',
            '你是一个毫不留情的年度颁奖典礼主持人。',
            '你的任务是为获奖者撰写颁奖词，但不是那种虚伪的表扬。',
            '',
            '你要思考：',
            '- 这个人为什么会得这个奖？说明了什么问题？',
            '- 这个"成就"真的值得骄傲吗？还是恰恰暴露了什么？',
            '- 获奖数据背后隐藏着什么真相？',
            '- 如果你是这个人的敌人，你会如何解读这份"荣誉"？',
            '',
            '要求：',
            '1. 颁奖词要直接、尖锐，可以讽刺调侃',
            '2. 要结合数据进行深度解读，而不是表面赞美',
            '3. 要敢于说出那些不好意思说的真话',
            '4. 长度：40-100字',
            '5. 输出必须严格符合 JSON schema',
        ].join('\n');
    }
    return [
        '你是年度群聊颁奖典礼的主持人。',
        '为奖项获得者撰写个性化颁奖词。',
        '风格活泼有趣，结合获奖者数据。',
        '长度：40-80字',
        '输出必须严格符合 JSON schema。',
    ].join('\n');
}

function buildAwardUserPrompt({ award_name, award_icon, user_name, stats, sample_messages }) {
    const statsStr = Object.entries(stats || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    const msgLines = Array.isArray(sample_messages) ? sample_messages : [];
    return [
        `请为以下奖项获得者撰写颁奖词：`,
        '',
        `奖项：${award_icon} ${award_name}`,
        `获奖者：${user_name}`,
        '',
        '获奖数据：',
        statsStr || '- (无详细数据)',
        '',
        '获奖者代表发言：',
        ...(msgLines.length ? msgLines : ['(无代表发言)']),
    ].join('\n');
}

function buildAwardBatchRequest({ model, award_name, award_icon, user_name, stats, sample_messages, max_output_tokens = 300 }) {
    return {
        model,
        input: [
            { role: 'system', content: buildAwardSystemPrompt() },
            { role: 'user', content: buildAwardUserPrompt({ award_name, award_icon, user_name, stats, sample_messages }) },
        ],
        text: {
            format: {
                type: 'json_schema',
                strict: true,
                schema: buildAwardCitationSchema(),
            },
        },
        max_output_tokens,
        parallel_tool_calls: false,
    };
}

// ============================================
// 用户画像生成
// ============================================

function buildUserProfileSchema() {
    return {
        type: 'object',
        additionalProperties: false,
        required: ['tags', 'description', 'spirit_animal', 'roast_level'],
        properties: {
            tags: {
                type: 'array',
                minItems: 2,
                maxItems: 4,
                items: { type: 'string', minLength: 2, maxLength: 20 },
            },
            description: { type: 'string', minLength: 10, maxLength: 120 },
            spirit_animal: { type: 'string', minLength: 2, maxLength: 20 },
            roast_level: {
                type: 'string',
                enum: ['轻微调侃', '友好毒舌', '全力输出', '无'],
            },
        },
    };
}

function buildUserProfileSystemPrompt() {
    if (isRoastStyle()) {
        return [
            DISSECTOR_PERSONA,
            '',
            '你的任务是根据一个人在群里的发言和行为，生成一份毫不留情的人物解剖报告。',
            '',
            DISSECTOR_ANALYSIS_ANGLES,
            '',
            '具体分析：',
            '- 这个人的发言模式暴露了什么性格缺陷？',
            '- 他的行为背后是什么心理需求？',
            '- 他在群里扮演什么角色？为什么？',
            '- 他的自我认知和实际表现有什么差距？',
            '- 哪些地方很虚伪？哪些地方在装？',
            '',
            '要求：',
            '1. 标签要一针见血，揭示本质，2-4个',
            '2. 描述要直接，1-2句话，不要客套',
            '3. 精神动物要有讽刺意味（emoji+描述）',
            '4. 输出必须严格符合 JSON schema',
        ].join('\n');
    }
    return [
        '根据群友的发言和行为数据，生成人物画像。',
        '要求：',
        '1. 性格标签：2-4个描述性标签',
        '2. 画像描述：1-2句话',
        '3. 精神动物：用emoji+简短描述',
        '输出必须严格符合 JSON schema。',
    ].join('\n');
}

function buildUserProfileUserPrompt({ user_name, stats, sample_messages }) {
    const statsStr = Object.entries(stats || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    const msgLines = Array.isArray(sample_messages) ? sample_messages : [];
    return [
        `请为群友「${user_name}」生成人物画像：`,
        '',
        '行为数据：',
        statsStr || '- (无详细数据)',
        '',
        '代表发言：',
        ...(msgLines.length ? msgLines : ['(无代表发言)']),
    ].join('\n');
}

function buildUserProfileBatchRequest({ model, user_name, stats, sample_messages, max_output_tokens = 300 }) {
    return {
        model,
        input: [
            { role: 'system', content: buildUserProfileSystemPrompt() },
            { role: 'user', content: buildUserProfileUserPrompt({ user_name, stats, sample_messages }) },
        ],
        text: {
            format: {
                type: 'json_schema',
                strict: true,
                schema: buildUserProfileSchema(),
            },
        },
        max_output_tokens,
        parallel_tool_calls: false,
    };
}

// ============================================
// 金句精选
// ============================================

function buildQuoteSelectionSchema() {
    return {
        type: 'object',
        additionalProperties: false,
        required: ['quotes'],
        properties: {
            quotes: {
                type: 'array',
                minItems: 1,
                maxItems: 5,
                items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['content', 'user', 'comment', 'category'],
                    properties: {
                        content: { type: 'string', minLength: 1, maxLength: 100 },
                        user: { type: 'string', minLength: 1, maxLength: 30 },
                        comment: { type: 'string', minLength: 5, maxLength: 80 },
                        category: { type: 'string', minLength: 2, maxLength: 15 },
                    },
                },
            },
        },
    };
}

function buildQuoteSystemPrompt() {
    if (isRoastStyle()) {
        return [
            DISSECTOR_PERSONA,
            '',
            '你的任务是从候选消息中精选年度"金句"——那些最能暴露这群人真实面貌的发言。',
            '',
            '评选标准：',
            '1. 最能暴露认知盲区或思维缺陷的发言',
            '2. 最能展示集体幻觉或自欺欺人的发言',
            '3. 最幼稚、最虚伪、或最自相矛盾的发言',
            '4. 当然，也可以是真正有洞察力的发言（如果有的话）',
            '5. 避免无意义的水消息',
            '',
            '为每条金句配上尖锐点评：',
            '- 这句话暴露了什么？',
            '- 说这话的人在想什么？',
            '- 为什么这句话值得被"收录"？',
            '',
            '输出必须严格符合 JSON schema（只输出 { "quotes": [...] }，不要 annual_golden_sentences / commentary 等结构）。',
            '每条 comment 请控制在 1 句话内（<= 60 字），避免长篇大论导致截断。',
        ].join('\n');
    }
    return [
        '从候选消息中精选最值得收录的年度金句。',
        '评选标准：',
        '1. 有趣或发人深省',
        '2. 能代表群聊的风格',
        '3. 避免无意义的水消息',
        '为每条金句配上简短点评。',
        '输出必须严格符合 JSON schema。',
    ].join('\n');
}

function buildQuoteUserPrompt({ year, candidates }) {
    const lines = Array.isArray(candidates) ? candidates : [];
    return [
        `请从以下 ${year} 年的候选消息中精选 5 条年度金句：`,
        '',
        '候选消息：',
        ...lines,
    ].join('\n');
}

function buildQuoteBatchRequest({ model, year, candidates, max_output_tokens = 1200 }) {
    return {
        model,
        input: [
            { role: 'system', content: buildQuoteSystemPrompt() },
            { role: 'user', content: buildQuoteUserPrompt({ year, candidates }) },
        ],
        text: {
            format: {
                type: 'json_schema',
                strict: true,
                schema: buildQuoteSelectionSchema(),
            },
        },
        max_output_tokens,
        parallel_tool_calls: false,
    };
}

// ============================================
// 乐子人分析
// ============================================

function buildJokerAnalysisSchema() {
    return {
        type: 'object',
        additionalProperties: false,
        required: ['joker_type', 'joker_title', 'joker_description', 'signature_behaviors', 'representative_quote'],
        properties: {
            joker_type: {
                type: 'string',
                enum: ['捣乱者', '气氛组', '段子手', '复读机', '阴阳师', '正能量', '观察者'],
            },
            joker_title: { type: 'string', minLength: 2, maxLength: 20 },
            joker_description: { type: 'string', minLength: 20, maxLength: 150 },
            signature_behaviors: {
                type: 'array',
                minItems: 1,
                maxItems: 3,
                items: { type: 'string', minLength: 5, maxLength: 40 },
            },
            representative_quote: { type: 'string', minLength: 0, maxLength: 60 },
        },
    };
}

function buildJokerSystemPrompt() {
    if (isRoastStyle()) {
        return [
            DISSECTOR_PERSONA,
            '',
            '你的任务是分析群里的"乐子人"——那些在群里刷存在感的活跃分子。',
            '',
            '乐子人类型（但你可以重新定义他们）：',
            '- 捣乱者：以整人、惹事为乐，可能是因为现实中太无聊',
            '- 气氛组：哈哈党、666党，可能只是害怕冷场',
            '- 段子手：经常讲段子，可能在用幽默掩饰什么',
            '- 复读机：跟风复读，可能是缺乏独立思考',
            '- 阴阳师：阴阳怪气，可能是不敢直接表达不满',
            '- 正能量：鸡汤输出，可能是在说服自己',
            '- 观察者：潜水党，可能是觉得其他人都很幼稚',
            '',
            '深度分析：',
            '- 这个人为什么要扮演这个角色？',
            '- 这种行为模式反映了什么心理需求？',
            '- 他在群里寻找什么？得到了吗？',
            '- 这种"乐子"背后是什么？',
            '',
            '要求：',
            '1. 判断类型，但要给出深层解读',
            '2. 称号要一针见血，揭示本质',
            '3. 描述要直接，不要粉饰',
            '4. 列出标志性行为，并解读其含义',
            '5. 输出必须严格符合 JSON schema',
        ].join('\n');
    }
    return [
        '分析群里的活跃用户，判断其"乐子人"类型。',
        '类型包括：捣乱者、气氛组、段子手、复读机、阴阳师、正能量、观察者',
        '要求：',
        '1. 判断类型',
        '2. 给一个有趣的称号',
        '3. 描述其在群里的形象',
        '4. 列出标志性行为',
        '输出必须严格符合 JSON schema。',
    ].join('\n');
}

function buildJokerUserPrompt({ user_name, stats, sample_messages }) {
    const statsStr = Object.entries(stats || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    const msgLines = Array.isArray(sample_messages) ? sample_messages : [];
    return [
        `请分析群友「${user_name}」的"乐子人"类型：`,
        '',
        '行为数据：',
        statsStr || '- (无详细数据)',
        '',
        '代表发言：',
        ...(msgLines.length ? msgLines : ['(无代表发言)']),
    ].join('\n');
}

function buildJokerBatchRequest({ model, user_name, stats, sample_messages, max_output_tokens = 350 }) {
    return {
        model,
        input: [
            { role: 'system', content: buildJokerSystemPrompt() },
            { role: 'user', content: buildJokerUserPrompt({ user_name, stats, sample_messages }) },
        ],
        text: {
            format: {
                type: 'json_schema',
                strict: true,
                schema: buildJokerAnalysisSchema(),
            },
        },
        max_output_tokens,
        parallel_tool_calls: false,
    };
}

// ============================================
// 深度情感分析
// ============================================

function buildSentimentAnalysisSchema() {
    return {
        type: 'object',
        additionalProperties: false,
        required: ['overall_mood', 'mood_score', 'characteristics', 'trend', 'group_personality'],
        properties: {
            overall_mood: {
                type: 'string',
                enum: ['太典了', '正向', '中性', '有点寄', '负向'],
            },
            mood_score: { type: 'number', minimum: 0, maximum: 10 },
            characteristics: {
                type: 'array',
                minItems: 2,
                maxItems: 5,
                items: { type: 'string', minLength: 2, maxLength: 20 },
            },
            trend: { type: 'string', minLength: 10, maxLength: 100 },
            group_personality: { type: 'string', minLength: 10, maxLength: 80 },
        },
    };
}

function buildSentimentSystemPrompt() {
    if (isRoastStyle()) {
        return [
            DISSECTOR_PERSONA,
            '',
            '你的任务是像解剖师一样分析这个群聊的整体氛围和情感倾向。',
            '',
            '深度分析角度：',
            '- 这个群的氛围健康吗？还是有什么隐藏的问题？',
            '- 群成员的情感状态反映了什么？',
            '- 表面的欢乐/吐槽/讨论背后是什么？',
            '- 这群人聚在一起是为了什么？得到了吗？',
            '- 如果让外人来看这个群，会有什么感受？',
            '- 这个群有什么集体性的认知盲区或自欺欺人？',
            '',
            '要求：',
            '1. 整体氛围评估：太典了/正向/中性/有点寄/负向',
            '2. 情感特征：直接描述，不要粉饰',
            '3. 氛围变化趋势：年初到年末发生了什么变化？为什么？',
            '4. 群聊性格总结：一句话，直接、尖锐、真实',
            '5. 输出必须严格符合 JSON schema',
        ].join('\n');
    }
    return [
        '分析群聊消息的整体氛围和情感倾向。',
        '要求：',
        '1. 整体氛围评估：正向/中性/负向',
        '2. 情感特征描述',
        '3. 氛围变化趋势',
        '4. 群聊性格总结',
        '输出必须严格符合 JSON schema。',
    ].join('\n');
}

function buildSentimentUserPrompt({ year, local_sentiment, messages }) {
    const lines = Array.isArray(messages) ? messages : [];
    const localInfo = local_sentiment ? [
        '本地分析参考：',
        `- 正向消息占比: ${local_sentiment.posRatio || 'N/A'}`,
        `- 负向消息占比: ${local_sentiment.negRatio || 'N/A'}`,
        `- 平均情感分: ${local_sentiment.avgScore || 'N/A'}`,
        '',
    ] : [];
    return [
        `请分析 ${year} 年群聊的整体氛围：`,
        '',
        ...localInfo,
        '采样消息：',
        ...lines,
    ].join('\n');
}

function buildSentimentBatchRequest({ model, year, local_sentiment, messages, max_output_tokens = 400 }) {
    return {
        model,
        input: [
            { role: 'system', content: buildSentimentSystemPrompt() },
            { role: 'user', content: buildSentimentUserPrompt({ year, local_sentiment, messages }) },
        ],
        text: {
            format: {
                type: 'json_schema',
                strict: true,
                schema: buildSentimentAnalysisSchema(),
            },
        },
        max_output_tokens,
        parallel_tool_calls: false,
    };
}

// ============================================
// 本群年度总结（锐评版）
// ============================================

function buildGroupSummarySchema() {
    return {
        type: 'object',
        additionalProperties: false,
        required: [
            'group_identity',
            'group_purpose',
            'member_archetypes',
            'collective_delusions',
            'brutal_truths',
            'year_in_one_sentence',
            'advice_if_any'
        ],
        properties: {
            group_identity: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'nature', 'real_nature'],
                properties: {
                    name: { type: 'string', minLength: 2, maxLength: 30 },
                    nature: { type: 'string', minLength: 5, maxLength: 50 },
                    real_nature: { type: 'string', minLength: 10, maxLength: 100 },
                },
            },
            group_purpose: {
                type: 'object',
                additionalProperties: false,
                required: ['stated_purpose', 'actual_purpose', 'gap_analysis'],
                properties: {
                    stated_purpose: { type: 'string', minLength: 5, maxLength: 80 },
                    actual_purpose: { type: 'string', minLength: 10, maxLength: 100 },
                    gap_analysis: { type: 'string', minLength: 10, maxLength: 150 },
                },
            },
            member_archetypes: {
                type: 'array',
                minItems: 3,
                maxItems: 6,
                items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['archetype', 'description', 'psychological_need'],
                    properties: {
                        archetype: { type: 'string', minLength: 2, maxLength: 20 },
                        description: { type: 'string', minLength: 10, maxLength: 80 },
                        psychological_need: { type: 'string', minLength: 10, maxLength: 80 },
                    },
                },
            },
            collective_delusions: {
                type: 'array',
                minItems: 2,
                maxItems: 5,
                items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['delusion', 'reality', 'why_they_believe'],
                    properties: {
                        delusion: { type: 'string', minLength: 5, maxLength: 60 },
                        reality: { type: 'string', minLength: 10, maxLength: 100 },
                        why_they_believe: { type: 'string', minLength: 10, maxLength: 80 },
                    },
                },
            },
            brutal_truths: {
                type: 'array',
                minItems: 3,
                maxItems: 6,
                items: { type: 'string', minLength: 10, maxLength: 120 },
            },
            year_in_one_sentence: { type: 'string', minLength: 20, maxLength: 150 },
            advice_if_any: { type: 'string', minLength: 0, maxLength: 200 },
        },
    };
}

function buildGroupSummarySystemPrompt() {
    if (isRoastStyle()) {
        return [
            DISSECTOR_PERSONA,
            '',
            '你的任务是对这个群聊进行一次年度总结——但不是那种虚伪的、充满正能量的总结。',
            '你要像一个毫不留情的知识体系解剖师，把这个群的真实面貌剖析得清清楚楚。',
            '',
            DISSECTOR_ANALYSIS_ANGLES,
            '',
            '你需要回答：',
            '',
            '【群的身份】',
            '- 这个群自称是什么？',
            '- 实际上它是什么？',
            '- 如果让外人来定义，这是一个怎样的群？',
            '',
            '【群的目的】',
            '- 这个群声称的目的是什么？',
            '- 实际上群成员来这里是为了什么？',
            '- 理想与现实之间的差距说明了什么？',
            '',
            '【成员画像】',
            '- 这个群里有哪些典型角色/人设？',
            '- 每种角色反映了什么心理需求？',
            '- 他们为什么会聚在一起？',
            '',
            '【集体幻觉】',
            '- 群成员有哪些集体性的自欺欺人？',
            '- 他们相信什么但实际上并非如此？',
            '- 为什么他们需要维持这些幻觉？',
            '',
            '【残酷真相】',
            '- 如果你是这群人的敌人，你会说什么？',
            '- 有哪些他们不愿意面对的真相？',
            '- 这个群的存在价值是什么？值得吗？',
            '',
            '【年度一句话总结】',
            '- 用最直接、最尖锐的一句话总结这个群的这一年',
            '',
            '【忠告（如果有的话）】',
            '- 如果这群人想要改变，他们需要做什么？',
            '- 或者，直接告诉他们为什么不需要改变',
            '',
            '要求：',
            '1. 极度诚实，不要有任何社交礼仪',
            '2. 可以讽刺、调侃、质疑，越真实越好',
            '3. 敢于说出那些"不好意思说"的话',
            '4. 如果这个群很无聊，就直接说它很无聊',
            '5. 输出必须严格符合 JSON schema',
        ].join('\n');
    }
    return [
        '你是年度群聊报告的分析师，负责撰写群聊年度总结。',
        '',
        '你需要分析：',
        '1. 群的身份和定位',
        '2. 群的目的和实际用途',
        '3. 成员的典型角色',
        '4. 群内的共识和误区',
        '5. 年度总结',
        '',
        '风格要求：客观、全面、有洞察力。',
        '输出必须严格符合 JSON schema。',
    ].join('\n');
}

function buildGroupSummaryUserPrompt({ year, chat_name, stats, top_users, sample_messages, monthly_themes }) {
    const statsStr = Object.entries(stats || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    const usersStr = Array.isArray(top_users)
        ? top_users.map((u, i) => `${i + 1}. ${u.name}: ${u.count}条消息`).join('\n')
        : '(无数据)';
    const themesStr = Array.isArray(monthly_themes) && monthly_themes.length
        ? monthly_themes.map(t => `- ${t.month}月: ${t.theme}`).join('\n')
        : '(无月度主题数据)';
    const msgLines = Array.isArray(sample_messages) ? sample_messages : [];
    
    return [
        `请对「${chat_name}」的 ${year} 年进行年度总结（锐评版）：`,
        '',
        '【基础统计】',
        statsStr || '- (无统计数据)',
        '',
        '【活跃用户排行】',
        usersStr,
        '',
        '【月度主题回顾】',
        themesStr,
        '',
        '【代表性消息采样】',
        ...(msgLines.length ? msgLines : ['(无代表消息)']),
    ].join('\n');
}

function buildGroupSummaryBatchRequest({
    model,
    year,
    chat_name,
    stats,
    top_users,
    sample_messages,
    monthly_themes,
    max_output_tokens = 2200
}) {
    return {
        model,
        input: [
            { role: 'system', content: buildGroupSummarySystemPrompt() },
            { role: 'user', content: buildGroupSummaryUserPrompt({ year, chat_name, stats, top_users, sample_messages, monthly_themes }) },
        ],
        text: {
            format: {
                type: 'json_schema',
                strict: true,
                schema: buildGroupSummarySchema(),
            },
        },
        max_output_tokens,
        parallel_tool_calls: false,
    };
}

// ============================================
// 导出
// ============================================

module.exports = {
    // 风格配置
    getStyleConfig,
    isRoastStyle,
    
    // 热点事件 (原有)
    buildEventBatchRequest,
    buildEventSummarySchema,
    buildEventSystemPrompt,
    buildEventUserPrompt,
    
    // 月度主题
    buildMonthBatchRequest,
    buildMonthSummarySchema,
    buildMonthSystemPrompt,
    buildMonthUserPrompt,
    
    // 奖项颁奖词
    buildAwardBatchRequest,
    buildAwardCitationSchema,
    buildAwardSystemPrompt,
    buildAwardUserPrompt,
    
    // 用户画像
    buildUserProfileBatchRequest,
    buildUserProfileSchema,
    buildUserProfileSystemPrompt,
    buildUserProfileUserPrompt,
    
    // 金句精选
    buildQuoteBatchRequest,
    buildQuoteSelectionSchema,
    buildQuoteSystemPrompt,
    buildQuoteUserPrompt,
    
    // 乐子人分析
    buildJokerBatchRequest,
    buildJokerAnalysisSchema,
    buildJokerSystemPrompt,
    buildJokerUserPrompt,
    
    // 情感分析
    buildSentimentBatchRequest,
    buildSentimentAnalysisSchema,
    buildSentimentSystemPrompt,
    buildSentimentUserPrompt,
    
    // 本群年度总结
    buildGroupSummaryBatchRequest,
    buildGroupSummarySchema,
    buildGroupSummarySystemPrompt,
    buildGroupSummaryUserPrompt,
};
