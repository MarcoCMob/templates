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

const tbodyUsuario = document.getElementById('tbodyUsuario');

const cargarTablaUsuarios = async () => {
    try {
        const response = await fetch(`${BASE_URL}/usuario/listarUsuarios`);
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestUsuario)
        });
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
    const txtUsuario        = document.getElementById('txtUsuario');
    const txtContrasena     = document.getElementById('txtContrasena');
    const comboRol          = document.getElementById('comboRol');

    const requestUsuario = {
        nombre: txtNombreCompleto.value.trim(),
        usuario:         txtUsuario.value.trim(),
        contrasena:     txtContrasena.value,
        rol:            comboRol.value
    };

    await crearUsuario(requestUsuario);

    txtNombreCompleto.value = '';
    txtUsuario.value        = '';
    txtContrasena.value     = '';
    comboRol.selectedIndex  = 0;
});

const verificarSesionActiva = async () => {
    try {
        const response = await fetch(`${BASE_URL}/usuario/sesionActiva`);
        const data = await response.json();
        return response.ok ? data : null;
    } catch (error) {
        console.log(error);
        return null;
    }
};

const cargarSecciones = (sesionActiva) => {
    if (sesionActiva.rol === 'Administrador') return;
    if (sesionActiva.rol === 'Mesero') {
        ['navSeccionCaja', 'navSeccionInventario', 'navSeccionCatalogo',
         'navSeccionUsuario', 'navSeccionConfiguracion'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }
    if (sesionActiva.rol === 'Cajero') {
        ['navSeccionInventario', 'navSeccionCatalogo',
         'navSeccionUsuario', 'navSeccionConfiguracion'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }
};

document.getElementById("btnCerrarSesion").addEventListener("click", async (e) => {
    e.preventDefault();

    try {

        const response = await fetch(`http://localhost:8083/api/usuario/cerrarSesion`, {
            method: 'PUT'
        });

        if (!response.ok) {
            console.log("Ocurrio un error");
        } else {
            window.location.href = 'index.html';
        }

    } catch (error) {
        console.log(error);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const sesionActiva = await verificarSesionActiva();
    if (sesionActiva == null) {
        window.location.href = 'index.html';
        return;
    }
    if (typeof window.poblarTopbarUsuario === 'function') {
        window.poblarTopbarUsuario(sesionActiva);
    }
    cargarSecciones(sesionActiva);
    await cargarTablaUsuarios();
});
