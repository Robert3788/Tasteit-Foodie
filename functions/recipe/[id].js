export async function onRequestGet(context) {
  const { id } = context.params;
  const userAgent = context.request.headers.get('user-agent') || '';
  const isMobile = /iphone|ipad|ipod|android|mobile/i.test(userAgent);

  const SUPABASE_URL = 'https://izytuovidpayvmhrrjec.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eXR1b3ZpZHBheXZtaHJyamVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MTI3MjcsImV4cCI6MjEwNDI4ODcyN30.3upYcABdN7zFQPAIa9xwPuoItY6IWC4V9BKRS1zIUko';

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function scoreColor(score) {
    if (score >= 8) return '#4ade80';
    if (score >= 6) return '#a3e635';
    if (score >= 4) return '#facc15';
    return '#f87171';
  }

  function scoreLabel(score) {
    if (score >= 8) return 'Excellent!';
    if (score >= 6) return 'Not Bad!';
    if (score >= 4) return 'Okay';
    return 'Indulgent';
  }

  let recipe = null;
  let creator = null;
  let likeCount = 0;
  let comments = [];

  try {
    const recipeRes = await fetch(
      `${SUPABASE_URL}/rest/v1/recipes?id=eq.${encodeURIComponent(id)}&select=title,description,image,categories,created_by,ingredients,steps,serving_size,calories,protein,carbs,fat,fiber,sugar,sodium,health_score,health_summary,processed_score,processed_note,fun_fact`,
      { headers }
    );
    const recipeData = await recipeRes.json();
    recipe = Array.isArray(recipeData) && recipeData[0] ? recipeData[0] : null;

    if (recipe) {
      const [creatorRes, likesRes, commentsRes] = await Promise.all([
        recipe.created_by
          ? fetch(
              `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(recipe.created_by)}&select=username,avatar_url`,
              { headers }
            )
          : Promise.resolve(null),
        fetch(`${SUPABASE_URL}/rest/v1/likes?recipe_id=eq.${encodeURIComponent(id)}&select=id`, {
          headers: { ...headers, Prefer: 'count=exact' },
        }),
        fetch(
          `${SUPABASE_URL}/rest/v1/recipe_comments?recipe_id=eq.${encodeURIComponent(id)}&select=id,content,user_id,created_at&order=created_at.asc&limit=50`,
          { headers }
        ),
      ]);

      if (creatorRes) {
        const creatorData = await creatorRes.json();
        creator = Array.isArray(creatorData) && creatorData[0] ? creatorData[0] : null;
      }
      likeCount = parseInt(likesRes.headers.get('content-range')?.split('/')[1] || '0', 10);

      const commentsData = await commentsRes.json();
      const rawComments = Array.isArray(commentsData) ? commentsData : [];

      if (rawComments.length > 0) {
        const userIds = [...new Set(rawComments.map((c) => c.user_id))];
        const profilesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=in.(${userIds.join(',')})&select=id,username,avatar_url`,
          { headers }
        );
        const profilesData = await profilesRes.json();
        const profileMap = {};
        (Array.isArray(profilesData) ? profilesData : []).forEach((p) => {
          profileMap[p.id] = p;
        });
        comments = rawComments.map((c) => ({
          content: c.content,
          username: profileMap[c.user_id]?.username || 'Someone',
          avatar_url: profileMap[c.user_id]?.avatar_url || null,
        }));
      }
    }
  } catch (e) {
    recipe = null;
  }

  const title = recipe ? `${recipe.title} · Tasteit` : 'Tasteit Recipe';
  const description = recipe
    ? recipe.description || 'Discover this recipe on Tasteit.'
    : "This recipe couldn't be found, but there's plenty more to discover on Tasteit.";
  const image = recipe && recipe.image ? recipe.image : null;

  if (!recipe) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>${escapeHtml(title)}</title>
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<style>
  html, body { margin:0; padding:0; height:100%; background:#000; color:#fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display:flex; align-items:center; justify-content:center; text-align:center; }
  .wrap { padding:32px; }
  h1 { font-size:20px; margin:0 0 10px; }
  p { color:#999; font-size:14px; margin:0 0 24px; }
  a.button { display:inline-block; background:#fff; color:#000; text-decoration:none; font-weight:700; font-size:16px; padding:14px 28px; border-radius:14px; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>Recipe not found</h1>
    <p>${escapeHtml(description)}</p>
    <a class="button" href="https://apps.apple.com/app/id6809744136">Get Tasteit</a>
  </div>
</body>
</html>`;
    return new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8' } });
  }

  const categories = Array.isArray(recipe.categories) ? recipe.categories : [];
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const creatorUsername = creator?.username || null;
  const creatorAvatar = creator?.avatar_url || null;
  const healthScore = recipe.health_score || 0;
  const processedScore = recipe.processed_score || 0;

  const commentsHtml = comments.length
    ? comments
        .map(
          (c) => `<div class="comment-row" onclick="promptApp('View profiles and reply to comments in the app')">
        ${
          c.avatar_url
            ? `<img class="comment-avatar" src="${escapeHtml(c.avatar_url)}" alt="${escapeHtml(c.username)}" />`
            : `<div class="comment-avatar-placeholder">👤</div>`
        }
        <div class="comment-body">
          <span class="comment-username">${escapeHtml(c.username)}</span>
          <span class="comment-text">${escapeHtml(c.content)}</span>
        </div>
      </div>`
        )
        .join('')
    : `<div class="no-comments">No comments yet. Be the first in the app!</div>`;

  // ScoreRing als SVG, exakt wie in der App (Kreis, Fortschrittsbogen, Prozentzahl in der Mitte)
  const ringSize = 72;
  const ringStroke = 6;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = (healthScore / 10) * ringCircumference;

  const scoreRingSvg = `<svg width="${ringSize}" height="${ringSize}" style="transform: rotate(-90deg);">
    <circle cx="${ringSize / 2}" cy="${ringSize / 2}" r="${ringRadius}" stroke="#333" stroke-width="${ringStroke}" fill="none" />
    <circle cx="${ringSize / 2}" cy="${ringSize / 2}" r="${ringRadius}" stroke="${scoreColor(healthScore)}" stroke-width="${ringStroke}" fill="none"
      stroke-dasharray="${ringCircumference} ${ringCircumference}" stroke-dashoffset="${ringCircumference - ringProgress}" stroke-linecap="round" />
  </svg>`;

  const recipeDetailHtml = `
    <img class="detail-image" src="${image ? escapeHtml(image) : ''}" alt="${escapeHtml(recipe.title)}" />
    <div class="detail-body">
      <div class="detail-title">${escapeHtml(recipe.title)}</div>
      <div class="detail-description">${escapeHtml(recipe.description || '')}</div>
      ${recipe.serving_size ? `<div class="detail-serving">Serving size: ${escapeHtml(recipe.serving_size)}</div>` : ''}

      <div class="score-card">
        <div class="score-ring-wrap">
          ${scoreRingSvg}
          <span class="score-ring-text">${healthScore}/10</span>
        </div>
        <div class="score-text">
          <div class="score-label" style="color:${scoreColor(healthScore)}">${scoreLabel(healthScore)}</div>
          <div class="score-summary">${escapeHtml(recipe.health_summary || '')}</div>
        </div>
      </div>

      <div class="macro-grid">
        <div class="macro-box"><div class="macro-value">${recipe.calories || 0}</div><div class="macro-label">Calories</div></div>
        <div class="macro-box"><div class="macro-value">${recipe.protein || 0}g</div><div class="macro-label">Protein</div></div>
        <div class="macro-box"><div class="macro-value">${recipe.carbs || 0}g</div><div class="macro-label">Carbs</div></div>
        <div class="macro-box"><div class="macro-value">${recipe.fat || 0}g</div><div class="macro-label">Fat</div></div>
      </div>

      <div class="nutrient-list">
        <div class="nutrient-row"><span>🌿 Fiber</span><strong>${recipe.fiber || 0}g</strong></div>
        <div class="nutrient-row"><span>🍬 Sugar</span><strong>${recipe.sugar || 0}g</strong></div>
        <div class="nutrient-row" style="border-bottom:none;"><span>🧂 Sodium</span><strong>${recipe.sodium || 0}mg</strong></div>
      </div>

      <div class="processed-card">
        <div class="processed-head">
          <span class="processed-title">⚙️ Processed Score</span>
          <span class="processed-score" style="color:${scoreColor(processedScore)}">${processedScore}/10</span>
        </div>
        <div class="processed-note">${escapeHtml(recipe.processed_note || '')}</div>
      </div>

      ${
        ingredients.length
          ? `<div class="section-title">Ingredients</div>${ingredients
              .map((i) => `<div class="list-item">•  ${escapeHtml(i)}</div>`)
              .join('')}`
          : ''
      }

      ${
        steps.length
          ? `<div class="section-title">Steps</div>${steps
              .map((s, i) => `<div class="list-item">${i + 1}. ${escapeHtml(s)}</div>`)
              .join('')}`
          : `<div class="section-title">Steps</div><p class="detail-empty">Full instructions available in the app.</p>`
      }

      ${
        recipe.fun_fact
          ? `<div class="fact-card"><div class="fact-label">💡 DID YOU KNOW?</div><div class="fact-text">${escapeHtml(recipe.fun_fact)}</div></div>`
          : ''
      }
    </div>
  `;

  const sharedStyles = `
    * { box-sizing: border-box; margin:0; padding:0; }
    body { background:#000; color:#fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .sticky-bar { z-index: 50; }
    .gradient { position:absolute; left:0; right:0; bottom:0; height:65%; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.92)); }
    .icon-item { display:flex; flex-direction:column; align-items:center; gap:4px; background:none; border:none; padding:0; color:#fff; }
    .icon-item svg { width:30px; height:30px; }
    .icon-count { font-size:12px; font-weight:600; }
    .creator-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; width:fit-content; cursor:pointer; }
    .creator-avatar { width:32px; height:32px; border-radius:16px; object-fit:cover; background:#333; }
    .creator-avatar-placeholder { width:32px; height:32px; border-radius:16px; background:#333; display:flex; align-items:center; justify-content:center; font-size:14px; }
    .creator-username { font-weight:700; font-size:14px; }
    .tag-row { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
    .tag { background:rgba(255,255,255,0.2); border-radius:12px; padding:4px 10px; font-size:11px; }
    .title { font-size:22px; font-weight:700; margin-bottom:6px; }
    .description { font-size:14px; color:#eee; line-height:1.4; margin-bottom:14px; }
    .view-recipe-btn { display:inline-block; background:#fff; color:#000; font-weight:700; font-size:13px; padding:9px 18px; border-radius:18px; border:none; cursor:pointer; }
    .sticky-bar { background:rgba(20,20,20,0.97); backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,0.08); padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px)); display:flex; align-items:center; gap:12px; }
    .sticky-icon { width:38px; height:38px; border-radius:10px; flex-shrink:0; }
    .sticky-text { flex:1; min-width:0; }
    .sticky-text .name { font-weight:700; font-size:14px; }
    .sticky-text .sub { font-size:12px; color:#999; }
    a.install-button { background:#fff; color:#000; text-decoration:none; font-weight:700; font-size:14px; padding:10px 18px; border-radius:20px; white-space:nowrap; }

    .panel-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:30; display:none; }
    .panel-overlay.open { display:block; }
    .panel { position:fixed; left:0; right:0; bottom:0; max-height:88vh; background:#000; border-radius:20px 20px 0 0; overflow-y:auto; touch-action: pan-y; }
    .panel-comments { background:#1a1a1a; padding:20px; padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
    .panel-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding: 16px 16px 0; }
    .panel-comments .panel-head { padding:0; margin-bottom:16px; }
    .panel-title { font-size:18px; font-weight:700; }
    .panel-close { background:rgba(0,0,0,0.5); border:none; color:#fff; font-size:20px; width:32px; height:32px; border-radius:16px; position:absolute; top:12px; right:12px; z-index:2; }
    .panel-comments .panel-close { position:static; background:none; width:auto; height:auto; }

    .comment-row { display:flex; gap:10px; padding:10px 0; border-bottom:1px solid #2a2a2a; cursor:pointer; }
    .comment-avatar { width:30px; height:30px; border-radius:15px; object-fit:cover; flex-shrink:0; }
    .comment-avatar-placeholder { width:30px; height:30px; border-radius:15px; background:#333; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:13px; }
    .comment-body { display:flex; flex-direction:column; gap:2px; }
    .comment-username { font-weight:700; font-size:12px; color:#999; }
    .comment-text { font-size:14px; }
    .no-comments { color:#888; text-align:center; padding:30px 0; }

    .detail-image { width:100%; height:260px; object-fit:cover; display:block; }
    .detail-body { padding:20px; padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px)); }
    .detail-title { font-size:24px; font-weight:700; margin-bottom:8px; }
    .detail-description { color:#ccc; font-size:14px; margin-bottom:4px; }
    .detail-serving { color:#888; font-size:12px; margin-bottom:18px; }
    .score-card { display:flex; align-items:center; background:#1a1a1a; border-radius:20px; padding:16px; margin-bottom:16px; gap:14px; }
    .score-ring-wrap { position:relative; width:72px; height:72px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .score-ring-wrap svg { position:absolute; }
    .score-ring-text { font-size:12px; font-weight:700; }
    .score-label { font-size:16px; font-weight:700; margin-bottom:4px; }
    .score-summary { color:#bbb; font-size:12px; line-height:1.4; }
    .macro-grid { display:flex; gap:8px; margin-bottom:16px; }
    .macro-box { background:#1a1a1a; border-radius:16px; padding:14px 0; text-align:center; flex:1; }
    .macro-value { font-size:17px; font-weight:700; }
    .macro-label { color:#999; font-size:10px; margin-top:4px; }
    .nutrient-list { background:#1a1a1a; border-radius:16px; padding:14px 16px; margin-bottom:16px; }
    .nutrient-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #2a2a2a; font-size:13px; color:#ddd; }
    .processed-card { background:#1a1a1a; border-radius:16px; padding:16px; margin-bottom:18px; }
    .processed-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .processed-title { font-weight:700; font-size:14px; }
    .processed-score { font-weight:700; font-size:14px; }
    .processed-note { color:#bbb; font-size:12px; line-height:1.4; }
    .section-title { font-size:18px; font-weight:700; margin-top:14px; margin-bottom:10px; }
    .list-item { color:#ddd; font-size:14px; margin-bottom:8px; line-height:1.4; }
    .detail-empty { color:#888; font-size:13px; }
    .fact-card { background:#1a1a1a; border-radius:16px; padding:16px; margin-top:18px; }
    .fact-label { color:#ffd93d; font-size:11px; font-weight:700; margin-bottom:8px; }
    .fact-text { color:#ddd; font-size:13px; line-height:1.4; }

    .toast { position:fixed; left:16px; right:16px; bottom:90px; background:#fff; color:#000; padding:14px 16px; border-radius:14px; font-size:13px; font-weight:600; z-index:40; display:none; align-items:center; justify-content:space-between; gap:10px; }
    .toast.show { display:flex; }
    .toast a { color:#000; text-decoration:underline; white-space:nowrap; }
  `;

  const mobileStyles = `
    html, body { height:100%; overflow:hidden; }
    .screen { position:relative; height:100dvh; width:100%; overflow:hidden; }
    .bg-image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .icon-col { position:absolute; right:14px; bottom:calc(256px + env(safe-area-inset-bottom, 0px)); display:flex; flex-direction:column; align-items:center; gap:22px; }
    .content { position:absolute; left:16px; right:90px; bottom:calc(100px + env(safe-area-inset-bottom, 0px)); }
    .sticky-bar { position:fixed; left:0; right:0; bottom:0; }
  `;

  const desktopStyles = `
    html, body { min-height:100%; background:#0a0a0a; }
    body { display:flex; justify-content:center; padding:40px 20px 140px; position:relative; }
    .phone-frame { position:relative; width:430px; max-width:100%; height:860px; border-radius:44px; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.6); border: 1px solid #222; }
    .screen { position:relative; height:100%; width:100%; overflow:hidden; }
    .bg-image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .icon-col { position:absolute; right:14px; bottom:296px; display:flex; flex-direction:column; align-items:center; gap:22px; }
    .content { position:absolute; left:16px; right:90px; bottom:140px; }
    .sticky-bar {
      position:fixed;
      left:50%;
      bottom:0;
      transform: translateX(-215px);
      width:430px;
      max-width:100vw;
      border-radius: 0;
    }
    .panel-overlay { position:fixed; }
    .toast { position:fixed; left:50%; transform: translateX(-50%); width:398px; max-width:calc(100vw - 32px); }
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>${escapeHtml(title)}</title>
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ''}
<style>
  ${sharedStyles}
  ${isMobile ? mobileStyles : desktopStyles}
</style>
</head>
<body>
  ${isMobile ? renderScreen() : `<div class="phone-frame">${renderScreen()}</div>`}

  <div class="toast" id="app-toast">
    <span id="app-toast-text"></span>
    <a href="https://apps.apple.com/app/id6809744136">Get app</a>
  </div>

  <script>
    function openPanel(name) {
      document.getElementById(name + '-overlay').classList.add('open');
    }
    function closePanel(name) {
      document.getElementById(name + '-overlay').classList.remove('open');
    }
    let toastTimer;
    function promptApp(message) {
      const toast = document.getElementById('app-toast');
      document.getElementById('app-toast-text').textContent = message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function enableSwipeToClose(panel, panelName) {
      let startX = 0, startY = 0, currentX = 0, dragging = false, isHorizontal = null;

      panel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = 0;
        dragging = true;
        isHorizontal = null;
        panel.style.transition = 'none';
      }, { passive: true });

      panel.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (isHorizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
          isHorizontal = Math.abs(dx) > Math.abs(dy) && dx > 0;
        }
        if (isHorizontal) {
          currentX = Math.max(0, dx);
          panel.style.transform = 'translateX(' + currentX + 'px)';
          e.preventDefault();
        }
      }, { passive: false });

      panel.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        panel.style.transition = 'transform 0.22s ease';
        if (isHorizontal && currentX > window.innerWidth / 3) {
          panel.style.transform = 'translateX(100%)';
          setTimeout(() => {
            closePanel(panelName);
            panel.style.transition = '';
            panel.style.transform = '';
          }, 220);
        } else {
          panel.style.transform = 'translateX(0)';
        }
      });
    }

    document.querySelectorAll('.panel-overlay .panel').forEach((panel) => {
      const overlayId = panel.closest('.panel-overlay').id;
      const panelName = overlayId.replace('-overlay', '');
      enableSwipeToClose(panel, panelName);
    });
  </script>
</body>
</html>`;

  function renderScreen() {
    return `
  <div class="screen">
    ${image ? `<img class="bg-image" src="${escapeHtml(image)}" alt="${escapeHtml(recipe.title)}" />` : ''}
    <div class="gradient"></div>

    <div class="icon-col">
      <div class="icon-item">
        <svg viewBox="0 0 24 24" fill="#ff3040"><path d="M12 21s-6.7-4.35-9.5-8.28C.6 9.87 1.4 6.2 4.4 4.9c2.1-.9 4.3-.2 5.6 1.6l2 2.7 2-2.7c1.3-1.8 3.5-2.5 5.6-1.6 3 1.3 3.8 5 1.9 7.82C18.7 16.65 12 21 12 21z"/></svg>
        <span class="icon-count">${likeCount}</span>
      </div>
      <button class="icon-item" onclick="openPanel('comments-panel')">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <span class="icon-count">${comments.length}</span>
      </button>
    </div>

    <div class="content">
      ${
        creatorUsername
          ? `<div class="creator-row" onclick="promptApp('View profiles and follow creators in the app')">
        ${
          creatorAvatar
            ? `<img class="creator-avatar" src="${escapeHtml(creatorAvatar)}" alt="${escapeHtml(creatorUsername)}" />`
            : `<div class="creator-avatar-placeholder">👤</div>`
        }
        <span class="creator-username">${escapeHtml(creatorUsername)}</span>
      </div>`
          : ''
      }
      ${
        categories.length > 0
          ? `<div class="tag-row">${categories.map((c) => `<span class="tag">${escapeHtml(c)}</span>`).join('')}</div>`
          : ''
      }
      <div class="title">${escapeHtml(recipe.title)}</div>
      <div class="description">${escapeHtml(recipe.description || '')}</div>
      <button class="view-recipe-btn" onclick="openPanel('recipe-panel')">View Recipe</button>
    </div>

    <div class="sticky-bar">
      <img class="sticky-icon" src="https://foodieswipe.com/images/icon.png" alt="Tasteit" onerror="this.style.display='none'" />
      <div class="sticky-text">
        <div class="name">Tasteit</div>
        <div class="sub">View full recipe, save & more</div>
      </div>
      <a class="install-button" href="https://apps.apple.com/app/id6809744136">Install</a>
    </div>

    <div class="panel-overlay" id="comments-panel-overlay" onclick="closePanel('comments-panel')">
      <div class="panel panel-comments" onclick="event.stopPropagation()">
        <div class="panel-head">
          <span class="panel-title">Comments</span>
          <button class="panel-close" onclick="closePanel('comments-panel')">&times;</button>
        </div>
        ${commentsHtml}
      </div>
    </div>

    <div class="panel-overlay" id="recipe-panel-overlay" onclick="closePanel('recipe-panel')">
      <div class="panel" onclick="event.stopPropagation()" style="position:relative;">
        <button class="panel-close" onclick="closePanel('recipe-panel')">&times;</button>
        ${recipeDetailHtml}
      </div>
    </div>
  </div>`;
  }

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}
