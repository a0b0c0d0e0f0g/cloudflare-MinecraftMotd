export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- API: 管理员登录校验 ---
    if (url.pathname === '/api/login' && request.method === 'POST') {
        return handleAuthLogin(request, env);
    }

    // --- API: 获取/保存配置 ---
    if (url.pathname === '/api/config') {
        if (request.method === 'GET') {
            return handleGetConfig(env);
        } else if (request.method === 'POST') {
            return handleSaveConfig(request, env);
        }
    }

    // --- 主业务逻辑 ---
    const serverIP = url.searchParams.get("server");
    
    // 如果没有 server 参数，返回网页
    if (!serverIP) {
      // 在返回网页前，先读取一下配置，注入到 HTML 中，避免页面闪烁
      const config = await getConfig(env);
      return new Response(renderHTML(config), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // API 模式
    if (url.searchParams.get("type") === "info") {
        return handleInfoRequest(serverIP);
    }
    
    // 图片模式
    return handleImageRequest(serverIP, env);
  }
};

// --- 辅助函数：获取配置 ---
async function getConfig(env) {
    if (!env.MOTD_KV) return {};
    try {
        const configStr = await env.MOTD_KV.get("SITE_CONFIG");
        return configStr ? JSON.parse(configStr) : {};
    } catch (e) {
        return {};
    }
}

// --- 处理配置 API ---
async function handleGetConfig(env) {
    const config = await getConfig(env);
    return new Response(JSON.stringify(config), { headers: { "Content-Type": "application/json" } });
}

async function handleSaveConfig(request, env) {
    try {
        const body = await request.json();
        // 简单验证权限：检查请求体里是否带了正确的账号密码
        if (!env.MOTD_KV) return new Response("KV Error", { status: 500 });
        
        const dbUser = await env.MOTD_KV.get("ADMIN_USER");
        const dbPass = await env.MOTD_KV.get("ADMIN_PASS");

        if (body.auth && body.auth.username === dbUser && body.auth.password === dbPass) {
            // 权限通过，保存配置 (只保存 config 字段)
            await env.MOTD_KV.put("SITE_CONFIG", JSON.stringify(body.config));
            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
        } else {
            return new Response(JSON.stringify({ success: false, msg: "权限验证失败" }), { status: 401 });
        }
    } catch (e) {
        return new Response(JSON.stringify({ success: false, msg: e.message }), { status: 500 });
    }
}

// --- 处理登录 ---
async function handleAuthLogin(request, env) {
    try {
        const body = await request.json();
        if (!env.MOTD_KV) return new Response(JSON.stringify({ success: false, msg: "服务端 KV 未配置" }), { status: 500 });
        const dbUser = await env.MOTD_KV.get("ADMIN_USER");
        const dbPass = await env.MOTD_KV.get("ADMIN_PASS");
        if (body.username === dbUser && body.password === dbPass) {
            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
        } else {
            return new Response(JSON.stringify({ success: false, msg: "账号或密码错误" }), { status: 401 });
        }
    } catch (e) {
        return new Response(JSON.stringify({ success: false, msg: "Server Error" }), { status: 500 });
    }
}

// --- 业务逻辑 ---

async function handleInfoRequest(serverIP) {
    const apiUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIP)}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    return new Response(JSON.stringify({ 
        motd: data.motd?.html || "No MOTD",
        online: data.online 
    }), { headers: { "Content-Type": "application/json" } });
}

