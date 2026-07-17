# mh34

Site de aniversário da mh, feito e publicado no GitHub Pages ano após ano. Cada edição tem seu próprio repositório (`mh32`, `mh34`, `mh35`...) com um site simples que expõe a logo do ano e uma lista de presentes ligada a uma planilha do Google Sheets.

## Estrutura

- `index.html`, `style.css`, `script.js` — o site da edição atual.
- `assets/logo.jpg` — brasão com fundo branco opaco, usado no favicon e no `og:image` (preview de link).
- `assets/logo.png` — mesmo brasão com fundo transparente, usado na página em si, pra se adaptar ao modo claro/escuro do visitante.
- `editions/` — arquivo com as edições anteriores (ver seção própria abaixo).

O site inteiro é estático — HTML/CSS/JS puro, sem build step — então basta publicar a raiz do repositório no GitHub Pages (Settings → Pages → Deploy from branch → `main` / `root`).

## Lista de presentes (Google Sheets + Apps Script)

O `script.js` busca os presentes num Google Apps Script publicado como Web App, que lê uma planilha do Google Sheets.

**Planilha — aba `presentes`:** colunas `id`, `presente`, `preco`, `status` (`disponivel` / `reservado`), `tamanho`, `cor` (nem todo link de produto persiste no tempo, então a cor exata fica registrada aqui pros itens que têm variação), `link` (URL do produto, pra quem for comprar pesquisar/conferir).

**Planilha — aba `confirmacoes`** (nova, pro RSVP de nome + sozinho/acompanhado): colunas `nome`, `acompanhado`, `criado_em`. Só precisa da linha de cabeçalho — o script preenche o resto.

**Apps Script** (colar em Extensões → Apps Script, a partir da própria planilha ou de um projeto avulso):

