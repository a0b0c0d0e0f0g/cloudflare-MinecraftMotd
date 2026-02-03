export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- 1. Telegram Webhook ---
    if (url.pathname === '/api/telegram' && request.method === 'POST') {
        return handleTelegramWebhook(request, env);
    }

    // --- 2. 管理员 API (登录/配置/设置Webhook) ---
    if (url.pathname === '/api/login' && request.method === 'POST') {
        return handleAuthLogin(request, env);
    }
    if (url.pathname === '/api/config') {
        if (request.method === 'GET') return handleGetConfig(env);
        if (request.method === 'POST') return handleSaveConfig(request, env);
    }
    if (url.pathname === '/api/setWebhook' && request.method === 'POST') {
        return handleSetWebhook(request, env);
    }

    // --- 3. 主业务 (网页 & 图片) ---
    const serverIP = url.searchParams.get("server");
    if (!serverIP) {
      const config = await getConfig(env);
      return new Response(renderHTML(config), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (url.searchParams.get("type") === "info") {
        return handleInfoRequest(serverIP);
    }
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
            if (tgConfig.customCommands && Array.isArray(tgConfig.customCommands)) {
                for (const cmdObj of tgConfig.customCommands) {
                    if (text === cmdObj.cmd) {
                        await sendTelegramMessage(token, chatId, cmdObj.reply, "Markdown");
                        return new Response("OK");
                    }
                }
            }

            // 2. 状态查询
            const statusCmd = tgConfig.statusCmd || "/m";
            let serverIP = "";

            if (text.startsWith(statusCmd + " ")) {
                serverIP = text.substring(statusCmd.length + 1).trim();
            } else if (text === statusCmd) {
                await sendTelegramMessage(token, chatId, "请在指令后加上服务器地址，例如: `" + statusCmd + " mc.hypixel.net`", "Markdown");
                return new Response("OK");
            }

            if (serverIP) {
                // 提示正在查询 (可选，防止超时用户以为挂了)
                // await sendTelegramMessage(token, chatId, "🔍 正在获取状态...", "Markdown");

                const data = await fetchMinecraftStatus(serverIP);
                
                if (!data.online) {
                    await sendTelegramMessage(token, chatId, `🔴 *${serverIP}* 处于离线状态`, "Markdown");
                } else {
                    // 构建原始卡片 URL
                    const workerUrl = new URL(request.url).origin;
                    const cardUrl = `${workerUrl}/?server=${encodeURIComponent(serverIP)}`;
                    
                    // 使用 WordPress 的 mshots 服务将 SVG 网页转换为图片
                    // 添加时间戳 t 防止缓存
                    const screenshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(cardUrl)}?w=600&t=${Date.now()}`;

                    const cleanMotd = (data.motd.clean || "No MOTD").replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
                    const caption = `🟢 *${serverIP}* 在线\n` +
                                    `👥 人数: \`${data.players.online}/${data.players.max}\`\n` +
                                    `ℹ️ 版本: ${data.version.name_clean || "Unknown"}\n` +
                                    `📝 MOTD: ${cleanMotd}`;

                    // 发送图片
                    await sendTelegramPhoto(token, chatId, screenshotUrl, caption);
                }
            }
        }
        return new Response("OK");
    } catch (e) {
        return new Response("Error", { status: 200 });
    }
}

async function sendTelegramMessage(token, chatId, text, parseMode = null) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = { chat_id: chatId, text: text, disable_web_page_preview: false };
    if (parseMode) payload.parse_mode = parseMode;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

// 新增：发送图片函数
async function sendTelegramPhoto(token, chatId, photoUrl, caption) {
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    const payload = {
        chat_id: chatId,
        photo: photoUrl,
        caption: caption,
        parse_mode: 'Markdown'
    };
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

// 一键设置 Webhook
async function handleSetWebhook(request, env) {
    try {
        const body = await request.json();
        if (!await checkAuth(env, body.auth)) return new Response("Auth Failed", { status: 401 });

        const config = await getConfig(env);
        const token = config.telegram?.token;
        if (!token) return new Response(JSON.stringify({ success: false, msg: "请先保存 Bot Token" }), { status: 400 });

        const webhookUrl = `${new URL(request.url).origin}/api/telegram`;
        const tgApi = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
        
        const res = await fetch(tgApi);
        const data = await res.json();
        
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, msg: e.message }), { status: 500 });
    }
}

