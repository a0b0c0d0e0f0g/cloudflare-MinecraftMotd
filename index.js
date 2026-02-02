export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const serverIP = url.searchParams.get("server");
    if (!serverIP) {
      return new Response(htmlTemplate, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    return handleImageRequest(serverIP);
  }
};

async function handleImageRequest(serverIP) {
  const apiUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIP)}`;
  const backgroundImage = `https://other.api.yilx.cc/api/moe?t=${Date.now()}`; 

  try {
    const res = await fetch(apiUrl, { cf: { cacheTtl: 60 } });
    const data = await res.json();
    const isOnline = data.online;
    const motdHtml = isOnline ? (data.motd?.html || "<div>A Minecraft Server</div>") : "<div>Server Offline</div>";

    let playerHtml = "";
    let playerCount = 0;
    if (isOnline && data.players.list?.length > 0) {
      const list = data.players.list.slice(0, 8);
      playerCount = list.length;
      playerHtml = list.map(p => `<div style="height:22px; color:#ffffff;">${p.name_html || p.name_clean}</div>`).join("");
    } else {
      playerHtml = '<div style="color:#ffffff; opacity:0.5">No players online</div>';
      playerCount = 1;
    }

    const playerAreaHeight = Math.max(playerCount * 24, 30);
    const cardHeight = 230 + playerAreaHeight;
    const version = isOnline ? (data.version?.name_clean || "Java Edition") : "N/A";
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";
    const statusColor = isOnline ? '#34C759' : '#FF3B30';

    const svg = `<svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="iphone-mask"><rect width="64" height="64" rx="16" /></clipPath>
        <clipPath id="card-mask"><rect width="450" height="${cardHeight}" rx="45" /></clipPath>
      </defs>
      <g clip-path="url(#card-mask)">
        <image href="${backgroundImage}" width="450" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="450" height="${cardHeight}" fill="#000000" fill-opacity="0.75" />
      </g>
      <g transform="translate(35, 35)">
        <image href="${icon}" width="64" height="64" clip-path="url(#iphone-mask)" />
      </g>
      <text x="115" y="60" font-family="Arial" font-size="22" fill="#ffffff" font-weight="bold">${serverIP}</text>
      <text x="115" y="85" font-family="Arial" font-size="13" fill="#98989d">${version}</text>
      <rect x="310" y="40" width="105" height="28" rx="14" fill="#000000" fill-opacity="0.5"/>
      <text x="362" y="58" font-family="Arial" font-size="12" font-weight="bold" fill="${statusColor}" text-anchor="middle">
        ${isOnline ? data.players.online + ' / ' + data.players.max : 'OFFLINE'}
      </text>
      <foreignObject x="35" y="115" width="380" height="60">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#ffffff; font-size:16px; font-family: -apple-system; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
          ${motdHtml}
        </div>
      </foreignObject>
      <text x="35" y="205" font-family="Arial" font-size="11" fill="#64D2FF" font-weight="bold" style="letter-spacing:1.5px">ONLINE PLAYERS</text>
      <foreignObject x="35" y="215" width="380" height="${playerAreaHeight}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:14px; font-family: -apple-system; color:#ffffff; line-height: 1.6;">
          ${playerHtml}
        </div>
      </foreignObject>
    </svg>`;
    
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}

const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>MC 服务器状态</title>
    <style>
        :root { --p-x: 0px; --p-y: 0px; }
        body { margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; background: #000; font-family: -apple-system, sans-serif; overflow: hidden; touch-action: none; }
        
        #bg { position: fixed; top: -10%; left: -10%; width: 120%; height: 120%; background: url('https://other.api.yilx.cc/api/moe') center/cover; z-index: -1; transform: translate(calc(var(--p-x)*-1.2), calc(var(--p-y)*-1.2)); transition: 0.2s; }

        .box { 
            background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
            padding: 30px; border-radius: 45px; width: 88%; max-width: 400px; 
            border: 1px solid rgba(255, 255, 255, 0.2); transform: translate(var(--p-x), var(--p-y)); 
            color: #fff; text-align: center; box-shadow: 0 40px 80px rgba(0,0,0,0.5);
        }

        textarea { width: 100%; padding: 18px; margin-bottom: 15px; border-radius: 20px; border: none; background: rgba(0,0,0,0.3); color: #fff; font-size: 16px; box-sizing: border-box; outline: none; }
        
        button { background: #fff; color: #000; border: none; padding: 16px; border-radius: 20px; font-weight: 700; width: 100%; font-size: 16px; cursor: pointer; transition: 0.2s; }
        button:active { transform: scale(0.96); opacity: 0.8; }

        #res img { width: 100%; border-radius: 35px; margin-top: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); }

        .dl-btn { 
            display: none; align-items: center; justify-content: center;
            background: rgba(255,255,255,0.2); color: #fff; margin-top: 15px; padding: 12px; 
            border-radius: 18px; font-weight: 600; font-size: 14px; text-decoration: none;
            border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px);
        }
        .dl-btn.show { display: flex; }
        .dl-btn svg { margin-right: 8px; }
    </style>
</head>
<body onmousemove="px(event)" ontouchmove="tx(event)">
    <div id="bg"></div>
    
    <div class="box">
        <h3 style="margin-top:0; font-weight:800; letter-spacing:-0.5px">Server Card</h3>
        <textarea id="ip" placeholder="输入 MC 服务器 IP..."></textarea>
        <button onclick="gen()">生成卡片</button>
        <div id="res"></div>
        <a id="downloadBtn" class="dl-btn" onclick="downloadImage()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            下载保存卡片
        </a>
        <p style="margin-top:20px; font-size:10px; opacity:0.3">POWERED BY CLOUDFLARE WORKERS</p>
    </div>

    <script>
        let imgData = '';
        function px(e) { up((window.innerWidth/2-e.pageX)/50, (window.innerHeight/2-e.pageY)/50); }
        function tx(e) { up((window.innerWidth/2-e.touches[0].pageX)/50, (window.innerHeight/2-e.touches[0].pageY)/50); }
        function up(x,y) { document.documentElement.style.setProperty('--p-x',x+'px'); document.documentElement.style.setProperty('--p-y',y+'px'); }

        async function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            const resDiv = document.getElementById('res');
            const dlBtn = document.getElementById('downloadBtn');
            const targetUrl = window.location.origin + '?server=' + encodeURIComponent(ip);
            
            const img = new Image();
            img.onload = () => { 
                resDiv.innerHTML = ''; 
                resDiv.appendChild(img);
                dlBtn.classList.add('show');
                imgData = targetUrl;
            };
            img.src = targetUrl;
        }

        async function downloadImage() {
            if(!imgData) return;
            try {
                const response = await fetch(imgData);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'mc-server-card.svg';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (e) {
                // 如果 fetch 失败（跨域限制），则尝试直接在新窗口打开
                window.open(imgData, '_blank');
            }
        }
    </script>
</body>
</html>\`;