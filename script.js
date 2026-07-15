// ⚠️ Troque pela URL do seu Web App do Apps Script (termina em /exec)
const API_URL = "https://script.google.com/macros/s/SEU_ID_AQUI/exec";

const select = document.getElementById("gift-select");
const confirmBtn = document.getElementById("confirm-btn");
const statusEl = document.getElementById("status");
const receiptEl = document.getElementById("receipt");
const receiptItem = document.getElementById("receipt-item");
const receiptPrice = document.getElementById("receipt-price");

let gifts = [];

function formatPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function setStatus(message, state) {
  statusEl.textContent = message;
  if (state) {
    statusEl.setAttribute("data-state", state);
  } else {
    statusEl.removeAttribute("data-state");
  }
}

async function loadGifts() {
  select.disabled = true;
  select.innerHTML = "<option value=''>carregando lista...</option>";
  setStatus("");

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("falha ao buscar a lista");
    const data = await res.json();
    gifts = data.filter((g) => g.status === "disponivel");

    if (gifts.length === 0) {
      select.innerHTML = "<option value=''>todos os presentes já foram escolhidos 💙</option>";
      confirmBtn.disabled = true;
      return;
    }

    select.innerHTML =
      "<option value=''>selecione um presente</option>" +
      gifts.map((g) => `<option value="${g.id}">${g.presente}</option>`).join("");
    select.disabled = false;
  } catch (err) {
    select.innerHTML = "<option value=''>não foi possível carregar a lista</option>";
    setStatus("Erro ao carregar a lista. Tente atualizar a página.", "err");
  }
}

select.addEventListener("change", () => {
  const chosen = gifts.find((g) => String(g.id) === select.value);
  if (!chosen) {
    receiptEl.hidden = true;
    confirmBtn.disabled = true;
    return;
  }
  receiptItem.textContent = chosen.presente;
  receiptPrice.textContent = formatPrice(chosen.preco);
  receiptEl.hidden = false;
  confirmBtn.disabled = false;
  setStatus("");
});

confirmBtn.addEventListener("click", async () => {
  const chosen = gifts.find((g) => String(g.id) === select.value);
  if (!chosen) return;

  confirmBtn.disabled = true;
  setStatus("Reservando...");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ id: chosen.id }),
    });
    const result = await res.json();

    if (result.ok) {
      setStatus(`"${chosen.presente}" reservado com sucesso. Obrigado! 💙`, "ok");
      receiptEl.hidden = true;
      select.value = "";
      await loadGifts();
    } else {
      setStatus("Ops, alguém acabou de escolher esse presente. Atualizando a lista...", "err");
      await loadGifts();
    }
  } catch (err) {
    setStatus("Erro ao confirmar. Tente novamente.", "err");
    confirmBtn.disabled = false;
  }
});

loadGifts();
