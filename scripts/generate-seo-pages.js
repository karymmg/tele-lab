import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();
dotenv.config({ path: '.env.local' }); // override with .local if exists

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

// We use the env vars prefixed with VITE_ since it's a vite project
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const siteUrl = 'https://telephonic-pro.tn';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Skipping SEO generation.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateSeoPages() {
  console.log('Starting SEO pages generation...');
  
  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found. Did you run vite build first?');
    process.exit(1);
  }

  const indexHtmlPath = path.join(distDir, 'index.html');
  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  // Fetch all active products
  const { data: products, error: productsError } = await supabase
    .from('shop_products')
    .select(`
      slug, 
      name, 
      seo_title, 
      seo_description, 
      image_url,
      category:shop_categories(slug)
    `)
    .eq('active', true);

  if (productsError) {
    console.error('Error fetching products:', productsError);
    process.exit(1);
  }

  // Fetch all active categories
  const { data: categories, error: categoriesError } = await supabase
    .from('shop_categories')
    .select('slug, name, seo_title, seo_description')
    .eq('active', true);

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    process.exit(1);
  }

  const sitemapUrls = [];

  // Add static URLs to sitemap
  sitemapUrls.push(`${siteUrl}/`);
  sitemapUrls.push(`${siteUrl}/products`);

  // Helper to generate a pre-rendered HTML file
  const generateHtmlFile = (route, title, description, ogImage) => {
    const dirPath = path.join(distDir, route);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Basic meta tag injection
    let seoHtml = baseHtml;
    if (title) {
      seoHtml = seoHtml.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    }
    
    // Inject meta description and canonical if not exists, else just simple replace (assuming Vite output doesn't have them hardcoded)
    let metaTags = `
      <meta name="description" content="${description || ''}" />
      <link rel="canonical" href="${siteUrl}${route}" />
      <meta property="og:title" content="${title || ''}" />
      <meta property="og:description" content="${description || ''}" />
      <meta property="og:url" content="${siteUrl}${route}" />
    `;
    if (ogImage) {
      metaTags += `\n      <meta property="og:image" content="${ogImage}" />`;
    }

    seoHtml = seoHtml.replace('</head>', `${metaTags}\n</head>`);

    fs.writeFileSync(path.join(dirPath, 'index.html'), seoHtml);
    sitemapUrls.push(`${siteUrl}${route}`);
  };

  // Generate Product Pages
  console.log(`Generating ${products.length} product pages...`);
  products.forEach(product => {
    const categorySlug = product.category?.slug || 'category';
    const route = `/shop/category/${categorySlug}/${product.slug}`;
    const title = product.seo_title || `${product.name} Tunisie | Telephonic Pro`;
    const desc = product.seo_description || `Achetez ${product.name} en Tunisie chez Telephonic Pro.`;
    
    generateHtmlFile(route, title, desc, product.image_url);
  });

  // Generate Category Pages
  console.log(`Generating ${categories.length} category pages...`);
  categories.forEach(category => {
    const route = `/category/${category.slug}`;
    const title = category.seo_title || `Catégorie ${category.name} | Telephonic Pro`;
    const desc = category.seo_description || `Découvrez nos produits dans la catégorie ${category.name}.`;
    
    generateHtmlFile(route, title, desc, null);
  });

  // Generate Sitemap
  console.log('Generating sitemap.xml...');
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <url>\n    <loc>${url}</loc>\n  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);
  
  // Also write to public folder for dev mode if needed, though usually dist is enough for production
  fs.writeFileSync(path.join(path.resolve(__dirname, '../public'), 'sitemap.xml'), sitemapXml);

  console.log('SEO pages and sitemap generation complete!');
}

generateSeoPages().catch(err => {
  console.error('Unhandled error during SEO generation:', err);
  process.exit(1);
});
