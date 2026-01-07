/**
 * 年度报告生成器 - 报告生成器主模块
 * @module generator/ReportGenerator
 */

const { generateCSS, generateTailwindConfig } = require('./css');
const { generateJS } = require('./js');
const { loadAllAiResults } = require('../ai/parse-batch-output');
const {
    generateCoverSection,
    generateStatsSection,
    generateAwardsSection,
    generateTimeSection,
    generateNightSection,
    generateWordCloudSection,
    generateNlpSection,
    generateAiMonthlyThemesSection,
    generateMonthlySection,
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
    generateQuotesSection,
    generateUserProfilesSection,
    generateAiSentimentSection,
    generateGroupSummarySection,
} = require('./sections');

/**
 * HTML 报告生成器
 * 负责将分析数据转换为完整的 HTML 报告
 */
class ReportGenerator {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.stats = analyzer.stats;
        this.chatName = analyzer.chatName;
        this.targetYear = analyzer.targetYear;
    }

    generate() {
        const awards = this.analyzer.getAwards();
        const userMeta = typeof this.analyzer.getUserMeta === 'function' ? this.analyzer.getUserMeta() : {};
        const userRanking = this.analyzer.getUserRanking(10);
        const topWords = this.analyzer.getTopWords(30);
        const monthlyKeywords = this.analyzer.getMonthlyKeywords(6);
        const hotEventsLimit = Number(process.env.HOT_EVENTS_LIMIT || 6);
        const hotEvents = this.analyzer.getHotEvents(hotEventsLimit);
        const sentiment = this.analyzer.getSentimentSummary();
        
        // 加载所有 AI 增强结果
        const aiBatchOutputPath = process.env.AI_BATCH_OUTPUT_PATH || 'ai/batch_output.jsonl';
        const aiResults = loadAllAiResults(aiBatchOutputPath);
        const aiEventSummaries = aiResults.events || {};
        const aiMonthSummaries = aiResults.months || {};
        const aiAwardCitations = aiResults.awards || {};
        const aiUserProfiles = aiResults.users || {};
        const aiQuotes = aiResults.quotes || null;
        const aiSentiment = aiResults.sentiment || null;
        const aiGroupSummary = aiResults.groupSummary || null;
        
        const nightOwls = this.analyzer.getNightOwlRanking(5);
        const peakHour = this.analyzer.getPeakHour();
        const messageTypes = this.analyzer.getMessageTypeDistribution();
        const calendarData = this.analyzer.getCalendarData();
        const relationsData = this.analyzer.getRelationsData();
        const highlights = this.analyzer.getHighlights();
        const weekdayHourlyData = this.analyzer.getWeekdayHourlyData();
        const mentionedRanking = this.analyzer.getMentionedRanking(10);
        const supporterRanking = this.analyzer.getSupporterRanking(10);
        const quoteRanking = this.analyzer.getQuoteRanking(10);
        const lonerRanking = this.analyzer.getLonerRanking(6);
        const repeaterRanking = this.analyzer.getRepeaterRanking(10);
        const topRepeatedPhrases = this.analyzer.getTopRepeatedPhrases(10);

        return this._assembleHTML({
            awards,
            userRanking,
            topWords,
            nightOwls,
            peakHour,
            messageTypes,
            calendarData,
            relationsData,
            highlights,
            weekdayHourlyData,
            userMeta,
            monthlyKeywords,
            hotEvents,
            sentiment,
            aiEventSummaries,
            aiMonthSummaries,
            aiAwardCitations,
            aiUserProfiles,
            aiQuotes,
            aiSentiment,
            aiGroupSummary,
            mentionedRanking,
            supporterRanking,
            quoteRanking,
            lonerRanking,
            repeaterRanking,
            topRepeatedPhrases,
        });
    }

    _assembleHTML(data) {
        const {
            awards, userRanking, topWords, nightOwls, peakHour,
            messageTypes, calendarData, relationsData, highlights, weekdayHourlyData,
            userMeta,
            monthlyKeywords,
            hotEvents,
            sentiment,
            aiEventSummaries,
            aiMonthSummaries,
            aiAwardCitations,
            aiUserProfiles,
            aiQuotes,
            aiSentiment,
            aiGroupSummary,
            mentionedRanking,
            supporterRanking,
            quoteRanking,
            lonerRanking,
            repeaterRanking,
            topRepeatedPhrases,
        } = data;

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    ${this._generateHead()}
</head>
<body class="font-body bg-brutal-black text-white min-h-screen overflow-x-hidden antialiased">
    <div class="w-full max-w-7xl mx-auto px-6">
        ${generateCoverSection(this.chatName, this.targetYear)}
        ${generateStatsSection(this.stats)}
        ${generateHighlightsSection(highlights)}
        ${generateAwardsSection(awards, aiAwardCitations)}
        ${generateCalendarHeatmapSection(this.targetYear)}
        ${generateTimeSection(peakHour)}
        ${generateWeekdaySection()}
        ${generateNightSection(nightOwls)}
        ${generateWordCloudSection(topWords)}
        ${generateNlpSection(monthlyKeywords, hotEvents, sentiment, aiEventSummaries, aiMonthSummaries)}
        ${generateAiMonthlyThemesSection(aiMonthSummaries)}
        ${generateQuotesSection(aiQuotes)}
        ${generateAiSentimentSection(aiSentiment)}
        ${generateGroupSummarySection(aiGroupSummary)}
        ${generateMonthlySection(this.stats.monthlyData)}
        ${generateRelationsSection()}
        ${generateUserProfilesSection(userRanking, aiUserProfiles)}
        ${generateSupporterSection(supporterRanking, quoteRanking)}
        ${generateRankingSection(userRanking)}
        ${generateMentionedSection(mentionedRanking)}
        ${generateLonerSection(lonerRanking)}
        ${generateRepeaterSection(repeaterRanking, topRepeatedPhrases)}
        ${generateAwardWallSection(awards, aiAwardCitations)}
        ${generateMessageTypeSection(messageTypes)}
        ${generateEndSection(this.stats, this.chatName, this.targetYear)}
    </div>
    <script>
${generateJS({
    hourlyData: this.stats.hourlyData,
    monthlyData: this.stats.monthlyData,
    topWords,
    messageTypes,
    calendarData,
    relationsData,
    weekdayHourlyData,
    targetYear: this.targetYear,
    userMeta,
})}
    </script>
</body>
</html>`;
    }

    _generateHead() {
        return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.targetYear} 年度群聊报告 - ${this.chatName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    ${generateTailwindConfig()}
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/echarts-wordcloud@2.1.0/dist/echarts-wordcloud.min.js"></script>
    <style>
${generateCSS()}
    </style>`;
    }
}

module.exports = ReportGenerator;
