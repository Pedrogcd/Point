// Upload de retrato de personagem — redimensiona no navegador (canvas,
// sem lib) antes de subir, pra não jogar fotos de celular de vários MB
// pro bucket. Bucket "retratos": leitura e escrita públicas, sem exigir
// login (ver supabase/schema.sql).
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

// Mesa (07/11): imagens do tabuleiro (mapas e tokens) — maiores que o
// retrato (até 1600 px). Sem Supabase (modo local), devolve um data URL
// menor (até 1000 px) pra caber no localStorage.
function blobParaDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    leitor.readAsDataURL(blob);
  });
}

export async function uploadImagemMesa(file) {
  if (!supabase) {
    const blob = await resizeToJpeg(file, 1000, 0.8);
    const { width, height } = await dimensoesDoBlob(blob);
    return { url: await blobParaDataUrl(blob), width, height };
  }
  const blob = await resizeToJpeg(file, 1600, 0.85);
  const { width, height } = await dimensoesDoBlob(blob);
  const path = `mesa/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, width, height };
}

function dimensoesDoBlob(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 512, height: 512 }); };
    img.src = url;
  });
}