```javascript
const SPREADSHEET_ID = "COLE_AQUI_O_ID_DA_PLANILHA"; // vem da URL: .../spreadsheets/d/<ID>/edit
const SHEET_NAME = "presentes"; // nome exato da aba, sem espaço a mais no final
const RSVP_SHEET_NAME = "confirmacoes"; // idem, aba do RSVP

function doGet(e) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const [header, ...data] = rows;
  const idx = {
    id: header.indexOf("id"),
    presente: header.indexOf("presente"),
    preco: header.indexOf("preco"),
    status: header.indexOf("status"),
    tamanho: header.indexOf("tamanho"),
    cor: header.indexOf("cor"),
    link: header.indexOf("link"),
  };
  const gifts = data
    .filter((row) => row[idx.id] !== "")
    .map((row) => ({
      id: row[idx.id],
      presente: row[idx.presente],
      preco: row[idx.preco],
      status: row[idx.status],
      tamanho: row[idx.tamanho],
      cor: row[idx.cor],
      link: row[idx.link],
    }));
  return ContentService.createTextOutput(JSON.stringify(gifts)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.type === "rsvp") return handleRsvp(body);
  return handleGiftReservation(body);
}

function handleGiftReservation(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const targetId = String(body.id);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const rows = sheet.getDataRange().getValues();
    const header = rows[0];
    const idx = { id: header.indexOf("id"), status: header.indexOf("status") };
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][idx.id]) === targetId) {
        if (rows[i][idx.status] !== "disponivel") return respond({ ok: false, reason: "ja_reservado" });
        sheet.getRange(i + 1, idx.status + 1).setValue("reservado");
        return respond({ ok: true });
      }
    }
    return respond({ ok: false, reason: "nao_encontrado" });
  } finally {
    lock.releaseLock();
  }
}

function handleRsvp(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(RSVP_SHEET_NAME);
    sheet.appendRow([body.nome, body.acompanhado ? "sim" : "não", new Date()]);
    return respond({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

O front-end (`script.js`) já manda `{ type: "rsvp", nome, acompanhado }` no POST do componente de presença, e `{ id }` (sem `type`) no POST de reserva de presente — é assim que `doPost` decide qual dos dois tratar.

Pontos que já causaram dor de cabeça e valem nota:
- Use sempre `SpreadsheetApp.openById(SPREADSHEET_ID)`, nunca `getActive()` — um script deployado como Web App não tem "planilha ativa" de forma confiável.
- Confira o nome da aba com cuidado: um espaço em branco no final (`"presentes "`) já faz `getSheetByName` retornar `null` silenciosamente. Se aparecer o erro `Cannot read properties of null (reading 'getDataRange')`, é isso.
- Depois de editar o script, é preciso **Implantar → Gerenciar implantações → editar → Nova versão** — só salvar o código não atualiza a URL `/exec` já publicada.
- Copie a URL final (termina em `/exec`) para `API_URL` no topo do `script.js`.

## Ajustes rápidos pra uma edição nova

Ao começar o site de um ano novo (copiando este repositório como ponto de partida):

- `assets/logo.jpg` e `assets/logo.png` — trocar pelo brasão do ano (o `.png` deve ter fundo transparente; veja o histórico de conversas com o Claude sobre como gerar isso a partir de um `.jpg` com fundo branco, se precisar).
- `index.html` — endereço no `.masthead`, texto "trinta e X" no `.hero__title`, data/hora no `.event-meta`.
- `script.js` — `EVENT_DATE` (data/hora alvo da contagem regressiva) e `PRICE_BRACKETS` (faixas de preço que agrupam o dropdown de presentes; edite esse array conforme os valores da planilha).
- `API_URL` — nova URL do Apps Script daquele ano.

O modo escuro, a animação de entrada e o botão de compartilhar já funcionam automaticamente, sem precisar mexer em nada.

## Edições anteriores (`editions/`)

Cada aniversário passado vira uma pasta congelada dentro de `editions/<ano>/` (ex.: `editions/mh32/`), visível a partir do link "edições anteriores" no rodapé do site atual, que leva a `editions/index.html` — uma lista com um botão por ano.

**Ao arquivar uma edição** (ex.: quando o mh35 nascer e o mh34 vira passado):

1. Copie a pasta `editions/` inteira do repositório do ano anterior para o novo (ela já traz as edições arquivadas até ali).
2. Crie `editions/mh34/` com uma **cópia fiel** dos arquivos daquele site (`index.html`, `style.css`/`css/`, `script.js`/`js/`, imagens) — mesma fonte, mesma cor, mesmo layout daquele ano. Ajustes técnicos permitidos (não descaracterizam a cópia):
   - Corrigir caminhos absolutos que dependiam da estrutura antiga, para os arquivos carregarem de dentro de `editions/<ano>/`.
   - Adicionar `disabled` em qualquer campo de formulário, dropdown ou botão de envio — a edição arquivada é só uma peça de recordação, não deve aceitar interação.
   - Adicionar dois botões de navegação logo abaixo do componente principal da página, usando a mesma cor/fonte daquela edição:
     - `← outras edições` → `../index.html`
     - `edição atual →` → `../../index.html`
3. Em `editions/index.html`, adicione um novo botão `.edition-btn` apontando para `mh34/index.html` (tem um comentário no HTML marcando onde).
4. O link "voltar para a edição atual" em `editions/index.html` já é um botão sólido e grande de propósito — não deixe ele voltar a ser um linkzinho discreto, é fácil de perder de vista.

Nenhuma edição arquivada precisa (nem deve) ter o formulário de presentes funcionando de fato — o objetivo é lembrança, não reserva.

**mh33** é um caso especial: não teve site na época, então `editions/mh33/` foi criado do zero (não é cópia de nada) com só um componente central, no mesmo espírito do mh32. Assim que tiver a arte do convite, salve o arquivo em `editions/mh33/assets/convite.jpg` (ou `.png`) e troque o bloco `.invite-placeholder` do `editions/mh33/index.html` pela tag `<img>` comentada logo acima dele no próprio arquivo. A paleta usada por enquanto é o indigo padrão do mh34 — pode (e deve) trocar pelas cores da arte quando ela chegar.
