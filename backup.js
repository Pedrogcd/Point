// Backup/restauração do estado do app em JSON — funções puras, sem depender
// de File/Blob/download (isso é específico de navegador e fica em
// point-amaranth-app.jsx), pra poderem ser testadas com node --test
// (ver backup.test.js).

const BACKUP_KEYS = ["characters", "kingdoms", "gods", "sagas", "objectives"];

// Monta o objeto de backup a partir do estado atual do app.
export function buildBackup(state) {
  const backup = { version: 1, exportedAt: new Date().toISOString() };
  for (const key of BACKUP_KEYS) backup[key] = state?.[key] ?? [];
  return backup;
}

// Valida e normaliza um backup recebido (texto de um arquivo .json importado,
// ou já um objeto). Lança erro com mensagem amigável se o formato não bate —
// quem chama decide como mostrar isso (ex: num ConfirmDialog ou mensagem
// inline).
export function parseBackup(raw) {
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    throw new Error("Arquivo inválido: não é um JSON válido.");
  }
  if (!data || typeof data !== "object" || !Array.isArray(data.characters)) {
    throw new Error("Arquivo inválido: não parece um backup do Point (falta a lista de personagens).");
  }
  const result = {};
  for (const key of BACKUP_KEYS) result[key] = Array.isArray(data[key]) ? data[key] : [];
  return result;
}
