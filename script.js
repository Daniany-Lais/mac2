/* ============================================================
   VARIÁVEIS GLOBAIS
   ============================================================ */
const botaoParar = document.getElementById('botaoParar');

// Duração de cada som (em segundos)
const DURACAO_SOM = 60;

// Timers
let timerParada = null;
let contadorInterval = null;

// Volume geral do site (deixa os sons altos e realistas) 🔊
const VOLUME_GERAL = 1.8;

// Nome do som que está tocando agora
let somTocandoAgora = '';


/* ============================================================
   1) MENU HAMBÚRGUER
   ============================================================ */
const botaoMenu = document.getElementById('botaoMenu');
const menu = document.getElementById('menu');

botaoMenu.addEventListener('click', () => {
  menu.classList.toggle('aberto');
});

menu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    menu.classList.remove('aberto');
  });
});


/* ============================================================
   2) ONDA DECORATIVA DO HERO (canvas pequeno)
   ============================================================ */
const canvasHero = document.getElementById('canvasOnda');
const ctxHero = canvasHero.getContext('2d');
let tempoHero = 0;

function ajustarCanvasHero() {
  const largura = canvasHero.clientWidth;
  const altura = canvasHero.clientHeight;
  canvasHero.width = largura * 2;
  canvasHero.height = altura * 2;
  ctxHero.scale(2, 2);
}
ajustarCanvasHero();
window.addEventListener('resize', () => {
  ctxHero.setTransform(1, 0, 0, 1, 0, 0);
  ajustarCanvasHero();
});

function desenharOndaHero() {
  const largura = canvasHero.clientWidth;
  const altura = canvasHero.clientHeight;

  ctxHero.clearRect(0, 0, largura, altura);
  ctxHero.lineWidth = 3;
  ctxHero.strokeStyle = '#1db954';
  ctxHero.shadowColor = '#1db954';
  ctxHero.shadowBlur = 15;
  ctxHero.beginPath();

  for (let x = 0; x < largura; x++) {
    const y = altura / 2 +
              Math.sin((x + tempoHero) * 0.03) * 35 *
              Math.sin((x + tempoHero) * 0.01);
    if (x === 0) ctxHero.moveTo(x, y);
    else ctxHero.lineTo(x, y);
  }

  ctxHero.stroke();
  ctxHero.shadowBlur = 0;
  tempoHero += 3;
  requestAnimationFrame(desenharOndaHero);
}
desenharOndaHero();


/* ============================================================
   3) ÁUDIO — CONTEXTO, MASTER GAIN E ANALISADOR
   ============================================================ */
let contextoAudio = null;
let masterGain = null;
let analyserNode = null;
let nosAtivos = [];

function pegarContexto() {
  if (!contextoAudio) {
    contextoAudio = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = contextoAudio.createGain();
    masterGain.gain.value = VOLUME_GERAL;

    analyserNode = contextoAudio.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.8;

    masterGain.connect(analyserNode);
    analyserNode.connect(contextoAudio.destination);
  }
  return contextoAudio;
}

function atualizarAviso(texto, cor) {
  const aviso = document.getElementById('avisoSom');
  aviso.textContent = texto;
  aviso.style.color = cor || '#a0a6b0';
}

function pararTodosSons() {
  if (timerParada) { clearTimeout(timerParada); timerParada = null; }
  if (contadorInterval) { clearInterval(contadorInterval); contadorInterval = null; }

  nosAtivos.forEach(no => {
    try { no.stop(); } catch (e) {}
  });
  nosAtivos = [];

  document.querySelectorAll('.botao-som').forEach(b => b.classList.remove('tocando'));

  const somAtualEl = document.getElementById('somAtual');
  const tempoAtualEl = document.getElementById('tempoAtual');
  if (somAtualEl) somAtualEl.textContent = '🔇 Nenhum som';
  if (tempoAtualEl) tempoAtualEl.textContent = '--';

  atualizarAviso('🔇 Nenhum som tocando', '#a0a6b0');

  botaoParar.disabled = true;
  botaoParar.style.opacity = '0.5';
}


