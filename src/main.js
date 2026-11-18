import "./style.css";

/* ===== Configuração ===== */
const $ = (id) => document.getElementById(id);
const dorme = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const env = import.meta.env ?? {};

const LIMITE = 15 * 60 * 1000;

let SENHA = String(env.VITE_SENHA_COFRE ?? "").replace(/\D/g, "");
if (SENHA.length !== 4) {
  console.warn("VITE_SENHA_COFRE precisa ter 4 dígitos. Usando 1234.");
  SENHA = "1234";
}

const CORES = ["--ouro", "--ouro-claro", "--sucesso", "--info"];

/* O app usa transições entre telas; a página não depende de rolagem nativa. */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

/* ===== Som (Web Audio) ===== */
let ac;

function prepara() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    ac ??= new AudioContextClass();
    if (ac.state === "suspended") void ac.resume();
  } catch (error) {
    // O áudio é opcional e não deve impedir o início do jogo.
    console.warn("Não foi possível iniciar o áudio:", error);
  }
}

function tom(f, dur = 0.15, tipo = "square", vol = 0.1, atraso = 0) {
  if (!ac) return;

  const t = ac.currentTime + atraso;
  const oscillator = ac.createOscillator();
  const gain = ac.createGain();

  oscillator.type = tipo;
  oscillator.frequency.value = f;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  oscillator.connect(gain).connect(ac.destination);
  oscillator.start(t);
  oscillator.stop(t + dur + 0.02);
}

const bip = (frequencia) => tom(frequencia, 0.18);
const buzz = () => tom(140, 0.35, "sawtooth", 0.12);

const fanfarra = () => {
  [523, 659, 784, 1047, 784, 1047].forEach((frequencia, index) => {
    tom(frequencia, 0.3, "triangle", 0.14, index * 0.13);
  });
};

function sirene(ms) {
  prepara();
  const passo = 0.4;

  for (let i = 0; i * passo < ms / 1000; i++) {
    tom(i % 2 ? 760 : 1020, passo - 0.02, "sawtooth", 0.18, i * passo);
  }
}

/* ===== Confete (canvas) ===== */
const canvas = $("confete");
const contexto = canvas?.getContext("2d");
let particulas = [];
let confeteRodando = false;

const ajustaCanvas = () => {
  if (!canvas || !contexto) return;

  const escala = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * escala;
  canvas.height = window.innerHeight * escala;
  contexto.setTransform(escala, 0, 0, escala, 0, 0);
};

ajustaCanvas();
window.addEventListener("resize", ajustaCanvas);

const CORES_CONFETE = ["#c6a15b", "#e0bf7a", "#60a5fa", "#22c55e", "#ffffff"];

function explode(x, y, angulo, abertura, forca, quantidade) {
  if (!contexto) return;

  const total = reduz ? Math.ceil(quantidade / 3) : quantidade;

  for (let i = 0; i < total; i++) {
    const anguloRad = ((angulo + (Math.random() - 0.5) * abertura) * Math.PI) / 180;
    const velocidade = forca * (0.5 + Math.random() * 0.7);

    particulas.push({
      x: x * window.innerWidth,
      y: y * window.innerHeight,
      vx: Math.cos(anguloRad) * velocidade,
      vy: Math.sin(anguloRad) * velocidade,
      w: 6 + Math.random() * 7,
      h: 4 + Math.random() * 6,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      cor: CORES_CONFETE[i % CORES_CONFETE.length],
      circulo: Math.random() < 0.25,
    });
  }

  if (!confeteRodando) {
    confeteRodando = true;
    requestAnimationFrame(animarConfete);
  }
}

function animarConfete() {
  if (!contexto) return;

  contexto.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particulas = particulas.filter((p) => p.y < window.innerHeight + 30);

  for (const p of particulas) {
    p.vy += 0.3;
    p.vx *= 0.99;
    p.vy *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.r += p.vr;

    contexto.save();
    contexto.translate(p.x, p.y);
    contexto.rotate(p.r);
    contexto.scale(1, Math.cos(p.r * 2));
    contexto.fillStyle = p.cor;

    if (p.circulo) {
      contexto.beginPath();
      contexto.arc(0, 0, p.w / 2, 0, Math.PI * 2);
      contexto.fill();
    } else {
      contexto.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }

    contexto.restore();
  }

  if (particulas.length) {
    requestAnimationFrame(animarConfete);
  } else {
    confeteRodando = false;
  }
}

function festa() {
  const cofre = $("cofre");
  if (!cofre) return;

  const retangulo = cofre.getBoundingClientRect();

  explode(
    (retangulo.left + retangulo.width / 2) / window.innerWidth,
    (retangulo.top + retangulo.height / 2) / window.innerHeight,
    -90,
    120,
    18,
    120,
  );
  explode(0.03, 0.95, -60, 60, 24, 80);
  explode(0.97, 0.95, -120, 60, 24, 80);

  let quantidade = 0;
  const intervalo = window.setInterval(() => {
    explode(Math.random(), -0.05, 90, 40, 3, 10);
    quantidade++;
    if (quantidade > 20) window.clearInterval(intervalo);
  }, 200);
}

