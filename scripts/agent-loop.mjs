import process from 'node:process';

// 1. Tự động nạp file .env.local
try {
    process.loadEnvFile('.env.local');
} catch (e) {
    console.warn('⚠️ Không đọc được .env.local, đang dùng biến môi trường hệ thống.');
}

// Bắt buộc lấy API_KEY từ file .env.local để tránh bị ghi đè bởi biến môi trường hệ thống
try {
    const fs = await import('fs');
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const openaiMatch = envContent.match(/^OPENAI_API_KEY=(.*)$/m);
    if (openaiMatch) {
        process.env.OPENAI_API_KEY = openaiMatch[1].trim();
    }
    const geminiKeys = [];
    for (const match of envContent.matchAll(/^GEMINI_API_KEY.*=(.*)$/gm)) {
        if (match[1].trim()) geminiKeys.push(match[1].trim());
    }
    if (geminiKeys.length > 0) {
        process.env.GEMINI_API_KEYS = JSON.stringify(geminiKeys);
        process.env.GEMINI_API_KEY = geminiKeys[0];
    }
    const routerKeys = [];
    for (const match of envContent.matchAll(/^ROUTER_API_KEY.*=(.*)$/gm)) {
        if (match[1].trim() && !match[1].includes('dummy') && !match[1].startsWith('#')) {
            routerKeys.push(match[1].trim());
        }
    }
    if (routerKeys.length > 0) {
        process.env.ROUTER_API_KEYS = JSON.stringify(routerKeys);
    }
} catch (e) {
    // Bỏ qua nếu có lỗi
}

// Xóa sạch biến proxy tồn đọng để kết nối trực tiếp
delete process.env.OPENAI_BASE_URL;
delete process.env.OPENAI_API_BASE;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.ALL_PROXY;
delete process.env.all_proxy;

import fs from 'fs';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

const openaiKey = process.env.OPENAI_API_KEY;
const geminiKeysRaw = process.env.GEMINI_API_KEYS;
const geminiKeys = geminiKeysRaw ? JSON.parse(geminiKeysRaw) : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);

if ((!openaiKey || openaiKey.includes('sk-...')) && geminiKeys.length === 0) {
    console.error('❌ LỖI: Bạn chưa điền OPENAI_API_KEY hoặc GEMINI_API_KEY vào file .env.local!');
    process.exit(1);
}

const openai = openaiKey && !openaiKey.includes('sk-...') ? new OpenAI({
    apiKey: openaiKey,
    baseURL: 'https://api.openai.com/v1'
}) : null;

const routerKeysRaw = process.env.ROUTER_API_KEYS;
const routerKeysParsed = routerKeysRaw ? JSON.parse(routerKeysRaw) : [];
const routerClients = routerKeysParsed.map(key => new OpenAI({
    apiKey: key,
    baseURL: 'https://openrouter.ai/api/v1'
}));
const useOpenRouter = routerClients.length > 0;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'dummy_key' });
const geminiClients = geminiKeys.map(key => new GoogleGenAI({ apiKey: key }));

// Ưu tiên dùng Gemini nếu có, nếu không thì dùng OpenAI
const useGemini = geminiClients.length > 0;
if (useGemini) {
    console.log(`🤖 Đang sử dụng GEMINI (Miễn phí) cho AI Engine với ${geminiClients.length} API keys...`);
}
if (useOpenRouter) {
    console.log(`🌐 Đã bật OpenRouter (Hỗ trợ model MIỄN PHÍ) với ${routerClients.length} API keys làm dự phòng!`);
}

const action = process.argv[2]; // 'plan' hoặc 'audit'

