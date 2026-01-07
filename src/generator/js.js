/**
 * 年度报告生成器 - JavaScript 代码生成模块
 * @module generator/js
 * @description Neubrutalism Motion-Driven Animation System
 */

/**
 * 生成完整的 JavaScript 代码
 * @param {Object} options - 配置选项
 * @param {Array} options.hourlyData - 24小时活跃数据
 * @param {Array} options.monthlyData - 月度活跃数据
 * @param {Array} options.topWords - 热词数组
 * @param {Array} options.messageTypes - 消息类型分布
 * @param {Array} options.calendarData - 日历热力图数据
 * @param {Object} options.relationsData - 关系图数据
 * @param {Array} options.weekdayHourlyData - 周热力图数据
 * @param {number} options.targetYear - 目标年份
 * @returns {string} JavaScript 代码字符串
 */
function generateJS(options) {
    const { hourlyData, monthlyData, topWords, messageTypes, calendarData, relationsData, weekdayHourlyData, targetYear, userMeta } = options;

    return `
${generateUserMeta(userMeta)}
${generateAvatarHydration()}
${generateBrutalMotionSystem()}
${generateScrollObserver()}
${generateNumberAnimation()}
${generateParticleAnimation()}
${generateHourChart(hourlyData)}
${generateMonthChart(monthlyData)}
${generateWordCloud(topWords)}
${generateTypeChart(messageTypes)}
${generateCalendarHeatmap(calendarData, targetYear)}
${generateRelationsChart(relationsData)}
${generateWeekdayChart(weekdayHourlyData)}
${generateResizeHandler()}
`;
}

function generateUserMeta(userMeta) {
    return `window.__USER_META__ = ${JSON.stringify(userMeta || {})};`;
}

function generateAvatarHydration() {
    return `
document.addEventListener('DOMContentLoaded', function() {
    const meta = window.__USER_META__ || {};
    document.querySelectorAll('img[data-avatar-id]').forEach((img) => {
        const id = img.getAttribute('data-avatar-id');
        if (!id) return;
        const avatarUrl = meta[id]?.avatarUrl;
        if (!avatarUrl) return;
        img.src = avatarUrl;
        img.classList.remove('hidden');
        const fallback = img.parentElement ? img.parentElement.querySelector('[data-avatar-fallback]') : null;
        if (fallback) fallback.classList.add('hidden');
    });
});`;
}

/**
 * 野蛮主义运动系统
 */
function generateBrutalMotionSystem() {
    return `
// Brutal Motion System
const BrutalMotion = {
    // Glitch text effect
    glitchText: function(element) {
        if (!element) return;
        const originalText = element.textContent;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        let iterations = 0;
        const interval = setInterval(() => {
            element.textContent = originalText.split('').map((char, i) => {
                if (i < iterations) return originalText[i];
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');
            if (iterations >= originalText.length) clearInterval(interval);
            iterations += 1/2;
        }, 30);
    },

    // Mouse parallax effect
    initParallax: function() {
        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.card, .award-card, .stat-item');
            const x = (e.clientX / window.innerWidth - 0.5) * 10;
            const y = (e.clientY / window.innerHeight - 0.5) * 10;
            cards.forEach(card => {
                card.style.transform = 'translate(' + (-x/3) + 'px, ' + (-y/3) + 'px)';
            });
        });
    },

    // Stagger reveal animation
    staggerReveal: function(selector, delay = 100) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, i) => {
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
            }, i * delay);
        });
    },

    // Color cycle effect
    colorCycle: function(element) {
        if (!element) return;
        const colors = ['#ff2d92', '#00f0ff', '#b8ff00', '#ff6b00', '#ffea00'];
        let i = 0;
        setInterval(() => {
            element.style.color = colors[i];
            i = (i + 1) % colors.length;
        }, 500);
    }
};

// Initialize brutal effects
document.addEventListener('DOMContentLoaded', function() {
    // Apply glitch to main title
    const chatName = document.querySelector('.chat-name');
    if (chatName) {
        chatName.addEventListener('mouseenter', () => BrutalMotion.glitchText(chatName));
    }

    // Stagger reveal for cards
    setTimeout(() => {
        BrutalMotion.staggerReveal('.stat-item', 150);
        BrutalMotion.staggerReveal('.award-wall-item', 80);
    }, 500);
});`;
}

