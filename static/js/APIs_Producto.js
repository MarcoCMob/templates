const BASE_URL = 'https://erp-marcodesarrolloweb.onrender.com/api';

const tbodyProducto = document.getElementById("tbodyProducto");
const formProducto = document.getElementById('form-cat-productos');
const nombreProductoInput = document.getElementById('productoNombre');
const comboCategorias = document.getElementById('comboCategorias');
const precioProductoInput = document.getElementById('precioProducto');
const btnGuardarProducto = document.getElementById('btnGuardarProducto');

const modalConfirmar = document.getElementById("modalConfirmar");
const btnCancelarModal = document.getElementById("btnCancelarModal");
const btnAceptarModal = document.getElementById("btnAceptarModal");

const filtroOrdenProducto = document.getElementById('filtroOrdenProducto');
const filtroCategoria = document.getElementById('filtroCategoria');

let filaSeleccionadaParaEliminar = null;
let productoEditandoId = null;
let productosGlobales = [];

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


const limpiarFormularioProducto = () => {
    productoEditandoId = null;
    btnGuardarProducto.textContent = 'Guardar';
    nombreProductoInput.value = '';
    precioProductoInput.value = '';
    comboCategorias.selectedIndex = 0;
};

const seleccionarCategoriaPorNombre = (nombreCategoria) => {
    const option = Array.from(comboCategorias.options).find(
        (item) => item.textContent.trim() === nombreCategoria
    );
    if (option) {
        comboCategorias.value = option.value;
    }
};

const abrirFormularioProducto = (row) => {
    if (!row) return;
    productoEditandoId = row.dataset.id;
    btnGuardarProducto.textContent = 'Actualizar';

    const cells = row.querySelectorAll('td');
    nombreProductoInput.value = cells[0]?.textContent?.trim() || '';
    seleccionarCategoriaPorNombre(cells[1]?.textContent?.trim() || '');
    precioProductoInput.value = cells[2]?.textContent?.trim() || '';

    formProducto.classList.remove('hidden');
    nombreProductoInput.focus();
};

const actualizarFilaProducto = (producto) => {
    const row = tbodyProducto.querySelector(`tr[data-id="${producto.idProducto}"]`);
    if (!row) return;
    row.children[0].textContent = producto.nombreProducto;
    row.children[1].textContent = producto.nombreCategoria;
    row.children[2].textContent = producto.precio;
};

/* ---- Lógica de filtros ---- */

const obtenerProductosFiltrados = () => {
    const orden = filtroOrdenProducto.value;
    const catFiltro = filtroCategoria.value;

    let lista = [...productosGlobales];

    if (catFiltro) {
        lista = lista.filter(p => p.nombreCategoria === catFiltro);
    }

    if (orden === 'az') {
        lista.sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
    } else if (orden === 'za') {
        lista.sort((a, b) => b.nombreProducto.localeCompare(a.nombreProducto));
    } else if (orden === 'categoria') {
        lista.sort((a, b) => a.nombreCategoria.localeCompare(b.nombreCategoria)
            || a.nombreProducto.localeCompare(b.nombreProducto));
    }

    return lista;
};

const renderizarTablaProducto = (productos) => {
    tbodyProducto.innerHTML = "";

    productos.forEach(producto => {
        const rowTBody = document.createElement("tr");
        rowTBody.dataset.id = producto.idProducto;
        rowTBody.innerHTML = `
        <td>${producto.nombreProducto}</td>
        <td>${producto.nombreCategoria}</td>
        <td>${producto.precio}</td>
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
        tbodyProducto.appendChild(rowTBody);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
};

const aplicarFiltros = () => {
    renderizarTablaProducto(obtenerProductosFiltrados());
};

const poblarFiltroCategoria = (productos) => {
    const categorias = [...new Set(productos.map(p => p.nombreCategoria))].sort();
    // Mantener la opción "Todas" pero limpiar el resto
    filtroCategoria.innerHTML = '<option value="">Todas</option>';
    categorias.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        filtroCategoria.appendChild(opt);
    });
};

const cargarTablaProducto = async () => {
    try {
        const response = await fetch(`${BASE_URL}/catalogo/listarProductos`);
        if (!response.ok) {
            mostrarToast("Ocurrio un error", "error");
        } else {
            const data = await response.json();
            productosGlobales = data;
            poblarFiltroCategoria(data);
            aplicarFiltros();
        }
    } catch (error) {
        console.log(error);
    }
};

filtroOrdenProducto.addEventListener('change', aplicarFiltros);
filtroCategoria.addEventListener('change', aplicarFiltros);

/* ---- CRUD ---- */

const insertarProducto = async (requestProducto, idCategoria) => {
    try {
        const response = await fetch(`${BASE_URL}/catalogo/crearProducto/categoria/${idCategoria}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestProducto)
            });

        const data = await response.json();

        if (!response.ok) {
            data.mensajes.forEach(m => mostrarToast(m, "error"));
        } else {
            mostrarToast("Producto creado con éxito", "success");
            productosGlobales.push(data);
            poblarFiltroCategoria(productosGlobales);
            aplicarFiltros();
        }
    } catch (error) {
        console.log(error);
    }
};

