// Tabelas de arqueação pré-carregadas.
//
// Os três tanques fotografados no posto são cilindros horizontais de
// diâmetro interno 2.549 mm. O volume de líquido em função da altura (h, em
// cm) num cilindro horizontal de raio R e comprimento L é dado pela área do
// segmento circular molhado vezes o comprimento:
//
//   area(h) = R² · acos((R−h)/R) − (R−h) · √(2·R·h − h²)
//   volume(h) = area(h) · L
//
// Essas três tabelas foram GERADAS por essa fórmula (não digitadas foto a
// foto) - o mesmo método que a ARXO usa (ver "Tabela de Arqueação Teórica"
// na foto), mais confiável do que ler centenas de números pequenos numa
// foto de celular.
//
// petroaco_15000 e petroaco_10000_pleno: CONFERIDAS PONTO A PONTO (254/254,
// cm 1 a 254) contra a tabela oficial "PETROAÇO SÃO JOÃO" publicada em
// petroacosaojoao.com.br/tabelas-de-arqueacao (PDFs "TABELA DE ARQUEAÇÃO -
// TANQUE MODELO 15.000/10.000 LTS", mesmas dimensões 2.549×3.000mm e
// 2.549×2.000mm) - zero divergência em todos os 254 pontos. Esse cruzamento
// também pegou um bug real: as duas tabelas só iam até cm=248, faltando os
// 6cm finais até o diâmetro (254,9mm ≈ 254cm) - corrigido com os valores
// oficiais. `verificado: true` nas duas a partir disso (era `false` até
// essa conferência - ver git log se quiser o antes/depois).
//
// Nota: o rascunho do PRD (critério de aceite #1) cita "129 cm → 7.391 L".
// O valor real na tabela oficial é 124 cm → 7.391 L (129 cm → 7.773 L) -
// confirmado contra o PDF do fabricante, não é mais só suposição. Muito
// provavelmente um typo de digitação no PRD (124↔129). Ver CLAUDE.md.