async function handleImageRequest(serverIP, env) {
  const apiUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIP)}`;
  
  // 1. 获取配置的背景图，如果没有则使用默认
  const config = await getConfig(env);
  const defaultBg = `https://other.api.yilx.cc/api/moe?t=${Date.now()}`;
  const backgroundImage = config.bgImage || defaultBg;

  try {
    const startTime = Date.now();
    const res = await fetch(apiUrl, { cf: { cacheTtl: 60 } });
    const data = await res.json();
    const ping = Date.now() - startTime;

    // 时间
    const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const timeStr = timeFormatter.format(new Date()).replace(/\//g, '-'); 

    const isOnline = data.online;
    const motdHtml = isOnline ? (data.motd?.html || "<div>A Minecraft Server</div>") : "<div>Server Offline</div>";

    let playerHtml = "";
    let playerCount = 0;
    if (isOnline && data.players.list?.length > 0) {
      const list = data.players.list; 
      playerCount = list.length;
      playerHtml = list.map(p => `<div style="height:22px; color:#ffffff;">${p.name_html || p.name_clean}</div>`).join("");
    } else {
      playerHtml = '<div style="color:#ffffff; opacity:0.5">No players online</div>';
      playerCount = 1;
    }

    const playerAreaHeight = Math.max(playerCount * 24, 30);
    const cardHeight = 320 + playerAreaHeight;
    const cardWidth = 600;
    
    // 布局坐标
    const statusX = 465; 
    const statusTextX = 517;
    const contentWidth = 530;
    
    const statusColor = isOnline ? '#a6e3a1' : '#f38ba8';
    const version = isOnline ? (data.version?.name_clean || "Java Edition") : "N/A";
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";

    const svg = `<svg width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .shadow { text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }
          .motd-container { 
            display: block; white-space: pre-wrap; word-wrap: break-word; overflow: hidden; 
            text-shadow: 1px 1px 2px rgba(0,0,0,1); font-family: -apple-system, Arial, sans-serif; 
            line-height: 1.4; max-height: 85px; color: #ffffff; font-size: 16px;
          }
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
      <text x="115" y="85" font-family="Arial" font-size="13" fill="#9399b2" class="shadow">${version}</text>
      
      <rect x="${statusX}" y="40" width="105" height="28" rx="14" fill="#000000" fill-opacity="0.5"/>
      <text x="${statusTextX}" y="58" font-family="Arial" font-size="12" font-weight="bold" fill="${statusColor}" text-anchor="middle" class="shadow">
        ${isOnline ? data.players.online + ' / ' + data.players.max : 'OFFLINE'}
      </text>

      <foreignObject x="35" y="115" width="${contentWidth}" height="85">
        <div xmlns="http://www.w3.org/1999/xhtml" class="motd-container">${motdHtml}</div>
      </foreignObject>

      <text x="35" y="230" font-family="Arial" font-size="11" fill="#94e2d5" font-weight="bold" style="letter-spacing:1.5px" class="shadow">ONLINE PLAYERS</text>
      <foreignObject x="35" y="240" width="${contentWidth}" height="${playerAreaHeight}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="player-container" style="font-size:14px; line-height:1.6;">${playerHtml}</div>
      </foreignObject>

      <text x="35" y="${cardHeight - 45}" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.6)" class="shadow">Ping: ${ping}ms</text>
      <text x="${cardWidth - 35}" y="${cardHeight - 45}" text-anchor="end" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.6)" class="shadow">${timeStr}</text>
    </svg>`;
    
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" } });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}

// --- HTML 模板渲染 ---
function renderHTML(config) {
    // 默认背景和标题
    const defaultBg = 'https://other.api.yilx.cc/api/moe';
    const bgImage = config.bgImage || defaultBg;
    const pageTitle = config.title || '服务器状态';

    return `
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MC 状态卡片</title>
    <style>
        body { 
            margin: 0; padding: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
            background: url('${bgImage}') no-repeat center center fixed; background-size: cover;
            transition: background 0.5s ease;
        }
        body::before { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.3); z-index: -1; }
        
        .box { 
            background: rgba(255, 255, 255, 0.15); 
            backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%);
            padding: 45px 35px; 
            border-radius: 50px; 
            width: calc(100% - 40px);
            max-width: 460px; text-align: center; 
            box-shadow: 0 25px 50px rgba(0,0,0,0.4);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            position: relative; /* 关键：为右上角按钮定位 */
        }
        
        /* 右上角设置按钮 */
        .settings-btn {
            position: absolute; top: 25px; right: 25px;
            width: 36px; height: 36px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: 0.3s;
            font-size: 18px;
        }
        .settings-btn:hover { background: rgba(255,255,255,0.4); transform: rotate(90deg); }

        .logo { width: 85px; height: 85px; margin-bottom: 25px; border-radius: 35px; box-shadow: 0 12px 24px rgba(0,0,0,0.3); }
        h2 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        p.desc { color: rgba(255, 255, 255, 0.7); font-size: 15px; margin: 12px 0 35px; }
        
        textarea { 
            width: 100%; min-height: 54px; padding: 18px 25px; margin-bottom: 18px; 
            border-radius: 50px; border: 1px solid rgba(255, 255, 255, 0.1); 
            background: rgba(0, 0, 0, 0.25); color: white; 
            box-sizing: border-box; font-size: 17px; font-family: inherit;
            outline: none; resize: none; overflow: hidden; display: block;
            transition: 0.3s ease;
        }
        textarea:focus { background: rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.3); }
        
        button.action-btn { 
            background: white; color: #000; border: none; height: 54px; 
            border-radius: 50px; font-weight: 700; cursor: pointer; 
            width: 100%; font-size: 17px; transition: all 0.4s cubic-bezier(0.15, 0, 0.2, 1);
        }
        button.action-btn:hover { background: #eee; transform: scale(1.02); }
        button.action-btn:active { transform: scale(0.98); }
        
        #res { margin-top: 40px; width: 100%; }
        #full-motd-box { 
            margin-top: 25px; padding: 22px; background: rgba(0,0,0,0.45); 
            border-radius: 50px; text-align: left; display: none; 
            border: 1px solid rgba(255,255,255,0.08);
        }
        .motd-title { color: #fab387; font-size: 12px; font-weight: 900; margin-bottom: 12px; opacity: 0.9; text-transform: uppercase; }
        #full-motd-content { line-height: 1.7; font-size: 14px; white-space: pre-wrap; }
        
        img.card-img { width: 100%; border-radius: 45px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .footer { margin-top: 35px; font-size: 13px; opacity: 0.4; font-weight: 500; }

        /* 模态框通用样式 */
        .modal {
            display: none; position: fixed; z-index: 100; left: 0; top: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            align-items: center; justify-content: center;
        }
        .modal-content {
            background: rgba(30, 30, 35, 0.95);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 35px; border-radius: 40px; width: 85%; max-width: 320px;
            text-align: center; color: white;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            animation: popIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }
        @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .modal-title { font-size: 20px; font-weight: bold; margin-bottom: 25px; }
        .modal-label { display: block; text-align: left; font-size: 13px; margin: 10px 5px 5px; opacity: 0.7; }
        .modal-input {
            width: 100%; padding: 15px 20px; margin-bottom: 10px;
            border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
            background: rgba(0,0,0,0.3); color: white; outline: none; box-sizing: border-box; font-size: 16px;
        }
        .modal-btn {
            background: #fff; color: #000; border-radius: 20px; margin-top: 15px;
            padding: 12px; width: 100%; font-weight: bold; border: none; cursor: pointer; font-size: 16px;
        }
        .close-btn { margin-top: 15px; font-size: 13px; color: #aaa; cursor: pointer; }
    </style>
</head>
<body>
    <div class="box">
        <div class="settings-btn" onclick="handleSettingsClick()">⚙️</div>

        <img src="https://ib.a0b.de5.net/file/1770001024571_2307052_Mvie09JU.png" class="logo">
        <h2 id="page-title">${pageTitle}</h2>
        <p class="desc">输入Minecraft服务器地址，一键获取</p>
        
        <textarea id="ip" placeholder="play.hypixel.net" rows="1" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'"></textarea>
        <button class="action-btn" onclick="gen()">生成预览卡片</button>
        
        <div id="res"></div>
        
        <div id="full-motd-box">
            <div class="motd-title">完整 MOTD 信息 (已截断)</div>
            <div id="full-motd-content"></div>
        </div>

        <div class="footer">© 2026 MC Status Card • iOS Style</div>
    </div>

    <div id="loginModal" class="modal">
        <div class="modal-content">
            <div class="modal-title">管理员登录</div>
            <input type="text" id="username" class="modal-input" placeholder="账号">
            <input type="password" id="password" class="modal-input" placeholder="密码">
            <button class="modal-btn" onclick="doLogin()">登 录</button>
            <div class="close-btn" onclick="closeModal('loginModal')">取消</div>
        </div>
    </div>

    <div id="configModal" class="modal">
        <div class="modal-content">
            <div class="modal-title">服务器设置</div>
            
            <label class="modal-label">自定义标题</label>
            <input type="text" id="cfg-title" class="modal-input" placeholder="默认为: 服务器状态" value="${config.title || ''}">
            
            <label class="modal-label">背景图片 URL</label>
            <input type="text" id="cfg-bg" class="modal-input" placeholder="https://..." value="${config.bgImage || ''}">
            
            <button class="modal-btn" onclick="saveConfig()">保存设置</button>
            <div class="close-btn" onclick="logout()">退出登录</div>
            <div class="close-btn" onclick="closeModal('configModal')">关闭</div>
        </div>
    </div>

    <script>
        // 状态检查
        function isLoggedIn() {
            return localStorage.getItem('admin_user') && localStorage.getItem('admin_pass');
        }

        // 点击右上角按钮逻辑
        function handleSettingsClick() {
            if (isLoggedIn()) {
                document.getElementById('configModal').style.display = 'flex';
            } else {
                document.getElementById('loginModal').style.display = 'flex';
            }
        }

        function closeModal(id) { document.getElementById(id).style.display = 'none'; }

        // 登录逻辑
        async function doLogin() {
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            if(!u || !p) return alert("请输入账号和密码");

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: u, password: p})
                });
                const data = await res.json();
                if(data.success) {
                    localStorage.setItem('admin_user', u);
                    localStorage.setItem('admin_pass', p);
                    closeModal('loginModal');
                    alert('登录成功！再次点击齿轮即可进入设置。');
                    document.getElementById('configModal').style.display = 'flex';
                } else {
                    alert('登录失败: ' + (data.msg || '未知错误'));
                }
            } catch(e) { alert('请求错误'); }
        }

        function logout() {
            localStorage.removeItem('admin_user');
            localStorage.removeItem('admin_pass');
            closeModal('configModal');
            alert('已退出登录');
        }

        // 保存设置
        async function saveConfig() {
            const title = document.getElementById('cfg-title').value;
            const bg = document.getElementById('cfg-bg').value;
            const u = localStorage.getItem('admin_user');
            const p = localStorage.getItem('admin_pass');

            try {
                const res = await fetch('/api/config', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        auth: { username: u, password: p },
                        config: { title: title, bgImage: bg }
                    })
                });
                const data = await res.json();
                if(data.success) {
                    alert('设置已保存，页面将刷新');
                    location.reload();
                } else {
                    alert('保存失败，可能登录已过期');
                }
            } catch(e) { alert('请求错误'); }
        }

        // 生成卡片逻辑
        async function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            const resDiv = document.getElementById('res');
            const fullMotdBox = document.getElementById('full-motd-box');
            resDiv.innerHTML = '<p style="opacity:0.6; font-size:14px;">正在连接...</p>';
            fullMotdBox.style.display = 'none';

            const imageUrl = window.location.origin + '?server=' + encodeURIComponent(ip);
            const img = new Image();
            img.className = 'card-img';
            img.onload = () => { resDiv.innerHTML = ''; resDiv.appendChild(img); };
            img.src = imageUrl;

            try {
                const infoRes = await fetch(window.location.origin + '?type=info&server=' + encodeURIComponent(ip));
                const infoData = await infoRes.json();
                if (infoData.online) {
                    fullMotdBox.style.display = 'block';
                    document.getElementById('full-motd-content').innerHTML = infoData.motd;
                }
            } catch(e) {}
        }
    </script>
</body>
</html>
    `;
}