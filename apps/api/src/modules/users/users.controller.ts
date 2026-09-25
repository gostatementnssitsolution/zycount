import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  PERMISSIONS,
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@zycount/shared";
import { z } from "zod";
import { ClientInfo, CurrentUser, RequirePermission } from "../../common/decorators";
import type { AuthenticatedUser, ClientContext } from "../../common/guards/types";
import { zodBody, zodQuery } from "../../common/pipes/zod-validation.pipe";
import { UsersService } from "./users.service";

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("users")
  @RequirePermission(PERMISSIONS.USER_VIEW)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(zodQuery(listUsersQuerySchema)) query: z.infer<typeof listUsersQuerySchema>,
  ) {
    return this.users.list(user.organizationId, query);
  }

  @Get("users/:id")
  @RequirePermission(PERMISSIONS.USER_VIEW)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.users.findOne(user.organizationId, id);
  }

  @Post("users")
  @RequirePermission(PERMISSIONS.USER_CREATE)
  create(
    @Body(zodBody(createUserSchema)) body: CreateUserInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.users.create(body, user, client);
  }

  @Patch("users/:id")
  @RequirePermission(PERMISSIONS.USER_EDIT)
  update(
    @Param("id") id: string,
    @Body(zodBody(updateUserSchema)) body: UpdateUserInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.users.update(user.organizationId, id, body, user, client);
  }

  @Delete("users/:id")
  @RequirePermission(PERMISSIONS.USER_DELETE)
  deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.users.deactivate(user.organizationId, id, user, client);
  }

  @Get("roles")
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  roles() {
    return this.users.listRoles();
  }

  @Get("permissions")
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  permissions() {
    return this.users.listPermissions();
  }
}
