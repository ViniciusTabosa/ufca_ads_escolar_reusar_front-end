/* ============================================================================
 * Escola Reusar — pedidos-comum.js
 * ----------------------------------------------------------------------------
 * Camada COMPARTILHADA pelas telas de pedidos. Não contém regra de negócio de
 * nenhuma página específica — apenas:
 *
 *   - helpers seguros de DOM (qs / qsa / el)
 *   - Estilos: injeta o CSS dos componentes criados via JS (modal, toast, abas…)
 *   - Toast:   notificações customizadas na tela
 *   - Modal:   janela flutuante acessível (ESC, clique fora, foco preso)
 *   - Pedidos: leitura dos <article class="pedido"> do HTML para um modelo JS
 *
 * ORDEM DE CARREGAMENTO (obrigatória) — este arquivo vem ANTES do script da
 * página, pois ele publica a API em window.ReusarUI:
 *
 *   <script src="../js/pedidos-comum.js" defer></script>
 *   <script src="../js/lista-pedidos.js" defer></script>
 *
 * Nenhuma alteração de HTML é obrigatória: os controles que não existem na
 * marcação são criados por JS. Os atributos data-* descritos em Pedidos.ler()
 * são OPCIONAIS e, quando presentes, passam a alimentar os dados reais.
 * ========================================================================== */

