export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];

  if (!password.length) errors.push("Password is required.");
  if (password.length > 128) errors.push("Password must be 128 characters or fewer.");

  return errors;
}
