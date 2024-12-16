import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Replace with your own password verification logic
    if (user && user.password === password) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const User = await this.prisma.user.findUnique({
      where: { email: user.username },
    });
    if (User?.password !== user.password) {
      throw new UnauthorizedException();
    }
    
    const payload = { username: user.username, password: user.password };
    console.log(this.jwtService.sign(payload));
    
    return {
      access_token: this.jwtService.sign(payload),
      ...User
    };
  }

  async getUserWithRelations(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: true, // Include permissions
        warehouses: true,  // Include warehouses
      },
    });
  }

  create(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth';
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
