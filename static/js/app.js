const todayDate = document.getElementById('today-date');

const resetModal = document.getElementById('reset-modal');
const openReset = document.getElementById('open-reset');
const cancelReset = document.getElementById('cancel-reset');
const confirmReset = document.getElementById('confirm-reset');
const resetForm = document.getElementById('reset-form');

const mesaGrid = document.getElementById('mesa-grid');
const mesaDetails = document.getElementById('divMesaPedidos');
const mesaSelected = document.getElementById('mesa-selected');
const mesaEstado = document.getElementById('mesa-estado');
const mesaInput = document.getElementById('mesa-input');
const mesaOcuparInput = document.getElementById('mesa-ocupar-input');
const mesaOcuparWrapper = document.getElementById('mesa-ocupar-wrapper');
const mesaPedidosLists = Array.from(document.querySelectorAll('.mesa-pedidos-list'));
const mesaPedidosEmpty = document.getElementById('mesa-sin-pedidos');
const mesaTotal = document.getElementById('mesa-total');

const cobroModal = document.getElementById('cobro-modal');
const cobroMesaLabel = document.getElementById('cobro-mesa-label');
const cobroList = document.getElementById('cobro-list');
const cobroTotal = document.getElementById('cobro-total');
const cobroMesaInput = document.getElementById('cobro-mesa-input');
const cobroCancel = document.getElementById('cobro-cancel');

const mesaOcupadaModal = document.getElementById('mesa-ocupada-modal');
const mesaOcupadaLabel = document.getElementById('mesa-ocupada-label');
const mesaOcupadaAgregar = document.getElementById('mesa-ocupada-agregar');
const mesaOcupadaCobrar = document.getElementById('mesa-ocupada-cobrar');
const mesaOcupadaCancel = document.getElementById('mesa-ocupada-cancel');

let mesaOcupadaActual = null;

const catalogActions = Array.from(document.querySelectorAll('.catalog-action'));
const catalogForms = {
  'cat-productos': document.getElementById('form-cat-productos'),
  'cat-categorias': document.getElementById('form-cat-categorias')
};

const updateDate = () => {
  if (!todayDate) return;
  todayDate.textContent = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const initLucideIcons = (attempt = 0) => {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
    return;
  }

  if (attempt < 15) {
    setTimeout(() => initLucideIcons(attempt + 1), 120);
  }
};

let lucideObserver = null;
const scheduleLucideRefresh = (() => {
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    });
  };
})();

const initLucideObserver = () => {
  if (!('MutationObserver' in window)) return;
  if (lucideObserver || !document.body) return;

  lucideObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches('[data-lucide], .lucide')) {
          scheduleLucideRefresh();
          return;
        }
        if (node.querySelector && node.querySelector('[data-lucide], .lucide')) {
          scheduleLucideRefresh();
          return;
        }
      }
    }
  });

  lucideObserver.observe(document.body, { childList: true, subtree: true });
};

const updateCatalogActions = (activeTabId) => {
  if (!catalogActions.length) return;
  catalogActions.forEach((button) => {
    const shouldShow = button.dataset.target === activeTabId;
    button.classList.toggle('hidden', !shouldShow);
  });
};

const closeCatalogForms = () => {
  Object.values(catalogForms).forEach((form) => {
    if (form) form.classList.add('hidden');
  });
};

const openCatalogForm = (tabId) => {
  Object.entries(catalogForms).forEach(([key, form]) => {
    if (!form) return;
    const shouldShow = key === tabId;
    form.classList.toggle('hidden', !shouldShow);
    if (shouldShow) {
      const focusable = form.querySelector('input, select');
      if (focusable) focusable.focus();
    }
  });
};

const handleTabClick = (event) => {
  const tabButton = event.target.closest('.tab');
  if (!tabButton) return;
  const module = tabButton.closest('.module');
  const tabId = tabButton.dataset.tab;
  if (!module || !tabId) return;

  module.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
  tabButton.classList.add('active');

  module.querySelectorAll('.tab-content').forEach((panel) => panel.classList.remove('active'));
  const target = module.querySelector(`#${tabId}`);
  if (target) target.classList.add('active');
  if (module.id === 'module-catalogo') {
    updateCatalogActions(tabId);
    closeCatalogForms();
  }
};

const handleCatalogAction = (event) => {
  const button = event.target.closest('[data-action="open-form"]');
  if (!button) return;
  openCatalogForm(button.dataset.target);
};

const handleFormCancel = (event) => {
  const button = event.target.closest('[data-action="cancel-form"]');
  if (!button) return;
  const form = button.closest('.inline-form');
  if (form) form.classList.add('hidden');
};

const openModal = () => {
  if (resetModal) resetModal.classList.remove('hidden');
};

const closeModal = () => {
  if (resetModal) resetModal.classList.add('hidden');
};


const updateMesaEstadoBadge = (estado) => {
  if (!mesaEstado) return;
  const estadoTexto = estado || 'Libre';
  mesaEstado.textContent = estadoTexto;
  mesaEstado.classList.remove('badge-green', 'badge-orange');
  if (estadoTexto === 'OCUPADO') {
    mesaEstado.classList.add('badge-orange');
  } else {
    mesaEstado.classList.add('badge-green');
  }
};

const setMesaSelected = (mesaNumero) => {
  if (!mesaGrid) return;
  mesaGrid.querySelectorAll('[data-mesa]').forEach((button) => {
    button.classList.remove('is-selected');
  });
  const selected = mesaGrid.querySelector(`[data-mesa="${mesaNumero}"]`);
  if (selected) selected.classList.add('is-selected');
};

