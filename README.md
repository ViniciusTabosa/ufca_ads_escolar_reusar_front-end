# ♻️ Escola Reusar — Front-end

Front-end do projeto **Escola Reusar**, desenvolvido na disciplina de Desenvolvimento Web do curso de **Análise e Desenvolvimento de Sistemas da UFCA**.

> O material que você não usa mais é o futuro dos estudos de alguém.

A Escola Reusar é uma plataforma que conecta **doadores** e **recebedores** de material escolar: quem precisa publica um pedido de ajuda, e quem tem material parado doa para fortalecer a base da nossa educação.

## 🧰 Tecnologias

- HTML5
- CSS3 puro

## 🚀 Como rodar

O projeto é 100% estático. Duas opções:

1. **Direto no navegador**: abra o arquivo `index.html`.
2. **Via XAMPP** (recomendado): coloque a pasta do projeto em `htdocs` e acesse `http://localhost/ufca_ads_escolar_reusar_front-end/`.

## 📁 Estrutura do projeto

```
├── index.html              # Página inicial (landing)
├── paginas/                # Todas as demais páginas
│   ├── login.html          # Login
│   ├── cadastro.html       # Cadastro de usuário
│   ├── lista-pedidos.html  # Área de pedidos (lista geral)
│   ├── meus-pedidos.html   # Pedidos do usuário logado
│   └── perfil.html         # Perfil do usuário
├── css/
│   ├── base.css            # Estilos COMPARTILHADOS: reset, cabeçalho e rodapé
│   ├── login-cadastro.css  # Estilos das telas de login e cadastro
│   ├── index.css           # Estilos da landing (index)
│   ├── perfil.css          # Estilos da tela de perfil
│   └── pedidos.css         # Estilos das telas de pedidos
└── imgs/                   # Logo e ilustrações
```

Telas previstas e ainda não implementadas: `criacao-pedido.html` (novo pedido) e `detalhes-pedido.html` (detalhes de um pedido).

## 🧩 Padrão de cabeçalho e rodapé

O cabeçalho e o rodapé são unificados pelo `css/base.css`, que deve ser importado em **toda página, antes do CSS específico dela**:

```html
<link rel="stylesheet" href="../css/base.css">
<link rel="stylesheet" href="../css/pedidos.css">
```

Existem **duas variações de menu**, ambas com o mesmo visual de barra:

**1. Menu deslogado** (landing, login, cadastro):

```html
<nav>
    <ul>
        <li><a href="cadastro.html">Cadastrar</a></li>
        <li><a href="login.html">Login</a></li>
    </ul>
</nav>
```

**2. Menu logado** (páginas internas) — use `class="menu-logado"` no `<nav>` e marque a página atual com `class="ativo"`:

```html
<nav class="menu-logado">
    <ul>
        <li><a class="ativo" href="lista-pedidos.html">Área de pedidos</a></li>
        <li><a href="criacao-pedido.html">Novo pedido</a></li>
        <li><a href="meus-pedidos.html">Meus pedidos</a></li>
        <li><a href="perfil.html">Meu perfil</a></li>
        <li><a href="../index.html">Sair</a></li>
    </ul>
</nav>
```

O rodapé padrão é:

```html
<footer>
    <p>Code by: PISociety</p>
</footer>
```

## 👥 Equipe — PISociety

- Pablo Henrique ([@phpablo](https://github.com/phpablo))
- Sarah Oliveira ([@Sarah-Oliver-SOL](https://github.com/Sarah-Oliver-SOL))
- Saulo Victo ([@Saulo-victo](https://github.com/Saulo-victo))
- Vinicius Tabosa ([@ViniciusTabosa](https://github.com/ViniciusTabosa))
