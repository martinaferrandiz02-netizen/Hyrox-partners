@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #0a0a0a;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  font-family: 'Inter', Arial, sans-serif;
  padding: 24px 0;
}

.app {
  display: flex;
  justify-content: center;
}

.phone {
  width: 360px;
  background: #0a0a0a;
  border-radius: 44px;
  padding: 10px;
  border: 1.5px solid #1e1e1e;
  box-shadow: 0 32px 64px rgba(0,0,0,0.6);
}

.notch {
  width: 100px;
  height: 22px;
  background: #0a0a0a;
  border-radius: 0 0 14px 14px;
  margin: 0 auto 2px;
}

.screen {
  background: #111111;
  border-radius: 36px;
  overflow-y: auto;
  max-height: 720px;
  padding: 0 16px 24px;
  color: #f0f0f0;
}

/* ── TIPOGRAFÍA BASE ── */
.greeting {
  font-size: 11px;
  font-weight: 500;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.name {
  font-size: 30px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.05;
  letter-spacing: -0.5px;
}

.screen-title {
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.5px;
  padding: 16px 0 4px;
}

.screen-sub {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
}

.section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2.5px;
  color: #333;
  text-transform: uppercase;
  margin: 16px 0 8px;
}

/* ── RATING ── */
.rating-badge {
  background: #E8FF3C;
  color: #0a0a0a;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}

.rating-sub {
  font-size: 9px;
  font-weight: 500;
  color: #444;
  text-align: right;
  margin-top: 3px;
  letter-spacing: 0.5px;
}

/* ── HERO HEADER ── */
.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 0 10px;
}

/* ── PRÓXIMA CARRERA ── */
.next-race {
  background: #E8FF3C;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.race-label {
  font-size: 9px;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 4px;
}

.race-name {
  font-size: 18px;
  font-weight: 800;
  color: #0a0a0a;
  letter-spacing: -0.3px;
  line-height: 1.1;
  margin-bottom: 8px;
}

.race-meta {
  display: flex;
  gap: 12px;
}

.race-meta span {
  font-size: 10px;
  font-weight: 600;
  color: #333;
}

/* ── CARDS ── */
.card {
  background: #181818;
  border-radius: 14px;
  padding: 14px;
  border: 1px solid #1e1e1e;
  margin-bottom: 8px;
}

.card.faded { opacity: 0.45; }

