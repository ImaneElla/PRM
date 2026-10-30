import { ChangeEvent, FormEvent, useState } from "react";
import { AuthError } from "@/services/authService";

export type FormErrors<T> = Partial<Record<keyof T, string>>;

interface UseAuthFormOptions<T> {
  initialValues: T;
  validate: (values: T) => FormErrors<T>;
  onSubmit: (values: T) => Promise<void>;
}

/*Hook de formulaire d'authentification.*/
export function useAuthForm<T extends object>({
  initialValues,
  validate,
  onSubmit,
}: UseAuthFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field: keyof T, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(
        error instanceof AuthError ? error.message : "Une erreur est survenue. Réessayez."
      );
      setIsSubmitting(false);
    }
  }

  /** Props communes à brancher sur un input ou un select. */
  function getFieldProps(field: keyof T) {
    const name = String(field);

    return {
      value: String(values[field] ?? ""),
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        handleChange(field, event.target.value),
      disabled: isSubmitting,
      "aria-invalid": Boolean(errors[field]),
      "aria-describedby": errors[field] ? `${name}-error` : undefined,
    };
  }

  return { errors, formError, isSubmitting, handleSubmit, getFieldProps };
}