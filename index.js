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
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";
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
        :root {
            --bg-blur: 20px;
            --bg-opacity: 0.15;
            --saturate: 150%;
            --parallax-x: 0px;
            --parallax-y: 0px;
        }
        .liquid-mode { --bg-blur: 45px; --bg-opacity: 0.08; --saturate: 280%; }

        body { 
            margin: 0; padding: 0; height: 100vh; display: flex; align-items: center; justify-content: center;
            font-family: -apple-system, system-ui, sans-serif;
            background: #000; overflow: hidden; touch-action: none;
        }

        #bg-layer {
            position: fixed; top: -10%; left: -10%; width: 120%; height: 120%;
            background: url('https://other.api.yilx.cc/api/moe') no-repeat center center;
            background-size: cover; z-index: -2;
            transform: translate(calc(var(--parallax-x) * -1.2), calc(var(--parallax-y) * -1.2));
            transition: transform 0.2s ease-out;
        }

        .box { 
            background: rgba(255, 255, 255, var(--bg-opacity)); 
            backdrop-filter: blur(var(--bg-blur)) saturate(var(--saturate)); 
            -webkit-backdrop-filter: blur(var(--bg-blur)) saturate(var(--saturate));
            padding: 35px 25px; border-radius: 45px; 
            width: 88%; max-width: 400px; text-align: center; 
            box-shadow: 0 40px 80px rgba(0,0,0,0.6);
            border: 1px solid rgba(255, 255, 255, 0.2); color: white;
            transform: translate(var(--parallax-x), var(--parallax-y));
            transition: 0.1s linear; z-index: 10;
        }

        .switch-container {
            display: flex; align-items: center; justify-content: space-between;
            background: rgba(0,0,0,0.2); padding: 12px 18px; border-radius: 20px; margin-bottom: 20px;
        }
        
        .ios-switch {
            position: relative; width: 51px; height: 31px;
            appearance: none; background: #39393d; border-radius: 16px; cursor: pointer;
        }
        .ios-switch:checked { background: #34C759; }
        .ios-switch::after {
            content: ""; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px;
            background: white; border-radius: 50%; transition: 0.3s cubic-bezier(0.3, 0.8, 0.4, 1.2);
        }
        .ios-switch:checked::after { transform: translateX(20px); }

        textarea { 
            width: 100%; min-height: 54px; padding: 16px; margin-bottom: 15px; 
            border-radius: 20px; border: none; background: rgba(0, 0, 0, 0.3); 
            color: white; font-size: 16px; outline: none; box-sizing: border-box;
        }
        
        button { 
            background: white; color: black; border: none; height: 54px; 
            border-radius: 20px; font-weight: 700; width: 100%; font-size: 16px;
        }

        #res img { width: 100%; border-radius: 35px; margin-top: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }

        /* Action Sheet 样式 */
        #actionSheet {
            position: fixed; bottom: -100%; left: 0; right: 0;
            background: rgba(28, 28, 30, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border-radius: 30px 30px 0 0; padding: 20px; z-index: 100;
            transition: bottom 0.5s cubic-bezier(0.15, 0, 0.2, 1);
            text-align: center;
        }
        #actionSheet.show { bottom: 0; }
        .sheet-line { width: 40px; height: 5px; background: rgba(255,255,255,0.2); border-radius: 3px; margin: 0 auto 20px; }
        .sheet-btn { 
            background: rgba(255,255,255,0.1); color: #0A84FF; padding: 15px; 
            border-radius: 15px; margin-bottom: 10px; font-weight: 600; cursor: pointer;
        }
    </style>
</head>
<body onmousemove="parallax(event)" ontouchmove="touchParallax(event)">
    <div id="bg-layer"></div>
    
    <div class="box" id="mainBox">
        <div class="switch-container">
            <span style="font-size: 14px; font-weight: 600;">液态玻璃效果</span>
            <input type="checkbox" class="ios-switch" id="glassToggle" onchange="toggleGlass()">
        </div>
        <textarea id="ip" placeholder="输入服务器地址..."></textarea>
        <button onclick="gen()">生成卡片</button>
        <div id="res"></div>
        <div style="margin-top:20px; font-size:11px; opacity:0.3">© 2026 MC STATUS CARD</div>
    </div>

    <div id="actionSheet">
        <div class="sheet-line"></div>
        <p style="color:white; margin-bottom:20px; font-size:14px">卡片已生成</p>
        <div class="sheet-btn" onclick="copyLink()">复制图片链接</div>
        <div class="sheet-btn" style="color:#FF453A" onclick="hideSheet()">取消</div>
        <p style="color:rgba(255,255,255,0.4); font-size:12px; margin-top:10px">提示：PC端可右键保存，手机端请长按图片</p>
    </div>

    <script>
        let currentUrl = '';
        function parallax(e) {
            const x = (window.innerWidth / 2 - e.pageX) / 50;
            const y = (window.innerHeight / 2 - e.pageY) / 50;
            updatePos(x, y);
        }
        function touchParallax(e) {
            const touch = e.touches[0];
            const x = (window.innerWidth / 2 - touch.pageX) / 50;
            const y = (window.innerHeight / 2 - touch.pageY) / 50;
            updatePos(x, y);
        }
        function updatePos(x, y) {
            document.documentElement.style.setProperty('--parallax-x', x + 'px');
            document.documentElement.style.setProperty('--parallax-y', y + 'px');
        }

        function toggleGlass() { document.getElementById('mainBox').classList.toggle('liquid-mode'); }
        function hideSheet() { document.getElementById('actionSheet').classList.remove('show'); }

        async function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            currentUrl = window.location.origin + '?server=' + encodeURIComponent(ip);
            const resDiv = document.getElementById('res');
            const img = new Image();
            img.onload = () => { 
                resDiv.innerHTML = ''; 
                resDiv.appendChild(img);
                document.getElementById('actionSheet').classList.add('show');
            };
            img.src = currentUrl;
        }

        function copyLink() {
            navigator.clipboard.writeText(currentUrl);
            alert('链接已复制到剪贴板');
            hideSheet();
        }
    </script>
</body>
</html>