/**
 * Облако игр «6х6»: сохраняет все матчи в эту Google-таблицу.
 * Как подключить - см. README (раздел «Облако игр»), кратко:
 *  1) Таблица -> Расширения -> Apps Script -> вставьте этот код.
 *  2) Замените KEY на свой пароль (любая длинная строка без пробелов).
 *  3) Развернуть -> Новое развертывание -> Веб-приложение:
 *     «Выполнять от имени: меня», «Доступ: все». Скопируйте адрес, который кончается на /exec.
 *  4) В приложении: «Облако игр» -> вставьте адрес и пароль.
 */
var KEY = 'ЗАМЕНИТЕ_НА_СВОЙ_ПАРОЛЬ';
var SHEET = 'Games';
var CHUNK = 40000;       // символов в одной ячейке
var FIRST_DATA_COL = 6;  // A id, B updated, C title, D summary, E deleted, F... данные

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(SHEET);
  if (!s) {
    s = ss.insertSheet(SHEET);
    s.appendRow(['id', 'updated', 'title', 'summary', 'deleted', 'data']);
    s.setFrozenRows(1);
  }
  return s;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function find_(s, id) {
  var n = s.getLastRow();
  if (n < 2) return 0;
  var ids = s.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.key !== KEY) return out_({ ok: false, err: 'key' });
  var s = sheet_();
  if (p.op === 'get') {
    var r = find_(s, String(p.id || ''));
    if (!r) return out_({ ok: false, err: 'notfound' });
    var row = s.getRange(r, 1, 1, Math.max(s.getLastColumn(), FIRST_DATA_COL)).getValues()[0];
    if (row[4]) return out_({ ok: false, err: 'notfound' });
    return out_({ ok: true, id: row[0], u: row[1], data: row.slice(FIRST_DATA_COL - 1).join('') });
  }
  var n = s.getLastRow();
  var rows = n > 1 ? s.getRange(2, 1, n - 1, 5).getValues() : [];
  var items = [];
  rows.forEach(function (r) {
    if (r[0] && !r[4]) items.push({ id: String(r[0]), u: Number(r[1]), title: String(r[2]), sum: String(r[3]) });
  });
  items.sort(function (a, b) { return b.u - a.u; });
  return out_({ ok: true, items: items.slice(0, 500) });
}
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var o = JSON.parse(e.postData.contents);
    if (o.key !== KEY) return out_({ ok: false, err: 'key' });
    var id = String(o.id || '').slice(0, 60);
    if (!/^[A-Za-z0-9_-]+$/.test(id)) return out_({ ok: false, err: 'id' });
    var s = sheet_(), r = find_(s, id);
    if (o.op === 'del') {
      if (r) { s.getRange(r, 5).setValue(1); s.getRange(r, FIRST_DATA_COL, 1, Math.max(1, s.getLastColumn() - FIRST_DATA_COL + 1)).clearContent(); }
      return out_({ ok: true });
    }
    if (o.op !== 'put' || typeof o.data !== 'string' || o.data.length > CHUNK * 24) return out_({ ok: false, err: 'bad' });
    var u = Number(o.u) || Date.now();
    if (r) {
      var old = Number(s.getRange(r, 2).getValue()) || 0;
      if (old > u && !s.getRange(r, 5).getValue()) return out_({ ok: true, skipped: true });
    } else {
      r = s.getLastRow() + 1;
    }
    var parts = [];
    for (var i = 0; i < o.data.length; i += CHUNK) parts.push(o.data.substr(i, CHUNK));
    if (!parts.length) parts.push('');
    var row = [id, u, String(o.title || '').slice(0, 120), String(o.sum || '').slice(0, 120), ''].concat(parts);
    var width = Math.max(s.getLastColumn(), row.length);
    while (row.length < width) row.push('');
    if (s.getMaxColumns() < width) s.insertColumnsAfter(s.getMaxColumns(), width - s.getMaxColumns());
    s.getRange(r, 1, 1, width).setValues([row]);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, err: String(err) });
  } finally {
    lock.releaseLock();
  }
}
