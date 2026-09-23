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
  if(sheet.getLastRow()===0) {
    const headers=['registro_id','guardado_en','fecha_revision','zona_horaria','apv'];
    for(let i=1;i<=3;i++) headers.push('d'+i+'_fecha','d'+i+'_objetivo_ventas_mes','d'+i+'_dias_operativos','d'+i+'_objetivo_citas','d'+i+'_agendadas','d'+i+'_brecha');
    headers.push('accion'); sheet.appendRow(headers); sheet.setFrozenRows(1);
  }
  return sheet;
}
function saveRadar(payload) {
  if(!payload || !/^[a-zA-Z0-9-]{16,80}$/.test(payload.id||'')) throw new Error('Registro inválido. Recarga e intenta nuevamente.');
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
    sheet.appendRow(record); SpreadsheetApp.flush(); return {saved:true};
  } finally { lock.releaseLock(); }
}