const TABLES_DATA = {
  petroaco_15000: {
    id: "petroaco_15000",
    nome: "Petroaço São João 15.000 L (compartimento)",
    fabricante: "Petroaço São João",
    diametroMm: 2549,
    comprimentoMm: 3000,
    capacidadeNominalL: 15309,
    verificado: true,
    origem:
      "Calculado (cilindro horizontal, Ø 2.549 mm, L 3.000 mm) e conferido 254/254 pontos contra a tabela oficial PETROAÇO SÃO JOÃO em petroacosaojoao.com.br/tabelas-de-arqueacao",
    linhas: [6,18,33,51,71,93,117,143,171,200,230,262,295,329,364,401,439,477,517,558,599,642,685,729,774,820,867,914,963,1011,1061,1111,1162,1214,1266,1319,1373,1427,1482,1537,1593,1650,1707,1764,1822,1881,1940,1999,2059,2120,2181,2242,2304,2366,2429,2492,2556,2620,2684,2749,2814,2879,2945,3011,3078,3144,3212,3279,3347,3415,3483,3552,3621,3690,3760,3830,3900,3970,4041,4112,4183,4254,4326,4397,4469,4542,4614,4687,4760,4833,4906,4979,5053,5126,5200,5274,5348,5423,5497,5572,5647,5721,5796,5872,5947,6022,6097,6173,6249,6324,6400,6476,6552,6628,6704,6780,6856,6933,7009,7085,7162,7238,7314,7391,7467,7544,7620,7697,7773,7850,7926,8002,8079,8155,8232,8308,8384,8460,8537,8613,8689,8765,8841,8917,8992,9068,9144,9219,9295,9370,9445,9520,9595,9670,9745,9819,9894,9968,10042,10116,10190,10264,10337,10411,10484,10557,10630,10702,10775,10847,10919,10991,11062,11133,11205,11275,11346,11416,11486,11556,11626,11695,11764,11833,11901,11969,12037,12104,12171,12238,12305,12371,12436,12502,12567,12632,12696,12760,12823,12886,12949,13011,13073,13134,13195,13256,13316,13375,13434,13493,13551,13608,13665,13722,13777,13833,13887,13942,13995,14048,14100,14152,14203,14253,14303,14351,14400,14447,14494,14539,14584,14628,14672,14714,14756,14796,14836,14874,14912,14948,14984,15018,15051,15082,15113,15141,15169,15194,15218,15240,15260,15278,15292,15304],
  },

  petroaco_10000_pleno: {
    id: "petroaco_10000_pleno",
    nome: "Petroaço São João 10.000 L pleno (S500)",
    fabricante: "Petroaço São João",
    diametroMm: 2549,
    comprimentoMm: 2000,
    capacidadeNominalL: 10206,
    verificado: true,
    origem:
      "Calculado (cilindro horizontal, Ø 2.549 mm, L 2.000 mm) e conferido 254/254 pontos contra a tabela oficial PETROAÇO SÃO JOÃO em petroacosaojoao.com.br/tabelas-de-arqueacao",
    linhas: [4,12,22,34,47,62,78,95,114,133,153,174,196,219,243,267,292,318,345,372,399,428,457,486,516,547,578,610,642,674,707,741,775,809,844,880,915,951,988,1025,1062,1100,1138,1176,1215,1254,1293,1333,1373,1413,1454,1495,1536,1578,1619,1662,1704,1746,1789,1832,1876,1919,1963,2007,2052,2096,2141,2186,2231,2277,2322,2368,2414,2460,2507,2553,2600,2647,2694,2741,2789,2836,2884,2932,2980,3028,3076,3124,3173,3222,3270,3319,3368,3418,3467,3516,3566,3615,3665,3715,3764,3814,3864,3914,3964,4015,4065,4115,4166,4216,4267,4317,4368,4419,4469,4520,4571,4622,4673,4723,4774,4825,4876,4927,4978,5029,5080,5131,5182,5233,5284,5335,5386,5437,5488,5539,5589,5640,5691,5742,5793,5843,5894,5944,5995,6045,6096,6146,6196,6247,6297,6347,6397,6447,6497,6546,6596,6645,6695,6744,6793,6843,6892,6941,6989,7038,7086,7135,7183,7231,7279,7327,7375,7422,7470,7517,7564,7611,7658,7704,7750,7797,7843,7888,7934,7979,8025,8069,8114,8159,8203,8247,8291,8335,8378,8421,8464,8506,8549,8591,8633,8674,8715,8756,8797,8837,8877,8917,8956,8995,9034,9072,9110,9148,9185,9222,9258,9294,9330,9365,9400,9435,9468,9502,9535,9568,9600,9631,9662,9693,9723,9752,9781,9809,9837,9864,9891,9916,9941,9966,9989,10012,10034,10055,10075,10094,10112,10130,10146,10160,10173,10185,10195,10202],
  },

  arxo_10000: {
    id: "arxo_10000",
    nome: "ARXO 10.000 L subterrâneo bipartido",
    fabricante: "ARXO",
    diametroMm: 2549,
    comprimentoMm: 1995.8,
    capacidadeNominalL: 10181,
    margemErroPct: 2.5,
    verificado: true,
    origem:
      "(tabela impressa ARXO, legível) e conferido contra a fórmula do cilindro horizontal",
    linhas: [4,12,22,34,47,62,78,95,113,133,153,174,196,219,242,267,292,317,344,371,399,427,456,485,515,546,577,608,640,673,706,739,773,808,843,878,913,949,986,1023,1060,1097,1135,1174,1212,1251,1291,1330,1370,1410,1451,1492,1533,1574,1616,1658,1700,1743,1786,1829,1872,1915,1959,2003,2047,2092,2137,2182,2227,2272,2317,2363,2409,2455,2501,2548,2594,2641,2688,2735,2783,2830,2878,2925,2973,3021,3070,3118,3166,3215,3264,3312,3361,3410,3460,3509,3558,3608,3657,3707,3756,3806,3856,3906,3956,4006,4056,4107,4157,4207,4258,4308,4359,4409,4460,4511,4561,4612,4663,4714,4764,4815,4866,4917,4968,5019,5069,5120,5171,5222,5273,5324,5375,5425,5476,5527,5578,5628,5679,5730,5780,5831,5881,5932,5982,6033,6083,6133,6183,6234,6284,6333,6383,6433,6483,6533,6582,6631,6681,6730,6779,6828,6877,6926,6975,7023,7072,7120,7168,7216,7264,7312,7359,7407,7454,7501,7548,7595,7641,7688,7734,7780,7826,7872,7917,7963,8008,8053,8097,8142,8186,8230,8274,8317,8360,8403,8446,8489,8531,8573,8614,8656,8697,8738,8778,8819,8858,8898,8937,8976,9015,9053,9091,9129,9166,9202,9239,9275,9310,9346,9380,9415,9449,9482,9515,9548,9580,9611,9642,9673,9702,9732,9761,9789,9816,9843,9870,9895,9920,9945,9968,9991,10013,10034,10054,10073,10091,10108,10124,10139,10152,10164,10174,10181],
  },
};

// Tanques padrão do posto (RF-08). A tabela é responsabilidade da
// configuração, não do código - pode ser trocada em Configurações.
// nome não repete o produto (ex.: "Tanque 5", não "Tanque 5 - S10") - o
// produto já aparece em destaque ao lado (campo `produto`), duplicar os dois
// juntos ficava redundante nas telas de Consulta e Configurações.
const TANQUES_PADRAO = [
  { id: "gc", nome: "Tanque 1", produto: "GC", tabelaId: "petroaco_15000", ordem: 1, ativo: true },
  { id: "ga", nome: "Tanque 2", produto: "GA", tabelaId: "petroaco_15000", ordem: 2, ativo: true },
  { id: "ac", nome: "Tanque 3", produto: "AC", tabelaId: "petroaco_15000", ordem: 3, ativo: true },
  { id: "aa", nome: "Tanque 4", produto: "AA", tabelaId: "petroaco_15000", ordem: 4, ativo: true },
  { id: "s10", nome: "Tanque 5", produto: "S10", tabelaId: "petroaco_15000", ordem: 5, ativo: true },
  { id: "s500", nome: "Tanque 6", produto: "S500", tabelaId: "petroaco_10000_pleno", ordem: 6, ativo: true },
];

const PRODUTOS_NOMES = {
  GC: "Gasolina comum",
  GA: "Gasolina aditivada",
  AC: "Álcool comum",
  AA: "Álcool aditivado",
  S10: "Diesel S10",
  S500: "Diesel S500",
};