/* ============================================================
   4) FUNÇÕES AUXILIARES
   ============================================================ */
function criarRuido(ctx, segundos = 2) {
  const tamanho = ctx.sampleRate * segundos;
  const buffer = ctx.createBuffer(1, tamanho, ctx.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < tamanho; i++) dados[i] = Math.random() * 2 - 1;
  const fonte = ctx.createBufferSource();
  fonte.buffer = buffer;
  fonte.loop = true;
  return fonte;
}

function criarFiltroLP(ctx, freq, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function criarFiltroHP(ctx, freq, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function criarFiltroBP(ctx, freq, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}


/* ============================================================
   5) OS 7 SONS 🎵
   ============================================================ */

// 1) BUZINA DE CARRO 🚗
function tocarBuzina(ctx) {
  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(1, t + 0.02);
  gain.connect(masterGain);

  const filtro = criarFiltroLP(ctx, 3500, 1);
  filtro.connect(gain);

  const notas = [370, 466];
  const osciladores = notas.map(freq => {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 1.005;

    const sub = ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.value = freq / 2;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.15;

    osc.connect(filtro);
    osc2.connect(filtro);
    sub.connect(subGain);
    subGain.connect(filtro);

    osc.start();
    osc2.start();
    sub.start();
    return [osc, osc2, sub];
  });

  return {
    stop: () => {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
      osciladores.flat().forEach(o => { try { o.stop(ctx.currentTime + 0.1); } catch (e) {} });
    }
  };
}

// 2) LIQUIDIFICADOR 🥤
function tocarLiquidificador(ctx) {
  const gain = ctx.createGain();
  gain.gain.value = 0.9;
  gain.connect(masterGain);

  const ruido = criarRuido(ctx, 3);
  const filtroRuido = criarFiltroLP(ctx, 1500, 2);
  const gainRuido = ctx.createGain();
  gainRuido.gain.value = 0.6;
  ruido.connect(filtroRuido);
  filtroRuido.connect(gainRuido);
  gainRuido.connect(gain);

  const motor = ctx.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.value = 55;
  const gainMotor = ctx.createGain();
  gainMotor.gain.value = 0.35;
  const filtroMotor = criarFiltroLP(ctx, 200, 1);
  motor.connect(filtroMotor);
  filtroMotor.connect(gainMotor);
  gainMotor.connect(gain);

  const laminas = ctx.createOscillator();
  laminas.type = 'triangle';
  laminas.frequency.value = 180;
  const gainLaminas = ctx.createGain();
  gainLaminas.gain.value = 0.15;
  laminas.connect(gainLaminas);
  gainLaminas.connect(gain);

  const LFO = ctx.createOscillator();
  const LFOGain = ctx.createGain();
  LFO.frequency.value = 12;
  LFOGain.gain.value = 0.1;
  LFO.connect(LFOGain);
  LFOGain.connect(gain.gain);

  ruido.start();
  motor.start();
  laminas.start();
  LFO.start();

  return {
    stop: () => {
      [ruido, motor, laminas, LFO].forEach(o => { try { o.stop(); } catch (e) {} });
    }
  };
}

// 3) MICRO-ONDAS 🍲
function tocarMicroondas(ctx) {
  let ativo = true;
  const oscs = [];
  const gain = ctx.createGain();
  gain.gain.value = 0.7;
  gain.connect(masterGain);

  function sequenciaBipes() {
    if (!ativo) return;

    [0, 250, 500].forEach(atraso => {
      setTimeout(() => {
        if (!ativo) return;

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 2200;
        osc.connect(env);
        env.connect(gain);

        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(1, t + 0.01);
        env.gain.setValueAtTime(1, t + 0.12);
        env.gain.linearRampToValueAtTime(0, t + 0.16);

        osc.start(t);
        osc.stop(t + 0.18);
        oscs.push(osc);
      }, atraso);
    });

    setTimeout(sequenciaBipes, 2500);
  }
  sequenciaBipes();

  return {
    stop: () => {
      ativo = false;
      oscs.forEach(o => { try { o.stop(); } catch (e) {} });
    }
  };
}

// 4) CORTADOR DE GRAMA 🌱
function tocarCortador(ctx) {
  const gain = ctx.createGain();
  gain.gain.value = 0.85;
  gain.connect(masterGain);

  const motor = ctx.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.value = 45;
  const filtroMotor = criarFiltroLP(ctx, 400, 2);
  const gainMotor = ctx.createGain();
  gainMotor.gain.value = 0.5;
  motor.connect(filtroMotor);
  filtroMotor.connect(gainMotor);
  gainMotor.connect(gain);

  const ruido = criarRuido(ctx, 3);
  const filtroRuido = criarFiltroBP(ctx, 800, 1.5);
  const gainRuido = ctx.createGain();
  gainRuido.gain.value = 0.4;
  ruido.connect(filtroRuido);
  filtroRuido.connect(gainRuido);
  gainRuido.connect(gain);

  const ruido2 = criarRuido(ctx, 3);
  const filtroRuido2 = criarFiltroLP(ctx, 300, 1);
  const gainRuido2 = ctx.createGain();
  gainRuido2.gain.value = 0.35;
  ruido2.connect(filtroRuido2);
  filtroRuido2.connect(gainRuido2);
  gainRuido2.connect(gain);

  const LFO = ctx.createOscillator();
  LFO.type = 'sawtooth';
  LFO.frequency.value = 25;
  const LFOGain = ctx.createGain();
  LFOGain.gain.value = 0.3;
  LFO.connect(LFOGain);
  LFOGain.connect(gain.gain);

  motor.start();
  ruido.start();
  ruido2.start();
  LFO.start();

  return {
    stop: () => {
      [motor, ruido, ruido2, LFO].forEach(o => { try { o.stop(); } catch (e) {} });
    }
  };
}

// 5) ASPIRADOR DE PÓ 🧹
function tocarAspirador(ctx) {
  const gain = ctx.createGain();
  gain.gain.value = 0.85;
  gain.connect(masterGain);

  const ar = criarRuido(ctx, 3);
  const filtroAr = criarFiltroLP(ctx, 800, 1.5);
  const gainAr = ctx.createGain();
  gainAr.gain.value = 0.7;
  ar.connect(filtroAr);
  filtroAr.connect(gainAr);
  gainAr.connect(gain);

  const motor = ctx.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.value = 70;
  const gainMotor = ctx.createGain();
  gainMotor.gain.value = 0.3;
  const filtroMotor = criarFiltroLP(ctx, 250, 1);
  motor.connect(filtroMotor);
  filtroMotor.connect(gainMotor);
  gainMotor.connect(gain);

  const assobio = ctx.createOscillator();
  assobio.type = 'sine';
  assobio.frequency.value = 1200;
  const gainAssobio = ctx.createGain();
  gainAssobio.gain.value = 0.08;
  assobio.connect(gainAssobio);
  gainAssobio.connect(gain);

  ar.start();
  motor.start();
  assobio.start();

  return {
    stop: () => {
      [ar, motor, assobio].forEach(o => { try { o.stop(); } catch (e) {} });
    }
  };
}

// 6) SIRENE 🚑
function tocarSirene(ctx) {
  const gain = ctx.createGain();
  gain.gain.value = 0.8;
  gain.connect(masterGain);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 800;

  const filtro = criarFiltroLP(ctx, 2500, 1);
  filtro.connect(gain);

  const LFO = ctx.createOscillator();
  LFO.type = 'triangle';
  LFO.frequency.value = 1.2;
  const LFOGain = ctx.createGain();
  LFOGain.gain.value = 350;

  LFO.connect(LFOGain);
  LFOGain.connect(osc.frequency);

  osc.connect(filtro);

  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = 800;
  const gain2 = ctx.createGain();
  gain2.gain.value = 0.15;
  const filtro2 = criarFiltroLP(ctx, 1500, 1);
  osc2.connect(filtro2);
  filtro2.connect(gain2);
  gain2.connect(gain);
  LFO.connect(gain2.gain);

  osc.start();
  osc2.start();
  LFO.start();

  return {
    stop: () => {
      [osc, osc2, LFO].forEach(o => { try { o.stop(); } catch (e) {} });
    }
  };
}

// 7) TELEFONE TOCANDO ☎️
function tocarTelefone(ctx) {
  let ativo = true;
  const nos = [];
  const gain = ctx.createGain();
  gain.gain.value = 0.55;
  gain.connect(masterGain);

  function tocarUmaVez() {
    if (!ativo) return;

    const t = ctx.currentTime;
    const duracao = 1.0;

    [440, 480].forEach(freq => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.02);
      env.gain.setValueAtTime(1, t + duracao - 0.05);
      env.gain.linearRampToValueAtTime(0, t + duracao);

      osc.connect(env);
      env.connect(gain);
      osc.start(t);
      osc.stop(t + duracao + 0.05);
      nos.push(osc);
    });

    setTimeout(tocarUmaVez, (duracao + 2) * 1000);
  }
  tocarUmaVez();

  return {
    stop: () => {
      ativo = false;
      nos.forEach(o => { try { o.stop(); } catch (e) {} });
    }
  };
}

