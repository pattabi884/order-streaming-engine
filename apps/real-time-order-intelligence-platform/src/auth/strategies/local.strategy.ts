import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService){
        super( { usernameField: 'email' });
        //tells passport-local to look for 'email' field
        //isted of user name 
    }
    async validate(email: string, password: string): Promise<any> {
        const user = await this.authService.validateUser(email, password)
        if(!user){
            //i dont know what the validate user returns u have mentionioned any type
            throw new UnauthorizedException("invalid credentilas or credentials not found");
        }
        return user;
    }
}