/**
 * 生成滚动动画观察器
 */
function generateScrollObserver() {
    return `
document.addEventListener('DOMContentLoaded', function() {
    // 滚动动画
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.section').forEach(el => observer.observe(el));
});`;
}

/**
 * 生成数字滚动动画
 */
function generateNumberAnimation() {
    return `
document.addEventListener('DOMContentLoaded', function() {
    // 数字滚动动画
    const bigNumbers = document.querySelectorAll('.big-number[data-count]');
    bigNumbers.forEach(el => {
        const target = parseInt(el.dataset.count);
        let current = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = current.toLocaleString();
        }, 16);
    });
});`;
}

/**
 * 生成24小时活跃图表
 * @param {Array} hourlyData - 24小时数据
 */
function generateHourChart(hourlyData) {
    return `
document.addEventListener('DOMContentLoaded', function() {
    // 24小时活跃图表 - Brutal Neon Style
    const hourChart = echarts.init(document.getElementById('hourChart'));
    hourChart.setOption({
        tooltip: { trigger: 'axis', backgroundColor: '#1a1a1a', borderColor: '#ff2d92', borderWidth: 2, textStyle: { color: '#fff' } },
        xAxis: {
            type: 'category',
            data: Array.from({length: 24}, (_, i) => i + '时'),
            axisLine: { lineStyle: { color: '#fff', width: 2 } },
            axisLabel: { color: '#fff', fontWeight: 'bold' },
            axisTick: { lineStyle: { color: '#fff', width: 2 } }
        },
        yAxis: {
            type: 'value',
            axisLine: { lineStyle: { color: '#fff', width: 2 } },
            axisLabel: { color: '#00f0ff', fontWeight: 'bold' },
            splitLine: { lineStyle: { color: '#2d2d2d', width: 2 } }
        },
        series: [{
            data: ${JSON.stringify(hourlyData)},
            type: 'bar',
            itemStyle: {
                color: '#ff2d92',
                borderColor: '#fff',
                borderWidth: 2
            },
            emphasis: {
                itemStyle: { color: '#ffea00' }
            },
            barWidth: '60%'
        }],
        grid: { left: '10%', right: '5%', bottom: '15%', top: '10%' }
    });
    window.hourChart = hourChart;
});`;
}

/**
 * 生成月度趋势图表
 * @param {Array} monthlyData - 月度数据
 */
function generateMonthChart(monthlyData) {
    return `
document.addEventListener('DOMContentLoaded', function() {
    // 月度趋势图表 - Brutal Neon Style
    const monthChart = echarts.init(document.getElementById('monthChart'));
    monthChart.setOption({
        tooltip: { trigger: 'axis', backgroundColor: '#1a1a1a', borderColor: '#00f0ff', borderWidth: 2, textStyle: { color: '#fff' } },
        xAxis: {
            type: 'category',
            data: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
            axisLine: { lineStyle: { color: '#fff', width: 2 } },
            axisLabel: { color: '#fff', fontWeight: 'bold' },
            axisTick: { lineStyle: { color: '#fff', width: 2 } }
        },
        yAxis: {
            type: 'value',
            axisLine: { lineStyle: { color: '#fff', width: 2 } },
            axisLabel: { color: '#b8ff00', fontWeight: 'bold' },
            splitLine: { lineStyle: { color: '#2d2d2d', width: 2 } }
        },
        series: [{
            data: ${JSON.stringify(monthlyData)},
            type: 'line',
            smooth: false,
            step: 'middle',
            areaStyle: { color: 'rgba(0, 240, 255, 0.2)' },
            itemStyle: { color: '#00f0ff', borderWidth: 3 },
            lineStyle: { width: 4, color: '#00f0ff' },
            symbol: 'rect',
            symbolSize: 12
        }],
        grid: { left: '10%', right: '5%', bottom: '15%', top: '10%' }
    });
    window.monthChart = monthChart;
});`;
}

/**
 * 生成词云图表
 * @param {Array} topWords - 热词数组
 */
