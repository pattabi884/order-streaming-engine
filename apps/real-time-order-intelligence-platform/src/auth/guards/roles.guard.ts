import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core'

@Injectable()
export class RolesGuard implements CanActivate {
    constructor( private readonly reflector: Reflector){}
    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);

        //if no @Roles() deccorator on this endpoint 
        //allow all the authenticated users through 
        if(!requiredRoles) return true;

        const { user } = context.switchToHttp().getRequest();
        //user role comes form jwtstrategy.validate() 
        //check if the user roles is int the req roles array 
        return requiredRoles.includes(user.role);
    }
}