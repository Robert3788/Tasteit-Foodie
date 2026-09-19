export async function onRequestGet(context) {
  const { id } = context.params;
  const SUPABASE_URL = 'https://izytuovidpayvmhrrjec.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eXR1b3ZpZHBheXZtaHJyamVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MTI3MjcsImV4cCI6MjEwNDI4ODcyN30.3upYcABdN7zFQPAIa9xwPuoItY6IWC4V9BKRS1zIUko';

  let recipe = null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/recipes?id=eq.${encodeURIComponent(id)}&select=title,description,image`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await res.json();
    recipe = Array.isArray(data) && data[0] ? data[0] : null;
  } catch (e) {
    recipe = null;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const title = recipe ? `${recipe.title} · Tasteit` : 'Tasteit Recipe';
  const description = recipe
    ? recipe.description || 'Discover this recipe on Tasteit.'
    : "This recipe couldn't be found, but there's plenty more to discover on Tasteit.";
  const image = recipe && recipe.image ? recipe.image : null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
  :root { --bg:#000000; --card:#1a1a1a; --text:#ffffff; --muted:#999999; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; min-height:100%; background:var(--bg); color:var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body { display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { max-width:420px; width:100%; background:var(--card); border-radius:20px; overflow:hidden; text-align:center; }
  .image { width:100%; aspect-ratio: 4/3; object-fit:cover; background:#111111; display:block; }
  .content { padding: 28px; }
  h1 { font-size:20px; margin:0 0 8px; }
  p { color:var(--muted); font-size:14px; line-height:1.5; margin:0 0 24px; }
  a.button { display:inline-block; background:#ffffff; color:#000000; text-decoration:none; font-weight:700; font-size:16px; padding:14px 28px; border-radius:14px; width:100%; }
  .hint { margin-top:14px; font-size:12px; color:#666666; }
</style>
</head>
<body>
  <div class="card">
    ${image ? `<img class="image" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />` : ''}
    <div class="content">
      <h1>${escapeHtml(recipe ? recipe.title : 'Recipe not found')}</h1>
      <p>${escapeHtml(description)}</p>
      <a class="button" href="https://apps.apple.com/app/id6809744136">Get Tasteit to view this recipe</a>
      <p class="hint">Already have Tasteit installed? Tap this link again from your phone to open it directly in the app.</p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}