function generateWordCloud(topWords) {
    const wordCloudData = topWords.map(w => ({ name: w.word, value: w.count }));

    return `
document.addEventListener('DOMContentLoaded', function() {
    // 词云图表 - Brutal Neon Style
    const wordCloud = echarts.init(document.getElementById('wordCloud'));
    const neonColors = ['#ff2d92', '#00f0ff', '#b8ff00', '#ff6b00', '#ffea00', '#a855f7'];
    wordCloud.setOption({
        series: [{
            type: 'wordCloud',
            shape: 'square',
            left: 'center',
            top: 'center',
            width: '90%',
            height: '90%',
            sizeRange: [16, 60],
            rotationRange: [0, 0],
            rotationStep: 0,
            gridSize: 8,
            drawOutOfBound: false,
            textStyle: {
                fontFamily: 'Lexend Mega, sans-serif',
                fontWeight: '800',
                color: function() {
                    return neonColors[Math.floor(Math.random() * neonColors.length)];
                }
            },
            emphasis: {
                textStyle: {
                    textShadowBlur: 10,
                    textShadowColor: '#fff'
                }
            },
            data: ${JSON.stringify(wordCloudData)}
        }]
    });
    window.wordCloud = wordCloud;
});`;
}

/**
 * 生成消息类型饼图
 * @param {Array} messageTypes - 消息类型分布
 */
function generateTypeChart(messageTypes) {
    const colors = ['#ff2d92', '#00f0ff', '#b8ff00', '#ff6b00', '#ffea00', '#a855f7'];
    const typeData = messageTypes.slice(0, 6).map((t, i) => ({
        name: t.type,
        value: t.count,
        itemStyle: { color: colors[i], borderColor: '#fff', borderWidth: 3 }
    }));

    return `
document.addEventListener('DOMContentLoaded', function() {
    // 消息类型饼图 - Brutal Neon Style
    const typeChart = echarts.init(document.getElementById('typeChart'));
    typeChart.setOption({
        series: [{
            type: 'pie',
            radius: ['45%', '80%'],
            center: ['50%', '50%'],
            itemStyle: { borderRadius: 0, borderColor: '#0d0d0d', borderWidth: 4 },
            label: { show: false },
            emphasis: {
                scale: true,
                scaleSize: 10
            },
            data: ${JSON.stringify(typeData)}
        }]
    });
    window.typeChart = typeChart;
});`;
}

/**
 * 生成窗口大小变化处理器
 */
function generateResizeHandler() {
    return `
document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('resize', () => {
        if (window.hourChart) window.hourChart.resize();
        if (window.monthChart) window.monthChart.resize();
        if (window.wordCloud) window.wordCloud.resize();
        if (window.typeChart) window.typeChart.resize();
        if (window.calendarChart) window.calendarChart.resize();
        if (window.relationChart) window.relationChart.resize();
        if (window.weekdayChart) window.weekdayChart.resize();
    });
});`;
}

/**
 * 生成封面粒子动画 - Brutal Neon Style
 */
function generateParticleAnimation() {
    return `
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const section = canvas.parentElement;
    if (!section) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];
    const neonColors = ['#ff2d92', '#00f0ff', '#b8ff00', '#ff6b00', '#ffea00'];

    function resize() {
        width = canvas.width = section.offsetWidth;
        height = canvas.height = section.offsetHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Create brutal square particles
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 8 + 4,
            color: neonColors[Math.floor(Math.random() * neonColors.length)],
            rotation: Math.random() * 360
        });
    }

    function animate() {
        ctx.fillStyle = 'rgba(13, 13, 13, 0.1)';
        ctx.fillRect(0, 0, width, height);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += 2;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
        });
        requestAnimationFrame(animate);
    }
    animate();
});`;
}

/**
 * 生成 GitHub 风格日历热力图 - Brutal Style
 */
