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

// -------------------- AUTH --------------------
const verificarAutenticacion = async (response) => {
    if (response.status === 401 || response.status === 403) {
        await cerrarSesion();
        return false;
    }
    return true;
};

// -------------------- PEDIDOS EN ESPERA --------------------
const cargarPedidosEnEsperaDash = async () => {
    try {
        const response = await fetch(`${BASE_URL}/dashboard/pedidosEnEspera`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!(await verificarAutenticacion(response))) return;

        if (!response.ok) return;

        const pedidos = await response.json();

        const txtVacia = document.getElementById('txtEsperaDashVacia');
        const tabla = document.getElementById('tablaEsperaDash');
        const tbody = document.getElementById('tbodyEsperaDash');
        const badge = document.getElementById('badgeConteoEspera');

        if (!tbody) return;

        tbody.innerHTML = '';

        if (pedidos.length === 0) {
            if (txtVacia) txtVacia.style.display = '';
            if (tabla) tabla.style.display = 'none';
            if (badge) badge.style.display = 'none';
            return;
        }

        if (txtVacia) txtVacia.style.display = 'none';
        if (tabla) tabla.style.display = '';
        if (badge) {
            badge.textContent = pedidos.length;
            badge.style.display = '';
        }

        const formatoMoneda = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

        const formatearFechaHoraISO = (isoStr) => {
            if (!isoStr) return '';
            try {
                const date = new Date(isoStr);
                const pad = (n) => String(n).padStart(2, '0');
                return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
            } catch (e) { return isoStr; }
        };

        pedidos.forEach(p => {
            const tipoBadgeClass = p.tipoPedido === 'DELIVERY' ? 'badge-blue' : 'badge-orange';
            const tipoLabel = p.tipoPedido === 'DELIVERY' ? 'Delivery' : 'Para Llevar';
            const productosTexto = (p.detalles || [])
                .map(d => `${d.cantidad}x ${d.nombreProducto}`)
                .join(', ');

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><span class="badge ${tipoBadgeClass}">${tipoLabel}</span></td>
                <td style="max-width:260px;white-space:normal;font-size:13px;">${productosTexto || '—'}</td>
                <td><strong>${formatoMoneda(p.total)}</strong></td>
                <td style="font-size:13px;white-space:nowrap;">${formatearFechaHoraISO(p.fechaHora)}</td>
                <td style="font-size:13px;">${p.nombreUsuarioCreador || '—'}</td>
            `;
            tbody.appendChild(fila);
        });

    } catch (error) {
        console.error('Error al cargar pedidos en espera:', error);
    }
};

// -------------------- ESTADÍSTICAS --------------------
const cargarEstadisticas = async () => {
    try {
        const response = await fetch(`${BASE_URL}/dashboard/estadisticas`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!(await verificarAutenticacion(response))) return;

        if (!response.ok) {
            console.error("Error al obtener estadísticas del servidor");
            return;
        }

        const data = await response.json();

        document.querySelector('.text-success').textContent =
            `S/ ${Number(data.ventasHoy).toFixed(2)}`;

        document.querySelectorAll('.stat-card h4')[1].textContent = data.pedidosTotales;
        document.querySelector('.text-warning').textContent = `${data.mesasOcupadas}/6`;
        document.querySelectorAll('.stat-card h4')[3].textContent = data.productosTotales;

        renderizarGraficas(data);

    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
    }
};

// -------------------- EXCEL --------------------
const descargarExcelMensual = async () => {
    try {
        const mes = document.getElementById("selectMes")?.value;

        let anio = document.getElementById("selectAnio")?.value;

        if (!anio) {
            anio = new Date().getFullYear(); // fallback seguro
        }

        if (!mes || !anio) {
            console.error("Mes o año inválido");
            return;
        }

        const response = await fetch(
            `${BASE_URL}/dashboard/pedidosMensuales?mes=${mes}&anio=${anio}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }
        );

        if (!(await verificarAutenticacion(response))) return;

        if (!response.ok) {
            throw new Error("Error al obtener los pedidos");
        }

        const pedidos = await response.json();

        await generarExcel(pedidos, mes, anio);

    } catch (error) {
        console.error("Error al descargar excel mensual:", error);

        mostrarToast("Ocurrió un error al generar el reporte", "error");
    }
};

