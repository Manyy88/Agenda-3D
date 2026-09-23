/** Ejecutar una vez desde un proyecto vinculado a la hoja de destino. */
function configurar() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error('Abre Apps Script desde Extensiones de la hoja de destino.');
  PropertiesService.getScriptProperties().setProperty('RADAR_SHEET_ID',ss.getId());
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try { radarSheet_(); } finally { lock.releaseLock(); }
}
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Radar de Agenda 3D').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function include_(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function today_() { return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd'); }
function getContext() { return {today:today_()}; }
function radarSheet_() {
  const id=PropertiesService.getScriptProperties().getProperty('RADAR_SHEET_ID');
  if(!id) throw new Error('Falta configurar la hoja de destino. Contacta al administrador.');
  const ss=SpreadsheetApp.openById(id);
  const sheet=ss.getSheetByName('Radar') || ss.insertSheet('Radar');
  const headers=['registro_id','guardado_en','fecha_revision','zona_horaria','apv'];
  for(let i=1;i<=3;i++) headers.push('d'+i+'_fecha','d'+i+'_objetivo_ventas_mes','d'+i+'_dias_operativos','d'+i+'_objetivo_citas','d'+i+'_agendadas','d'+i+'_brecha');
  headers.push('accion','agencia','gerente');
  if(sheet.getMaxColumns()<headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(),headers.length-sheet.getMaxColumns());
  if(sheet.getLastRow()===0) {
    sheet.getRange(1,1,1,headers.length).setValues([headers]); sheet.setFrozenRows(1);
  } else {
    const actual=sheet.getRange(1,1,1,headers.length).getValues()[0];
    if(headers.slice(0,24).some((h,i)=>actual[i]!==h) || (actual[24] && actual[24]!=='agencia') || (actual[25] && actual[25]!=='gerente')) throw new Error('La estructura de Radar cambió. Revisa los encabezados antes de guardar.');
    // Añade las dos columnas al final; no cambia ninguna fila existente.
    if(actual[24]!=='agencia' || actual[25]!=='gerente') sheet.getRange(1,25,1,2).setValues([['agencia','gerente']]);
  }
  return sheet;
}
function saveRadar(payload) {
  if(!payload || !/^[a-zA-Z0-9-]{16,80}$/.test(payload.id||'')) throw new Error('Registro inválido. Recarga e intenta nuevamente.');
  const agency=typeof payload.agency==='string'?payload.agency.trim():'';
  const manager=typeof payload.manager==='string'?payload.manager.trim():'';
  if(!agency || !manager || agency.length>120 || manager.length>120) throw new Error('Completa agencia y nombre del gerente (máximo 120 caracteres cada uno).');
  if(payload.today!==today_()) throw new Error('Cambió la fecha. Recarga para revisar los próximos tres días.');
  // Misma lógica de cálculo que la pantalla; el servidor vuelve a calcular los resultados.
  const source=include_('Logic').replace(/<\/?script>/g,'');
  const calculate=new Function(source+'; return Radar;')();
  if(!payload.goals || !Array.isArray(payload.agendas) || payload.agendas.length!==3 || calculate.integer(payload.apv,1)===null) throw new Error('Revisa la configuración y las tres cifras de agenda.');
  const rows=calculate.calculate(payload.today,payload.goals,payload.apv,payload.agendas);
  if(rows.some(r=>r.gap===null)) throw new Error('Completa las cifras con números enteros no negativos.');
  const deficit=rows.some(r=>r.gap<0);
  const action=deficit?String(payload.action||'').trim():'';
  if(deficit && !action) throw new Error('Escribe una acción para cubrir la brecha.');
  if(action.length>1000) throw new Error('Escribe una acción más breve (máximo 1000 caracteres).');
  const lock=LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sheet=radarSheet_();
    if(sheet.getLastRow()>1 && sheet.getRange(2,1,sheet.getLastRow()-1,1).createTextFinder(payload.id).matchEntireCell(true).findNext()) return {saved:true};
    const record=[payload.id,new Date(),payload.today,Session.getScriptTimeZone(),Number(payload.apv)];
    rows.forEach(r=>record.push(r.day,r.sales,r.operatingDays,r.target,r.scheduled,r.gap));
    // Impide que la acción se interprete como fórmula en Sheets.
    record.push(/^[=+@\-\t\r]/.test(action)?"'"+action:action);
    record.push(safeText_(agency),safeText_(manager));
    sheet.appendRow(record); SpreadsheetApp.flush(); return {saved:true};
  } finally { lock.releaseLock(); }
}

function safeText_(value) { return /^[=+@\-\t\r]/.test(value)?"'"+value:value; }
