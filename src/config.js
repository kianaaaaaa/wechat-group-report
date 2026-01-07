/**
 * 年度报告生成器 - 配置模块
 * @module config
 */

// 文件配置
// 支持通过环境变量覆盖：INPUT_FILE / OUTPUT_FILE / TARGET_YEAR
const INPUT_FILE = process.env.INPUT_FILE || 'data.json';
const OUTPUT_FILE = process.env.OUTPUT_FILE || 'index.html';
const TARGET_YEAR = Number(process.env.TARGET_YEAR || 2025);

// 停用词列表 - 在词频分析时过滤这些常见无意义词
const STOP_WORDS = new Set([
    // 语气词 / 常见灌水词
    '哈哈', '哈哈哈', '呵呵', '嘿嘿', '嘻嘻', '呜呜', '呃', '额', '嗯', '啊', '哦', '哎',
    '好', '好的', '行', '可以', '可以的', 'ok', 'okay', 'OK', '1', '+1', '确实', '真是',

    // 高频虚词（按需增补）
    '这个', '那个', '一种', '一个', '不会', '不是', '就是', '然后', '所以', '因为', '但是',
    '感觉', '觉得', '知道', '看到', '听说', '怎么', '为什么', '什么', '哪里', '哪个', '多少',
    '我们', '你们', '他们', '她们', '大家', '今天', '明天', '昨天', '现在', '刚刚', '一直', '还有', '不过',
    '真的', '已经', '可能', '应该', '如果', '但是', '而且', '因为', '所以', '怎么', '什么',
    // 消息占位
    '[图片]', '[动画表情]', '[视频]', '[拍一拍]',
]);

module.exports = {
    INPUT_FILE,
    OUTPUT_FILE,
    TARGET_YEAR,
    STOP_WORDS,
};