/* ── PARTNERS ── */
.partner-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.avatar.yellow { background: #E8FF3C; color: #0a0a0a; }
.avatar.dark { background: #222; color: #555; }
.avatar.purple { background: #1a1a2e; color: #7777cc; }
.avatar.blue { background: #1a2030; color: #6699cc; }
.avatar.green { background: #1a2a1a; color: #55aa55; }
.avatar.orange { background: #2a1a08; color: #cc8833; }
.avatar.teal { background: #0a2020; color: #33aaaa; }
.avatar.large { width: 46px; height: 46px; font-size: 15px; }

.partner-info { flex: 1; }

.partner-name {
  font-size: 13px;
  font-weight: 700;
  color: #f0f0f0;
  letter-spacing: -0.2px;
}

.partner-sub {
  font-size: 10px;
  font-weight: 500;
  color: #444;
  margin-top: 2px;
}

.partner-rating {
  font-size: 14px;
  font-weight: 800;
  color: #E8FF3C;
  letter-spacing: -0.3px;
}

.divider-text {
  text-align: center;
  font-size: 9px;
  font-weight: 600;
  color: #222;
  letter-spacing: 2px;
  padding: 6px 0;
  text-transform: uppercase;
}

/* ── STATS ── */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 8px 0;
}

.stat-card {
  background: #181818;
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid #1e1e1e;
}

.stat-val {
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
  letter-spacing: -0.5px;
}

.stat-unit {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  margin-left: 2px;
}

.stat-lbl {
  font-size: 9px;
  font-weight: 600;
  color: #333;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ── RETOS ── */
.reto-card {
  background: #181818;
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid #1e1e1e;
  margin-bottom: 8px;
}

.reto-card.faded { opacity: 0.5; }

.reto-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 5px;
}

.reto-name {
  font-size: 13px;
  font-weight: 700;
  color: #f0f0f0;
  letter-spacing: -0.2px;
}

.reto-desc {
  font-size: 11px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
  line-height: 1.5;
}

.reto-desc strong { color: #E8FF3C; font-weight: 700; }

.reto-footer {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 600;
  color: #333;
}

/* ── BADGES ── */
.badge {
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.badge.active { background: rgba(232,255,60,0.12); color: #E8FF3C; }
.badge.done { background: #1a2a1a; color: #55aa55; }
.badge.norating { background: #1e1e1e; color: #444; }

/* ── BOTONES ── */
.btn-primary {
  background: #E8FF3C;
  color: #0a0a0a;
  font-weight: 800;
  font-size: 13px;
  padding: 13px 16px;
  border-radius: 12px;
  text-align: center;
  margin-top: 8px;
  cursor: pointer;
  letter-spacing: 0.3px;
}

.btn-pass {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #222;
  background: transparent;
  color: #444;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.3px;
}

.btn-match {
  flex: 2;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: #E8FF3C;
  color: #0a0a0a;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.3px;
}

/* ── BARS ── */
.bars { margin: 10px 0; }

.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.bar-lbl {
  font-size: 10px;
  font-weight: 600;
  color: #444;
  width: 60px;
}

.bar-track {
  flex: 1;
  height: 3px;
  background: #1e1e1e;
  border-radius: 2px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 2px;
  background: #E8FF3C;
}

.bar-val {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  width: 30px;
  text-align: right;
}

.match-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* ── PLAN IA ── */
.ai-card {
  background: #141414;
  border: 1px solid #1e1e1e;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.ai-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #E8FF3C;
  display: inline-block;
}

.ai-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #333;
  text-transform: uppercase;
}

.ai-title {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 12px;
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.split-header {
  display: flex;
  font-size: 9px;
  font-weight: 700;
  color: #2a2a2a;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 4px;
  padding-bottom: 6px;
  border-bottom: 1px solid #1e1e1e;
}

.split-header span:last-child,
.split-header span:nth-child(2) {
  width: 50px;
  text-align: center;
}

.split-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #161616;
  font-size: 11px;
  font-weight: 600;
  color: #888;
}

.split-row:last-child { border: none; }

.split-you {
  width: 50px;
  text-align: center;
  font-weight: 800;
  color: #E8FF3C;
  font-size: 12px;
}

.split-partner {
  width: 50px;
  text-align: center;
  font-weight: 700;
  color: #333;
  font-size: 12px;
}

.time-card {
  background: #181818;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #1e1e1e;
}

.time-label {
  font-size: 9px;
  font-weight: 700;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 4px;
}

.time-val {
  font-size: 36px;
  font-weight: 900;
  color: #E8FF3C;
  line-height: 1;
  letter-spacing: -1px;
}

.time-sub {
  font-size: 10px;
  font-weight: 600;
  color: #333;
  margin-top: 4px;
  letter-spacing: 0.5px;
}

/* ── RANKINGS ── */
.rank-levels {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 4px 0;
}

.rank-item { text-align: center; }

.rank-pos {
  font-size: 24px;
  font-weight: 900;
  color: #E8FF3C;
  line-height: 1;
  letter-spacing: -0.5px;
}

.rank-lbl {
  font-size: 9px;
  font-weight: 600;
  color: #333;
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.rank-divider {
  width: 1px;
  height: 32px;
  background: #1e1e1e;
}

.ranking-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 6px;
  background: #181818;
  border: 1px solid #1e1e1e;
}

.ranking-row.my-club {
  border-color: rgba(232,255,60,0.25);
  background: #161610;
}

.rank-num {
  font-size: 14px;
  font-weight: 800;
  color: #333;
  width: 26px;
  text-align: center;
}

/* ── PERFIL ── */
.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0 12px;
}

.oficial-row {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #161616;
  gap: 10px;
}

.oficial-row:last-child { border: none; }

/* ── PAREJAS TABS ── */
.parejas-tabs {
  display: flex;
  gap: 6px;
  margin: 12px 0;
}

.parejas-tabs button {
  flex: 1;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid #1e1e1e;
  background: #181818;
  color: #333;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-family: 'Inter', Arial, sans-serif;
}

.parejas-tabs button.active {
  background: #E8FF3C;
  color: #0a0a0a;
  border-color: #E8FF3C;
}

.notif {
  background: #E8FF3C;
  color: #0a0a0a;
  border-radius: 8px;
  padding: 1px 5px;
  font-size: 8px;
  font-weight: 800;
  margin-left: 4px;
}

/* ── SWIPE ── */
.swipe-card {
  background: #181818;
  border-radius: 16px;
  padding: 22px 18px;
  border: 1px solid #1e1e1e;
  margin-top: 8px;
  text-align: center;
}

.swipe-avatar-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.swipe-name {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.5px;
}

.swipe-sub {
  font-size: 10px;
  font-weight: 500;
  color: #444;
  margin-top: 4px;
  margin-bottom: 6px;
}

.swipe-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

/* ── CHAT ── */
.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 10px;
  border-bottom: 1px solid #1a1a1a;
}

.back-btn {
  background: transparent;
  border: none;
  color: #E8FF3C;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  font-weight: 700;
}

.btn-elegir {
  background: #E8FF3C;
  color: #0a0a0a;
  border: none;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  letter-spacing: 0.3px;
  font-family: 'Inter', Arial, sans-serif;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 300px;
  max-height: 300px;
}

.msg {
  max-width: 78%;
  padding: 9px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
}

.msg-yo {
  background: #E8FF3C;
  color: #0a0a0a;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
  font-weight: 600;
}

.msg-ellos {
  background: #1e1e1e;
  color: #aaa;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 10px 0;
  border-top: 1px solid #1a1a1a;
}

.chat-input input {
  flex: 1;
  background: #181818;
  border: 1px solid #222;
  border-radius: 10px;
  padding: 9px 12px;
  color: #f0f0f0;
  font-size: 12px;
  font-weight: 500;
  outline: none;
  font-family: 'Inter', Arial, sans-serif;
}

.chat-input button {
  background: #E8FF3C;
  color: #0a0a0a;
  border: none;
  border-radius: 10px;
  padding: 9px 14px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Inter', Arial, sans-serif;
}

/* ── EMPTY STATE ── */
.empty-state {
  text-align: center;
  padding: 48px 20px;
}

/* ── TAB BAR ── */
.tab-bar {
  display: flex;
  border-top: 1px solid #161616;
  padding: 10px 0 12px;
  background: #0e0e0e;
  border-radius: 0 0 36px 36px;
}

.tab-bar button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  font-weight: 700;
  color: #2a2a2a;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-family: 'Inter', Arial, sans-serif;
}

.tab-bar button span:first-child { font-size: 18px; }
.tab-bar button.active { color: #E8FF3C; }