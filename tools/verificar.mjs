#!/usr/bin/env node
// Harness de verificação - roda sem dependência (só Node 18+), sem build.
//
//   node tools/verificar.mjs
//
// Portões (qualquer falha = exit 1):
//   1. sintaxe      - `node --check` em todo .js do app
//   2. offline      - todo arquivo local do index.html está em ARQUIVOS_PARA_CACHE
//                     (sw.js) e todo item da lista existe no disco
//   3. cdn          - nenhum <script>/<link> apontando pra http(s) (tudo vendorizado)
//   4. cache-version- se um arquivo cacheado mudou em relação ao HEAD, CACHE_VERSION
//                     também tem que ter mudado (senão quem já instalou nunca vê)
//   5. assinatura   - a assinatura de autoria continua no app
//   6. dominio      - testes de regra de negócio em tools/testes-dominio.mjs
//
// O agente não "declara" que passou: roda isto e cola a saída.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";
import vm from "node:vm";

const RAIZ = new URL("..", import.meta.url).pathname;
const falhas = [];
let totalChecks = 0;

function check(portao, ok, msg) {
  totalChecks++;
  if (!ok) falhas.push(`[${portao}] ${msg}`);
}

function listarJs(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...listarJs(p));
    else if (nome.endsWith(".js")) out.push(p);
  }
  return out;
}

// 1. sintaxe
// Projeto ainda sem a base do app (etapa 1 do IMPLEMENTACAO.md não feita):
// os portões de estrutura viram PENDENTE e só os testes de domínio rodam.
const temBase = existsSync(join(RAIZ, "index.html")) && existsSync(join(RAIZ, "sw.js"));
const pendentes = [];
if (!temBase) pendentes.push("base - index.html/sw.js ainda não existem (portões sintaxe/offline/cdn/cache-version/assinatura não rodaram)");

const arquivosJs = [...listarJs(join(RAIZ, "js")), ...(temBase ? [join(RAIZ, "sw.js")] : [])];
for (const arq of arquivosJs) {
  try {
    execFileSync(process.execPath, ["--check", arq], { stdio: "pipe" });
    check("sintaxe", true);
  } catch (e) {
    check("sintaxe", false, `${relative(RAIZ, arq)}: ${String(e.stderr).split("\n").slice(0, 4).join(" ")}`);
  }
}

// 2/3. offline + cdn
if (temBase) {
const html = readFileSync(join(RAIZ, "index.html"), "utf8");
const sw = readFileSync(join(RAIZ, "sw.js"), "utf8");
const listaMatch = sw.match(/ARQUIVOS_PARA_CACHE\s*=\s*\[([\s\S]*?)\]/);
check("offline", !!listaMatch, "não achei ARQUIVOS_PARA_CACHE em sw.js");
const cacheados = new Set(
  (listaMatch?.[1].match(/["']([^"']+)["']/g) || []).map((s) => s.slice(1, -1).replace(/^\.\//, ""))
);
const refs = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^"'#]+)["']/g)].map((m) => m[1]);
for (const ref of refs) {
  if (/^https?:\/\//.test(ref) || ref.startsWith("//")) {
    check("cdn", false, `index.html referencia recurso externo: ${ref}`);
    continue;
  }
  const limpo = ref.replace(/^\.\//, "");
  check("offline", cacheados.has(limpo), `${limpo} está no index.html mas não em ARQUIVOS_PARA_CACHE (sw.js)`);
}
for (const c of cacheados) {
  if (c === "") continue;
  check("offline", existsSync(join(RAIZ, c)), `ARQUIVOS_PARA_CACHE lista ${c}, que não existe no disco`);
}
// imagens referenciadas no JS (ex.: assinatura) também precisam estar em cache
for (const arq of listarJs(join(RAIZ, "js"))) {
  const src = readFileSync(arq, "utf8");
  for (const m of src.matchAll(/["'`]((?:assets|icons|images)\/[^"'`\s]+\.(?:png|jpg|jpeg|svg|webp))["'`]/g)) {
    check("offline", cacheados.has(m[1]), `${relative(RAIZ, arq)} usa ${m[1]}, que não está em ARQUIVOS_PARA_CACHE`);
  }
}

// 4. cache-version
try {
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: RAIZ, stdio: "pipe" });
  const mudados = execFileSync("git", ["diff", "--name-only", "HEAD"], { cwd: RAIZ, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  const cacheadosMudados = mudados.filter((f) => cacheados.has(f) || f === "sw.js");
  if (cacheadosMudados.length > 0) {
    const diffSw = execFileSync("git", ["diff", "HEAD", "--", "sw.js"], { cwd: RAIZ, encoding: "utf8" });
    check(
      "cache-version",
      /^\+\s*const CACHE_VERSION/m.test(diffSw),
      `arquivos cacheados mudaram (${cacheadosMudados.join(", ")}) e CACHE_VERSION não subiu em sw.js`
    );
  }
} catch {
  // sem git ou sem commit ainda - portão não se aplica
}

}

// 5. assinatura
if (temBase) {
const temAssinatura = listarJs(join(RAIZ, "js")).some((arq) => {
  const s = readFileSync(arq, "utf8");
  return s.includes("michaelbullet.dev") && s.includes("bullet-logo.png");
});
check("assinatura", temAssinatura, "assinatura de autoria (michaelbullet.dev + bullet-logo.png) sumiu do app");
}

// 6. dominio - carrega os scripts como o navegador faz (mesmo escopo global)
function carregarScripts(caminhos) {
  const ctx = vm.createContext({ console, crypto: globalThis.crypto, Intl, Date, Math, Number, String, Array, Object, Symbol, JSON, Error, URLSearchParams });
  for (const c of caminhos) {
    const p = join(RAIZ, c);
    if (existsSync(p)) vm.runInContext(readFileSync(p, "utf8"), ctx, { filename: c });
  }
  return (expr) => vm.runInContext(expr, ctx);
}

const { default: testes } = await import(new URL("./testes-dominio.mjs", import.meta.url));
for (const t of testes) {
  // Teste de etapa ainda não implementada: o arquivo que ele exige não existe.
  // Aparece como PENDENTE (não falha) até a etapa criar o arquivo - a partir
  // daí vira portão normal.
  if (t.exige && !t.exige.every((f) => existsSync(join(RAIZ, f)))) {
    pendentes.push(`${t.etapa || "?"} - ${t.nome}`);
    continue;
  }
  try {
    const avaliar = carregarScripts(t.scripts);
    const r = t.rodar(avaliar);
    check("dominio", r === true, `${t.nome}: ${r === true ? "" : r}`);
  } catch (e) {
    check("dominio", false, `${t.nome}: exceção ${e.message}`);
  }
}

// resultado
if (pendentes.length) {
  console.log(`PENDENTES (etapa ainda não implementada - não contam como falha):`);
  for (const p of pendentes) console.log("  - " + p);
  console.log("");
}
if (falhas.length) {
  console.log(`FALHOU - ${falhas.length} de ${totalChecks} checagens\n`);
  for (const f of falhas) console.log("  x " + f);
  process.exit(1);
}
console.log(`OK - ${totalChecks} checagens passaram (sintaxe, offline, cdn, cache-version, assinatura, dominio)`);
