(function () {
  'use strict';

  var corpo = document.body;
  corpo.classList.add('js');
  var menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- topo, régua de leitura e WhatsApp flutuante ---------- */
  var topo = document.getElementById('topo');
  var regua = document.getElementById('regua');
  var flutuante = document.getElementById('whatsFlutuante');
  var abertura = document.getElementById('inicio');

  /* A barra do topo não aparece na primeira dobra — ela desce quando a
     pessoa já está saindo dela, ou seja, quando começa a explorar o site. */
  var limiarTopo = 140, limiarWhats = 140;
  function medirLimiar() {
    /* Com o zoom ligado, a abertura dura o palco inteiro, não uma tela: a
       barra tem de esperar o zoom terminar, senão ela desce no meio do
       movimento. Sem o zoom, vale a altura da própria dobra, como antes. */
    var pal = document.getElementById('heroPalco');
    var curso = (pal && zoomLigado) ? (pal.offsetHeight - window.innerHeight) : 0;
    if (curso > 0) {
      limiarTopo  = Math.max(140, curso * 0.95);
      limiarWhats = Math.max(140, curso * 0.92);
    } else {
      var hero = abertura ? abertura.offsetHeight : 0;
      limiarTopo  = Math.max(140, hero * 0.62);
      limiarWhats = Math.max(140, hero * 0.6);
    }
  }

  function aoRolar() {
    var y = window.scrollY || window.pageYOffset;
    topo.classList.toggle('fixo', y > limiarTopo);

    if (regua) {
      var total = document.documentElement.scrollHeight - window.innerHeight;
      regua.style.width = total > 0 ? (y / total * 100) + '%' : '0';
    }
    if (flutuante) flutuante.classList.toggle('visivel', y > limiarWhats);
  }
  medirLimiar();
  aoRolar();
  window.addEventListener('scroll', aoRolar, { passive: true });
  window.addEventListener('resize', function () { medirLimiar(); aoRolar(); });
  window.addEventListener('load', function () { medirLimiar(); aoRolar(); });

  /* ---------- abertura ----------
     A foto da primeira dobra não depende de observador: a dobra já está na
     tela quando a página carrega. Quem dispara é a varredura, que roda no
     carregamento e a cada rolagem. */
  var hero = document.querySelector('.hero');

  function abrirHero() {
    if (hero) hero.classList.add('pronta');
  }

  /* ---------- menu do celular ----------
     Fecha ao escolher um item e ao apertar Esc, e devolve o foco ao botão —
     sem isso quem navega por teclado fica preso atrás do menu aberto. */
  var botao = document.getElementById('menuBotao');
  var menu = document.getElementById('menu');

  function fecharMenu(devolverFoco) {
    topo.classList.remove('aberto');
    botao.setAttribute('aria-expanded', 'false');
    botao.setAttribute('aria-label', 'Abrir menu');
    if (devolverFoco) botao.focus();
  }

  if (botao && menu) {
    botao.addEventListener('click', function () {
      var aberto = topo.classList.toggle('aberto');
      botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') fecharMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && topo.classList.contains('aberto')) fecharMenu(true);
    });
  }

  /* ---------- entradas ----------
     Varredura por posição, não IntersectionObserver. O observador só avisa
     sobre o que está na tela no instante em que a rolagem para: quem clica
     num item do menu e salta para uma seção passa por cima de meia página,
     e esses elementos nunca mais intersectam — ficariam invisíveis para
     sempre. Aqui qualquer coisa que já subiu acima da borda de baixo é
     revelada, tenha sido vista aos poucos ou de um pulo só. */
  var pendentes = [].slice.call(document.querySelectorAll('[data-entra], [data-revela]'));

  function mostrar(el) {
    var atraso = el.getAttribute('data-atraso');
    if (atraso) el.style.setProperty('--atraso', atraso + 'ms');
    el.classList.add('visivel');
  }

  /* A varredura é síncrona de propósito. Pendurá-la em requestAnimationFrame
     parecia mais barato, mas basta o relógio de quadros estar parado (aba em
     segundo plano, ambiente sem pintura) para nunca rodar — e aí a página
     fica invisível. A lista só encolhe, então o custo some sozinho. */
  var ultimaVarredura = 0, agendada = 0;
  function varrer() {
    clearTimeout(agendada); agendada = 0;

    /* A foto da abertura assenta quando a dobra se aproxima da tela. No
       carregamento ela já está lá, então dispara de imediato. */
    if (hero && !hero.classList.contains('pronta') &&
        hero.getBoundingClientRect().top < window.innerHeight * 0.9) {
      abrirHero();
    }

    if (!pendentes.length) return;
    ultimaVarredura = Date.now();
    var limite = window.innerHeight * 0.94;
    pendentes = pendentes.filter(function (el) {
      if (el.getBoundingClientRect().top >= limite) return true;
      mostrar(el);
      return false;
    });
  }
  function pedirVarredura() {
    if (!pendentes.length) return;
    /* o evento atrasado é obrigatório: um salto de âncora dispara UM scroll
       só, e se ele cair dentro da janela do estrangulamento a varredura
       nunca aconteceria */
    if (Date.now() - ultimaVarredura < 60) {
      if (!agendada) agendada = setTimeout(varrer, 70);
      return;
    }
    varrer();
  }

  window.addEventListener('scroll', pedirVarredura, { passive: true });
  window.addEventListener('resize', pedirVarredura);
  window.addEventListener('load', varrer);

  /* Rede de segurança. A condição é a única que de fato denuncia defeito:
     sobrou algum elemento DENTRO da tela ainda pendente. Com a varredura
     funcionando isso é impossível — ela roda no carregamento e a cada
     rolagem. Se acontecer, a página está a caminho de ficar EM BRANCO, e o
     remédio é tirar a classe `js` do body, que desliga o estado escondido de
     uma vez: não dá para depender de transição aqui, porque em ambiente com
     o relógio de animação parado marcar como visível não pinta nada. */
  setTimeout(function () {
    varrer();   /* imagens que carregaram depois podem ter mexido no layout */
    var presos = pendentes.filter(function (el) {
      var c = el.getBoundingClientRect();
      return c.bottom > 0 && c.top < window.innerHeight;
    });
    if (!presos.length) return;
    corpo.classList.remove('js');
    pendentes.forEach(mostrar);
    pendentes = [];
  }, 2500);

  /* ---------- a sequência de abertura ----------
     Cortina, voo para dentro da janela e estouro que entrega na dobra
     seguinte. É o mesmo mecanismo do Evolution, que já está no ar; o que muda
     é a cena e o destino.

     Uma observação que vale para tudo aqui: a rolagem não comanda a cena
     diretamente. Ela só move o DESTINO; quem chega lá é uma mola. Por isso um
     empurrãozinho faz a dobra continuar andando sozinha por mais de um
     segundo depois que o dedo parou — é o que separa "animação" de "barra de
     rolagem". */
  var palco = document.getElementById('heroPalco');
  var zoom  = document.getElementById('heroZoom');
  var flash = document.getElementById('heroFlash');
  var brilho = document.getElementById('heroBrilho');
  var cortina = document.getElementById('heroCortina');
  var cortinaIn = document.getElementById('heroCortinaIn');
  var cortinaSeta = document.getElementById('heroCortinaSeta');
  var fotoHero = zoom && zoom.querySelector('.hero-foto img');

  function trava(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function desacelera(t) { return 1 - Math.pow(1 - t, 3); }
  function suavizar(t) { return t * t * (3 - 2 * t); }

  /* Quebra a frase em letras animáveis sem perder o texto: o conteúdo original
     vai para o aria-label, então leitor de tela e buscador continuam lendo a
     palavra inteira, não oito letras soltas. */
  function partir(el) {
    var texto = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', texto);
    el.textContent = '';
    var unidades = [], frag = document.createDocumentFragment();
    texto.split(' ').forEach(function (palavra) {
      var p = document.createElement('span');
      p.className = 'hero-palavra';
      p.setAttribute('aria-hidden', 'true');
      palavra.split('').forEach(function (ch) {
        var u = document.createElement('span');
        u.className = 'hero-letra';
        u.textContent = ch;
        p.appendChild(u);
        unidades.push(u);
      });
      frag.appendChild(p);
      frag.appendChild(document.createTextNode(' '));
    });
    el.appendChild(frag);
    return unidades;
  }

  /* ---- a linha do tempo, em fração da rolagem do palco ----
     Os números saíram do Evolution e foram reajustados para esta cena, que é
     mais simples (não há torre subindo nem nuvens). */
  var CORTINA_ATE = 0.12;                 // a cortina encolhe
  var TEXTO_A = 0.14, TEXTO_B = 0.32;     // o título se escreve
  var SAIDA_A = 0.50, SAIDA_B = 0.58;     // o texto sai de cena
  var VOO_A = 0.50, VOO_B = 0.84;         // o voo para dentro da janela
  var LUZ_A  = 0.62, LUZ_B  = 0.80;       // a luz da janela floresce
  /* o estouro: sobe, SEGURA claro, e só então abre na dobra */
  var FLASH_A = 0.70, FLASH_B = 0.80, FLASH_C = 0.83, FLASH_D = 0.88;
  var TROCA = 0.815;                      // a cena some atrás da luz cheia

  /* Teto de ampliação com folga para a textura da GPU, como no Evolution:
     entre 8x e 16x conforme o tamanho e a densidade da tela. Aqui a imagem
     tem 1920px e estoura bem antes disso — mas é justamente por isso que a
     luz floresce junto: quando já não há imagem que aguente, não há mais
     imagem para ver, só luz. O limite técnico vira o efeito. */
  var ZOOM_MAX = 12;
  function tetoDoZoom() {
    var maior = Math.max(window.innerWidth, window.innerHeight);
    var densidade = window.devicePixelRatio || 1;
    ZOOM_MAX = Math.max(8, Math.min(16, 20000 / (maior * densidade)));
  }

  /* a janela da torre, em fração da foto composta — achada por varredura,
     não no olho: é o bloco mais escuro da fachada */
  var ALVO_X = 0.2380, ALVO_Y = 0.5403;
  var panX = 0, panY = 0;

  var zoomLigado = false, voando = false;
  function verificarZoom() {
    zoomLigado = !!(palco && zoom && !menosMovimento &&
                    window.matchMedia('(min-width: 981px)').matches);
    if (!zoomLigado) {
      if (zoom) { zoom.style.transform = ''; zoom.style.visibility = ''; }
      if (hero) {
        hero.style.background = ''; hero.style.pointerEvents = '';
        hero.style.removeProperty('--escuro');
        hero.classList.remove('voando');
        voando = false;
      }
      if (flash) flash.style.opacity = '0';
      /* A cortina FICA no celular — é a tela de carregamento, não parte do
         voo. Só que lá não há linha do tempo para levantá-la, então ela sobe
         com a própria rolagem, nos primeiros 60% de uma tela. */
      if (cortina && menosMovimento) cortina.style.display = 'none';
    }
  }

  /* A âncora sai da caixa de LAYOUT, não do getBoundingClientRect: o rect já
     vem com a ampliação aplicada, e a origem andaria junto com o próprio
     zoom. */
  function medirOrigem() {
    if (!zoom || !fotoHero) return;
    var lf = fotoHero.naturalWidth || 1920, la = fotoHero.naturalHeight || 1290;
    var cw = zoom.clientWidth, ch = zoom.clientHeight;
    if (!cw || !ch) return;
    var esc = Math.max(cw / lf, ch / la);
    var rw = lf * esc, rh = la * esc;
    var ox = (cw - rw) * 0.5, oy = (ch - rh) * 0.45;   /* object-position 50% 45% */
    var ax = ox + ALVO_X * rw, ay = oy + ALVO_Y * rh;
    zoom.style.transformOrigin = ax.toFixed(1) + 'px ' + ay.toFixed(1) + 'px';
    panX = cw / 2 - ax;
    panY = ch / 2 - ay;
    if (brilho) {
      brilho.style.setProperty('--bx', ax.toFixed(1) + 'px');
      brilho.style.setProperty('--by', ay.toFixed(1) + 'px');
    }
  }

  /* ---- a altura de referência ----
     NÃO ler `window.innerHeight` a cada rolagem para medir o curso da
     cortina. No celular esse número MUDA ENQUANTO SE ROLA: a barra de
     endereço se recolhe e a tela cresce uns 60 a 100px. Como ele estava no
     denominador do progresso, a cortina pulava para trás no meio do gesto —
     o usuário rolava para baixo e a tela de carregamento voltava a fechar um
     pouco. Congelada no carregamento, a conta fica estável; só uma troca de
     verdade (girar o aparelho, redimensionar a janela) a atualiza. */
  var alturaRef = window.innerHeight;

  /* A cortina encolhe para cima. Recorta-se a borda de baixo e desloca-se a
     marca, em vez de animar a altura: assim nada refaz layout por quadro. */
  function abrirCortina(q) {
    if (!cortina) return;
    if (q >= 1) {
      if (cortina.style.display !== 'none') cortina.style.display = 'none';
      return;
    }
    if (cortina.style.display === 'none') cortina.style.display = 'block';
    var vh = alturaRef;
    cortina.style.clipPath = 'inset(0 0 ' + (q * 100).toFixed(3) + '% 0)';
    cortina.style.opacity = (1 - trava((q - 0.62) / 0.38)).toFixed(3);
    cortinaIn.style.transform = 'translate3d(0,' + (-q * vh / 2).toFixed(1) + 'px,0) '
      + 'translateY(-50%) scale(' + (1 - 0.40 * desacelera(q)).toFixed(4) + ')';
    cortinaIn.style.opacity = (1 - trava((q - 0.28) / 0.34)).toFixed(3);
    cortinaSeta.style.opacity = (1 - trava(q * 3.5)).toFixed(3);
  }

  /* o destino que a rolagem pede — quem vai até lá é a mola */
  function destino() {
    if (!palco) return 0;
    var curso = palco.offsetHeight - window.innerHeight;
    return curso > 0 ? trava(-palco.getBoundingClientRect().top / curso) : 0;
  }

  function pintar(p) {
    abrirCortina(trava(p / CORTINA_ATE));

    /* o título se escreve, uma palavra de cada vez */
    var ent = trava((p - TEXTO_A) / (TEXTO_B - TEXTO_A));
    heroTexto.forEach(function (el, i) {
      var passo = 0.62 / heroTexto.length;
      var t = desacelera(trava((ent - i * passo) / 0.38));
      el.style.opacity = t.toFixed(3);
      el.style.transform = t === 1 ? 'none' : 'translate3d(' + (-18 * (1 - t)).toFixed(1) + 'px,0,0)';
    });

    /* o texto sai de cena quando a câmera o atravessa */
    var saida = suavizar(trava((p - SAIDA_A) / (SAIDA_B - SAIDA_A)));
    heroUI.forEach(function (el) {
      el.style.opacity = (1 - saida).toFixed(3);
      el.style.pointerEvents = saida > 0.5 ? 'none' : '';
    });
    /* o escurecido vai junto: ele só existia para sustentar esse texto */
    hero.style.setProperty('--escuro', (1 - saida).toFixed(3));

    /* ---- o voo ----
       Ampliação EXPONENCIAL: é o que faz a velocidade parecer constante. Com
       crescimento linear o começo voa e o fim parece empacar. */
    var voo = suavizar(trava((p - VOO_A) / (VOO_B - VOO_A)));
    /* A classe `voando` desliga a aceleração das camadas internas enquanto a
       cena amplia. Sem isso a GPU corta a imagem em retângulos, e o retângulo
       cortado fica preso na tela quando se rola de volta. Alterna só quando o
       estado muda, para não escrever no DOM a cada quadro. */
    if ((voo > 0) !== voando) {
      voando = voo > 0;
      hero.classList.toggle('voando', voando);
    }
    var s = Math.pow(ZOOM_MAX, voo);
    var q = voo * voo;   /* a janela vem ao centro; p² para não descobrir a borda cedo */
    zoom.style.transform = voo > 0
      ? 'translate(' + (panX * q).toFixed(1) + 'px,' + (panY * q).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')'
      : '';

    /* a luz da janela floresce */
    if (brilho) brilho.style.setProperty('--brilho',
      suavizar(trava((p - LUZ_A) / (LUZ_B - LUZ_A))).toFixed(3));

    /* ---- a troca ----
       O estouro sobe, SEGURA, e só então abre. A cena some no meio do branco,
       nunca à vista: é aí que a dobra de baixo assume. */
    if (flash) flash.style.opacity = (p < FLASH_C
      ? suavizar(trava((p - FLASH_A) / (FLASH_B - FLASH_A)))
      : 1 - suavizar(trava((p - FLASH_C) / (FLASH_D - FLASH_C)))).toFixed(3);

    var trocou = p >= TROCA;
    zoom.style.visibility = trocou ? 'hidden' : '';
    hero.style.background = trocou ? 'transparent' : '';
    hero.style.pointerEvents = trocou ? 'none' : '';
  }

  /* ---- a mola ----
     K = rigidez, C = amortecimento. Abaixo de 2·raiz(K) sobra um respiro no
     fim do movimento, que é o que dá o peso de câmera. */
  var K = 10.5, C = 5.6;
  var atual = 0, veloc = 0, ultimoMs = 0, raf = 0;

  function quadro(agora) {
    raf = 0;
    var dt = ultimoMs ? Math.min((agora - ultimoMs) / 1000, 1 / 30) : 1 / 60;
    ultimoMs = agora;
    var alvo = destino();
    if (palco.getBoundingClientRect().bottom < 0) { atual = alvo; veloc = 0; }
    else {
      veloc += (-K * (atual - alvo) - C * veloc) * dt;
      atual += veloc * dt;
    }
    pintar(trava(atual));
    if (Math.abs(alvo - atual) > 0.0004 || Math.abs(veloc) > 0.0008) {
      raf = requestAnimationFrame(quadro);
    } else {
      atual = alvo; veloc = 0; ultimoMs = 0;
      pintar(trava(atual));
    }
  }
  function aoRolarSeq() {
    if (zoomLigado) {
      if (!raf) { ultimoMs = 0; raf = requestAnimationFrame(quadro); }
      return;
    }
    /* celular: sem voo e sem mola, mas a cortina continua existindo e sobe
       conforme a rolagem — direto, sem quadro intermediário */
    if (cortina && !menosMovimento) {
      abrirCortina(trava((window.scrollY || window.pageYOffset) / (alturaRef * 0.6)));
    }
  }

  var heroTexto = [], heroUI = [];
  if (palco && zoom) {
    /* O título e a linha de local saem da varredura genérica: nesta dobra
       quem comanda a entrada deles é a linha do tempo, não a posição na tela. */
    heroTexto = [].slice.call(zoom.querySelectorAll('.titulo-hero span'));
    heroUI = [].slice.call(document.querySelectorAll('.hero .titulo-hero, .hero .hero-local, .hero .hero-marca, .hero .hero-selo-img'));

    /* Só parte em letras se a marca for TEXTO. Sendo o logotipo embutido, as
       unidades já vêm marcadas no próprio SVG — partir ali apagaria o
       desenho, porque a função zera o conteúdo antes de reconstruir. */
    var marca = cortina && cortina.querySelector('[data-intro]');
    if (marca && !marca.querySelector('svg')) partir(marca);

    verificarZoom(); tetoDoZoom(); medirOrigem();

    if (zoomLigado) {
      /* Tira a abertura da varredura genérica E dos atributos que a governam.
         Não basta removê-la da lista: enquanto `data-revela` continuar no
         elemento, o CSS o mantém recortado e os estilos que a linha do tempo
         escreve a cada quadro brigariam com a transição da classe `.visivel`.
         Sem os atributos, estes elementos passam a ser desenhados só pelo
         que a sequência manda — que é o que se quer aqui.
         No celular nada disso acontece e a varredura continua cuidando deles. */
      [].forEach.call(document.querySelectorAll('.hero [data-entra], .hero [data-revela]'), function (el) {
        el.removeAttribute('data-entra');
        el.removeAttribute('data-revela');
        el.classList.remove('visivel');
      });
      pendentes = pendentes.filter(function (el) { return !el.closest('.hero'); });
    }
    /* o limiar da barra depende de `zoomLigado`, que só existe agora */
    medirLimiar(); aoRolar();

    if (zoomLigado) {
      atual = destino();
      pintar(trava(atual));
    } else {
      aoRolarSeq();   /* no celular a cortina ainda precisa do estado inicial */
    }

    /* A marca da cortina se escreve assim que a página abre, com ou sem voo.
       Os dois quadros de espera existem para o navegador registrar o estado
       inicial antes da transição — mas NÃO dá para depender só deles: com o
       relógio de quadros parado (aba em segundo plano, ambiente sem pintura)
       a classe nunca entraria e a tela de carregamento ficaria vazia para
       sempre. O temporizador é a rede, e `escreveu` garante uma vez só. */
    if (cortina && !menosMovimento) {
      var escreveu = false;
      var escrever = function () {
        if (escreveu) return;
        var m = cortina.querySelector('[data-intro]');
        if (!m) return;
        escreveu = true;
        /* Ordem de escrita: da esquerda para a direita, como se escreve. No
           arquivo do logotipo os traços vêm em outra ordem — a folha, que fica
           na ponta direita, é o primeiro — e sem ordenar a marca aparecia
           começando pelo fim. O grupo da assinatura ("Porto Belo") vai por
           último via data-fim, independentemente de onde esteja. O pingo do
           "i" é um <circle> à parte no arquivo original: ele e a haste estão
           num mesmo <g>, senão o pingo surgiria sozinho, antes das letras. */
        var us = [].slice.call(m.querySelectorAll('.hero-letra')).sort(function (a, b) {
          var ga = a.hasAttribute('data-fim') ? 1 : 0;
          var gb = b.hasAttribute('data-fim') ? 1 : 0;
          if (ga !== gb) return ga - gb;
          return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
        });
        /* o passo se ajusta ao número de unidades: oito letras de texto davam
           850 ms, e o logotipo tem onze traços — sem isto a espera cresceria
           junto e a abertura ficaria lenta */
        var passo = Math.min(90, 850 / Math.max(1, us.length));
        us.forEach(function (u, i) {
          u.style.transitionDelay = Math.round(220 + i * passo) + 'ms';
        });
        m.classList.add('entrou');
      };
      requestAnimationFrame(function () { requestAnimationFrame(escrever); });
      setTimeout(escrever, 80);
    }

    if (fotoHero && !fotoHero.complete) fotoHero.addEventListener('load', function () {
      medirOrigem(); aoRolarSeq();
    });
    window.addEventListener('scroll', aoRolarSeq, { passive: true });
    /* No celular, recolher a barra de endereço dispara `resize` várias vezes
       DURANTE a rolagem — e cada um refazia todas as medições, no meio do
       gesto. Só é redimensionamento de verdade quando a largura muda (girar
       o aparelho, redimensionar a janela) ou quando a altura dá um salto
       grande; o sobe-e-desce da barra, que é pequeno e só na altura, passa
       batido. A sequência não perde nada com isso: `destino()` lê a altura
       viva a cada quadro de qualquer jeito. */
    var larguraAnt = window.innerWidth, alturaAnt = window.innerHeight;
    window.addEventListener('resize', function () {
      var l = window.innerWidth, a = window.innerHeight;
      /* `hover: none` é o sinal honesto de "aparelho com barra que se
         recolhe". No desktop, mexer só na altura É redimensionar de verdade
         e precisa remedir — o filtro não pode valer lá. */
      var semMouse = window.matchMedia('(hover: none)').matches;
      var daBarra = semMouse && (l === larguraAnt) && Math.abs(a - alturaAnt) <= 150;
      alturaAnt = a;
      if (daBarra) return;
      larguraAnt = l;
      alturaRef = a;
      verificarZoom(); tetoDoZoom(); medirOrigem(); medirLimiar(); aoRolarSeq();
    });
    window.addEventListener('load', function () { medirOrigem(); aoRolarSeq(); });
  }

  /* ---------- contagem dos números ---------- */
  var contadores = [].slice.call(document.querySelectorAll('[data-conta]'));
  if (contadores.length && !menosMovimento && 'IntersectionObserver' in window) {
    var obsNum = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (!it.isIntersecting) return;
        var el = it.target;
        obsNum.unobserve(el);
        var alvo = parseInt(el.getAttribute('data-conta'), 10);
        if (isNaN(alvo)) return;
        var inicio = null;
        function passo(t) {
          if (inicio === null) inicio = t;
          var f = Math.min(1, (t - inicio) / 1400);
          el.textContent = Math.round(alvo * (1 - Math.pow(1 - f, 3)));
          if (f < 1) requestAnimationFrame(passo);
        }
        el.textContent = '0';
        requestAnimationFrame(passo);
      });
    }, { threshold: 0.6 });
    contadores.forEach(function (el) { obsNum.observe(el); });
  }

  varrer();   /* revela o que já está na primeira tela */

})();
