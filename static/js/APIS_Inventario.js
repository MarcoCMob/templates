
const BASE_URL = 'https://erp-marcodesarrolloweb.onrender.com/api';
let productosGlobales = [];

const tbodyStockActual = document.getElementById('tbody-stock-actual');
const stockActualEmpty = document.getElementById('stock-actual-empty');
const tbodyActualizarStock = document.getElementById('tbody-actualizar-stock');
const actualizarStockEmpty = document.getElementById('actualizar-stock-empty');
const actualizarStockActions = document.getElementById('actualizar-stock-actions');
const formActualizarStock = document.getElementById('form-actualizar-stock');
const btnGuardarStock = document.getElementById('btn-guardar-stock');
const btnCancelarActualizacion = document.getElementById('btn-cancelar-actualizacion');
const toastContainer = document.getElementById('toast-container');

const modalConfirmarStock = document.getElementById('modal-confirmar-stock');
const listaCambiosStock = document.getElementById('lista-cambios-stock');
const btnConfirmarCambiosStock = document.getElementById('btnConfirmarCambiosStock');
const btnCancelarCambiosStock = document.getElementById('btnCancelarCambiosStock');

// Controles de filtro – Stock Actual
const invFiltroOrden = document.getElementById('invFiltroOrden');
const invFiltroCategoria = document.getElementById('invFiltroCategoria');

// Controles de filtro – Actualizar Stock
const invActualizarFiltroOrden = document.getElementById('invActualizarFiltroOrden');
const invActualizarFiltroCategoria = document.getElementById('invActualizarFiltroCategoria');

let cambiosPendientesStock = [];

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

/* ---- Poblar filtros de categoría ---- */

const poblarFiltrosCategoriaInv = (productos) => {
  const categorias = [...new Set(productos.map(p => p.nombreCategoria).filter(Boolean))].sort();

  [invFiltroCategoria, invActualizarFiltroCategoria].forEach(sel => {
    sel.innerHTML = '<option value="">Todas</option>';
    categorias.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
  });
};

/* ---- Aplicar filtro/orden a una lista de productos ---- */

const aplicarFiltroOrden = (productos, orden, catFiltro) => {
  let lista = [...productos];

  if (catFiltro) {
    lista = lista.filter(p => p.nombreCategoria === catFiltro);
  }

  if (orden === 'az') {
    lista.sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
  } else if (orden === 'za') {
    lista.sort((a, b) => b.nombreProducto.localeCompare(a.nombreProducto));
  } else if (orden === 'categoria') {
    lista.sort((a, b) =>
      (a.nombreCategoria || '').localeCompare(b.nombreCategoria || '') ||
      a.nombreProducto.localeCompare(b.nombreProducto)
    );
  } else if (orden === 'stock-desc') {
    lista.sort((a, b) => b.stock - a.stock);
  } else if (orden === 'stock-asc') {
    lista.sort((a, b) => a.stock - b.stock);
  }

  return lista;
};

/* ---- Renderizar tabla Stock Actual ---- */

const renderizarStockActual = (productos) => {
  tbodyStockActual.innerHTML = '';

  if (productos.length === 0) {
    stockActualEmpty.classList.remove('hidden');
    return;
  }

  stockActualEmpty.classList.add('hidden');

  productos.forEach(producto => {
    const row = document.createElement('tr');
    const stockClass = producto.stock > 10 ? 'badge-green' : producto.stock > 5 ? 'badge-orange' : 'badge-red';
    row.innerHTML = `
      <td><strong>${producto.nombreProducto}</strong></td>
      <td>
        <span class="badge ${stockClass}">
          ${producto.stock} unidades
        </span>
      </td>
    `;
    tbodyStockActual.appendChild(row);
  });
};

const aplicarFiltrosStockActual = () => {
  const filtrado = aplicarFiltroOrden(
    productosGlobales,
    invFiltroOrden.value,
    invFiltroCategoria.value
  );
  renderizarStockActual(filtrado);
};

/* ---- Renderizar tabla Actualizar Stock ---- */