function generateCalendarHeatmap(calendarData, targetYear) {
    const formattedData = (calendarData || []).map(d => [d.date, d.count]);
    const maxCount = Math.max(...(calendarData || []).map(d => d.count), 1);

    return `
document.addEventListener('DOMContentLoaded', function() {
    const el = document.getElementById('calendarChart');
    if (!el) return;
    const calendarChart = echarts.init(el);
    calendarChart.setOption({
        tooltip: {
            formatter: function(p) { return p.data[0] + ': ' + p.data[1] + ' 条消息'; },
            backgroundColor: '#1a1a1a',
            borderColor: '#ff2d92',
            borderWidth: 2,
            textStyle: { color: '#fff' }
        },
        visualMap: {
            min: 0, max: ${Math.min(maxCount, 300)}, show: false,
            inRange: { color: ['#1a1a1a', '#ff2d92', '#00f0ff', '#b8ff00', '#ffea00'] }
        },
        calendar: {
            top: 30, left: 40, right: 40, bottom: 10,
            range: '${targetYear}',
            cellSize: ['auto', 14],
            itemStyle: { borderWidth: 2, borderColor: '#0d0d0d' },
            yearLabel: { show: false },
            dayLabel: { color: '#fff', nameMap: 'cn' },
            monthLabel: { color: '#ffea00', nameMap: 'cn', fontWeight: 'bold' }
        },
        series: [{
            type: 'heatmap', coordinateSystem: 'calendar',
            data: ${JSON.stringify(formattedData)}
        }]
    });
    window.calendarChart = calendarChart;
});`;
}

/**
 * 生成社交关系图谱 - Brutal Style
 */
function generateRelationsChart(relationsData) {
    const nodes = relationsData?.nodes || [];
    const links = relationsData?.links || [];

    return `
document.addEventListener('DOMContentLoaded', function() {
    const el = document.getElementById('relationChart');
    if (!el) return;
    const relationChart = echarts.init(el);
    relationChart.setOption({
        tooltip: { backgroundColor: '#1a1a1a', borderColor: '#00f0ff', borderWidth: 2, textStyle: { color: '#fff' } },
        series: [{
            type: 'graph', layout: 'force',
            data: ${JSON.stringify(nodes)},
            links: ${JSON.stringify(links)},
            roam: true,
            label: { show: true, position: 'right', color: '#fff', fontSize: 12, fontWeight: 'bold' },
            force: { repulsion: 180, edgeLength: [80, 220], gravity: 0.1 },
            lineStyle: { color: '#ff2d92', width: 2, curveness: 0, opacity: 0.8 },
            itemStyle: { borderColor: '#fff', borderWidth: 2 },
            emphasis: { focus: 'adjacency', lineStyle: { width: 4 } }
        }]
    });
    window.relationChart = relationChart;
});`;
}

/**
 * 生成周热力图 - Brutal Style
 */
function generateWeekdayChart(weekdayHourlyData) {
    const data = weekdayHourlyData || [];
    const maxVal = Math.max(...data.map(d => d[2] || 0), 1);

    return `
document.addEventListener('DOMContentLoaded', function() {
    const el = document.getElementById('weekdayChart');
    if (!el) return;
    const weekdayChart = echarts.init(el);
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const hours = Array.from({length:24}, (_, i) => i + '时');
    weekdayChart.setOption({
        tooltip: {
            position: 'top',
            formatter: function(p) { return days[p.data[1]] + ' ' + p.data[0] + '时: ' + p.data[2] + ' 条'; },
            backgroundColor: '#1a1a1a',
            borderColor: '#b8ff00',
            borderWidth: 2,
            textStyle: { color: '#fff' }
        },
        grid: { height: '70%', top: '5%', left: '15%', right: '5%' },
        xAxis: { type: 'category', data: hours, splitArea: { show: true, areaStyle: { color: ['#1a1a1a', '#0d0d0d'] } }, axisLabel: { color: '#fff', fontSize: 10, fontWeight: 'bold' } },
        yAxis: { type: 'category', data: days, splitArea: { show: true, areaStyle: { color: ['#1a1a1a', '#0d0d0d'] } }, axisLabel: { color: '#ffea00', fontWeight: 'bold' } },
        visualMap: { min: 0, max: ${Math.min(maxVal, 200)}, show: false, inRange: { color: ['#1a1a1a', '#ff2d92', '#00f0ff', '#b8ff00', '#ffea00'] } },
        series: [{ type: 'heatmap', data: ${JSON.stringify(data)}, label: { show: false }, itemStyle: { borderColor: '#0d0d0d', borderWidth: 2 } }]
    });
    window.weekdayChart = weekdayChart;
});`;
}

module.exports = {
    generateJS,
    generateBrutalMotionSystem,
    generateScrollObserver,
    generateNumberAnimation,
    generateParticleAnimation,
    generateHourChart,
    generateMonthChart,
    generateWordCloud,
    generateTypeChart,
    generateCalendarHeatmap,
    generateRelationsChart,
    generateWeekdayChart,
    generateResizeHandler,
};