// ==========================================
//           配置与数据逻辑
// ==========================================
async function getConfig(env) {
    if (!env.MOTD_KV) return {};
    try {
        const configStr = await env.MOTD_KV.get("SITE_CONFIG");
        return configStr ? JSON.parse(configStr) : {};
    } catch (e) { return {}; }
}

async function checkAuth(env, auth) {
    if (!env.MOTD_KV || !auth) return false;
    const dbUser = await env.MOTD_KV.get("ADMIN_USER");
    const dbPass = await env.MOTD_KV.get("ADMIN_PASS");
    return auth.username === dbUser && auth.password === dbPass;
}

async function handleGetConfig(env) {
    return new Response(JSON.stringify(await getConfig(env)), { headers: { "Content-Type": "application/json" } });
}

async function handleSaveConfig(request, env) {
    const body = await request.json();
    if (await checkAuth(env, body.auth)) {
        await env.MOTD_KV.put("SITE_CONFIG", JSON.stringify(body.config));
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: false }), { status: 401 });
}

async function handleAuthLogin(request, env) {
    const body = await request.json();
    if (await checkAuth(env, body)) {
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: false, msg: "账号密码错误" }), { status: 401 });
}

async function fetchMinecraftStatus(serverIP) {
    const apiUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIP)}`;
    const res = await fetch(apiUrl, { cf: { cacheTtl: 60 } });
    return await res.json();
}

async function handleInfoRequest(serverIP) {
    const data = await fetchMinecraftStatus(serverIP);
    return new Response(JSON.stringify({ motd: data.motd?.html || "No MOTD", online: data.online }), 
        { headers: { "Content-Type": "application/json" } });
}

async function handleImageRequest(serverIP, env) {
  const config = await getConfig(env);
  const backgroundImage = config.bgImage || `https://other.api.yilx.cc/api/moe?t=${Date.now()}`;
  
  try {
    const startTime = Date.now();
    const data = await fetchMinecraftStatus(serverIP);
    const ping = Date.now() - startTime;
    const timeStr = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()).replace(/\//g, '-'); 

    const isOnline = data.online;
    const motdHtml = isOnline ? (data.motd?.html || "<div>A Minecraft Server</div>") : "<div>Server Offline</div>";
    
    let playerHtml = isOnline && data.players.list?.length > 0 
        ? data.players.list.map(p => `<div style="height:22px; color:#ffffff;">${p.name_html || p.name_clean}</div>`).join("")
        : '<div style="color:#ffffff; opacity:0.5">No players online</div>';
    
    const playerCount = (isOnline && data.players.list) ? data.players.list.length : 1;
    const playerAreaHeight = Math.max(playerCount * 24, 30);
    const cardHeight = 320 + playerAreaHeight;
    const cardWidth = 600;
    
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";
    const statusColor = isOnline ? '#a6e3a1' : '#f38ba8';

    const svg = `<svg width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .shadow { text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }
          .motd-container { display: block; white-space: pre-wrap; word-wrap: break-word; overflow: hidden; text-shadow: 1px 1px 2px rgba(0,0,0,1); font-family: -apple-system, Arial, sans-serif; line-height: 1.4; max-height: 85px; color: #ffffff; font-size: 16px; }
          .motd-container span { display: inline; }
          .player-container div { display: block; font-family: -apple-system, Arial; text-shadow: 1px 1px 2px rgba(0,0,0,1); }
        </style>
        <clipPath id="iphone-mask"><rect width="64" height="64" rx="22.5" /></clipPath>
        <clipPath id="card-mask"><rect width="${cardWidth}" height="${cardHeight}" rx="45" /></clipPath>
      </defs>
      <g clip-path="url(#card-mask)">
        <image href="${backgroundImage}" width="${cardWidth}" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="${cardWidth}" height="${cardHeight}" fill="#11111b" fill-opacity="0.75" />
      </g>
      <g transform="translate(35, 35)"><image href="${icon}" width="64" height="64" clip-path="url(#iphone-mask)" /></g>
      <text x="115" y="60" font-family="Arial" font-size="22" fill="#ffffff" font-weight="bold" class="shadow">${serverIP}</text>
      <text x="115" y="85" font-family="Arial" font-size="13" fill="#9399b2" class="shadow">${isOnline ? (data.version?.name_clean || "Java Edition") : "N/A"}</text>
      <rect x="465" y="40" width="105" height="28" rx="14" fill="#000000" fill-opacity="0.5"/>
      <text x="517" y="58" font-family="Arial" font-size="12" font-weight="bold" fill="${statusColor}" text-anchor="middle" class="shadow">${isOnline ? data.players.online + ' / ' + data.players.max : 'OFFLINE'}</text>
      <foreignObject x="35" y="115" width="530" height="85"><div xmlns="http://www.w3.org/1999/xhtml" class="motd-container">${motdHtml}</div></foreignObject>
      <text x="35" y="230" font-family="Arial" font-size="11" fill="#94e2d5" font-weight="bold" style="letter-spacing:1.5px" class="shadow">ONLINE PLAYERS</text>
      <foreignObject x="35" y="240" width="530" height="${playerAreaHeight}"><div xmlns="http://www.w3.org/1999/xhtml" class="player-container" style="font-size:14px; line-height:1.6;">${playerHtml}</div></foreignObject>
      <text x="35" y="${cardHeight - 45}" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.6)" class="shadow">Ping: ${ping}ms</text>
      <text x="${cardWidth - 35}" y="${cardHeight - 45}" text-anchor="end" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.6)" class="shadow">${timeStr}</text>
    </svg>`;
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" } });
  } catch (e) { return new Response("Error", { status: 500 }); }
}

