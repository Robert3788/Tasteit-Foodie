export async function onRequestGet(context) {
  const { id } = context.params;
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

  let recipe = null;
  let creator = null;
  let likeCount = 0;
  let commentCount = 0;

  try {
    const recipeRes = await fetch(
      `${SUPABASE_URL}/rest/v1/recipes?id=eq.${encodeURIComponent(id)}&select=title,description,image,categories,created_by`,
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
        fetch(`${SUPABASE_URL}/rest/v1/recipe_comments?recipe_id=eq.${encodeURIComponent(id)}&select=id`, {
          headers: { ...headers, Prefer: 'count=exact' },
        }),
      ]);

      if (creatorRes) {
        const creatorData = await creatorRes.json();
        creator = Array.isArray(creatorData) && creatorData[0] ? creatorData[0] : null;
      }
      likeCount = parseInt(likesRes.headers.get('content-range')?.split('/')[1] || '0', 10);
      commentCount = parseInt(commentsRes.headers.get('content-range')?.split('/')[1] || '0', 10);
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
  const creatorUsername = creator?.username || null;
  const creatorAvatar = creator?.avatar_url || null;

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
  :root { box-sizing: border-box; }
  * { box-sizing: border-box; margin:0; padding:0; }
  html, body { height:100%; background:#000; color:#fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow:hidden; }
  .screen { position:relative; height:100dvh; width:100%; overflow:hidden; }
  .bg-image {
    position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
  }
  .gradient {
    position:absolute; left:0; right:0; bottom:0; height:65%;
    background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.92));
  }
  .icon-col {
    position:absolute; right:14px; bottom:190px;
    display:flex; flex-direction:column; align-items:center; gap:22px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .icon-item { display:flex; flex-direction:column; align-items:center; gap:4px; }
  .icon-item svg { width:30px; height:30px; }
  .icon-count { font-size:12px; font-weight:600; }
  .content {
    position:absolute; left:16px; right:90px; bottom:34px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .creator-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
  .creator-avatar { width:32px; height:32px; border-radius:16px; object-fit:cover; background:#333; }
  .creator-avatar-placeholder { width:32px; height:32px; border-radius:16px; background:#333; display:flex; align-items:center; justify-content:center; font-size:14px; }
  .creator-username { font-weight:700; font-size:14px; }
  .tag-row { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
  .tag { background:rgba(255,255,255,0.2); border-radius:12px; padding:4px 10px; font-size:11px; }
  .title { font-size:22px; font-weight:700; margin-bottom:6px; }
  .description { font-size:14px; color:#eee; line-height:1.4; }
  .sticky-bar {
    position:fixed; left:0; right:0; bottom:0;
    background:rgba(20,20,20,0.97);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255,255,255,0.08);
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    display:flex; align-items:center; gap:12px;
    z-index: 10;
  }
  .sticky-icon { width:38px; height:38px; border-radius:10px; flex-shrink:0; }
  .sticky-text { flex:1; min-width:0; }
  .sticky-text .name { font-weight:700; font-size:14px; }
  .sticky-text .sub { font-size:12px; color:#999; }
  a.install-button {
    background:#fff; color:#000; text-decoration:none; font-weight:700;
    font-size:14px; padding:10px 18px; border-radius:20px; white-space:nowrap;
  }
</style>
</head>
<body>
  <div class="screen">
    ${image ? `<img class="bg-image" src="${escapeHtml(image)}" alt="${escapeHtml(recipe.title)}" />` : ''}
    <div class="gradient"></div>

    <div class="icon-col">
      <div class="icon-item">
        <svg viewBox="0 0 24 24" fill="#ff3040"><path d="M12 21s-6.7-4.35-9.5-8.28C.6 9.87 1.4 6.2 4.4 4.9c2.1-.9 4.3-.2 5.6 1.6l2 2.7 2-2.7c1.3-1.8 3.5-2.5 5.6-1.6 3 1.3 3.8 5 1.9 7.82C18.7 16.65 12 21 12 21z"/></svg>
        <span class="icon-count">${likeCount}</span>
      </div>
      <div class="icon-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <span class="icon-count">${commentCount}</span>
      </div>
    </div>

    <div class="content">
      ${
        creatorUsername
          ? `<div class="creator-row">
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
          ? `<div class="tag-row">${categories
              .map((c) => `<span class="tag">${escapeHtml(c)}</span>`)
              .join('')}</div>`
          : ''
      }
      <div class="title">${escapeHtml(recipe.title)}</div>
      <div class="description">${escapeHtml(recipe.description || '')}</div>
    </div>
  </div>

  <div class="sticky-bar">
    <img class="sticky-icon" src="https://foodieswipe.com/tasteit-icon.png" alt="Tasteit" onerror="this.style.display='none'" />
    <div class="sticky-text">
      <div class="name">Tasteit</div>
      <div class="sub">View full recipe, save & more</div>
    </div>
    <a class="install-button" href="https://apps.apple.com/app/id6809744136">Install</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}
