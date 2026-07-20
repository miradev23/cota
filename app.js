/**
 * app.js — Cotizador COTA
 * Une el formulario con el motor de cálculo (calc.js).
 * No guarda nada: todo vive en memoria del navegador mientras la pestaña está abierta.
 */

// 1) PEGA AQUÍ LA URL DE TU APPS SCRIPT DESPLEGADO (termina en /exec).
//    Mientras esté vacía o con este texto, la app usa el catálogo de respaldo de abajo.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6OO-F-pzf0Z5F0r7e_HHwntgI6HgKisX2dwAQ2TYsfeQgp8pkqlnvO4sHrFA7Q4WYoA/exec';

// Catálogo de respaldo — se usa si no hay URL configurada o si falla la conexión.
// Edítalo aquí si quieres probar la app antes de tener la Google Sheet lista.
const CATALOGO_RESPALDO = {
  materiales: [
    { tipo_material: 'Melamina 15mm Blanco', espesor: '15mm', color_acabado: 'Blanco', precio_hoja: 850, merma_pct_default: 8 },
    { tipo_material: 'Melamina 15mm Nogal', espesor: '15mm', color_acabado: 'Nogal', precio_hoja: 890, merma_pct_default: 8 },
    { tipo_material: 'MDF 15mm', espesor: '15mm', color_acabado: '—', precio_hoja: 720, merma_pct_default: 6 },
  ],
  componentes: [
    { categoria: 'Herraje', nombre: 'Bisagra cierre lento', unidad: 'pieza', costo_unitario: 25 },
    { categoria: 'Herraje', nombre: 'Corredera cierre lento (par)', unidad: 'par', costo_unitario: 180 },
    { categoria: 'Herraje', nombre: 'Jaladera perfil aluminio (metro)', unidad: 'metro', costo_unitario: 95 },
    { categoria: 'Accesorio', nombre: 'Riel LED 1m', unidad: 'pieza', costo_unitario: 90 },
    { categoria: 'Accesorio', nombre: 'Organizador de cajón', unidad: 'pieza', costo_unitario: 220 },
    { categoria: 'Consumible', nombre: 'Tornillo 3.5x30 (bolsa)', unidad: 'bolsa', costo_unitario: 45 },
    { categoria: 'Consumible', nombre: 'Cinta de canto (rollo)', unidad: 'rollo', costo_unitario: 150 },
  ],
  manoObra: [
    { actividad: 'Diseño', tarifa_hora: 150 },
    { actividad: 'Preparación', tarifa_hora: 120 },
    { actividad: 'Corte/supervisión', tarifa_hora: 120 },
    { actividad: 'Armado', tarifa_hora: 130 },
    { actividad: 'Acabado', tarifa_hora: 130 },
    { actividad: 'Instalación', tarifa_hora: 150 },
  ],
  configGlobal: {
    pct_indirectos: 12,
    pct_desgaste_herramienta: 3,
    pct_imprevistos_confianza_alta: 6,
    pct_imprevistos_confianza_media: 12,
    pct_imprevistos_confianza_baja: 20,
    pct_margen_default: 30,
    pct_margen_minimo_aceptable: 18,
    costo_km: 6,
    costo_fijo_viaje: 100,
  },
  mueblesDefaults: [
    { tipo_mueble: 'Cocina', ancho_default_cm: 300, alto_default_cm: 240, profundidad_default_cm: 60 },
    { tipo_mueble: 'Closet', ancho_default_cm: 200, alto_default_cm: 240, profundidad_default_cm: 60 },
    { tipo_mueble: 'Vestidor', ancho_default_cm: 250, alto_default_cm: 240, profundidad_default_cm: 60 },
    { tipo_mueble: 'Mueble de TV', ancho_default_cm: 240, alto_default_cm: 220, profundidad_default_cm: 40 },
    { tipo_mueble: 'Centro de entretenimiento', ancho_default_cm: 280, alto_default_cm: 220, profundidad_default_cm: 45 },
    { tipo_mueble: 'Escritorio', ancho_default_cm: 120, alto_default_cm: 75, profundidad_default_cm: 60 },
    { tipo_mueble: 'Home office', ancho_default_cm: 180, alto_default_cm: 200, profundidad_default_cm: 45 },
    { tipo_mueble: 'Librero', ancho_default_cm: 100, alto_default_cm: 200, profundidad_default_cm: 30 },
    { tipo_mueble: 'Zapatera', ancho_default_cm: 90, alto_default_cm: 100, profundidad_default_cm: 35 },
    { tipo_mueble: 'Mueble de baño', ancho_default_cm: 80, alto_default_cm: 85, profundidad_default_cm: 45 },
    { tipo_mueble: 'Mueble de entrada', ancho_default_cm: 100, alto_default_cm: 90, profundidad_default_cm: 30 },
    { tipo_mueble: 'Bar', ancho_default_cm: 150, alto_default_cm: 100, profundidad_default_cm: 45 },
    { tipo_mueble: 'Alacena', ancho_default_cm: 100, alto_default_cm: 220, profundidad_default_cm: 40 },
    { tipo_mueble: 'Mueble de almacenamiento', ancho_default_cm: 120, alto_default_cm: 200, profundidad_default_cm: 45 },
    { tipo_mueble: 'Cajonera', ancho_default_cm: 80, alto_default_cm: 90, profundidad_default_cm: 45 },
    { tipo_mueble: 'Mueble comercial', ancho_default_cm: 200, alto_default_cm: 100, profundidad_default_cm: 50 },
    { tipo_mueble: 'Otro', ancho_default_cm: 100, alto_default_cm: 100, profundidad_default_cm: 45 },
  ],
};

