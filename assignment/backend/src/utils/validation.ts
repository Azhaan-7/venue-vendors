export function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (password.length < 6) errors.push("At least 6 characters");
    if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
    if (!/\d/.test(password)) errors.push("At least one number");
    if (!/[@$!%*?&]/.test(password)) errors.push("At least one special character (@$!%*?&)");
    return errors;
}