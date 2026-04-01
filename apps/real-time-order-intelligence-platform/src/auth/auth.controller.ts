import { Controller, Post, Get, UseGuards, Req, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RegisterInput } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterInput) {
    return this.authService.register(body);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Req() req: any) {
    const user = req.user;
    return this.authService.login(user);
  } // <- this brace was missing in your file

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: any) {
    return user;
  }
}
