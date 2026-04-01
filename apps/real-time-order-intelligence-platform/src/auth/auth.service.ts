import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "../entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import { RegisterInput } from "./dto/register.dto";


@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
    ) {}

    async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: {email} } )

    if(!user){
        return null;
    }
    const isValid = await bcrypt.compare(password, user.password_hash)
    if(!isValid){
        return null;
    }
    const { password_hash, ...result } = user;
    return result 
}

    async login(user: any) {

        const token = this.jwtService.sign({
            sub: user.user_id,
            role: user.role,
            email: user.email,

        })
        return {accessToken: token};

    }

    async register(input: RegisterInput) {
        const { email, password, name, role } = input;
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await this.userRepository.findOne({
            where: { email: normalizedEmail },
        })
        if(existingUser){
            throw new ConflictException("email already registered register with a new one")
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = this.userRepository.create({
            email: normalizedEmail,
            password_hash: hashedPassword,
            name,
            role: role ?? 'CUSTOMER',//safe default for public registering
        })
        const savedUser = await this.userRepository.save(newUser);

        const { password_hash, ...safeUser} = savedUser;
        
        return safeUser;
    }
}