// RF-07 - compartilhar pelo WhatsApp.

async function compartilharArquivo(blob, nomeArquivo, mimeType, tituloCompartilhamento) {
  const arquivo = new File([blob], nomeArquivo, { type: mimeType });
  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: tituloCompartilhamento });
      return { modo: "share" };
    } catch (err) {
      if (err && err.name === "AbortError") return { modo: "cancelado" };
      // cai no fallback de download se o share falhar por outro motivo
    }
  }
  baixarBlob(blob, nomeArquivo);
  return { modo: "download" };
}

function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function textoResumoFechamento(fechamento) {
  const linhas = fechamento.leituras.map(
    (l) => `${l.produto}: ${formatNumero(l.cm)} cm → ${formatLitros(l.litros)}`
  );
  return [
    `Fechamento ${formatDataHora(fechamento.dataHora)} - Operador: ${fechamento.operador || "-"}`,
    ...linhas,
    `Total: ${formatLitros(fechamento.totalLitros)}`,
  ].join("\n");
}

async function copiarTexto(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(texto);
    return true;
  }
  const ta = document.createElement("textarea");
  ta.value = texto;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}
