// Upload de retrato de personagem — redimensiona no navegador (canvas,
// sem lib) antes de subir, pra não jogar fotos de celular de vários MB
// pro bucket. Bucket "retratos": leitura pública, upload só autenticado
// (ver supabase/schema.sql).
import { supabase } from "./supabaseClient.js";

const BUCKET = "retratos";
const MAX_DIM = 512;
const JPEG_QUALITY = 0.8;

function resizeToJpeg(file, maxDim = MAX_DIM, quality = JPEG_QUALITY) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível converter a imagem."))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível ler o arquivo como imagem."));
    };
    img.src = objectUrl;
  });
}

function pathFromPublicUrl(publicUrl) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  return idx === -1 ? null : publicUrl.slice(idx + marker.length);
}

// Redimensiona, sobe pro bucket "retratos" e devolve a URL pública.
export async function uploadPortrait(file, characterId) {
  if (!supabase) throw new Error("Supabase não configurado — não dá pra subir imagem agora.");
  const blob = await resizeToJpeg(file);
  const safeId = (characterId || "personagem").toString().replace(/[^a-z0-9_-]/gi, "_");
  const path = `${safeId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Remoção best-effort — se falhar (sem sessão, URL de fora do bucket, etc.),
// não é motivo pra travar a UI: o botão "Remover" já limpou o imageUrl da
// ficha, que é o que importa pro usuário.
export async function removePortrait(publicUrl) {
  if (!supabase || !publicUrl) return;
  const path = pathFromPublicUrl(publicUrl);
  if (!path) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (e) {
    // ver comentário acima
  }
}