// 1. NÃO LÊN PLAN (Dùng Claude nếu có key, hoặc tự fallback sang OpenAI)
if (action === 'plan') {
    const auditPath = fs.existsSync('specs/AUDIT_PROJECT.md') ? 'specs/AUDIT_PROJECT.md' : 'specs/AUDITT_PROJECT.md';
    const auditContent = fs.readFileSync(auditPath, 'utf-8');
    console.log('🧠 [NÃO] Đang phân tích Audit và lập PLAN_PROJECT.md...');

    let planText = '';
    if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('sk-ant-...')) {
        // Ưu tiên Claude 3.7 nếu bạn có key
        const res = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 8000,
            system: 'Bạn là Principal Architect. Hãy lập kế hoạch chi tiết từng task (P0, P1, P2) cho dự án vào markdown.',
            messages: [{ role: 'user', content: `Dựa trên bản audit này:\n${auditContent}\nHãy viết file specs/PLAN_PROJECT.md.` }]
        });
        planText = res.content[0].text;
    } else if (useGemini) {
        // Sử dụng Gemini 3.8 Flash miễn phí với cơ chế thử lại (retry) khi bị quá tải 503
        let clientIndex = 0;
        let retries = geminiClients.length * 3;
        while (retries > 0) {
            try {
                const gemini = geminiClients[clientIndex];
                const res = await gemini.models.generateContent({
                    model: 'gemini-3.8-flash',
                    contents: `Bạn là Principal Architect. Dựa trên bản audit này:\n${auditContent}\nHãy lập kế hoạch chi tiết từng task (P0, P1, P2) cho dự án và xuất ra chuẩn markdown cho file specs/PLAN_PROJECT.md.`
                });
                planText = res.text;
                break;
            } catch (error) {
                if ([503, 429, 403, 401, 500].includes(error.status) && retries > 1) {
                    clientIndex = (clientIndex + 1) % geminiClients.length;
                    console.warn(`⏳ Gemini key [${clientIndex}] báo lỗi (${error.status}). Chuyển sang key khác... (Còn ${retries - 1} lần thử)`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    retries--;
                } else if (useOpenRouter) {
                    console.warn(`⚠️ Gemini lỗi toàn bộ! Chuyển sang dùng OpenRouter (Miễn phí)...`);
                    const fallbackRes = await routerClients[0].chat.completions.create({
                        model: 'nvidia/nemotron-3-ultra-550b-a55b:free', // Model miễn phí
                        messages: [{ role: 'user', content: `Bạn là Principal Architect. Dựa trên bản audit này:\n${auditContent}\nHãy lập kế hoạch chi tiết từng task (P0, P1, P2) cho dự án và xuất ra chuẩn markdown cho file specs/PLAN_PROJECT.md.` }]
                    });
                    planText = fallbackRes.choices[0].message.content;
                    break;
                } else if (openai) {
                    console.warn(`⚠️ Gemini lỗi toàn bộ! Chuyển sang dùng OpenAI ChatGPT...`);
                    const fallbackRes = await openai.chat.completions.create({
                        model: 'o3-mini',
                        messages: [{ role: 'user', content: `Bạn là Principal Architect. Dựa trên bản audit này:\n${auditContent}\nHãy lập kế hoạch chi tiết từng task (P0, P1, P2) cho dự án và xuất ra chuẩn markdown cho file specs/PLAN_PROJECT.md.` }]
                    });
                    planText = fallbackRes.choices[0].message.content;
                    break;
                } else {
                    throw error;
                }
            }
        }
    } else if (useOpenRouter) {
        console.log(`🌐 Đang gọi OpenRouter cho PLAN...`);
        let clientIndex = 0;
        let retries = routerClients.length * 3;
        while (retries > 0) {
            try {
                const res = await routerClients[clientIndex].chat.completions.create({
                    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                    messages: [{ role: 'user', content: `Bạn là Principal Architect. Dựa trên bản audit này:\n${auditContent}\nHãy lập kế hoạch chi tiết từng task (P0, P1, P2) cho dự án và xuất ra chuẩn markdown cho file specs/PLAN_PROJECT.md.` }]
                });
                planText = res.choices[0].message.content;
                break;
            } catch (error) {
                if (retries > 1) {
                    clientIndex = (clientIndex + 1) % routerClients.length;
                    console.warn(`⏳ OpenRouter key [${clientIndex}] báo lỗi. Chuyển key khác...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    retries--;
                } else {
                    throw error;
                }
            }
        }
    } else if (openai) {
        // Tự động dùng OpenAI o3-mini / gpt-4o để lập Plan
        const res = await openai.chat.completions.create({
            model: 'o3-mini', // Mô hình reasoning cực mạnh của OpenAI
            messages: [
                { role: 'user', content: `Bạn là Principal Architect. Dựa trên bản audit này:\n${auditContent}\nHãy lập kế hoạch chi tiết từng task (P0, P1, P2) cho dự án và xuất ra chuẩn markdown cho file specs/PLAN_PROJECT.md.` }
            ]
        });
        planText = res.choices[0].message.content;
    } else {
        console.error('❌ LỖI: Cần ít nhất 1 API key hợp lệ!');
        process.exit(1);
    }

    fs.writeFileSync('specs/PLAN_PROJECT.md', planText);
    console.log('✅ [NÃO] Đã xuất specs/PLAN_PROJECT.md thành công!');
}

// 2. KIỂM THỬ KHẮT KHE (OpenAI o3-mini đóng vai trò Lead QA Auditor)
if (action === 'audit') {
    console.log('🔍 [KIỂM THỬ - OpenAI o3-mini] Đang bới lông tìm vết rà soát code...');

    let gitDiff = '';
    try {
        gitDiff = execSync('git diff HEAD~1', { encoding: 'utf-8' });
    } catch {
        gitDiff = execSync('git diff', { encoding: 'utf-8' });
    }

    const planPath = fs.existsSync('specs/PLAN_PROJECT.md') ? 'specs/PLAN_PROJECT.md' : 'specs/AUDIT_PROJECT.md';
    const planContent = fs.readFileSync(planPath, 'utf-8');

    let reviewText = '';
    if (useGemini) {
        // Sử dụng Gemini 3.8 Flash để làm Auditor (Miễn phí) kèm tự động thử lại
        let clientIndex = 0;
        let retries = geminiClients.length * 3;
        while (retries > 0) {
            try {
                const gemini = geminiClients[clientIndex];
                const res = await gemini.models.generateContent({
                    model: 'gemini-3.8-flash',
                    contents: `Bạn là Lead QA Auditor cực kỳ khắt khe và bảo thủ. 
Nhiệm vụ: Đối chiếu Git Diff với Kế hoạch. 
Quy tắc:
- Soi xét ranh giới Server vs Client ('use client' bừa bãi).
- Tìm kiếm hardcoded logic, rò rỉ bảo mật RLS, race condition timer.
- Nếu code làm ẩu, thiếu sót hoặc không tuân thủ kế hoạch: BẮT BUỘC trả về [STATUS: FAILED] kèm chỉ trích chi tiết từng dòng.
- Chỉ khi code thực sự hoàn hảo, sạch sẽ và an toàn mới trả về [STATUS: PASSED].

KẾ HOẠCH ĐẶT RA:\n${planContent}\n\nTHỰC TẾ GIT DIFF VỪA CODE:\n${gitDiff.slice(0, 60000)}`
                });
                reviewText = res.text;
                break;
            } catch (error) {
                if ([503, 429, 403, 401, 500].includes(error.status) && retries > 1) {
                    clientIndex = (clientIndex + 1) % geminiClients.length;
                    console.warn(`⏳ Gemini key [${clientIndex}] báo lỗi (${error.status}). Chuyển sang key khác... (Còn ${retries - 1} lần thử)`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    retries--;
                } else if (useOpenRouter) {
                    console.warn(`⚠️ Gemini lỗi toàn bộ! Chuyển sang dùng OpenRouter (Miễn phí)...`);
                    const fallbackRes = await routerClients[0].chat.completions.create({
                        model: 'nvidia/nemotron-3-ultra-550b-a55b:free', // Model miễn phí
                        messages: [
                            { role: 'system', content: `Bạn là Lead QA Auditor cực kỳ khắt khe và bảo thủ...` },
                            { role: 'user', content: `KẾ HOẠCH ĐẶT RA:\n${planContent}\n\nTHỰC TẾ GIT DIFF VỪA CODE:\n${gitDiff.slice(0, 60000)}` }
                        ]
                    });
                    reviewText = fallbackRes.choices[0].message.content;
                    break;
                } else if (openai) {
                    console.warn(`⚠️ Gemini lỗi toàn bộ! Chuyển sang dùng OpenAI ChatGPT...`);
                    const fallbackRes = await openai.chat.completions.create({
                        model: 'o3-mini',
                        messages: [
                            { role: 'developer', content: `Bạn là Lead QA Auditor cực kỳ khắt khe và bảo thủ...` },
                            { role: 'user', content: `KẾ HOẠCH ĐẶT RA:\n${planContent}\n\nTHỰC TẾ GIT DIFF VỪA CODE:\n${gitDiff.slice(0, 60000)}` }
                        ]
                    });
                    reviewText = fallbackRes.choices[0].message.content;
                    break;
                } else {
                    throw error;
                }
            }
        }
    } else if (useOpenRouter) {
        console.log(`🌐 Đang gọi OpenRouter cho AUDIT...`);
        let clientIndex = 0;
        let retries = routerClients.length * 3;
        while (retries > 0) {
            try {
                const response = await routerClients[clientIndex].chat.completions.create({
                    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                    messages: [
                        { role: 'system', content: `Bạn là Lead QA Auditor cực kỳ khắt khe và bảo thủ.\n- Nếu code làm ẩu: trả về [STATUS: FAILED].\n- Nếu code sạch sẽ: trả về [STATUS: PASSED].` },
                        { role: 'user', content: `KẾ HOẠCH ĐẶT RA:\n${planContent}\n\nTHỰC TẾ GIT DIFF VỪA CODE:\n${gitDiff.slice(0, 60000)}` }
                    ]
                });
                reviewText = response.choices[0].message.content;
                break;
            } catch (error) {
                if (retries > 1) {
                    clientIndex = (clientIndex + 1) % routerClients.length;
                    console.warn(`⏳ OpenRouter key [${clientIndex}] báo lỗi. Chuyển key khác...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    retries--;
                } else {
                    throw error;
                }
            }
        }
    } else if (openai) {
        // Gọi OpenAI o3-mini suy luận sâu để bắt bẻ
        const response = await openai.chat.completions.create({
            model: 'o3-mini', // Nếu tài khoản chưa cấp quyền o3-mini có thể đổi thành 'gpt-4o'
            messages: [
                {
                    role: 'developer',
                    content: `Bạn là Lead QA Auditor cực kỳ khắt khe và bảo thủ. 
Nhiệm vụ: Đối chiếu Git Diff với Kế hoạch. 
Quy tắc:
- Soi xét ranh giới Server vs Client ('use client' bừa bãi).
- Tìm kiếm hardcoded logic, rò rỉ bảo mật RLS, race condition timer.
- Nếu code làm ẩu, thiếu sót hoặc không tuân thủ kế hoạch: BẮT BUỘC trả về [STATUS: FAILED] kèm chỉ trích chi tiết từng dòng.
- Chỉ khi code thực sự hoàn hảo, sạch sẽ và an toàn mới trả về [STATUS: PASSED].`
                },
                {
                    role: 'user',
                    content: `KẾ HOẠCH ĐẶT RA:\n${planContent}\n\nTHỰC TẾ GIT DIFF VỪA CODE:\n${gitDiff.slice(0, 60000)}`
                }
            ]
        });
        reviewText = response.choices[0].message.content;
    } else {
        console.error('❌ LỖI: Cần ít nhất 1 API key hợp lệ!');
        process.exit(1);
    }
    fs.writeFileSync('specs/REVIEW_LOG.md', reviewText);
    console.log('\n📝 BÁO CÁO KIỂM THỬ TỪ AUDITOR:\n', reviewText);

    if (reviewText.includes('[STATUS: FAILED]')) {
        console.error('\n❌ [KIỂM THỬ KHÔNG ĐẠT]: Antigravity Agent cần đọc file specs/REVIEW_LOG.md và sửa lại!');
        process.exit(1);
    } else {
        console.log('\n🎉 [KIỂM THỬ ĐÃ THÔNG QUA]: Code đạt chuẩn bàn giao!');
    }
}