// -------------------- GRÁFICOS --------------------
const renderizarGraficas = (data) => {
    const ctxCaja = document.getElementById('graficoCaja').getContext('2d');

    new Chart(ctxCaja, {
        type: 'bar',
        data: {
            labels: ['Ingresos', 'Egresos'],
            datasets: [{
                label: 'Soles (S/)',
                data: [data.ingresos, data.egresos],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.6)',
                    'rgba(239, 68, 68, 0.6)'
                ],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });

    const ctxPedidos = document.getElementById('graficoPedidos').getContext('2d');

    new Chart(ctxPedidos, {
        type: 'doughnut',
        data: {
            labels: ['Local', 'Para Llevar', 'Delivery'],
            datasets: [{
                data: [
                    data.pedidosLocal,
                    data.pedidosLlevar,
                    data.pedidosDelivery
                ],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(249, 115, 22, 0.7)',
                    'rgba(168, 85, 247, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
};

// -------------------- ROLES --------------------
const cargarSecciones = (payload) => {

    if (payload.rol === "MESERO") {
        ["navSeccionCaja",
            "navSeccionInventario",
            "navSeccionCatalogo",
            "navSeccionUsuario",
            "navSeccionConfiguracion"
        ].forEach(id => document.getElementById(id)?.classList.add("hidden"));
    }

    if (payload.rol === "CAJERO") {
        ["navSeccionInventario",
            "navSeccionCatalogo",
            "navSeccionUsuario",
            "navSeccionConfiguracion"
        ].forEach(id => document.getElementById(id)?.classList.add("hidden"));
    }
};

// -------------------- LOGOUT --------------------
const cerrarSesion = async () => {
    try {
        await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
    } catch (e) {
        console.log(e);
    } finally {
        localStorage.removeItem("jwtToken");
        window.location.href = "index.html";
    }
};

// -------------------- PAYLOAD --------------------
const obtenerPayload = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        localStorage.removeItem("jwtToken");
        window.location.href = "index.html";
    }
};

// -------------------- INIT --------------------
document.addEventListener("DOMContentLoaded", async () => {

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
    cargarEstadisticas();
    cargarPedidosEnEsperaDash();

    document.getElementById('btnRefrescarEspera')?.addEventListener('click', cargarPedidosEnEsperaDash);

    const select = document.getElementById("selectAnio");
    const year = new Date().getFullYear();

    for (let i = year; i >= 2020; i--) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = i;
        select.appendChild(opt);
    }

    document.getElementById("btnHistorialMensual")
        .addEventListener("click", () => {
            document.getElementById("modalHistorial").classList.toggle("hidden");
        });

    document.getElementById("btnDescargarExcel")
        .addEventListener("click", descargarExcelMensual); 

});

// -------------------- EXCEL GENERATOR --------------------
async function generarExcel(pedidos, mes, anio) {

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pedidos");

    worksheet.columns = [
        { header: "Fecha", key: "fecha", width: 18 },
        { header: "Tipo Pedido", key: "tipo", width: 20 },
        { header: "Método Pago", key: "metodo", width: 20 },
        { header: "Total (S/)", key: "total", width: 15 }
    ];

    worksheet.mergeCells("A1:D1");

    const titulo = worksheet.getCell("A1");
    titulo.value = `Reporte de Pedidos - ${mes}/${anio}`;
    titulo.font = { bold: true, size: 16 };
    titulo.alignment = { horizontal: "center" };

    let totalGeneral = 0;

    pedidos.forEach(p => {
        const total = Number(p.total);
        totalGeneral += total;

        const row = worksheet.addRow([
            p.fecha_pedido,
            p.tipo_pedido,
            p.metodo_pago,
            total
        ]);

        row.getCell(4).numFmt = '"S/" #,##0.00';
    });

    worksheet.addRow(["", "", "TOTAL", totalGeneral]);

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(new Blob([buffer]), `Pedidos_${mes}_${anio}.xlsx`);
}