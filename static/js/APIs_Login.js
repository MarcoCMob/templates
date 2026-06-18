
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

    const response = await fetch(`${BASE_URL}/usuario/autenticar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestUsuario)
    });

    if (!response.ok) {
      const data = await response.json();
      data.mensajes.forEach(m => {
        mostrarToast(m, "error");
      });
    } else {
      window.location.href = 'venta.html';
    }

  } catch (error) {
    console.log(error);
  }

}


const btnIngresar = document.getElementById("btnIngresar");
btnIngresar.addEventListener("click", (e) => {
  e.preventDefault();

  const txtUsuario = document.getElementById("txtUsuario");
  const txtContraseña = document.getElementById("txtContraseña");

  const requestUsuario = {
    "usuario": txtUsuario.value,
    "contrasena": txtContraseña.value
  }

  autenticarUsuario(requestUsuario);

});

const initLogin = () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

document.addEventListener('DOMContentLoaded', initLogin);



