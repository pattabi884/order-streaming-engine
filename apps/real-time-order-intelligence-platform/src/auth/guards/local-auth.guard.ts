import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// guards/local-auth.guard.ts
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
