// Camada de dados - IndexedDB puro (sem lib externa: menos peso pro PWA
// offline e o schema é simples: 3 stores + 1 registro de config).

const DB_NAME = "arqueacao-db";
const DB_VERSION = 1;

function abrirDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("tabelas")) {
        db.createObjectStore("tabelas", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("tanques")) {
        db.createObjectStore("tanques", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("fechamentos")) {
        const store = db.createObjectStore("fechamentos", { keyPath: "id" });
        store.createIndex("dataHora", "dataHora");
      }
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let _dbPromise = null;
function getDb() {
  if (!_dbPromise) _dbPromise = abrirDb();
  return _dbPromise;
}

function tx(storeName, mode) {
  return getDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const DB = {
  async getAll(storeName) {
    const store = await tx(storeName, "readonly");
    return reqToPromise(store.getAll());
  },
  async get(storeName, id) {
    const store = await tx(storeName, "readonly");
    return reqToPromise(store.get(id));
  },
  async put(storeName, value) {
    const store = await tx(storeName, "readwrite");
    return reqToPromise(store.put(value));
  },
  async putMany(storeName, values) {
    const store = await tx(storeName, "readwrite");
    await Promise.all(values.map((v) => reqToPromise(store.put(v))));
  },
  async delete(storeName, id) {
    const store = await tx(storeName, "readwrite");
    return reqToPromise(store.delete(id));
  },
  async clear(storeName) {
    const store = await tx(storeName, "readwrite");
    return reqToPromise(store.clear());
  },

  // Primeira abertura: popula tabelas/tanques/config padrão se o banco
  // estiver vazio. Fechamentos nunca são pré-populados.
  async seedSeNecessario() {
    const tabelas = await DB.getAll("tabelas");
    if (tabelas.length === 0) {
      await DB.putMany("tabelas", Object.values(TABLES_DATA));
    }
    const tanques = await DB.getAll("tanques");
    if (tanques.length === 0) {
      await DB.putMany("tanques", TANQUES_PADRAO);
    } else {
      // Migração leve: o nome do tanque não tem editor na UI (só a tabela
      // associada é editável), então qualquer nome salvo veio da semente -
      // seguro resincronizar com TANQUES_PADRAO sem mexer em tabelaId/ativo,
      // que são as partes que o usuário de fato configura.
      const nomesPadrao = Object.fromEntries(TANQUES_PADRAO.map((t) => [t.id, t.nome]));
      const desatualizados = tanques.filter((t) => nomesPadrao[t.id] && t.nome !== nomesPadrao[t.id]);
      if (desatualizados.length > 0) {
        await DB.putMany(
          "tanques",
          desatualizados.map((t) => ({ ...t, nome: nomesPadrao[t.id] }))
        );
      }
    }
    const config = await DB.get("config", "singleton");
    if (!config) {
      await DB.put("config", {
        id: "singleton",
        nomePosto: "",
        ultimoOperador: "",
        versaoSchema: 1,
      });
    }
  },

  async getConfig() {
    return DB.get("config", "singleton");
  },
  async setConfig(patch) {
    const atual = (await DB.getConfig()) || { id: "singleton" };
    const novo = { ...atual, ...patch, id: "singleton" };
    await DB.put("config", novo);
    return novo;
  },

  async getTanquesOrdenados() {
    const tanques = await DB.getAll("tanques");
    return tanques.filter((t) => t.ativo).sort((a, b) => a.ordem - b.ordem);
  },

  async getFechamentosOrdenados() {
    const fechamentos = await DB.getAll("fechamentos");
    return fechamentos.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
  },

  // Backup completo (RF-04): exporta tudo, inclusive tabelas/tanques
  // personalizados, para JSON.
  async exportarBackup() {
    const [tabelas, tanques, fechamentos, config] = await Promise.all([
      DB.getAll("tabelas"),
      DB.getAll("tanques"),
      DB.getAll("fechamentos"),
      DB.getConfig(),
    ]);
    return {
      versao: 1,
      geradoEm: new Date().toISOString(),
      tabelas,
      tanques,
      fechamentos,
      config,
    };
  },

  async importarBackup(backup) {
    if (!backup || !Array.isArray(backup.fechamentos)) {
      throw new Error("Arquivo de backup inválido.");
    }
    await DB.clear("tabelas");
    await DB.clear("tanques");
    await DB.clear("fechamentos");
    await DB.putMany("tabelas", backup.tabelas || []);
    await DB.putMany("tanques", backup.tanques || []);
    await DB.putMany("fechamentos", backup.fechamentos || []);
    if (backup.config) await DB.put("config", { ...backup.config, id: "singleton" });
  },
};
