import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { RoleService } from './role.service';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}
  @Get()
  async findAll() {
    return this.roleService.findAll();
  }

  // Endpoint pour récupérer tous les profils par type
  @Get('getByType/:type')
  async getByType(@Param('type') type: string): Promise<any> {
    const result = await this.roleService.findOneByType(type);
    if (!result) {
      return { message: `Aucun rôle trouvé pour type '${type}'` }; // ou throw 404
    }
    return result;
  }


  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Post('add/')
  async create(@Body() data: any) {
    return this.roleService.create(data);
  }

  @Put(':id')
  //@UseGuards(AuthGuard) // Protection avec JWT
  async update(@Param('id') id: string, @Body() data: any) {
    return this.roleService.update(id, data);
  }

  @Delete(':id')
  //@UseGuards(AuthGuard) // Protection avec JWT
  async delete(@Param('id') id: string) {
    return this.roleService.delete(id);
  } 
}
