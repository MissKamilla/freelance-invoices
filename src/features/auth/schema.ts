import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email('Вкажіть коректний email'),
  password: z.string().min(1, 'Введіть пароль'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Вкажіть ім'я").max(100),
  email: z.email('Вкажіть коректний email'),
  password: z.string().min(8, 'Пароль має містити щонайменше 8 символів').max(128),
});
