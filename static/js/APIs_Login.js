
const BASE_URL = 'https://erp-marcodesarrolloweb.onrender.com/api';

const toastContainer = document.getElementById('toast-container');
const mostrarToast = (mensaje, tipo = 'info') => {
  const toast = document.createElement('div');

  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hide');

    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

const autenticarUsuario = async (requestUsuario) => {

  try {

    const response = await fetch(`${BASE_URL}/auth/iniciarSesion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestUsuario)
    });

    const data = await response.json();
    
    if(response.status === 401){
      mostrarToast("Acceso denegado", "error");
      return;
    }

    if(response.status === 403){
      mostrarToast("Permisos insuficientes", "error");
      return;
    }

    if (!response.ok) {
      data.mensajes.forEach(m => {
        mostrarToast(m, "error");
      });
      return;
    }

    localStorage.setItem('jwtToken', data.token);
    window.location.href = 'venta.html';

  } catch (error) {
    console.log(error);
  }

}

const btnIngresar = document.getElementById("btnIngresar");
btnIngresar.addEventListener("click", async (e) => {
  e.preventDefault();

  btnIngresar.disabled = true;
  btnIngresar.textContent = "Validando credenciales...";

  const txtUsuario = document.getElementById("txtUsuario");
  const txtContraseña = document.getElementById("txtContraseña");

  const requestUsuario = {
    "usuario": txtUsuario.value,
    "contrasena": txtContraseña.value
  }

  await autenticarUsuario(requestUsuario);

  btnIngresar.textContent = "Ingresar";
  btnIngresar.disabled = false;

});

document.addEventListener('DOMContentLoaded', () => {

  if (window.lucide) {
    window.lucide.createIcons();
  }

  localStorage.removeItem("jwtToken");

});



