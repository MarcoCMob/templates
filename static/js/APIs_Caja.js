const BASE_URL = 'https://erp-marcodesarrolloweb.onrender.com/api';
let cajaAbiertActual = null;

const token = localStorage.getItem("jwtToken");

const divCajaTurnoCerrado = document.getElementById("divCajaTurnoCerrado");
const divCajaTurnoAbierto = document.getElementById("divCajaTurnoAbierto");
const btnRegistrarMovimiento = document.getElementById("btnRegistrarMovimiento");


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

function mostrarTurnoAbierto(caja) {
    divCajaTurnoCerrado.classList.add("hidden");
    divCajaTurnoAbierto.classList.remove("hidden");

    document.getElementById("infoMontoActual").textContent = `S/ ${Number(caja.montoActual)}`;
    document.getElementById("infoMontoInicial").textContent = `Monto inicial: S/ ${Number(caja.montoInicial)}`;
}


function mostrarTurnoCerrado(cajaCerrada) {
    divCajaTurnoAbierto.classList.add("hidden");
    divCajaTurnoCerrado.classList.remove("hidden");

    if (cajaCerrada) {
        document.getElementById("infoUltimoMonto").textContent = `S/ ${Number(cajaCerrada.ultimoMonto)}`;
        document.getElementById("fechaUltimoMonto").textContent = cajaCerrada.fechaCierre;
    } else {
        document.getElementById("infoUltimoMonto").textContent = "No existe";
        document.getElementById("fechaUltimoMonto").textContent = ""
    }
}


function agregarMovimientoAlDOM(mov) {
    const lista = document.getElementById("divListMovimientos");

    const item = document.createElement("div");
    item.classList.add("list-item");
    item.innerHTML = `
    <div>
    <p class="title">${mov.concepto}</p>
    <span class="badge">${mov.metodo}</span>
    <span class="badge ${mov.tipo === "EGRESO" ? "badge-orange" : "badge-green"}">${mov.tipo}</span>
    </div>
    <strong>${mov.tipo === "INGRESO" ? "+" : "-"} S/ ${Number(mov.monto).toFixed(2)}</strong>
    `;
    lista.appendChild(item);

    // Aplicar filtros después de agregar un nuevo movimiento
    if (typeof aplicarFiltros === 'function') {
        aplicarFiltros();
    }
}


const verificarAutenticacion = async (response) => {
    if (response.status === 401 || response.status === 403) {
        await cerrarSesion();
        return false;
    }
    return true;
};

const obtenerCaja = async (idCaja) => {
    try {
        const response = await fetch(`${BASE_URL}/caja/${idCaja}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!(await verificarAutenticacion(response))) return null;

        if (!response.ok) {
            console.error("Error al obtener caja:", await response.json());
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error("Error de red al obtener caja:", error);
        return null;
    }
};

const obtenerMovimientos = async (idCaja) => {
    try {
        const response = await fetch(`${BASE_URL}/caja/movimientos/${idCaja}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!(await verificarAutenticacion(response))) return [];

        if (!response.ok) {
            mostrarToast("Error al obtener movimientos:", await response.json(), "error");
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Error de red al obtener movimientos:", error);
        return [];
    }
};

const aperturarCaja = async (montoInicial) => {
    try {
        const response = await fetch(`${BASE_URL}/caja/aperturarCaja`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ montoInicial })
        });

        if (!(await verificarAutenticacion(response))) return null;

        const data = await response.json();

        if (!response.ok) {
            (data.mensajes || []).forEach(m => {
                mostrarToast(m, "error");
            });
            return null;
        }

        return data;
    } catch (error) {
        console.error("Error de red al aperturar caja:", error);
        return null;
    }
};

