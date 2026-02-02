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
  // 随机背景图
  const backgroundImage = `https://other.api.yilx.cc/api/moe?t=${Date.now()}`; 

  try {
    const res = await fetch(apiUrl, { cf: { cacheTtl: 60 } });
    const data = await res.json();
    const isOnline = data.online;
    
    // 动态计算高度
    let cardHeight = 180;
    let playersList = '';
    if (isOnline && data.players.list && data.players.list.length > 0) {
        const pList = data.players.list.slice(0, 8);
        cardHeight += (Math.ceil(pList.length / 4) * 55);
        playersList = pList.map(p => `
            <g transform="translate(0,0)">
                <image href="https://mc-heads.net/avatar/${p.uuid}/40" x="0" y="0" width="36" height="36" clip-path="url(#avatar-mask)"/>
                <text x="0" y="48" font-size="10" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto" text-anchor="start" opacity="0.8">${p.name_clean}</text>
            </g>
        `).join('');
    }

    // 核心：iOS 连续曲率路径 (Squircle)
    // 使用路径绘制比 rx 属性更接近 iOS 视觉
    const iosCardPath = `M 0,50 C 0,0 0,0 50,0 H 400 C 450,0 450,0 450,50 V ${cardHeight-50} C 450,${cardHeight} 450,${cardHeight} 400,${cardHeight} H 50 C 0,${cardHeight} 0,${cardHeight} 0,${cardHeight-50} Z`;
    const iosAvatarPath = `M 0,12 C 0,0 0,0 12,0 H 24 C 36,0 36,0 36,12 V 24 C 36,36 36,36 24,36 H 12 C 0,36 0,36 0,24 Z`;

    const svg = `
    <svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="card-mask"><path d="${iosCardPath}" /></clipPath>
        <clipPath id="avatar-mask"><path d="${iosAvatarPath}" /></clipPath>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#000;stop-opacity:0.6" />
          <stop offset="100%" style="stop-color:#000;stop-opacity:0.8" />
        </linearGradient>
      </defs>
      
      <g clip-path="url(#card-mask)">
        <image href="${backgroundImage}" width="450" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="450" height="${cardHeight}" fill="url(#grad)" />
        
        <image href="${data.icon || 'https://mc-heads.net/avatar/steve/64'}" x="30" y="30" width="64" height="64" clip-path="url(#card-mask)" />
        
        <text x="110" y="55" font-family="-apple-system,Helvetica,Arial" font-size="22" font-weight="600" fill="#ffffff">${serverIP}</text>
        <circle cx="115" cy="78" r="5" fill="${isOnline ? '#34C759' : '#FF3B30'}" />
        <text x="130" y="83" font-family="-apple-system,Helvetica" font-size="14" fill="#ffffff" opacity="0.8">${isOnline ? '服务器在线' : '服务器离线'}</text>
        <text x="30" y="130" font-family="-apple-system,Helvetica" font-size="16" fill="#ffffff" font-weight="500">${data.players?.online || 0} / ${data.players?.max || 0} 玩家在线</text>
        
        <g transform="translate(30, 155)">
            ${isOnline ? playersList : ''}
        </g>
      </g>
    </svg>`;

    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    return new Response("<svg><text y='20'>Error generating card</text></svg>", { headers: { "Content-Type": "image/svg+xml" } });
  }
}

const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MC Status Card - iOS Style</title>
    <style>
        :root { --ios-radius: 40px; --inner-radius: 18px; }
        body { 
            margin: 0; padding: 0; min-height: 100vh;
            background: #000; color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
            display: flex; align-items: center; justify-content: center;
        }
        .container {
            width: 90%; max-width: 500px; padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(30px) saturate(180%);
            -webkit-backdrop-filter: blur(30px) saturate(180%);
            border-radius: var(--ios-radius);
            border: 0.5px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            text-align: center;
        }
        h2 { font-weight: 600; letter-spacing: -0.5px; margin-bottom: 30px; }
        input, textarea, button {
            width: 100%; box-sizing: border-box;
            background: rgba(255, 255, 255, 0.08);
            border: none; color: #fff; padding: 15px;
            margin-bottom: 15px; font-size: 16px;
            border-radius: var(--inner-radius);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        input:focus { background: rgba(255, 255, 255, 0.15); outline: none; }
        button { 
            background: #fff; color: #000; font-weight: 600; cursor: pointer;
            margin-top: 10px;
        }
        button:active { transform: scale(0.97); opacity: 0.8; }
        #res img { 
            width: 100%; border-radius: var(--ios-radius); 
            margin-top: 25px; box-shadow: 0 15px 30px rgba(0,0,0,0.3);
        }
        #full-motd-box {
            margin-top: 25px; padding: 15px; text-align: left;
            background: rgba(0,0,0,0.2); border-radius: var(--inner-radius);
            display: none; font-size: 13px; line-height: 1.5;
        }
        .footer { margin-top: 30px; font-size: 12px; opacity: 0.4; }
    </style>
</head>
<body>
    <div class="container">
        <h2>MC 状态卡片生成</h2>
        <input type="text" id="ip" placeholder="输入服务器 IP (例如: play.hypixel.net)">
        <button onclick="gen()">生成卡片</button>
        <div id="res"></div>
        <div id="full-motd-box" id="full-motd-content"></div>
        <div class="footer">DESIGNED FOR IOS VISUAL EXPERIENCE</div>
    </div>
    <script>
        async function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            const resDiv = document.getElementById('res');
            resDiv.innerHTML = '<p style="opacity:0.5;">正在获取数据...</p>';
            
            const imageUrl = window.location.origin + '?server=' + encodeURIComponent(ip);
            const img = new Image();
            img.onload = () => { resDiv.innerHTML = ''; resDiv.appendChild(img); };
            img.src = imageUrl;
        }
    </script>
</body>
</html>
`;