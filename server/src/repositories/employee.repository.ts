import { getDb, getSystemTime, EmployeeRecord, PaymentRecord } from './db.js';

export class EmployeeRepository {
  async findAll() {
    const db = getDb();
    const payments = db.payments.filter((p) => p.type === 'SALARY_PAYMENT');

    return db.employees.map((emp) => {
      const empPayments = payments.filter((p) => p.employeeId === emp.id);
      const totalPaid = empPayments.reduce((sum, p) => sum + p.amount, 0);

      // Current month payouts based on system simulated date
      const currentMonth = getSystemTime().toISOString().slice(0, 7);
      const thisMonthPaid = empPayments
        .filter((p) => p.createdAt.slice(0, 7) === currentMonth)
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        ...emp,
        totalPaid,
        thisMonthPaid,
        payoutsCount: empPayments.length,
      };
    });
  }

  async findById(id: string) {
    const db = getDb();
    const emp = db.employees.find((e) => e.id === id);
    if (!emp) return null;

    const payouts = db.payments.filter(
      (p) => p.type === 'SALARY_PAYMENT' && p.employeeId === emp.id
    );
    const totalPaid = payouts.reduce((sum, p) => sum + p.amount, 0);

    return {
      ...emp,
      totalPaid,
      payouts: payouts.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    };
  }

  async create(data: Omit<EmployeeRecord, 'id' | 'hiredAt'> & { hiredAt?: string }) {
    const db = getDb();
    const newEmp: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      role: data.role,
      salaryType: data.salaryType,
      salaryAmount: Number(data.salaryAmount) || 0,
      status: data.status || 'ACTIVE',
      hiredAt: data.hiredAt || getSystemTime().toISOString().slice(0, 10),
      notes: data.notes || null,
    };
    db.employees.unshift(newEmp);
    return newEmp;
  }

  async update(id: string, data: Partial<EmployeeRecord>) {
    const db = getDb();
    const index = db.employees.findIndex((e) => e.id === id);
    if (index === -1) return null;

    db.employees[index] = {
      ...db.employees[index],
      ...data,
      salaryAmount:
        data.salaryAmount !== undefined
          ? Number(data.salaryAmount)
          : db.employees[index].salaryAmount,
    };
    return db.employees[index];
  }

  async delete(id: string) {
    const db = getDb();
    const index = db.employees.findIndex((e) => e.id === id);
    if (index === -1) return false;

    db.employees.splice(index, 1);
    return true;
  }

  async recordPayout(
    employeeId: string,
    amount: number,
    method: 'CASH' | 'CARD' | 'SBP' | 'BANK_TRANSFER',
    comment?: string
  ) {
    const db = getDb();
    const emp = db.employees.find((e) => e.id === employeeId);
    if (!emp) throw new Error('Сотрудник не найден');

    if (amount <= 0) throw new Error('Сумма выплаты должна быть больше 0');

    const payment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      employeeId: emp.id,
      type: 'SALARY_PAYMENT',
      amount: Number(amount),
      method,
      description: comment
        ? `Выплата зарплаты: ${emp.fullName} (${emp.role}) — ${comment}`
        : `Выплата зарплаты: ${emp.fullName} (${emp.role})`,
      createdAt: getSystemTime().toISOString(),
    };

    db.payments.unshift(payment);
    return payment;
  }
}

export const employeeRepository = new EmployeeRepository();