const editarProducto = async (requestProducto, idProducto, idCategoria) => {
    try {
        const response = await fetch(`${BASE_URL}/catalogo/editarProducto/${idProducto}/categoria/${idCategoria}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestProducto)
            });

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

const eliminarProducto = async (idProducto) => {
    try {
        const response = await fetch(`${BASE_URL}/catalogo/eliminarProducto/${idProducto}`,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

        if (!response.ok) {
            mostrarToast("No se pudo eliminar el producto", "error");
            return false;
        }

        mostrarToast("Producto eliminado correctamente", "success");
        return true;
    } catch (error) {
        console.log(error);
        mostrarToast("Ocurrió un error en el servidor", "error");
        return false;
    }
};

const llenarComboCategoria = async () => {
    try {
        const combo = document.getElementById('comboCategorias');
        const response = await fetch(`${BASE_URL}/catalogo/listarCategorias`);

        if (!response.ok) {
            mostrarToast("Ocurrio un error al llenar comboCategoria", "error");
        } else {
            const data = await response.json();
            data.forEach(categoria => {
                const option = document.createElement("option");
                option.value = categoria.idCategoria;
                option.textContent = categoria.nombre;
                combo.appendChild(option);
            });
        }
    } catch (error) {
        console.log(error);
    }
};

btnGuardarProducto.addEventListener("click", async (e) => {
    e.preventDefault();

    const idCategoria = comboCategorias.value;
    if (!idCategoria) {
        mostrarToast("Debe seleccionar una categoría", "error");
        return;
    }

    const requestProducto = {
        "nombre": nombreProductoInput.value,
        "precio": Number(precioProductoInput.value)
    };

    if (productoEditandoId) {
        const data = await editarProducto(requestProducto, productoEditandoId, idCategoria);
        if (data) {
            // Actualizar en lista global
            const idx = productosGlobales.findIndex(p => p.idProducto == productoEditandoId);
            if (idx !== -1) productosGlobales[idx] = data;
            poblarFiltroCategoria(productosGlobales);
            aplicarFiltros();
            formProducto.classList.add('hidden');
            limpiarFormularioProducto();
        }
        return;
    }

    await insertarProducto(requestProducto, idCategoria);
    formProducto.classList.add('hidden');
    limpiarFormularioProducto();
});


tbodyProducto.addEventListener("click", async (e) => {
    const botonEliminar = e.target.closest(".btn-eliminar");
    const botonEditar = e.target.closest(".btn-editar");

    if (!botonEditar && !botonEliminar) return;

    const row = e.target.closest("tr");
    if (!row) return;

    e.preventDefault();

    if (botonEditar) {
        abrirFormularioProducto(row);
        return;
    }

    if (botonEliminar) {
        filaSeleccionadaParaEliminar = row;
        modalConfirmar.classList.remove("hidden");
    }
});


btnCancelarModal.addEventListener("click", () => {
    modalConfirmar.classList.add("hidden");
    filaSeleccionadaParaEliminar = null;
});


btnAceptarModal.addEventListener("click", async () => {
    if (filaSeleccionadaParaEliminar) {
        const idProducto = filaSeleccionadaParaEliminar.dataset.id;

        btnAceptarModal.disabled = true;
        btnAceptarModal.textContent = "Eliminando...";

        const eliminado = await eliminarProducto(idProducto);
        if (eliminado) {
            productosGlobales = productosGlobales.filter(p => p.idProducto != idProducto);
            poblarFiltroCategoria(productosGlobales);
            aplicarFiltros();
        }

        btnAceptarModal.disabled = false;
        btnAceptarModal.textContent = "Eliminar";
        modalConfirmar.classList.add("hidden");
        filaSeleccionadaParaEliminar = null;
    }
});


const verificarSesionActiva = async () => {
    try {
        const response = await fetch(`${BASE_URL}/usuario/sesionActiva`);
        const data = await response.json();
        if (!response.ok) return null;
        return data;
    } catch (error) {
        console.log(error);
    }
};

const cargarSecciones = (sesionActiva) => {
    if (sesionActiva.rol === "Administrador") return;

    if (sesionActiva.rol === "Mesero") {
        document.getElementById("navSeccionCaja").classList.add("hidden");
        document.getElementById("navSeccionInventario").classList.add("hidden");
        document.getElementById("navSeccionCatalogo").classList.add("hidden");
        document.getElementById("navSeccionUsuario").classList.add("hidden");
        document.getElementById("navSeccionConfiguracion").classList.add("hidden");
    }

    if (sesionActiva.rol === "Cajero") {
        document.getElementById("navSeccionInventario").classList.add("hidden");
        document.getElementById("navSeccionCatalogo").classList.add("hidden");
        document.getElementById("navSeccionUsuario").classList.add("hidden");
        document.getElementById("navSeccionConfiguracion").classList.add("hidden");
    }
};

document.getElementById("btnCerrarSesion").addEventListener("click", async (e) => {
    e.preventDefault();
    try {
        const response = await fetch(`${BASE_URL}/usuario/cerrarSesion`, { method: 'PUT' });
        if (!response.ok) {
            console.log("Ocurrio un error");
        } else {
            window.location.href = '../index.html';
        }
    } catch (error) {
        console.log(error);
    }
});

document.addEventListener("DOMContentLoaded", async (e) => {
    e.preventDefault();

    const sesionActiva = await verificarSesionActiva();

    if (sesionActiva == null) {
        window.location.href = '../index.html';
        return;
    }
    if (typeof window.poblarTopbarUsuario === 'function') {
        window.poblarTopbarUsuario(sesionActiva);
    }

    const infoUsuarioElem = document.getElementById("infoUsuario");
    const infoRolElem = document.getElementById("infoRol");
    const infoAvatarElem = document.getElementById("infoAvatar");

    if (infoUsuarioElem) infoUsuarioElem.textContent = sesionActiva.nombre;
    if (infoRolElem) infoRolElem.textContent = sesionActiva.rol;
    if (infoAvatarElem) infoAvatarElem.textContent = sesionActiva.rol.charAt(0).toUpperCase();

    cargarSecciones(sesionActiva);

    cargarTablaProducto();
    llenarComboCategoria();
});