let CATALOGO = null;
let ULTIMO_RESULTADO = null;

// ---------- Carga de catálogo ----------

async function cargarCatalogo() {
  const estadoEl = document.getElementById('estadoConexion');
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('PEGA_AQUI')) {
    estadoEl.textContent = 'usando catálogo de respaldo (configura la URL en app.js)';
    return CATALOGO_RESPALDO;
  }
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    estadoEl.textContent = 'catálogo cargado desde Google Sheets ✓';
    return normalizarCatalogo(data);
  } catch (err) {
    console.error('Error cargando catálogo desde Apps Script:', err);
    estadoEl.textContent = 'no se pudo cargar el catálogo — usando respaldo';
    return CATALOGO_RESPALDO;
  }
}

function normalizarCatalogo(data) {
  return {
    materiales: (data.materiales || []).map((m) => ({
      tipo_material: m.tipo_material,
      espesor: m.espesor,
      color_acabado: m.color_acabado,
      precio_hoja: Number(m.precio_hoja),
      merma_pct_default: Number(m.merma_pct_default),
    })),
    componentes: (data.componentes || []).map((c) => ({
      categoria: c.categoria,
      nombre: c.nombre,
      unidad: c.unidad,
      costo_unitario: Number(c.costo_unitario),
    })),
    manoObra: (data.manoObra || []).map((m) => ({
      actividad: m.actividad,
      tarifa_hora: Number(m.tarifa_hora),
    })),
    configGlobal: configArrayToMap(data.configGlobal || []),
    mueblesDefaults: (data.mueblesDefaults || []).map((d) => ({
      tipo_mueble: d.tipo_mueble,
      ancho_default_cm: Number(d.ancho_default_cm),
      alto_default_cm: Number(d.alto_default_cm),
      profundidad_default_cm: Number(d.profundidad_default_cm),
    })),
  };
}

// ---------- Utilidades ----------