// ============================================================
// Dicionário de sons (agora com 7!)
// ============================================================
const sonsDisponiveis = {
  buzina:         tocarBuzina,
  liquidificador: tocarLiquidificador,
  microondas:     tocarMicroondas,
  cortador:       tocarCortador,
  aspirador:      tocarAspirador,
  sirene:         tocarSirene,
  telefone:       tocarTelefone
};


/* ============================================================
   6) LIGA CADA BOTÃO DE SOM AO SEU EFEITO
   ============================================================ */
document.querySelectorAll('.botao-som').forEach(botao => {
  botao.addEventListener('click', () => {
    const ctx = pegarContexto();
    const tipo = botao.dataset.som;
    const db = botao.dataset.db;
    const nome = botao.querySelector('.nome').textContent;

    pararTodosSons();

    const som = sonsDisponiveis[tipo](ctx);
    nosAtivos.push(som);
    botao.classList.add('tocando');
    somTocandoAgora = nome;

    const somAtualEl = document.getElementById('somAtual');
    if (somAtualEl) somAtualEl.textContent = `🔊 ${nome} (${db} dB)`;

    botaoParar.disabled = false;
    botaoParar.style.opacity = '1';

    let segundos = DURACAO_SOM;
    atualizarAviso(`🔊 ${nome} (~${db} dB) — parando em ${segundos}s`, '#1db954');

    const tempoAtualEl = document.getElementById('tempoAtual');
    if (tempoAtualEl) tempoAtualEl.textContent = `${segundos}s`;

    contadorInterval = setInterval(() => {
      segundos--;
      if (segundos > 0) {
        atualizarAviso(`🔊 ${nome} (~${db} dB) — parando em ${segundos}s`, '#1db954');
        if (tempoAtualEl) tempoAtualEl.textContent = `${segundos}s`;
      }
    }, 1000);

    timerParada = setTimeout(() => {
      pararTodosSons();
      atualizarAviso('⏱️ Som finalizado após 60 segundos', '#a0a6b0');
    }, DURACAO_SOM * 1000);
  });
});


