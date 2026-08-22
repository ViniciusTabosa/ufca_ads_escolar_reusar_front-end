// Validações do form de Perfil do Usuário

const formPerfil = document.getElementById("form-perfil");

if (formPerfil) {

    const nomePerfil = document.getElementById("inp-nome");
    const emailPerfil = document.getElementById("inp-email");
    const senhaPerfil = document.getElementById("inp-senha");
    const confirmPerfil = document.getElementById("inp-confirm");

    const dominioEmail = email => (email.value.split("@"))[1]

    formPerfil.addEventListener("submit", function (salvar) {
    salvar.preventDefault();
    
    if (nomePerfil.value.trim() === "") {
        alert("Digite o nome")
        nomePerfil.focus()
    }
    if (emailPerfil.value.trim() === "" || !emailPerfil.value.includes("@") || dominioEmail(emailPerfil) === "") {
        alert("Digite um email válido")
        emailPerfil.focus()
    }
    if (senhaPerfil.value.trim() === "") {
        alert("Digite a nova senha")
        senhaPerfil.focus()
    }
    if (confirmPerfil.value.trim() === "" || !(confirmPerfil.value === senhaPerfil.value)) {
        alert("Senhas diferentes! Repita a nova senha")
        confirmPerfil.focus()
    }

    });

}

// Validações do formulário de Cadastro

const formCadastro = document.getElementById("formCadastro");

if (formCadastro) {

    const nome = document.getElementById("nome");
    const email = document.getElementById("email");
    const senha = document.getElementById("senha");
    const confirmarSenha = document.getElementById("confirmarSenha");

    formCadastro.addEventListener("submit", function (cadastro) {

        cadastro.preventDefault();

        if (nome.value.trim() === "") {

            alert("Digite o nome");
            nome.focus();
            return;

        }

        if (email.value.trim() === "" || !email.value.includes("@") || !email.value.includes(".")) {
            alert("Digite um email válido");
            email.focus();
            return;
        }

        if (senha.value.trim() === "") {
            alert("Digite uma senha");
            senha.focus();
            return;
        }

        if (senha.value.length < 6) {
            alert("A senha deve possuir pelo menos 6 caracteres");
            senha.focus();
            return;
        }

        if (confirmarSenha.value.trim() === "" || confirmarSenha.value !== senha.value) {
            alert("Senhas diferentes! Repita a senha");
            confirmarSenha.focus();
            return;
        }

        alert("Cadastro realizado com sucesso!");

    });

}

// Validações do formulário de Login

const formLogin = document.getElementById("formLogin");

if (formLogin) {

    const emailLogin = document.getElementById("email");
    const senhaLogin = document.getElementById("senha");

    formLogin.addEventListener("submit", function (login) {

        login.preventDefault();

        if (emailLogin.value.trim() === "" || !emailLogin.value.includes("@") || !emailLogin.value.includes(".")) {
            alert("Digite um email válido");
            emailLogin.focus();
            return;
        }

        if (senhaLogin.value.trim() === "") {
            alert("Digite sua senha");
            senhaLogin.focus();
            return;
        }

        if (senhaLogin.value.length < 6) {
            alert("Senha incorreta. A senha foi cadastrada com pelo menos 6 caracteres");
            senhaLogin.focus();
            return;
        }

        alert("Login realizado com sucesso!");

    });

}

// Interação: Mostrar / Ocultar Senha

const botoesSenha =
    document.querySelectorAll(".mostrar-senha");

botoesSenha.forEach(function (botao) {

    botao.addEventListener("click", function () {

        const campoSenha =
            botao.parentElement.querySelector("input");

        if (campoSenha.type === "password") {

            campoSenha.type = "text";
            botao.textContent = "Ocultar";

        } else {

            campoSenha.type = "password";
            botao.textContent = "Mostrar";

        }
    });
});

