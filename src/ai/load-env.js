/**
 * Tiny .env loader (no deps).
 * - Reads ".env" from process.cwd()
 * - Fills process.env for keys not already set
 */

const fs = require('fs');
const path = require('path');

function stripQuotes(value) {
    let v = String(value ?? '').trim();
    
    // 处理带引号的值：提取引号内的内容，忽略后面的注释
    if (v.startsWith('"')) {
        const endQuote = v.indexOf('"', 1);
        if (endQuote > 0) {
            return v.slice(1, endQuote);
        }
    }
    if (v.startsWith("'")) {
        const endQuote = v.indexOf("'", 1);
        if (endQuote > 0) {
            return v.slice(1, endQuote);
        }
    }
    
    // 无引号的值：去除行内注释（# 后面的内容）
    const hashIndex = v.indexOf('#');
    if (hashIndex > 0) {
        v = v.slice(0, hashIndex).trim();
    }
    
    return v;
}

function loadEnv(envFile = '.env') {
    try {
        const p = path.resolve(process.cwd(), envFile);
        if (!fs.existsSync(p)) return;
        const raw = fs.readFileSync(p, 'utf-8');
        raw.split(/\r?\n/).forEach((line) => {
            const l = String(line || '').trim();
            if (!l || l.startsWith('#')) return;
            const cleaned = l.startsWith('export ') ? l.slice(7).trim() : l;
            const m = cleaned.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
            if (!m) return;
            const key = m[1];
            const val = stripQuotes(m[2]);
            if (process.env[key] == null || process.env[key] === '') {
                process.env[key] = val;
            }
        });
    } catch {
        // ignore
    }
}

module.exports = { loadEnv };

