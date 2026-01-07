/**
 * 年度报告生成器 - HTML 段落生成模块 (Tailwind CSS)
 * @module generator/sections
 */

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getUserName(user) {
    if (!user) return '神秘群友';
    if (typeof user === 'string') return user;
    return user.name || '神秘群友';
}

function getUserId(user) {
    if (!user || typeof user !== 'object') return null;
    return user.id || null;
}

function renderAvatar(user, sizeClass = 'w-9 h-9') {
    const nameRaw = getUserName(user);
    const name = escapeHTML(nameRaw);
    const id = getUserId(user);
    const initial = escapeHTML((String(nameRaw || '').trim()[0]) || '?');
    const img = id
        ? `<img data-avatar-id="${escapeHTML(id)}" class="w-full h-full object-cover hidden" alt="${name}" />`
        : '';
    return `
        <span class="${sizeClass} rounded-full overflow-hidden border-2 border-white bg-brutal-gray shrink-0 flex items-center justify-center">
            ${img}
            <span data-avatar-fallback class="w-full h-full flex items-center justify-center text-xs font-extrabold text-brutal-black bg-neon-yellow">${initial}</span>
        </span>`;
}

function renderUserInline(user, {
    avatarSizeClass = 'w-9 h-9',
    wrapperClass = 'inline-flex items-center gap-3 min-w-0',
    nameClass = 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
} = {}) {
    const name = escapeHTML(getUserName(user));
    return `
        <span class="${wrapperClass}">
            ${renderAvatar(user, avatarSizeClass)}
            <span class="${nameClass}">${name}</span>
        </span>`;
}

function renderAwardUser(a) {
    if (!a) return '';
    if (Array.isArray(a.users) && a.users.length) {
        const label = escapeHTML(a.userLabel || a.users.map(u => getUserName(u)).join(' ❤️ '));
        const avatars = a.users.slice(0, 2).map(u => renderAvatar(u, 'w-9 h-9')).join('');
        return `
            <span class="inline-flex items-center gap-3 min-w-0">
                <span class="inline-flex items-center gap-2 shrink-0">${avatars}</span>
                <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">${label}</span>
            </span>`;
    }
    if (a.user && typeof a.user === 'object') {
        return renderUserInline(a.user, { avatarSizeClass: 'w-9 h-9' });
    }
    return `<span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">${escapeHTML(a.user ?? '')}</span>`;
}

/**
 * 生成封面页
 */
function generateCoverSection(chatName, targetYear) {
    return `
    <section class="section cover-grid cover-frame min-h-screen flex flex-col justify-center items-center text-center relative overflow-hidden p-8 bg-brutal-black visible">
        <canvas id="particles"></canvas>
        <div class="relative z-10 inline-block px-6 py-3 bg-neon-pink border-4 border-white text-brutal-black font-display text-sm font-bold tracking-widest uppercase mb-10 shadow-brutal-yellow -rotate-2">
            ${targetYear} 年度报告
        </div>
        <h1 class="relative z-10 font-display text-[clamp(40px,10vw,100px)] font-black leading-none mb-6 text-white uppercase tracking-tight
            [text-shadow:4px_4px_0_#ff2d92,8px_8px_0_#00f0ff,12px_12px_0_#b8ff00]">
            ${chatName}
        </h1>
        <p class="relative z-10 font-display text-[clamp(20px,4vw,36px)] text-neon-yellow mb-4 font-semibold uppercase">
            年度群聊回忆录
        </p>
        <p class="relative z-10 text-base text-white/85 mb-16 border-b-2 border-neon-pink pb-2">
            记录这一年我们的欢笑与故事
        </p>
        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 font-display text-sm text-neon-green tracking-widest uppercase animate-brutal-bounce">
            ↓ 向下滑动查看
        </div>
    </section>`;
}

/**
 * 生成核心统计数据页
 */