const updateMesaPedidosPanel = (mesaNumero) => {
  let activeList = null;
  mesaPedidosLists.forEach((list) => {
    const isMatch = list.dataset.mesa === String(mesaNumero);
    list.classList.toggle('hidden', !isMatch);
    if (isMatch) {
      activeList = list;
    }
  });

  const hasPedidos = activeList ? activeList.querySelectorAll('.list-item').length > 0 : false;
  if (mesaPedidosEmpty) {
    mesaPedidosEmpty.classList.toggle('hidden', hasPedidos);
  }

  if (mesaTotal) {
    const total = activeList ? activeList.dataset.total : '0.00';
    mesaTotal.textContent = `S/ ${total || '0.00'}`;
  }

  return hasPedidos;
};

const showMesaDetails = (mesaNumero, estado, button) => {
  if (!mesaDetails) return;
  // mesaDetails.classList.remove('hidden');
  if (mesaSelected) mesaSelected.textContent = `Mesa ${mesaNumero}`;
  updateMesaEstadoBadge(estado);
  setMesaSelected(mesaNumero);
  if (mesaInput) mesaInput.value = mesaNumero;
  if (mesaOcuparInput) mesaOcuparInput.value = mesaNumero;
  if (cobroMesaInput) cobroMesaInput.value = mesaNumero;

  const hasPedidosPanel = updateMesaPedidosPanel(mesaNumero);
  const hasPedidosButton = button ? button.dataset.hasPedidos === 'true' : false;
  const hasPedidos = hasPedidosPanel || hasPedidosButton;
  if (mesaOcuparWrapper) {
    const shouldShow = hasPedidos && estado !== 'OCUPADO';
    // mesaOcuparWrapper.classList.toggle('hidden', !shouldShow);
  }
};

const openCobroModal = (mesaNumero) => {
  if (!cobroModal) return;
  const sourceList = mesaPedidosLists.find((list) => list.dataset.mesa === String(mesaNumero));
  if (cobroList) {
    cobroList.innerHTML = sourceList ? sourceList.innerHTML : '';
  }
  if (cobroTotal) {
    const total = sourceList ? sourceList.dataset.total : '0.00';
    cobroTotal.textContent = `S/ ${total || '0.00'}`;
  }
  if (cobroMesaLabel) cobroMesaLabel.textContent = `Mesa ${mesaNumero}`;
  if (cobroMesaInput) cobroMesaInput.value = mesaNumero;
  cobroModal.classList.remove('hidden');
};

const closeCobroModal = () => {
  if (cobroModal) cobroModal.classList.add('hidden');
};

const openMesaOcupadaModal = (mesaNumero) => {
  if (!mesaOcupadaModal) return;
  mesaOcupadaActual = mesaNumero;
  if (mesaOcupadaLabel) mesaOcupadaLabel.textContent = `Mesa ${mesaNumero}`;
  mesaOcupadaModal.classList.remove('hidden');
};

const closeMesaOcupadaModal = () => {
  if (mesaOcupadaModal) mesaOcupadaModal.classList.add('hidden');
};

const handleMesaClick = (event) => {
  const button = event.target.closest('[data-mesa]');
  if (!button || !mesaGrid || !mesaGrid.contains(button)) return;
  const mesaNumero = button.dataset.mesa;
  const estado = button.dataset.estado || 'Libre';
  showMesaDetails(mesaNumero, estado, button);
  if (estado === 'OCUPADO') {
    openMesaOcupadaModal(mesaNumero);
  }
};

const initMesas = () => {
  if (!mesaGrid) return;
  const mesaSeleccionada = mesaGrid.dataset.mesaSeleccionada;
  if (!mesaSeleccionada) return;
  const button = mesaGrid.querySelector(`[data-mesa="${mesaSeleccionada}"]`);
  if (!button) return;
  const estado = button.dataset.estado || 'Libre';
  showMesaDetails(mesaSeleccionada, estado, button);
};

const init = () => {
  updateDate();

  const catalogActiveTab = document.querySelector('#module-catalogo .tab.active');
  if (catalogActiveTab) {
    updateCatalogActions(catalogActiveTab.dataset.tab);
  }

  document.addEventListener('click', handleTabClick);
  document.addEventListener('click', handleCatalogAction);
  document.addEventListener('click', handleFormCancel);
  document.addEventListener('click', handleMesaClick);

  if (openReset) openReset.addEventListener('click', openModal);
  if (cancelReset) cancelReset.addEventListener('click', closeModal);
  if (confirmReset) {
    confirmReset.addEventListener('click', () => {
      if (resetForm) resetForm.submit();
      closeModal();
    });
  }
  if (resetModal) {
    resetModal.addEventListener('click', (event) => {
      if (event.target === resetModal) closeModal();
    });
  }

  if (cobroCancel) cobroCancel.addEventListener('click', closeCobroModal);
  if (cobroModal) {
    cobroModal.addEventListener('click', (event) => {
      if (event.target === cobroModal) closeCobroModal();
    });
  }

  if (mesaOcupadaAgregar) {
    mesaOcupadaAgregar.addEventListener('click', () => {
      closeMesaOcupadaModal();
    });
  }
  if (mesaOcupadaCobrar) {
    mesaOcupadaCobrar.addEventListener('click', () => {
      closeMesaOcupadaModal();
      if (mesaOcupadaActual) {
        openCobroModal(mesaOcupadaActual);
      }
    });
  }
  if (mesaOcupadaCancel) {
    mesaOcupadaCancel.addEventListener('click', closeMesaOcupadaModal);
  }
  if (mesaOcupadaModal) {
    mesaOcupadaModal.addEventListener('click', (event) => {
      if (event.target === mesaOcupadaModal) closeMesaOcupadaModal();
    });
  }

  initMesas();

  initLucideObserver();
  initLucideIcons();
};

document.addEventListener('DOMContentLoaded', init);
