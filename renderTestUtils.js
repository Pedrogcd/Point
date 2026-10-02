// Helper de teste: carrega os componentes React de point-amaranth-app.jsx
// pra poderem ser renderizados com react-dom/server em testes de "smoke"
// (ver characterForm.render.test.js).
//
// point-amaranth-app.jsx é .jsx — `node --test` não entende JSX nativamente.
// Em vez de montar um pipeline de transform só pra isso, usamos o rolldown
// (o bundler que o próprio Vite 8 já usa por baixo — é dependência real do
// projeto, não algo adicionado só pro teste) pra compilar o arquivo pra JS
// puro antes de importar. O bundle vai pra um arquivo temporário DENTRO do
// repositório (precisa estar abaixo de um node_modules pra "react"/
// "lucide-react" resolverem como import nu) e é apagado logo depois do
// import completar.
import { build } from "rolldown";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(PROJECT_ROOT, "point-amaranth-app.jsx");

// Carrega point-amaranth-app.jsx compilado. Devolve os exports nomeados
// usados nos testes (CharacterForm, CompareView, SEED_CHARACTERS) + default.
export async function loadAppModule() {
  const outFile = path.join(PROJECT_ROOT, `.render-test-bundle.${process.pid}.${Date.now()}.mjs`);
  await build({
    input: ENTRY,
    cwd: PROJECT_ROOT,
    // Mantém como import nu de verdade (não inlineia) pra Node resolver
    // normalmente via node_modules — nenhum desses tem JSX nem precisa de
    // transform, só o point-amaranth-app.jsx e os módulos que ele importa.
    external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime", "lucide-react", "@supabase/supabase-js"],
    output: { format: "esm", file: outFile },
    logLevel: "silent",
  });
  try {
    return await import(`file://${outFile}`);
  } finally {
    fs.rmSync(outFile, { force: true });
  }
}
