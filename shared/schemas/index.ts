import { z } from "zod";

export const UserLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const UserRegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.string().default("admin"),
  company_name: z.string().min(2, "Company name must be at least 2 characters"),
  company_industry: z.string().optional().default("Construction"),
});

export const ProjectCreateSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  contractor_name: z.string().min(2, "Contractor name is required"),
  location: z.string().min(2, "Location is required"),
  state: z.string().optional(),
  lga: z.string().optional(),
  project_type: z.string().default("Infrastructure"),
  budget_allocated: z.number().nonnegative().optional(),
  budget_spent: z.number().nonnegative().optional(),
  workforce_count: z.number().int().nonnegative().optional(),
  equipment_count: z.number().int().nonnegative().optional(),
  material_cost: z.number().nonnegative().optional(),
  completion_percentage: z.number().min(0).max(100).optional(),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

export const LogCreateSchema = z.object({
  project_id: z.string().min(1, "Project ID is required"),
  log_text: z.string().min(5, "Log text must be at least 5 characters"),
});

export const WorkforceCreateSchema = z.object({
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  role: z.string().min(2, "Role is required"),
  skills: z.string().optional(),
  project_id: z.string().nullable().optional(),
});
