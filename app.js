/**
 * RANJEET'S CONTRIBUTION WORKPLACE · INTERACTIVE ENGINE
 * Real-time GitHub Telemetry, Web Audio Synthesizer, Canvas Graphs & Architecture HUD
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
    profile: null,
    repos: [],
    events: [],
    contributions: [],
    totalContributions: 319,
    activeNode: null,
    cpuBase: 42,
    ramBase: 68,
    p95Base: 132,
    pcCpuBase: 38
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
    toggle: () => playTone(660, 'sine', 0.06, 0.04)
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
      // Parallel fetch
      const [profileData, reposData, eventsData, contribData] = await Promise.allSettled([
        fetchJSON(`${API_GITHUB}/users/${USERNAME}`),
        fetchJSON(`${API_GITHUB}/users/${USERNAME}/repos?per_page=100&sort=updated`),
        fetchJSON(`${API_GITHUB}/users/${USERNAME}/events/public?per_page=30`),
        fetchJSON(API_CONTRIB)
      ]);

      // Profile
      if (profileData.status === 'fulfilled') {
        state.profile = profileData.value;
        $('statRepos').textContent = state.profile.public_repos || 20;
        $('bioName').textContent = state.profile.name || USERNAME;
        logTerminal(`[OK] Loaded profile: ${state.profile.name || USERNAME} (${state.profile.public_repos} public repositories).`, 'success');
      }

      // Repositories & Languages
      if (reposData.status === 'fulfilled') {
        state.repos = reposData.value;
        const totalStars = state.repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
        $('statStars').textContent = totalStars;
        renderLanguageTrack(state.repos);
        renderFeaturedRepos(state.repos);
        logTerminal(`[OK] Parsed ${state.repos.length} repositories, total stars: ${totalStars}.`, 'success');
      }

      // Activity / Events
      if (eventsData.status === 'fulfilled') {
        state.events = eventsData.value;
        renderActivityFeed(state.events);
        logTerminal(`[OK] Streamed ${state.events.length} recent public events from GitHub feed.`, 'success');
      }

      // Contributions
      if (contribData.status === 'fulfilled' && contribData.value.contributions) {
        state.contributions = contribData.value.contributions;
        state.totalContributions = contribData.value.total?.lastYear || 319;
        $('statContribs').textContent = state.totalContributions;
        $('headerContribCount').textContent = `${state.totalContributions} COMMITS (LAST YEAR)`;
        renderContributionGrid(state.contributions);
        logTerminal(`[OK] Mounted ${state.totalContributions} live GitHub contributions into workplace grid!`, 'success');
      } else {
        renderFallbackContributionGrid();
      }

      if (apiStatusText) apiStatusText.textContent = 'GITHUB CONNECTED';
      if (statusPulse) statusPulse.style.background = '#39e58c';
      $('lastSyncedTime').textContent = `Last synced: ${new Date().toLocaleTimeString()}`;

    } catch (err) {
      logTerminal(`[WARN] API connection error: ${err.message}. Using cached baseline telemetry.`, 'warn');
      if (apiStatusText) apiStatusText.textContent = 'GITHUB TELEMETRY ACTIVE (CACHED)';
      if (statusPulse) statusPulse.style.background = '#38e1ff';
      renderFallbackContributionGrid();
    }
  }

  // --- LANGUAGE TRACKER ---
  function renderLanguageTrack(repos) {
    const counts = {};
    repos.forEach(r => {
      if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [, n]) => sum + n, 0) || 1;
    
    const container = $('languageListContainer');
    if (!container || sorted.length === 0) return;
    
    container.innerHTML = sorted.slice(0, 5).map(([lang, count]) => {
      const pct = Math.round((count / total) * 100);
      return `
        <div class="lang-row">
          <b>${lang}</b>
          <div class="bar"><i style="width: ${pct}%"></i></div>
          <span>${pct}%</span>
        </div>
      `;
    }).join('');
  }

  // --- ACTIVITY FEED ---
  function renderActivityFeed(events) {
    const container = $('activityFeedContainer');
    if (!container) return;
    if (!events || events.length === 0) {
      container.innerHTML = '<div class="feed-item"><span class="repo">No recent public events</span></div>';
      return;
    }

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

  // --- FEATURED REPOSITORIES ---
  function renderFeaturedRepos(repos) {
    const grid = $('reposGrid');
    if (!grid || !repos || repos.length === 0) return;

    // Pick top 4 noteworthy repositories
    const topRepos = repos.slice(0, 4);
    grid.innerHTML = topRepos.map(r => {
      const lang = r.language || 'Code';
      const langClass = (r.language || 'default').toLowerCase();
      const desc = r.description || 'DevOps and cloud systems automation repository.';
      return `
        <a href="${r.html_url}" target="_blank" rel="noopener" class="repo-card">
          <div class="repo-card-head">
            <span class="repo-name">${r.name}</span>
            <span class="lang-tag ${langClass}">${lang}</span>
          </div>
          <p class="repo-desc">${desc}</p>
          <div class="repo-card-footer">
            <span>⭐ ${r.stargazers_count || 0}</span>
            <span>🔄 ${new Date(r.updated_at).toLocaleDateString()}</span>
          </div>
        </a>
      `;
    }).join('');
  }

  // --- CONTRIBUTION HEATMAP GRID ---
  function renderContributionGrid(days) {
    const grid = $('heatmapGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Take the last 364 days (52 weeks x 7 days)
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
      
      // Seeded realistic pseudo pattern
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

  // --- CANVAS ANIMATIONS ENGINE ---
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
          const y = h - 10 - Math.sin((x + tick * 1.5) * 0.08) * 10 - Math.cos((x + tick * 0.8) * 0.15) * 6;
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
          const y = h - 8 - Math.sin((x + tick * 1.2) * 0.06) * 8 - Math.sin((x - tick * 1.8) * 0.12) * 5;
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

        // Connections:
        // Users (w*0.1, h*0.42) -> ALB (w*0.31, h*0.42)
        // ALB (w*0.31, h*0.42) -> EKS (w*0.55, h*0.35)
        // EKS (w*0.55, h*0.35) -> RDS (w*0.81, h*0.42)
        // Users (w*0.1, h*0.42) -> S3 (w*0.31, h*0.78)
        // Users (w*0.1, h*0.42) -> CloudFront (w*0.56, h*0.78)
        // EKS (w*0.55, h*0.35) -> CloudWatch (w*0.83, h*0.78)

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

    // Glowing particle
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
      // Small jitter around realistic values
      const cpu = Math.min(99, Math.max(10, Math.round(state.cpuBase + (Math.random() * 6 - 3))));
      const ram = Math.min(99, Math.max(20, Math.round(state.ramBase + (Math.random() * 4 - 2))));
      const p95 = Math.round(state.p95Base + (Math.random() * 8 - 4));
      const pcCpu = Math.round(state.pcCpuBase + (Math.random() * 4 - 2));

      // Update Left Monitor Gauges
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

      // Update text readouts
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

  // --- SCREEN TABS (LEFT MONITOR) ---
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
          title.textContent = target === 'grafana' ? 'Grafana' : 'GitHub Telemetry';
        }

        logTerminal(`[MONITOR] Switched left display view to: ${target.toUpperCase()}`, 'info');
      });
    });
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
  <img src="./assets/workplace-contribution.gif" alt="Ranjeet's Contribution Workplace" width="100%">
</a>

<p align="center">
  <i>👉 <b>Click the workstation</b> above to open the real, live interactive telemetry dashboard!</i>
</p>

</div>

---

### 🧰 Cloud & DevOps Engineering Toolset

<div align="center">

<img src="https://cdn.simpleicons.org/git/F05032" height="40" alt="Git" title="Git">&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/github/181717" height="40" alt="GitHub" title="GitHub">&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/docker/2496ED" height="40" alt="Docker" title="Docker">&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/kubernetes/326CE5" height="40" alt="Kubernetes" title="Kubernetes">&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/amazonaws/FF9900" height="40" alt="AWS" title="AWS">&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/terraform/844FBA" height="40" alt="Terraform" title="Terraform">&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/python/3776AB" height="40" alt="Python" title="Python">&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/linux/FCC624" height="40" alt="Linux" title="Linux">

<br><br>

<img src="https://cdn.simpleicons.org/grafana/F46800" height="40" alt="Grafana" title="Grafana">&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/prometheus/E6522C" height="40" alt="Prometheus" title="Prometheus">&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/githubactions/2088FF" height="40" alt="GitHub Actions" title="CI/CD">&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/nginx/009639" height="40" alt="NGINX" title="NGINX">

</div>

---

<div align="center">

*Building, automating, monitoring, and learning — one commit at a time.*

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
    
    initCanvasGraphs();
    initMetricsSimulation();
    initArchitectureNodes();
    initMonitorTabs();
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