function generateStatsSection(stats) {
    const avgDaily = Math.round(stats.totalMessages / stats.activeDays.size);
    const peakMonth = stats.monthlyData.indexOf(Math.max(...stats.monthlyData)) + 1;

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center" id="stats-section">
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer text-center">
            <div class="big-number font-display text-[clamp(60px,15vw,140px)] font-black text-white leading-none mb-4
                [text-shadow:6px_6px_0_#ff2d92,-2px_-2px_0_#00f0ff]" data-count="${stats.totalMessages}">0</div>
            <div class="font-display text-[clamp(18px,3vw,28px)] text-neon-yellow mb-12 uppercase tracking-[4px]">
                条消息，见证了我们的故事
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div class="bg-brutal-dark border-4 border-white p-6 text-center shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
                    <span class="text-3xl mb-3 block">👥</span>
                    <span class="font-display text-4xl font-extrabold text-white block mb-2">${stats.uniqueUsers.size}</span>
                    <span class="text-xs text-neon-yellow uppercase tracking-widest font-semibold">位群友参与</span>
                </div>
                <div class="bg-brutal-dark border-4 border-white p-6 text-center shadow-brutal-blue hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
                    <span class="text-3xl mb-3 block">📅</span>
                    <span class="font-display text-4xl font-extrabold text-white block mb-2">${stats.activeDays.size}</span>
                    <span class="text-xs text-neon-yellow uppercase tracking-widest font-semibold">天有消息</span>
                </div>
                <div class="bg-brutal-dark border-4 border-white p-6 text-center shadow-brutal-green hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
                    <span class="text-3xl mb-3 block">📊</span>
                    <span class="font-display text-4xl font-extrabold text-white block mb-2">${avgDaily}</span>
                    <span class="text-xs text-neon-yellow uppercase tracking-widest font-semibold">条/天平均</span>
                </div>
            </div>
        </div>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue mt-6 hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
            <p class="text-center text-white/85">
                ${peakMonth}月最热闹，聊了 <strong class="text-neon-yellow">${Math.max(...stats.monthlyData).toLocaleString()}</strong> 条消息！
            </p>
        </div>
    </section>`;
}

/**
 * 生成年度荣誉榜页（支持 AI 颁奖词）
 */
function generateAwardsSection(awards, aiAwardCitations = {}) {
    if (!awards.length) return '';

    const shadows = ['shadow-[3px_3px_0_#ff2d92]', 'shadow-[3px_3px_0_#00f0ff]', 'shadow-[3px_3px_0_#b8ff00]', 'shadow-[3px_3px_0_#ffea00]', 'shadow-[3px_3px_0_#a855f7]'];
    
    const listHtml = awards.slice(0, 5).map((a, i) => {
        const aiId = `award_${String(i + 1).padStart(2, '0')}`;
        const ai = aiAwardCitations?.[aiId] || null;
        const hasAi = ai && ai.citation;
        
        const highlightQuoteHtml = hasAi && ai.highlight_quote
            ? `<div class="mt-2 text-xs text-neon-yellow/90">
                   <span class="font-bold">代表语录：</span>
                   <span class="italic">"${escapeHTML(ai.highlight_quote)}"</span>
               </div>`
            : '';

        const citationHtml = hasAi
            ? `<div class="mt-3 p-3 bg-brutal-black border-2 border-neon-yellow text-sm text-white/90 italic leading-relaxed">
                   "${escapeHTML(ai.citation)}"
                   ${ai.roast_level ? `<span class="ml-2 text-neon-pink text-xs font-bold">[${escapeHTML(ai.roast_level)}]</span>` : ''}
                   ${highlightQuoteHtml}
               </div>`
            : '';
        
        return `
        <div class="p-5 bg-brutal-dark border-2 border-white mb-3 ${shadows[i % 5]} hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#ffea00] transition-all cursor-pointer">
            <div class="flex items-center">
                <span class="text-4xl mr-5 drop-shadow-[2px_2px_0_#ff2d92]">${a.icon}</span>
                <div class="flex-1">
                    <div class="font-display text-xs font-bold text-neon-blue uppercase tracking-widest mb-1">
                        ${a.title}
                        ${hasAi ? '<span class="ml-2 text-neon-green">AI</span>' : ''}
                    </div>
                    <div class="font-display text-xl font-extrabold text-white">${renderAwardUser(a)}</div>
                </div>
                <div class="text-sm text-white/85 text-right max-w-[200px]">${a.desc}</div>
            </div>
            ${citationHtml}
        </div>`;
    }).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            ✨ 年度荣誉榜
        </h2>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue">
            ${listHtml}
        </div>
    </section>`;
}

/**
 * 生成活跃时间分析页
 */
function generateTimeSection(peakHour) {
    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            ⏰ 群聊活跃时间
        </h2>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
            <p class="text-center text-white/85">这一年的高光时刻</p>
            <div class="font-display text-[clamp(56px,12vw,120px)] font-black text-neon-green text-center my-8
                [text-shadow:4px_4px_0_#ff2d92,8px_8px_0_#0d0d0d]">
                ${peakHour.hour}:00
            </div>
            <p class="text-center text-white/85">
                是我们最活跃的时段<br/>共产生 ${peakHour.count.toLocaleString()} 条消息
            </p>
        </div>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue mt-6 hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
            <div id="hourChart" class="chart-container"></div>
        </div>
    </section>`;
}

/**
 * 生成深夜守护者页
 */
function generateNightSection(nightOwls) {
    if (!nightOwls.length) return '';

    const listHtml = nightOwls.map((n, i) => `
        <div class="flex items-center p-4 px-5 bg-brutal-dark border-2 border-white mb-3 shadow-[3px_3px_0_#a855f7] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#00f0ff] transition-all cursor-pointer">
            <span class="font-display text-2xl font-extrabold text-neon-yellow w-14 shrink-0">${['🥇', '🥈', '🥉', '4', '5'][i]}</span>
            <span class="flex-1 min-w-0">${renderUserInline(n, { avatarSizeClass: 'w-8 h-8', wrapperClass: 'inline-flex items-center gap-3 min-w-0', nameClass: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold' })}</span>
            <span class="font-display text-sm text-neon-blue font-bold">${n.count} 条</span>
        </div>`).join('');

    return `
    <section class="section night-scanlines min-h-screen py-16 px-6 flex flex-col justify-center items-center bg-brutal-black relative">
        <div class="text-[100px] mb-8 drop-shadow-[0_0_20px_#ffea00] animate-brutal-float">🌙</div>
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            深夜守护者联盟
        </h2>
        <p class="text-center text-white/85 mb-8">凌晨0-6点还在聊天的夜猫子们</p>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue">
            ${listHtml}
        </div>
    </section>`;
}

/**
 * 生成乐子人认证页（支持 AI 增强）
 */
function generateJokerSection(jokers, aiJokerAnalysis = {}) {
    if (!jokers.length) return '';

    const top = jokers[0];
    const stars = '⭐'.repeat(Math.ceil(top.jokerIndex / 20));
    
    // 获取 AI 分析结果
    const aiTop = aiJokerAnalysis?.['joker_01'] || null;
    const hasAi = aiTop && (aiTop.joker_type || aiTop.joker_description);

    // 乐子人类型的 emoji 和颜色
    const jokerTypeInfo = {
        '捣乱者': { emoji: '😈', color: 'text-neon-pink', desc: '以整人惹事为乐' },
        '气氛组': { emoji: '🎉', color: 'text-neon-yellow', desc: '活跃气氛担当' },
        '段子手': { emoji: '🎭', color: 'text-neon-green', desc: '段子信手拈来' },
        '复读机': { emoji: '🦜', color: 'text-neon-blue', desc: '跟风复读达人' },
        '阴阳师': { emoji: '🌓', color: 'text-neon-orange', desc: '阴阳怪气高手' },
        '正能量': { emoji: '☀️', color: 'text-neon-green', desc: '鸡汤输出机' },
        '观察者': { emoji: '👁️', color: 'text-white', desc: '神出鬼没' },
    };

    const typeInfo = jokerTypeInfo[aiTop?.joker_type] || { emoji: '🤡', color: 'text-neon-orange', desc: '快乐源泉' };

    // AI 增强的乐子人卡片
    const aiEnhancedHtml = hasAi ? `
        <div class="mt-8 p-6 bg-brutal-black border-4 border-neon-green">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <span class="text-4xl">${typeInfo.emoji}</span>
                    <div>
                        <div class="text-xs text-neon-green uppercase tracking-widest font-bold">AI 乐子人类型</div>
                        <div class="font-display text-2xl font-black ${typeInfo.color}">${escapeHTML(aiTop.joker_type || '未知类型')}</div>
                    </div>
                </div>
                ${aiTop.joker_title ? `<div class="px-3 py-1 bg-neon-pink text-brutal-black text-sm font-bold border-2 border-white">${escapeHTML(aiTop.joker_title)}</div>` : ''}
            </div>
            ${aiTop.joker_description ? `
            <div class="text-sm text-white/90 italic leading-relaxed mb-4">
                "${escapeHTML(aiTop.joker_description)}"
            </div>` : ''}
            ${aiTop.signature_behaviors && aiTop.signature_behaviors.length ? `
            <div class="mb-4">
                <div class="text-xs text-white/70 uppercase tracking-widest mb-2">标志性行为</div>
                <div class="flex flex-wrap gap-2">
                    ${aiTop.signature_behaviors.map((b, i) => {
                        const colors = ['bg-neon-pink', 'bg-neon-blue', 'bg-neon-yellow text-brutal-black'];
                        return `<span class="px-2 py-1 ${colors[i % colors.length]} text-xs font-bold border-2 border-white">${escapeHTML(b)}</span>`;
                    }).join('')}
                </div>
            </div>` : ''}
            ${aiTop.representative_quote ? `
            <div class="p-3 bg-brutal-dark border-2 border-neon-yellow text-sm text-neon-yellow">
                <span class="font-bold">代表语录：</span>"${escapeHTML(aiTop.representative_quote)}"
            </div>` : ''}
        </div>` : '';

    // 其他乐子人的 AI 分析卡片
    const otherJokersHtml = jokers.slice(1, 5).map((j, idx) => {
        const aiId = `joker_${String(idx + 2).padStart(2, '0')}`;
        const ai = aiJokerAnalysis?.[aiId] || null;
        const hasAiData = ai && (ai.joker_type || ai.joker_description);
        const jTypeInfo = jokerTypeInfo[ai?.joker_type] || { emoji: '🤡', color: 'text-neon-orange' };
        
        return `
        <div class="bg-brutal-dark border-4 border-white p-5 shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
            <div class="flex items-center gap-4 mb-3">
                ${renderAvatar(j, 'w-12 h-12')}
                <div class="flex-1 min-w-0">
                    <div class="font-display text-lg font-extrabold text-white truncate">${escapeHTML(j.name)}</div>
                    <div class="text-sm text-neon-yellow">乐子指数: ${j.jokerIndex}</div>
                </div>
                ${hasAiData ? `<span class="text-2xl">${jTypeInfo.emoji}</span>` : ''}
            </div>
            ${hasAiData ? `
            <div class="mb-2">
                <span class="px-2 py-0.5 bg-neon-green text-brutal-black text-[10px] font-bold uppercase tracking-wider border border-white">${escapeHTML(ai.joker_type || '未知')}</span>
                ${ai.joker_title ? `<span class="ml-2 text-xs text-neon-pink font-bold">${escapeHTML(ai.joker_title)}</span>` : ''}
            </div>
            ${ai.joker_description ? `<div class="text-xs text-white/80 italic">"${escapeHTML(ai.joker_description.substring(0, 60))}..."</div>` : ''}` : `
            <div class="text-xs text-white/60">😂 ${j.laughCount} · 🔥 ${j.sixCount} · 🤪 ${j.emojiCount}</div>`}
        </div>`;
    }).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🤡 乐子人认证 ${hasAi ? '<span class="text-neon-green text-2xl ml-2">AI</span>' : ''}
        </h2>
        <div class="joker-label bg-brutal-dark border-[6px] border-neon-orange p-10 text-center max-w-xl w-full shadow-[12px_12px_0_#ff2d92] relative">
            <div class="text-3xl mb-4 tracking-[8px]">${stars}</div>
            <p class="text-white/85 mb-2.5">${hasAi ? typeInfo.desc : '年度快乐源泉'}</p>
            <div class="flex flex-col items-center gap-3 mb-2.5">
                ${renderAvatar(top, 'w-16 h-16')}
                <h3 class="text-3xl font-bold">${escapeHTML(top.name)}</h3>
            </div>
            <div class="font-display text-[clamp(56px,12vw,88px)] font-black text-neon-orange my-4 [text-shadow:4px_4px_0_#ff2d92]">
                ${top.jokerIndex}
            </div>
            <p class="text-white/60 text-sm">乐子指数</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div class="bg-brutal-dark border-2 border-white p-4 text-center">
                    <span class="text-3xl mb-2 block">😂</span>
                    <span class="font-display text-2xl font-extrabold text-neon-blue block">${top.laughCount}</span>
                    <span class="text-[10px] text-neon-yellow uppercase tracking-wider">哈哈次数</span>
                </div>
                <div class="bg-brutal-dark border-2 border-white p-4 text-center">
                    <span class="text-3xl mb-2 block">🔥</span>
                    <span class="font-display text-2xl font-extrabold text-neon-blue block">${top.sixCount}</span>
                    <span class="text-[10px] text-neon-yellow uppercase tracking-wider">666次数</span>
                </div>
                <div class="bg-brutal-dark border-2 border-white p-4 text-center">
                    <span class="text-3xl mb-2 block">🤪</span>
                    <span class="font-display text-2xl font-extrabold text-neon-blue block">${top.emojiCount}</span>
                    <span class="text-[10px] text-neon-yellow uppercase tracking-wider">表情包</span>
                </div>
                <div class="bg-brutal-dark border-2 border-white p-4 text-center">
                    <span class="text-3xl mb-2 block">🏆</span>
                    <span class="font-display text-2xl font-extrabold text-neon-blue block">TOP 1</span>
                    <span class="text-[10px] text-neon-yellow uppercase tracking-wider">乐子排名</span>
                </div>
            </div>
            ${aiEnhancedHtml}
        </div>
        ${otherJokersHtml ? `
        <div class="w-full max-w-4xl mt-8">
            <h3 class="text-base mb-4 font-semibold text-center">🎭 其他乐子人</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${otherJokersHtml}
            </div>
        </div>` : ''}
    </section>`;
}

/**
 * 生成年度热词页
 */
function generateWordCloudSection(topWords) {
    const top5 = topWords.slice(0, 5);
    const maxCount = top5[0]?.count || 1;

    const listHtml = top5.map((w, i) => `
        <div class="flex items-center py-4 border-b-2 border-brutal-gray last:border-b-0">
            <span class="w-10 font-display font-extrabold text-neon-pink text-lg">${i + 1}</span>
            <span class="flex-1 text-base font-semibold">${w.word}</span>
            <div class="flex-[2] h-2 bg-brutal-gray mx-4 overflow-hidden">
                <div class="h-full ${i % 2 === 0 ? 'bg-neon-pink' : 'bg-neon-green'}" style="width:${(w.count / maxCount * 100).toFixed(0)}%"></div>
            </div>
            <span class="w-[70px] text-right font-display text-sm text-neon-blue font-bold">${w.count}</span>
        </div>`).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🔤 年度关键词
        </h2>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal">
            <div id="wordCloud" class="wordcloud-container border-4 border-white bg-brutal-dark shadow-brutal"></div>
        </div>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue mt-6">
            <h3 class="text-base mb-4 font-semibold">🏆 TOP 5 关键词</h3>
            ${listHtml}
        </div>
    </section>`;
}

/**
 * NLP 深度解读：月度关键词演变 / 爆发事件 / 情感分析
 */
function generateNlpSection(monthlyKeywords, hotEvents, sentiment, aiEventSummaries = {}, aiMonthSummaries = {}) {
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

    const chip = (w, count, tone = 'pink') => {
        const color = tone === 'green' ? 'bg-neon-green text-brutal-black' : 'bg-neon-pink text-brutal-black';
        const label = escapeHTML(String(w || ''));
        const suffix = Number.isFinite(count) ? `<span class="ml-2 font-display text-[10px] font-black opacity-80">${count}</span>` : '';
        return `<span class="inline-flex items-center px-3 py-1 border-2 border-white ${color} text-xs font-extrabold uppercase tracking-wide shadow-[3px_3px_0_#00f0ff]">${label}${suffix}</span>`;
    };

    const monthlyHtml = (monthlyKeywords || []).map((m, idx) => {
        const monthId = `month_${String(idx + 1).padStart(2, '0')}`;
        const ai = aiMonthSummaries?.[monthId] || null;
        const hasAi = ai && ai.theme;
        
        const kws = (m?.keywords || []).slice(0, 6);
        const chips = kws.length
            ? kws.map((k, i) => chip(k.word, k.count, i % 2 ? 'green' : 'pink')).join(' ')
            : '<span class="text-white/60 text-sm">（当月文本较少，暂无明显关键词）</span>';
        
        const aiThemeHtml = hasAi
            ? `<div class="mt-3 p-2 bg-brutal-black border border-neon-green">
                   <div class="text-neon-green font-bold text-sm">${escapeHTML(ai.theme)}</div>
                   ${ai.mood ? `<div class="text-white/70 text-xs mt-1">${escapeHTML(ai.mood)}</div>` : ''}
               </div>`
            : '';
        
        return `
            <div class="bg-brutal-dark border-4 border-white p-5 shadow-brutal-blue">
                <div class="flex items-center justify-between mb-3">
                    <span class="font-display text-lg font-black text-neon-yellow">${monthNames[idx]}</span>
                    <span class="text-[10px] text-white/70 uppercase tracking-widest">
                        ${hasAi ? '<span class="text-neon-green mr-1">AI</span>' : ''}Top Keywords
                    </span>
                </div>
                <div class="flex flex-wrap gap-2">${chips}</div>
                ${aiThemeHtml}
            </div>`;
    }).join('');

    const eventHtml = (hotEvents || []).length ? (hotEvents || []).map((e, i) => {
        const id = `event_${String(i + 1).padStart(2, '0')}`;
        const ai = aiEventSummaries?.[id] || null;

        const rangeLocal = e.startDate === e.endDate ? e.startDate : `${e.startDate} ~ ${e.endDate}`;
        const range = ai?.time_range || rangeLocal;
        const titleLocal = (e.keywords || []).slice(0, 3).map(k => k.word).filter(Boolean).join(' / ') || '爆发事件';
        const title = ai?.title || titleLocal;

        const keywords = (ai?.keywords && ai.keywords.length)
            ? ai.keywords.slice(0, 8).map((w) => ({ word: w, count: null }))
            : (e.keywords || []).slice(0, 8).map((k) => ({ word: k.word, count: k.count }));
        const chips = keywords.map((k, idx) => chip(k.word, k.count, idx % 2 ? 'green' : 'pink')).join(' ');

        const summaryLines = (ai?.summary || []).slice(0, 3);
        const summaryHtml = summaryLines.length
            ? `<ul class="mt-4 space-y-2 text-sm text-white/80 list-disc pl-5">${summaryLines.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>`
            : '';

        const quotes = (ai?.representative_quotes || []).slice(0, 3);
        const quoteHtml = quotes.length
            ? `<div class="mt-4 grid grid-cols-1 gap-2">${quotes.map(q => `
                <div class="bg-brutal-black border-2 border-white p-3 text-xs text-white/85 shadow-[3px_3px_0_#ffea00]">
                    “${escapeHTML(q)}”
                </div>`).join('')}</div>`
            : '';
        return `
            <div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
                <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                        <div class="font-display text-lg font-black text-white truncate">${escapeHTML(title)}</div>
                        <div class="text-sm text-white/70 mt-1">${escapeHTML(range)}（峰值：${escapeHTML(e.peakDate)}）${ai ? ' <span class=\"ml-2 text-neon-green font-bold\">AI</span>' : ''}</div>
                    </div>
                    <div class="shrink-0 text-right">
                        <div class="font-display text-2xl font-black text-neon-blue">${Number(e.totalCount || 0).toLocaleString()}</div>
                        <div class="text-[10px] text-white/70 uppercase tracking-widest">Messages</div>
                    </div>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">${chips || ''}</div>
                ${summaryHtml}
                ${quoteHtml}
            </div>`;
    }).join('') : `<div class="text-white/60 text-sm">（没有检测到明显“爆发”日，或当年发言较均匀）</div>`;

    const mood = sentiment?.mood || '中性';
    const moodColor = mood === '正向' ? 'text-neon-green' : (mood === '负向' ? 'text-neon-pink' : 'text-neon-yellow');
    const sunshine = sentiment?.sunshine;
    const gloomy = sentiment?.gloomy;

    const sunshineHtml = sunshine
        ? `<div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal-blue">
                <div class="text-[10px] text-white/70 uppercase tracking-widest mb-3">正能量小太阳</div>
                <div class="flex items-center justify-between gap-4">
                    <div class="min-w-0">${renderUserInline(sunshine.user, { avatarSizeClass: 'w-10 h-10', nameClass: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold' })}</div>
                    <div class="shrink-0 text-right">
                        <div class="font-display text-xl font-black text-neon-green">${sunshine.avg}</div>
                        <div class="text-[10px] text-white/70 uppercase tracking-widest">${sunshine.textCount} 条文本</div>
                    </div>
                </div>
            </div>`
        : `<div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal-blue">
                <div class="text-[10px] text-white/70 uppercase tracking-widest mb-2">正能量小太阳</div>
                <div class="text-white/60 text-sm">（样本不足：至少需要 ${escapeHTML(String(30))} 条文本消息）</div>
            </div>`;

    const gloomyHtml = gloomy
        ? `<div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal">
                <div class="text-[10px] text-white/70 uppercase tracking-widest mb-3">至郁系丧气王</div>
                <div class="flex items-center justify-between gap-4">
                    <div class="min-w-0">${renderUserInline(gloomy.user, { avatarSizeClass: 'w-10 h-10', nameClass: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold' })}</div>
                    <div class="shrink-0 text-right">
                        <div class="font-display text-xl font-black text-neon-pink">${gloomy.avg}</div>
                        <div class="text-[10px] text-white/70 uppercase tracking-widest">${gloomy.textCount} 条文本</div>
                    </div>
                </div>
            </div>`
        : `<div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal">
                <div class="text-[10px] text-white/70 uppercase tracking-widest mb-2">至郁系丧气王</div>
                <div class="text-white/60 text-sm">（样本不足：至少需要 ${escapeHTML(String(30))} 条文本消息）</div>
            </div>`;

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🧠 NLP 深度解读
        </h2>

        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue mb-6">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <div class="text-sm text-white/80">群聊整体氛围</div>
                    <div class="font-display text-[clamp(32px,5vw,56px)] font-black ${moodColor} leading-none mt-2">${escapeHTML(mood)}</div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-white/80">平均情绪分</div>
                    <div class="font-display text-3xl font-black text-neon-blue mt-2">${escapeHTML(String(sentiment?.avgScore ?? 0))}</div>
                    <div class="text-[10px] text-white/70 uppercase tracking-widest mt-1">${escapeHTML(String(sentiment?.totalTextMessages ?? 0))} 条文本</div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4 mt-6">
                <div class="bg-brutal-black border-2 border-white p-4 text-center">
                    <div class="font-display text-xl font-black text-neon-green">${escapeHTML(String(sentiment?.posRatio ?? 0))}%</div>
                    <div class="text-[10px] text-white/70 uppercase tracking-widest">正向</div>
                </div>
                <div class="bg-brutal-black border-2 border-white p-4 text-center">
                    <div class="font-display text-xl font-black text-neon-yellow">${escapeHTML(String(sentiment?.neutralRatio ?? 0))}%</div>
                    <div class="text-[10px] text-white/70 uppercase tracking-widest">中性</div>
                </div>
                <div class="bg-brutal-black border-2 border-white p-4 text-center">
                    <div class="font-display text-xl font-black text-neon-pink">${escapeHTML(String(sentiment?.negRatio ?? 0))}%</div>
                    <div class="text-[10px] text-white/70 uppercase tracking-widest">负向</div>
                </div>
            </div>
        </div>

        <div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            ${sunshineHtml}
            ${gloomyHtml}
        </div>

        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal mb-6">
            <h3 class="text-base mb-5 font-semibold">📈 月度关键词演变</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                ${monthlyHtml}
            </div>
        </div>

        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue">
            <h3 class="text-base mb-5 font-semibold">🔥 最热话题 / 事件回溯（按爆发日）</h3>
            <div class="grid grid-cols-1 gap-4">
                ${eventHtml}
            </div>
        </div>
    </section>`;
}

/**
 * 生成月度趋势页
 */
function generateMonthlySection(monthlyData) {
    const mostActiveMonth = monthlyData.indexOf(Math.max(...monthlyData)) + 1;
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            📅 月度趋势
        </h2>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
            <p class="text-center text-white/85 mb-5">
                <strong class="text-neon-yellow">${monthNames[mostActiveMonth - 1]}</strong> 是我们最活跃的月份
            </p>
            <div id="monthChart" class="chart-container"></div>
        </div>
    </section>`;
}

// ============================================
// AI 增强模块：月度主题总结
// ============================================

/**
 * 生成 AI 月度主题总结页
 * @param {Object} aiMonthSummaries - { month_01: {theme,mood,highlights,keywords}, ... }
 */
function generateAiMonthlyThemesSection(aiMonthSummaries = {}) {
    const entries = Object.entries(aiMonthSummaries || {})
        .map(([id, v]) => {
            const m = parseInt(String(id).replace(/^month_/, ''), 10);
            return { id, month: Number.isFinite(m) ? m : null, data: v };
        })
        .filter((x) => x.month && x.data && x.data.theme)
        .sort((a, b) => a.month - b.month);

    if (!entries.length) return '';

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

    const chip = (w, tone = 'pink') => {
        const color = tone === 'green'
            ? 'bg-neon-green text-brutal-black'
            : 'bg-neon-pink text-brutal-black';
        return `<span class="inline-flex items-center px-2.5 py-1 border-2 border-white ${color} text-[10px] font-extrabold uppercase tracking-wide shadow-[3px_3px_0_#00f0ff]">${escapeHTML(String(w || ''))}</span>`;
    };

    const cardsHtml = entries.map(({ month, data }, i) => {
        const title = monthNames[month - 1] || `${month}月`;
        const keywords = (data.keywords || []).slice(0, 6);
        const keywordsHtml = keywords.length
            ? `<div class="flex flex-wrap gap-2 mt-4">${keywords.map((k, idx) => chip(k, idx % 2 ? 'green' : 'pink')).join(' ')}</div>`
            : '';

        const highlights = (data.highlights || []).slice(0, 3).filter(Boolean);
        const highlightsHtml = highlights.length
            ? `<ul class="mt-4 space-y-2 text-sm text-white/85">
                    ${highlights.map((h) => `<li class="flex gap-2"><span class="text-neon-yellow font-black">•</span><span class="flex-1">${escapeHTML(h)}</span></li>`).join('')}
               </ul>`
            : '';

        return `
        <div class="bg-brutal-dark border-4 border-white p-6 ${i % 2 === 0 ? 'shadow-brutal-blue' : 'shadow-brutal'} hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
            <div class="flex items-start justify-between gap-4 mb-3">
                <div>
                    <div class="font-display text-xs font-bold text-neon-blue uppercase tracking-widest">${escapeHTML(title)}</div>
                    <div class="font-display text-2xl font-extrabold text-neon-green mt-1">${escapeHTML(data.theme)}</div>
                </div>
                <div class="px-2 py-1 bg-brutal-black border-2 border-neon-green text-neon-green text-[10px] font-black uppercase tracking-widest">AI</div>
            </div>
            ${data.mood ? `<div class="text-sm text-white/75 leading-relaxed">${escapeHTML(data.mood)}</div>` : ''}
            ${highlightsHtml}
            ${keywordsHtml}
        </div>`;
    }).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            📌 月度主题总结 <span class="text-neon-green text-2xl ml-2">AI</span>
        </h2>
        <p class="text-center text-white/85 mb-8">每个月的主题、氛围与亮点（AI 生成）</p>
        <div class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
            ${cardsHtml}
        </div>
    </section>`;
}

/**
 * 生成发言贡献排行榜页
 */
function generateRankingSection(userRanking) {
    const top3 = userRanking.slice(0, 3);
    const rest = userRanking.slice(3);
    const maxCount = top3[0]?.count || 1;

    const podiumHtml = top3.map((u, i) => {
        const positions = ['order-2', 'order-1', 'order-3'];
        const heights = ['h-40', 'h-28', 'h-20'];
        const widths = ['w-[110px]', 'w-[100px]', 'w-[100px]'];
        const colors = ['bg-neon-yellow shadow-[6px_6px_0_#ff6b00]', 'bg-neon-blue shadow-[6px_6px_0_#a855f7]', 'bg-neon-pink shadow-[6px_6px_0_#ff6b00]'];

        return `
        <div class="flex flex-col items-center text-center ${positions[i]}">
            <span class="text-[56px] mb-3 drop-shadow-[3px_3px_0_#0d0d0d]">${['🥇', '🥈', '🥉'][i]}</span>
            ${renderAvatar(u, 'w-14 h-14')}
            <span class="font-display text-sm font-bold mb-2 mt-2 max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap">${escapeHTML(u.name)}</span>
            <span class="text-xs text-white/85 mb-3">${u.count}</span>
            <div class="${widths[i]} ${heights[i]} ${colors[i]} border-4 border-white flex items-end justify-center pb-4 text-brutal-black font-display font-black text-2xl">
                ${i + 1}
            </div>
        </div>`;
    }).join('');

    const restHtml = rest.map((u, i) => `
        <div class="flex items-center p-4 px-5 bg-brutal-dark border-2 border-white mb-3 ${i % 2 === 0 ? 'shadow-[3px_3px_0_#b8ff00]' : 'shadow-[3px_3px_0_#00f0ff]'} hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#ffea00] transition-all cursor-pointer">
            <span class="w-9 font-display font-extrabold text-neon-pink">${i + 4}</span>
            <span class="flex-1 min-w-0">${renderUserInline(u, { avatarSizeClass: 'w-8 h-8', wrapperClass: 'inline-flex items-center gap-3 min-w-0', nameClass: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold' })}</span>
            <div class="flex-[2] h-2 bg-brutal-gray mx-4 overflow-hidden">
                <div class="h-full bg-neon-green" style="width:${(u.count / maxCount * 100).toFixed(0)}%"></div>
            </div>
            <span class="w-20 text-right font-display text-sm text-neon-blue font-bold">${u.count}条</span>
        </div>`).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🏆 发言贡献排行榜
        </h2>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue">
            <div class="flex justify-center items-end gap-6 h-80 py-8 max-w-3xl mx-auto">
                ${podiumHtml}
            </div>
        </div>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue mt-6">
            ${restHtml}
        </div>
    </section>`;
}

/**
 * 生成荣誉墙页（支持 AI 颁奖词）
 */
function generateAwardWallSection(awards, aiAwardCitations = {}) {
    if (!awards.length) return '';

    const wallHtml = awards.map((a, i) => {
        const shadows = ['shadow-[3px_3px_0_#ff2d92]', 'shadow-[3px_3px_0_#00f0ff]', 'shadow-[3px_3px_0_#b8ff00]'];
        const aiId = `award_${String(i + 1).padStart(2, '0')}`;
        const ai = aiAwardCitations?.[aiId] || null;
        const hasAi = ai && ai.citation;
        const snippet = hasAi ? escapeHTML(`${ai.citation.substring(0, 34)}...`) : '';
        const quoteSnippet = hasAi && ai.highlight_quote ? escapeHTML(`${ai.highlight_quote.substring(0, 20)}...`) : '';
        
        return `
        <div class="bg-brutal-dark border-2 border-white p-5 text-center ${shadows[i % 3]} hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#ffea00] transition-all cursor-pointer">
            <div class="text-4xl mb-3">${a.icon}</div>
            <div class="font-display text-[10px] text-neon-yellow mb-2 uppercase tracking-wider">
                ${a.title}
                ${hasAi ? '<span class="ml-1 text-neon-green">AI</span>' : ''}
            </div>
            <div class="text-sm font-bold">${renderAwardUser(a)}</div>
            ${hasAi ? `<div class="mt-2 text-[10px] text-white/70 italic">"${snippet}"</div>` : ''}
            ${hasAi && ai.highlight_quote ? `<div class="mt-1 text-[10px] text-neon-yellow/80 italic">"${quoteSnippet}"</div>` : ''}
        </div>`;
    }).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🎖️ 荣誉墙
        </h2>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${wallHtml}
        </div>
    </section>`;
}

/**
 * 生成消息类型分布页
 */
function generateMessageTypeSection(messageTypes) {
    const colors = ['#ff2d92', '#00f0ff', '#b8ff00', '#ff6b00', '#ffea00', '#a855f7'];

    const legendHtml = messageTypes.slice(0, 6).map((t, i) => `
        <div class="flex items-center p-3 mb-2 border-2 border-white bg-brutal-dark hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition-all cursor-pointer">
            <span class="w-4 h-4 mr-3 border-2 border-white" style="background:${colors[i]}"></span>
            <span class="flex-1 text-sm text-white/85">${t.type}</span>
            <span class="font-display text-sm font-bold text-white">${t.percentage}%</span>
        </div>`).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            📊 消息类型分布
        </h2>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue flex flex-col md:flex-row items-center gap-10">
            <div id="typeChart" class="type-pie-chart border-4 border-white bg-brutal-dark shadow-brutal-sm"></div>
            <div class="flex-1 w-full">
                ${legendHtml}
            </div>
        </div>
    </section>`;
}

/**
 * 生成结尾感谢页
 */
function generateEndSection(stats, chatName, targetYear) {
    return `
    <section class="section end-frame min-h-screen py-16 px-6 flex flex-col justify-center items-center text-center relative">
        <h2 class="font-display text-[clamp(36px,8vw,64px)] font-black mb-8 text-white
            [text-shadow:4px_4px_0_#ff2d92,8px_8px_0_#00f0ff]">
            感谢有你们 ❤️
        </h2>
        <p class="text-[clamp(16px,2.5vw,22px)] text-white/85 leading-[2.2] max-w-xl mx-auto border-2 border-white p-8 bg-brutal-dark shadow-brutal">
            ${targetYear} 年，<br/>
            我们在这里分享了 ${stats.totalMessages.toLocaleString()} 条消息，<br/>
            ${stats.uniqueUsers.size} 位群友一起度过了 ${stats.activeDays.size} 天。<br/><br/>
            愿 ${targetYear + 1} 年，<br/>
            我们继续相伴，创造更多精彩！
        </p>
    </section>
    <footer class="text-center py-12 px-6 bg-brutal-dark border-t-4 border-white">
        <p class="mb-2 font-display text-xs text-neon-yellow uppercase tracking-widest">📊 ${chatName} · ${targetYear} 年度报告</p>
        <p class="font-display text-xs text-neon-yellow uppercase tracking-widest">Generated with ❤️</p>
    </footer>`;
}

/**
 * 生成 GitHub 风格日历热力图
 */
function generateCalendarHeatmapSection(targetYear) {
    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🗓️ 365天的足迹
        </h2>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
            <p class="text-center text-white/85 mb-5">
                ${targetYear} 年每一天的聊天热度
            </p>
            <div id="calendarChart" class="chart-container" style="height:200px;"></div>
        </div>
    </section>`;
}

/**
 * 生成社交关系图谱
 */
function generateRelationsSection() {
    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🕸️ 群友关系图谱
        </h2>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
            <div id="relationChart" class="chart-container" style="height:400px;"></div>
            <p class="text-center text-white/60 text-sm mt-2.5">
                基于互相回复和@互动的引力场
            </p>
        </div>
    </section>`;
}

/**
 * 生成年度之最亮点页
 */
function generateHighlightsSection(highlights) {
    if (!highlights) return '';

    const cards = [];
    const shadows = ['shadow-brutal', 'shadow-brutal-blue', 'shadow-brutal-green', 'shadow-brutal-yellow'];

    if (highlights.longestMsg) {
        const rawContent = String(highlights.longestMsg.content || '');
        const content = rawContent.length > 50
            ? rawContent.substring(0, 50) + '...'
            : rawContent;
        cards.push(`
            <div class="bg-brutal-dark border-4 border-white p-6 ${shadows[0]} hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
                <div class="text-[40px] mb-4 drop-shadow-[2px_2px_0_#ff2d92]">📏</div>
                <div class="font-display text-[11px] text-neon-blue uppercase tracking-widest mb-3 font-bold">最长消息</div>
                <div class="text-sm text-white leading-relaxed font-medium min-h-[48px] break-words overflow-hidden">"${escapeHTML(content)}"</div>
                <div class="mt-4 font-display text-xs text-neon-yellow font-semibold flex items-center justify-end gap-2 flex-wrap">
                    <span>——</span>
                    ${renderUserInline(highlights.longestMsg.user, { avatarSizeClass: 'w-6 h-6', wrapperClass: 'inline-flex items-center gap-2', nameClass: 'max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap' })}
                    <span>· ${highlights.longestMsg.length}字</span>
                </div>
            </div>`);
    }

    if (highlights.firstMsg) {
        const rawContent = String(highlights.firstMsg.content || '');
        const content = rawContent.length > 30
            ? rawContent.substring(0, 30) + '...'
            : rawContent;
        cards.push(`
            <div class="bg-brutal-dark border-4 border-white p-6 ${shadows[1]} hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
                <div class="text-[40px] mb-4 drop-shadow-[2px_2px_0_#ff2d92]">🎯</div>
                <div class="font-display text-[11px] text-neon-blue uppercase tracking-widest mb-3 font-bold">年度第一条</div>
                <div class="text-sm text-white leading-relaxed font-medium min-h-[48px] break-words overflow-hidden">"${escapeHTML(content)}"</div>
                <div class="mt-4 font-display text-xs text-neon-yellow font-semibold flex items-center justify-end gap-2 flex-wrap">
                    <span>——</span>
                    ${renderUserInline(highlights.firstMsg.user, { avatarSizeClass: 'w-6 h-6', wrapperClass: 'inline-flex items-center gap-2', nameClass: 'max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap' })}
                </div>
            </div>`);
    }

    if (highlights.lastMsg) {
        const rawContent = String(highlights.lastMsg.content || '');
        const content = rawContent.length > 30
            ? rawContent.substring(0, 30) + '...'
            : rawContent;
        cards.push(`
            <div class="bg-brutal-dark border-4 border-white p-6 ${shadows[2]} hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
                <div class="text-[40px] mb-4 drop-shadow-[2px_2px_0_#ff2d92]">🌟</div>
                <div class="font-display text-[11px] text-neon-blue uppercase tracking-widest mb-3 font-bold">年度收官</div>
                <div class="text-sm text-white leading-relaxed font-medium min-h-[48px] break-words overflow-hidden">"${escapeHTML(content)}"</div>
                <div class="mt-4 font-display text-xs text-neon-yellow font-semibold flex items-center justify-end gap-2 flex-wrap">
                    <span>——</span>
                    ${renderUserInline(highlights.lastMsg.user, { avatarSizeClass: 'w-6 h-6', wrapperClass: 'inline-flex items-center gap-2', nameClass: 'max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap' })}
                </div>
            </div>`);
    }

    if (highlights.mostActiveDay) {
        cards.push(`
            <div class="bg-brutal-dark border-4 border-white p-6 ${shadows[3]} hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
                <div class="text-[40px] mb-4 drop-shadow-[2px_2px_0_#ff2d92]">🔥</div>
                <div class="font-display text-[11px] text-neon-blue uppercase tracking-widest mb-3 font-bold">最热一天</div>
                <div class="text-sm text-white leading-relaxed font-medium min-h-[48px]">${escapeHTML(highlights.mostActiveDay.date)}</div>
                <div class="mt-4 font-display text-xs text-neon-yellow text-right font-semibold">共 ${highlights.mostActiveDay.count.toLocaleString()} 条消息</div>
            </div>`);
    }

    if (cards.length === 0) return '';

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🏅 年度之最
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl w-full">
            ${cards.join('')}
        </div>
    </section>`;
}

/**
 * 生成周热力图
 */
function generateWeekdaySection() {
    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            📅 一周活跃指纹
        </h2>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
            <p class="text-center text-white/85 mb-5">
                周几几点最活跃？
            </p>
            <div id="weekdayChart" class="chart-container" style="height:280px;"></div>
        </div>
    </section>`;
}

/**
 * 生成被@最多排行榜页
 */
function generateMentionedSection(mentionedRanking) {
    if (!mentionedRanking.length) return '';

    const maxCount = mentionedRanking[0]?.count || 1;

    const listHtml = mentionedRanking.map((u, i) => `
        <div class="flex items-center p-4 px-5 bg-brutal-dark border-2 border-white mb-3 shadow-[3px_3px_0_#ff2d92] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#ffea00] transition-all cursor-pointer">
            <span class="font-display text-2xl font-extrabold text-neon-yellow w-14 shrink-0">${['🥇', '🥈', '🥉', '4', '5', '6', '7', '8', '9', '10'][i]}</span>
            <span class="flex-1 min-w-0">${renderUserInline(u, { avatarSizeClass: 'w-8 h-8', wrapperClass: 'inline-flex items-center gap-3 min-w-0', nameClass: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold' })}</span>
            <div class="flex-[2] h-2 bg-brutal-gray mx-4 overflow-hidden">
                <div class="h-full bg-neon-pink" style="width:${(u.count / maxCount * 100).toFixed(0)}%"></div>
            </div>
            <span class="font-display text-sm text-neon-blue font-bold w-20 text-right">${u.count} 次</span>
        </div>`).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            👑 被@最多的人
        </h2>
        <p class="text-center text-white/85 mb-8">谁是群里的人气王？看看谁被提及最多</p>
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue">
            ${listHtml}
        </div>
    </section>`;
}

/**
 * 生成捧场王/引用大师页
 */
function generateSupporterSection(supporterRanking, quoteRanking) {
    const supporters = supporterRanking || [];
    const quoters = quoteRanking || [];
    if (!supporters.length && !quoters.length) return '';

    const supporterHtml = supporters.map((u, i) => `
        <div class="flex items-center p-4 px-5 bg-brutal-dark border-2 border-white mb-3 shadow-[3px_3px_0_#00f0ff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#ffea00] transition-all cursor-pointer">
            <span class="font-display text-xl font-extrabold text-neon-yellow w-12 shrink-0">${i + 1}</span>
            <span class="flex-1 min-w-0">${renderUserInline(u, { avatarSizeClass: 'w-8 h-8', wrapperClass: 'inline-flex items-center gap-3 min-w-0', nameClass: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold' })}</span>
            <span class="font-display text-xs text-neon-blue font-bold text-right">回复 ${u.replyCount || 0} / 引用 ${u.quoteCount || 0}</span>
        </div>`).join('');

    const quoteHtml = quoters.map((u, i) => `
        <div class="flex items-center p-4 px-5 bg-brutal-dark border-2 border-white mb-3 shadow-[3px_3px_0_#ff2d92] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#ffea00] transition-all cursor-pointer">
            <span class="font-display text-xl font-extrabold text-neon-yellow w-12 shrink-0">${i + 1}</span>
            <span class="flex-1 min-w-0">${renderUserInline(u, { avatarSizeClass: 'w-8 h-8', wrapperClass: 'inline-flex items-center gap-3 min-w-0', nameClass: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold' })}</span>
            <span class="font-display text-sm text-neon-blue font-bold text-right">${u.quoteCount || 0} 次</span>
        </div>`).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🤝 捧场王
        </h2>
        <p class="text-center text-white/85 mb-8">谁最爱接话、谁最爱用“引用”？（基于时间间隔的近似统计）</p>
        <div class="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue">
                <h3 class="text-base mb-4 font-semibold">💬 接话达人</h3>
                ${supporterHtml || '<div class="text-white/60 text-sm">暂无足够数据</div>'}
            </div>
            <div class="bg-brutal-dark border-4 border-white p-8 shadow-brutal">
                <h3 class="text-base mb-4 font-semibold">🧾 引用大师</h3>
                ${quoteHtml || '<div class="text-white/60 text-sm">暂无引用消息</div>'}
            </div>
        </div>
    </section>`;
}

/**
 * 生成高冷帝页
 */
function generateLonerSection(lonerRanking) {
    const list = lonerRanking || [];
    if (!list.length) return '';

    const cards = list.map((u, i) => {
        const shadows = ['shadow-[6px_6px_0_#00f0ff]', 'shadow-[6px_6px_0_#b8ff00]', 'shadow-[6px_6px_0_#ff2d92]', 'shadow-[6px_6px_0_#ffea00]'];
        return `
        <div class="bg-brutal-dark border-4 border-white p-6 ${shadows[i % shadows.length]} hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
            <div class="text-[40px] mb-3 drop-shadow-[2px_2px_0_#0d0d0d]">🧊</div>
            <div class="font-display text-[11px] text-neon-blue uppercase tracking-widest mb-2 font-bold">高冷帝候选</div>
            <div class="mb-2">${renderUserInline(u, { avatarSizeClass: 'w-10 h-10', wrapperClass: 'inline-flex items-center gap-3 min-w-0', nameClass: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xl font-bold' })}</div>
            <div class="text-sm text-white/85 leading-relaxed">
                年度发言 <span class="text-neon-yellow font-semibold">${u.count}</span> 条<br/>
                每次出现后 10 分钟内平均引发 <span class="text-neon-pink font-semibold">${u.impactAvg}</span> 条他人消息<br/>
                单次最高带动 <span class="text-neon-green font-semibold">${u.impactMax}</span> 条
            </div>
        </div>`;
    }).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🧊 高冷帝
        </h2>
        <p class="text-center text-white/85 mb-8">发言不多，但每次“出场”都能带动一波聊天（按 30 分钟出场间隔 + 10 分钟带动窗口估算）</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl w-full">
            ${cards}
        </div>
    </section>`;
}

/**
 * 生成复读机指数页
 */
function generateRepeaterSection(repeaterRanking, topRepeatedPhrases) {
    const repeaters = repeaterRanking || [];
    const phrases = topRepeatedPhrases || [];
    if (!repeaters.length && !phrases.length) return '';

    const repeaterHtml = repeaters.map((u, i) => `
        <div class="flex items-center p-4 px-5 bg-brutal-dark border-2 border-white mb-3 shadow-[3px_3px_0_#b8ff00] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#ffea00] transition-all cursor-pointer">
            <span class="font-display text-xl font-extrabold text-neon-yellow w-12 shrink-0">${i + 1}</span>
            <span class="flex-1 min-w-0">${renderUserInline(u, { avatarSizeClass: 'w-8 h-8', wrapperClass: 'inline-flex items-center gap-3 min-w-0', nameClass: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold' })}</span>
            <span class="font-display text-xs text-neon-blue font-bold text-right">${u.echoIndex}%（${u.echoCount}次）</span>
        </div>`).join('');

    const maxPhrase = Math.max(...phrases.map(p => p.count || 0), 1);
    const phraseHtml = phrases.slice(0, 8).map((p, i) => `
        <div class="flex items-center py-4 border-b-2 border-brutal-gray last:border-b-0">
            <span class="w-10 font-display font-extrabold text-neon-pink text-lg">${i + 1}</span>
            <span class="flex-1 text-base font-semibold overflow-hidden text-ellipsis whitespace-nowrap" title="${escapeHTML(p.text)}">${escapeHTML(p.text)}</span>
            <div class="flex-[2] h-2 bg-brutal-gray mx-4 overflow-hidden">
                <div class="h-full bg-neon-pink" style="width:${((p.count || 0) / maxPhrase * 100).toFixed(0)}%"></div>
            </div>
            <span class="w-[70px] text-right font-display text-sm text-neon-blue font-bold">${p.count}</span>
        </div>`).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            📢 复读机指数
        </h2>
        <p class="text-center text-white/85 mb-8">谁最爱复读上一条？群里最常被重复的一句话又是什么？</p>
        <div class="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue">
                <h3 class="text-base mb-4 font-semibold">🦜 复读达人（复读率）</h3>
                ${repeaterHtml || '<div class="text-white/60 text-sm">暂无复读数据</div>'}
            </div>
            <div class="bg-brutal-dark border-4 border-white p-8 shadow-brutal">
                <h3 class="text-base mb-4 font-semibold">🔁 年度复读最多的一句话</h3>
                ${phraseHtml || '<div class="text-white/60 text-sm">没有出现明显重复（至少 3 次）</div>'}
            </div>
        </div>
    </section>`;
}

// ============================================
// AI 增强模块：金句精选
// ============================================

/**
 * 生成 AI 金句精选页
 */
function generateQuotesSection(aiQuotes) {
    if (!aiQuotes || !aiQuotes.quotes || !aiQuotes.quotes.length) return '';

    const quotes = aiQuotes.quotes;
    
    const quotesHtml = quotes.map((q, i) => {
        const categoryColors = {
            '抽象': 'bg-neon-pink',
            '搞笑': 'bg-neon-yellow text-brutal-black',
            '哲理': 'bg-neon-blue',
            '毒舌': 'bg-neon-orange',
            '暖心': 'bg-neon-green text-brutal-black',
        };
        const categoryClass = categoryColors[q.category] || 'bg-neon-pink';
        
        return `
        <div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
            <div class="flex items-start justify-between gap-4 mb-4">
                <span class="text-4xl drop-shadow-[2px_2px_0_#ff2d92]">${['💬', '🔥', '✨', '🎯', '💎'][i % 5]}</span>
                <span class="px-2 py-1 ${categoryClass} text-xs font-bold uppercase tracking-wider border-2 border-white">${escapeHTML(q.category || '金句')}</span>
            </div>
            <div class="text-lg text-white font-semibold leading-relaxed mb-4">
                "${escapeHTML(q.content)}"
            </div>
            <div class="text-sm text-white/70 mb-3">—— ${escapeHTML(q.user)}</div>
            <div class="p-3 bg-brutal-black border-2 border-neon-yellow text-sm text-neon-yellow italic">
                ${escapeHTML(q.comment)}
            </div>
        </div>`;
    }).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            💬 年度金句 <span class="text-neon-green text-2xl ml-2">AI</span>
        </h2>
        <p class="text-center text-white/85 mb-8">AI 精选的年度经典语录</p>
        <div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
            ${quotesHtml}
        </div>
    </section>`;
}

// ============================================
// AI 增强模块：用户画像
// ============================================

/**
 * 生成 AI 用户画像页
 */
function generateUserProfilesSection(userRanking, aiUserProfiles = {}) {
    const profiles = Object.entries(aiUserProfiles || {});
    if (!profiles.length) return '';

    const profilesHtml = profiles.slice(0, 6).map(([id, profile], i) => {
        const idx = parseInt(id.replace('user_', ''), 10) - 1;
        const user = userRanking?.[idx] || { name: '神秘群友' };
        
        const tagsHtml = (profile.tags || []).map((tag, j) => {
            const colors = ['bg-neon-pink', 'bg-neon-blue', 'bg-neon-green text-brutal-black', 'bg-neon-yellow text-brutal-black'];
            return `<span class="px-2 py-1 ${colors[j % colors.length]} text-xs font-bold uppercase tracking-wider border-2 border-white">${escapeHTML(tag)}</span>`;
        }).join(' ');
        
        return `
        <div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal-blue hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover transition-all cursor-pointer">
            <div class="flex items-center gap-4 mb-4">
                ${renderAvatar(user, 'w-14 h-14')}
                <div class="flex-1 min-w-0">
                    <div class="font-display text-xl font-extrabold text-white truncate">${escapeHTML(user.name)}</div>
                    <div class="text-sm text-neon-green">${escapeHTML(profile.spirit_animal || '')}</div>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 mb-4">
                ${tagsHtml}
            </div>
            <div class="p-3 bg-brutal-black border-2 border-neon-pink text-sm text-white/90 italic leading-relaxed">
                ${escapeHTML(profile.description || '')}
            </div>
            ${profile.roast_level ? `<div class="mt-2 text-xs text-neon-orange font-bold">[${escapeHTML(profile.roast_level)}]</div>` : ''}
        </div>`;
    }).join('');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            👤 群友画像 <span class="text-neon-green text-2xl ml-2">AI</span>
        </h2>
        <p class="text-center text-white/85 mb-8">AI 生成的毒舌人物画像</p>
        <div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${profilesHtml}
        </div>
    </section>`;
}

// ============================================
// AI 增强模块：深度情感分析
// ============================================

/**
 * 生成 AI 深度情感分析页
 */
function generateAiSentimentSection(aiSentiment) {
    if (!aiSentiment || !aiSentiment.overall_mood) return '';

    const moodEmoji = {
        '太典了': '🤣',
        '正向': '😊',
        '中性': '😐',
        '有点寄': '😅',
        '负向': '😢',
    };
    const moodColor = {
        '太典了': 'text-neon-yellow',
        '正向': 'text-neon-green',
        '中性': 'text-white',
        '有点寄': 'text-neon-orange',
        '负向': 'text-neon-pink',
    };

    const emoji = moodEmoji[aiSentiment.overall_mood] || '🎭';
    const color = moodColor[aiSentiment.overall_mood] || 'text-white';

    const characteristicsHtml = (aiSentiment.characteristics || []).map((c, i) => {
        const colors = ['bg-neon-pink', 'bg-neon-blue', 'bg-neon-green text-brutal-black', 'bg-neon-yellow text-brutal-black', 'bg-neon-orange'];
        return `<span class="px-3 py-1 ${colors[i % colors.length]} text-sm font-bold uppercase tracking-wider border-2 border-white">${escapeHTML(c)}</span>`;
    }).join(' ');

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-12 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🎭 群聊灵魂 <span class="text-neon-green text-2xl ml-2">AI</span>
        </h2>
        
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-blue mb-6">
            <div class="flex items-center justify-center gap-6 mb-6">
                <span class="text-[80px] drop-shadow-[4px_4px_0_#ff2d92]">${emoji}</span>
                <div>
                    <div class="text-sm text-white/70 uppercase tracking-widest">群聊整体氛围</div>
                    <div class="font-display text-[clamp(40px,8vw,64px)] font-black ${color} leading-none">
                        ${escapeHTML(aiSentiment.overall_mood)}
                    </div>
                </div>
            </div>
            
            ${aiSentiment.mood_score != null ? `
            <div class="text-center mb-6">
                <div class="font-display text-5xl font-black text-neon-blue">${aiSentiment.mood_score}/10</div>
                <div class="text-sm text-white/70 uppercase tracking-widest mt-1">情绪指数</div>
            </div>` : ''}
            
            <div class="flex flex-wrap gap-3 justify-center mb-6">
                ${characteristicsHtml}
            </div>
        </div>
        
        ${aiSentiment.group_personality ? `
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal mb-6">
            <h3 class="text-base mb-4 font-semibold text-neon-yellow">🧠 群聊性格</h3>
            <div class="text-lg text-white/90 leading-relaxed italic">
                "${escapeHTML(aiSentiment.group_personality)}"
            </div>
        </div>` : ''}
        
        ${aiSentiment.trend ? `
        <div class="w-full max-w-4xl bg-brutal-dark border-4 border-white p-8 shadow-brutal-green">
            <h3 class="text-base mb-4 font-semibold text-neon-green">📈 氛围变化趋势</h3>
            ${typeof aiSentiment.trend === 'object' ? `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${aiSentiment.trend['年初'] ? `
                <div class="p-4 bg-brutal-black border-2 border-neon-green">
                    <div class="text-xs text-neon-green uppercase tracking-widest font-bold mb-2">🌱 年初</div>
                    <div class="text-sm text-white/85 leading-relaxed">${escapeHTML(aiSentiment.trend['年初'])}</div>
                </div>` : ''}
                ${aiSentiment.trend['年中'] ? `
                <div class="p-4 bg-brutal-black border-2 border-neon-yellow">
                    <div class="text-xs text-neon-yellow uppercase tracking-widest font-bold mb-2">☀️ 年中</div>
                    <div class="text-sm text-white/85 leading-relaxed">${escapeHTML(aiSentiment.trend['年中'])}</div>
                </div>` : ''}
                ${aiSentiment.trend['年末'] ? `
                <div class="p-4 bg-brutal-black border-2 border-neon-pink">
                    <div class="text-xs text-neon-pink uppercase tracking-widest font-bold mb-2">❄️ 年末</div>
                    <div class="text-sm text-white/85 leading-relaxed">${escapeHTML(aiSentiment.trend['年末'])}</div>
                </div>` : ''}
            </div>` : `
            <div class="text-sm text-white/85 leading-relaxed">
                ${escapeHTML(aiSentiment.trend)}
            </div>`}
        </div>` : ''}
    </section>`;
}

// ============================================
// AI 增强模块：本群年度总结（锐评版）
// ============================================

/**
 * 生成 AI 本群年度总结页（锐评版）
 */
function generateGroupSummarySection(aiGroupSummary) {
    if (!aiGroupSummary) return '';
    if (!aiGroupSummary.year_in_one_sentence && (!aiGroupSummary.brutal_truths || !aiGroupSummary.brutal_truths.length)) return '';

    // 群身份卡片
    const identityHtml = aiGroupSummary.group_identity ? `
        <div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal-blue">
            <h3 class="text-lg font-bold text-neon-blue mb-4">🏷️ 群的身份</h3>
            <div class="space-y-3">
                ${aiGroupSummary.group_identity.name ? `
                <div>
                    <div class="text-xs text-white/60 uppercase tracking-widest mb-1">自称</div>
                    <div class="text-base text-white font-semibold">${escapeHTML(aiGroupSummary.group_identity.name)}</div>
                </div>` : ''}
                ${aiGroupSummary.group_identity.nature ? `
                <div>
                    <div class="text-xs text-white/60 uppercase tracking-widest mb-1">表面性质</div>
                    <div class="text-base text-white/90">${escapeHTML(aiGroupSummary.group_identity.nature)}</div>
                </div>` : ''}
                ${aiGroupSummary.group_identity.real_nature ? `
                <div class="p-3 bg-brutal-black border-2 border-neon-pink">
                    <div class="text-xs text-neon-pink uppercase tracking-widest mb-1 font-bold">真实性质</div>
                    <div class="text-sm text-white/90 italic">"${escapeHTML(aiGroupSummary.group_identity.real_nature)}"</div>
                </div>` : ''}
            </div>
        </div>` : '';

    // 群目的卡片
    const purposeHtml = aiGroupSummary.group_purpose ? `
        <div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal">
            <h3 class="text-lg font-bold text-neon-yellow mb-4">🎯 群的目的</h3>
            <div class="space-y-3">
                ${aiGroupSummary.group_purpose.stated_purpose ? `
                <div>
                    <div class="text-xs text-white/60 uppercase tracking-widest mb-1">声称的目的</div>
                    <div class="text-base text-white/90">${escapeHTML(aiGroupSummary.group_purpose.stated_purpose)}</div>
                </div>` : ''}
                ${aiGroupSummary.group_purpose.actual_purpose ? `
                <div class="p-3 bg-brutal-black border-2 border-neon-orange">
                    <div class="text-xs text-neon-orange uppercase tracking-widest mb-1 font-bold">实际目的</div>
                    <div class="text-sm text-white/90 italic">"${escapeHTML(aiGroupSummary.group_purpose.actual_purpose)}"</div>
                </div>` : ''}
                ${aiGroupSummary.group_purpose.gap_analysis ? `
                <div>
                    <div class="text-xs text-white/60 uppercase tracking-widest mb-1">差距分析</div>
                    <div class="text-sm text-white/70">${escapeHTML(aiGroupSummary.group_purpose.gap_analysis)}</div>
                </div>` : ''}
            </div>
        </div>` : '';

    // 成员画像卡片
    const archetypesHtml = aiGroupSummary.member_archetypes && aiGroupSummary.member_archetypes.length ? `
        <div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal-green">
            <h3 class="text-lg font-bold text-neon-green mb-4">👥 成员画像</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${aiGroupSummary.member_archetypes.map((a, i) => {
                    const colors = ['border-neon-pink', 'border-neon-blue', 'border-neon-yellow', 'border-neon-green', 'border-neon-orange'];
                    const textColors = ['text-neon-pink', 'text-neon-blue', 'text-neon-yellow', 'text-neon-green', 'text-neon-orange'];
                    return `
                    <div class="p-4 bg-brutal-black border-2 ${colors[i % colors.length]}">
                        <div class="font-bold ${textColors[i % textColors.length]} mb-2">${escapeHTML(a.archetype)}</div>
                        <div class="text-sm text-white/85 mb-2">${escapeHTML(a.description)}</div>
                        ${a.psychological_need ? `<div class="text-xs text-white/60 italic">💭 ${escapeHTML(a.psychological_need)}</div>` : ''}
                    </div>`;
                }).join('')}
            </div>
        </div>` : '';

    // 集体幻觉卡片
    const delusionsHtml = aiGroupSummary.collective_delusions && aiGroupSummary.collective_delusions.length ? `
        <div class="bg-brutal-dark border-4 border-white p-6 shadow-brutal-yellow">
            <h3 class="text-lg font-bold text-neon-orange mb-4">🌀 集体幻觉</h3>
            <div class="space-y-4">
                ${aiGroupSummary.collective_delusions.map((d, i) => `
                    <div class="p-4 bg-brutal-black border-2 border-white">
                        <div class="flex items-start gap-3 mb-2">
                            <span class="text-2xl">💭</span>
                            <div>
                                <div class="text-sm text-neon-yellow font-bold mb-1">幻觉：${escapeHTML(d.delusion)}</div>
                                <div class="text-sm text-neon-pink">现实：${escapeHTML(d.reality)}</div>
                            </div>
                        </div>
                        ${d.why_they_believe ? `<div class="text-xs text-white/60 italic mt-2">为什么相信：${escapeHTML(d.why_they_believe)}</div>` : ''}
                    </div>`).join('')}
            </div>
        </div>` : '';

    // 残酷真相卡片
    const truthsHtml = aiGroupSummary.brutal_truths && aiGroupSummary.brutal_truths.length ? `
        <div class="bg-brutal-dark border-4 border-neon-pink p-6 shadow-[8px_8px_0_#ff2d92]">
            <h3 class="text-lg font-bold text-neon-pink mb-4">💀 残酷真相</h3>
            <div class="space-y-3">
                ${aiGroupSummary.brutal_truths.map((t, i) => `
                    <div class="flex items-start gap-3 p-3 bg-brutal-black border-2 border-white hover:border-neon-pink transition-colors">
                        <span class="text-neon-pink font-black text-lg">${i + 1}</span>
                        <div class="text-sm text-white/90 leading-relaxed">${escapeHTML(t)}</div>
                    </div>`).join('')}
            </div>
        </div>` : '';

    // 年度一句话总结
    const summaryHtml = aiGroupSummary.year_in_one_sentence ? `
        <div class="bg-brutal-dark border-[6px] border-neon-yellow p-8 shadow-[12px_12px_0_#ff2d92] text-center">
            <div class="text-6xl mb-4 drop-shadow-[4px_4px_0_#0d0d0d]">🎯</div>
            <div class="text-xs text-neon-yellow uppercase tracking-widest font-bold mb-4">年度一句话总结</div>
            <div class="font-display text-[clamp(20px,4vw,32px)] font-black text-white leading-relaxed">
                "${escapeHTML(aiGroupSummary.year_in_one_sentence)}"
            </div>
        </div>` : '';

    // 忠告
    const adviceHtml = aiGroupSummary.advice_if_any ? `
        <div class="bg-brutal-dark border-4 border-neon-green p-6 shadow-brutal-green">
            <h3 class="text-lg font-bold text-neon-green mb-4">💊 忠告</h3>
            <div class="text-base text-white/90 leading-relaxed italic">
                "${escapeHTML(aiGroupSummary.advice_if_any)}"
            </div>
        </div>` : '';

    return `
    <section class="section min-h-screen py-16 px-6 flex flex-col justify-center items-center">
        <h2 class="font-display text-[clamp(32px,5vw,56px)] font-extrabold text-center mb-6 text-white uppercase tracking-tight relative inline-block
            after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-1.5 after:bg-neon-pink">
            🔬 本群年度解剖 <span class="text-neon-green text-2xl ml-2">AI</span>
        </h2>
        <p class="text-center text-white/70 mb-12 text-sm">毫不留情的知识体系解剖师视角</p>
        
        ${summaryHtml ? `<div class="w-full max-w-4xl mb-8">${summaryHtml}</div>` : ''}
        
        <div class="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            ${identityHtml}
            ${purposeHtml}
        </div>
        
        ${archetypesHtml ? `<div class="w-full max-w-5xl mb-6">${archetypesHtml}</div>` : ''}
        
        ${delusionsHtml ? `<div class="w-full max-w-5xl mb-6">${delusionsHtml}</div>` : ''}
        
        ${truthsHtml ? `<div class="w-full max-w-4xl mb-6">${truthsHtml}</div>` : ''}
        
        ${adviceHtml ? `<div class="w-full max-w-4xl">${adviceHtml}</div>` : ''}
    </section>`;
}

module.exports = {
    generateCoverSection,
    generateStatsSection,
    generateAwardsSection,
    generateTimeSection,
    generateNightSection,
    generateJokerSection,
    generateWordCloudSection,
    generateNlpSection,
    generateMonthlySection,
    generateAiMonthlyThemesSection,
    generateRankingSection,
    generateAwardWallSection,
    generateMessageTypeSection,
    generateEndSection,
    generateCalendarHeatmapSection,
    generateRelationsSection,
    generateHighlightsSection,
    generateWeekdaySection,
    generateMentionedSection,
    generateSupporterSection,
    generateLonerSection,
    generateRepeaterSection,
    // AI 增强模块
    generateQuotesSection,
    generateUserProfilesSection,
    generateAiSentimentSection,
    generateGroupSummarySection,
};
