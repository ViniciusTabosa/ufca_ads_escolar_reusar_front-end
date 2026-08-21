(function (janela) {
  'use strict';

  const UI = janela.ReusarUI;
  if (!UI) {
    console.error('[lista-pedidos] Carregue js/pedidos-comum.js antes deste arquivo.');
    return;
  }

  const qs = UI.qs;
  const qsa = UI.qsa;
  const el = UI.el;
  const semAcento = UI.semAcento;
  const debounce = UI.debounce;
  const Toast = UI.Toast;
  const Pedidos = UI.Pedidos;
  const STATUS = UI.STATUS;

  /* Opções do <select> de status. */
  const OPCOES_STATUS = [
    { valor: 'todos', rotulo: 'Todos os status' },
    { valor: 'andamento', rotulo: STATUS.andamento.rotulo },
    { valor: 'concluido', rotulo: STATUS.concluido.rotulo },
    { valor: 'cancelado', rotulo: STATUS.cancelado.rotulo }
  ];

  /* Estado único da tela: toda renderização deriva daqui. */
  const estado = { termo: '', status: 'todos', ordem: 'relevantes' };

  let pedidos = [];
  let container = null;   // .lista-itens
  let campoBusca = null;
  let campoStatus = null;
  let contador = null;

  /* ==========================================================================
   * 1. PAINEL DE BUSCA E FILTRO
   * --------------------------------------------------------------------------
   * Injetado dentro do <aside class="filtros">, logo acima de "Ordenar por:".
   * Se o aside não existir (layout alterado), cai para o topo de .lista-itens,
   * de modo que a busca nunca deixa de aparecer.
   * ======================================================================== */

  function montarPainelDeBusca() {
    const painel = el('div', { class: 'js-painel' }, [
      el('label', { class: 'js-rotulo', for: 'js-busca-pedido', texto: 'Buscar pedido' }),
      el('input', {
        class: 'js-campo',
        id: 'js-busca-pedido',
        type: 'search',
        autocomplete: 'off',
        placeholder: 'Nº, status ou texto…',
        'aria-describedby': 'js-contador-pedidos'
      }),
      el('label', { class: 'js-rotulo', for: 'js-filtro-status', texto: 'Status' }),
      el('select', { class: 'js-campo', id: 'js-filtro-status' },
        OPCOES_STATUS.map(function (o) {
          return el('option', { value: o.valor, texto: o.rotulo });
        })
      ),
      el('p', {
        class: 'js-contador',
        id: 'js-contador-pedidos',
        role: 'status',
        'aria-live': 'polite'
      })
    ]);

    const filtros = qs('.filtros');
    if (filtros) {
      // Fica entre o título "Filtros" e o rótulo "Ordenar por:".
      filtros.insertBefore(painel, qs('.filtros-label', filtros) || null);
    } else {
      container.insertBefore(painel, container.firstChild);
    }

    campoBusca = qs('#js-busca-pedido');
    campoStatus = qs('#js-filtro-status');
    contador = qs('#js-contador-pedidos');

    // Filtro em TEMPO REAL: 'input' cobre digitação, colar e o "x" do type=search.
    campoBusca.addEventListener('input', debounce(function () {
      estado.termo = campoBusca.value;
      renderizar();
    }, 120));

    // ESC limpa a busca sem precisar apagar caractere por caractere.
    campoBusca.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && campoBusca.value) {
        ev.preventDefault();
        campoBusca.value = '';
        estado.termo = '';
        renderizar();
      }
    });

    campoStatus.addEventListener('change', function () {
      estado.status = campoStatus.value;
      renderizar();
    });
  }

  /* ==========================================================================
   * 2. ORDENAÇÃO PELAS "PILLS"
   * --------------------------------------------------------------------------
   * As pills são <a href="lista-pedidos.html">: sem JS elas recarregam a página
   * e zeram o filtro. Aqui o clique é interceptado e passa a reordenar o DOM.
   *   - "Mais Relevantes" = ordem original de cadastro (nº do pedido crescente)
   *   - "Mais Recentes"   = data-data decrescente; sem data-data, nº decrescente
   * ======================================================================== */

  function ligarOrdenacao() {
    const pills = qsa('.filtros .pill');
    if (!pills.length) return;

    pills.forEach(function (pill) {
      const ordem = semAcento(pill.textContent).indexOf('recentes') >= 0
        ? 'recentes' : 'relevantes';

      pill.dataset.ordem = ordem;
      pill.setAttribute('role', 'button');
      pill.setAttribute('aria-pressed', String(pill.classList.contains('pill-ativo')));

      pill.addEventListener('click', function (ev) {
        ev.preventDefault();       // não recarrega a página
        estado.ordem = ordem;

        pills.forEach(function (p) {
          const ativa = p === pill;
          p.classList.toggle('pill-ativo', ativa);
          p.setAttribute('aria-pressed', String(ativa));
        });

        renderizar();
      });
    });
  }

  function comparar(a, b) {
    if (estado.ordem === 'recentes') {
      if (a.data && b.data && a.data !== b.data) return b.data.localeCompare(a.data);
      return b.id.localeCompare(a.id, 'pt-BR', { numeric: true });
    }
    return a.id.localeCompare(b.id, 'pt-BR', { numeric: true });
  }

  /** Reordena os nós no DOM mantendo "Mostrar mais" e o estado vazio no fim. */
  function ordenarNoDom() {
    const ancora = qs('.js-vazio', container) || qs('.botao-mais', container);
    pedidos.slice().sort(comparar).forEach(function (p) {
      container.insertBefore(p.el, ancora);
    });
  }

  /* ==========================================================================
   * 3. BOTÃO "VER DETALHES" -> MODAL
   * --------------------------------------------------------------------------
   * A barra de ações é criada como IRMÃ do <a class="pedido-info">: colocar um
   * <button> dentro de um <a> é HTML inválido e quebra clique e teclado.
   * O link do bloco amarelo continua funcionando e levando a detalhe-pedido.html
   * — o modal é a consulta rápida, sem sair da listagem.
   * ======================================================================== */

  function montarAcoes() {
    pedidos.forEach(function (pedido) {
      Pedidos.marcarStatus(pedido);          // selo de status dentro do <h3>
      Pedidos.barraAcoes(pedido, [{
        texto: 'Ver detalhes',
        estilo: 'primario',
        rotuloAria: 'Ver detalhes do ' + pedido.titulo,
        aoClicar: function (p) { Pedidos.abrirDetalhes(p); }
      }]);
    });
  }

  /* ==========================================================================
   * 4. "MOSTRAR MAIS"
   * --------------------------------------------------------------------------
   * Também é um <a href> que recarregaria a página e perderia o filtro. Sem
   * back-end não há próxima página, então o clique só informa isso.
   * Quando existir paginação, troque o corpo por fetch() + append dos pedidos
   * e chame indexar() de novo.
   * ======================================================================== */

  function ligarMostrarMais() {
    const botao = qs('.botao-mais', container);
    if (!botao) return;

    botao.addEventListener('click', function (ev) {
      ev.preventDefault();
      Toast.info(
        'Todos os ' + pedidos.length + ' pedidos disponíveis já estão na tela.',
        { titulo: 'Nada mais para carregar' }
      );
    });
  }

  /* ==========================================================================
   * 5. RENDERIZAÇÃO
   * ======================================================================== */

  function textoVazio() {
    const termo = estado.termo.trim();
    const temStatus = estado.status !== 'todos';

    if (!termo && !temStatus) return 'Não há pedidos cadastrados no momento.';

    const partes = [];
    if (termo) partes.push('a busca "' + termo + '"');
    if (temStatus) partes.push('o status "' + STATUS[estado.status].rotulo + '"');

    return 'Nenhum pedido encontrado para ' + partes.join(' e ')
      + '. Ajuste os filtros e tente novamente.';
  }

  function renderizar() {
    const termo = semAcento(estado.termo);

    const visiveis = Pedidos.filtrar(pedidos, function (p) {
      const casaStatus = estado.status === 'todos' || p.status === estado.status;
      const casaTermo = !termo || p.busca.indexOf(termo) >= 0;
      return casaStatus && casaTermo;
    });

    ordenarNoDom();

    if (contador) {
      contador.textContent = visiveis === pedidos.length
        ? pedidos.length + (pedidos.length === 1 ? ' pedido' : ' pedidos')
        : visiveis + ' de ' + pedidos.length + ' pedidos';
    }

    Pedidos.estadoVazio(container, visiveis === 0, 'Nenhum pedido encontrado', textoVazio());

    // Sem resultados, "Mostrar mais" não faz sentido na tela.
    const botaoMais = qs('.botao-mais', container);
    if (botaoMais) botaoMais.classList.toggle('js-oculto', visiveis === 0);
  }

  /* ==========================================================================
   * 6. INICIALIZAÇÃO
   * ======================================================================== */

  function indexar() {
    pedidos = Pedidos.ler(container);
  }

  function iniciar() {
    container = qs('.lista-itens');
    // Guarda de segurança: se o script for incluído em outra página, não faz nada.
    if (!container || !qs('.pedido', container)) return;

    indexar();
    montarPainelDeBusca();
    ligarOrdenacao();
    montarAcoes();
    ligarMostrarMais();
    renderizar();
  }

  UI.aoDomPronto(iniciar);

})(window);
