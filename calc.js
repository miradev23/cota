/**
 * Motor de cálculo — Cotizador COTA
 * Funciones puras: no tocan el DOM, no hacen fetch. Reciben datos, devuelven números.
 * Esto permite probarlas de forma aislada contra proyectos reales antes de confiar en la interfaz.
 */

const FACTOR_COMPLEJIDAD_INSTALACION = { baja: 1.0, media: 1.15, alta: 1.30 };
const ANCHO_RANGO_POR_NIVEL = { alta: 0.10, media: 0.20, baja: 0.35 };

/** Convierte el arreglo [{clave, valor}] de Configuracion_Global en un objeto {clave: numero} */
function configArrayToMap(configArray) {
  const map = {};
  (configArray || []).forEach((row) => {
    map[row.clave] = Number(row.valor);
  });
  return map;
}

/**
 * Calcula el puntaje y nivel de confianza (0-6 puntos → alta/media/baja).
 * flags: { medidasExactas, materialDefinido, herrajesDefinidos, ubicacionConfirmada, acabadoDefinido, imagenSimple }
 */
function calcularConfianza(flags) {
  const score = Object.values(flags).filter(Boolean).length;
  let nivel = 'baja';
  if (score >= 5) nivel = 'alta';
  else if (score >= 3) nivel = 'media';
  return { score, nivel, maximo: 6 };
}

/**
 * Calcula la cotización completa.
 * datos y config siguen la forma documentada en app.js (ver construirDatosDesdeFormulario).
 */
function calcularCotizacion(datos, config) {
  // --- Capa 1: Costo Directo ---
  const costoMaterial = datos.material.numHojas * datos.material.precioHoja * (1 + datos.material.mermaPct / 100);

  const costoComponentes = datos.componentes.reduce(
    (sum, c) => sum + c.cantidad * c.costoUnitario,
    0
  );

  const costoServicios = datos.servicios.reduce(
    (sum, s) => sum + s.costo * (1 + (s.margenPct || 0) / 100),
    0
  );

  const costoManoObra = datos.manoObra.reduce(
    (sum, m) => sum + m.horas * m.tarifaHora,
    0
  );

  const costoTransporte =
    datos.transporte.km * datos.transporte.costoKm * datos.transporte.numViajes +
    datos.transporte.costoFijoViaje * datos.transporte.numViajes +
    datos.transporte.casetas +
    datos.transporte.estacionamiento;

  const factorComplejidad = FACTOR_COMPLEJIDAD_INSTALACION[datos.instalacion.complejidad] || 1.0;
  const costoInstalacion =
    datos.instalacion.numInstaladores *
    datos.instalacion.horas *
    datos.instalacion.tarifaHora *
    factorComplejidad;

  const CD =
    costoMaterial +
    costoComponentes +
    costoServicios +
    costoManoObra +
    costoTransporte +
    costoInstalacion;

  // --- Capa 2: Indirectos ---
  const costoIndirectos = CD * (config.pct_indirectos / 100);
  const costoDesgaste = CD * (config.pct_desgaste_herramienta / 100);

  // --- Capa 3: Riesgo ---
  const costoMerma = costoMaterial * (datos.material.mermaPct / 100);

  const confianza = calcularConfianza(datos.confianzaFlags);
  const pctImprevistosSugerido = {
    alta: config.pct_imprevistos_confianza_alta,
    media: config.pct_imprevistos_confianza_media,
    baja: config.pct_imprevistos_confianza_baja,
  }[confianza.nivel];

  const pctImprevistos =
    datos.imprevistosPctOverride !== null && datos.imprevistosPctOverride !== undefined
      ? datos.imprevistosPctOverride
      : pctImprevistosSugerido;

  const costoImprevistos = (CD + costoIndirectos + costoDesgaste) * (pctImprevistos / 100);

  const CTR = CD + costoIndirectos + costoDesgaste + costoMerma + costoImprevistos;

  // --- Capa 4: Utilidad (margen sobre precio, no markup) ---
  const margenPct =
    datos.margenPctOverride !== null && datos.margenPctOverride !== undefined
      ? datos.margenPctOverride
      : config.pct_margen_default;

  const precioMinimo = CTR / (1 - config.pct_margen_minimo_aceptable / 100);
  const precioRecomendadoBase = CTR / (1 - margenPct / 100);

  // --- Capa 5: Ajuste de valor (solo hacia arriba) ---
  const ajusteValorPct = Math.max(0, datos.ajusteValorPct || 0);
  const precioFinal = precioRecomendadoBase * (1 + ajusteValorPct / 100);

  const anchoRango = ANCHO_RANGO_POR_NIVEL[confianza.nivel];
  const precioMaximo = precioFinal * (1 + anchoRango);

  return {
    desglose: {
      costoMaterial,
      costoComponentes,
      costoServicios,
      costoManoObra,
      costoTransporte,
      costoInstalacion,
      CD,
      costoIndirectos,
      costoDesgaste,
      costoMerma,
      costoImprevistos,
      CTR,
    },
    confianza: { ...confianza, pctImprevistos },
    margenPct,
    precios: {
      minimo: precioMinimo,
      recomendado: precioFinal,
      maximo: precioMaximo,
    },
  };
}