/* ============================================================
   7) BOTÃO "PARAR"
   ============================================================ */
botaoParar.disabled = true;
botaoParar.style.opacity = '0.5';

botaoParar.addEventListener('click', () => {
  pararTodosSons();
  atualizarAviso('⏹ Você parou o som', '#a0a6b0');
});


/* ============================================================
   8) VISUALIZADOR GRANDE DE ONDAS 🌊
   ============================================================ */
const canvasVis = document.getElementById('canvasVisualizador');
const ctxVis = canvasVis.getContext('2d');

function ajustarCanvasVis() {
  const largura = canvasVis.clientWidth;
  const altura = canvasVis.clientHeight;
  canvasVis.width = largura * 2;
  canvasVis.height = altura * 2;
  ctxVis.setTransform(1, 0, 0, 1, 0, 0);
  ctxVis.scale(2, 2);
}
ajustarCanvasVis();
window.addEventListener('resize', ajustarCanvasVis);

let bufferDados = null;

function desenharVisualizador() {
  const largura = canvasVis.clientWidth;
  const altura = canvasVis.clientHeight;

  ctxVis.clearRect(0, 0, largura, altura);

  if (!analyserNode) {
    ctxVis.strokeStyle = '#1a3a2a';
    ctxVis.lineWidth = 2;
    ctxVis.beginPath();
    ctxVis.moveTo(0, altura / 2);
    ctxVis.lineTo(largura, altura / 2);
    ctxVis.stroke();
    requestAnimationFrame(desenharVisualizador);
    return;
  }

  const tamanho = analyserNode.fftSize;
  if (!bufferDados || bufferDados.length !== tamanho) {
    bufferDados = new Uint8Array(tamanho);
  }
  analyserNode.getByteTimeDomainData(bufferDados);

  ctxVis.lineWidth = 3;
  ctxVis.strokeStyle = '#1db954';
  ctxVis.shadowColor = '#1db954';
  ctxVis.shadowBlur = 12;
  ctxVis.beginPath();

  const passo = largura / tamanho;
  let x = 0;

  for (let i = 0; i < tamanho; i++) {
    const v = bufferDados[i] / 128.0;
    const y = (v * altura) / 2;

    if (i === 0) ctxVis.moveTo(x, y);
    else ctxVis.lineTo(x, y);

    x += passo;
  }

  ctxVis.stroke();
  ctxVis.shadowBlur = 0;

  ctxVis.strokeStyle = 'rgba(29, 185, 84, 0.15)';
  ctxVis.lineWidth = 1;
  ctxVis.beginPath();
  ctxVis.moveTo(0, altura / 2);
  ctxVis.lineTo(largura, altura / 2);
  ctxVis.stroke();

  const dadosFreq = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(dadosFreq);

  const numBarras = 10;
  const passoFreq = Math.floor(dadosFreq.length / numBarras);

  for (let b = 0; b < numBarras; b++) {
    let soma = 0;
    for (let i = 0; i < passoFreq; i++) {
      soma += dadosFreq[b * passoFreq + i];
    }
    const media = soma / passoFreq;
    const porcento = Math.max(5, (media / 255) * 100);

    const barra = document.getElementById('barraFreq' + b);
    if (barra) barra.style.height = porcento + '%';
  }

  requestAnimationFrame(desenharVisualizador);
}
desenharVisualizador();


