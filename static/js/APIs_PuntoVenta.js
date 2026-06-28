const BASE_URL = 'https://erp-marcodesarrolloweb.onrender.com/api';

const detallesPedidoLlevar = new Map();
const detallesPedidoDelivery = new Map();
const detallesPedidoLocal = new Map();
const productosMap = new Map();

let tipoPedidoActivo = "LOCAL";
let MesaActiva = null;
let rolUsuarioActivo = null; //variable para saber el rol de usuario sin volver a consultar la api

// Datos de la última boleta generada (para el PDF)
let ultimaBoleta = null;
// ──────────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────────
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
// ──────────────────────────────────────────────
// PDF BOLETA con jsPDF
// ──────────────────────────────────────────────
const generarPDFBoleta = (boleta) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' });

    const ancho = 80;
    const margen = 5;
    const centro = ancho / 2;
    let y = 8;

    const linea = () => {
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(margen, y, ancho - margen, y);
        y += 4;
    };

    // ── Encabezado ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Lo Esencial Broastería', centro, y, { align: 'center' });
    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('RUC: -', centro, y, { align: 'center' });
    y += 4;
    doc.text('Av. Principal 123, Lima - Perú', centro, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BOLETA DE VENTA', centro, y, { align: 'center' });
    y += 4;
    linea();

    // ── Datos pedido ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const idCorto = boleta.idPedido
        ? boleta.idPedido.toString().substring(0, 8).toUpperCase()
        : 'N/A';

    const now = new Date();
    const fecha = boleta.fecha || now.toLocaleDateString('es-PE');
    const hora = boleta.hora
        ? boleta.hora.substring(0, 5)
        : now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const tipoPedidoMap = { LOCAL: 'Salón/Mesa', LLEVAR: 'Para Llevar', DELIVERY: 'Delivery' };
    const tipoPedidoLabel = tipoPedidoMap[boleta.tipoPedido] || boleta.tipoPedido || '-';
    const metodoPago = boleta.metodoPago || '-';

    doc.text(`N° Pedido : ${idCorto}`, margen, y); y += 4;
    doc.text(`Fecha     : ${fecha}`, margen, y); y += 4;
    doc.text(`Hora      : ${hora}`, margen, y); y += 4;
    doc.text(`Cliente   : Cliente Genérico`, margen, y); y += 4;
    doc.text(`Modalidad : ${tipoPedidoLabel}`, margen, y); y += 4;
    linea();

    // ── Encabezado tabla ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Producto', margen, y);
    doc.text('Cant', 48, y, { align: 'center' });
    doc.text('P.Unit', 60, y, { align: 'right' });
    doc.text('Total', ancho - margen, y, { align: 'right' });
    y += 3;
    linea();

    // ── Ítems ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const detalles = boleta.detalles || [];
    detalles.forEach(d => {
        const nombreProducto = d.nombreProducto || '-';
        // Recortar nombre si es muy largo
        const nombreCorto = nombreProducto.length > 20
            ? nombreProducto.substring(0, 19) + '.'
            : nombreProducto;
        doc.text(nombreCorto, margen, y);
        doc.text(String(d.cantidad), 48, y, { align: 'center' });
        doc.text(formatoMoneda(d.precioUnitario), 60, y, { align: 'right' });
        doc.text(formatoMoneda(d.total), ancho - margen, y, { align: 'right' });
        y += 5;
    });

    linea();

    // ── Total ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL:', margen, y);
    doc.text(formatoMoneda(boleta.total), ancho - margen, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Método de pago: ${metodoPago}`, margen, y);
    y += 6;
    if (boleta.efectivoRecibido != null) {
        doc.text(`Efectivo recibido: ${formatoMoneda(boleta.efectivoRecibido)}`, margen, y);
        y += 4;
        doc.text(`Vuelto: ${formatoMoneda(boleta.vuelto != null ? boleta.vuelto : 0)}`, margen, y);
        y += 6;
    }
    linea();

    // ── Pie ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('¡Gracias por su visita!', centro, y, { align: 'center' });
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('VUELVA PRONTO :) !', centro, y, { align: 'center' });

    doc.save(`boleta_${idCorto}.pdf`);
};

// ──────────────────────────────────────────────
// MODAL BOLETA
// ──────────────────────────────────────────────
const modalBoleta = document.getElementById('modal-boleta');
const btnDescargarBoleta = document.getElementById('btnDescargarBoleta');
const btnCerrarBoleta = document.getElementById('btnCerrarBoleta');

const mostrarModalBoleta = (boleta) => {
    ultimaBoleta = boleta;
    if (modalBoleta) modalBoleta.classList.remove('hidden');
};

if (btnDescargarBoleta) {
    btnDescargarBoleta.addEventListener('click', () => {
        if (ultimaBoleta) generarPDFBoleta(ultimaBoleta);
    });
}

if (btnCerrarBoleta) {
    btnCerrarBoleta.addEventListener('click', () => {
        if (modalBoleta) modalBoleta.classList.add('hidden');
    });
}


const formatoMoneda = (valor) => `S/ ${Number(valor).toFixed(2)}`;
// ──────────────────────────────────────────────
// API CALLS
// ──────────────────────────────────────────────
const obtenerCajaAbierta = async () => {

    try {

        const response = await fetch(`${BASE_URL}/caja/obtenerCajaAbierta`);
        const data = await response.json();

        if (!response.ok) {
            return null;
        }

        return data;


    } catch (error) {
        console.log(error);
    }

}


const cargarMesas = async () => {
    try {
        const response = await fetch(`${BASE_URL}/venta/listarMesas`);

        if (!response.ok) {
            console.log("Ocurrio un error");
        } else {
            const data = await response.json();

            // Si no hay mesas, se oculta para todos
            if (data.length == 0) {
                btnEliminarMesa.classList.add("hidden");
                return;
            }

            //Solo mostrar si NO es Mesero ni Cajero (es decir, si es Administrador)
            if (rolUsuarioActivo === "Mesero" || rolUsuarioActivo === "Cajero") {
                btnEliminarMesa.classList.add("hidden");
            } else {
                btnEliminarMesa.classList.remove("hidden");
            }

            const mesaGridVenta = document.getElementById("mesa-grid");
            if (!mesaGridVenta) return;
            mesaGridVenta.innerHTML = "";

            data.forEach((mesa) => {
                const botonMesa = document.createElement("button");
                const estadoMesa = mesa.estado === "OCUPADO" ? "OCUPADO" : "LIBRE";

                botonMesa.id = "btnMesa";
                botonMesa.type = "button";
                botonMesa.classList.add(`table-card`);
                botonMesa.classList.add(`${mesa.estado === "OCUPADO" ? "status-occupied" : "status-free"}`);
                botonMesa.dataset.mesa = mesa.numero;
                botonMesa.dataset.estado = estadoMesa;
                botonMesa.dataset.idMesa = mesa.idMesa;

                botonMesa.innerHTML = `
                <span class="table-number">${mesa.numero}</span>
                <span>${estadoMesa}</span>
                `;

                 detallesPedidoLocal.set(String(mesa.idMesa), new Map());
                 mesaGridVenta.appendChild(botonMesa);

             });
        }
    } catch (error) {
        console.log(error);
    }
};

const insertarMesaBackend = async () => {
    try {
        const response = await fetch(`${BASE_URL}/venta/insertarMesa`, {
            method: "POST", // Asumiendo que tu @PostMapping en Spring Boot no requiere body
            headers: { "Content-Type": "application/json" }
        });


        if (!response.ok) {
            const data = await response.json();
            (data.mensajes || []).forEach(m => mostrarToast(m, "error"));
            return false;
        }

        return true;
    } catch (error) {
        console.log(error);
        mostrarToast("Ocurrió un error al intentar agregar la mesa", "error");
        return false;
    }
};

const eliminarMesaBackend = async () => {
    try {
        const response = await fetch(`${BASE_URL}/venta/eliminarMesa`, {
            method: "DELETE", // Asumiendo @DeleteMapping en tu controlador
            headers: { "Content-Type": "application/json" }
        });


        if (!response.ok) {
            const data = await response.json();
            (data.mensajes || []).forEach(m => mostrarToast(m, "error"));
            return false;
        }

        return true;
    } catch (error) {
        console.log(error);
        mostrarToast("Ocurrió un error al intentar eliminar la mesa", "error");
        return false;
    }
};

const cargarProductos = async () => {
    try {
        const response = await fetch(`${BASE_URL}/catalogo/listarProductos`);

        if (!response.ok) {
            console.log("Ocurrio un error");
        } else {
            const data = await response.json();

            const comboProductoPedido = document.getElementById("comboProductoPedido");
            const comboProductoMesa = document.getElementById("comboProductoMesa"); // Capturamos el nuevo select

            const optionDefault = `<option value="" disabled selected>Seleccione un producto</option>`;
            comboProductoPedido.innerHTML = optionDefault;
            if (comboProductoMesa) comboProductoMesa.innerHTML = optionDefault;

            data.forEach((producto) => {
                const option = document.createElement("option");
                option.value = producto.idProducto;
                option.textContent = producto.nombreProducto;

                productosMap.set(producto.idProducto, producto);

                comboProductoPedido.appendChild(option.cloneNode(true));
                if (comboProductoMesa) comboProductoMesa.appendChild(option);
            });
        }
    } catch (error) {
        console.log(error);
    }
};


const validarDetallePedido = async (requestDetalle) => {
    try {
        const response = await fetch(`${BASE_URL}/venta/validarDetallePedido`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestDetalle)
        });


        if (!response.ok) {
            const data = await response.json();
            data.mensajes.forEach(m => {
                mostrarToast(m, "error");
            });
            return false;
        }

        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
};

// cobrarPedido ahora devuelve ResponseBoleta
const cobrarPedido = async (requestPedido) => {
    try {
        const response = await fetch(`${BASE_URL}/venta/cobrarPedido`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPedido)
        });
        const data = await response.json();
        if (!response.ok) {
            (data.mensajes || []).forEach(m => mostrarToast(m, "error"));
            return null;
        }
        mostrarToast(data.mensaje || "Cobrado exitosamente", "success");
        return data;        // ResponseBoleta
    } catch (error) {
        mostrarToast("Ocurrió un error inesperado", "error");
        return null;
    }
};


const ocuparMesa = async (requestPedido, idMesa) => {
    try {
        const response = await fetch(`${BASE_URL}/venta/ocuparMesa/${idMesa}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPedido)
        });

        if (!response.ok) {
            const data = await response.json().catch(() => null);
            if (data && data.mensajes) {
                data.mensajes.forEach(m => mostrarToast(m, "error"));
            } else {
                mostrarToast("Error al ocupar la mesa", "error");
            }
            return false;
        }

        return true;

    } catch (error) {
        mostrarToast("Ocurrió un error inesperado", "error");
        return false;
    }
};

