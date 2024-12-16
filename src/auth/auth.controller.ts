import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: any): Promise<any> {
    // Implement your login logic here
    
    return this.authService.login(loginDto);
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const user = await this.authService.getUserWithRelations(req.user.id);
    return user; // User information, including permissions and warehouses
  }
}
