/**
 * 年度报告生成器 - 主入口文件
 * @module index
 * 
 * 用法: node src/index.js
 * 
 * 项目结构:
 * src/
 * ├── index.js                      # 主入口文件
 * ├── config.js                     # 配置模块
 * ├── analyzer/
 * │   └── ChatAnalyzer.js           # 数据分析模块
 * └── generator/
 *     ├── ReportGenerator.js        # 报告生成器主模块
 *     ├── css.js                    # CSS 样式生成
 *     ├── sections.js               # HTML 段落生成
 *     └── js.js                     # JavaScript 代码生成
 */

const fs = require('fs');
const path = require('path');

// 导入模块
const { INPUT_FILE, OUTPUT_FILE, TARGET_YEAR } = require('./config');
const ChatAnalyzer = require('./analyzer/ChatAnalyzer');
const ReportGenerator = require('./generator/ReportGenerator');

/**
 * 主函数 - 生成年度报告
 */
function generateReport() {
    console.log('🚀 开始生成年度报告...');
    console.log(`   - 输入文件: ${INPUT_FILE}`);
    console.log(`   - 目标年份: ${TARGET_YEAR}`);
    console.log(`   - 输出文件: ${OUTPUT_FILE}`);
    console.log('');
    
    // 检查输入文件是否存在
    const inputPath = path.resolve(process.cwd(), INPUT_FILE);
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ 错误: 找不到文件 ${inputPath}`);
        console.error('   请确保群聊数据 JSON 文件存在于项目根目录');
        process.exit(1);
    }
    
    try {
        // 读取并解析数据
        console.log('📂 正在读取数据文件...');
        const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
        
        // 数据分析
        const analyzer = new ChatAnalyzer(rawData, TARGET_YEAR);
        
        // 生成报告
        console.log('📝 正在生成 HTML 报告...');
        const generator = new ReportGenerator(analyzer);
        const html = generator.generate();
        
        // 写入输出文件
        const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);
        fs.writeFileSync(outputPath, html);
        
        console.log('');
        console.log(`✅ 报告已成功生成!`);
        console.log(`   📄 文件路径: ${outputPath}`);
        console.log('');
        console.log('💡 提示: 在浏览器中打开 HTML 文件即可查看报告');
        
    } catch (error) {
        console.error('❌ 生成报告时发生错误:');
        console.error(error.message);
        process.exit(1);
    }
}

// 导出模块（供外部调用）
module.exports = {
    generateReport,
    ChatAnalyzer,
    ReportGenerator,
};

// 如果直接运行此文件，则执行生成报告
if (require.main === module) {
    generateReport();
}