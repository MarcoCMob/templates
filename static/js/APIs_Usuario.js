const BASE_URL = 'https://erp-marcodesarrolloweb.onrender.com/api';

const token = localStorage.getItem("jwtToken");

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

const tbodyUsuario = document.getElementById('tbodyUsuario');

const verificarAutenticacion = async (response) => {
    if (response.status === 401 || response.status === 403) {
        await cerrarSesion();
        return false;
    }
    return true;
};

const cargarTablaUsuarios = async () => {
    try {
        const response = await fetch(`${BASE_URL}/usuario/listarUsuarios`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!(await verificarAutenticacion(response))) return;

        if (!response.ok) {
            mostrarToast('Ocurrió un error al cargar usuarios', 'error');
            return;
        }
        const data = await response.json();
        tbodyUsuario.innerHTML = '';
        data.forEach(usuario => {
            const rowTBody = document.createElement('tr');
            rowTBody.innerHTML = `
                <td>${usuario.nombre || '-'}</td>
                <td>${usuario.usuario}</td>
                <td><span class="badge">${usuario.rol}</span></td>
            `;
            tbodyUsuario.appendChild(rowTBody);
        });
    } catch (error) {
        console.log(error);
    }
};

const crearUsuario = async (requestUsuario) => {
    try {
        const response = await fetch(`${BASE_URL}/usuario/crearUsuario`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(requestUsuario)
        });

        if (!(await verificarAutenticacion(response))) return;

        const data = await response.json();
        if (!response.ok) {
            data.mensajes.forEach(m => mostrarToast(m, 'error'));
        } else {
            mostrarToast('Usuario creado con éxito', 'success');
            const rowTBody = document.createElement('tr');
            rowTBody.innerHTML = `
                <td>${data.nombre || '-'}</td>
                <td>${data.usuario}</td>
                <td><span class="badge">${data.rol}</span></td>
            `;
            tbodyUsuario.appendChild(rowTBody);
        }
    } catch (error) {
        console.log(error);
    }
};

const btnGuardarUsuario = document.getElementById('btnGuardarUsuario');
btnGuardarUsuario.addEventListener('click', async () => {
    const txtNombreCompleto = document.getElementById('txtNombreCompleto');
    const txtUsuario = document.getElementById('txtUsuario');
    const txtContrasena = document.getElementById('txtContrasena');
    const comboRol = document.getElementById('comboRol');

    const requestUsuario = {
        nombre: txtNombreCompleto.value.trim(),
        usuario: txtUsuario.value.trim(),
        contrasena: txtContrasena.value,
        rol: comboRol.value
    };

    await crearUsuario(requestUsuario);

    txtNombreCompleto.value = '';
    txtUsuario.value = '';
    txtContrasena.value = '';
    comboRol.selectedIndex = 0;
});


const cargarSecciones = (payload) => {

    if (payload.rol === "ADMIN") {
        return;
    }

    if (payload.rol === "MESERO") {
        document.getElementById("navSeccionCaja").classList.add("hidden");
        document.getElementById("navSeccionInventario").classList.add("hidden");
        document.getElementById("navSeccionCatalogo").classList.add("hidden");
        document.getElementById("navSeccionUsuario").classList.add("hidden");
        document.getElementById("navSeccionConfiguracion").classList.add("hidden");

        // Ocultar tabs de Para Llevar y Delivery: el mesero solo atiende salon
        document.getElementById("btnTabLlevar").classList.add("hidden");
        document.getElementById("btnTabDelivery").classList.add("hidden");
        document.getElementById("btnTabEspera").classList.add("hidden");
        document.getElementById("btnAgregarMesa").classList.add("hidden");
        document.getElementById("btnEliminarMesa").classList.add("hidden");
    }

    if (payload.rol === "CAJERO") {
        document.getElementById("navSeccionInventario").classList.add("hidden");
        document.getElementById("navSeccionCatalogo").classList.add("hidden");
        document.getElementById("navSeccionUsuario").classList.add("hidden");
        document.getElementById("navSeccionConfiguracion").classList.add("hidden");
        document.getElementById("btnAgregarMesa").classList.add("hidden");
        document.getElementById("btnEliminarMesa").classList.add("hidden");
    }

}

btnCerrarSesion.addEventListener("click", async () => {
    btnCerrarSesion.disabled = true;
    await cerrarSesion();
});

const cerrarSesion = async () => {
    try {

        const response = await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

    } catch (error) {
        console.log(error);
    } finally {
        localStorage.removeItem('jwtToken');
        window.location.href = 'index.html';
    }
}

const obtenerPayload = (token) => {

    try {

        return JSON.parse(atob(token.split('.')[1]));

    } catch (error) {

        localStorage.removeItem('jwtToken');
        window.location.href = 'index.html';
        return;

    }

};

document.addEventListener('DOMContentLoaded', async (e) => {
    e.preventDefault();

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const payload = obtenerPayload(token);
    if (!payload) return;

    if (typeof window.poblarTopbarUsuario === 'function') {
        window.poblarTopbarUsuario(payload);
    }

    cargarSecciones(payload);
    await cargarTablaUsuarios();
});
