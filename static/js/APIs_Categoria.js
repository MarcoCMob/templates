const BASE_URL = 'https://erp-marcodesarrolloweb.onrender.com/api';

const token = localStorage.getItem("jwtToken");

const tbodyCategoria = document.getElementById("tbodyCategoria");
const formCategoria = document.getElementById("form-cat-categorias");
const txtNombreCategoria = document.getElementById("txtNombreCategoria");
const btnGuardarCategoria = document.getElementById("btnGuardarCategoria");

const modalConfirmar = document.getElementById("modalConfirmar");
const btnCancelarModal = document.getElementById("btnCancelarModal");
const btnAceptarModal = document.getElementById("btnAceptarModal");

const filtroOrdenCategoria = document.getElementById('filtroOrdenCategoria');

let filaCategoriaParaEliminar = null;
let categoriaEditandoId = null;
let categoriasGlobales = [];

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


const limpiarFormularioCategoria = () => {
    categoriaEditandoId = null;
    btnGuardarCategoria.textContent = "Guardar";
    txtNombreCategoria.value = "";
};

const abrirFormularioCategoria = (row) => {
    if (!row) return;
    categoriaEditandoId = row.dataset.id;
    txtNombreCategoria.value = row.children[0]?.textContent?.trim() || "";
    btnGuardarCategoria.textContent = "Actualizar";
    formCategoria.classList.remove('hidden');
    txtNombreCategoria.focus();
};

const actualizarFilaCategoria = (categoria) => {
    const row = tbodyCategoria.querySelector(`tr[data-id="${categoria.idCategoria}"]`);
    if (!row) return;
    row.children[0].textContent = categoria.nombre;
    row.children[1].textContent = categoria.productos;
};

/* ---- Lógica de filtros ---- */

