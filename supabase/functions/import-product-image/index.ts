import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const maxImageBytes = 15 * 1024 * 1024;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeMediaBaseName(value: string): string {
  return value
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || `image-${Date.now()}`;
}

function directImageUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("L'URL de l'image doit commencer par http:// ou https://.");
  if (url.username || url.password) throw new Error("L'URL de l'image n'est pas valide.");

  const driveHosts = new Set(["drive.google.com", "docs.google.com", "drive.usercontent.google.com"]);
  if (!driveHosts.has(url.hostname.toLowerCase())) return url;

  const id = url.searchParams.get("id") || url.pathname.match(/\/d\/([^/]+)/)?.[1];
  if (!id) return url;
  const direct = new URL(`https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w1600`);
  const resourceKey = url.searchParams.get("resourcekey");
  if (resourceKey) direct.searchParams.set("resourcekey", resourceKey);
  return direct;
}

function assertPublicHttpUrl(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
    host.endsWith(".internal") || host === "metadata.google.internal" ||
    host === "0.0.0.0" || host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")
  ) throw new Error("L'URL doit pointer vers un site d'image public.");

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1, 3).map(Number);
    const privateAddress = a === 10 || a === 127 || a === 0 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
    if (privateAddress || ipv4.slice(1).some(part => Number(part) > 255)) {
      throw new Error("L'URL doit pointer vers un site d'image public.");
    }
  } else if (host.includes(":") && !host.startsWith("lh3.googleusercontent.com")) {
    throw new Error("Les adresses IP ne sont pas acceptées pour les photos.");
  }
}

async function fetchImage(startUrl: URL) {
  let url = startUrl;
  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    assertPublicHttpUrl(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.5" },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new Error("Le téléchargement de l'image a dépassé 25 secondes.");
      throw new Error("Le serveur de l'image est inaccessible.");
    } finally {
      clearTimeout(timeoutId);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 5) throw new Error("Trop de redirections pour télécharger l'image.");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error(`Le serveur de l'image répond ${response.status}.`);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > maxImageBytes) throw new Error("L'image dépasse la taille maximale de 15 Mo.");
    if (!response.body) throw new Error("Le serveur n'a pas retourné de fichier image.");

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxImageBytes) {
        await reader.cancel();
        throw new Error("L'image dépasse la taille maximale de 15 Mo.");
      }
      chunks.push(value);
    }
    if (!total) throw new Error("Le fichier image est vide.");

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const type = detectImageType(bytes, response.headers.get("content-type") || "");
    return { bytes, ...type };
  }
  throw new Error("Impossible de télécharger l'image.");
}

function detectImageType(bytes: Uint8Array, header: string): { mime: string; extension: string } {
  const mime = header.split(";")[0].trim().toLowerCase();
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" };
  if (bytes[0] === 0x89 && String.fromCharCode(...bytes.slice(1, 4)) === "PNG") return { mime: "image/png", extension: "png" };
  if (String.fromCharCode(...bytes.slice(0, 3)) === "GIF") return { mime: "image/gif", extension: "gif" };
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { mime: "image/webp", extension: "webp" };
  if (String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" && /^(avif|avis)$/.test(String.fromCharCode(...bytes.slice(8, 12)))) return { mime: "image/avif", extension: "avif" };

  const supported = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/gif", "gif"], ["image/webp", "webp"], ["image/avif", "avif"]]);
  const extension = supported.get(mime);
  if (extension) return { mime, extension };
  throw new Error("Le lien ne retourne pas une image JPG, PNG, GIF, WebP ou AVIF.");
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Configuration Supabase incomplète.");

    const authorization = request.headers.get("Authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "");
    if (!accessToken) return json({ error: "Connexion administrateur requise." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await userClient.auth.getUser(accessToken);
    if (authError || !authData.user) return json({ error: "Session expirée ; reconnectez-vous à l'administration." }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await adminClient.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profileError) throw new Error("Impossible de vérifier les droits d'administration.");
    if (profile?.role !== "admin") return json({ error: "Réservé aux administrateurs." }, 403);

    const body = await request.json().catch(() => null);
    const productName = typeof body?.productName === "string" ? body.productName.trim().slice(0, 180) : "";
    const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (!productName || !imageUrl || imageUrl.length > 2048) return json({ error: "Nom du produit ou URL de photo invalide." }, 400);

    let source: URL;
    try { source = directImageUrl(imageUrl); }
    catch { return json({ error: "URL d'image invalide." }, 400); }

    const image = await fetchImage(source);
    const fileName = `${safeMediaBaseName(productName)}.${image.extension}`;
    const path = `media/${fileName}`;
    const { error: uploadError } = await adminClient.storage.from("shop-images").upload(path, image.bytes, {
      contentType: image.mime,
      cacheControl: "3600",
      upsert: true,
    });
    if (uploadError) throw new Error("Échec de l'enregistrement dans Supabase Storage : " + uploadError.message);

    const { data: publicData } = adminClient.storage.from("shop-images").getPublicUrl(path);
    const version = new Date().toISOString();
    const publicUrl = `${publicData.publicUrl}?v=${encodeURIComponent(version)}`;
    return json({
      uploaded: true,
      asset: { name: fileName, path, publicUrl, updatedAt: version },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue pendant le transfert de l'image.";
    return json({ error: message }, 400);
  }
});