/* ============================================================
   9) GRÁFICO DE BARRAS (níveis em dB)
   ============================================================ */
const dadosGrafico = [
  { nome: 'Conversa',          db: 60 },
  { nome: 'Micro-ondas',       db: 70 },
  { nome: 'Aspirador de pó',   db: 75 },
  { nome: 'Telefone tocando',  db: 80 },
  { nome: 'Liquidificador',    db: 88 },
  { nome: 'Cortador de grama', db: 95 },
  { nome: 'Buzina',            db: 110 },
  { nome: 'Sirene',            db: 120 }
];

function corPorNivel(db) {
  if (db <= 70) return 'seguro';
  if (db <= 85) return 'atencao';
  return 'perigo';
}

const containerGrafico = document.getElementById('grafico');

dadosGrafico.forEach(item => {
  const linha = document.createElement('div');
  linha.className = 'barra-linha';

  const nome = document.createElement('div');
  nome.className = 'barra-nome';
  nome.textContent = item.nome;

  const trilha = document.createElement('div');
  trilha.className = 'barra-trilha';

  const preenchida = document.createElement('div');
  preenchida.className = 'barra-preenchida ' + corPorNivel(item.db);
  const larguraPorcento = (item.db / 120) * 100;

  const valor = document.createElement('div');
  valor.className = 'barra-valor';
  valor.textContent = item.db + ' dB';

  trilha.appendChild(preenchida);
  linha.appendChild(nome);
  linha.appendChild(trilha);
  linha.appendChild(valor);
  containerGrafico.appendChild(linha);

  setTimeout(() => {
    preenchida.style.width = larguraPorcento + '%';
  }, 300);
});