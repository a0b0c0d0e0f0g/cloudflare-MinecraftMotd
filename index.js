export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- 管理员登录 API ---
    if (url.pathname === '/api/login' && request.method === 'POST') {
        return handleAuthLogin(request, env);
    }

    const serverIP = url.searchParams.get("server");
    if (!serverIP) {
      return new Response(htmlTemplate, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (url.searchParams.get("type") === "info") {
        return handleInfoRequest(serverIP);
    }
    return handleImageRequest(serverIP);
  }
};

// --- 处理登录逻辑 (使用 MOTD_KV) ---
async function handleAuthLogin(request, env) {
    try {
        const body = await request.json();
        
        // 检查 MOTD_KV 是否绑定
        if (!env.MOTD_KV) {
            return new Response(JSON.stringify({ success: false, msg: "服务端 KV (MOTD_KV) 未配置" }), { status: 500 });
        }

        // 从 MOTD_KV 获取账号密码
        const dbUser = await env.MOTD_KV.get("ADMIN_USER");
        const dbPass = await env.MOTD_KV.get("ADMIN_PASS");

        // 验证
        if (body.username === dbUser && body.password === dbPass) {
            return new Response(JSON.stringify({ success: true }), { 
                headers: { "Content-Type": "application/json" } 
            });
        } else {
            return new Response(JSON.stringify({ success: false, msg: "账号或密码错误" }), { 
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
    } catch (e) {
        return new Response(JSON.stringify({ success: false, msg: "服务器错误" }), { status: 500 });
    }
}

async function handleInfoRequest(serverIP) {
    const apiUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIP)}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    return new Response(JSON.stringify({ 
        motd: data.motd?.html || "No MOTD",
        online: data.online 
    }), { headers: { "Content-Type": "application/json" } });
}

async function handleImageRequest(serverIP) {
  const apiUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIP)}`;
  // 背景图 API，可按需修改
  const backgroundImage = `https://other.api.yilx.cc/api/moe?t=${Date.now()}`; 

  try {
    const startTime = Date.now();
    
    const res = await fetch(apiUrl, { cf: { cacheTtl: 60 } });
    const data = await res.json();
    
    const ping = Date.now() - startTime;

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
    // 基础高度 320，底部留白
    const cardHeight = 320 + playerAreaHeight;
    
    const version = isOnline ? (data.version?.name_clean || "Java Edition") : "N/A";
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";
    const statusColor = isOnline ? '#a6e3a1' : '#f38ba8';

    const cardWidth = 600;
    const statusX = 465; 
    const statusTextX = 517;
    const contentWidth = 530;

    const svg = `<svg width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .shadow { text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }
          .motd-container { 
            display: block;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow: hidden; 
            text-shadow: 1px 1px 2px rgba(0,0,0,1); 
            font-family: -apple-system, Arial, sans-serif; 
            line-height: 1.4; 
            max-height: 85px; 
            color: #ffffff;
            font-size: 16px;
          }
          .motd-container span { display: inline; }
          .player-container div { display: block; font-family: -apple-system, Arial; text-shadow: 1px 1px 2px rgba(0,0,0,1); }
        </style>
        <clipPath id="iphone-mask">
          <rect width="64" height="64" rx="22.5" />
        </clipPath>
        <clipPath id="card-mask">
          <rect width="${cardWidth}" height="${cardHeight}" rx="45" />
        </clipPath>
      </defs>
      
      <g clip-path="url(#card-mask)">
        <image href="${backgroundImage}" width="${cardWidth}" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="${cardWidth}" height="${cardHeight}" fill="#11111b" fill-opacity="0.75" />
      </g>
      
      <g transform="translate(35, 35)">
        <image href="${icon}" width="64" height="64" clip-path="url(#iphone-mask)" />
      </g>
      
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
        <div xmlns="http://www.w3.org/1999/xhtml" class="player-container" style="font-size:14px; line-height:1.6;">
          ${playerHtml}
        </div>
      </foreignObject>

      <text x="35" y="${cardHeight - 45}" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.6)" class="shadow">Ping: ${ping}ms</text>
      <text x="${cardWidth - 35}" y="${cardHeight - 45}" text-anchor="end" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.6)" class="shadow">${timeStr}</text>

    </svg>`;
    
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" } });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}

const htmlTemplate = `
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
            background: url('https://other.api.yilx.cc/api/moe') no-repeat center center fixed; background-size: cover;
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
            position: relative; 
        }
        
        .logo { width: 85px; height: 85px; margin-bottom: 25px; border-radius: 35px; box-shadow: 0 12px 24px rgba(0,0,0,0.3); }
        h2 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        p.desc { color: rgba(255, 255, 255, 0.7); font-size: 15px; margin: 12px 0 35px; }
        
        textarea { 
            width: 100%; min-height: 54px; 
            padding: 18px 25px;
            margin-bottom: 18px; 
            border-radius: 50px; 
            border: 1px solid rgba(255, 255, 255, 0.1); 
            background: rgba(0, 0, 0, 0.25); color: white; 
            box-sizing: border-box; font-size: 17px; font-family: inherit;
            outline: none; resize: none; overflow: hidden; display: block;
            transition: 0.3s ease;
        }
        textarea:focus { background: rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.3); }
        
        button { 
            background: white; color: #000; border: none; height: 54px; 
            border-radius: 50px; 
            font-weight: 700; cursor: pointer; 
            width: 100%; font-size: 17px; transition: all 0.4s cubic-bezier(0.15, 0, 0.2, 1);
        }
        button:hover { background: #eee; transform: scale(1.02); }
        button:active { transform: scale(0.98); }
        
        #res { margin-top: 40px; width: 100%; }
        #full-motd-box { 
            margin-top: 25px; padding: 22px; background: rgba(0,0,0,0.45); 
            border-radius: 50px;
            text-align: left; display: none; 
            border: 1px solid rgba(255,255,255,0.08);
        }
        .motd-title { color: #fab387; font-size: 12px; font-weight: 900; margin-bottom: 12px; opacity: 0.9; text-transform: uppercase; }
        #full-motd-content { line-height: 1.7; font-size: 14px; white-space: pre-wrap; }
        
        img.card-img { width: 100%; border-radius: 45px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        
        .footer { margin-top: 35px; font-size: 13px; opacity: 0.4; font-weight: 500; }
        .admin-link { cursor: pointer; text-decoration: none; color: inherit; transition: 0.2s; }
        .admin-link:hover { text-decoration: underline; opacity: 1; }

        /* --- 登录弹窗样式 --- */
        .modal {
            display: none; 
            position: fixed; z-index: 100; left: 0; top: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
            align-items: center; justify-content: center;
        }
        .modal-content {
            background: rgba(30, 30, 35, 0.9);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 35px; border-radius: 40px; width: 85%; max-width: 320px;
            text-align: center; color: white;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }
        .modal-title { font-size: 20px; font-weight: bold; margin-bottom: 25px; }
        .modal-input {
            width: 100%; padding: 15px 20px; margin-bottom: 15px;
            border-radius: 30px; border: 1px solid rgba(255,255,255,0.1);
            background: rgba(0,0,0,0.3); color: white; outline: none; box-sizing: border-box;
        }
        .modal-btn {
            background: #fff; color: #000; border-radius: 30px; 
            padding: 12px; width: 100%; font-weight: bold; border: none; cursor: pointer;
        }
        .close-btn { margin-top: 15px; font-size: 13px; color: #aaa; cursor: pointer; }
    </style>
</head>
<body>
    <div class="box">
        <img src="https://ib.a0b.de5.net/file/1770001024571_2307052_Mvie09JU.png" class="logo">
        <h2>服务器状态</h2>
        <p class="desc">输入Minecraft服务器地址，一键获取</p>
        
        <textarea id="ip" placeholder="play.hypixel.net" rows="1" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'"></textarea>
        <button onclick="gen()">生成预览卡片</button>
        
        <div id="res"></div>
        
        <div id="full-motd-box">
            <div class="motd-title">完整 MOTD 信息 (已截断)</div>
            <div id="full-motd-content"></div>
        </div>

        <div class="footer">
            © 2026 MC Status Card • iOS Style <br>
            <span id="admin-status" class="admin-link" onclick="openLogin()">管理员登录</span>
        </div>
    </div>

    <div id="loginModal" class="modal">
        <div class="modal-content">
            <div class="modal-title">管理员登录</div>
            <input type="text" id="username" class="modal-input" placeholder="账号">
            <input type="password" id="password" class="modal-input" placeholder="密码">
            <button class="modal-btn" onclick="doLogin()">登 录</button>
            <div class="close-btn" onclick="closeLogin()">取消</div>
        </div>
    </div>

    <script>
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

        // --- 登录脚本 ---
        const modal = document.getElementById('loginModal');
        const adminStatus = document.getElementById('admin-status');

        function openLogin() {
            if (adminStatus.innerText === '管理员已登录') return;
            modal.style.display = 'flex';
        }
        function closeLogin() { modal.style.display = 'none'; }
        
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
                    alert('登录成功');
                    closeLogin();
                    adminStatus.innerText = '管理员已登录';
                    adminStatus.style.color = '#a6e3a1';
                    adminStatus.style.cursor = 'default';
                } else {
                    alert('登录失败: ' + (data.msg || '未知错误'));
                }
            } catch(e) {
                alert('请求错误，请检查网络或 KV 配置');
            }
        }
    </script>
</body>
</html>
`;