(function (janela) {
  'use strict';

  /* ==========================================================================
   * 1. HELPERS DE DOM
   * ======================================================================== */

  /** Seleciona o primeiro elemento correspondente (null quando não existe). */
  const qs = (seletor, raiz) => (raiz || document).querySelector(seletor);

  /** Seleciona todos os correspondentes já como Array (permite map/filter). */
  const qsa = (seletor, raiz) =>
    Array.prototype.slice.call((raiz || document).querySelectorAll(seletor));

  /**
   * Cria um elemento sem usar innerHTML — evita qualquer risco de injeção de
   * HTML ao montar conteúdo a partir de texto vindo da página ou de uma API.
   *
   * Chaves especiais de `props`:
   *   class    -> className
   *   texto    -> textContent
   *   dataset  -> Object.assign no dataset
   *   onClick  -> addEventListener('click', fn)   (qualquer on<Evento>)
   * As demais chaves viram setAttribute (aria-*, type, href, role…).
   */
  function el(tag, props, filhos) {
    const node = document.createElement(tag);
    const p = props || {};

    Object.keys(p).forEach(function (chave) {
      const valor = p[chave];
      if (valor === null || valor === undefined || valor === false) return;

      if (chave === 'class') node.className = valor;
      else if (chave === 'texto') node.textContent = valor;
      else if (chave === 'dataset') Object.assign(node.dataset, valor);
      else if (chave.indexOf('on') === 0 && typeof valor === 'function') {
        node.addEventListener(chave.slice(2).toLowerCase(), valor);
      } else node.setAttribute(chave, valor);
    });

    const lista = Array.isArray(filhos) ? filhos : [filhos];
    lista.forEach(function (filho) {
      if (filho === null || filho === undefined || filho === false) return;
      node.appendChild(
        typeof filho === 'string' ? document.createTextNode(filho) : filho
      );
    });

    return node;
  }

  /**
   * Faixa Unicode das marcas de acento que normalize('NFD') separa das
   * letras (U+0300 a U+036F). Montada com String.fromCharCode para manter o
   * fonte 100% ASCII e legivel, sem caracteres invisiveis no regex.
   */
  const MARCAS_DE_ACENTO = new RegExp(
    '[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36F) + ']', 'g'
  );

  /** Normaliza texto para busca: sem acento, minusculo, sem espacos extras. */
  function semAcento(texto) {
    return String(texto === null || texto === undefined ? '' : texto)
      .normalize('NFD')
      .replace(MARCAS_DE_ACENTO, '')
      .toLowerCase()
      .trim();
  }

  /** Agrupa chamadas em rajada numa só (usado no input de busca). */
  function debounce(fn, ms) {
    let timer = null;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms || 120);
    };
  }

  /* ==========================================================================
   * 2. VOCABULÁRIO DE STATUS
   * ======================================================================== */

  const STATUS = {
    andamento: { chave: 'andamento', rotulo: 'Em andamento' },
    concluido: { chave: 'concluido', rotulo: 'Concluído' },
    cancelado: { chave: 'cancelado', rotulo: 'Cancelado' }
  };

  /* ==========================================================================
   * 3. ESTILOS DOS COMPONENTES CRIADOS VIA JS
   * --------------------------------------------------------------------------
   * Ficam aqui (e não no /css) porque pertencem a elementos que só existem
   * quando o JS roda. A tag <style> é anexada ao final do <head>, portanto
   * vence os arquivos .css em igualdade de especificidade.
   * Se preferir, mova este bloco para css/pedidos.css sem nenhuma outra mudança.
   * ======================================================================== */

  const CSS = `
/* ---------- tokens dos componentes ---------- */
:root{
  --js-superficie:#FFFFFF;
  --js-superficie-2:#F6F7F9;
  --js-borda:#D9DBE0;
  --js-texto:#3B3B3B;
  --js-texto-suave:#6B7280;
  --js-acento:#00CCA0;
  --js-acento-fraco:#D9F9EF;
  --js-sombra:0 12px 34px rgba(17,24,39,.20);
}

@media (prefers-reduced-motion: reduce){
  *, *::before, *::after{
    transition-duration:.01ms !important;
    animation-duration:.01ms !important;
  }
}

/* ---------- utilitários ---------- */
.js-oculto{ display:none !important; }
.js-sr{
  position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0;
}
.js-btn:focus-visible, .js-campo:focus-visible,
.js-tab:focus-visible{ outline:2px solid var(--js-acento); outline-offset:2px; }

/* ---------- painel de busca / filtros ---------- */
.js-painel{ display:flex; flex-direction:column; gap:8px; width:100%; }
.js-rotulo{ font-size:.7rem; font-weight:700; color:var(--js-texto); }
.js-campo{
  font:inherit; font-size:.75rem; color:var(--js-texto);
  background:var(--js-superficie);
  border:1px solid var(--js-borda); border-radius:8px;
  padding:7px 10px; width:100%;
}
.js-campo::placeholder{ color:var(--js-texto-suave); }
.js-contador{ font-size:.68rem; color:var(--js-texto-suave); }

/* ---------- abas (meus-pedidos) ---------- */
.js-tabs{
  display:flex; flex-wrap:wrap; gap:8px;
  border-bottom:1px solid var(--js-borda); padding-bottom:10px;
}
.js-tab{
  font:inherit; font-size:.74rem; font-weight:600; cursor:pointer;
  color:var(--js-texto); background:var(--js-superficie-2);
  border:1px solid var(--js-borda); border-radius:999px;
  padding:6px 14px; display:inline-flex; align-items:center; gap:6px;
}
.js-tab:hover{ background:var(--js-acento-fraco); }
.js-tab[aria-selected="true"]{
  background:var(--js-acento); border-color:var(--js-acento); color:#0B2F27;
}
.js-tab__n{
  font-size:.66rem; font-weight:700; line-height:1;
  background:rgba(0,0,0,.10); border-radius:999px; padding:3px 6px;
}
.js-tab[aria-selected="true"] .js-tab__n{ background:rgba(0,0,0,.18); }

/* ---------- selo de status ---------- */
.js-chip{
  display:inline-block; font-size:.62rem; font-weight:700; line-height:1;
  text-transform:uppercase; letter-spacing:.04em;
  border-radius:999px; padding:4px 9px; margin-left:10px;
  vertical-align:middle; white-space:nowrap;
}
.js-chip--andamento{ background:#CFF3EA; color:#0B5A4A; }
.js-chip--concluido{ background:#D6EEDC; color:#14532D; }
.js-chip--cancelado{ background:#F6D7D7; color:#7F1D1D; }

/* ---------- barra de ações do pedido ----------
   No desktop .pedido é uma LINHA (carrossel + bloco amarelo): o wrap + base de
   100% joga a barra de ações para a linha de baixo, ocupando a largura toda. */
.pedido{ flex-wrap:wrap; }
.pedido-acoes{
  flex:0 0 100%; display:flex; flex-wrap:wrap; gap:8px; margin-top:2px;
}

/* Até 480px o pedidos.css troca .pedido para flex-direction:column. Num
   container em coluna, "wrap" cria uma SEGUNDA COLUNA e "flex-basis" passa a
   valer como altura — a barra de ações escapava para a direita e gerava scroll
   horizontal. Aqui os itens voltam a simplesmente empilhar. */
@media (max-width:480px){
  .pedido{ flex-wrap:nowrap; }
  .pedido-acoes{ flex:0 0 auto; width:100%; }
}
.js-btn{
  font:inherit; font-size:.74rem; font-weight:600; cursor:pointer;
  color:var(--js-texto); background:var(--js-superficie-2);
  border:1px solid var(--js-borda); border-radius:8px; padding:7px 14px;
}
.js-btn:hover{ filter:brightness(.96); }
.js-btn--primario{
  background:var(--verde-claro, #56EECD); border-color:#2BA58C; color:#21424D;
}
.js-btn--perigo{ background:#FBE3E3; border-color:#E2A9A9; color:#7F1D1D; }
.js-btn[disabled]{ opacity:.5; cursor:not-allowed; filter:none; }

/* ---------- estado vazio ---------- */
.js-vazio{
  border:1px dashed var(--js-borda); border-radius:10px;
  background:var(--js-superficie-2); color:var(--js-texto-suave);
  padding:26px 18px; text-align:center; font-size:.82rem; line-height:1.5;
}
.js-vazio strong{ display:block; color:var(--js-texto); margin-bottom:4px; }

/* ---------- MODAL ---------- */
.js-overlay{
  position:fixed; inset:0; z-index:9998;
  background:rgba(17,24,39,.55); backdrop-filter:blur(2px);
  display:flex; align-items:center; justify-content:center; padding:20px;
  opacity:0; transition:opacity .25s ease;
}
.js-overlay--visivel{ opacity:1; }
.js-modal{
  background:var(--js-superficie); color:var(--js-texto);
  border:1px solid var(--js-borda); border-radius:14px;
  box-shadow:var(--js-sombra);
  width:100%; max-width:560px; max-height:88vh;
  display:flex; flex-direction:column;
  transform:translateY(14px) scale(.98); transition:transform .25s ease;
}
.js-overlay--visivel .js-modal{ transform:translateY(0) scale(1); }
.js-modal__topo{
  display:flex; align-items:flex-start; gap:12px;
  padding:16px 18px; border-bottom:1px solid var(--js-borda);
}
.js-modal__titulo{ font-size:1.05rem; font-weight:600; flex:1; }
.js-modal__x{
  font:inherit; font-size:1.4rem; line-height:1; cursor:pointer;
  background:transparent; border:0; color:var(--js-texto-suave);
  padding:0 4px; border-radius:6px;
}
.js-modal__x:hover{ color:var(--js-texto); }
.js-modal__corpo{ padding:16px 18px; overflow-y:auto; font-size:.85rem; line-height:1.6; }
.js-modal__rodape{
  display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end;
  padding:14px 18px; border-top:1px solid var(--js-borda);
}
.js-dados{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 16px; margin:14px 0; }
.js-dado{ font-size:.78rem; }
.js-dado dt{ color:var(--js-texto-suave); font-size:.68rem; text-transform:uppercase; letter-spacing:.04em; }
.js-dado dd{ margin:2px 0 0; font-weight:600; }
.js-modal__desc{
  background:var(--js-superficie-2); border-radius:8px; padding:12px 14px;
  font-size:.8rem; line-height:1.6;
}
@media (max-width:480px){ .js-dados{ grid-template-columns:1fr; } }

/* ---------- TOASTS ---------- */
.js-toasts{
  position:fixed; z-index:9999; right:16px; bottom:16px;
  display:flex; flex-direction:column; gap:10px;
  width:min(340px, calc(100vw - 32px)); pointer-events:none;
}
.js-toast{
  pointer-events:auto; display:flex; align-items:flex-start; gap:10px;
  background:var(--js-superficie); color:var(--js-texto);
  border:1px solid var(--js-borda); border-left:4px solid var(--js-texto-suave);
  border-radius:10px; box-shadow:var(--js-sombra); padding:11px 12px;
  font-size:.8rem; line-height:1.45;
  opacity:0; transform:translateX(18px);
  transition:opacity .28s ease, transform .28s ease;
}
.js-toast--visivel{ opacity:1; transform:translateX(0); }
.js-toast--sucesso{ border-left-color:#16A34A; }
.js-toast--erro{ border-left-color:#DC2626; }
.js-toast--aviso{ border-left-color:#D97706; }
.js-toast--info{ border-left-color:var(--js-acento); }
.js-toast__icone{ font-size:1rem; line-height:1.3; }
.js-toast__corpo{ flex:1; }
.js-toast__titulo{ display:block; font-size:.8rem; }
.js-toast__x{
  font:inherit; font-size:1.1rem; line-height:1; cursor:pointer;
  background:transparent; border:0; color:var(--js-texto-suave); padding:0 2px;
}
.js-toast__x:hover{ color:var(--js-texto); }
@media (max-width:480px){
  .js-toasts{ right:12px; left:12px; bottom:12px; width:auto; }
}
`;

  const Estilos = {
    _pronto: false,
    /** Injeta o <style> uma única vez, mesmo se os dois scripts chamarem. */
    aplicar: function () {
      if (this._pronto || qs('#js-estilos-pedidos')) { this._pronto = true; return; }
      const tag = el('style', { id: 'js-estilos-pedidos' });
      tag.appendChild(document.createTextNode(CSS));
      (document.head || document.documentElement).appendChild(tag);
      this._pronto = true;
    }
  };

  /* ==========================================================================
   * 4. TOAST — notificações na tela
   * ======================================================================== */

  const Toast = (function () {
    const ICONES = { sucesso: '✔', erro: '✕', aviso: '⚠', info: 'ℹ' };
    const MAX_NA_TELA = 4;
    let caixa = null;

    function container() {
      if (caixa && caixa.isConnected) return caixa;
      // role=status + aria-live: leitores de tela anunciam sem roubar o foco.
      caixa = el('div', {
        class: 'js-toasts',
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'false'
      });
      document.body.appendChild(caixa);
      return caixa;
    }

    function remover(item) {
      if (!item || !item.isConnected) return;
      item.classList.remove('js-toast--visivel');
      item.addEventListener('transitionend', function () { item.remove(); }, { once: true });
      // Rede de segurança: se a transição não disparar, remove de qualquer forma.
      setTimeout(function () { if (item.isConnected) item.remove(); }, 500);
    }

    function mostrar(mensagem, opcoes) {
      const o = opcoes || {};
      const tipo = o.tipo || 'info';
      const duracao = o.duracao === undefined ? 4000 : o.duracao;
      const cx = container();

      while (cx.children.length >= MAX_NA_TELA) cx.removeChild(cx.firstElementChild);

      const item = el('div', { class: 'js-toast js-toast--' + tipo }, [
        el('span', {
          class: 'js-toast__icone', 'aria-hidden': 'true',
          texto: ICONES[tipo] || ICONES.info
        }),
        el('div', { class: 'js-toast__corpo' }, [
          o.titulo ? el('strong', { class: 'js-toast__titulo', texto: o.titulo }) : null,
          el('span', { texto: mensagem })
        ]),
        el('button', {
          class: 'js-toast__x', type: 'button',
          'aria-label': 'Fechar notificação',
          texto: '×',
          onClick: function () { remover(item); }
        })
      ]);

      cx.appendChild(item);
      requestAnimationFrame(function () { item.classList.add('js-toast--visivel'); });
      if (duracao > 0) setTimeout(function () { remover(item); }, duracao);
      return item;
    }

    return {
      mostrar: mostrar,
      sucesso: function (m, o) { return mostrar(m, Object.assign({}, o, { tipo: 'sucesso' })); },
      erro:    function (m, o) { return mostrar(m, Object.assign({}, o, { tipo: 'erro' })); },
      aviso:   function (m, o) { return mostrar(m, Object.assign({}, o, { tipo: 'aviso' })); },
      info:    function (m, o) { return mostrar(m, Object.assign({}, o, { tipo: 'info' })); }
    };
  })();

  /* ==========================================================================
   * 5. MODAL — janela flutuante acessível
   * --------------------------------------------------------------------------
   * Fecha por: botão "×", botão do rodapé, tecla ESC e clique fora (no overlay).
   * Acessibilidade: role="dialog" + aria-modal, foco preso dentro da janela e
   * devolvido ao elemento que a abriu.
   * ======================================================================== */

  const Modal = (function () {
    const FOCAVEIS = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    let overlay = null;
    let ultimoFoco = null;
    let overflowAnterior = '';
    let sequencia = 0;
    const ouvintesDeFechamento = [];

    function estaAberto() { return !!(overlay && overlay.isConnected); }

    function fechar() {
      if (!estaAberto()) return;
      const morrendo = overlay;
      overlay = null;

      document.removeEventListener('keydown', aoTeclar, true);
      document.body.style.overflow = overflowAnterior;

      morrendo.classList.remove('js-overlay--visivel');
      morrendo.addEventListener('transitionend', function () { morrendo.remove(); }, { once: true });
      setTimeout(function () { if (morrendo.isConnected) morrendo.remove(); }, 500);

      // Devolve o foco a quem abriu o modal (requisito de acessibilidade).
      if (ultimoFoco && ultimoFoco.isConnected) ultimoFoco.focus();
      ultimoFoco = null;

      // Avisa quem estava esperando o fechamento (ver confirmar()).
      while (ouvintesDeFechamento.length) ouvintesDeFechamento.pop()();
    }

    function aoTeclar(evento) {
      if (!estaAberto()) return;

      if (evento.key === 'Escape') {
        evento.preventDefault();
        fechar();
        return;
      }

      if (evento.key !== 'Tab') return;

      // Prende o foco: ciclo entre o primeiro e o último elemento focável.
      const focaveis = qsa(FOCAVEIS, overlay).filter(function (n) {
        return n.offsetWidth > 0 || n.offsetHeight > 0 || n === document.activeElement;
      });
      if (!focaveis.length) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    /**
     * abrir({ titulo, corpo, acoes, textoFechar })
     *   titulo      string
     *   corpo       Node | Node[] | string  (montado com el(), nunca innerHTML)
     *   acoes       [{ texto, estilo:'primario'|'perigo', aoClicar, fechar }]
     *   textoFechar rótulo do botão padrão do rodapé (null remove o botão)
     */
    function abrir(config) {
      const cfg = config || {};
      if (estaAberto()) fechar();

      ultimoFoco = document.activeElement;
      const idTitulo = 'js-modal-titulo-' + (++sequencia);

      const rodape = el('div', { class: 'js-modal__rodape' });

      (cfg.acoes || []).forEach(function (acao) {
        const classe = 'js-btn' + (acao.estilo ? ' js-btn--' + acao.estilo : '');
        rodape.appendChild(el('button', {
          class: classe, type: 'button', texto: acao.texto,
          onClick: function (ev) {
            if (typeof acao.aoClicar === 'function') acao.aoClicar(ev);
            if (acao.fechar !== false) fechar();
          }
        }));
      });

      if (cfg.textoFechar !== null) {
        rodape.appendChild(el('button', {
          class: 'js-btn', type: 'button',
          texto: cfg.textoFechar || 'Fechar',
          onClick: fechar
        }));
      }

      const janelaModal = el('div', {
        class: 'js-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': idTitulo
      }, [
        el('div', { class: 'js-modal__topo' }, [
          el('h2', { class: 'js-modal__titulo', id: idTitulo, texto: cfg.titulo || 'Detalhes' }),
          el('button', {
            class: 'js-modal__x', type: 'button',
            'aria-label': 'Fechar janela', texto: '×',
            onClick: fechar
          })
        ]),
        el('div', { class: 'js-modal__corpo' }, cfg.corpo || []),
        rodape
      ]);

      overlay = el('div', { class: 'js-overlay' }, janelaModal);
      // Clique FORA da janela (direto no overlay) também fecha.
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay) fechar();
      });

      overflowAnterior = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.appendChild(overlay);
      document.addEventListener('keydown', aoTeclar, true);

      requestAnimationFrame(function () {
        if (overlay) overlay.classList.add('js-overlay--visivel');
        const alvo = qs(FOCAVEIS, janelaModal);
        if (alvo) alvo.focus();
      });

      return overlay;
    }

    /**
     * Confirmação para ações destrutivas. Retorna Promise<boolean>:
     *   Modal.confirmar({...}).then(function (ok) { if (ok) { ... } });
     * Fechar por ESC / × / clique fora resolve como false.
     */
    function confirmar(config) {
      const cfg = config || {};
      return new Promise(function (resolver) {
        let respondido = false;
        function responder(valor) {
          if (respondido) return;
          respondido = true;
          resolver(valor);
        }

        abrir({
          titulo: cfg.titulo || 'Confirmar ação',
          corpo: [el('p', { texto: cfg.mensagem || 'Deseja confirmar esta ação?' })],
          acoes: [{
            texto: cfg.textoConfirmar || 'Confirmar',
            estilo: cfg.perigo === false ? 'primario' : 'perigo',
            aoClicar: function () { responder(true); }
          }],
          textoFechar: cfg.textoCancelar || 'Voltar'
        });

        // Registrado DEPOIS de abrir(): abrir() limpa a fila do modal anterior.
        ouvintesDeFechamento.push(function () { responder(false); });
      });
    }

    return { abrir: abrir, fechar: fechar, confirmar: confirmar, estaAberto: estaAberto };
  })();

  /* ==========================================================================
   * 6. PEDIDOS — HTML  ->  modelo de dados em JS
   * ======================================================================== */

  const Pedidos = (function () {

    /**
     * Quando true, pedidos SEM data-status recebem um status de demonstração
     * (determinístico, derivado do número do pedido) só para as abas e o filtro
     * terem conteúdo na apresentação. Coloque false quando o back-end passar a
     * renderizar data-status no HTML.
     */
    const STATUS_DEMO = true;

    function normalizarStatus(valor) {
      const v = semAcento(valor);
      if (!v) return null;
      if (v.indexOf('conclu') === 0 || v === 'finalizado' || v === 'entregue') return 'concluido';
      if (v.indexOf('cancel') === 0) return 'cancelado';
      if (v.indexOf('andamento') >= 0 || v === 'aberto' || v === 'pendente' || v === 'ativo') return 'andamento';
      return STATUS[v] ? v : null;
    }

    function idDoPedido(artigo, indice) {
      if (artigo.dataset.id) return artigo.dataset.id;
      const titulo = qs('h3', artigo);
      const achado = titulo ? titulo.textContent.match(/\d+/) : null;
      const numero = achado ? achado[0] : String(indice + 1);
      return String(numero).padStart(3, '0');
    }

    function statusDeDemonstracao(id) {
      const n = parseInt(id, 10) || 0;
      return ['cancelado', 'andamento', 'concluido'][n % 3];
    }

    /**
     * Lê todos os <article class="pedido"> e devolve o modelo em JS.
     *
     * data-* OPCIONAIS reconhecidos no <article class="pedido">:
     *   data-id           "001"
     *   data-status       "andamento" | "concluido" | "cancelado"
     *   data-data         "2026-08-14"   (ISO — usado na ordenação e no modal)
     *   data-local        "Escola Municipal X"
     *   data-solicitante  "Maria Souza"
     *   data-itens        "12 cadernos, 3 mochilas"
     * Ausentes: id e status têm fallback; os demais viram "Não informado".
     */
    function ler(raiz) {
      return qsa('.pedido', raiz || document).map(function (artigo, i) {
        const id = idDoPedido(artigo, i);
        const status = normalizarStatus(artigo.dataset.status) ||
          (STATUS_DEMO ? statusDeDemonstracao(id) : 'andamento');

        // Grava de volta no DOM: o dataset passa a ser a fonte de verdade.
        artigo.dataset.id = id;
        artigo.dataset.status = status;

        const h3 = qs('.pedido-info h3', artigo) || qs('h3', artigo);
        const p = qs('.pedido-info p', artigo) || qs('p', artigo);
        const link = qs('.pedido-info', artigo);

        const titulo = h3 ? h3.textContent.replace(/\s+/g, ' ').trim() : 'Pedido ' + id;
        const descricao = p ? p.textContent.replace(/\s+/g, ' ').trim() : '';

        const pedido = {
          el: artigo,
          id: id,
          status: status,
          titulo: titulo,
          descricao: descricao,
          data: artigo.dataset.data || '',
          local: artigo.dataset.local || '',
          solicitante: artigo.dataset.solicitante || '',
          itens: artigo.dataset.itens || '',
          href: (link && link.getAttribute('href')) || ''
        };

        pedido.busca = semAcento([id, titulo, descricao, STATUS[status].rotulo].join(' '));
        return pedido;
      });
    }

    /** Desenha (ou atualiza) o selo de status dentro do <h3> do pedido. */
    function marcarStatus(pedido) {
      const h3 = qs('.pedido-info h3', pedido.el) || qs('h3', pedido.el);
      if (!h3) return;
      const antigo = qs('.js-chip', h3);
      if (antigo) antigo.remove();
      h3.appendChild(el('span', {
        class: 'js-chip js-chip--' + pedido.status,
        texto: STATUS[pedido.status].rotulo
      }));
    }

    /** Atualiza status no modelo + no DOM + no selo, de uma vez. */
    function definirStatus(pedido, novoStatus) {
      const status = normalizarStatus(novoStatus) || 'andamento';
      pedido.status = status;
      pedido.el.dataset.status = status;
      pedido.busca = semAcento(
        [pedido.id, pedido.titulo, pedido.descricao, STATUS[status].rotulo].join(' ')
      );
      marcarStatus(pedido);
      return status;
    }

    /**
     * Cria a barra de ações do pedido.
     * IMPORTANTE: ela é IRMÃ do <a class="pedido-info">, nunca filha — <button>
     * dentro de <a> é HTML inválido e quebra tanto o clique quanto o teclado.
     */
    function barraAcoes(pedido, botoes) {
      const anterior = qs('.pedido-acoes', pedido.el);
      if (anterior) anterior.remove();

      const barra = el('div', { class: 'pedido-acoes' });

      (botoes || []).forEach(function (b) {
        barra.appendChild(el('button', {
          class: 'js-btn' + (b.estilo ? ' js-btn--' + b.estilo : ''),
          type: 'button',
          dataset: b.dataset || {},
          'aria-label': b.rotuloAria || (b.texto + ' — ' + pedido.titulo),
          texto: b.texto,
          onClick: function (ev) { b.aoClicar(pedido, ev.currentTarget); }
        }));
      });

      pedido.el.appendChild(barra);
      return barra;
    }

    function linhaDado(rotulo, valor) {
      const texto = valor !== null && valor !== undefined && String(valor).trim()
        ? String(valor) : 'Não informado';
      return el('div', { class: 'js-dado' }, [
        el('dt', { texto: rotulo }),
        el('dd', { texto: texto })
      ]);
    }

    function dataLegivel(iso) {
      if (!iso) return '';
      const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    /** Modal de detalhes do pedido, reaproveitado pelas duas páginas. */
    function abrirDetalhes(pedido, acoesExtras) {
      const corpo = [
        el('p', {}, [
          el('strong', { texto: 'Status: ' }),
          el('span', {
            class: 'js-chip js-chip--' + pedido.status,
            texto: STATUS[pedido.status].rotulo
          })
        ]),
        el('dl', { class: 'js-dados' }, [
          linhaDado('Nº do pedido', pedido.id),
          linhaDado('Data', dataLegivel(pedido.data)),
          linhaDado('Solicitante', pedido.solicitante),
          linhaDado('Local de retirada', pedido.local),
          linhaDado('Itens', pedido.itens)
        ]),
        el('strong', { texto: 'Descrição' }),
        el('p', {
          class: 'js-modal__desc',
          texto: pedido.descricao || 'Sem descrição cadastrada.'
        })
      ];

      const acoes = (acoesExtras || []).slice();
      if (pedido.href) {
        acoes.push({
          texto: 'Abrir página completa',
          estilo: 'primario',
          aoClicar: function () { janela.location.href = pedido.href; }
        });
      }

      return Modal.abrir({ titulo: pedido.titulo, corpo: corpo, acoes: acoes });
    }

    /**
     * Mostra/oculta pedidos conforme um predicado e devolve quantos ficaram
     * visíveis — usado pela busca (lista-pedidos) e pelas abas (meus-pedidos).
     */
    function filtrar(pedidos, predicado) {
      let visiveis = 0;
      pedidos.forEach(function (p) {
        const passa = !!predicado(p);
        p.el.classList.toggle('js-oculto', !passa);
        if (passa) visiveis++;
      });
      return visiveis;
    }

    /** Cria/atualiza/remove o bloco de "nenhum resultado" dentro do container. */
    function estadoVazio(container, visivel, titulo, texto) {
      let bloco = qs('.js-vazio', container);

      if (!visivel) {
        if (bloco) bloco.remove();
        return;
      }
      if (!bloco) {
        bloco = el('div', { class: 'js-vazio', role: 'status' }, [
          el('strong', { class: 'js-vazio__t' }),
          el('span', { class: 'js-vazio__p' })
        ]);
        // Fica sempre acima do botão "Mostrar mais", quando ele existe.
        container.insertBefore(bloco, qs('.botao-mais', container) || null);
      }
      qs('.js-vazio__t', bloco).textContent = titulo;
      qs('.js-vazio__p', bloco).textContent = texto;
    }

    return {
      ler: ler,
      marcarStatus: marcarStatus,
      definirStatus: definirStatus,
      barraAcoes: barraAcoes,
      abrirDetalhes: abrirDetalhes,
      filtrar: filtrar,
      estadoVazio: estadoVazio,
      dataLegivel: dataLegivel,
      normalizarStatus: normalizarStatus
    };
  })();

  /* ==========================================================================
   * 7. BOOTSTRAP DA CAMADA COMUM
   * ======================================================================== */

  Estilos.aplicar();   // antes do primeiro paint quando o script usa defer

  function aoDomPronto(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else fn();
  }

  aoDomPronto(function () {
    Estilos.aplicar();
  });

  /* API pública consumida por lista-pedidos.js e meus-pedidos.js */
  janela.ReusarUI = {
    qs: qs,
    qsa: qsa,
    el: el,
    semAcento: semAcento,
    debounce: debounce,
    aoDomPronto: aoDomPronto,
    STATUS: STATUS,
    Estilos: Estilos,
    Toast: Toast,
    Modal: Modal,
    Pedidos: Pedidos
  };

})(window);
