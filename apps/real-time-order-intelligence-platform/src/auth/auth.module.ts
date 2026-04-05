import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { User } from '../entities/user.entity'
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Module } from "@nestjs/common";
import { RolesGuard } from "./guards/roles.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
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
    providers:[AuthService, LocalStrategy, JwtStrategy, RolesGuard, JwtAuthGuard],
    exports:[AuthService, JwtStrategy, RolesGuard, JwtAuthGuard],
})
export class AuthModule {}