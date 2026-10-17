import { GraphQLError } from "graphql";
import { UserRole } from "../entity/UserRole";
import { AuthenticatedUser, userFromCookie } from "./session";

export interface GraphQLContext {
  user: AuthenticatedUser | null;
}

export function buildGraphQLContext(cookieHeader: string | undefined): GraphQLContext {
  return { user: userFromCookie(cookieHeader) };
}

export function requireAdmin(context: GraphQLContext): AuthenticatedUser {
  if (!context.user) {
    throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED", http: { status: 401 } } });
  }
  if (context.user.role !== UserRole.ADMIN) {
    throw new GraphQLError("Administrator access required", { extensions: { code: "FORBIDDEN", http: { status: 403 } } });
  }
  return context.user;
}
