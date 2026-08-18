// CADASTRO

const formCadastro = document.getElementById("formCadastro");

if (formCadastro) {

    const nome = document.getElementById("nome");
    const email = document.getElementById("email");
    const senha = document.getElementById("senha");
    const confirmarSenha = document.getElementById("confirmarSenha");
    const mensagem = document.getElementById("mensagemCadastro");

    formCadastro.addEventListener("submit", function(event) {

        event.preventDefault();

        mensagem.textContent = "";
        mensagem.className = "mensagem";

        // Verifica nome
        if (nome.value.trim() === "") {
            mensagem.textContent = "Por favor, informe seu nome.";
            mensagem.classList.add("erro");
            nome.focus();
            return;
        }

        // Verifica e-mail
        if (email.value.trim() === "") {
            mensagem.textContent = "Por favor, informe seu e-mail.";
            mensagem.classList.add("erro");
            email.focus();
            return;
        }

        // Verifica formato do e-mail
        const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formatoEmail.test(email.value)) {
            mensagem.textContent = "Digite um e-mail válido.";
            mensagem.classList.add("erro");
            email.focus();
            return;
        }

        // Verifica senha
        if (senha.value === "") {
            mensagem.textContent = "Por favor, informe uma senha.";
            mensagem.classList.add("erro");
            senha.focus();
            return;
        }

        // Verifica tamanho da senha
        if (senha.value.length < 6) {
            mensagem.textContent = "A senha deve possuir pelo menos 6 caracteres.";
            mensagem.classList.add("erro");
            senha.focus();
            return;
        }

        // Verifica confirmação da senha
        if (confirmarSenha.value === "") {
            mensagem.textContent = "Confirme sua senha.";
            mensagem.classList.add("erro");
            confirmarSenha.focus();
            return;
        }

        // Compara as senhas
        if (senha.value !== confirmarSenha.value) {
            mensagem.textContent = "As senhas não coincidem.";
            mensagem.classList.add("erro");
            confirmarSenha.focus();
            return;
        }

        // Cadastro válido
        mensagem.textContent = "Cadastro realizado com sucesso!";
        mensagem.classList.add("sucesso");

        // Limpa o formulário
        formCadastro.reset();

    });
}


// LOGIN

const formLogin = document.getElementById("formLogin");

if (formLogin) {

    const email = document.getElementById("email");
    const senha = document.getElementById("senha");
    const mensagem = document.getElementById("mensagemLogin");

    formLogin.addEventListener("submit", function(event) {

        event.preventDefault();

        mensagem.textContent = "";
        mensagem.className = "mensagem";

        // Verifica e-mail
        if (email.value.trim() === "") {
            mensagem.textContent = "Por favor, informe seu e-mail.";
            mensagem.classList.add("erro");
            email.focus();
            return;
        }

        // Verifica formato do e-mail
        const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formatoEmail.test(email.value)) {
            mensagem.textContent = "Digite um e-mail válido.";
            mensagem.classList.add("erro");
            email.focus();
            return;
        }

        // Verifica senha
        if (senha.value === "") {
            mensagem.textContent = "Por favor, informe sua senha.";
            mensagem.classList.add("erro");
            senha.focus();
            return;
        }

        // Login válido
        mensagem.textContent = "Login realizado com sucesso!";
        mensagem.classList.add("sucesso");

    });
}


// MOSTRAR / OCULTAR SENHA

const botoesSenha = document.querySelectorAll(".mostrar-senha");

botoesSenha.forEach(function(botao) {

    botao.addEventListener("click", function() {

        const campoSenha = botao.parentElement.querySelector("input");

        if (campoSenha.type === "password") {

            campoSenha.type = "text";
            botao.textContent = "Ocultar";

        } else {

            campoSenha.type = "password";
            botao.textContent = "Mostrar";

        }

    });

});