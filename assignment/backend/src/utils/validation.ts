export function validateEmail(email: string): boolean {
    return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (typeof password !== "string") return ["Password is required"];
    if (password.length < 6) errors.push("At least 6 characters");
    if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
    if (!/\d/.test(password)) errors.push("At least one number");
    if (!/[@$!%*?&]/.test(password)) errors.push("At least one special character (@$!%*?&)");
    return errors;
}

export function validatePhone(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const phone = value.trim();
    const digits = phone.replace(/\D/g, "").length;
    return phone.length <= 20 && /^\+?\d[\d\s]*$/.test(phone) && digits >= 8 && digits <= 12;
}