const obtenerCategoriasFiltradas = () => {
    const orden = filtroOrdenCategoria.value;
    let lista = [...categoriasGlobales];

    if (orden === 'az') {
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (orden === 'za') {
        lista.sort((a, b) => b.nombre.localeCompare(a.nombre));
    }

    return lista;
};

const renderizarTablaCategoria = (categorias) => {
    tbodyCategoria.innerHTML = "";
    categorias.forEach(categoria => {
        const rowTBody = document.createElement("tr");
        rowTBody.dataset.id = categoria.idCategoria;
        rowTBody.innerHTML = `
        <td>${categoria.nombre}</td>
        <td>${categoria.productos}</td>
        <td>
            <div class="table-actions">
                <button class="btn btn-action btn-editar" type="button">
                    <i data-lucide="pencil"></i>
                </button>
                <button class="btn btn-action btn-eliminar" type="button">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </td>
    `;
        tbodyCategoria.appendChild(rowTBody);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

const aplicarFiltros = () => {
    renderizarTablaCategoria(obtenerCategoriasFiltradas());
};

filtroOrdenCategoria.addEventListener('change', aplicarFiltros);


const verificarAutenticacion = async (response) => {
    if (response.status === 401 || response.status === 403) {
        await cerrarSesion();
        return false;
    }
    return true;
};

const cargarTablaCategoria = async () => {
    try {
        const response = await fetch(`${BASE_URL}/catalogo/listarCategorias`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!(await verificarAutenticacion(response))) return;

        if (!response.ok) {
            mostrarToast("Ocurrio un error", "error");
        } else {
            const data = await response.json();
            categoriasGlobales = data;
            aplicarFiltros();
        }
    } catch (error) {
        console.log(error);
    }
};

/* ---- CRUD ---- */

const insertarCategoria = async (requestCategoria) => {
    try {
        const response = await fetch(`${BASE_URL}/catalogo/crearCategoria`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(requestCategoria)
        });

        if (!(await verificarAutenticacion(response))) return;

        const data = await response.json();

        if (!response.ok) {
            data.mensajes.forEach(m => mostrarToast(m, "error"));
        } else {
            mostrarToast("Categoria creado con éxito", "success");
            categoriasGlobales.push(data);
            aplicarFiltros();
        }
    } catch (error) {
        console.log(error);
    }
};

const editarCategoria = async (requestCategoria, idCategoria) => {
    try {
        const response = await fetch(`${BASE_URL}/catalogo/editarCategoria/${idCategoria}`, {
            method: "PUT",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(requestCategoria)
        });

        if (!(await verificarAutenticacion(response))) return null;

        const data = await response.json();

        if (!response.ok) {
            data.mensajes.forEach(m => mostrarToast(m, "error"));
            return null;
        }

        return data;
    } catch (error) {
        console.log(error);
        mostrarToast("Ocurrió un error en el servidor", "error");
        return null;
    }
};

const eliminarCategoria = async (idCategoria) => {
    try {
        const URL = `${BASE_URL}/catalogo/eliminarCategoria/${idCategoria}`;
        const response = await fetch(URL, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });

        if (!(await verificarAutenticacion(response))) return false;

        if (!response.ok) {
            mostrarToast("No se pudo eliminar la categoría", "error");
            return false;
        }

        mostrarToast("Categoría eliminada correctamente", "success");
        return true;
    } catch (error) {
        console.error("Error al conectar con la API:", error);
        mostrarToast("Ocurrió un error en el servidor", "error");
        return false;
    }
};


tbodyCategoria.addEventListener("click", async (e) => {
    const botonEliminar = e.target.closest(".btn-eliminar");
    const botonEditar = e.target.closest(".btn-editar");

    if (!botonEditar && !botonEliminar) return;

    const row = e.target.closest("tr");
    if (!row) return;

    e.preventDefault();

    if (botonEditar) {
        abrirFormularioCategoria(row);
        return;
    }

    if (botonEliminar) {
        filaCategoriaParaEliminar = row;
        modalConfirmar.classList.remove("hidden");
    }
});


btnCancelarModal.addEventListener("click", () => {
    modalConfirmar.classList.add("hidden");
    filaCategoriaParaEliminar = null;
});


btnAceptarModal.addEventListener("click", async () => {
    if (filaCategoriaParaEliminar) {
        const idCategoria = filaCategoriaParaEliminar.dataset.id;

        btnAceptarModal.disabled = true;
        btnAceptarModal.textContent = "Eliminando...";

        const eliminado = await eliminarCategoria(idCategoria);
        if (eliminado) {
            categoriasGlobales = categoriasGlobales.filter(c => c.idCategoria != idCategoria);
            aplicarFiltros();
        }

        btnAceptarModal.disabled = false;
        btnAceptarModal.textContent = "Eliminar";
        modalConfirmar.classList.add("hidden");
        filaCategoriaParaEliminar = null;
    }
});

btnGuardarCategoria.addEventListener("click", async (e) => {
    e.preventDefault();

    const requestCategoria = { "nombre": txtNombreCategoria.value };

    if (categoriaEditandoId) {
        const data = await editarCategoria(requestCategoria, categoriaEditandoId);
        if (data) {
            const idx = categoriasGlobales.findIndex(c => c.idCategoria == categoriaEditandoId);
            if (idx !== -1) categoriasGlobales[idx] = data;
            aplicarFiltros();
            formCategoria.classList.add('hidden');
            limpiarFormularioCategoria();
        }
        return;
    }

    await insertarCategoria(requestCategoria);
    formCategoria.classList.add('hidden');
    limpiarFormularioCategoria();
});

const btnNuevaCategoria = document.querySelector('[data-action="open-form"][data-target="cat-categorias"]');
if (btnNuevaCategoria) {
    btnNuevaCategoria.addEventListener('click', () => {
        limpiarFormularioCategoria();
    });
}

const btnCancelarCategoria = formCategoria?.querySelector('[data-action="cancel-form"]');
if (btnCancelarCategoria) {
    btnCancelarCategoria.addEventListener('click', () => {
        limpiarFormularioCategoria();
    });
}


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
        window.location.href = '../index.html';
    }
}

const obtenerPayload = (token) => {

    try {

        return JSON.parse(atob(token.split('.')[1]));

    } catch (error) {

        localStorage.removeItem('jwtToken');
        window.location.href = '../index.html';
        return;

    }

};

document.addEventListener("DOMContentLoaded", async (e) => {
    e.preventDefault();

    if (!token) {
        window.location.href = '../index.html';
        return;
    }

    const payload = obtenerPayload(token);
    if (!payload) return;

    if (typeof window.poblarTopbarUsuario === 'function') {
        window.poblarTopbarUsuario(payload);
    }

    cargarSecciones(payload);

    await cargarTablaCategoria();
});
