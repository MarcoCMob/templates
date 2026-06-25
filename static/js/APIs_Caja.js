const BASE_URL = 'https://erp-marcodesarrolloweb.onrender.com/api';
let cajaAbiertActual = null;


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


const obtenerCaja = async (idCaja) => {
    try {
        const response = await fetch(`${BASE_URL}/caja/${idCaja}`);
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
        const response = await fetch(`${BASE_URL}/caja/movimientos/${idCaja}`);
        if (!response.ok) {
            mostrarToast("Error al obtener movimientos:", await response.json(), "error")
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ montoInicial })
        });

        const data = await response.json();

        if (!response.ok) {
            data.mensajes.forEach(m => {
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
            method: "PUT"
        });

        const data = await response.json();

        if (!response.ok) {
            data.mensajes.forEach(m => {
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestMovimiento)
        });

        const data = await response.json();

        if (!response.ok) {
            data.mensajes.forEach(m => {
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

        const response = await fetch(`${BASE_URL}/caja/obtenerUltimaCajaCerrada`);
        const data = await response.json();

        if (!response.ok) {
            return null;
        }

        return data;


    } catch (error) {
        console.log(error);
    }

}

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

    const txtMontoInicial = document.getElementById("txtMontoInicial");
    const montoInicial = parseFloat(txtMontoInicial.value);

    const caja = await aperturarCaja(montoInicial);
    if (!caja) return;

    cajaAbiertActual = caja;
    sessionStorage.setItem("idCaja", caja.idCaja);
    txtMontoInicial.value = "";
    mostrarTurnoAbierto(caja);
});


const btnCerrarTurno = document.getElementById("btnCerrarTurno");
btnCerrarTurno.addEventListener("click", async (e) => {
    e.preventDefault();

    const resultado = await cerrarCaja(cajaAbiertActual.idCaja);
    if (!resultado) return;

    mostrarTurnoCerrado(resultado);

    cajaAbiertActual = null;

    // Limpiar la lista de movimientos
    const lista = document.getElementById("divListMovimientos");
    lista.innerHTML = '';
});


btnRegistrarMovimiento.addEventListener("click", async (e) => {
    e.preventDefault();

    const concepto = document.getElementById("txtConcepto").value;
    const tipo = document.getElementById("TipoMovimiento").value;   // INGRESO | EGRESO
    const metodo = document.getElementById("TipoPago").value;   // EFECTIVO | TARJETA | YAPE
    const monto = Number(document.getElementById("txtMonto").value);

    const requestMovimiento = { concepto, tipo, metodo, monto };

    const movimiento = await registrarMovimiento(cajaAbiertActual.idCaja, requestMovimiento);
    if (!movimiento) return;

    agregarMovimientoAlDOM(movimiento);

    const caja = await obtenerCaja(cajaAbiertActual.idCaja);
    if (caja) {
        document.querySelector(".stat-card h4.text-success").textContent =
            `S/ ${Number(caja.montoActual).toFixed(2)}`;
    }
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

    if (sesionActiva.rol === "Administrador") {
        return;
    }

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

}

document.getElementById("btnCerrarSesion").addEventListener("click", async (e) => {
    e.preventDefault();

    try {

        const response = await fetch(`https://erp-marcodesarrolloweb.onrender.com/api/usuario/cerrarSesion`, {
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

    cargarEstadoInicial();
    
    // Event listeners del buscador
    const txtBuscarMovimiento = document.getElementById("txtBuscarMovimiento");
    const filtroTipo = document.getElementById("filtroTipo");
    const filtroMetodo = document.getElementById("filtroMetodo");
    
    if (txtBuscarMovimiento) txtBuscarMovimiento.addEventListener("input", aplicarFiltros);
    if (filtroTipo) filtroTipo.addEventListener("change", aplicarFiltros);
    if (filtroMetodo) filtroMetodo.addEventListener("change", aplicarFiltros);
});