const renderizarActualizarStock = (productos) => {
  tbodyActualizarStock.innerHTML = '';

  if (productos.length === 0) {
    actualizarStockEmpty.classList.remove('hidden');
    actualizarStockActions.classList.add('hidden');
    return;
  }

  actualizarStockEmpty.classList.add('hidden');
  actualizarStockActions.classList.remove('hidden');

  productos.forEach(producto => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${producto.nombreProducto}</strong></td>
      <td>
        <span class="badge badge-blue">${producto.stock}</span>
      </td>
      <td>
        <input 
          type="number" 
          min="0" 
          value="${producto.stock}" 
          data-producto-id="${producto.idProducto}"
          data-producto-nombre="${producto.nombreProducto}"
          class="stock-input"
          oninput="this.value = Math.max(0, parseInt(this.value) || 0)"
        />
      </td>
    `;
    tbodyActualizarStock.appendChild(row);
  });
};

const aplicarFiltrosActualizarStock = () => {
  const filtrado = aplicarFiltroOrden(
    productosGlobales,
    invActualizarFiltroOrden.value,
    invActualizarFiltroCategoria.value
  );
  renderizarActualizarStock(filtrado);
};

/* ---- Carga de productos ---- */

const cargarProductos = async () => {
  try {
    const response = await fetch(`${BASE_URL}/catalogo/listarProductos`);

    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

    const data = await response.json();
    productosGlobales = data;

    poblarFiltrosCategoriaInv(data);
    aplicarFiltrosStockActual();
    aplicarFiltrosActualizarStock();

  } catch (error) {
    console.error('Error al cargar productos:', error);
    mostrarToast('No se pudieron cargar los productos del inventario', 'error');
  }
};

/* ---- Listeners de filtros ---- */

invFiltroOrden.addEventListener('change', aplicarFiltrosStockActual);
invFiltroCategoria.addEventListener('change', aplicarFiltrosStockActual);
invActualizarFiltroOrden.addEventListener('change', aplicarFiltrosActualizarStock);
invActualizarFiltroCategoria.addEventListener('change', aplicarFiltrosActualizarStock);

/* ---- Guardar stock ---- */

const actualizarStockProducto = async (idProducto, nuevoStock, nombreProducto) => {
  try {
    const requestBody = { stock: nuevoStock };
    const response = await fetch(`${BASE_URL}/catalogo/cantidadProducto/${idProducto}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.mensajes?.[0] || `Error al actualizar stock de ${nombreProducto}`);
    }

    console.log(`✓ Stock actualizado para ${nombreProducto}: ${nuevoStock}`);
    return true;

  } catch (error) {
    console.error(`✗ Error al actualizar ${nombreProducto}:`, error);
    throw error;
  }
};


const guardarCambiosStock = () => {
  const inputs = document.querySelectorAll('.stock-input');
  const cambios = [];

  inputs.forEach(input => {
    const idProducto = input.dataset.productoId;
    const nombreProducto = input.dataset.productoNombre;
    const nuevoStock = parseInt(input.value, 10);
    const productoOriginal = productosGlobales.find(p => p.idProducto === idProducto);

    if (productoOriginal && productoOriginal.stock !== nuevoStock) {
      cambios.push({
        idProducto,
        nombreProducto,
        stockAnterior: productoOriginal.stock,
        stockNuevo: nuevoStock
      });
    }
  });

  if (cambios.length === 0) {
    mostrarToast('No hay cambios para guardar', 'info');
    return;
  }

  cambiosPendientesStock = cambios;

  listaCambiosStock.innerHTML = '';
  cambiosPendientesStock.forEach(c => {
    const item = document.createElement("div");
    item.style.marginBottom = "8px";
    item.innerHTML = `<strong>${c.nombreProducto}:</strong> ${c.stockAnterior} &rarr; <span style="color: green; font-weight: bold;">${c.stockNuevo}</span>`;
    listaCambiosStock.appendChild(item);
  });

  modalConfirmarStock.classList.remove('hidden');
};


btnCancelarCambiosStock.addEventListener('click', () => {
  modalConfirmarStock.classList.add('hidden');
  cambiosPendientesStock = [];
});


btnConfirmarCambiosStock.addEventListener('click', async () => {
  modalConfirmarStock.classList.add('hidden');

  btnGuardarStock.disabled = true;
  const originalText = btnGuardarStock.innerHTML;
  btnGuardarStock.innerHTML = '<span class="btn-spinner"></span> Guardando...';

  try {
    const resultados = await Promise.all(
      cambiosPendientesStock.map(cambio =>
        actualizarStockProducto(cambio.idProducto, cambio.stockNuevo, cambio.nombreProducto)
          .then(() => ({ ...cambio, exito: true }))
          .catch(error => ({ ...cambio, exito: false, error: error.message }))
      )
    );

    const exitosos = resultados.filter(r => r.exito);
    const fallidos = resultados.filter(r => !r.exito);

    if (exitosos.length > 0) mostrarToast(` ${exitosos.length} producto(s) actualizado(s)`, 'success');
    if (fallidos.length > 0) mostrarToast(` ${fallidos.length} fallaron: ${fallidos.map(f => f.nombreProducto).join(', ')}`, 'error');

    await cargarProductos();

  } catch (error) {
    console.error('Error crítico al guardar cambios:', error);
    mostrarToast('Error al guardar los cambios', 'error');
  } finally {
    btnGuardarStock.disabled = false;
    btnGuardarStock.innerHTML = originalText;
    cambiosPendientesStock = [];
  }
});


const cancelarActualizacion = () => {
  cargarProductos();
  mostrarToast('Cambios cancelados', 'info');
};


formActualizarStock.addEventListener('submit', (e) => {
  e.preventDefault();
  guardarCambiosStock();
});


btnCancelarActualizacion.addEventListener('click', cancelarActualizacion);


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
    window.location.href = 'index.html';
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

  await cargarProductos();
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tab') && e.target.dataset.tab === 'inv-stock') {
    cargarProductos();
  }
});
