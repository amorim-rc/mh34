const API_URL = "https://script.google.com/macros/s/AKfycbz_gum8OPegUvJ5s_SxQi7qKG0_vcyZaDTifQKob5CoxSjEjp8VJPkDJcpJL-r5dKjiuQ/exec";

const select = document.getElementById("gift-select");
const confirmBtn = document.getElementById("confirm-btn");
const statusEl = document.getElementById("status");
const receiptEl = document.getElementById("receipt");
const receiptItem = document.getElementById("receipt-item");
const receiptPrice = document.getElementById("receipt-price");

let gifts = [];

// Faixas de preço usadas para agrupar o dropdown (edite aqui conforme a lista crescer).
// Cada número é o teto de uma faixa: a 1ª vai de 0 até o 1º valor, a 2ª do 1º ao 2º, e
// assim por diante. Tudo acima do último número cai automaticamente num grupo "acima de".
const PRICE_BRACKETS = [100, 150, 200, 250, 300, 350, 400, 450, 500];

function formatPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function bracketLabel(min, max) {
  if (min == null) return `até ${formatPrice(max)}`;
  if (max == null) return `acima de ${formatPrice(min)}`;
  return `de ${formatPrice(min)} a ${formatPrice(max)}`;
}

function groupByPriceBracket(list) {
  const groups = PRICE_BRACKETS.map((max, i) => ({
    min: i === 0 ? null : PRICE_BRACKETS[i - 1],
    max,
    items: [],
  }));
  groups.push({ min: PRICE_BRACKETS[PRICE_BRACKETS.length - 1], max: null, items: [] });

  list.forEach((g) => {
    const price = Number(g.preco);
    const group =
      groups.find((b) => (b.max == null || price <= b.max) && (b.min == null || price > b.min)) ||
      groups[groups.length - 1];
    group.items.push(g);
  });

  return groups.filter((g) => g.items.length > 0);
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
    gifts = data.filter((g) => g.status === "disponivel" && g.presente);

    if (gifts.length === 0) {
      select.innerHTML = "<option value=''>todos os presentes já foram escolhidos 💙</option>";
      confirmBtn.disabled = true;
      return;
    }

    select.innerHTML =
      "<option value=''>selecione um presente</option>" +
      groupByPriceBracket(gifts)
        .map((group) => {
          const options = group.items
            .slice()
            .sort((a, b) => Number(a.preco) - Number(b.preco))
            .map((g) => `<option value="${g.id}">${g.presente}</option>`)
            .join("");
          return `<optgroup label="${bracketLabel(group.min, group.max)}">${options}</optgroup>`;
        })
        .join("");
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
      launchConfetti();
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

const EVENT_DATE = new Date("2026-08-08T17:35:00-03:00");
const countdownEl = document.getElementById("countdown");
const cdDays = document.getElementById("cd-days");
const cdHours = document.getElementById("cd-hours");
const cdMin = document.getElementById("cd-min");
const cdSec = document.getElementById("cd-sec");

let countdownTimer;

function updateCountdown() {
  const diff = EVENT_DATE.getTime() - Date.now();

  if (diff <= 0) {
    clearInterval(countdownTimer);
    countdownEl.classList.add("countdown--done");
    countdownEl.innerHTML = "<p>é hoje! 🎉</p>";
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  cdDays.textContent = String(Math.floor(totalSeconds / 86400)).padStart(2, "0");
  cdHours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, "0");
  cdMin.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  cdSec.textContent = String(totalSeconds % 60).padStart(2, "0");
}

updateCountdown();
countdownTimer = setInterval(updateCountdown, 1000);

const shareBtn = document.getElementById("share-btn");
const shareFeedback = document.getElementById("share-feedback");
let shareFeedbackTimeout;

function showShareFeedback(message) {
  clearTimeout(shareFeedbackTimeout);
  shareFeedback.textContent = message;
  shareFeedback.setAttribute("data-visible", "true");
  shareFeedbackTimeout = setTimeout(() => {
    shareFeedback.removeAttribute("data-visible");
  }, 2200);
}

shareBtn.addEventListener("click", async () => {
  const url = window.location.href;

  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, url });
    } catch (err) {
      // convidado cancelou o compartilhamento, nada a fazer
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    showShareFeedback("link copiado! 💙");
  } catch (err) {
    showShareFeedback("não foi possível copiar o link");
  }
});

function launchConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const colors = ["#1800AC", "#ECE9FB", "#6E64A6", "#FFD166", "#FFFFFF"];
  const particles = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.3,
    size: 6 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedY: 2 + Math.random() * 3,
    speedX: -1.5 + Math.random() * 3,
    rotation: Math.random() * 360,
    spin: -6 + Math.random() * 12,
  }));

  const start = performance.now();
  const duration = 3200;

  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    if (elapsed < duration) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);
}
