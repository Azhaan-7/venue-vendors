import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { validateEmail, validatePassword } from "../utils/validation";
import argon2 from "argon2";

export class UserController {
  private userRepository = AppDataSource.getRepository(User);

  async signUp(request: Request, response: Response) {
    const {email, password, role} = request.body;

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
    const user = this.userRepository.create({ email, password: hashedPassword, role, profile: {name: request.body.name, phoneNumber: "", isBusiness: false,},});
    await this.userRepository.save(user);
    return response.status(201).json({ user, message: "User created successfully" });   
  }

  async signIn(request: Request, response: Response) {
    const { email, password } = request.body;

    const user = await this.userRepository.findOne({
      where: { email },
      relations: ["profile"]
    });

    if (!user) {
      return response.status(401).json({message: "Invalid email or password"});
    }
    const validPassword = await argon2.verify(user.password,password);
    if (!validPassword) {
      return response.status(401).json({message: "Invalid email or password"});
    }
    return response.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.profile?.name
    });
  }
}