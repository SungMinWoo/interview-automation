import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요.')
    .email('올바른 이메일 형식을 입력해주세요.'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요.')
    .min(8, '비밀번호는 8자 이상이어야 합니다.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const projectSchema = z.object({
  title: z.string().min(1, '프로젝트명을 입력해주세요.').max(200, '프로젝트명은 200자 이내로 입력해주세요.'),
  client_name: z.string().min(1, '클라이언트 회사명을 입력해주세요.'),
  client_contact_email: z.string().email('올바른 이메일 형식을 입력해주세요.').optional().or(z.literal('')),
  client_contact_phone: z.string().optional(),
  requirements_text: z.string().min(1, '요구사항을 입력해주세요.'),
  existing_site_url: z.string().url('올바른 URL을 입력해주세요.').optional().or(z.literal('')),
  reference_sites: z
    .array(
      z.object({
        url: z.string().url('올바른 URL을 입력해주세요.'),
        title: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

export const employeeSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  email: z.string().min(1, '이메일을 입력해주세요.').email('올바른 이메일 형식을 입력해주세요.'),
  phone: z.string().optional().default(''),
  position: z.string().optional().default(''),
  department: z.string().optional().default(''),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const surveyPasswordSchema = z.object({
  password: z
    .string()
    .length(4, '비밀번호는 4자리 숫자입니다.')
    .regex(/^\d{4}$/, '숫자만 입력해주세요.'),
});

export type SurveyPasswordFormValues = z.infer<typeof surveyPasswordSchema>;
