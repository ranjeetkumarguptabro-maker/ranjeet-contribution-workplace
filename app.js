/**
 * RANJEET'S CONTRIBUTION WORKPLACE · INTERACTIVE ENGINE v2.6
 * Real-time GitHub Telemetry, 3D Perspective Tilt, Radar Stress Chart & Cert Lightbox
 * Copyright (c) 2026 Ranjeet Kumar Gupta
 */

(() => {
  'use strict';

  // --- CONFIGURATION ---
  const USERNAME = 'ranjeetkumarguptabro-maker';
  const API_GITHUB = 'https://api.github.com';
  const API_CONTRIB = `https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=last`;

  // --- STATE ---
  const state = {
    audioEnabled: localStorage.getItem('ranjeet_sfx') !== 'false',
    lightingMode: 0, // 0: Normal, 1: Night, 2: Cyberpunk
    fanSpeed: 1, // 0: Quiet, 1: Normal, 2: Turbo
    activeTab: 'grafana',
    timeRange: '24h',
    profile: null,
    repos: [],
    events: [],
    contributions: [],
    totalContributions: 322,
    activeNode: null,
    cpuBase: 42,
    ramBase: 68,
    p95Base: 132,
    pcCpuBase: 38,
    radarTick: 0
  };

  // --- DOM CACHE ---
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- AUDIO SYNTHESIZER (Pure HTML5 Web Audio API) ---
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.06) {
    if (!state.audioEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  const sfx = {
    click: () => playTone(880, 'triangle', 0.05, 0.05),
    tab: () => {
      playTone(520, 'sine', 0.04, 0.04);
      setTimeout(() => playTone(780, 'sine', 0.05, 0.04), 30);
    },
    chime: () => {
      playTone(523.25, 'sine', 0.1, 0.08); // C5
      setTimeout(() => playTone(659.25, 'sine', 0.12, 0.08), 70); // E5
      setTimeout(() => playTone(783.99, 'sine', 0.18, 0.08), 140); // G5
    },
    sip: () => {
      playTone(320, 'square', 0.06, 0.04);
      setTimeout(() => playTone(480, 'sine', 0.08, 0.05), 50);
    },
    turbo: () => {
      playTone(220, 'sawtooth', 0.15, 0.05);
      setTimeout(() => playTone(440, 'sawtooth', 0.2, 0.05), 100);
    },
    toggle: () => playTone(660, 'sine', 0.06, 0.04),
    boot: () => {
      playTone(440, 'sine', 0.15, 0.07);
      setTimeout(() => playTone(880, 'triangle', 0.25, 0.08), 120);
    }
  };

  // --- TERMINAL LOGGING ---
  function logTerminal(message, type = 'info') {
    const term = $('terminalLog');
    if (!term) return;
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `term-line ${type}`;
    line.textContent = `[${time}] ${message}`;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
  }

  // --- CLOCK TELEMETRY ---
  function updateClock() {
    const now = new Date();
    const rigaTime = now.toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Europe/Riga' });
    const utcTime = now.toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' });
    const clockEl = $('hudClock');
    if (clockEl) {
      clockEl.textContent = `RIGA ${rigaTime} · UTC ${utcTime}`;
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --- 3D PERSPECTIVE TILT ON STAGE ---
  function init3DTilt() {
    const frame = $('workstationFrame');
    const stage = $('stage');
    if (!frame || !stage) return;

    frame.addEventListener('mousemove', (e) => {
      const rect = frame.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Max rotation: 3.5 degrees for subtle high-tech 3D depth
      const rotX = ((y - centerY) / centerY) * -3.2;
      const rotY = ((x - centerX) / centerX) * 3.2;

      stage.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`;
    });

    frame.addEventListener('mouseleave', () => {
      stage.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  }

  // --- FIRST VISIT BOOT SEQUENCE ---
  function initBootSequence() {
    const overlay = $('bootOverlay');
    const skipBtn = $('bootSkipBtn');
    const replayBtn = $('replayBootBtn');

    function closeBoot() {
      sfx.boot();
      if (overlay) overlay.classList.add('hidden');
      sessionStorage.setItem('ranjeet_boot_shown', 'true');
      logTerminal('[SYS] Telemetry stream unlocked. Workstation 3D view operational.', 'success');
    }

    if (skipBtn) skipBtn.addEventListener('click', closeBoot);

    // If already visited this session, hide overlay
    if (sessionStorage.getItem('ranjeet_boot_shown') === 'true') {
      if (overlay) overlay.classList.add('hidden');
    }

    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        sfx.click();
        if (overlay) {
          overlay.classList.remove('hidden');
          // Re-trigger audio
          setTimeout(sfx.boot, 200);
        }
      });
    }
  }

  // --- GITHUB API DATA FETCHING ---
  async function fetchJSON(url) {
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function loadGitHubData() {
    const statusPulse = $('statusPulse');
    const apiStatusText = $('apiStatusText');
    if (apiStatusText) apiStatusText.textContent = 'SYNCING GITHUB TELEMETRY...';
    if (statusPulse) statusPulse.style.background = '#ffe34f';
    logTerminal('Contacting GitHub Public API & Contributions API...', 'info');

    try {
      const [profileData, reposData, eventsData, contribData] = await Promise.allSettled([
        fetchJSON(`${API_GITHUB}/users/${USERNAME}`),
        fetchJSON(`${API_GITHUB}/users/${USERNAME}/repos?per_page=100&sort=updated`),
        fetchJSON(`${API_GITHUB}/users/${USERNAME}/events/public?per_page=30`),
        fetchJSON(API_CONTRIB)
      ]);

      // Profile
      if (profileData.status === 'fulfilled') {
        state.profile = profileData.value;
        $('statRepos').textContent = state.profile.public_repos || 21;
        $('bioName').textContent = state.profile.name || USERNAME;
      }

      // Repositories
      if (reposData.status === 'fulfilled') {
        state.repos = reposData.value;
        const totalStars = state.repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
        $('statStars').textContent = totalStars;
      }

      // Activity Feed
      if (eventsData.status === 'fulfilled') {
        state.events = eventsData.value;
        renderActivityFeed(state.events);
      }

      // Contributions
      if (contribData.status === 'fulfilled' && contribData.value.contributions) {
        state.contributions = contribData.value.contributions;
        // Calculate dynamic total from API array or total object
        const sum = state.contributions.reduce((acc, d) => acc + (d.count || 0), 0);
        state.totalContributions = Math.max(322, sum, contribData.value.total?.lastYear || 322);
        $('statContribs').textContent = `${state.totalContributions}+`;
        $('headerContribCount').textContent = `${state.totalContributions} COMMITS (2025-2026)`;
        $('stressCommitsNum').textContent = `${state.totalContributions}+`;
        renderContributionGrid(state.contributions);
        logTerminal(`[OK] Mounted ${state.totalContributions} live GitHub contributions into workplace grid!`, 'success');
      } else {
        renderFallbackContributionGrid();
      }

      if (apiStatusText) apiStatusText.textContent = 'GITHUB CONNECTED';
      if (statusPulse) statusPulse.style.background = '#39e58c';
      $('lastSyncedTime').textContent = `Last synced: ${new Date().toLocaleTimeString()}`;

    } catch (err) {
      logTerminal(`[WARN] API connection error: ${err.message}. Using baseline telemetry.`, 'warn');
      if (apiStatusText) apiStatusText.textContent = 'GITHUB TELEMETRY ACTIVE (CACHED)';
      if (statusPulse) statusPulse.style.background = '#38e1ff';
      renderFallbackContributionGrid();
    }
  }

  // --- ACTIVITY FEED ---
  function renderActivityFeed(events) {
    const container = $('activityFeedContainer');
    if (!container) return;
    if (!events || events.length === 0) return;

    container.innerHTML = events.slice(0, 4).map(e => {
      const type = (e.type || 'Event').replace('Event', '').toUpperCase();
      const repo = (e.repo?.name || 'repo').split('/').pop();
      const badgeClass = type === 'PUSH' ? 'push' : 'create';
      const date = new Date(e.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `
        <div class="feed-item">
          <span class="badge ${badgeClass}">${type}</span>
          <span class="repo">${repo}</span>
          <span class="time">${date}</span>
        </div>
      `;
    }).join('');
  }

  // --- CONTRIBUTION HEATMAP GRID ---
  function renderContributionGrid(days) {
    const grid = $('heatmapGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const recentDays = days.slice(-364);

    recentDays.forEach(d => {
      const cell = document.createElement('div');
      let level = 0;
      if (d.count >= 9) level = 3;
      else if (d.count >= 5) level = 2;
      else if (d.count >= 1) level = 1;

      cell.className = `heat-cell l${level}`;
      cell.dataset.date = d.date;
      cell.dataset.count = d.count;

      cell.addEventListener('mouseenter', (e) => showTooltip(e, `${d.count} commits on ${d.date}`));
      cell.addEventListener('mouseleave', hideTooltip);
      cell.addEventListener('click', () => {
        sfx.click();
        logTerminal(`[COMMIT INSPECT] ${d.date}: ${d.count} contributions recorded.`, 'info');
      });

      grid.appendChild(cell);
    });
  }

  function renderFallbackContributionGrid() {
    const grid = $('heatmapGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const today = new Date();

    for (let i = 363; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const rand = (Math.sin(i * 12.3) + 1) / 2;
      let count = 0;
      let level = 0;
      if (rand > 0.88) { count = Math.floor(rand * 11); level = 3; }
      else if (rand > 0.72) { count = Math.floor(rand * 7); level = 2; }
      else if (rand > 0.45) { count = Math.floor(rand * 4); level = 1; }

      const cell = document.createElement('div');
      cell.className = `heat-cell l${level}`;
      cell.dataset.date = dateStr;
      cell.dataset.count = count;

      cell.addEventListener('mouseenter', (e) => showTooltip(e, `${count} commits on ${dateStr}`));
      cell.addEventListener('mouseleave', hideTooltip);
      cell.addEventListener('click', () => {
        sfx.click();
        logTerminal(`[COMMIT INSPECT] ${dateStr}: ${count} contributions.`, 'info');
      });

      grid.appendChild(cell);
    }
  }

  // --- RETRO TOOLTIP ---
  const tooltip = $('retroTooltip');
  function showTooltip(e, text) {
    if (!tooltip) return;
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    const stage = $('stage');
    const stageRect = stage.getBoundingClientRect();
    const x = e.clientX - stageRect.left + 10;
    const y = e.clientY - stageRect.top - 28;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }
  function hideTooltip() {
    if (tooltip) tooltip.style.display = 'none';
  }

  // --- 360° / 90° POLAR RADAR GRAPH (STRESS LOAD) ---
  function initRadarGraph() {
    const canvas = $('radarCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = w * 0.4;

    // Metrics configuration:
    // North (90° / -PI/2): Commits (94%)
    // East (360°/0° / 0 rad): PRs (68%)
    // South (270° / PI/2): Forks (48%)
    // West (180° / PI): Stars (38%)
    const axes = [
      { name: 'Commits (90°)', val: 0.94, num: '322+', color: '#ff2a55', angle: -Math.PI / 2 },
      { name: 'PRs (360°)', val: 0.68, num: '28', color: '#ff9028', angle: 0 },
      { name: 'Forks (270°)', val: 0.48, num: '16', color: '#38e1ff', angle: Math.PI / 2 },
      { name: 'Stars (180°)', val: 0.38, num: '12', color: '#ba54ff', angle: Math.PI }
    ];

    function renderRadar() {
      state.radarTick++;
      ctx.clearRect(0, 0, w, h);

      // 1. Concentric circles (25%, 50%, 75%, 100%)
      ctx.strokeStyle = '#142a4a';
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1.0].forEach(level => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * level, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 2. Cross Axes (90° vertical & 360° horizontal)
      ctx.strokeStyle = '#1c3d69';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      // Horizontal
      ctx.moveTo(cx - maxR - 10, cy);
      ctx.lineTo(cx + maxR + 10, cy);
      // Vertical
      ctx.moveTo(cx, cy - maxR - 10);
      ctx.lineTo(cx, cy + maxR + 10);
      ctx.stroke();

      // 3. Dynamic Pulsing Polygon Web
      const pulse = Math.sin(state.radarTick * 0.05) * 0.03;
      ctx.beginPath();
      axes.forEach((axis, i) => {
        const r = maxR * (axis.val + pulse);
        const x = cx + Math.cos(axis.angle) * r;
        const y = cy + Math.sin(axis.angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      // Gradient Fill
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
      grad.addColorStop(0, 'rgba(56, 225, 255, 0.35)');
      grad.addColorStop(0.7, 'rgba(186, 84, 255, 0.2)');
      grad.addColorStop(1, 'rgba(255, 42, 85, 0.15)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = '#38e1ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38e1ff';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 4. Axis Data Points & Labels
      axes.forEach(axis => {
        const r = maxR * (axis.val + pulse);
        const x = cx + Math.cos(axis.angle) * r;
        const y = cy + Math.sin(axis.angle) * r;

        // Glowing dot
        ctx.fillStyle = axis.color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label on outer edge
        const lx = cx + Math.cos(axis.angle) * (maxR + 18);
        const ly = cy + Math.sin(axis.angle) * (maxR + 18);
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#a6c5eb';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${axis.name.split(' ')[0]} (${axis.num})`, lx, ly);
      });

      requestAnimationFrame(renderRadar);
    }

    renderRadar();
  }

  // --- CANVAS ANIMATIONS ENGINE (GRAFANA) ---
  function initCanvasGraphs() {
    const cGreen = $('canvasGreenWave');
    const cYellow = $('canvasYellowWave');
    const cCyan = $('canvasCyanBars');
    const cStacked = $('canvasStackedBars');
    const cPurple = $('canvasPurpleBars');
    const cEcg = $('pcEcgCanvas');
    const cPacket = $('packetCanvas');

    let tick = 0;

    function renderFrame() {
      tick++;

      // Time scale multiplier (1h: fast, 24h: normal, 7d: slower/denser)
      const speed = state.timeRange === '1h' ? 2.2 : state.timeRange === '7d' ? 0.7 : 1.3;

      // 1. Green Mountain Wave Canvas
      if (cGreen) {
        const ctx = cGreen.getContext('2d');
        const w = cGreen.width;
        const h = cGreen.height;
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(57, 229, 140, 0.25)';
        ctx.strokeStyle = '#39e58c';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) {
          const y = h - 10 - Math.sin((x + tick * speed) * 0.08) * 10 - Math.cos((x + tick * 0.8) * 0.15) * 6;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 2. Yellow Wave Canvas
      if (cYellow) {
        const ctx = cYellow.getContext('2d');
        const w = cYellow.width;
        const h = cYellow.height;
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(255, 227, 79, 0.2)';
        ctx.strokeStyle = '#ffe34f';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) {
          const y = h - 8 - Math.sin((x + tick * speed * 0.8) * 0.06) * 8 - Math.sin((x - tick * 1.5) * 0.12) * 5;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 3. Cyan Bars Canvas
      if (cCyan && tick % 4 === 0) {
        const ctx = cCyan.getContext('2d');
        const w = cCyan.width;
        const h = cCyan.height;
        ctx.clearRect(0, 0, w, h);

        const barCount = 12;
        const barW = (w / barCount) - 2;
        ctx.fillStyle = '#38e1ff';

        for (let i = 0; i < barCount; i++) {
          const bh = 8 + ((Math.sin(i * 0.8 + tick * 0.2) + 1) / 2) * (h - 12);
          ctx.fillRect(i * (barW + 2), h - bh, barW, bh);
        }
      }

      // 4. Stacked Status Bars Canvas
      if (cStacked && tick % 6 === 0) {
        const ctx = cStacked.getContext('2d');
        const w = cStacked.width;
        const h = cStacked.height;
        ctx.clearRect(0, 0, w, h);

        const numBars = 16;
        const bw = (w / numBars) - 2;

        for (let i = 0; i < numBars; i++) {
          const totalH = 10 + ((Math.sin(i * 0.5 + tick * 0.15) + 1) / 2) * (h - 14);
          const split = totalH * 0.65;
          // Yellow lower (2xx OK)
          ctx.fillStyle = '#ffe34f';
          ctx.fillRect(i * (bw + 2), h - split, bw, split);
          // Pink upper (4xx warning)
          ctx.fillStyle = '#ff2a55';
          ctx.fillRect(i * (bw + 2), h - totalH, bw, totalH - split);
        }
      }

      // 5. Purple Pod Replicas Canvas
      if (cPurple && tick % 5 === 0) {
        const ctx = cPurple.getContext('2d');
        const w = cPurple.width;
        const h = cPurple.height;
        ctx.clearRect(0, 0, w, h);

        const bars = 8;
        const bw = (w / bars) - 2;
        ctx.fillStyle = '#ba54ff';

        for (let i = 0; i < bars; i++) {
          const bh = 12 + Math.floor(((Math.sin(i * 1.1 + tick * 0.1) + 1) / 2) * (h - 16));
          ctx.fillRect(i * (bw + 2), h - bh, bw, bh);
        }
      }

      // 6. PC Case ECG Line Canvas
      if (cEcg) {
        const ctx = cEcg.getContext('2d');
        const w = cEcg.width;
        const h = cEcg.height;
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = '#39e58c';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const midY = h / 2;

        for (let x = 0; x < w; x += 2) {
          const offset = (x + tick * 2) % 60;
          let y = midY;
          if (offset > 20 && offset < 28) {
            y = midY - 5;
          } else if (offset >= 28 && offset < 36) {
            y = midY + 5;
          }
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 7. Right Monitor Packet Flow Canvas (AWS Architecture)
      if (cPacket) {
        const ctx = cPacket.getContext('2d');
        const w = cPacket.width = cPacket.offsetWidth;
        const h = cPacket.height = cPacket.offsetHeight;
        ctx.clearRect(0, 0, w, h);

        drawPacket(ctx, w * 0.1, h * 0.42, w * 0.31, h * 0.42, tick, '#38e1ff', 0);
        drawPacket(ctx, w * 0.31, h * 0.42, w * 0.55, h * 0.35, tick, '#ff9028', 25);
        drawPacket(ctx, w * 0.55, h * 0.35, w * 0.81, h * 0.42, tick, '#38e1ff', 50);
        drawPacket(ctx, w * 0.1, h * 0.42, w * 0.31, h * 0.78, tick, '#39e58c', 35);
        drawPacket(ctx, w * 0.1, h * 0.42, w * 0.56, h * 0.78, tick, '#ba54ff', 65);
        drawPacket(ctx, w * 0.55, h * 0.35, w * 0.83, h * 0.78, tick, '#ff2a55', 40);
      }

      requestAnimationFrame(renderFrame);
    }

    renderFrame();
  }

  function drawPacket(ctx, x1, y1, x2, y2, tick, color, offset) {
    const progress = ((tick + offset) % 60) / 60;
    const px = x1 + (x2 - x1) * progress;
    const py = y1 + (y2 - y1) * progress;

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // --- DYNAMIC METRICS FLUCTUATION ---
  function initMetricsSimulation() {
    setInterval(() => {
      const cpu = Math.min(99, Math.max(10, Math.round(state.cpuBase + (Math.random() * 6 - 3))));
      const ram = Math.min(99, Math.max(20, Math.round(state.ramBase + (Math.random() * 4 - 2))));
      const p95 = Math.round(state.p95Base + (Math.random() * 8 - 4));
      const pcCpu = Math.round(state.pcCpuBase + (Math.random() * 4 - 2));

      const gCpu = $('gaugeCpuVal');
      const gRam = $('gaugeRamVal');
      const gP95 = $('gaugeP95Val');
      if (gCpu) gCpu.textContent = `${cpu}%`;
      if (gRam) gRam.textContent = `${ram}%`;
      if (gP95) gP95.textContent = `${p95}ms`;

      const cpuFill = document.querySelector('.gauge-fill-green');
      const ramFill = document.querySelector('.gauge-fill-yellow');
      if (cpuFill) cpuFill.setAttribute('stroke-dasharray', `${cpu}, 100`);
      if (ramFill) ramFill.setAttribute('stroke-dasharray', `${ram}, 100`);

      const cpuText = $('cpuLoadText');
      if (cpuText) cpuText.textContent = `${cpu}%`;
      const pcCpuText = $('pcCpuReadout');
      if (pcCpuText) pcCpuText.textContent = `CPU ${pcCpu}%`;

    }, 2200);
  }

  // --- ARCHITECTURE HUD INSPECTION ---
  const nodeData = {
    users: {
      title: 'Global Clients & API Traffic',
      body: 'Inbound requests from global developers, mobile applications, and automated CI pipelines entering via Route 53 DNS routing.',
      meta: 'METRICS: 3,420 active sessions · Avg Latency: 24ms · SSL/TLS 1.3'
    },
    alb: {
      title: 'AWS Application Load Balancer',
      body: 'High-availability L7 load balancer handling SSL termination, path-based routing (/api, /auth, /ws), and health checks across microservices.',
      meta: 'METRICS: 99.999% uptime · 4.8k req/min · 0 5xx errors · Deployed via Terraform'
    },
    eks: {
      title: 'AWS Elastic Kubernetes Service (EKS)',
      body: 'Managed Kubernetes control plane orchestrating containerized microservices across multi-AZ auto-scaling worker node groups.',
      meta: 'METRICS: 12 Pods Running · Cluster v1.30 · Horizontal Pod Autoscaler active'
    },
    rds: {
      title: 'Amazon RDS PostgreSQL Database',
      body: 'Relational database engine configured with Multi-AZ automated failover, read replicas, automated daily snapshots, and KMS encryption.',
      meta: 'METRICS: db.r6g.xlarge · CPU: 24% · Storage: 120GB gp3 · Read IOPS: 1,240'
    },
    s3: {
      title: 'Amazon S3 Object Storage',
      body: 'High-durability (99.999999999%) cloud storage bucket hosting static web assets, application artifacts, and automated database backups.',
      meta: 'METRICS: 14.8 GB stored · AES-256 server-side encryption · Lifecycle policies enabled'
    },
    cloudfront: {
      title: 'AWS CloudFront Global Edge CDN',
      body: 'Low-latency Content Delivery Network caching static assets and dynamic API responses at edge points of presence worldwide.',
      meta: 'METRICS: 98.4% Cache Hit Ratio · Global PoPs · Integrated with ACM SSL'
    },
    cloudwatch: {
      title: 'AWS CloudWatch Observability & Telemetry',
      body: 'Centralized observability hub aggregating VPC flow logs, container insights, application metrics, and real-time automated alarm notifications.',
      meta: 'METRICS: 0 active alarms · 24 Dashboards · Log retention 30 days'
    }
  };

  function initArchitectureNodes() {
    const nodes = $$('.arch-node');
    const drawer = $('nodeDrawer');
    const drawerTitle = $('drawerTitle');
    const drawerBody = $('drawerBody');
    const drawerMeta = $('drawerMeta');
    const drawerClose = $('drawerCloseBtn');

    nodes.forEach(btn => {
      btn.addEventListener('click', () => {
        sfx.chime();
        const key = btn.dataset.node;
        const info = nodeData[key];
        if (!info) return;

        nodes.forEach(n => n.classList.remove('active'));
        btn.classList.add('active');

        drawerTitle.textContent = info.title;
        drawerBody.textContent = info.body;
        drawerMeta.textContent = info.meta;
        drawer.classList.add('open');

        logTerminal(`[AWS HUD] Inspected node: ${info.title}`, 'info');
      });
    });

    if (drawerClose) {
      drawerClose.addEventListener('click', () => {
        sfx.click();
        drawer.classList.remove('open');
        nodes.forEach(n => n.classList.remove('active'));
      });
    }
  }

  // --- SCREEN TABS (LEFT MONITOR) & TIME RANGE ---
  function initMonitorTabs() {
    const tabs = $$('.screen-tab');
    const panes = $$('.tab-pane');
    const title = $('leftMonitorTitle');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        sfx.tab();
        const target = tab.dataset.tab;
        state.activeTab = target;

        tabs.forEach(t => t.classList.toggle('active', t === tab));
        panes.forEach(p => {
          p.classList.toggle('active', p.id === `pane${target.charAt(0).toUpperCase() + target.slice(1)}`);
        });

        if (title) {
          title.textContent = target === 'grafana' ? 'Grafana' : 'Telemetry';
        }

        logTerminal(`[MONITOR] Left display tab: ${target.toUpperCase()}`, 'info');
      });
    });

    // Time range buttons
    const timeBtns = $$('.time-range-btn');
    timeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sfx.click();
        timeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.timeRange = btn.dataset.range;
        logTerminal(`[GRAFANA] Time range adjusted to: ${state.timeRange.toUpperCase()}`, 'info');
      });
    });

    // Gauge Click Handlers
    const cpuCard = $('gaugeCpuCard');
    const ramCard = $('gaugeRamCard');
    const p95Card = $('gaugeP95Card');

    if (cpuCard) cpuCard.addEventListener('click', () => {
      sfx.click();
      logTerminal('[METRIC] CPU Core Load: 42.4% avg across 8 cluster nodes.', 'info');
    });
    if (ramCard) ramCard.addEventListener('click', () => {
      sfx.click();
      logTerminal('[METRIC] Cluster RAM Utilization: 68.1% (21.8 GB / 32.0 GB used).', 'info');
    });
    if (p95Card) p95Card.addEventListener('click', () => {
      sfx.click();
      logTerminal('[METRIC] P95 Response Latency: 132ms (SLA target < 200ms).', 'info');
    });
  }

  // --- CERTIFICATE LIGHTBOX MODAL ---
  function initCertificates() {
    const modal = $('certModal');
    const modalImg = $('certModalImg');
    const modalTitle = $('certModalTitle');
    const closeBtn = $('certModalCloseBtn');

    const certK8s = $('certK8s');
    const certAws = $('certAws');

    if (certK8s) {
      certK8s.addEventListener('click', () => {
        sfx.chime();
        modalTitle.textContent = 'Introduction to Kubernetes (LFS158) · The Linux Foundation';
        modalImg.src = 'assets/certificates/kubernetes-lfs158.jpeg';
        modal.classList.add('open');
        logTerminal('[CREDENTIAL] Inspected Linux Foundation Kubernetes Certificate.', 'info');
      });
    }

    if (certAws) {
      certAws.addEventListener('click', () => {
        sfx.chime();
        modalTitle.textContent = 'AWS Cloud Practitioner Essentials · Amazon Web Services';
        modalImg.src = 'assets/certificates/aws-cloud-practitioner.jpeg';
        modal.classList.add('open');
        logTerminal('[CREDENTIAL] Inspected AWS Cloud Practitioner Certificate.', 'info');
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        sfx.click();
        modal.classList.remove('open');
      });
    }
  }

  // --- ROOM HOTSPOTS & EASTER EGGS ---
  function initRoomHotspots() {
    // 1. Tux Coffee Mug
    const tuxMug = $('tuxMug');
    if (tuxMug) {
      tuxMug.addEventListener('click', () => {
        sfx.sip();
        logTerminal('[COFFEE] ☕ Fresh coffee brewed! +50 Developer Energy. Ready to ship commits.', 'success');
        const puffs = $$('.steam-puff');
        puffs.forEach(p => {
          p.style.animation = 'none';
          void p.offsetWidth;
          p.style.animation = 'rise-steam 1.2s ease-out';
        });
      });
    }

    // 2. PC Tower Rig (Fan Speed boost)
    const pcRig = $('pcRig');
    const fanTag = $('fanModeTag');
    if (pcRig) {
      pcRig.addEventListener('click', () => {
        sfx.turbo();
        state.fanSpeed = (state.fanSpeed + 1) % 3;
        const modes = ['QUIET', 'NORMAL', 'TURBO'];
        const mode = modes[state.fanSpeed];
        if (fanTag) fanTag.textContent = mode;

        if (mode === 'TURBO') {
          pcRig.classList.add('turbo');
          logTerminal('[PC RIG] ⚡ Cooling fans boosted to TURBO mode (4,200 RPM)!', 'warn');
        } else {
          pcRig.classList.remove('turbo');
          logTerminal(`[PC RIG] Cooling fans set to ${mode} mode.`, 'info');
        }
      });
    }

    // 3. Desk Lamp (Light switch)
    const deskLamp = $('deskLamp');
    if (deskLamp) {
      deskLamp.addEventListener('click', () => {
        cycleLightingTheme();
      });
    }

    // 4. Tux Wall Portrait & Figurine
    const tuxQuotes = [
      '"Talk is cheap. Show me the code." — Linus Torvalds',
      '"In a world without fences, who needs Gates?"',
      '"Given enough eyeballs, all bugs are shallow." — Linus Law',
      '"Software is like sex: it’s better when it’s free." — Linus Torvalds'
    ];

    const tuxPortrait = $('tuxPortrait');
    if (tuxPortrait) {
      tuxPortrait.addEventListener('click', () => {
        sfx.click();
        const q = tuxQuotes[Math.floor(Math.random() * tuxQuotes.length)];
        logTerminal(`[TUX LINUX] ${q}`, 'info');
      });
    }

    const tuxFig = $('tuxFigurine');
    if (tuxFig) {
      tuxFig.addEventListener('click', () => {
        sfx.click();
        logTerminal('[LINUX MASCOT] 🐧 Tux says: "Kernel compilation complete, 0 warnings!"', 'success');
      });
    }

    // 5. AWS Sign on Shelf
    const awsShelf = $('awsShelf');
    if (awsShelf) {
      awsShelf.addEventListener('click', () => {
        sfx.chime();
        logTerminal('[AWS CLOUD] Architected with high availability, infrastructure as code & GitOps.', 'info');
        const eksNode = document.querySelector('.node-eks');
        if (eksNode) eksNode.click();
      });
    }
  }

  // --- LIGHTING THEMES ---
  function cycleLightingTheme() {
    sfx.toggle();
    state.lightingMode = (state.lightingMode + 1) % 3;
    const body = document.body;
    body.classList.remove('theme-default', 'theme-night', 'theme-cyberpunk');

    const label = $('themeLabel');

    if (state.lightingMode === 0) {
      body.classList.add('theme-default');
      if (label) label.textContent = 'STUDIO';
      logTerminal('[LIGHTING] Switched to Studio Warm Light mode.', 'info');
    } else if (state.lightingMode === 1) {
      body.classList.add('theme-night');
      if (label) label.textContent = 'NIGHT';
      logTerminal('[LIGHTING] Switched to Late Night Coding mode.', 'info');
    } else {
      body.classList.add('theme-cyberpunk');
      if (label) label.textContent = 'CYBERPUNK';
      logTerminal('[LIGHTING] Switched to Cyberpunk Neon mode.', 'info');
    }
  }

  // --- AUDIO TOGGLE ---
  function toggleAudio() {
    state.audioEnabled = !state.audioEnabled;
    localStorage.setItem('ranjeet_sfx', state.audioEnabled);
    const label = $('sfxLabel');
    if (label) label.textContent = state.audioEnabled ? 'SFX ON' : 'SFX MUTED';
    if (state.audioEnabled) sfx.click();
    logTerminal(`[AUDIO] 8-bit sound effects ${state.audioEnabled ? 'enabled' : 'muted'}.`, 'info');
  }

  // --- EMBED / README MODAL & CODE GENERATION ---
  function initEmbedModal() {
    const modal = $('readmeModal');
    const openBtn = $('readmeModalBtn');
    const closeBtn = $('modalCloseBtn');
    const doneBtn = $('modalDoneBtn');
    const copyBtn = $('copyCodeBtn');
    const textarea = $('markdownCodeArea');

    const markdownTemplate = `<div align="center">

# Ranjeet Kumar Gupta

### Computer Systems Student &bull; DevOps & Cloud Engineering

<p>
  <a href="https://www.linkedin.com/in/ranjeet-kumar-gupta-7b37132a3" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
  </a>
  <a href="https://github.com/ranjeetkumarguptabro-maker" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
</p>

## 🖥️ Interactive Contribution Workplace

<p>
  <a href="https://ranjeetkumarguptabro-maker.github.io/ranjeet-contribution-workplace/">
    <img src="https://img.shields.io/badge/LAUNCH-LIVE%20INTERACTIVE%20DASHBOARD-00C7E8?style=for-the-badge&logo=githubpages&logoColor=white" alt="Launch Dashboard">
  </a>
</p>

<!-- Animated Pixel Art Developer Workstation -->
<a href="https://ranjeetkumarguptabro-maker.github.io/ranjeet-contribution-workplace/">
  <img src="https://raw.githubusercontent.com/ranjeetkumarguptabro-maker/ranjeet-contribution-workplace/main/assets/workplace-contribution.gif" alt="Ranjeet's Contribution Workplace" width="100%">
</a>

<p align="center">
  <i>👉 <b>Click the workstation</b> above to open the real, live interactive telemetry dashboard!</i>
</p>

</div>`;

    if (textarea) textarea.value = markdownTemplate;

    function openModal() {
      sfx.click();
      if (modal) modal.classList.add('open');
    }
    function closeModal() {
      sfx.click();
      if (modal) modal.classList.remove('open');
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (doneBtn) doneBtn.addEventListener('click', closeModal);

    if (copyBtn && textarea) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(textarea.value);
          sfx.chime();
          copyBtn.textContent = '✅ COPIED!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy Markdown'; }, 2000);
          logTerminal('[CLIPBOARD] Copied GitHub Profile README Markdown to clipboard!', 'success');
        } catch (_) {
          textarea.select();
          document.execCommand('copy');
          copyBtn.textContent = '✅ COPIED!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy Markdown'; }, 2000);
        }
      });
    }
  }

  // --- INITIALIZATION ---
  function init() {
    logTerminal('Mounting interactive graphics, canvas telemetry, and audio engine...', 'info');
    
    initBootSequence();
    init3DTilt();
    initCanvasGraphs();
    initRadarGraph();
    initMetricsSimulation();
    initArchitectureNodes();
    initMonitorTabs();
    initCertificates();
    initRoomHotspots();
    initEmbedModal();

    // Controls
    const themeBtn = $('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', cycleLightingTheme);

    const sfxBtn = $('sfxToggleBtn');
    if (sfxBtn) sfxBtn.addEventListener('click', toggleAudio);

    const syncBtn = $('syncBtn');
    if (syncBtn) syncBtn.addEventListener('click', () => {
      sfx.click();
      loadGitHubData();
    });

    // Initial load
    loadGitHubData();

    // Auto refresh every 5 minutes
    setInterval(loadGitHubData, 5 * 60 * 1000);
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
