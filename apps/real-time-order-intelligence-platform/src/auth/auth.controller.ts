import { Controller, Post, UseGuards, Req, Res, Body} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { RegisterInput } from './dto/register.dto';
//import { LocalAuthGuard  } from './guards/local-auth.guard'

@Controller('auth')
    export class AuthController{
    constructor(private readonly authService: AuthService){}

    @Post('register')
    async register(@Body() body: RegisterInput){
        return this.authService.register(body);
        

    }

    @Post('login') 
    @UseGuards(LocalAuthGuard)
    //guard runs befoe method body to ensure if credentials fail method never runs 

    async login(@Req() req: any){
        const user = req.user;

        return this.authService.login(user)

    }
    }