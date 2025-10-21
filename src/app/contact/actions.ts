"use server";

import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10).max(500),
});

type FormState = {
  success: boolean;
  message?: string;
};

export async function submitContactForm(
  values: z.infer<typeof formSchema>
): Promise<FormState> {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid fields.",
    };
  }

  // In a real application, you would send an email, save to a database, etc.
  console.log("New contact form submission:", validatedFields.data);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    success: true,
  };
}
