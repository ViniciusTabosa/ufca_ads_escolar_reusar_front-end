(function (janela) {
  'use strict';

  const UI = janela.ReusarUI;
  if (!UI) {
    console.error('[meus-pedidos] Carregue js/pedidos-comum.js antes deste arquivo.');
    return;
  }

  const qs = UI.qs;
  const qsa = UI.qsa;
  const el = UI.el;
  const Toast = UI.Toast;
  const Modal = UI.Modal;
  const Pedidos = UI.Pedidos;
  const STATUS = UI.STATUS;

  /* Definição das abas: 'chave' é comparada com o status do pedido. */
  const ABAS = [
    { chave: 'todos', rotulo: 'Todos' },
    { chave: 'andamento', rotulo: 'Em andamento' },
    { chave: 'concluido', rotulo: 'Concluídos' },
    { chave: 'cancelado', rotulo: 'Cancelados' }
  ];

  /**
   * Mensagens de rastreio por status. Em produção, troque por uma chamada
   * fetch() ao endpoint de rastreio e alimente o toast com a resposta.
   */
  const RASTREIO = {
    andamento: 'está em separação. Avisaremos quando estiver pronto para retirada.',
    concluido: 'foi concluído e já consta como retirado.',
    cancelado: 'está cancelado, portanto não há movimentação prevista.'
  };

  const estado = { aba: 'todos' };

  let pedidos = [];
  let container = null;   // .lista-itens
  let barraAbas = null;
  let resumo = null;

  /* ==========================================================================
   * 1. ABAS (TABS)
   * --------------------------------------------------------------------------
   * Cada aba é um <button role="tab"> com aria-selected e "roving tabindex":
   * só a aba ativa recebe tabindex="0", então o Tab pula o grupo inteiro e as
   * setas ←/→ (e Home/End) navegam entre as abas — comportamento esperado de
   * um tablist. A troca apenas mostra/oculta os .pedido já presentes no DOM,
   * sem nenhuma requisição.
   * ======================================================================== */

  function montarAbas() {
    barraAbas = el('div', {
      class: 'js-tabs',
      role: 'tablist',
      'aria-label': 'Filtrar meus pedidos por status'
    });

    ABAS.forEach(function (aba, indice) {
      const ativa = aba.chave === estado.aba;

      const botao = el('button', {
        class: 'js-tab',
        type: 'button',
        role: 'tab',
        id: 'js-aba-' + aba.chave,
        'aria-selected': String(ativa),
        tabindex: ativa ? '0' : '-1',
        dataset: { aba: aba.chave },
        onClick: function () { selecionar(aba.chave); },
        onKeydown: function (ev) { navegarComTeclado(ev, indice); }
      }, [
        el('span', { texto: aba.rotulo }),
        el('span', { class: 'js-tab__n', 'aria-hidden': 'true', texto: '0' })
      ]);

      barraAbas.appendChild(botao);
    });

    resumo = el('p', { class: 'js-contador', role: 'status', 'aria-live': 'polite' });

    // As abas entram logo abaixo do título "Meus pedidos:".
    const titulo = qs('.lista-titulo', container);
    const referencia = titulo ? titulo.nextSibling : container.firstChild;
    container.insertBefore(barraAbas, referencia);
    container.insertBefore(resumo, referencia);
  }

  function navegarComTeclado(evento, indice) {
    const teclas = { ArrowRight: 1, ArrowLeft: -1 };
    let destino = null;

    if (evento.key in teclas) destino = (indice + teclas[evento.key] + ABAS.length) % ABAS.length;
    else if (evento.key === 'Home') destino = 0;
    else if (evento.key === 'End') destino = ABAS.length - 1;
    else return;

    evento.preventDefault();
    selecionar(ABAS[destino].chave);
    const alvo = qs('#js-aba-' + ABAS[destino].chave);
    if (alvo) alvo.focus();
  }

  function selecionar(chave) {
    estado.aba = chave;

    qsa('.js-tab', barraAbas).forEach(function (btn) {
      const ativa = btn.dataset.aba === chave;
      btn.setAttribute('aria-selected', String(ativa));
      btn.tabIndex = ativa ? 0 : -1;
    });

    renderizar();
  }

  /* ==========================================================================
   * 2. AÇÕES RÁPIDAS COM FEEDBACK VISUAL
   * --------------------------------------------------------------------------
   * A barra é criada como IRMÃ do <a class="pedido-info">, nunca dentro dele:
   * <button> dentro de <a> é HTML inválido e quebra clique e teclado.
   * ======================================================================== */

  function montarAcoes(pedido) {
    const finalizado = pedido.status === 'cancelado' || pedido.status === 'concluido';

    Pedidos.marcarStatus(pedido);   // selo de status dentro do <h3>

    Pedidos.barraAcoes(pedido, [
      {
        texto: 'Ver detalhes',
        estilo: 'primario',
        rotuloAria: 'Ver detalhes do ' + pedido.titulo,
        aoClicar: verDetalhes
      },
      {
        texto: 'Rastrear',
        rotuloAria: 'Rastrear ' + pedido.titulo,
        aoClicar: rastrear
      },
      {
        texto: finalizado ? 'Cancelamento indisponível' : 'Cancelar pedido',
        estilo: finalizado ? null : 'perigo',
        rotuloAria: 'Cancelar ' + pedido.titulo,
        aoClicar: cancelar
      }
    ]);

    // Pedido já concluído ou cancelado não pode ser cancelado de novo.
    if (finalizado) {
      const botoes = qsa('.pedido-acoes .js-btn', pedido.el);
      const ultimo = botoes[botoes.length - 1];
      if (ultimo) ultimo.disabled = true;
    }
  }

  function verDetalhes(pedido) {
    // O modal de detalhes recebe "Rastrear" como ação extra no rodapé.
    Pedidos.abrirDetalhes(pedido, [{
      texto: 'Rastrear',
      aoClicar: function () { rastrear(pedido); }
    }]);
  }

  function rastrear(pedido) {
    Toast.info(pedido.titulo + ' ' + RASTREIO[pedido.status], {
      titulo: 'Rastreamento',
      duracao: 5000
    });
  }

  function cancelar(pedido) {
    if (pedido.status === 'cancelado') {
      Toast.aviso(pedido.titulo + ' já está cancelado.', { titulo: 'Nada a fazer' });
      return;
    }
    if (pedido.status === 'concluido') {
      Toast.erro('Pedidos concluídos não podem ser cancelados.', { titulo: 'Ação não permitida' });
      return;
    }

    // Ação destrutiva: confirmação explícita antes de executar.
    Modal.confirmar({
      titulo: 'Cancelar ' + pedido.titulo + '?',
      mensagem: 'Esta ação encerra o pedido e não pode ser desfeita pela tela. '
        + 'O pedido continuará visível na aba "Cancelados".',
      textoConfirmar: 'Sim, cancelar pedido',
      textoCancelar: 'Manter pedido'
    }).then(function (confirmado) {
      if (!confirmado) {
        Toast.info(pedido.titulo + ' foi mantido.', { duracao: 2500 });
        return;
      }

      // Aqui entraria o fetch() de cancelamento; o estado local é atualizado
      // em seguida para a interface refletir a mudança na hora.
      Pedidos.definirStatus(pedido, 'cancelado');
      montarAcoes(pedido);
      renderizar();

      Toast.sucesso(pedido.titulo + ' foi cancelado com sucesso.', {
        titulo: 'Pedido cancelado'
      });
    });
  }

  /* ==========================================================================
   * 3. "MOSTRAR MAIS"
   * --------------------------------------------------------------------------
   * É um <a href> que recarregaria a página e voltaria para a aba "Todos".
   * Sem back-end não há próxima página, então o clique só informa isso.
   * ======================================================================== */

  function ligarMostrarMais() {
    const botao = qs('.botao-mais', container);
    if (!botao) return;

    botao.addEventListener('click', function (ev) {
      ev.preventDefault();
      Toast.info(
        'Todos os seus ' + pedidos.length + ' pedidos já estão na tela.',
        { titulo: 'Nada mais para carregar' }
      );
    });
  }

  /* ==========================================================================
   * 4. RENDERIZAÇÃO
   * ======================================================================== */

  function contar(chave) {
    if (chave === 'todos') return pedidos.length;
    return pedidos.filter(function (p) { return p.status === chave; }).length;
  }

  function atualizarContadores() {
    qsa('.js-tab', barraAbas).forEach(function (btn) {
      const numero = qs('.js-tab__n', btn);
      if (numero) numero.textContent = String(contar(btn.dataset.aba));
    });
  }

  function textoVazio() {
    if (estado.aba === 'todos') return 'Você ainda não fez nenhum pedido.';
    return 'Nenhum pedido com o status "' + STATUS[estado.aba].rotulo
      + '" por aqui. Escolha outra aba para ver o restante do seu histórico.';
  }

  function renderizar() {
    const visiveis = Pedidos.filtrar(pedidos, function (p) {
      return estado.aba === 'todos' || p.status === estado.aba;
    });

    atualizarContadores();

    const nomeAba = estado.aba === 'todos'
      ? 'no histórico'
      : 'com status "' + STATUS[estado.aba].rotulo + '"';
    resumo.textContent = visiveis === 1
      ? '1 pedido ' + nomeAba + '.'
      : visiveis + ' pedidos ' + nomeAba + '.';

    Pedidos.estadoVazio(container, visiveis === 0, 'Nada por aqui', textoVazio());

    const botaoMais = qs('.botao-mais', container);
    if (botaoMais) botaoMais.classList.toggle('js-oculto', visiveis === 0);
  }

  /* ==========================================================================
   * 5. INICIALIZAÇÃO
   * ======================================================================== */

  function iniciar() {
    container = qs('.lista-itens');
    // Guarda de segurança: se o script for incluído em outra página, não faz nada.
    if (!container || !qs('.pedido', container)) return;

    pedidos = Pedidos.ler(container);
    montarAbas();
    pedidos.forEach(montarAcoes);
    ligarMostrarMais();
    renderizar();
  }

  UI.aoDomPronto(iniciar);

})(window);
