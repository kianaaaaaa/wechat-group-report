/**
 * 年度报告生成器 - CSS 样式模块 (Tailwind CSS)
 * @module generator/css
 * @description Neubrutalism + Motion-Driven + Neon Vibrant with Tailwind
 */

/**
 * 生成 Tailwind 配置脚本
 * @returns {string} Tailwind config script
 */
function generateTailwindConfig() {
    return `
<script>
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'neon-pink': '#ff2d92',
                'neon-blue': '#00f0ff',
                'neon-green': '#b8ff00',
                'neon-orange': '#ff6b00',
                'neon-yellow': '#ffea00',
                'neon-purple': '#a855f7',
                'brutal-black': '#0d0d0d',
                'brutal-dark': '#1a1a1a',
                'brutal-gray': '#2d2d2d',
            },
            fontFamily: {
                'display': ['Lexend Mega', 'sans-serif'],
                'body': ['Public Sans', 'sans-serif'],
            },
            boxShadow: {
                'brutal': '8px 8px 0 #ff2d92',
                'brutal-blue': '4px 4px 0 #00f0ff',
                'brutal-green': '4px 4px 0 #b8ff00',
                'brutal-yellow': '4px 4px 0 #ffea00',
                'brutal-orange': '4px 4px 0 #ff6b00',
                'brutal-hover': '12px 12px 0 #ffea00',
                'brutal-sm': '4px 4px 0 #00f0ff',
            },
            animation: {
                'brutal-bounce': 'brutal-bounce 0.5s steps(2) infinite',
                'brutal-float': 'brutal-float 1s steps(4) infinite',
                'glitch': 'glitch 0.3s steps(2) infinite',
                'glitch-color': 'glitch-color 0.5s steps(2) infinite',
                'shake': 'shake 0.2s steps(3) infinite',
                'color-cycle': 'color-cycle 3s steps(4) infinite',
                'border-cycle': 'border-cycle 4s steps(4) infinite',
            },
        }
    }
}
</script>`;
}

/**
 * 生成完整的 CSS 样式
 * @returns {string} CSS 样式字符串
 */
function generateCSS() {
    return `
@import url('https://fonts.googleapis.com/css2?family=Lexend+Mega:wght@400;500;600;700;800;900&family=Public+Sans:wght@300;400;500;600;700&display=swap');

/* === SCROLLBAR === */
::-webkit-scrollbar { width: 12px; height: 12px; }
::-webkit-scrollbar-track { background: #0d0d0d; border-left: 2px solid #fff; }
::-webkit-scrollbar-thumb { background: #ff2d92; border: 2px solid #0d0d0d; }
::-webkit-scrollbar-thumb:hover { background: #ffea00; }

/* === SELECTION === */
::selection { background: #ff2d92; color: #0d0d0d; }

/* === FOCUS === */
:focus-visible { outline: 4px solid #ffea00; outline-offset: 2px; }

/* === KEYFRAMES === */
@keyframes brutal-bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-10px); }
}

@keyframes brutal-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
}

@keyframes glitch {
    0%, 100% { transform: translate(0); }
    20% { transform: translate(-3px, 3px); }
    40% { transform: translate(3px, -3px); }
    60% { transform: translate(-3px, -3px); }
    80% { transform: translate(3px, 3px); }
}

@keyframes glitch-color {
    0%, 100% { text-shadow: 2px 0 #ff2d92, -2px 0 #00f0ff; }
    25% { text-shadow: -2px 0 #ff2d92, 2px 0 #00f0ff; }
    50% { text-shadow: 2px 2px #b8ff00, -2px -2px #ff6b00; }
    75% { text-shadow: -2px 2px #ffea00, 2px -2px #a855f7; }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

@keyframes color-cycle {
    0% { color: #ff2d92; }
    25% { color: #00f0ff; }
    50% { color: #b8ff00; }
    75% { color: #ffea00; }
    100% { color: #ff2d92; }
}

@keyframes border-cycle {
    0% { border-color: #ff2d92; box-shadow: 4px 4px 0 #ff2d92; }
    25% { border-color: #00f0ff; box-shadow: 4px 4px 0 #00f0ff; }
    50% { border-color: #b8ff00; box-shadow: 4px 4px 0 #b8ff00; }
    75% { border-color: #ffea00; box-shadow: 4px 4px 0 #ffea00; }
    100% { border-color: #ff2d92; box-shadow: 4px 4px 0 #ff2d92; }
}

/* === SECTION VISIBILITY === */
.section {
    opacity: 0;
    transform: translateX(-40px);
}
.section.visible {
    opacity: 1;
    transform: translateX(0);
}

/* === CHART CONTAINERS === */
.chart-container {
    width: 100%;
    height: 350px;
}
@media (max-width: 768px) { .chart-container { height: 280px; } }
@media (max-width: 480px) { .chart-container { height: 220px; } }

.wordcloud-container {
    width: 100%;
    height: 400px;
}
@media (max-width: 768px) { .wordcloud-container { height: 300px; } }

.type-pie-chart {
    width: 220px;
    height: 220px;
    flex-shrink: 0;
}
@media (max-width: 768px) { .type-pie-chart { width: 200px; height: 200px; } }

/* === CANVAS === */
#particles {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
}

/* === COVER GRID BACKGROUND === */
.cover-grid::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(#2d2d2d 1px, transparent 1px),
        linear-gradient(90deg, #2d2d2d 1px, transparent 1px);
    background-size: 60px 60px;
    opacity: 0.3;
    z-index: 0;
}

/* === COVER NEON FRAME === */
.cover-frame::after {
    content: '';
    position: absolute;
    top: 20px; left: 20px; right: 20px; bottom: 20px;
    border: 6px solid transparent;
    border-image: linear-gradient(135deg, #ff2d92 0%, #ff6b00 50%, #ffea00 100%) 1;
    z-index: 0;
    pointer-events: none;
}

/* === NIGHT SCANLINES === */
.night-scanlines::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 240, 255, 0.03) 2px, rgba(0, 240, 255, 0.03) 4px);
    pointer-events: none;
}

/* === END NEON FRAME === */
.end-frame::before {
    content: '';
    position: absolute;
    inset: 40px;
    border: 8px solid transparent;
    border-image: linear-gradient(135deg, #ff2d92 0%, #ff6b00 50%, #ffea00 100%) 1;
    pointer-events: none;
}

/* === JOKER LABEL === */
.joker-label::before {
    content: 'JOKER';
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%) rotate(-3deg);
    background: #ffea00;
    color: #0d0d0d;
    font-family: 'Lexend Mega', sans-serif;
    font-size: 14px;
    font-weight: 800;
    padding: 8px 24px;
    border: 4px solid #fff;
}

/* === AWARD CARD GLOW === */
.award-glow::before {
    content: '';
    position: absolute;
    top: -4px; left: -4px; right: -4px; bottom: -4px;
    background: linear-gradient(135deg, #ff2d92 0%, #ff6b00 50%, #ffea00 100%);
    z-index: -1;
    opacity: 0;
    transition: opacity 100ms;
}
.award-glow:hover::before { opacity: 1; }

/* === REDUCED MOTION === */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
`;
}

module.exports = {
    generateCSS,
    generateTailwindConfig,
};
