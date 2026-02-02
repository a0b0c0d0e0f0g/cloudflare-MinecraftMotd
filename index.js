export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
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
  // 使用高质量背景图源
  const backgroundImage = `https://api.kdcc.cn/img/rand.php?t=${Date.now()}`; 

  try {
    const res = await fetch(apiUrl, { cf: { cacheTtl: 60 } });
    const data = await res.json();
    const isOnline = data.online;
    
    // 默认值处理
    const motdHtml = isOnline ? (data.motd?.html || "<div>A Minecraft Server</div>") : "<div>Server is Offline</div>";
    const version = isOnline ? (data.version?.name_clean || "Unknown Version") : "Offline";
    const players = isOnline ? (data.players?.list || []) : [];
    const statusColor = isOnline ? "#50fa7b" : "#ff5555";
    
    // 动态计算高度：基础高度 200 + 玩家列表高度
    const cardHeight = isOnline && players.length > 0 ? 200 + (players.length * 22) : 220;

    const svg = `
    <svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          /* 引入 Inter 字体提高清晰度 */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;display=swap');

          .base-text {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            fill: white;
          }
          .shadow { filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.5)); }
          .mc-shadow { text-shadow: 2px 2px 0px rgba(0,0,0,0.4); }
          
          .motd-container {
            font-family: 'Inter', 'Arial', sans-serif;
            color: white;
            line-height: 1.5;
            font-size: 14px;
            white-space: pre-wrap;
            word-break: break-all;
          }
          /* 优化 MOTD 内部 span 样式 */
          .motd-container span { line-height: 1.5; }
          
          .player-item {
            font-family: 'Inter', 'Consolas', monospace;
            font-size: 13px;
            color: rgba(255,255,255,0.8);
          }
        </style>
        <clipPath id="corners">
          <rect width="450" height="${cardHeight}" rx="24" ry="24" />
        </clipPath>
      </defs>

      <g clip-path="url(#corners)">
        <image href="${backgroundImage}" width="450" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="450" height="${cardHeight}" fill="rgba(0,0,0,0.3)" />
        <rect width="450" height="${cardHeight}" fill="rgba(255,255,255,0.1)" style="backdrop-filter: blur(20px);" />
      </g>

      <rect x="30" y="35" width="70" height="70" rx="16" fill="rgba(255,255,255,0.2)" />
      <image href="${data.icon || 'https://mc-packs.net/assets/img/default_icon.png'}" x="30" y="35" width="70" height="70" clip-path="inset(0% round 16px)" />

      <text x="115" y="62" class="base-text mc-shadow" font-size="22" font-weight="700">${serverIP}</text>
      <text x="115" y="88" class="base-text" font-size="13" fill-opacity="0.7">${version}</text>

      <rect x="320" y="42" width="100" height="28" rx="14" fill="rgba(0,0,0,0.4)" />
      <circle cx="335" cy="56" r="4" fill="${statusColor}" />
      <text x="375" y="60" class="base-text" font-size="12" font-weight="700" text-anchor="middle">
        ${isOnline ? data.players.online + ' / ' + data.players.max : 'OFFLINE'}
      </text>

      <foreignObject x="30" y="120" width="390" height="60">
        <div xmlns="http://www.w3.org/1999/xhtml" class="motd-container mc-shadow">
          ${motdHtml}
        </div>
      </foreignObject>

      ${isOnline && players.length > 0 ? `
        <line x1="30" y1="185" x2="420" y2="185" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
        <foreignObject x="30" y="200" width="390" height="${players.length * 25}">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${players.map(p => `<div class="player-item mc-shadow" style="margin-bottom:6px;">• ${p.name_clean}</div>`).join('')}
          </div>
        </foreignObject>
      ` : ''}
    </svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=60"
      }
    });

  } catch (e) {
    return new Response(`<svg width="400" height="100" xmlns="http://www.w3.org/2000/svg"><text x="20" y="50" fill="red">Error: ${e.message}</text></svg>`, { headers: { "Content-Type": "image/svg+xml" } });
  }
}

const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minecraft Server Status Card</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #f5f5f7; --card: #ffffff; --primary: #007aff; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); display: flex; justify-content: center; padding: 40px 20px; color: #1d1d1f; }
        .container { background: var(--card); padding: 32px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); width: 100%; max-width: 500px; text-align: center; }
        h1 { font-weight: 600; font-size: 24px; margin-bottom: 8px; }
        p { color: #86868b; margin-bottom: 24px; }
        input { width: 100%; padding: 14px; border: 1px solid #d2d2d7; border-radius: 12px; font-size: 16px; margin-bottom: 16px; box-sizing: border-box; outline: none; transition: all 0.2s; }
        input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0,122,255,0.1); }
        button { background: var(--primary); color: white; border: none; padding: 14px 28px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
        button:active { transform: scale(0.98); }
        #res { margin-top: 32px; min-height: 200px; display: flex; align-items: center; justify-content: center; }
        .card-img { max-width: 100%; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
        #full-motd-box { margin-top: 24px; text-align: left; background: #f2f2f7; padding: 16px; border-radius: 12px; font-size: 14px; display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>MC 状态卡片</h1>
        <p>输入服务器地址，生成 iOS 风格预览图</p>
        <input type="text" id="ip" placeholder="例如: mc.hypixel.net" value="play.hypixel.net">
        <button onclick="gen()">生成预览卡片</button>
        <div id="res"></div>
        <div id="full-motd-box">
            <div id="full-motd-content"></div>
        </div>
    </div>
    <script>
        async function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            const resDiv = document.getElementById('res');
            const fullMotdBox = document.getElementById('full-motd-box');
            resDiv.innerHTML = '<p>正在加载...</p>';
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