// cobrarMesa ahora devuelve ResponseBoleta
const cobrarMesa = async (idMesa, metodoPago) => {
    try {
        const response = await fetch(`${BASE_URL}/venta/cobrarMesa/${idMesa}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metodoPago })
        });
        const data = await response.json();
        if (!response.ok) {
            (data.mensajes || []).forEach(m => mostrarToast(m, "error"));
            return null;
        }
        mostrarToast(data.mensaje || "Cobrado exitosamente", "success");
        return data;        // ResponseBoleta
    } catch (error) {
        mostrarToast("Ocurrió un error inesperado", "error");
        return null;
    }
};


const agregarDetalleAlaMesa = async (idMesa, requestDetallePedido) => {
    try {
        const response = await fetch(`${BASE_URL}/venta/agregarDetallePedidoAlaMesa/${idMesa}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestDetallePedido)
        });
        if (!response.ok) {
            data.mensajes.forEach(m => {
                mostrarToast(m, "error");
            });
            return false;
        }
        return true;
    } catch (error) {
        mostrarToast("Ocurrio un error inesperado", "error");
        return false;
    }
};

const obtenerDetallesPedidoPorMesa = async (idMesa) => {
    try {
        const response = await fetch(`${BASE_URL}/venta/detallePedidosPorMesa/${idMesa}`);

        if (!response.ok) {
            mostrarToast("Error al obtener los detalles de la mesa", "error");
            return [];
        }

        return await response.json();
    } catch (error) {
        console.log(error);
        mostrarToast("Error de conexión", "error");
        return [];
    }
};
// ──────────────────────────────────────────────
// RENDER DETALLES
// ──────────────────────────────────────────────
const renderDetallesPedido = () => {
    const detalles = tipoPedidoActivo === "DELIVERY" ? detallesPedidoDelivery : detallesPedidoLlevar;

    const tbodyPedidosAgregados = document.getElementById("tbodyPedidosAgregados");
    const txtTotalPedido = document.getElementById("txtTotalPedido");
    const tfootTotalPedido = document.getElementById("tfootTotalPedido");

    tbodyPedidosAgregados.innerHTML = "";
    let total = 0;

    detalles.forEach((detalle) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${detalle.nombreProducto}</td>
            <td>${detalle.cantidad}</td>
            <td>${formatoMoneda(detalle.precioUnitario)}</td>
            <td>${formatoMoneda(detalle.total)}</td>
        `;

        total += detalle.total;
        tbodyPedidosAgregados.appendChild(fila);
    });

    txtTotalPedido.textContent = formatoMoneda(total);

    const btnEnviarAEsperaRef = document.getElementById("btnEnviarAEspera");
    if (detalles.size > 0) {
        tfootTotalPedido.classList.remove("hidden");
        btnRegistrarPagoPedido.classList.remove("hidden");
        if (btnEnviarAEsperaRef) btnEnviarAEsperaRef.classList.remove("hidden");
    } else {
        tfootTotalPedido.classList.add("hidden");
        btnRegistrarPagoPedido.classList.add("hidden");
        if (btnEnviarAEsperaRef) btnEnviarAEsperaRef.classList.add("hidden");
    }
};


const renderDetallesMesa = () => {
    const tbodyPedidosMesaAgregados = document.getElementById("tbodyPedidosMesaAgregados");
    const txtTotalPedidoMesa = document.getElementById("txtTotalPedidoMesa");
    const tfootTotalPedidoMesa = document.getElementById("tfootTotalPedidoMesa");

    tbodyPedidosMesaAgregados.innerHTML = "";

    if (!MesaActiva) {
        txtTotalPedidoMesa.textContent = formatoMoneda(0);
        tfootTotalPedidoMesa.classList.add("hidden");
        return;
    }

    const mapDetallesMesa = detallesPedidoLocal.get(MesaActiva.dataset.idMesa) || new Map();
    let total = 0;

    mapDetallesMesa.forEach((detalle) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${detalle.nombreProducto}</td>
            <td>${detalle.cantidad}</td>
            <td>${formatoMoneda(detalle.precioUnitario)}</td>
            <td>${formatoMoneda(detalle.total)}</td>
        `;
        total += detalle.total;
        tbodyPedidosMesaAgregados.appendChild(fila);
    });

    txtTotalPedidoMesa.textContent = formatoMoneda(total);

    if (mapDetallesMesa.size > 0) {
        tfootTotalPedidoMesa.classList.remove("hidden");
    } else {
        tfootTotalPedidoMesa.classList.add("hidden");
    }

    // Sincronizar el botón btnOcuparMesa según si hay pedidos y el estado de la mesa
    const btnOcuparMesa = document.getElementById("btnOcuparMesa");
    if (btnOcuparMesa) {
        if (mapDetallesMesa.size > 0) {
            btnOcuparMesa.classList.remove("hidden");
            if (MesaActiva.dataset.estado === "OCUPADO") {
                btnOcuparMesa.textContent = "Actualizar pedido";
            } else {
                btnOcuparMesa.textContent = "Marcar mesa ocupada";
            }
        } else {
            btnOcuparMesa.classList.add("hidden");
        }
    }
};


