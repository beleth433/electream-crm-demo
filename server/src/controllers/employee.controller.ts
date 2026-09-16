import { Request, Response } from 'express';
import { employeeRepository } from '../repositories/employee.repository.js';

export class EmployeeController {
  static async getEmployees(req: Request, res: Response) {
    try {
      const employees = await employeeRepository.findAll();
      res.json(employees);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка загрузки сотрудников' });
    }
  }

  static async getEmployeeById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const employee = await employeeRepository.findById(id);
      if (!employee) {
        return res.status(404).json({ error: 'Сотрудник не найден' });
      }
      res.json(employee);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка загрузки сотрудника' });
    }
  }

  static async createEmployee(req: Request, res: Response) {
    try {
      const { fullName, phone, email, role, salaryType, salaryAmount, status, notes, hiredAt } =
        req.body;

      if (!fullName || !phone || !role || salaryAmount === undefined) {
        return res.status(400).json({ error: 'Укажите ФИО, телефон, должность и размер ставки' });
      }

      const created = await employeeRepository.create({
        fullName,
        phone,
        email,
        role,
        salaryType: salaryType || 'MONTHLY',
        salaryAmount: Number(salaryAmount),
        status: status || 'ACTIVE',
        notes,
        hiredAt,
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Ошибка создания сотрудника' });
    }
  }

  static async updateEmployee(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await employeeRepository.update(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Сотрудник не найден' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Ошибка обновления сотрудника' });
    }
  }

  static async deleteEmployee(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await employeeRepository.delete(id);
      if (!success) {
        return res.status(404).json({ error: 'Сотрудник не найден' });
      }
      res.json({ success: true, message: 'Сотрудник удален' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка удаления сотрудника' });
    }
  }

  static async payoutSalary(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { amount, method, comment } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Укажите корректную сумму выплаты' });
      }

      const payment = await employeeRepository.recordPayout(
        id,
        Number(amount),
        method || 'CASH',
        comment
      );

      res.status(201).json({
        success: true,
        message: 'Выплата зарплаты успешно проведена и зафиксирована в кассе',
        payment,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Ошибка проведения выплаты' });
    }
  }
}
