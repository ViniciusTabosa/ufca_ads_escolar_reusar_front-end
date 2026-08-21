// Validações do form de Perfil do Usuário

const formPerfil = document.getElementById("form-perfil");

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
