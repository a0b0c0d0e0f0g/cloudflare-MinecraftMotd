export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const serverIP = url.searchParams.get("server");

    if (serverIP) {
      return handleImageRequest(serverIP);
    } else {
      return new Response(htmlTemplate, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }
  }
};

async function handleImageRequest(serverIP) {
  const apiUrl = `https://mcapi.us/server/status?ip=${encodeURIComponent(serverIP)}`;
  try {
    const res = await fetch(apiUrl, { headers: { "User-Agent": "MC-Status-Worker/1.1" } });
    const data = await res.json();
    const isOnline = data.status === "success" && data.online;
    
    // 玩家数据处理
    const playersNow = isOnline ? data.players.now : 0;
    const playersMax = isOnline ? data.players.max : 0;
    const playerList = (isOnline && data.players.list) ? data.players.list.slice(0, 10) : []; // 仅显示前10个
    
    const cleanMotd = (isOnline ? data.motd : "Server Offline").replace(/§[0-9a-fk-or]/gi, "").substring(0, 45);
    const iconData = (isOnline && data.favicon) ? data.favicon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5AgKDA8XAzZ9dwAAAYZJREFUeNrt279Lw1AUxvHvpS3+ARZpBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXBycXByfXv8AAtXvB5vPsh0AAAAASUVORK5CYII=";

    // 根据是否有玩家列表动态计算高度
    const hasPlayers = playerList.length > 0;
    const svgHeight = hasPlayers ? 160 : 120;

    let playerNames = hasPlayers ? "Online: " + playerList.join(", ") : "No players online or list hidden";
    if (playerList.length >= 10) playerNames += "...";

    const svg = `<svg width="450" height="${svgHeight}" viewBox="0 0 450 ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="450" height="${svgHeight}" rx="14" fill="#1a1b26" stroke="#414868" stroke-width="2"/>
      <defs><clipPath id="round-icon"><rect x="20" y="28" width="64" height="64" rx="10"/></clipPath></defs>
      <image x="20" y="28" width="64" height="64" href="${iconData}" clip-path="url(#round-icon)"/>
      <circle cx="102" cy="36" r="5" fill="${isOnline ? "#4ade80" : "#f87171"}"/>
      <text x="115" y="42" font-family="sans-serif" font-weight="bold" font-size="18" fill="#7aa2f7">${serverIP}</text>
      <text x="100" y="70" font-family="monospace" font-size="14" fill="#c0caf5">${cleanMotd}</text>
      <text x="100" y="98" font-family="sans-serif" font-size="12" fill="#565f89">PLAYERS: ${playersNow} / ${playersMax}</text>
      ${hasPlayers ? `<text x="100" y="130" font-family="sans-serif" font-size="11" fill="#9ece6a">${playerNames}</text>` : ""}
    </svg>`;
    
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" } });
  } catch (e) { return new Response("Error", { status: 500 }); }
}

const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>MC 服务器状态生成器</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #1a1b26; color: #c0caf5; font-family: 'Segoe UI', system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .container-box { background: #24283b; border-radius: 20px; padding: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.4); width: 100%; max-width: 550px; }
        .input-group { background: #1f2335; border-radius: 12px; padding: 5px; border: 1px solid #414868; }
        input { background: transparent !important; border: none !important; color: white !important; box-shadow: none !important; }
        .btn-primary { background: #7aa2f7; border: none; border-radius: 10px; padding: 10px 25px; transition: 0.3s; }
        .btn-primary:hover { background: #89b4fa; transform: translateY(-2px); }
        .preview-area { background: #16161e; border-radius: 15px; margin-top: 30px; padding: 20px; min-height: 180px; display: flex; align-items: center; justify-content: center; flex-direction: column; }
        code { color: #bb9af7; }
        .code-box { background: #1a1b26; padding: 15px; border-radius: 10px; margin-top: 20px; display: none; border-left: 4px solid #7aa2f7; }
    </style>
</head>
<body>
    <div class="container-box">
        <h3 class="mb-4 text-center">Minecraft 服务器状态卡片</h3>
        <div class="input-group mb-3">
            <input type="text" id="ipInput" class="form-control" placeholder="输入服务器地址 (如: play.hypixel.net)">
            <button class="btn btn-primary" onclick="generate()">确定</button>
        </div>

        <div class="preview-area" id="previewArea">
            <span class="text-muted">等待生成预览...</span>
        </div>

        <div id="codeBox" class="code-box">
            <label class="small text-muted mb-2 d-block">Markdown 代码:</label>
            <code id="mdLink"></code>
        </div>
    </div>

    <script>
        function generate() {
            const ip = document.getElementById('ipInput').value.trim();
            if (!ip) return alert("请输入服务器 IP");
            
            const baseUrl = window.location.origin + window.location.pathname;
            const fullUrl = baseUrl + '?server=' + ip + '&t=' + Date.now();
            
            document.getElementById('previewArea').innerHTML = \`
                <p class="small text-muted mb-2">预览：</p>
                <img src="\${fullUrl}" style="max-width: 100%; height: auto; border-radius: 8px;">
            \`;
            
            document.getElementById('codeBox').style.display = 'block';
            document.getElementById('mdLink').innerText = \`![MC Status](\${baseUrl}?server=\${ip})\`;
        }
    </script>
</body>
</html>
`;