function renderHTML(config) {
    const bgImage = config.bgImage || 'https://other.api.yilx.cc/api/moe';
    const pageTitle = config.title || '服务器状态';
    const tgConfig = config.telegram || { customCommands: [] };

    return `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MC 状态卡片</title>
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:-apple-system,sans-serif; background:url('${bgImage}') no-repeat center center fixed; background-size:cover; }
        body::before { content:''; position:fixed; inset:0; background:rgba(0,0,0,0.3); z-index:-1; }
        .box { background:rgba(255,255,255,0.15); backdrop-filter:blur(30px) saturate(180%); padding:45px 35px; border-radius:50px; width:calc(100% - 40px); max-width:460px; text-align:center; box-shadow:0 25px 50px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.2); color:white; position:relative; }
        .settings-btn { position:absolute; top:25px; right:25px; width:36px; height:36px; background:rgba(255,255,255,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; }
        .settings-btn:hover { background:rgba(255,255,255,0.4); transform: rotate(90deg); }
        .logo { width:85px; height:85px; margin-bottom:25px; border-radius:35px; box-shadow:0 12px 24px rgba(0,0,0,0.3); }
        h2 { margin:0; font-size:26px; font-weight:800; } p.desc { color:rgba(255,255,255,0.7); font-size:15px; margin:12px 0 35px; }
        textarea, input.modal-input { width:100%; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.3); color:white; box-sizing:border-box; outline:none; font-family:inherit; }
        textarea { min-height:54px; padding:18px 25px; margin-bottom:18px; border-radius:50px; font-size:17px; background:rgba(0,0,0,0.25); }
        button { background:white; color:black; border:none; height:54px; border-radius:50px; font-weight:700; width:100%; font-size:17px; cursor:pointer; }
        .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); align-items:center; justify-content:center; z-index:100; }
        .modal-content { background:rgba(30,30,35,0.95); padding:25px; border-radius:40px; width:90%; max-width:350px; text-align:left; color:white; max-height:85vh; overflow-y:auto; }
        .modal-title { font-size:20px; font-weight:bold; margin-bottom:20px; text-align:center; }
        .modal-label { display:block; font-size:13px; margin:10px 5px 5px; opacity:0.7; }
        .modal-input { padding:12px 15px; margin-bottom:5px; }
        .modal-btn { border-radius:20px; margin-top:15px; font-size:16px; height:45px; }
        .tabs { display:flex; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.1); }
        .tab { flex:1; text-align:center; padding:10px; cursor:pointer; opacity:0.6; }
        .tab.active { opacity:1; border-bottom:2px solid white; font-weight:bold; }
        .cmd-row { display:flex; gap:5px; margin-bottom:8px; }
        .del-btn { background:#ff4444; color:white; width:40px; border-radius:15px; font-size:12px; height:auto; }
        .add-btn { background:rgba(255,255,255,0.2); color:white; height:35px; font-size:14px; margin-top:5px; }
    </style>
</head>
<body>
    <div class="box">
        <div class="settings-btn" onclick="openSettings()">⚙️</div>
        <img src="https://ib.a0b.de5.net/file/1770001024571_2307052_Mvie09JU.png" class="logo">
        <h2 id="page-title">${pageTitle}</h2>
        <p class="desc">输入Minecraft服务器地址，一键获取</p>
        <textarea id="ip" placeholder="play.hypixel.net" rows="1" oninput="this.style.height='';this.style.height=this.scrollHeight+'px'"></textarea>
        <button onclick="gen()">生成预览卡片</button>
        <div id="res" style="margin-top:40px;"></div>
        <div id="full-motd-box" style="margin-top:25px;padding:22px;background:rgba(0,0,0,0.45);border-radius:50px;text-align:left;display:none;font-size:14px;white-space:pre-wrap;line-height:1.7;">
            <div style="color:#fab387;font-size:12px;font-weight:900;margin-bottom:12px;">完整 MOTD</div><div id="full-motd-content"></div>
        </div>
        <div class="footer" style="margin-top:35px;font-size:13px;opacity:0.4;">© 2026 MC Status Card</div>
    </div>

    <div id="loginModal" class="modal"><div class="modal-content" style="text-align:center">
        <div class="modal-title">管理员登录</div>
        <input id="u" class="modal-input" placeholder="账号"><input id="p" type="password" class="modal-input" placeholder="密码">
        <button class="modal-btn" onclick="doLogin()">登 录</button>
        <div style="margin-top:15px;font-size:13px;color:#aaa;cursor:pointer" onclick="closeM('loginModal')">取消</div>
    </div></div>

    <div id="configModal" class="modal"><div class="modal-content">
        <div class="modal-title">服务器设置</div>
        <div class="tabs">
            <div class="tab active" onclick="switchTab('base')">基本设置</div>
            <div class="tab" onclick="switchTab('tg')">Telegram</div>
        </div>

        <div id="tab-base">
            <label class="modal-label">网页标题</label>
            <input id="cfg-title" class="modal-input" value="${pageTitle}">
            <label class="modal-label">背景图片 URL</label>
            <input id="cfg-bg" class="modal-input" value="${bgImage}">
        </div>

        <div id="tab-tg" style="display:none">
            <label class="modal-label">Bot Token (必填)</label>
            <input id="tg-token" class="modal-input" type="password" placeholder="12345:AbCdEf..." value="${tgConfig.token || ''}">
            
            <label class="modal-label">状态查询指令 (默认 /m)</label>
            <input id="tg-status-cmd" class="modal-input" value="${tgConfig.statusCmd || '/m'}">

            <label class="modal-label">自定义回复 (指令 | 回复内容)</label>
            <div id="cmd-list"></div>
            <button class="add-btn" onclick="addCmdRow()">+ 添加新指令</button>
            
            <button class="modal-btn" style="background:#50a2ff;color:white;margin-top:20px" onclick="setWebhook()">🔗 一键绑定 Webhook</button>
        </div>

        <button class="modal-btn" onclick="saveConfig()">保存全部设置</button>
        <div style="margin-top:15px;text-align:center;font-size:13px;color:#aaa;cursor:pointer" onclick="closeM('configModal')">关闭</div>
    </div></div>

    <script>
        let customCmds = ${JSON.stringify(tgConfig.customCommands || [])};
        
        function openSettings() {
            if(localStorage.getItem('admin_user')) {
                renderCmds();
                document.getElementById('configModal').style.display='flex';
            } else document.getElementById('loginModal').style.display='flex';
        }
        function closeM(id) { document.getElementById(id).style.display='none'; }
        
        function switchTab(t) {
            document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));
            document.querySelector('.tab:nth-child('+(t=='base'?1:2)+')').classList.add('active');
            document.getElementById('tab-base').style.display = t=='base'?'block':'none';
            document.getElementById('tab-tg').style.display = t=='tg'?'block':'none';
        }

        function renderCmds() {
            const list = document.getElementById('cmd-list');
            list.innerHTML = '';
            customCmds.forEach((item, i) => {
                list.innerHTML += \`<div class="cmd-row">
                    <input class="modal-input" style="width:30%" value="\${item.cmd}" onchange="updateCmd(\${i}, 'cmd', this.value)" placeholder="/start">
                    <input class="modal-input" style="width:55%" value="\${item.reply}" onchange="updateCmd(\${i}, 'reply', this.value)" placeholder="回复内容">
                    <button class="del-btn" onclick="delCmd(\${i})">删</button>
                </div>\`;
            });
        }
        window.addCmdRow = () => { customCmds.push({cmd:'', reply:''}); renderCmds(); };
        window.delCmd = (i) => { customCmds.splice(i, 1); renderCmds(); };
        window.updateCmd = (i, k, v) => { customCmds[i][k] = v; };

        async function doLogin() {
            const u=document.getElementById('u').value, p=document.getElementById('p').value;
            const res = await fetch('/api/login', {method:'POST', body:JSON.stringify({username:u, password:p})});
            if((await res.json()).success) {
                localStorage.setItem('admin_user',u); localStorage.setItem('admin_pass',p);
                closeM('loginModal'); renderCmds(); document.getElementById('configModal').style.display='flex';
            } else alert('失败');
        }

        async function saveConfig() {
            const body = {
                auth: {username:localStorage.getItem('admin_user'), password:localStorage.getItem('admin_pass')},
                config: {
                    title: document.getElementById('cfg-title').value,
                    bgImage: document.getElementById('cfg-bg').value,
                    telegram: {
                        token: document.getElementById('tg-token').value,
                        statusCmd: document.getElementById('tg-status-cmd').value,
                        customCommands: customCmds
                    }
                }
            };
            const res = await fetch('/api/config', {method:'POST', body:JSON.stringify(body)});
            if((await res.json()).success) { alert('保存成功'); location.reload(); } else alert('失败');
        }

        async function setWebhook() {
            const res = await fetch('/api/setWebhook', {
                method:'POST', 
                body:JSON.stringify({auth:{username:localStorage.getItem('admin_user'), password:localStorage.getItem('admin_pass')}})
            });
            const d = await res.json();
            alert(d.ok ? '✅ Webhook 绑定成功！\nBot 现在可以工作了。' : '❌ 绑定失败: ' + d.description);
        }

        async function gen() {
            const ip = document.getElementById('ip').value; if(!ip)return;
            const res = document.getElementById('res'); res.innerHTML='Loading...';
            const img = new Image(); img.className='card-img'; img.src=location.origin+'?server='+encodeURIComponent(ip);
            img.onload=()=>{res.innerHTML='';res.appendChild(img)};
            const info = await (await fetch(location.origin+'?type=info&server='+encodeURIComponent(ip))).json();
            if(info.online) {
                document.getElementById('full-motd-box').style.display='block';
                document.getElementById('full-motd-content').innerText = info.motd;
            }
        }
    </script>
</body>
</html>`;
}