const btnAgregarMesa = document.getElementById("btnAgregarMesa");

btnAgregarMesa.addEventListener("click", async (e) => {
    e.preventDefault();

    btnAgregarMesa.disabled = true;
    const contenidoOriginal = btnAgregarMesa.innerHTML;
    btnAgregarMesa.innerHTML = '<span class="btn-spinner"></span> Agregando...';

    const exito = await insertarMesaBackend();

    if (exito) {
        await cargarMesas();
    }

    btnAgregarMesa.innerHTML = contenidoOriginal;
    btnAgregarMesa.disabled = false;
});



const btnEliminarMesa = document.getElementById("btnEliminarMesa");

btnEliminarMesa.addEventListener("click", async (e) => {
    e.preventDefault();

    btnEliminarMesa.disabled = true;
    const contenidoOriginal = btnEliminarMesa.innerHTML;
    btnEliminarMesa.innerHTML = '<span class="btn-spinner"></span> Eliminando...';

    const exito = await eliminarMesaBackend();

    if (exito) {
        await cargarMesas();
    }

    btnEliminarMesa.innerHTML = contenidoOriginal;
    btnEliminarMesa.disabled = false;
});

// ──────────────────────────────────────────────
// MODAL AGREGAR PEDIDO (LLEVAR / DELIVERY / LOCAL)
// ──────────────────────────────────────────────
const modalAgregarPedido = document.getElementById('modal-agregar-pedido');
const btnAbrirModalAgregarPedido = document.getElementById('btnAbrirModalAgregarPedido');
const btnCerrarModalAgregarPedido = document.getElementById('btnCerrarModalAgregarPedido');
const btnCancelarModalPedido = document.getElementById('btnCancelarModalPedido');

let productosListaGlobal = [];

const obtenerMapActivo = () => {
    if (tipoPedidoActivo === "DELIVERY") {
        return detallesPedidoDelivery;
    } else if (tipoPedidoActivo === "LLEVAR") {
        return detallesPedidoLlevar;
    } else if (tipoPedidoActivo === "LOCAL") {
        if (MesaActiva) {
            const idMesa = MesaActiva.dataset.idMesa;
            let mapMesa = detallesPedidoLocal.get(idMesa);
            if (!mapMesa) {
                mapMesa = new Map();
                detallesPedidoLocal.set(idMesa, mapMesa);
            }
            return mapMesa;
        }
    }
    return new Map();
};

const abrirModalAgregarPedido = () => {
    if (!modalAgregarPedido) return;
    
    // Configurar título y botón
    const tituloModal = document.getElementById("modalAgregarPedidoTitulo") || document.querySelector("#modal-agregar-pedido .modal-header h3");
    if (tituloModal) {
        if (tipoPedidoActivo === "LOCAL") {
            tituloModal.textContent = `Agregar Productos - Mesa ${MesaActiva ? MesaActiva.dataset.mesa : ""}`;
        } else if (tipoPedidoActivo === "DELIVERY") {
            tituloModal.textContent = `Agregar Productos - Delivery`;
        } else {
            tituloModal.textContent = `Agregar Productos - Para Llevar`;
        }
    }

    const btnRegistrarPago = document.getElementById("btnRegistrarPagoPedido");
    if (btnRegistrarPago) {
        if (tipoPedidoActivo === "LOCAL") {
            btnRegistrarPago.textContent = "Aceptar";
        } else {
            btnRegistrarPago.textContent = "Registrar Pago";
        }
    }

    modalAgregarPedido.classList.remove('hidden');
    cargarProductosModalPedido();
    renderTablaProductosAgregadosModal();
};

const cargarProductosModalPedido = async () => {
    try {
        const response = await fetch(`${BASE_URL}/catalogo/listarProductos`);
        if (!response.ok) {
            mostrarToast("Error al cargar productos", "error");
            return;
        }
        const data = await response.json();
        productosListaGlobal = data;
        poblarFiltroModalPedido(data);
        renderTablaProductosModalPedido(data);
    } catch (error) {
        console.error(error);
        mostrarToast("Error de conexión", "error");
    }
};

const poblarFiltroModalPedido = (productos) => {
    const categorias = [...new Set(productos.map(p => p.nombreCategoria))].sort();
    const filtroCategoria = document.getElementById('modalPedidoFiltroCategoria');
    filtroCategoria.innerHTML = '<option value="">Todas</option>';
    categorias.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        filtroCategoria.appendChild(opt);
    });
};

const obtenerProductosFiltradosModal = () => {
    const orden = document.getElementById('modalPedidoFiltroOrden').value;
    const catFiltro = document.getElementById('modalPedidoFiltroCategoria').value;
    
    let lista = [...productosListaGlobal];
    
    if (catFiltro) {
        lista = lista.filter(p => p.nombreCategoria === catFiltro);
    }
    
    if (orden === 'az') {
        lista.sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
    } else if (orden === 'za') {
        lista.sort((a, b) => b.nombreProducto.localeCompare(a.nombreProducto));
    } else if (orden === 'categoria') {
        lista.sort((a, b) => a.nombreCategoria.localeCompare(b.nombreCategoria) || a.nombreProducto.localeCompare(b.nombreProducto));
    } else if (orden === 'stock-desc') {
        lista.sort((a, b) => b.stock - a.stock);
    } else if (orden === 'stock-asc') {
        lista.sort((a, b) => a.stock - b.stock);
    }
    
    return lista;
};

