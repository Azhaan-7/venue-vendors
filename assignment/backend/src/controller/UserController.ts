import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { validateEmail, validatePassword } from "../utils/validation";
import argon2 from "argon2";
import { clearedSessionCookie, createSessionToken, sessionCookie } from "../auth/session";
import { UserRole } from "../entity/UserRole";

const sanitizeUser = (user: User) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  name: user.profile?.name,
});

export class UserController {
  private userRepository = AppDataSource.getRepository(User);

  async signUp(request: Request, response: Response) {
    const {email, password, role, name} = request.body;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100 ||
        typeof email !== "string" || email.length > 254 || typeof password !== "string" || password.length > 128) {
      return response.status(400).json({ message: "A name, email and password within the supported lengths are required" });
    }

    if (role !== UserRole.HIRER && role !== UserRole.VENDOR) {
      return response.status(400).json({ message: "Role must be hirer or vendor" });
    }

    if(!validateEmail(email)) {
      return response.status(400).json({ message: "Invalid email" });
    }

    const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return response.status(400).json({errors: passwordErrors});

        }

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
        return response.status(400).json({ message: "Email already exists" });
    }
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const user = this.userRepository.create({ email, password: hashedPassword, role, profile: {name: name.trim(), phoneNumber: "", isBusiness: false,},});
    await this.userRepository.save(user);
    return response.status(201).json({ user: sanitizeUser(user), message: "User created successfully" });
  }

  async signIn(request: Request, response: Response) {
    const { email, password } = request.body;
    if (typeof email !== "string" || email.length > 254 || !validateEmail(email) ||
        typeof password !== "string" || !password.length || password.length > 128) {
      return response.status(400).json({ message: "A valid email and password are required" });
    }

    const user = await this.userRepository.findOne({
      where: { email },
      select: { id: true, email: true, password: true, role: true },
      relations: ["profile"]
    });

    if (!user) {
      return response.status(401).json({message: "Invalid email or password"});
    }
    // Unknown legacy storage must go through an operator-reviewed recovery process.
    let validPassword = false;
    if (user.password?.startsWith("$argon2id$")) {
      try { validPassword = await argon2.verify(user.password, password); } catch { /* Generic denial below. */ }
    }
    if (!validPassword) {
      return response.status(401).json({message: "Invalid email or password"});
    }
    response.setHeader("Set-Cookie", sessionCookie(createSessionToken({ id: user.id, role: user.role })));
    return response.json(sanitizeUser(user));
  }

  async me(request: Request, response: Response) {
    const user = await this.userRepository.findOne({
      where: { id: request.authUser!.id },
      relations: ["profile"],
    });
    if (!user) return response.status(401).json({ message: "Authenticated user no longer exists" });
    return response.json(sanitizeUser(user));
  }

  signOut(_request: Request, response: Response) {
    response.setHeader("Set-Cookie", clearedSessionCookie());
    return response.status(204).send();
  }
}
