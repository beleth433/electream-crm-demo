import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBankDate, parse1CTxtStatement } from '../../client/src/utils/bankStatementParser.ts';

test('Russian dates and Excel dates are normalized for the cash register', () => {
  assert.equal(parseBankDate('22.10.2026'), '2026-10-22T12:00:00.000Z');
  assert.equal(parseBankDate(46317), '2026-10-22T00:00:00.000Z');
  assert.throws(() => parseBankDate('неизвестная дата'), /Не удалось/);
});

test('1C statement debit transactions do not become rental income', () => {
  const statement = [
    'РасчСчет=own',
    'СекцияДокумент=Платежное поручение', 'Сумма=100', 'Дата=22.10.2026', 'ДатаСписано=22.10.2026', 'КонецДокумента',
    'СекцияДокумент=Платежное поручение', 'Сумма=200', 'ДатаПоступило=22.10.2026', 'КонецДокумента',
    'СекцияДокумент=Платежное поручение', 'Сумма=300', 'Дата=22.10.2026', 'ПлательщикРасчСчет=own', 'ПолучательРасчСчет=supplier', 'КонецДокумента',
  ].join('\n');
  const payments = parse1CTxtStatement(statement);
  assert.equal(payments.length, 1);
  assert.equal(payments[0].amount, 200);
  assert.equal(payments[0].date, '2026-10-22T12:00:00.000Z');
});