/* ===== Elementos decorativos e título ===== */
const fundo = $("fundo");

if (fundo) {
  for (let i = 0; i < 10; i++) {
    const forma = document.createElement("div");
    const tamanho = 3 + Math.random() * 6;
    const cor = `var(${CORES[i % CORES.length]})`;

    forma.className = "forma";
    Object.assign(forma.style, {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: `${tamanho}rem`,
      height: `${tamanho}rem`,
      background: i % 3 === 1 ? "transparent" : cor,
      border: i % 3 === 1 ? `.5rem solid ${cor}` : "0",
      borderRadius: i % 3 === 2 ? "1rem" : "50%",
    });

    forma.style.setProperty("--d", `${8 + Math.random() * 8}s`);
    forma.style.setProperty("--dx", `${(Math.random() - 0.5) * 12}rem`);
    forma.style.setProperty("--rot", `${Math.random() * 180}deg`);
    fundo.append(forma);
  }
}

let indiceLetra = 0;
const titulo = $("titulo");

if (titulo) {
  titulo.innerHTML = "O Desafio do Cofre"
    .split(" ")
    .map((palavra) => {
      const letras = [...palavra]
        .map((letra) => {
          return `<span aria-hidden="true" style="--i:${indiceLetra++}">${letra}</span>`;
        })
        .join("");

      return `<span class="palavra">${letras}</span>`;
    })
    .join(" ");
}

/* ===== Fluxo principal ===== */
let estado = "intro";
let inicio = 0;
let intervaloRelogio = null;

const mostraTela = (nome) => {
  ["intro", "regras", "contagem", "alarme"].forEach((tela) => {
    const elemento = $(`t-${tela}`);
    if (elemento) elemento.hidden = tela !== nome;
  });
};

/* Move o painel principal para a seção do cofre sem rolagem nativa. */
const mostrarCofre = () => {
  document.querySelector("main")?.classList.add("cofre-visivel");
};

