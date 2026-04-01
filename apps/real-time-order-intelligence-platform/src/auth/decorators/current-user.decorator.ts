import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import e from "express";

export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
        //
    }
)