import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { User } from '../entities/user.entity'
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Module } from "@nestjs/common";
@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        PassportModule.register({ defaultStrategy: 'jwt'}),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '15m' },
        }),
    ],
    controllers:[AuthController],
    providers:[AuthService, LocalStrategy, JwtStrategy],
    exports:[AuthService, JwtStrategy],
})
export class AuthModule {}