const formataTempo = (ms) => {
  const segundos = Math.floor(ms / 1000);
  const minutos = Math.floor(segundos / 60);

  return `${String(minutos).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
};

/* ===== Etapas do painel do cofre ===== */
const etapa = (id) => {
  ["inicio", "senha", "fim"].forEach((nome) => {
    const elemento = $(`e-${nome}`);
    if (elemento) elemento.hidden = nome !== id;
  });
};

const treme = (elemento) => {
  if (!elemento?.animate) return;

  elemento.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-10px)" },
      { transform: "translateX(9px)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 400 },
  );
};

const gira = () => {
  $("roda")?.animate?.(
    [{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }],
    { duration: 900, easing: "cubic-bezier(.34,1.2,.64,1)" },
  );
};

/* ===== Relógio e desclassificação ===== */
function desclassificar() {
  if (estado === "desclassificado" || estado === "vitoria") return;

  estado = "desclassificado";
  window.clearInterval(intervaloRelogio);
  intervaloRelogio = null;

  const relogio = $("relogio");
  if (relogio) relogio.classList.add("limite");

  const textoRelogio = $("relogio-txt");
  if (textoRelogio) textoRelogio.textContent = "15:00";

  $("alarme")?.classList.remove("ativo");

  const tituloFim = $("fim-titulo");
  const labelFim = $("fim-label");
  const tempoFinal = $("tempo-final");

  if (tituloFim) tituloFim.textContent = "TEMPO ESGOTADO!";
  if (labelFim) labelFim.textContent = "Resultado:";
  if (tempoFinal) tempoFinal.textContent = "Grupo desclassificado";

  document.querySelectorAll(".digitos input").forEach((input) => {
    input.disabled = true;
  });

  const botaoConfirmar = $("e-senha")?.querySelector('button[type="submit"], button:not([type])');
  if (botaoConfirmar) botaoConfirmar.disabled = true;

  etapa("fim");
  mostrarCofre();
}

function atualizarRelogio() {
  if (estado === "desclassificado" || estado === "vitoria") return;

  const decorrido = performance.now() - inicio;

  if (decorrido >= LIMITE) {
    desclassificar();
    return;
  }

  const textoRelogio = $("relogio-txt");
  if (textoRelogio) textoRelogio.textContent = formataTempo(decorrido);
}

/* ===== Início e briefing ===== */
function comecar() {
  if (estado !== "intro") return;

  estado = "regras";
  prepara();
  mostraTela("regras");
}

function iniciarDesafio() {
  if (estado !== "regras") return;
  void contagem();
}

async function contagem() {
  if (estado !== "regras") return;

  estado = "contagem";
  mostraTela("contagem");
  inicio = performance.now();

  const relogio = $("relogio");
  if (relogio) relogio.hidden = false;

  atualizarRelogio();
  intervaloRelogio = window.setInterval(atualizarRelogio, 250);

  for (const [numero, cor] of [
    [3, "--ouro"],
    [2, "--ouro-claro"],
    [1, "--info"],
  ]) {
    if (estado === "desclassificado") return;

    const elemento = $("num");
    if (elemento) {
      elemento.textContent = String(numero);
      elemento.style.setProperty("--c", `var(${cor})`);
      elemento.style.animation = "none";
      void elemento.offsetWidth;
      elemento.style.animation = "";
    }

    bip(numero === 1 ? 880 : 660);
    await dorme(1000);
  }

  if (estado === "desclassificado") return;

  estado = "alarme";
  mostraTela("alarme");
  $("alarme")?.classList.add("ativo");
  sirene(5200);

  await dorme(3000);
  if (estado === "desclassificado") return;

  mostrarCofre();

  await dorme(2200);
  if (estado === "desclassificado") return;

  $("alarme")?.classList.remove("ativo");
  estado = "cofre";
}

/* Um único listener controla o Espaço em cada etapa. */
window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) return;
  if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select, button")) return;

  if (estado === "intro") {
    event.preventDefault();
    comecar();
  } else if (estado === "regras") {
    event.preventDefault();
    iniciarDesafio();
  }
});

$("btn-comecar")?.addEventListener("click", comecar);
$("btn-iniciar-desafio")?.addEventListener("click", iniciarDesafio);

/* ===== Entrada da senha do cofre ===== */
const grupoDigitos = document.querySelector(".digitos");
const digitos = grupoDigitos
  ? [0, 1, 2, 3].map((indice) => {
      const input = document.createElement("input");
      input.maxLength = 1;
      input.inputMode = "numeric";
      input.autocomplete = "off";
      input.pattern = "[0-9]";
      input.setAttribute("aria-label", `Dígito ${indice + 1}`);
      grupoDigitos.append(input);
      return input;
    })
  : [];

digitos.forEach((input, indice) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(-1);
    if (input.value && digitos[indice + 1]) digitos[indice + 1].focus();
  });

  input.addEventListener("focus", () => input.select());

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && indice > 0) {
      digitos[indice - 1].value = "";
      digitos[indice - 1].focus();
    }
    if (event.key === "ArrowLeft" && indice > 0) digitos[indice - 1].focus();
    if (event.key === "ArrowRight" && indice < 3) digitos[indice + 1].focus();
  });

  input.addEventListener("paste", (event) => {
    event.preventDefault();
    const texto = (event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 4);

    [...texto].forEach((caractere, posicao) => {
      if (digitos[posicao]) digitos[posicao].value = caractere;
    });

    digitos[Math.min(texto.length, 3)]?.focus();
  });
});

function erro(campos, mensagem, texto, limpar = false) {
  const lista = Array.isArray(campos) ? campos : [campos];
  lista.forEach((campo) => campo?.classList.add("erro"));
  if (mensagem) mensagem.textContent = texto;

  treme(lista[0]?.parentElement);
  buzz();

  window.setTimeout(() => {
    lista.forEach((campo) => {
      campo?.classList.remove("erro");
      if (limpar && campo) campo.value = "";
    });
    lista[0]?.focus();
  }, 700);
}

$("btn-abrir")?.addEventListener("click", () => {
  if (estado !== "cofre") return;

  gira();
  tom(520, 0.1, "triangle");
  etapa("senha");
  digitos[0]?.focus();
});

$("e-senha")?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (estado !== "cofre") return;

  // Confere o limite também no envio, sem depender do próximo tick do intervalo.
  if (performance.now() - inicio >= LIMITE) {
    desclassificar();
    return;
  }

  const mensagem = event.currentTarget.querySelector(".msg");
  const senhaDigitada = digitos.map((input) => input.value).join("");

  if (senhaDigitada === SENHA) {
    void vitoria();
  } else {
    erro(digitos, mensagem, "Senha incorreta. Tentem outra combinação.", true);
  }
});

/* ===== Vitória ===== */
async function vitoria() {
  if (estado !== "cofre") return;

  if (performance.now() - inicio >= LIMITE) {
    desclassificar();
    return;
  }

  estado = "vitoria";
  window.clearInterval(intervaloRelogio);
  intervaloRelogio = null;

  const tempoFinal = formataTempo(performance.now() - inicio);
  $("relogio")?.classList.add("parado");

  digitos.forEach((input) => {
    input.disabled = true;
    input.classList.add("ok");
  });

  const botaoConfirmar = $("e-senha")?.querySelector('button[type="submit"], button:not([type])');
  if (botaoConfirmar) botaoConfirmar.disabled = true;

  gira();
  await dorme(700);

  $("cofre")?.classList.add("aberto");
  fanfarra();
  festa();

  await dorme(1200);

  const resultado = $("tempo-final");
  if (resultado) resultado.textContent = tempoFinal;

  etapa("fim");
}

/* ===== Reiniciar ===== */
$("btn-reiniciar")?.addEventListener("click", () => {
  window.location.reload();
});
