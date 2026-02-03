export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Telegram Webhook
    if (url.pathname === '/api/telegram' && request.method === 'POST') {
        return handleTelegramWebhook(request, env);
    }

    // 2. API 路由
    if (url.pathname === '/api/login' && request.method === 'POST') return handleAuthLogin(request, env);
    if (url.pathname === '/api/config') {
        if (request.method === 'GET') return handleGetConfig(env);
        if (request.method === 'POST') return handleSaveConfig(request, env);
    }
    if (url.pathname === '/api/setWebhook' && request.method === 'POST') return handleSetWebhook(request, env);

    // 3. 页面与图片逻辑
    const serverIP = url.searchParams.get("server");
    if (!serverIP) {
      const config = await getConfig(env);
      return new Response(renderHTML(config), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    
    const type = url.searchParams.get("type");
    if (type === "info") return handleInfoRequest(serverIP);
    if (type === "card") return handleHtmlCardRequest(serverIP, env); 
    return handleImageRequest(serverIP, env); 
  }
};

// ==========================================
//           Telegram 核心逻辑
// ==========================================
async function handleTelegramWebhook(request, env) {
    const config = await getConfig(env);
    const tgConfig = config.telegram || {};
    const token = tgConfig.token || env.TELEGRAM_TOKEN;
    if (!token) return new Response("Token not set", { status: 500 });

    try {
        const update = await request.json();
        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.trim();
            
            // 1. 自定义回复
            if (tgConfig.customCommands) {
                for (const cmdObj of tgConfig.customCommands) {
                    if (text === cmdObj.cmd) {
                        await sendTelegramMessage(token, chatId, cmdObj.reply, "MarkdownV2");
                        return new Response("OK");
                    }
                }
            }

            // 2. 状态查询
            const statusCmd = tgConfig.statusCmd || "/motd";
            let serverIP = "";
            if (text.startsWith(statusCmd + " ")) serverIP = text.substring(statusCmd.length + 1).trim();
            else if (text === statusCmd) {
                const escapedCmd = statusCmd.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
                await sendTelegramMessage(token, chatId, `请使用: \`${escapedCmd} <IP>\``, "MarkdownV2");
                return new Response("OK");
            }

            if (serverIP) {
                let data;
                try {
                    data = await fetchMinecraftStatus(serverIP);
                } catch (e) {
                    await sendTelegramMessage(token, chatId, `❌ API 请求失败: ${e.message}`, null);
                    return new Response("OK");
                }

                const esc = (str) => (str || "Unknown").toString().replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');

                if (!data.online) {
                    await sendTelegramMessage(token, chatId, `🔴 *${esc(serverIP)}* 离线`, "MarkdownV2");
                } else {
                    const cleanMotd = (data.motd.clean || "").replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
                    
                    let playerNamesStr = "无";
                    if (data.players.list && data.players.list.length > 0) {
                        playerNamesStr = data.players.list.map(p => esc(p.name_clean)).join(", ");
                    }

                    const textCaption = `🟢 *${esc(serverIP)}* 在线\n` +
                                        `👥 人数: \`${esc(data.players.online)}/${esc(data.players.max)}\`\n` +
                                        `ℹ️ 版本: ${esc(data.version.name_clean)}\n` +
                                        `📃 玩家: ${playerNamesStr}\n` + 
                                        `📝 MOTD:\n${cleanMotd}`;

                    try {
                        const workerUrl = new URL(request.url).origin;
                        const cardUrl = `${workerUrl}/?type=card&server=${encodeURIComponent(serverIP)}`;
                        const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(cardUrl)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=460&viewport.height=600&viewport.deviceScaleFactor=2&t=${Date.now()}`;
                        
                        await sendTelegramPhoto(token, chatId, screenshotUrl, textCaption);
                    } catch (imgError) {
                        const errStr = (imgError.message || "Unknown").replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
                        const errorMsg = `⚠️ _发图失败 \\(${errStr}\\)，显示文本:_\n\n${textCaption}`;
                        await sendTelegramMessage(token, chatId, errorMsg, "MarkdownV2");
                    }
                }
            }
        }
        return new Response("OK");
    } catch (e) {
        return new Response("Error", { status: 200 });
    }
}

async function sendTelegramMessage(token, chatId, text, parseMode) {
    const payload = { chat_id: chatId, text: text };
    if (parseMode) payload.parse_mode = parseMode;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

async function sendTelegramPhoto(token, chatId, photo, caption) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: photo, caption: caption, parse_mode: 'MarkdownV2' })
    });
    const d = await res.json();
    if (!d.ok) throw new Error(d.description || "TG API Error");
}

// ==========================================
//           核心逻辑：生成 SVG 字符串
// ==========================================
async function generateSvgString(serverIP, env) {
    const conf = await getConfig(env);
    const bg = conf.bgImage || `https://other.api.yilx.cc/api/moe?t=${Date.now()}`;
    
    const t0 = Date.now();
    const d = await fetchMinecraftStatus(serverIP);
    const ping = Date.now() - t0;
    const time = new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date()).replace(/\//g,'-');

    const isOnline = d.online;
    const motd = isOnline ? (d.motd?.html || "<div>A Minecraft Server</div>") : "<div>Server Offline</div>";
    
    const players = (isOnline && d.players.list) ? d.players.list : [];
    const pListHtml = players.length > 0 
        ? players.map(p => `<div style="height:20px;color:#fff">${p.name_html || p.name_clean}</div>`).join("") 
        : '<div style="color:#fff;opacity:0.5">No players online</div>';
    
    const cardWidth = 460;
    const paddingLeft = 115; 
    const rightAnchor = 425; 

    // --- 动态排版 ---
    let statsSvg = "";
    let statsY = 48; 

    const statusText = isOnline ? `${d.players.online}/${d.players.max}` : "OFFLINE";
    const badgeWidth = Math.max(70, statusText.length * 9 + 24);
    const badgeHeight = 26;
    const badgeX = rightAnchor - badgeWidth;
    
    statsSvg += `
        <rect x="${badgeX}" y="${statsY - 18}" width="${badgeWidth}" height="${badgeHeight}" rx="13" fill="#000" fill-opacity="0.5"/>
        <text x="${badgeX + badgeWidth/2}" y="${statsY}" font-family="Arial" font-size="12" font-weight="bold" fill="${isOnline?'#a6e3a1':'#f38ba8'}" text-anchor="middle" class="sh">${statusText}</text>
    `;
    statsY += 24; 
    statsSvg += `<text x="${rightAnchor}" y="${statsY}" font-family="Arial" font-size="12" fill="#ffffffaa" text-anchor="end" class="sh">${ping}ms</text>`;
    statsY += 18; 
    const versionStr = isOnline ? (d.version?.name_clean || "Java") : "N/A";
    statsSvg += `<text x="${rightAnchor}" y="${statsY}" font-family="Arial" font-size="12" fill="#9399b2" text-anchor="end" class="sh">${versionStr}</text>`;

    const maxIpWidthPixels = badgeX - paddingLeft - 10;
    const maxIpChar = Math.floor(maxIpWidthPixels / 11); 
    
    let ipLines = [];
    if (serverIP.length > maxIpChar && maxIpChar > 5) { 
        ipLines.push(serverIP.substring(0, maxIpChar));
        ipLines.push(serverIP.substring(maxIpChar));
    } else {
        ipLines.push(serverIP);
    }

    let ipY = 60;
    let ipSvg = "";
    ipLines.forEach(line => {
        ipSvg += `<text x="${paddingLeft}" y="${ipY}" font-family="Arial" font-size="20" fill="#fff" font-weight="bold" class="sh">${line}</text>`;
        ipY += 25; 
    });

    const headerHeight = Math.max(statsY + 10, ipY + 10, 115);
    const playerAreaHeight = Math.max((players.length||1)*22, 30);
    const h = headerHeight + 85 + 35 + playerAreaHeight + 45;

    const icon = (isOnline && d.icon) ? d.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+973v";

    return `<svg width="${cardWidth}" height="${h}" viewBox="0 0 ${cardWidth} ${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <style>
                .sh{text-shadow:1px 1px 2px rgba(0,0,0,0.8)}
                .mc{display:block;white-space:pre-wrap;word-wrap:break-word;overflow:hidden;text-shadow:1px 1px 2px #000;font-family:sans-serif;line-height:1.4;max-height:85px;color:#fff;font-size:14px}
                .mc span{display:inline}
                .pc div{display:block;font-family:sans-serif;text-shadow:1px 1px 2px #000;font-size:12px}
            </style>
            <clipPath id="im"><rect width="64" height="64" rx="22.5"/></clipPath>
            <clipPath id="cm"><rect width="${cardWidth}" height="${h}" rx="50"/></clipPath>
        </defs>
        <g clip-path="url(#cm)"><image href="${bg}" width="${cardWidth}" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect width="${cardWidth}" height="${h}" fill="#111c" fill-opacity="0.75"/></g>
        <g transform="translate(35,35)"><image href="${icon}" width="64" height="64" clip-path="url(#im)"/></g>
        
        ${ipSvg}
        ${statsSvg}

        <foreignObject x="35" y="${headerHeight}" width="390" height="85"><div xmlns="http://www.w3.org/1999/xhtml" class="mc">${motd}</div></foreignObject>
        
        <text x="35" y="${headerHeight + 95}" font-family="Arial" font-size="11" fill="#94e2d5" font-weight="bold" style="letter-spacing:1.5px" class="sh">ONLINE PLAYERS</text>
        <foreignObject x="35" y="${headerHeight + 105}" width="390" height="${playerAreaHeight}"><div xmlns="http://www.w3.org/1999/xhtml" class="pc" style="font-size:12px;line-height:1.6">${pListHtml}</div></foreignObject>
        
        <text x="${cardWidth-35}" y="${h-60}" text-anchor="end" font-family="Arial" font-size="10" fill="#ffffffaa" class="sh">motd.a0b.de5.net</text>
        <text x="${cardWidth-35}" y="${h-45}" text-anchor="end" font-family="Arial" font-size="11" fill="#ffffffaa" class="sh">${time}</text>
    </svg>`;
}

async function handleImageRequest(ip, env) {
    try {
        const svg = await generateSvgString(ip, env);
        return new Response(svg, {headers:{'Content-Type':'image/svg+xml','Cache-Control':'no-cache'}});
    } catch(e) { return new Response("Error", {status:500}); }
}

async function handleHtmlCardRequest(ip, env) {
    try {
        const svg = await generateSvgString(ip, env);
        const html = `<!DOCTYPE html><html style="margin:0;padding:0;overflow:hidden;background:transparent"><head><meta name="viewport" content="width=460"></head><body style="margin:0;padding:0;overflow:hidden;background:transparent">${svg}</body></html>`;
        return new Response(html, {headers:{'Content-Type':'text/html;charset=UTF-8'}});
    } catch(e) { return new Response("Error", {status:500}); }
}

// ==========================================
//           通用配置与逻辑
// ==========================================
async function getConfig(env) {
    if (!env.MOTD_KV) return {};
    try { const v = await env.MOTD_KV.get("SITE_CONFIG"); return v ? JSON.parse(v) : {}; } catch(e){return{}}
}
async function checkAuth(env, auth) {
    if (!env.MOTD_KV || !auth) return false;
    const u = await env.MOTD_KV.get("ADMIN_USER");
    const p = await env.MOTD_KV.get("ADMIN_PASS");
    return auth.username === u && auth.password === p;
}
async function fetchMinecraftStatus(ip) {
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(ip)}`, {cf:{cacheTtl:60}});
    return await res.json();
}
async function handleInfoRequest(ip) {
    const d = await fetchMinecraftStatus(ip);
    return new Response(JSON.stringify({motd:d.motd?.html||"", online:d.online}), {headers:{'Content-Type':'application/json'}});
}
async function handleGetConfig(env) {
    return new Response(JSON.stringify(await getConfig(env)), {headers:{'Content-Type':'application/json'}});
}
async function handleSaveConfig(req, env) {
    const body = await req.json();
    if(await checkAuth(env, body.auth)){
        await env.MOTD_KV.put("SITE_CONFIG", JSON.stringify(body.config));
        return new Response('{"success":true}', {headers:{'Content-Type':'application/json'}});
    } return new Response('{"success":false}', {status:401});
}
async function handleSetWebhook(req, env) {
    const body = await req.json();
    if(!await checkAuth(env, body.auth)) return new Response("Auth Fail", {status:401});
    const conf = await getConfig(env);
    if(!conf.telegram?.token) return new Response('{"ok":false,"description":"No Token"}');
    const url = new URL(req.url).origin + '/api/telegram';
    const res = await fetch(`https://api.telegram.org/bot${conf.telegram.token}/setWebhook?url=${encodeURIComponent(url)}`);
    return new Response(JSON.stringify(await res.json()), {headers:{'Content-Type':'application/json'}});
}
async function handleAuthLogin(req, env) {
    const body = await req.json();
    if(await checkAuth(env, body)) return new Response('{"success":true}', {headers:{'Content-Type':'application/json'}});
    return new Response('{"success":false}', {status:401});
}

// --- 主页 HTML (iOS 药丸风格 + 鼠标光效) ---
function renderHTML(config) {
    const bg = config.bgImage || 'https://other.api.yilx.cc/api/moe';
    const title = config.title || '服务器状态';
    const tgConfigSafe = JSON.stringify(config.telegram || {customCommands:[]}).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;background:url('${bg}') no-repeat center center fixed;background-size:cover}
body::before{content:'';position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:-1}
.box{background:rgba(255,255,255,0.15);backdrop-filter:blur(30px);padding:45px 35px;border-radius:50px;width:calc(100% - 40px);max-width:460px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.2);color:#fff;position:relative;overflow:hidden}
.set-btn{position:absolute;top:25px;right:25px;width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;z-index:10}
.logo{width:85px;height:85px;margin-bottom:25px;border-radius:35px;box-shadow:0 12px 24px rgba(0,0,0,0.3)}
h2{margin:0;font-size:26px;font-weight:800}p.d{color:#ffffffb3;font-size:15px;margin:12px 0 35px}

/* iOS 药丸风格 + 光效基础 */
.input-group, button {
    position: relative;
    border-radius: 99em; /* 药丸 */
    overflow: hidden;
    transition: transform 0.1s;
}
textarea {
    width:100%; min-height:54px; padding:18px 25px; 
    border-radius:30px; /* 输入框稍微方一点点方便多行 */
    font-size:17px; 
    background:rgba(0,0,0,0.25); 
    border:1px solid rgba(255,255,255,0.1); 
    color:#fff; 
    scrollbar-width:none; -ms-overflow-style:none;
    outline: none;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    backdrop-filter: blur(10px);
}
textarea::-webkit-scrollbar{display:none}

button {
    background: #fff; color: #000; border: none; 
    height: 54px; width: 100%; 
    font-weight: 700; font-size: 17px; cursor: pointer;
    margin-top: 15px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
button:active { transform: scale(0.96); box-shadow: 0 2px 10px rgba(255,255,255,0.3); }

/* 鼠标跟随光效 CSS */
.spotlight {
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(120px circle at var(--x) var(--y), rgba(255,255,255,0.15), transparent 40%);
    opacity: 0; transition: opacity 0.3s;
}
.box:hover .spotlight { opacity: 1; }

.modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:#00000099;backdrop-filter:blur(8px);align-items:center;justify-content:center;z-index:100}
.m-box{background:#1e1e23f2;padding:25px;border-radius:40px;width:90%;max-width:350px;text-align:left;color:#fff;max-height:85vh;overflow-y:auto;border:1px solid #ffffff1a}
.m-t{font-size:20px;font-weight:bold;margin-bottom:20px;text-align:center}
.m-l{display:block;font-size:13px;margin:10px 5px 5px;opacity:0.7}
.m-i{width:100%;padding:12px 15px;margin-bottom:5px;background:#0000004d;border:1px solid #ffffff1a;color:#fff;border-radius:15px}
.tab-box{display:flex;margin-bottom:15px;border-bottom:1px solid #ffffff1a}
.tab{flex:1;text-align:center;padding:10px;cursor:pointer;opacity:0.6}
.tab.active{opacity:1;border-bottom:2px solid #fff;font-weight:bold}
.cmd{display:flex;gap:5px;margin-bottom:8px}
.del{background:#f44;color:#fff;width:40px;height:auto;font-size:12px;border-radius:10px;border:none}
.card-img{width:100%;border-radius:50px;box-shadow:0 20px 40px rgba(0,0,0,0.5)}
</style>
</head>
<body>
<div class="box" id="card-box">
    <div class="spotlight"></div>
    <div class="set-btn" onclick="openSet()">⚙️</div>
    <img src="https://ib.a0b.de5.net/file/1770001024571_2307052_Mvie09JU.png" class="logo">
    <h2>${title}</h2><p class="d">输入Minecraft服务器地址，一键获取</p>
    <div class="input-group">
        <textarea id="ip" placeholder="play.hypixel.net" rows="1" oninput="this.style.height='';this.style.height=this.scrollHeight+'px'"></textarea>
    </div>
    <button onclick="gen()">生成预览卡片</button>
    <div id="res" style="margin-top:40px"></div>
    <div id="full-box" style="margin-top:25px;padding:22px;background:#00000073;border-radius:50px;text-align:left;display:none;font-size:14px;line-height:1.7"><div style="color:#fab387;font-size:12px;font-weight:900;margin-bottom:12px">完整 MOTD</div><div id="full-con" style="white-space:pre-wrap"></div></div>
    <div style="margin-top:35px;font-size:13px;opacity:0.4">© 2026 MC Status Card</div>
</div>

<div id="loginM" class="modal"><div class="m-box" style="text-align:center">
    <div class="m-t">管理员登录</div>
    <input id="u" class="m-i" placeholder="账号"><input id="p" type="password" class="m-i" placeholder="密码">
    <button onclick="login()" style="margin-top:15px;height:45px">登录</button>
    <div style="margin-top:15px;font-size:13px;color:#aaa;cursor:pointer" onclick="closeM('loginM')">取消</div>
</div></div>

<div id="confM" class="modal"><div class="m-box">
    <div class="m-t">设置</div>
    <div class="tab-box"><div class="tab active" onclick="sw(1)">基本</div><div class="tab" onclick="sw(2)">Telegram</div></div>
    <div id="t1"><label class="m-l">网页标题</label><input id="c-ti" class="m-i" value="${title}"><label class="m-l">背景图片 URL</label><input id="c-bg" class="m-i" value="${bg}"></div>
    <div id="t2" style="display:none"><label class="m-l">Bot Token</label><input id="tg-tk" class="m-i" type="password"><label class="m-l">查询指令 (/m)</label><input id="tg-cmd" class="m-i"><label class="m-l">自定义回复</label><div id="clist"></div><button onclick="addC()" style="background:#ffffff33;color:#fff;height:35px;font-size:14px;margin-top:5px">+ 添加</button><button onclick="hook()" style="background:#50a2ff;color:#fff;margin-top:20px;height:45px">🔗 绑定 Webhook</button></div>
    <button onclick="save()" style="margin-top:20px;height:45px">保存</button>
    <div style="margin-top:15px;text-align:center;font-size:13px;color:#aaa;cursor:pointer" onclick="closeM('confM')">关闭</div>
</div></div>

<script>
let tg = ${tgConfigSafe};
// 光效追踪逻辑
document.getElementById('card-box').addEventListener('mousemove', e => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--x', (e.clientX - rect.left) + 'px');
    e.currentTarget.style.setProperty('--y', (e.clientY - rect.top) + 'px');
});

function openSet(){localStorage.getItem('au')?showConf():document.getElementById('loginM').style.display='flex'}
function closeM(i){document.getElementById(i).style.display='none'}
function showConf(){
    document.getElementById('loginM').style.display='none';
    document.getElementById('confM').style.display='flex';
    document.getElementById('tg-tk').value = tg.token||'';
    document.getElementById('tg-cmd').value = tg.statusCmd||'/motd';
    renderC();
}
function sw(n){
    document.querySelectorAll('.tab').forEach((e,i)=>e.classList.toggle('active',i===n-1));
    document.getElementById('t1').style.display=n===1?'block':'none';
    document.getElementById('t2').style.display=n===2?'block':'none';
}
function renderC(){
    const l = document.getElementById('clist'); l.innerHTML='';
    (tg.customCommands||[]).forEach((c,i)=>{
        l.innerHTML += \`<div class="cmd"><input class="m-i" style="width:35%" value="\${c.cmd}" oninput="tg.customCommands[\${i}].cmd=this.value"><input class="m-i" style="width:50%" value="\${c.reply}" oninput="tg.customCommands[\${i}].reply=this.value"><button class="del" onclick="tg.customCommands.splice(\${i},1);renderC()">X</button></div>\`;
    });
}
function addC(){ if(!tg.customCommands)tg.customCommands=[]; tg.customCommands.push({cmd:'',reply:''}); renderC(); }
async function login(){
    const u=document.getElementById('u').value, p=document.getElementById('p').value;
    const r=await fetch('/api/login',{method:'POST',body:JSON.stringify({username:u,password:p})});
    if((await r.json()).success){localStorage.setItem('au',u);localStorage.setItem('ap',p);showConf();}else alert('失败');
}
async function save(){
    const b={auth:{username:localStorage.getItem('au'),password:localStorage.getItem('ap')},config:{title:document.getElementById('c-ti').value,bgImage:document.getElementById('c-bg').value,telegram:{token:document.getElementById('tg-tk').value,statusCmd:document.getElementById('tg-cmd').value,customCommands:tg.customCommands}}};
    if((await(await fetch('/api/config',{method:'POST',body:JSON.stringify(b)})).json()).success){alert('保存成功');location.reload()}else alert('失败');
}
async function hook(){
    const r=await fetch('/api/setWebhook',{method:'POST',body:JSON.stringify({auth:{username:localStorage.getItem('au'),password:localStorage.getItem('ap')}})});
    const d=await r.json(); alert(d.ok?'绑定成功':'失败: '+d.description);
}
async function gen(){
    const ip=document.getElementById('ip').value;if(!ip)return;
    const r=document.getElementById('res');r.innerHTML='Loading...';
    const i=new Image();i.className='card-img';i.src=location.origin+'?server='+encodeURIComponent(ip);
    i.onload=()=>{r.innerHTML='';r.appendChild(i)};
    const d=await(await fetch(location.origin+'?type=info&server='+encodeURIComponent(ip))).json();
    if(d.online){
        document.getElementById('full-box').style.display='block';
        document.getElementById('full-con').innerHTML=d.motd;
    }
}
</script>
</body></html>`;
}