const renderTablaProductosModalPedido = (productos) => {
    const tbody = document.getElementById('tbodyProductosModalPedido');
    tbody.innerHTML = '';
    
    const mapActivo = obtenerMapActivo();
    productos.forEach(producto => {
        const cantidadAgregada = mapActivo.has(producto.idProducto) ? mapActivo.get(producto.idProducto).cantidad : 0;
        
        let stockBadge = "";
        if (producto.stock === 0) {
            stockBadge = `<span class="badge badge-red" title="Sin stock">0</span>`;
        } else if (producto.stock < 5) {
            stockBadge = `<span class="badge badge-yellow" title="Bajo stock">${producto.stock}</span>`;
        } else {
            stockBadge = producto.stock;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${producto.nombreProducto}</td>
            <td>${stockBadge}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-action btn-modal-agregar-producto" type="button" title="Agregar" data-id="${producto.idProducto}" data-nombre="${producto.nombreProducto}" data-precio="${producto.precio}">
                        <i class="fas fa-plus"></i>
                    </button>
                    ${cantidadAgregada > 0 ? `<span class="badge" style="margin-left: 4px;">${cantidadAgregada}</span>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
};

const aplicarFiltrosModalPedido = () => {
    renderTablaProductosModalPedido(obtenerProductosFiltradosModal());
};

const renderTablaProductosAgregadosModal = () => {
    const tbody = document.getElementById('tbodyPedidosAgregadosModal');
    const txtTotal = document.getElementById('txtTotalPedidoModal');
    const tfootTotal = document.getElementById('tfootTotalPedidoModal');
    
    tbody.innerHTML = '';
    let total = 0;
    
    const mapActivo = obtenerMapActivo();
    
    mapActivo.forEach((detalle) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${detalle.nombreProducto}</td>
            <td>${detalle.cantidad}</td>
            <td>${formatoMoneda(detalle.precioUnitario)}</td>
            <td>${formatoMoneda(detalle.total)}</td>
            <td>
                <button class="btn btn-danger btn-modal-quitar-producto" type="button" title="Quitar" data-id="${detalle.idProducto}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
        total += detalle.total;
    });
    
    txtTotal.textContent = formatoMoneda(total);
    
    if (mapActivo.size > 0) {
        tfootTotal.classList.remove('hidden');
    } else {
        tfootTotal.classList.add('hidden');
    }
    
    // Sincronizar con la tabla correspondiente en la vista
    if (tipoPedidoActivo === "LOCAL") {
        renderDetallesMesa();
    } else {
        renderDetallesPedido();
    }
};

if (btnAbrirModalAgregarPedido) {
    btnAbrirModalAgregarPedido.addEventListener('click', abrirModalAgregarPedido);
}

if (btnCerrarModalAgregarPedido) {
    btnCerrarModalAgregarPedido.addEventListener('click', () => {
        if (modalAgregarPedido) modalAgregarPedido.classList.add('hidden');
    });
}

if (btnCancelarModalPedido) {
    btnCancelarModalPedido.addEventListener('click', () => {
        if (modalAgregarPedido) modalAgregarPedido.classList.add('hidden');
    });
}

const modalPedidoFiltroOrden = document.getElementById('modalPedidoFiltroOrden');
const modalPedidoFiltroCategoria = document.getElementById('modalPedidoFiltroCategoria');

if (modalPedidoFiltroOrden) {
    modalPedidoFiltroOrden.addEventListener('change', aplicarFiltrosModalPedido);
}

if (modalPedidoFiltroCategoria) {
    modalPedidoFiltroCategoria.addEventListener('change', aplicarFiltrosModalPedido);
}

// Delegación de eventos para botones en la tabla de productos
const tbodyProductosModal = document.getElementById('tbodyProductosModalPedido');
if (tbodyProductosModal) {
    tbodyProductosModal.addEventListener('click', (e) => {
        const btnAgregar = e.target.closest('.btn-modal-agregar-producto');
        if (!btnAgregar) return;
        
        const idProducto = btnAgregar.dataset.id;
        const nombreProducto = btnAgregar.dataset.nombre;
        const precio = Number(btnAgregar.dataset.precio);
        
        const mapActivo = obtenerMapActivo();
        
        if (mapActivo.has(idProducto)) {
            const detalle = mapActivo.get(idProducto);
            detalle.cantidad += 1;
            detalle.total = detalle.cantidad * detalle.precioUnitario;
        } else {
            mapActivo.set(idProducto, {
                idProducto,
                nombreProducto,
                cantidad: 1,
                precioUnitario: precio,
                total: precio
            });
        }
        
        renderTablaProductosModalPedido(obtenerProductosFiltradosModal());
        renderTablaProductosAgregadosModal();
    });
}

// Delegación de eventos para quitar productos
const tbodyAgregadosModal = document.getElementById('tbodyPedidosAgregadosModal');
if (tbodyAgregadosModal) {
    tbodyAgregadosModal.addEventListener('click', (e) => {
        const btnQuitar = e.target.closest('.btn-modal-quitar-producto');
        if (!btnQuitar) return;
        
        const idProducto = btnQuitar.dataset.id;
        const mapActivo = obtenerMapActivo();
        mapActivo.delete(idProducto);
        
        renderTablaProductosModalPedido(obtenerProductosFiltradosModal());
        renderTablaProductosAgregadosModal();
    });
}

const modalCobroPedido = document.getElementById("modal-cobro-pedido");
const tipoPedidoLabel = document.getElementById("tipo-pedido-label");
const modalPedidoTotalMonto = document.getElementById("modal-pedido-total-monto");
const comboMetodoPagoModal = document.getElementById("comboMetodoPagoModal");

// Elementos para manejo de efectivo en modal pedido
const efectivoBlockModal = document.getElementById('efectivo-block-modal');
const inputEfectivoModal = document.getElementById('inputEfectivoModal');
const vueltoModal = document.getElementById('vuelto-modal');

if (comboMetodoPagoModal) {
    comboMetodoPagoModal.addEventListener('change', () => {
        if (comboMetodoPagoModal.value === 'EFECTIVO') {
            if (efectivoBlockModal) efectivoBlockModal.classList.remove('hidden');
            if (inputEfectivoModal) inputEfectivoModal.value = '';
            if (vueltoModal) vueltoModal.textContent = formatoMoneda(0);
        } else {
            if (efectivoBlockModal) efectivoBlockModal.classList.add('hidden');
        }
    });
}

if (inputEfectivoModal) {
    inputEfectivoModal.addEventListener('input', () => {
        const text = modalPedidoTotalMonto ? modalPedidoTotalMonto.textContent : 'S/ 0.00';
        const total = Number(text.replace('S/', '').replace(/\s/g, '').replace(',', '.')) || 0;
        const efectivo = Number(inputEfectivoModal.value) || 0;
        const vuelto = efectivo - total;
        if (vueltoModal) vueltoModal.textContent = formatoMoneda(vuelto >= 0 ? vuelto : 0);
    });
}

const btnCancelarCompraPedido = document.getElementById("btnCancelarCompraPedido");
btnCancelarCompraPedido.addEventListener("click", () => {
    modalCobroPedido.classList.add("hidden");
});

const btnConfirmarCompraPedido = document.getElementById("btnConfirmarCompraPedido");
btnConfirmarCompraPedido.addEventListener("click", async (e) => {
    e.preventDefault();

    const mapActivo = tipoPedidoActivo === "DELIVERY" ? detallesPedidoDelivery : detallesPedidoLlevar;

    const requestPedido = {
        metodoPago: comboMetodoPagoModal.value,
        tipoPedido: tipoPedidoActivo,
        detalles: Array.from(mapActivo.values()).map((detalle) => ({
            idProducto: detalle.idProducto,
            cantidad: detalle.cantidad
        }))
    };

    btnConfirmarCompraPedido.disabled = true;
    btnConfirmarCompraPedido.textContent = "Procesando...";

    // Si es EFECTIVO, validar monto recibido y calcular vuelto
    let totalPedido = 0;
    mapActivo.forEach(d => totalPedido += d.total);

    if (requestPedido.metodoPago === 'EFECTIVO') {
        const efectivoRec = Number(inputEfectivoModal ? inputEfectivoModal.value : 0) || 0;
        if (isNaN(efectivoRec) || efectivoRec < totalPedido) {
            mostrarToast('El monto recibido es insuficiente para cubrir el total.', 'error');
            btnConfirmarCompraPedido.disabled = false;
            btnConfirmarCompraPedido.textContent = 'Comprar';
            return;
        }
        requestPedido.efectivoRecibido = Number(efectivoRec.toFixed(2));
        requestPedido.vuelto = Number((efectivoRec - totalPedido).toFixed(2));
    }

    const pagoCorrecto = await cobrarPedido(requestPedido);

    btnConfirmarCompraPedido.disabled = false;
    btnConfirmarCompraPedido.textContent = "Comprar";

    if (pagoCorrecto) {
        // Adjuntar datos de efectivo a la boleta que mostraremos/convertiremos a PDF
        if (requestPedido.metodoPago === 'EFECTIVO') {
            pagoCorrecto.efectivoRecibido = requestPedido.efectivoRecibido;
            pagoCorrecto.vuelto = requestPedido.vuelto;
        }
        mapActivo.clear();
        renderDetallesPedido();
        // Si el cobro vino desde un pedido en espera, eliminarlo de la lista
        const esperaIdStr = modalCobroPedido.dataset.esperaId;
        if (esperaIdStr) {
            const esperaId = Number(esperaIdStr);
            const idx = pedidosEnEspera.findIndex(p => p.id === esperaId);
            if (idx !== -1) pedidosEnEspera.splice(idx, 1);
            guardarEsperaEnSession();
            delete modalCobroPedido.dataset.esperaId;
            renderTablaEspera();
        }
        modalCobroPedido.classList.add("hidden");
        mostrarModalBoleta(pagoCorrecto);
    }
});

const btnRegistrarPagoPedido = document.getElementById("btnRegistrarPagoPedido");
if (btnRegistrarPagoPedido) {
    btnRegistrarPagoPedido.addEventListener("click", (e) => {
        e.preventDefault();

        if (tipoPedidoActivo === "LOCAL") {
            if (modalAgregarPedido) modalAgregarPedido.classList.add('hidden');
            return;
        }

        const mapActivo = obtenerMapActivo();

        if (mapActivo.size === 0) {
            mostrarToast("Agrega al menos un producto antes de registrar el pago", "error");
            return;
        }

        let total = 0;
        mapActivo.forEach(detalle => total += detalle.total);

        const tipoPedidoLabelEl = document.getElementById("tipo-pedido-label");
        const modalPedidoTotalMontoEl = document.getElementById("modal-pedido-total-monto");
        const comboMetodoPagoModalEl = document.getElementById("comboMetodoPagoModal");
        const efectivoBlockModalEl = document.getElementById('efectivo-block-modal');
        const inputEfectivoModalEl = document.getElementById('inputEfectivoModal');
        const vueltoModalEl = document.getElementById('vuelto-modal');
        const modalCobroPedidoEl = document.getElementById("modal-cobro-pedido");

        if (tipoPedidoLabelEl) tipoPedidoLabelEl.textContent = `Pedido - ${tipoPedidoActivo}`;
        if (modalPedidoTotalMontoEl) modalPedidoTotalMontoEl.textContent = formatoMoneda(total);
        if (comboMetodoPagoModalEl) comboMetodoPagoModalEl.selectedIndex = 0;

        // Mostrar u ocultar bloque efectivo según la opción activa (tras reset de selectedIndex)
        if (efectivoBlockModalEl) {
            if (comboMetodoPagoModalEl && comboMetodoPagoModalEl.value === 'EFECTIVO') {
                efectivoBlockModalEl.classList.remove('hidden');
            } else {
                efectivoBlockModalEl.classList.add('hidden');
            }
        }
        if (inputEfectivoModalEl) inputEfectivoModalEl.value = '';
        if (vueltoModalEl) vueltoModalEl.textContent = formatoMoneda(0);

        if (modalCobroPedidoEl) modalCobroPedidoEl.classList.remove('hidden');
        if (modalAgregarPedido) modalAgregarPedido.classList.add('hidden');
        renderDetallesPedido();
    });
}
// ──────────────────────────────────────────────
// TABS
// ──────────────────────────────────────────────
const divPedidoRegistro = document.getElementById("divPedidoRegistro");
const divMesaPedidos = document.getElementById("divMesaPedidos");

const btnTabLlevar = document.getElementById("btnTabLlevar");
const btnTabDelivery = document.getElementById("btnTabDelivery");
const btnTabLocal = document.getElementById("btnTabLocal");

const divPedidoLlevar = document.getElementById("divPedidoLlevar");
btnTabLlevar.addEventListener("click", () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btnTabLlevar.classList.add('active');
    document.getElementById('pos-llevar').classList.add('active');
    divPedidoLlevar.appendChild(divPedidoRegistro);
    divPedidoRegistro.classList.remove("hidden");
    divMesaPedidos.classList.add("hidden");
    tipoPedidoActivo = "LLEVAR";
    renderDetallesPedido();
});


const divPedidoDelivery = document.getElementById("divPedidoDelivery");
btnTabDelivery.addEventListener("click", () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btnTabDelivery.classList.add('active');
    document.getElementById('pos-delivery').classList.add('active');
    divPedidoDelivery.appendChild(divPedidoRegistro);
    divPedidoRegistro.classList.remove("hidden");
    divMesaPedidos.classList.add("hidden");
    tipoPedidoActivo = "DELIVERY";
    renderDetallesPedido();
});


btnTabLocal.addEventListener("click", () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btnTabLocal.classList.add('active');
    document.getElementById('pos-salon').classList.add('active');
    tipoPedidoActivo = "LOCAL";
    divPedidoRegistro.classList.add("hidden");
    divMesaPedidos.classList.add("hidden");
    renderDetallesMesa();
});


// ──────────────────────────────────────────────
// MESA — AGREGAR PEDIDO
// ──────────────────────────────────────────────
const btnOcuparMesa = document.getElementById("btnOcuparMesa");
btnOcuparMesa.addEventListener("click", async (e) => {
    e.preventDefault();

    const idMesaNum = MesaActiva.dataset.idMesa;
    const mapActivo = detallesPedidoLocal.get(idMesaNum);

    const requestPedido = {
        metodoPago: "PENDIENTE",
        tipoPedido: tipoPedidoActivo,
        detalles: Array.from(mapActivo.values()).map((detalle) => ({
            idProducto: detalle.idProducto,
            cantidad: detalle.cantidad
        }))
    };

    const mesaOcupada = await ocuparMesa(requestPedido, idMesaNum);
    if (mesaOcupada) {
        mapActivo.clear();
        renderDetallesPedido();
    }

    divMesaPedidos.classList.add("hidden");
    btnOcuparMesa.classList.add("hidden");
    await cargarMesas();
});


const btnAgregarPedidoMesa = document.getElementById("btnAgregarPedidoMesa");
if (btnAgregarPedidoMesa) {
    btnAgregarPedidoMesa.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        if (MesaActiva == null) {
            mostrarToast("Por favor, selecciona una mesa primero", "info");
            return;
        }
        abrirModalAgregarPedido();
    });
}

const divModalMesaOcupada = document.getElementById("divModalMesaOcupada");
const mesaGridVenta = document.getElementById("mesa-grid");
mesaGridVenta.addEventListener("click", () => {

    divMesaPedidos.classList.add("hidden");
    const boton = event.target.closest(".table-card");

    if (!boton) return;

    MesaActiva = boton;
    const numeroMesa = boton.dataset.mesa;
    const estadoMesa = boton.dataset.estado;

    if (estadoMesa === "OCUPADO") {

        // Ocultar el boton Cobrar si el usuario es Mesero
        const btnCobrarModal = document.getElementById("btnMesaOcupadaCobrar");
        if (rolUsuarioActivo === "Mesero") {
            btnCobrarModal.classList.add("hidden");
        } else {
            btnCobrarModal.classList.remove("hidden");
        }

        divModalMesaOcupada.classList.remove("hidden");

    } else {

        divMesaPedidos.classList.remove("hidden");

        document.getElementById("mesa-selected").textContent = `Mesa ${numeroMesa}`;
        document.getElementById("mesa-estado").textContent = estadoMesa;
        document.getElementById("mesa-estado").classList.add("badge-green");

        if (detallesPedidoLocal.get(MesaActiva.dataset.idMesa).size > 0) {
            btnOcuparMesa.classList.remove("hidden");
        } else {
            btnOcuparMesa.classList.add("hidden");
        }

        renderDetallesMesa();

    }

});

const modalCobro = document.getElementById("cobro-modal");
const cobroListaDetalles = document.getElementById("cobro-lista-detalles");
const cobroTotalMonto = document.getElementById("cobro-total-monto");
const comboMetodoPagoCobro = document.getElementById("comboMetodoPagoCobro");
const btnConfirmarCobro = document.getElementById("btnConfirmarCobro");
const btnCancelarCobro = document.getElementById("btnCancelarCobro");

// Elementos para manejo de efectivo en modal cobro mesa
const efectivoBlockCobro = document.getElementById('efectivo-block-cobro');
const inputEfectivoCobro = document.getElementById('inputEfectivoCobro');
const vueltoCobro = document.getElementById('vuelto-cobro');

if (comboMetodoPagoCobro) {
    comboMetodoPagoCobro.addEventListener('change', () => {
        if (comboMetodoPagoCobro.value === 'EFECTIVO') {
            if (efectivoBlockCobro) efectivoBlockCobro.classList.remove('hidden');
            if (inputEfectivoCobro) inputEfectivoCobro.value = '';
            if (vueltoCobro) vueltoCobro.textContent = formatoMoneda(0);
        } else {
            if (efectivoBlockCobro) efectivoBlockCobro.classList.add('hidden');
        }
    });
}

if (inputEfectivoCobro) {
    inputEfectivoCobro.addEventListener('input', () => {
        const text = cobroTotalMonto ? cobroTotalMonto.textContent : 'S/ 0.00';
        const total = Number(text.replace('S/', '').replace(/\s/g, '').replace(',', '.')) || 0;
        const efectivo = Number(inputEfectivoCobro.value) || 0;
        const vuelto = efectivo - total;
        if (vueltoCobro) vueltoCobro.textContent = formatoMoneda(vuelto >= 0 ? vuelto : 0);
    });
}

const btnMesaOcupadaAgregar = document.getElementById("btnMesaOcupadaAgregar");
btnMesaOcupadaAgregar.addEventListener("click", async () => {
    divModalMesaOcupada.classList.add("hidden");
    divMesaPedidos.classList.remove("hidden");

    const idMesa = MesaActiva.dataset.idMesa;
    const detallesBackend = await obtenerDetallesPedidoPorMesa(idMesa);

    const mapMesa = detallesPedidoLocal.get(idMesa);
    mapMesa.clear();

    detallesBackend.forEach(detalle => {
        mapMesa.set(detalle.idProducto, {
            idProducto: detalle.idProducto,
            nombreProducto: detalle.nombreProducto,
            cantidad: detalle.cantidad,
            precioUnitario: detalle.precioUnitario,
            total: detalle.total
        });
    });

    renderDetallesMesa();
});

document.getElementById("btnMesaOcupadaCobrar").addEventListener("click", async () => {
    divModalMesaOcupada.classList.add("hidden");
    const idMesa = MesaActiva.dataset.idMesa;
    if (!idMesa) { mostrarToast("Error: No se encontró el identificador de la mesa.", "error"); return; }

    cobroListaDetalles.innerHTML = "<p class='muted'>Cargando detalles...</p>";
    modalCobro.classList.remove("hidden");
    // Estado inicial del bloque de efectivo según el valor actual del select
    if (comboMetodoPagoCobro) comboMetodoPagoCobro.selectedIndex = 0;
    if (comboMetodoPagoCobro && comboMetodoPagoCobro.value === 'EFECTIVO') {
        if (efectivoBlockCobro) efectivoBlockCobro.classList.remove('hidden');
    } else {
        if (efectivoBlockCobro) efectivoBlockCobro.classList.add('hidden');
    }
    if (inputEfectivoCobro) inputEfectivoCobro.value = '';
    if (vueltoCobro) vueltoCobro.textContent = formatoMoneda(0);
    document.getElementById("cobro-mesa-label").textContent = `Mesa ${MesaActiva.dataset.mesa}`;

    const detallesBackend = await obtenerDetallesPedidoPorMesa(idMesa);
    cobroListaDetalles.innerHTML = "";
    let totalCobro = 0;
    detallesBackend.forEach((detalle) => {
        const item = document.createElement("div");
        item.style.cssText = "display:flex;justify-content:space-between;padding:4px 0;";
        item.innerHTML = `<span>${detalle.cantidad}x ${detalle.nombreProducto}</span><span>${formatoMoneda(detalle.total)}</span>`;
        cobroListaDetalles.appendChild(item);
        totalCobro += detalle.total;
    });
    cobroTotalMonto.textContent = formatoMoneda(totalCobro);
});



const btnMesaOcupadaCancel = document.getElementById("btnMesaOcupadaCancel");
btnMesaOcupadaCancel.addEventListener("click", () => {
    divModalMesaOcupada.classList.add("hidden");
    divMesaPedidos.classList.add("hidden");
    MesaActiva = null;
});

btnConfirmarCobro.addEventListener("click", async () => {
    const idMesa = MesaActiva.dataset.idMesa;
    const metodoPago = comboMetodoPagoCobro.value;

    // Si es EFECTIVO, validar monto recibido
    let totalCobro = Number(cobroTotalMonto ? cobroTotalMonto.textContent.replace('S/', '').replace(/\s/g, '').replace(',', '.') : 0) || 0;
    let efectivoRec = null;
    if (metodoPago === 'EFECTIVO') {
        efectivoRec = Number(inputEfectivoCobro ? inputEfectivoCobro.value : 0) || 0;
        if (isNaN(efectivoRec) || efectivoRec < totalCobro) {
            mostrarToast('El monto recibido es insuficiente para cubrir el total.', 'error');
            return;
        }
    }

    const boleta = await cobrarMesa(idMesa, metodoPago);

    if (boleta) {
        // Adjuntar datos de efectivo si aplica
        if (metodoPago === 'EFECTIVO') {
            boleta.efectivoRecibido = Number(efectivoRec.toFixed(2));
            boleta.vuelto = Number((efectivoRec - totalCobro).toFixed(2));
        }
        detallesPedidoLocal.get(idMesa).clear();
        modalCobro.classList.add("hidden");
        MesaActiva = null;
        await cargarMesas();
        mostrarModalBoleta(boleta);
    }
});


btnCancelarCobro.addEventListener("click", () => {
    modalCobro.classList.add("hidden");
    MesaActiva = null;
});

const verificarSesionActiva = async () => {

    try {

        const response = await fetch(`${BASE_URL}/usuario/sesionActiva`);
        const data = await response.json();

        if (!response.ok) {
            return null;
        } else {
            return data;
        }

    } catch (error) {
        console.log(error);
    }

}


const cargarSecciones = (sesionActiva) => {

    rolUsuarioActivo = sesionActiva.rol;

    if (sesionActiva.rol === "Administrador") {
        return;
    }

    if (sesionActiva.rol === "Mesero") {
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

    if (sesionActiva.rol === "Cajero") {
        document.getElementById("navSeccionInventario").classList.add("hidden");
        document.getElementById("navSeccionCatalogo").classList.add("hidden");
        document.getElementById("navSeccionUsuario").classList.add("hidden");
        document.getElementById("navSeccionConfiguracion").classList.add("hidden");
        document.getElementById("btnAgregarMesa").classList.add("hidden");
        document.getElementById("btnEliminarMesa").classList.add("hidden");
    }

}


document.getElementById("btnCerrarSesion").addEventListener("click", async (e) => {
    e.preventDefault();
    if(await cerrarSesion()){
        window.location.href = 'index.html';
        return;
    }
});

const cerrarSesion = async () => {
    try {

        const response = await fetch(`${BASE_URL}/usuario/cerrarSesion`, {
            method: 'PUT'
        });

        if (!response.ok) {
            return false;
        }

        return true;

    } catch (error) {
        console.log(error);
    }
}

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

    cargarSecciones(sesionActiva);

    const cajaAbierta = await obtenerCajaAbierta();

    if (cajaAbierta) {
        cargarMesas();
        cargarProductos();
        cargarEsperaDeSession();
        renderTablaEspera();
    } else {

        let html = "caja.html";
        let mensaje = "Ir a caja";

        if (sesionActiva.rol === "Mesero" && await cerrarSesion()) {
            html = "index.html";
            mensaje = "Logear como cajero";
        }

        document.getElementById("caja-cerrada-ir").textContent = mensaje;

        const cajaCerradaModal = document.getElementById("caja-cerrada-modal");
        const cajaCerradaIr = document.getElementById("caja-cerrada-ir");
        cajaCerradaModal.classList.remove("hidden");
        cajaCerradaIr.addEventListener("click", () => {
            window.location.href = html;
        });
    }
});



// ──────────────────────────────────────────────
// LISTA DE ESPERA (LLEVAR / DELIVERY)
// ──────────────────────────────────────────────

// Estructura de cada pedido en espera:
// { id, tipoPedido, detalles: Map(idProducto -> detalle), fechaHora }
// Los pedidos se persisten en sessionStorage para sobrevivir la navegación entre módulos.
const pedidosEnEspera = [];
let contadorEspera = 0;

// Variables para preservar id y fechaHora al editar un pedido en espera existente
let pedidoEnEdicionId = null;
let pedidoEnEdicionFechaHora = null;
let pedidoEnEdicionIdx = null;   // posición original en el array, para reinsertar en el mismo lugar

// ── Persistencia en sessionStorage ──
const ESPERA_KEY = 'erp_pedidos_espera';
const CONTADOR_KEY = 'erp_espera_contador';

const guardarEsperaEnSession = () => {
    // Maps no son serializables directamente; convertimos a array de pares
    const serializable = pedidosEnEspera.map(p => ({
        id: p.id,
        tipoPedido: p.tipoPedido,
        fechaHora: p.fechaHora,
        detalles: Array.from(p.detalles.entries())
    }));
    sessionStorage.setItem(ESPERA_KEY, JSON.stringify(serializable));
    sessionStorage.setItem(CONTADOR_KEY, String(contadorEspera));
};

const cargarEsperaDeSession = () => {
    try {
        const raw = sessionStorage.getItem(ESPERA_KEY);
        const cnt = sessionStorage.getItem(CONTADOR_KEY);
        if (cnt) contadorEspera = Number(cnt);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        parsed.forEach(p => {
            const detallesMap = new Map(p.detalles);
            pedidosEnEspera.push({
                id: p.id,
                tipoPedido: p.tipoPedido,
                fechaHora: p.fechaHora,
                detalles: detallesMap
            });
        });
    } catch (e) {
        console.warn('No se pudo restaurar la lista de espera desde sessionStorage:', e);
    }
};

const formatearFechaHora = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const calcularTotalDetalles = (detallesMap) => {
    let total = 0;
    detallesMap.forEach(d => total += d.total);
    return total;
};

const renderTablaEspera = () => {
    const tbody = document.getElementById('tbodyEspera');
    const txtVacia = document.getElementById('txtEsperaVacia');
    const tabla = document.getElementById('tablaEspera');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (pedidosEnEspera.length === 0) {
        if (txtVacia) txtVacia.classList.remove('hidden');
        if (tabla) tabla.classList.add('hidden');
        return;
    }

    if (txtVacia) txtVacia.classList.add('hidden');
    if (tabla) tabla.classList.remove('hidden');

    // Ordenados de más antiguo (index 0) a más reciente (último)
    pedidosEnEspera.forEach((pedido) => {
        const tipoBadgeClass = pedido.tipoPedido === 'DELIVERY' ? 'badge-blue' : 'badge-orange';
        const tipoLabel = pedido.tipoPedido === 'DELIVERY' ? 'Delivery' : 'Para Llevar';

        const productosTexto = Array.from(pedido.detalles.values())
            .map(d => `${d.cantidad}x ${d.nombreProducto}`)
            .join(', ');

        const total = calcularTotalDetalles(pedido.detalles);

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><span class="badge ${tipoBadgeClass}">${tipoLabel}</span></td>
            <td style="max-width:260px;white-space:normal;font-size:13px;">${productosTexto}</td>
            <td><strong>${formatoMoneda(total)}</strong></td>
            <td style="font-size:13px;white-space:nowrap;">${pedido.fechaHora}</td>
            <td>
              <div class="table-actions">
                <button class="btn btn-action btn-agregar-espera" title="Agregar más productos" data-id="${pedido.id}">
                  <i class="fas fa-plus"></i>
                </button>
                <button class="btn btn-primary btn-cobrar-espera" title="Cobrar pedido" data-id="${pedido.id}">
                  <i class="fas fa-cash-register"></i>
                </button>
                <button class="btn btn-danger btn-cancelar-espera" title="Cancelar pedido" data-id="${pedido.id}">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
        `;
        tbody.appendChild(fila);
    });
};

// Botón "Enviar a Espera"
const btnEnviarAEspera = document.getElementById('btnEnviarAEspera');
if (btnEnviarAEspera) {
    btnEnviarAEspera.addEventListener('click', () => {
        const mapActivo = tipoPedidoActivo === 'DELIVERY' ? detallesPedidoDelivery : detallesPedidoLlevar;

        if (mapActivo.size === 0) {
            mostrarToast('Agrega al menos un producto antes de enviar a espera.', 'error');
            return;
        }

        // Clonar los detalles para que el pedido en espera sea independiente
        const detallesClonados = new Map();
        mapActivo.forEach((v, k) => detallesClonados.set(k, { ...v }));

        // Si viene de editar un pedido existente, conservar su id y fecha/hora originales
        const esEdicion = pedidoEnEdicionId !== null;
        const nuevoPedido = {
            id: esEdicion ? pedidoEnEdicionId : ++contadorEspera,
            tipoPedido: tipoPedidoActivo,
            detalles: detallesClonados,
            fechaHora: esEdicion ? pedidoEnEdicionFechaHora : formatearFechaHora(new Date())
        };

        // Si es edición de un pedido existente, reinsertar en su posición original; si es nuevo, al final
        if (esEdicion && pedidoEnEdicionIdx !== null) {
            pedidosEnEspera.splice(pedidoEnEdicionIdx, 0, nuevoPedido);
        } else {
            pedidosEnEspera.push(nuevoPedido);
        }
        guardarEsperaEnSession();
        mapActivo.clear();
        // Limpiar estado de edición tras re-enviar
        pedidoEnEdicionId = null;
        pedidoEnEdicionFechaHora = null;
        pedidoEnEdicionIdx = null;
        renderDetallesPedido();
        renderTablaEspera();
        mostrarToast(`Pedido ${tipoPedidoActivo === 'DELIVERY' ? 'Delivery' : 'Para Llevar'} enviado a la lista de espera.`, 'success');
    });
}

// Delegación de eventos en la tabla de espera
const tbodyEspera = document.getElementById('tbodyEspera');
if (tbodyEspera) {
    tbodyEspera.addEventListener('click', (e) => {
        const btnAgregar = e.target.closest('.btn-agregar-espera');
        const btnCobrar = e.target.closest('.btn-cobrar-espera');
        const btnCancelar = e.target.closest('.btn-cancelar-espera');

        if (btnAgregar) {
            const id = Number(btnAgregar.dataset.id);
            const pedido = pedidosEnEspera.find(p => p.id === id);
            if (!pedido) return;

            // Guardar el id, fechaHora y posición originales para preservarlos al re-enviar a espera
            pedidoEnEdicionId = pedido.id;
            pedidoEnEdicionFechaHora = pedido.fechaHora;

            // Restaurar los detalles del pedido en espera al mapa activo según el tipo
            tipoPedidoActivo = pedido.tipoPedido;
            const mapDestino = tipoPedidoActivo === 'DELIVERY' ? detallesPedidoDelivery : detallesPedidoLlevar;

            // Copiar detalles existentes del pedido en espera al mapa activo
            mapDestino.clear();
            pedido.detalles.forEach((v, k) => mapDestino.set(k, { ...v }));

            // Quitar el pedido de la lista de espera guardando su posición original
            const idx = pedidosEnEspera.findIndex(p => p.id === id);
            pedidoEnEdicionIdx = idx !== -1 ? idx : null;
            if (idx !== -1) pedidosEnEspera.splice(idx, 1);
            guardarEsperaEnSession();
            renderTablaEspera();

            // Navegar al tab correspondiente
            const tabBtn = tipoPedidoActivo === 'DELIVERY'
                ? document.getElementById('btnTabDelivery')
                : document.getElementById('btnTabLlevar');
            if (tabBtn) tabBtn.click();

            mostrarToast('Pedido restaurado. Puedes seguir agregando productos.', 'info');
        }

        if (btnCobrar) {
            const id = Number(btnCobrar.dataset.id);
            const pedido = pedidosEnEspera.find(p => p.id === id);
            if (!pedido) return;

            // Cargar los detalles del pedido en espera al mapa activo y abrir modal de cobro
            tipoPedidoActivo = pedido.tipoPedido;
            const mapDestino = tipoPedidoActivo === 'DELIVERY' ? detallesPedidoDelivery : detallesPedidoLlevar;
            mapDestino.clear();
            pedido.detalles.forEach((v, k) => mapDestino.set(k, { ...v }));

            // Calcular total
            let total = 0;
            mapDestino.forEach(d => total += d.total);

            // Abrir modal de cobro
            const tipoPedidoLabelEl = document.getElementById('tipo-pedido-label');
            const modalPedidoTotalMontoEl = document.getElementById('modal-pedido-total-monto');
            const comboMetodoPagoModalEl = document.getElementById('comboMetodoPagoModal');
            const efectivoBlockModalEl = document.getElementById('efectivo-block-modal');
            const inputEfectivoModalEl = document.getElementById('inputEfectivoModal');
            const vueltoModalEl = document.getElementById('vuelto-modal');
            const modalCobroPedidoEl = document.getElementById('modal-cobro-pedido');

            if (tipoPedidoLabelEl) tipoPedidoLabelEl.textContent = `Pedido - ${pedido.tipoPedido}`;
            if (modalPedidoTotalMontoEl) modalPedidoTotalMontoEl.textContent = formatoMoneda(total);
            if (comboMetodoPagoModalEl) comboMetodoPagoModalEl.selectedIndex = 0;
            // Mostrar u ocultar bloque efectivo según la opción activa al abrir
            if (efectivoBlockModalEl) {
                if (comboMetodoPagoModalEl && comboMetodoPagoModalEl.value === 'EFECTIVO') {
                    efectivoBlockModalEl.classList.remove('hidden');
                } else {
                    efectivoBlockModalEl.classList.add('hidden');
                }
            }
            if (inputEfectivoModalEl) inputEfectivoModalEl.value = '';
            if (vueltoModalEl) vueltoModalEl.textContent = formatoMoneda(0);
            if (modalCobroPedidoEl) modalCobroPedidoEl.classList.remove('hidden');

            // Marcar qué pedido en espera estamos cobrando para limpiarlo al confirmar
            modalCobroPedidoEl.dataset.esperaId = id;
        }

        if (btnCancelar) {
            const id = Number(btnCancelar.dataset.id);
            const idx = pedidosEnEspera.findIndex(p => p.id === id);
            if (idx !== -1) {
                pedidosEnEspera.splice(idx, 1);
                guardarEsperaEnSession();
                renderTablaEspera();
                mostrarToast('Pedido cancelado y eliminado de la lista de espera.', 'info');
            }
        }
    });
}

// Tab "En Espera"
const btnTabEspera = document.getElementById('btnTabEspera');
if (btnTabEspera) {
    btnTabEspera.addEventListener('click', () => {
        tipoPedidoActivo = null;
        divPedidoRegistro.classList.add('hidden');
        divMesaPedidos.classList.add('hidden');
        renderTablaEspera();

        // Activar visualmente el tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btnTabEspera.classList.add('active');
        document.getElementById('pos-espera').classList.add('active');
    });
}