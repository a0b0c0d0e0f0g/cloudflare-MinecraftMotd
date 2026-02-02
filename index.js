export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const serverIP = url.searchParams.get("server");

    // 如果没有参数，返回网页版 UI
    if (!serverIP) {
      return new Response(htmlTemplate, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    // 如果有参数，返回生成的卡片图片
    return handleImageRequest(serverIP);
  }
};

async function handleImageRequest(serverIP) {
  // 使用更强大的 MCAPI 数据源
  const apiUrl = `https://mcapi.us/server/status?ip=${encodeURIComponent(serverIP)}`;
  
  try {
    const res = await fetch(apiUrl, { 
      headers: { "User-Agent": "MC-Status-Worker/1.3" },
      cf: { cacheTtl: 60 } // 缓存 60 秒，减轻 API 压力
    });
    const data = await res.json();
    
    const isOnline = data.status === "success" && data.online;
    
    // --- 数据提取 ---
    const version = isOnline ? (data.server.name || "Unknown") : "N/A";
    const playersNow = isOnline ? data.players.now : 0;
    const playersMax = isOnline ? data.players.max : 0;
    
    // 处理玩家列表 (取前 5 个防止卡片溢出)
    let playerListText = "None";
    if (isOnline && data.players.list && data.players.list.length > 0) {
      const list = data.players.list.slice(0, 5);
      playerListText = list.join(", ");
      if (data.players.list.length > 5) playerListText += "...";
    }

    // 清洗 MOTD (去掉样式代码)
    const cleanMotd = (isOnline ? data.motd : "Server is currently offline.")
      .replace(/§[0-9a-fk-or]/gi, "")
      .replace(/\n/g, " ")
      .substring(0, 45);

    // 图标处理
    const iconData = (isOnline && data.favicon) ? data.favicon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";

    // --- SVG 模板生成 ---
    const svg = `
    <svg width="450" height="150" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e1e2e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#313244;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="15" fill="url(#grad)" stroke="#45475a" stroke-width="2"/>
      
      <image href="${iconData}" x="20" y="25" width="70" height="70" />
      
      <text x="105" y="38" font-family="Segoe UI,Arial" font-size="20" fill="#f5e0dc" font-weight="bold">${serverIP}</text>
      <text x="105" y="58" font-family="Segoe UI,Arial" font-size="13" fill="#fab387">Version: ${version}</text>
      
      <text x="105" y="82" font-family="Segoe UI,Arial" font-size="14" fill="#bac2de">${cleanMotd}</text>
      
      <rect x="105" y="100" width="${isOnline ? 100 : 60}" height="20" rx="10" fill="${isOnline ? '#a6e3a1' : '#f38ba8'}" fill-opacity="0.2"/>
      <circle cx="115" cy="110" r="4" fill="${isOnline ? '#a6e3a1' : '#f38ba8'}"/>
      <text x="125" y="114" font-family="Segoe UI,Arial" font-size="12" font-weight="bold" fill="${isOnline ? '#a6e3a1' : '#f38ba8'}">
        ${isOnline ? playersNow + ' / ' + playersMax : 'OFFLINE'}
      </text>

      <text x="105" y="135" font-family="Segoe UI,Arial" font-size="11" fill="#94e2d5" font-style="italic">Players: ${playerListText}</text>
    </svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (e) {
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"><text x="10" y="30" fill="red">Error Loading Status</text></svg>`, { 
      headers: { "Content-Type": "image/svg+xml" } 
    });
  }
}

// 网页前端模板
const htmlTemplate = \`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minecraft 服务器卡片生成器</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #11111b; color: #cdd6f4; display: flex; flex-direction: column; align-items: center; padding-top: 50px; }
        .container { background: #1e1e2e; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 90%; max-width: 500px; text-align: center; }
        input { width: 80%; padding: 12px; margin: 10px 0; border: none; border-radius: 8px; background: #313244; color: white; }
        button { padding: 12px 25px; border: none; border-radius: 8px; background: #89b4fa; color: #11111b; font-weight: bold; cursor: pointer; transition: 0.3s; }
        button:hover { background: #b4befe; }
        #preview { margin-top: 25px; }
        .code-box { background: #181825; padding: 15px; margin-top: 20px; border-radius: 8px; font-size: 12px; text-align: left; overflow-x: auto; display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h2>MC 状态卡片生成器</h2>
        <p style="color: #a6adc8; font-size: 14px;">显示在线人数、版本及玩家列表</p>
        <input type="text" id="ip" placeholder="输入服务器 IP (例如: play.hypixel.net)">
        <button onclick="generate()">生成卡片</button>
        <div id="preview"></div>
        <div id="code" class="code-box"></div>
    </div>

    <script>
        function generate() {
            const ip = document.getElementById('ip').value;
            if(!ip) return alert('请输入 IP');
            const url = window.location.origin + '?server=' + encodeURIComponent(ip);
            document.getElementById('preview').innerHTML = '<h3>预览:</h3><img src="' + url + '" />';
            const codeBox = document.getElementById('code');
            codeBox.style.display = 'block';
            codeBox.innerText = '![MC Status](' + url + ')';
        }
    </script>
</body>
</html>
\`;