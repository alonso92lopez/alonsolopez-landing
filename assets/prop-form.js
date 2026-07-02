// Form de propiedad compartido entre la landing pública (index.html) y el
// portal del propietario (/portal/). Única definición de campos-por-tipo.
//
// Uso:
//   slot.innerHTML = PropForm.html({ pretension: true });
//   PropForm.init(formEl);
//   var data = PropForm.leer(formEl);       // objeto listo para POST
//   PropForm.rellenar(formEl, propiedad);   // prefill para edición
var PropForm = (function () {

  function html(opts) {
    opts = opts || {};
    var conPretension = opts.pretension !== false;
    return ''
      + '<div class="form-seccion">'
      +   '<span class="form-seccion-titulo">La propiedad</span>'
      +   '<div class="form-fila form-fila-2">'
      +     '<div class="form-campo">'
      +       '<label for="tipo">Tipo de propiedad</label>'
      +       '<select id="tipo" name="tipo" required>'
      +         '<option value="" disabled selected>Selecciona</option>'
      +         '<option value="casa">Casa</option>'
      +         '<option value="departamento">Departamento</option>'
      +         '<option value="oficina">Oficina</option>'
      +         '<option value="local">Local comercial</option>'
      +         '<option value="terreno">Terreno</option>'
      +         '<option value="parcela">Parcela</option>'
      +         '<option value="bodega">Bodega / Estacionamiento</option>'
      +       '</select>'
      +     '</div>'
      +     '<div class="form-campo">'
      +       '<label for="direccion">Dirección</label>'
      +       '<input type="text" id="direccion" name="direccion" placeholder="Av. Ejemplo 123" required />'
      +     '</div>'
      +   '</div>'
      +   '<div class="form-fila form-fila-2">'
      +     '<div class="form-campo">'
      +       '<label for="comuna">Comuna</label>'
      +       '<input type="text" id="comuna" name="comuna" placeholder="Las Condes" required />'
      +     '</div>'
      +     '<div class="form-campo">'
      +       '<label for="region">Región</label>'
      +       '<select id="region" name="region" required>'
      +         '<option value="" disabled selected>Selecciona</option>'
      +         '<option value="rm">Región Metropolitana</option>'
      +         '<option value="valparaiso">Valparaíso</option>'
      +         '<option value="biobio">Biobío</option>'
      +         '<option value="araucania">La Araucanía</option>'
      +         '<option value="maule">Maule</option>'
      +         '<option value="ohiggins">O\'Higgins</option>'
      +         '<option value="nuble">Ñuble</option>'
      +         '<option value="los-lagos">Los Lagos</option>'
      +         '<option value="los-rios">Los Ríos</option>'
      +         '<option value="coquimbo">Coquimbo</option>'
      +         '<option value="atacama">Atacama</option>'
      +         '<option value="antofagasta">Antofagasta</option>'
      +         '<option value="tarapaca">Tarapacá</option>'
      +         '<option value="arica">Arica y Parinacota</option>'
      +         '<option value="aysen">Aysén</option>'
      +         '<option value="magallanes">Magallanes</option>'
      +       '</select>'
      +     '</div>'
      +   '</div>'

      // Casa + Departamento
      + '<div class="form-grupo" id="campos-residencial" style="display:none">'
      +   '<div class="form-fila form-fila-2">'
      +     '<div class="form-campo"><label for="m2_utiles">M² útiles</label>'
      +       '<input type="number" id="m2_utiles" name="m2_utiles" placeholder="85" min="1" /></div>'
      +     '<div class="form-campo"><label for="m2_totales">M² totales</label>'
      +       '<input type="number" id="m2_totales" name="m2_totales" placeholder="120" min="1" /></div>'
      +   '</div>'
      +   '<div class="form-fila form-fila-3">'
      +     '<div class="form-campo"><label for="habitaciones">Habitaciones</label>'
      +       '<input type="number" id="habitaciones" name="habitaciones" placeholder="3" min="0" /></div>'
      +     '<div class="form-campo"><label for="banos">Baños</label>'
      +       '<input type="number" id="banos" name="banos" placeholder="2" min="0" /></div>'
      +     '<div class="form-campo"><label for="orientacion">Orientación</label>'
      +       '<select id="orientacion" name="orientacion">' + opcionesOrientacion() + '</select></div>'
      +   '</div>'
      + '</div>'

      // Solo Departamento
      + '<div class="form-grupo" id="campos-depto-extra" style="display:none">'
      +   '<div class="form-fila form-fila-3">'
      +     '<div class="form-campo"><label for="piso">Piso</label>'
      +       '<input type="number" id="piso" name="piso" placeholder="4" min="1" /></div>'
      +     '<div class="form-campo"><label for="estacionamiento">Estacionamiento</label>'
      +       '<select id="estacionamiento" name="estacionamiento">'
      +         '<option value="" disabled selected>Selecciona</option>'
      +         '<option value="0">Sin estacionamiento</option>'
      +         '<option value="1">1</option><option value="2">2</option><option value="3+">3 o más</option>'
      +       '</select></div>'
      +     '<div class="form-campo"><label for="bodega">Bodega</label>'
      +       '<select id="bodega" name="bodega">'
      +         '<option value="" disabled selected>Selecciona</option>'
      +         '<option value="si">Sí</option><option value="no">No</option>'
      +       '</select></div>'
      +   '</div>'
      + '</div>'

      // Terreno + Parcela
      + '<div class="form-grupo" id="campos-tierra" style="display:none">'
      +   '<div class="form-fila form-fila-2">'
      +     '<div class="form-campo"><label for="superficie">Superficie total</label>'
      +       '<div class="input-con-moneda">'
      +         '<input type="number" id="superficie" name="superficie" placeholder="5.000" min="0" />'
      +         '<select name="unidad_superficie" id="unidad_superficie">'
      +           '<option value="m2">m²</option><option value="ha">há</option>'
      +         '</select>'
      +       '</div></div>'
      +     '<div class="form-campo"><label for="uso_suelo">Uso de suelo</label>'
      +       '<select id="uso_suelo" name="uso_suelo">'
      +         '<option value="" disabled selected>Selecciona</option>'
      +         '<option value="habitacional">Habitacional</option><option value="agricola">Agrícola</option>'
      +         '<option value="comercial">Comercial</option><option value="mixto">Mixto</option>'
      +         '<option value="industrial">Industrial</option>'
      +       '</select></div>'
      +   '</div>'
      +   '<div class="form-fila form-fila-3">'
      +     '<div class="form-campo"><label for="agua">Agua</label>'
      +       '<select id="agua" name="agua">'
      +         '<option value="" disabled selected>Selecciona</option>'
      +         '<option value="red">Red pública</option><option value="apr">APR</option>'
      +         '<option value="pozo">Pozo propio</option><option value="sin">Sin agua</option>'
      +       '</select></div>'
      +     '<div class="form-campo"><label for="electricidad">Electricidad</label>'
      +       '<select id="electricidad" name="electricidad">'
      +         '<option value="" disabled selected>Selecciona</option>'
      +         '<option value="empalme">Empalme</option><option value="sin">Sin electricidad</option>'
      +       '</select></div>'
      +     '<div class="form-campo"><label for="acceso">Acceso</label>'
      +       '<select id="acceso" name="acceso">'
      +         '<option value="" disabled selected>Selecciona</option>'
      +         '<option value="pavimentado">Pavimentado</option><option value="ripio">Ripio</option>'
      +         '<option value="tierra">Tierra</option>'
      +       '</select></div>'
      +   '</div>'
      +   '<div class="deuda-bloque">'
      +     '<label class="deuda-check-label">'
      +       '<input type="checkbox" id="check-construccion" name="tiene_construccion" value="si" />'
      +       '<span>Tiene construcción</span></label>'
      +     '<div class="deuda-monto" id="monto-construccion" style="display:none">'
      +       '<div class="form-campo"><label for="m2_construidos">M² construidos</label>'
      +         '<input type="number" id="m2_construidos" name="m2_construidos" placeholder="120" min="1" /></div>'
      +     '</div>'
      +   '</div>'
      + '</div>'

      // Solo Terreno
      + '<div class="form-grupo" id="campos-terreno-extra" style="display:none">'
      +   '<div class="form-fila form-fila-2">'
      +     '<div class="form-campo"><label for="frente">Frente (metros lineales)</label>'
      +       '<input type="number" id="frente" name="frente" placeholder="12" min="0" step="0.1" /></div>'
      +   '</div>'
      + '</div>'

      // Solo Parcela
      + '<div class="form-grupo" id="campos-parcela-extra" style="display:none">'
      +   '<div class="form-fila form-fila-2">'
      +     '<div class="form-campo"><label for="rol_sii">Rol SII</label>'
      +       '<input type="text" id="rol_sii" name="rol_sii" placeholder="123-45" /></div>'
      +   '</div>'
      + '</div>'

      // Oficina + Local
      + '<div class="form-grupo" id="campos-comercial" style="display:none">'
      +   '<div class="form-fila form-fila-3">'
      +     '<div class="form-campo"><label for="m2_com">M² totales</label>'
      +       '<input type="number" id="m2_com" name="m2" placeholder="60" min="1" /></div>'
      +     '<div class="form-campo"><label for="piso_com">Piso</label>'
      +       '<input type="number" id="piso_com" name="piso" placeholder="3" min="1" /></div>'
      +     '<div class="form-campo"><label for="orientacion_com">Orientación</label>'
      +       '<select id="orientacion_com" name="orientacion">' + opcionesOrientacion() + '</select></div>'
      +   '</div>'
      + '</div>'

      // Bodega / Estacionamiento
      + '<div class="form-grupo" id="campos-bodega-est" style="display:none">'
      +   '<div class="form-fila form-fila-2">'
      +     '<div class="form-campo"><label for="m2_bod">M² totales</label>'
      +       '<input type="number" id="m2_bod" name="m2" placeholder="15" min="1" /></div>'
      +     '<div class="form-campo"><label for="piso_bod">Piso</label>'
      +       '<input type="number" id="piso_bod" name="piso" placeholder="-1" /></div>'
      +   '</div>'
      + '</div>'
      + '</div>'

      + (conPretension ? ''
      + '<div class="form-seccion">'
      +   '<span class="form-seccion-titulo">Pretensión de venta</span>'
      +   '<div class="form-fila form-fila-2">'
      +     '<div class="form-campo"><label for="precio">¿Cuánto quieres obtener?</label>'
      +       '<div class="input-con-moneda">'
      +         '<input type="number" id="precio" name="precio" placeholder="5.000" min="0" required />'
      +         '<select name="moneda_precio" id="moneda_precio">'
      +           '<option value="UF">UF</option><option value="CLP">CLP</option>'
      +         '</select>'
      +       '</div></div>'
      +     '<div class="form-campo"><label for="tiempo">¿Hace cuánto está publicada?</label>'
      +       '<select id="tiempo" name="tiempo" required>'
      +         '<option value="" disabled selected>Selecciona</option>'
      +         '<option value="menos-6">Menos de 6 meses</option>'
      +         '<option value="6-12">6 a 12 meses</option>'
      +         '<option value="12-18">12 a 18 meses</option>'
      +         '<option value="18-24">18 a 24 meses</option>'
      +         '<option value="24+">Más de 24 meses</option>'
      +       '</select></div>'
      +   '</div>'
      + '</div>' : '')

      + '<div class="form-seccion">'
      +   '<span class="form-seccion-titulo">Situación financiera</span>'
      +   '<div class="deuda-bloque">'
      +     '<span style="display:block;margin-bottom:8px;font-size:.9rem;color:#444;">¿Tiene deuda hipotecaria? *</span>'
      +     '<label class="deuda-check-label"><input type="radio" name="tiene_hipotecaria" value="si" required /> <span>Sí</span></label>'
      +     '<label class="deuda-check-label"><input type="radio" name="tiene_hipotecaria" value="no" /> <span>No</span></label>'
      +     '<div class="deuda-monto" id="monto-hipotecaria" style="display:none">'
      +       '<div class="form-campo"><label for="monto_hipotecaria">Monto deuda hipotecaria</label>'
      +         '<div class="input-con-moneda">'
      +           '<input type="number" id="monto_hipotecaria" name="monto_hipotecaria" placeholder="3.000" min="0" />'
      +           '<select name="moneda_hipotecaria"><option value="UF">UF</option><option value="CLP">CLP</option></select>'
      +         '</div></div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="deuda-bloque">'
      +     '<label class="deuda-check-label">'
      +       '<input type="checkbox" id="check-contribuciones" name="tiene_contribuciones" value="si" />'
      +       '<span>Tiene deudas de contribuciones</span></label>'
      +     '<div class="deuda-monto" id="monto-contribuciones" style="display:none">'
      +       '<div class="form-campo"><label for="monto_contribuciones">Monto contribuciones adeudadas</label>'
      +         '<div class="input-con-moneda">'
      +           '<input type="number" id="monto_contribuciones" name="monto_contribuciones" placeholder="500.000" min="0" />'
      +           '<select name="moneda_contribuciones"><option value="CLP">CLP</option><option value="UF">UF</option></select>'
      +         '</div></div>'
      +     '</div>'
      +   '</div>'
      + '</div>';
  }

  function opcionesOrientacion() {
    return '<option value="" disabled selected>Selecciona</option>'
      + '<option value="norte">Norte</option><option value="sur">Sur</option>'
      + '<option value="oriente">Oriente</option><option value="poniente">Poniente</option>'
      + '<option value="nororiente">Nororiente</option><option value="norponiente">Norponiente</option>'
      + '<option value="suroriente">Suroriente</option><option value="surponiente">Surponiente</option>';
  }

  var gruposTipo = ['campos-residencial', 'campos-depto-extra', 'campos-tierra',
    'campos-terreno-extra', 'campos-parcela-extra', 'campos-comercial', 'campos-bodega-est'];
  // Campos que pueden volverse obligatorios según el tipo (se limpian en cada cambio).
  var dinamicos = ['m2_utiles', 'm2_totales', 'habitaciones', 'banos', 'estacionamiento',
    'bodega', 'superficie', 'uso_suelo', 'm2_com', 'm2_bod'];
  var reqPorTipo = {
    casa:         ['m2_utiles', 'm2_totales', 'habitaciones', 'banos'],
    departamento: ['m2_utiles', 'm2_totales', 'habitaciones', 'banos', 'estacionamiento', 'bodega'],
    terreno:      ['superficie', 'uso_suelo'],
    parcela:      ['superficie', 'uso_suelo'],
    oficina:      ['m2_com'],
    local:        ['m2_com'],
    bodega:       ['m2_bod'],
  };

  function init(root) {
    function q(id) { return root.querySelector('#' + id); }
    function mostrar(id) { var el = q(id); if (el) el.style.display = 'flex'; }
    function ocultar(id) { var el = q(id); if (el) el.style.display = 'none'; }
    function setReq(id, on) { var el = q(id); if (el) el.required = on; }

    function aplicarTipo(v) {
      gruposTipo.forEach(ocultar);
      dinamicos.forEach(function (id) { setReq(id, false); });
      if (v === 'casa') {
        mostrar('campos-residencial');
      } else if (v === 'departamento') {
        mostrar('campos-residencial'); mostrar('campos-depto-extra');
      } else if (v === 'terreno') {
        mostrar('campos-tierra'); mostrar('campos-terreno-extra');
      } else if (v === 'parcela') {
        mostrar('campos-tierra'); mostrar('campos-parcela-extra');
      } else if (v === 'oficina' || v === 'local') {
        mostrar('campos-comercial');
      } else if (v === 'bodega') {
        mostrar('campos-bodega-est');
      }
      (reqPorTipo[v] || []).forEach(function (id) { setReq(id, true); });
    }

    q('tipo').addEventListener('change', function () { aplicarTipo(this.value); });
    q('check-construccion').addEventListener('change', function () {
      q('monto-construccion').style.display = this.checked ? 'block' : 'none';
    });
    root.querySelectorAll('input[name="tiene_hipotecaria"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var si = this.value === 'si';
        q('monto-hipotecaria').style.display = si ? 'block' : 'none';
        setReq('monto_hipotecaria', si);
      });
    });
    q('check-contribuciones').addEventListener('change', function () {
      q('monto-contribuciones').style.display = this.checked ? 'block' : 'none';
    });

    return { aplicarTipo: aplicarTipo };
  }

  function leer(formEl) {
    // Varios grupos por tipo comparten name (m2, piso, orientación): al fusionar
    // gana el valor NO vacío — el vacío del grupo oculto no pisa al lleno.
    var data = {};
    new FormData(formEl).forEach(function (v, k) {
      if (!(k in data) || String(v) !== '') data[k] = v;
    });
    if (data.tiene_hipotecaria !== 'si') data.monto_hipotecaria = '0';
    return data;
  }

  // Inversos de los mapeos del backend, para precargar el form al editar.
  var TIPO_INVERSO = {
    'Casa': 'casa', 'Departamento': 'departamento', 'Oficina': 'oficina',
    'Local comercial': 'local', 'Terreno': 'terreno', 'Parcela': 'parcela',
    'Bodega / Estacionamiento': 'bodega',
  };

  function set(root, name, valor) {
    if (valor === null || valor === undefined || valor === '') return;
    var el = root.querySelector('[name="' + name + '"]');
    if (el) el.value = String(valor);
  }

  function setId(root, id, valor) {
    if (valor === null || valor === undefined || valor === '') return;
    var el = root.querySelector('#' + id);
    if (el) el.value = String(valor);
  }

  // Precarga los datos que devuelve /api/portal/mis-propiedades (whitelist).
  function rellenar(root, p, ctrl) {
    var tipo = TIPO_INVERSO[p.tipo] || '';
    if (tipo) {
      root.querySelector('[name="tipo"]').value = tipo;
      ctrl.aplicarTipo(tipo);
    }
    set(root, 'direccion', p.direccion);
    set(root, 'comuna', p.comuna);
    set(root, 'region', p.region);
    set(root, 'm2_utiles', p.m2_utiles);
    set(root, 'm2_totales', p.m2_totales);
    set(root, 'habitaciones', p.habitaciones);
    set(root, 'banos', p.banos);
    // m2/piso/orientación existen en varios grupos por tipo: apuntar al visible.
    if (tipo === 'bodega') {
      setId(root, 'm2_bod', p.m2);
      setId(root, 'piso_bod', p.piso);
    } else if (tipo === 'oficina' || tipo === 'local') {
      setId(root, 'm2_com', p.m2);
      setId(root, 'piso_com', p.piso);
      setId(root, 'orientacion_com', p.orientacion);
    } else {
      setId(root, 'piso', p.piso);
      setId(root, 'orientacion', p.orientacion);
    }
    set(root, 'estacionamiento', p.estacionamiento);
    if (p.bodega) set(root, 'bodega', p.bodega === 'Sí' ? 'si' : 'no');
    set(root, 'superficie', p.superficie);
    set(root, 'unidad_superficie', p.unidad_superficie);
    set(root, 'uso_suelo', p.uso_suelo);
    if (p.m2_construidos) {
      var chk = root.querySelector('#check-construccion');
      if (chk) { chk.checked = true; chk.dispatchEvent(new Event('change')); }
      set(root, 'm2_construidos', p.m2_construidos);
    }
    // Deudas: 0 = "No" explícito; >0 = "Sí" con monto.
    if (p.deuda_hipotecaria !== null && p.deuda_hipotecaria !== undefined) {
      var conDeuda = Number(p.deuda_hipotecaria) > 0;
      var radio = root.querySelector('input[name="tiene_hipotecaria"][value="' + (conDeuda ? 'si' : 'no') + '"]');
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
      if (conDeuda) {
        set(root, 'monto_hipotecaria', p.deuda_hipotecaria);
        set(root, 'moneda_hipotecaria', p.moneda_hipotecaria);
      }
    }
    if (p.deuda_contribuciones !== null && p.deuda_contribuciones !== undefined
        && Number(p.deuda_contribuciones) > 0) {
      var chc = root.querySelector('#check-contribuciones');
      if (chc) { chc.checked = true; chc.dispatchEvent(new Event('change')); }
      set(root, 'monto_contribuciones', p.deuda_contribuciones);
      set(root, 'moneda_contribuciones', p.moneda_contribuciones);
    }
  }

  return { html: html, init: init, leer: leer, rellenar: rellenar };
})();