function formatoMXN(n) {
  return (n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

function leerNum(id) {
  return Number(document.getElementById(id).value) || 0;
}

// ---------- Poblar formulario con el catálogo ----------

function poblarSelects() {
  const tipoMuebleSel = document.getElementById('tipoMueble');
  CATALOGO.mueblesDefaults.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d.tipo_mueble;
    opt.textContent = d.tipo_mueble;
    tipoMuebleSel.appendChild(opt);
  });

  const materialSel = document.getElementById('materialCatalogo');
  CATALOGO.materiales.forEach((m, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${m.tipo_material} — ${formatoMXN(m.precio_hoja)}/hoja`;
    materialSel.appendChild(opt);
  });

  const datalist = document.createElement('datalist');
  datalist.id = 'datalistComponentes';
  CATALOGO.componentes.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.nombre;
    datalist.appendChild(opt);
  });
  document.body.appendChild(datalist);

  const laborList = document.getElementById('listaManoObra');
  CATALOGO.manoObra
    .filter((m) => m.actividad !== 'Instalación')
    .forEach((m) => {
      const row = document.createElement('div');
      row.className = 'labor-row';
      row.dataset.actividad = m.actividad;
      row.innerHTML = `
        <span class="labor-name">${m.actividad}</span>
        <input type="number" class="labor-horas" value="0" min="0" step="0.5" placeholder="horas">
        <input type="number" class="labor-tarifa" value="${m.tarifa_hora}" min="0" step="1" placeholder="tarifa/hora">
      `;
      laborList.appendChild(row);
    });

  const instalacionTarifa = CATALOGO.manoObra.find((m) => m.actividad === 'Instalación');
  if (instalacionTarifa) document.getElementById('instTarifa').value = instalacionTarifa.tarifa_hora;

  document.getElementById('transCostoKm').value = CATALOGO.configGlobal.costo_km;
  document.getElementById('transCostoFijo').value = CATALOGO.configGlobal.costo_fijo_viaje;
}

// ---------- Filas dinámicas: componentes y servicios ----------

function agregarFilaComponente() {
  const row = document.createElement('div');
  row.className = 'repeat-row';
  row.innerHTML = `
    <input type="text" class="comp-nombre" list="datalistComponentes" placeholder="Buscar o escribir…">
    <input type="number" class="comp-cantidad" value="1" min="0" step="1">
    <input type="number" class="comp-costo" placeholder="costo unitario" min="0" step="0.5">
    <button type="button" class="btn-remove">×</button>
  `;
  row.querySelector('.comp-nombre').addEventListener('input', (e) => {
    const match = CATALOGO.componentes.find((c) => c.nombre === e.target.value);
    if (match) row.querySelector('.comp-costo').value = match.costo_unitario;
    recalcular();
  });
  row.querySelector('.btn-remove').addEventListener('click', () => {
    row.remove();
    recalcular();
  });
  document.getElementById('listaComponentes').appendChild(row);
}

function agregarFilaServicio() {
  const row = document.createElement('div');
  row.className = 'repeat-row';
  row.innerHTML = `
    <input type="text" class="serv-desc" placeholder="Descripción del servicio">
    <input type="number" class="serv-costo" placeholder="costo" min="0" step="1">
    <input type="number" class="serv-margen" placeholder="margen %" min="0" step="1" value="0">
    <button type="button" class="btn-remove">×</button>
  `;
  row.querySelector('.btn-remove').addEventListener('click', () => {
    row.remove();
    recalcular();
  });
  document.getElementById('listaServicios').appendChild(row);
}

// ---------- Medidas por defecto ----------

function actualizarHintMedida() {
  const tipoMedida = document.querySelector('input[name=tipoMedida]:checked').value;
  const hint = document.getElementById('hintMedida');
  const tipoMuebleVal = document.getElementById('tipoMueble').value;

  if (tipoMedida === 'desconocida' && tipoMuebleVal) {
    const def = CATALOGO.mueblesDefaults.find((d) => d.tipo_mueble === tipoMuebleVal);
    if (def) {
      document.getElementById('ancho').value = def.ancho_default_cm;
      document.getElementById('alto').value = def.alto_default_cm;
      document.getElementById('profundidad').value = def.profundidad_default_cm;
      hint.textContent = `Medida estimada automáticamente para "${tipoMuebleVal}". Confirmar antes de cotización definitiva.`;
      return;
    }
  }
  hint.textContent = '';
}

// ---------- Construcción de datos y cálculo ----------

function construirDatosDesdeFormulario() {
  const tipoMedida = document.querySelector('input[name=tipoMedida]:checked').value;

  const componentes = Array.from(document.querySelectorAll('#listaComponentes .repeat-row'))
    .map((row) => ({
      nombre: row.querySelector('.comp-nombre').value,
      cantidad: Number(row.querySelector('.comp-cantidad').value) || 0,
      costoUnitario: Number(row.querySelector('.comp-costo').value) || 0,
    }))
    .filter((c) => c.nombre || c.costoUnitario);

  const servicios = Array.from(document.querySelectorAll('#listaServicios .repeat-row'))
    .map((row) => ({
      descripcion: row.querySelector('.serv-desc').value,
      costo: Number(row.querySelector('.serv-costo').value) || 0,
      margenPct: Number(row.querySelector('.serv-margen').value) || 0,
    }))
    .filter((s) => s.descripcion || s.costo);

  const manoObra = Array.from(document.querySelectorAll('#listaManoObra .labor-row')).map((row) => ({
    actividad: row.dataset.actividad,
    horas: Number(row.querySelector('.labor-horas').value) || 0,
    tarifaHora: Number(row.querySelector('.labor-tarifa').value) || 0,
  }));

  const margenOverrideVal = document.getElementById('margenOverride').value;
  const imprevistosOverrideVal = document.getElementById('imprevistosOverride').value;

  return {
    material: {
      numHojas: leerNum('numHojas'),
      precioHoja: leerNum('precioHoja'),
      mermaPct: leerNum('mermaPct'),
    },
    componentes,
    servicios,
    manoObra,
    transporte: {
      km: leerNum('transKm'),
      numViajes: leerNum('transViajes'),
      costoKm: leerNum('transCostoKm'),
      costoFijoViaje: leerNum('transCostoFijo'),
      casetas: leerNum('transCasetas'),
      estacionamiento: leerNum('transEstacionamiento'),
    },
    instalacion: {
      numInstaladores: leerNum('instNum'),
      horas: leerNum('instHoras'),
      tarifaHora: leerNum('instTarifa'),
      complejidad: document.getElementById('instComplejidad').value,
    },
    confianzaFlags: {
      medidasExactas: tipoMedida === 'exacta',
      materialDefinido: document.getElementById('materialCatalogo').value !== '',
      herrajesDefinidos: componentes.length > 0,
      ubicacionConfirmada: document.getElementById('ubicacionConfirmada').checked,
      acabadoDefinido: document.getElementById('acabado').value.trim() !== '',
      imagenSimple: document.getElementById('imagenSimple').checked,
    },
    imprevistosPctOverride: imprevistosOverrideVal === '' ? null : Number(imprevistosOverrideVal),
    margenPctOverride: margenOverrideVal === '' ? null : Number(margenOverrideVal),
    ajusteValorPct: Number(document.getElementById('ajusteValor').value) || 0,
  };
}

function recalcular() {
  if (!CATALOGO) return;
  const datos = construirDatosDesdeFormulario();
  ULTIMO_RESULTADO = calcularCotizacion(datos, CATALOGO.configGlobal);
  renderResultado(ULTIMO_RESULTADO);
}

// ---------- Render del panel de resultado ----------

function renderResultado(r) {
  document.getElementById('precioMinimo').textContent = formatoMXN(r.precios.minimo);
  document.getElementById('precioRecomendado').textContent = formatoMXN(r.precios.recomendado);
  document.getElementById('precioMaximo').textContent = formatoMXN(r.precios.maximo);

  const badge = document.getElementById('confianzaBadge');
  badge.textContent = 'Confianza ' + r.confianza.nivel;
  badge.className = 'confianza-badge ' + r.confianza.nivel;

  document.getElementById('confianzaDetalle').textContent =
    `${r.confianza.score} de ${r.confianza.maximo} datos confirmados · imprevistos: ${r.confianza.pctImprevistos}% · margen: ${r.margenPct}%`;

  const d = r.desglose;
  const filas = [
    ['Material', d.costoMaterial],
    ['Componentes', d.costoComponentes],
    ['Servicios externos', d.costoServicios],
    ['Mano de obra', d.costoManoObra],
    ['Transporte', d.costoTransporte],
    ['Instalación', d.costoInstalacion],
    ['Costo directo', d.CD, true],
    ['Indirectos', d.costoIndirectos],
    ['Desgaste de herramienta', d.costoDesgaste],
    ['Merma', d.costoMerma],
    ['Imprevistos', d.costoImprevistos],
    ['Costo total real', d.CTR, true],
  ];
  document.getElementById('desgloseLista').innerHTML = filas
    .map(
      ([label, valor, esTotal]) =>
        `<div class="${esTotal ? 'total-row' : ''}"><dt>${label}</dt><dd>${formatoMXN(valor)}</dd></div>`
    )
    .join('');
}

// ---------- Copiar resultados ----------

function generarTextoCliente() {
  const r = ULTIMO_RESULTADO;
  const nombreProyecto = document.getElementById('nombreProyecto').value || 'tu proyecto';
  return `Estimación preliminar — ${nombreProyecto}

El proyecto se estima entre ${formatoMXN(r.precios.minimo)} y ${formatoMXN(r.precios.maximo)} MXN.

Este rango se basa en la información actualmente disponible.
El precio final puede cambiar después de confirmar medidas, materiales, acabados y especificaciones.`;
}

function generarTextoInterno() {
  const r = ULTIMO_RESULTADO;
  const d = r.desglose;
  const cliente = document.getElementById('clienteNombre').value || '—';
  const proyecto = document.getElementById('nombreProyecto').value || '—';
  return `COTIZACIÓN INTERNA — ${proyecto}
Cliente: ${cliente}
Confianza: ${r.confianza.nivel} (${r.confianza.score}/${r.confianza.maximo})

Material: ${formatoMXN(d.costoMaterial)}
Componentes: ${formatoMXN(d.costoComponentes)}
Servicios externos: ${formatoMXN(d.costoServicios)}
Mano de obra: ${formatoMXN(d.costoManoObra)}
Transporte: ${formatoMXN(d.costoTransporte)}
Instalación: ${formatoMXN(d.costoInstalacion)}
— Costo directo: ${formatoMXN(d.CD)}
Indirectos: ${formatoMXN(d.costoIndirectos)}
Desgaste herramienta: ${formatoMXN(d.costoDesgaste)}
Merma: ${formatoMXN(d.costoMerma)}
Imprevistos (${r.confianza.pctImprevistos}%): ${formatoMXN(d.costoImprevistos)}
— Costo total real: ${formatoMXN(d.CTR)}

Margen aplicado: ${r.margenPct}%
Precio mínimo: ${formatoMXN(r.precios.minimo)}
Precio recomendado: ${formatoMXN(r.precios.recomendado)}
Precio máximo: ${formatoMXN(r.precios.maximo)}`;
}

async function copiarAlPortapapeles(texto, boton) {
  try {
    await navigator.clipboard.writeText(texto);
    const original = boton.textContent;
    boton.textContent = 'Copiado ✓';
    setTimeout(() => {
      boton.textContent = original;
    }, 1800);
  } catch (err) {
    alert('No se pudo copiar automáticamente. Aquí está el texto:\n\n' + texto);
  }
}

// ---------- Inicialización ----------

async function init() {
  CATALOGO = await cargarCatalogo();
  poblarSelects();
  agregarFilaComponente();
  agregarFilaServicio();

  document.getElementById('btnAddComponente').addEventListener('click', agregarFilaComponente);
  document.getElementById('btnAddServicio').addEventListener('click', agregarFilaServicio);
  document.querySelectorAll('input[name=tipoMedida]').forEach((r) =>
    r.addEventListener('change', () => {
      actualizarHintMedida();
      recalcular();
    })
  );
  document.getElementById('tipoMueble').addEventListener('change', () => {
    actualizarHintMedida();
    recalcular();
  });
  document.getElementById('materialCatalogo').addEventListener('change', (e) => {
    if (e.target.value === '') return;
    const mat = CATALOGO.materiales[Number(e.target.value)];
    document.getElementById('precioHoja').value = mat.precio_hoja;
    document.getElementById('mermaPct').value = mat.merma_pct_default;
  });

  document.getElementById('formCotizador').addEventListener('input', recalcular);
  document.getElementById('formCotizador').addEventListener('change', recalcular);

  document.getElementById('btnCopiarCliente').addEventListener('click', (e) =>
    copiarAlPortapapeles(generarTextoCliente(), e.target)
  );
  document.getElementById('btnCopiarInterno').addEventListener('click', (e) =>
    copiarAlPortapapeles(generarTextoInterno(), e.target)
  );

  recalcular();
}

init();
