const transliteration = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
function label(value) { return String(value).toLowerCase().replace(/[а-яё]/g, c => transliteration[c]).replace(/[^a-z0-9]/g, ''); }
function intent(text) {
  return { clients: /клиент|курьер|покупател/iu.test(text), bikes: /велосипед|байк/iu.test(text), batteries: /аккумулятор|батаре|акб/iu.test(text) };
}
function clientTypeFromText(text) {
  const courier = /курьер/iu.test(text), retail = /покупател|розниц|(?:^|[\s.,])сто(?:$|[\s.,])/iu.test(text);
  return courier !== retail ? courier ? 'COURIER' : 'RETAIL' : null;
}
function isUpdate(text) { return /измен|обнов|исправ|помен|дополни|внеси\s+(?:прописку|паспорт|телефон)/iu.test(text); }
function phone(value) {
  const raw = String(value).trim(), digits = raw.replace(/\D/g, '');
  if (/^\+?7/.test(raw) || digits.startsWith('8')) return { valid: digits.length === 11, digits: digits.startsWith('8') ? '7' + digits.slice(1) : digits };
  if (digits.length === 10 && digits.startsWith('9')) return { valid: true, digits: '7' + digits };
  return { valid: raw.startsWith('+') && digits.length >= 10 && digits.length <= 15, digits };
}
function phoneCandidates(text) {
  return [...text.matchAll(/(?<![\p{L}\d])(?:\+\d|[789])(?:[\s().-]*\d){8,14}(?![\s().-]*\d)/gu)].map(m => ({ raw: m[0].trim(), ...phone(m[0]), index: m.index }));
}
function phoneInText(value, text) {
  const parsed = phone(value);
  return parsed.valid && phoneCandidates(text).some(p => p.valid && p.digits === parsed.digits);
}
function modelInText(model, text, battery = false) {
  if (model.name && label(text).includes(label(model.name))) return true;
  if (!battery || !model.voltage || !model.capacityAh) return false;
  return new RegExp(`(?<!\\d)${model.voltage}\\s*(?:v|в(?:ольт)?)(?![\\p{L}\\d])`, 'iu').test(text)
    && new RegExp(`(?<!\\d)${model.capacityAh}\\s*(?:ah|ач|а[ -]*ч|ампер(?:[ -]*час(?:ов|а)?)?)(?![\\p{L}\\d])`, 'iu').test(text);
}
const counts = { один:1,одного:1,одну:1,два:2,две:2,двух:2,три:3,трех:3,'трёх':3,четыре:4,четырех:4,'четырёх':4,пять:5,пяти:5,шесть:6,шести:6,семь:7,семи:7,восемь:8,восьми:8,девять:9,девяти:9,десять:10,десяти:10 };
function requestedCount(text, category) {
  const noun = category === 'clients' ? '(?:новых\\s+)?(?:клиент|курьер|покупател)' : category === 'bikes' ? '(?:велосипед|байк)' : '(?:акб|аккумулятор|батаре)';
  const match = text.toLowerCase().match(new RegExp(`(?:^|[^\\p{L}\\d])(\\d+|${Object.keys(counts).join('|')})\\s+${noun}`, 'u'));
  return match ? (counts[match[1]] || Number(match[1])) : null;
}
function money(text) {
  const amounts = [];
  for (const match of text.matchAll(/(?<!\d)(\d[\d ]*(?:[.,]\d+)?)\s*(тыс(?:яч(?:и|у)?)?\.?|тыщ(?:и)?|к)?(?![\p{L}])\s*(руб(?:лей|ля|ль|\.)?|₽)?/giu)) {
    if (!match[2] && !match[3]) continue;
    const value = Number(match[1].replace(/ /g, '').replace(',', '.')) * (match[2] ? 1000 : 1);
    if (Number.isFinite(value)) amounts.push(value);
  }
  for (const match of text.matchAll(/(?:цен[ауые]|стоимость|по)\s*[:=]?\s*(\d[\d ]*(?:[.,]\d+)?)\s*(тыс(?:яч(?:и|у)?)?\.?|к)?(?![\p{L}])/giu)) {
    const value = Number(match[1].replace(/ /g, '').replace(',', '.')) * (match[2] ? 1000 : 1);
    if (Number.isFinite(value)) amounts.push(value);
  }
  return [...new Set(amounts)];
}
function unitPurchasePrice(text) {
  const values = money(text);
  return values.length === 1 && /закуп|покупн|приобрет|купили|поставщик/iu.test(text)
    && /кажд|за\s+(?:одн|единиц|штук)|по\s+\d/iu.test(text)
    && !/всего|общая\s+сумма|за\s+все|итого/iu.test(text) ? values[0] : null;
}
module.exports = { label, intent, clientTypeFromText, isUpdate, phone, phoneCandidates, phoneInText, modelInText, requestedCount, money, unitPurchasePrice };