const cerrarCaja = async (idCaja) => {
    try {
        const response = await fetch(`${BASE_URL}/caja/cerrarCaja/${idCaja}`, {
            method: "PUT",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!(await verificarAutenticacion(response))) return null;

        const data = await response.json();

        if (!response.ok) {
            (data.mensajes || []).forEach(m => {
                mostrarToast(m, "error");
            });
            return null;
        }

        return data;
    } catch (error) {
        console.error("Error de red al cerrar caja:", error);
        return null;
    }
};

const registrarMovimiento = async (idCaja, requestMovimiento) => {
    try {
        const response = await fetch(`${BASE_URL}/caja/registrarMovimiento/${idCaja}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(requestMovimiento)
        });

        if (!(await verificarAutenticacion(response))) return null;

        const data = await response.json();

        if (!response.ok) {
            (data.mensajes || []).forEach(m => {
                mostrarToast(m, "error");
            });
            return null;
        }

        mostrarToast("Movimiento creado con éxito", "success");
        return data;
    } catch (error) {
        console.error("Error de red al registrar movimiento:", error);
        return null;
    }
};

const obtenerUltimaCajaCerrada = async () => {
    try {
        const response = await fetch(`${BASE_URL}/caja/obtenerUltimaCajaCerrada`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!(await verificarAutenticacion(response))) return null;
        if (!response.ok) return null;

        return await response.json();
    } catch (error) {
        console.log(error);
        return null;
    }
};

const obtenerCajaAbierta = async () => {
    try {
        const response = await fetch(`${BASE_URL}/caja/obtenerCajaAbierta`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!(await verificarAutenticacion(response))) return null;
        if (!response.ok) return null;

        return await response.json();
    } catch (error) {
        console.log(error);
        return null;
    }
};


const cargarEstadoInicial = async () => {

    cajaAbiertActual = await obtenerCajaAbierta();

    if (!cajaAbiertActual) {
        const cajaCerrada = await obtenerUltimaCajaCerrada();
        mostrarTurnoCerrado(cajaCerrada);
        return;
    }

    mostrarTurnoAbierto(cajaAbiertActual);

    const movimientos = await obtenerMovimientos(cajaAbiertActual.idCaja);
    movimientos.forEach(agregarMovimientoAlDOM);
};


const btnAbrirTurno = document.getElementById("btnAbrirTurno");
btnAbrirTurno.addEventListener("click", async (e) => {
    e.preventDefault();
    btnAbrirTurno.disabled = true;

    const txtMontoInicial = document.getElementById("txtMontoInicial");
    const montoInicial = parseFloat(txtMontoInicial.value);

    const caja = await aperturarCaja(montoInicial);
    btnAbrirTurno.disabled = false;

    if (!caja) return;

    cajaAbiertActual = caja;
    sessionStorage.setItem("idCaja", caja.idCaja);
    txtMontoInicial.value = "";
    mostrarTurnoAbierto(caja);
});


const btnCerrarTurno = document.getElementById("btnCerrarTurno");
btnCerrarTurno.addEventListener("click", async (e) => {
    e.preventDefault();
    btnCerrarTurno.disabled = true;

    const resultado = await cerrarCaja(cajaAbiertActual.idCaja);
    btnCerrarTurno.disabled = false;

    if (!resultado) return;

    mostrarTurnoCerrado(resultado);

    cajaAbiertActual = null;

    // Limpiar la lista de movimientos
    const lista = document.getElementById("divListMovimientos");
    lista.innerHTML = '';
});


btnRegistrarMovimiento.addEventListener("click", async (e) => {
    e.preventDefault();
    btnRegistrarMovimiento.disabled = true;

    const concepto = document.getElementById("txtConcepto").value;
    const tipo = document.getElementById("TipoMovimiento").value;   // INGRESO | EGRESO
    const metodo = document.getElementById("TipoPago").value;   // EFECTIVO | TARJETA | YAPE
    const monto = Number(document.getElementById("txtMonto").value);

    const requestMovimiento = { concepto, tipo, metodo, monto };

    const movimiento = await registrarMovimiento(cajaAbiertActual.idCaja, requestMovimiento);
    btnRegistrarMovimiento.disabled = false;

    if (!movimiento) return;

    agregarMovimientoAlDOM(movimiento);

    const caja = await obtenerCaja(cajaAbiertActual.idCaja);
    if (caja) {
        document.querySelector(".stat-card h4.text-success").textContent =
            `S/ ${Number(caja.montoActual).toFixed(2)}`;
    }

    document.getElementById("txtConcepto").value = "";
    document.getElementById("txtMonto").value = "";
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

const btnCerrarSesion = document.getElementById("btnCerrarSesion");

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

// ============================================
// BÚSQUEDA Y FILTRADO DE MOVIMIENTOS
// ============================================

const aplicarFiltros = () => {
    const txtBuscarMovimiento = document.getElementById("txtBuscarMovimiento");
    const filtroTipo = document.getElementById("filtroTipo");
    const filtroMetodo = document.getElementById("filtroMetodo");
    const noResultsMessage = document.getElementById("noResultsMessage");

    if (!txtBuscarMovimiento || !filtroTipo || !filtroMetodo) return;

    const textoBusqueda = txtBuscarMovimiento.value.toLowerCase().trim();
    const tipoSeleccionado = filtroTipo.value;
    const metodoSeleccionado = filtroMetodo.value;

    const movimientos = document.querySelectorAll("#divListMovimientos .list-item");
    let visibles = 0;

    movimientos.forEach(movimiento => {
        const concepto = movimiento.querySelector(".title")?.textContent?.toLowerCase() || "";
        const badges = movimiento.querySelectorAll(".badge");
        let metodo = "";
        let tipo = "";

        badges.forEach(badge => {
            const texto = badge.textContent.trim().toUpperCase();
            if (["EFECTIVO", "TARJETA", "YAPE"].includes(texto)) {
                metodo = texto;
            } else if (["INGRESO", "EGRESO"].includes(texto)) {
                tipo = texto;
            }
        });

        const monto = movimiento.querySelector("strong")?.textContent?.toLowerCase() || "";

        const coincideTexto = !textoBusqueda ||
            concepto.includes(textoBusqueda) ||
            metodo.toLowerCase().includes(textoBusqueda) ||
            tipo.toLowerCase().includes(textoBusqueda) ||
            monto.includes(textoBusqueda);

        const coincideTipo = !tipoSeleccionado || tipo === tipoSeleccionado;
        const coincideMetodo = !metodoSeleccionado || metodo === metodoSeleccionado;

        if (coincideTexto && coincideTipo && coincideMetodo) {
            movimiento.classList.remove("hidden");
            visibles++;
        } else {
            movimiento.classList.add("hidden");
        }
    });

    if (noResultsMessage) {
        if (visibles === 0 && movimientos.length > 0) {
            noResultsMessage.classList.remove("hidden");
        } else {
            noResultsMessage.classList.add("hidden");
        }
    }
};

const obtenerPayload = (token) => {

    try {

        return JSON.parse(atob(token.split('.')[1]));

    } catch (error) {

        localStorage.removeItem('jwtToken');
        window.location.href = 'index.html';
        return;

    }

};

document.addEventListener("DOMContentLoaded", async (e) => {
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
    cargarEstadoInicial();

    const txtBuscarMovimiento = document.getElementById("txtBuscarMovimiento");
    const filtroTipo = document.getElementById("filtroTipo");
    const filtroMetodo = document.getElementById("filtroMetodo");

    if (txtBuscarMovimiento) txtBuscarMovimiento.addEventListener("input", aplicarFiltros);
    if (filtroTipo) filtroTipo.addEventListener("change", aplicarFiltros);
    if (filtroMetodo) filtroMetodo.addEventListener("change", aplicarFiltros);
});