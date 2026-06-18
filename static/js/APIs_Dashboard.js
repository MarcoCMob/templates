const BASE_URL = 'https://erp-marcodesarrolloweb.onrender.com/api';

// 1. Función para verificar si hay un usuario logueado en el backend
const verificarSesionActiva = async () => {
    try {
        const response = await fetch(`${BASE_URL}/usuario/sesionActiva`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Error al verificar la sesión:", error);
        return null;
    }
}

// 2. Función para ocultar secciones del menú según el rol
const cargarSecciones = (sesionActiva) => {
    if (sesionActiva.rol === "Administrador") return;

    const ocultarMenus = (urls) => {
        urls.forEach(url => {
            const el = document.querySelector(`a[href='${url}']`);
            if (el) el.classList.add("hidden");
        });
    }

    if (sesionActiva.rol === "Mesero") {
        ocultarMenus(['caja.html', 'inventario.html', 'catalogo/catalogoProducto.html', 'usuario.html', 'configuracion.html']);
    }

    if (sesionActiva.rol === "Cajero") {
        ocultarMenus(['inventario.html', 'catalogo/catalogoProducto.html', 'usuario.html', 'configuracion.html']);
    }
}

// 3. Función para cerrar sesión
const cerrarSesion = async (e) => {
    e.preventDefault();
    try {
        const response = await fetch(`${BASE_URL}/usuario/cerrarSesion`, { method: 'PUT' });
        if (response.ok) {
            window.location.href = 'index.html';
        } else {
            console.error("Ocurrió un error al cerrar sesión");
        }
    } catch (error) {
        console.error(error);
    }
}

// 4. Función para dibujar las gráficas de Chart.js
const renderizarGraficas = (data) => {
    // Gráfico de Barras (Ingresos vs Egresos)
    const ctxCaja = document.getElementById('graficoCaja').getContext('2d');
    new Chart(ctxCaja, {
        type: 'bar',
        data: {
            labels: ['Ingresos', 'Egresos'],
            datasets: [{
                label: 'Soles (S/)',
                data: [data.ingresos, data.egresos],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.6)', // Verde 
                    'rgba(239, 68, 68, 0.6)'  // Rojo 
                ],
                borderColor: [
                    'rgb(34, 197, 94)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false } // Oculta la leyenda superior para verse más limpio
            }
        }
    });

    // Gráfico de Dona (Tipos de Pedido)
    const ctxPedidos = document.getElementById('graficoPedidos').getContext('2d');
    new Chart(ctxPedidos, {
        type: 'doughnut',
        data: {
            labels: ['Local (Mesa)', 'Para Llevar', 'Delivery'],
            datasets: [{
                data: [data.pedidosLocal, data.pedidosLlevar, data.pedidosDelivery],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)', // Azul
                    'rgba(249, 115, 22, 0.7)', // Naranja brand
                    'rgba(168, 85, 247, 0.7)'  // Morado
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}


const cargarEstadisticas = async () => {
    try {

        const response = await fetch(`${BASE_URL}/dashboard-api/estadisticas`);
        if (response.ok) {
            const data = await response.json();

            document.querySelector('.text-success').textContent = `S/ ${Number(data.ventasHoy).toFixed(2)}`;
            document.querySelectorAll('.stat-card h4')[1].textContent = data.pedidosTotales;
            document.querySelector('.text-warning').textContent = `${data.mesasOcupadas}/6`;
            document.querySelectorAll('.stat-card h4')[3].textContent = data.productosTotales;
            
            renderizarGraficas(data);
        } else {
            console.error("Error al obtener estadísticas del servidor");
        }
    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
    }
}

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

    const userInfoP = document.querySelector(".user-meta p");
    const userInfoSpan = document.querySelector(".user-meta span");
    const userAvatar = document.querySelector(".user-avatar");

    if (userInfoP) userInfoP.textContent = sesionActiva.nombre;
    if (userInfoSpan) userInfoSpan.textContent = sesionActiva.rol;
    if (userAvatar) userAvatar.textContent = sesionActiva.rol.charAt(0).toUpperCase();

    cargarSecciones(sesionActiva);

    cargarEstadisticas();
    // btnHISTORIAL
    function cargarAnios() {

        const select = document.getElementById("selectAnio");

        const anioActual = new Date().getFullYear();

        for(let i = anioActual; i >= 2020; i--) {

            const option = document.createElement("option");

            option.value = i;
            option.textContent = i;

            select.appendChild(option);
        }
    }
    document
        .getElementById("btnHistorialMensual")
        .addEventListener("click", () => {

            document
                .getElementById("modalHistorial")
                .classList.toggle("hidden");
        });

    document
        .getElementById("btnDescargarExcel")
        .addEventListener("click", descargarExcelMensual);

    // generacion del excel
    async function descargarExcelMensual() {

        const mes = document.getElementById("selectMes").value;
        const anio = document.getElementById("selectAnio").value;

        const response = await fetch(
            `${BASE_URL}/dashboard-api/pedidosMensuales?mes=${mes}&anio=${anio}`
        );

        if (!response.ok) {
            throw new Error("Error al obtener los pedidos");
        }

        const pedidos = await response.json();

        generarExcel(pedidos, mes, anio);
    }

    async function generarExcel(pedidos, mes, anio) {

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Pedidos");

        // Anchos de columna
        worksheet.columns = [
            { header: "Fecha", key: "fecha", width: 18 },
            { header: "Tipo Pedido", key: "tipo", width: 20 },
            { header: "Método Pago", key: "metodo", width: 20 },
            { header: "Total (S/)", key: "total", width: 15 }
        ];

        // Título
        worksheet.mergeCells("A1:D1");

        const titulo = worksheet.getCell("A1");

        titulo.value = `Reporte de Pedidos - ${mes}/${anio}`;
        titulo.font = {
            bold: true,
            size: 16
        };
        titulo.alignment = {
            horizontal: "center"
        };

        // Encabezados (fila 3)
        const headerRow = worksheet.getRow(3);

        headerRow.values = [
            "Fecha",
            "Tipo Pedido",
            "Método Pago",
            "Total (S/)"
        ];

        headerRow.eachCell((cell) => {

            cell.font = {
                bold: true,
                color: {
                    argb: "000000"
                }
            };

            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                    argb: "FFFF00"
                }
            };

            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };

            cell.alignment = {
                horizontal: "center"
            };
        });

        // Datos
        let totalGeneral = 0;

        pedidos.forEach((p) => {

            const total = Number(p.total);

            totalGeneral += total;

            const row = worksheet.addRow([
                p.fecha_pedido,
                p.tipo_pedido,
                p.metodo_pago,
                total
            ]);

            row.eachCell((cell) => {
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            });

            row.getCell(4).numFmt = '"S/" #,##0.00';
        });

        // Total General
        const totalRow = worksheet.addRow([
            "",
            "",
            "TOTAL GENERAL",
            totalGeneral
        ]);

        totalRow.eachCell((cell) => {

            cell.font = {
                bold: true
            };

            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
        });

        totalRow.getCell(4).numFmt = '"S/" #,##0.00';

        // Generar archivo
        const buffer = await workbook.xlsx.writeBuffer();

        saveAs(
            new Blob([
                buffer
            ]),
            `Pedidos_${mes}_${anio}.xlsx`
        );
    }   

    cargarSecciones(sesionActiva);

    cargarEstadisticas();
    cargarAnios();
});