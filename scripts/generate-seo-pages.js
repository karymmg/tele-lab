import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const siteUrl = 'https://telephonic-pro.tn';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Skipping SEO generation.');
  process.exit(0);
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const slugFor = (value, fallback) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const xmlEscape = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function generateSeoPages() {
  if (!fs.existsSync(distDir)) throw new Error('dist directory not found. Run the Vite build first.');
  const indexHtmlPath = path.join(distDir, 'index.html');
  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const [productResult, categoryResult, brandResult, modelResult] = await Promise.all([
    supabase.from('shop_products').select('id, slug, name, seo_title, seo_description, image_url, brand_id, model_id, category:shop_categories(slug, name), brand:brands(slug, name), model:models(slug, name, brand_id)').eq('active', true),
    supabase.from('shop_categories').select('slug, name, seo_title, seo_description').eq('active', true),
    supabase.from('brands').select('id, slug, name'),
    supabase.from('models').select('id, slug, name, brand_id')
  ]);
  for (const result of [productResult, categoryResult, brandResult, modelResult]) if (result.error) throw result.error;
  const products = productResult.data || [];
  const categories = categoryResult.data || [];
  const brands = brandResult.data || [];
  const models = modelResult.data || [];
  const brandsById = new Map(brands.map((brand) => [brand.id, brand]));
  const modelsById = new Map(models.map((model) => [model.id, model]));
  const sitemapUrls = new Set([siteUrl + '/', siteUrl + '/shop', siteUrl + '/products', siteUrl + '/demande', siteUrl + '/tracking']);

  const generateHtmlFile = (route, title, description, ogImage) => {
    const filePath = path.join(distDir, route.replace(/^\/+/, ''), 'index.html');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const pageTitle = escapeHtml(title);
    const pageDescription = escapeHtml(description);
    const canonical = siteUrl + route;
    let html = baseHtml.replace(/<title>.*?<\/title>/i, '<title>' + pageTitle + '</title>');
    html = html.replace(/\s*<meta\s+name=["']description["'][^>]*>/gi, '');
    html = html.replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, '');
    html = html.replace(/\s*<meta\s+property=["']og:(title|description|url|image)["'][^>]*>/gi, '');
    const metaTags = '\n<meta name="description" content="' + pageDescription + '">' +
      '\n<link rel="canonical" href="' + escapeHtml(canonical) + '">' +
      '\n<meta property="og:title" content="' + pageTitle + '">' +
      '\n<meta property="og:description" content="' + pageDescription + '">' +
      '\n<meta property="og:url" content="' + escapeHtml(canonical) + '">' +
      (ogImage ? '\n<meta property="og:image" content="' + escapeHtml(ogImage) + '">' : '');
    html = html.replace('</head>', metaTags + '\n</head>');
    fs.writeFileSync(filePath, html);
    sitemapUrls.add(canonical);
  };

  for (const product of products) {
    const model = product.model || modelsById.get(product.model_id);
    const brand = product.brand || brandsById.get(product.brand_id || model?.brand_id);
    const categorySlug = slugFor(product.category?.slug || product.category?.name, 'categorie');
    const brandSlug = slugFor(brand?.slug || brand?.name, 'sans-marque');
    const modelSlug = slugFor(model?.slug || model?.name, 'sans-modele');
    const productSlug = slugFor(product.slug || product.id, 'produit');
    const route = '/shop/category/' + categorySlug + '/' + brandSlug + '/' + modelSlug + '/' + productSlug;
    const context = [product.name, brand?.name, model?.name].filter(Boolean).join(' ');
    generateHtmlFile(route, product.seo_title || context + ' Tunisie | Telephonic Pro', product.seo_description || 'Achetez ' + context + ' en Tunisie chez Telephonic Pro.', product.image_url);
  }
  for (const category of categories) {
    const route = '/category/' + slugFor(category.slug || category.name, 'categorie');
    generateHtmlFile(route, category.seo_title || 'Catégorie ' + category.name + ' | Telephonic Pro', category.seo_description || 'Découvrez nos produits dans la catégorie ' + category.name + '.', null);
  }
  for (const brand of brands) {
    const route = '/brand/' + slugFor(brand.slug || brand.name, 'marque');
    generateHtmlFile(route, 'Produits ' + brand.name + ' | Telephonic Pro', 'Découvrez les produits ' + brand.name + ' disponibles chez Telephonic Pro.', null);
  }
  for (const model of models) {
    const route = '/model/' + slugFor(model.slug || model.name, 'modele');
    generateHtmlFile(route, 'Produits ' + model.name + ' | Telephonic Pro', 'Découvrez les produits compatibles avec le modèle ' + model.name + ' chez Telephonic Pro.', null);
  }

  const urls = [...sitemapUrls].sort();
  const sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((url) => '  <url>\n    <loc>' + xmlEscape(url) + '</loc>\n  </url>').join('\n') + '\n</urlset>';
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);
  fs.writeFileSync(path.resolve(__dirname, '../public/sitemap.xml'), sitemapXml);
  console.log('SEO pages and sitemap generation complete.');
}

generateSeoPages().catch((error) => {
  console.error('SEO generation failed:', error);
  process.exit(1);
});
