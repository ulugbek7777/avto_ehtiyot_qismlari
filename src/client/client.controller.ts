import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClientService } from './client.service';
import {
  ConfirmProductEntryDto,
  CreateClientDto,
  CreateClientOrderDto,
} from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.clientService.findAll(search);
  }

  @Post('orders')
  createOrder(
    @Body() createClientOrderDto: CreateClientOrderDto,
    @Query('warehouseId', ParseIntPipe) warehouseId: number,
  ) {
    console.log('call');

    return this.clientService.createClientOrder(
      createClientOrderDto,
      warehouseId,
    );
  }

  @Post('orders/:orderId/confirm')
  async confirmClientOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    try {
      const confirmedOrder =
        await this.clientService.confirmClientOrder(orderId);
      return confirmedOrder;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get(':clientId/active-orders')
  async findAllClientActiveOrders(@Param('clientId') clientId: string) {
    const parsedClientId = parseInt(clientId, 10);

    if (isNaN(parsedClientId)) {
      throw new BadRequestException('Invalid clientId');
    }

    const { orders, fullname } =
      await this.clientService.findAllClientActiveOrders(parsedClientId);

    return {
      orders, // Only return active orders
      fullname, // Return client's full name
    };
  }

  @Delete('orders/:orderId/delete-order')
  async deleteOrder(@Param('orderId') orderId: any) {
    try {
      const result = await this.clientService.deleteClientOrder(
        parseInt(orderId),
      );
      return result; // Возвращаем успешное сообщение
    } catch (error) {
      throw new Error(error.message); // Возвращаем ошибку
    }
  }

  @Post('/payment/:orderId')
  async clientPaidForOrder(
    @Param('orderId') orderId: any, // Order ID
  ) {
    try {
      // Process the payment and update the order
      const updatedOrder = await this.clientService.clientPaidForOrder(
        parseInt(orderId),
      );

      // Return success message with the updated order data
      return {
        success: true,
        message: 'Платеж успешно обработан.',
        data: updatedOrder,
      };
    } catch (error) {
      // Return error message if something goes wrong
      throw new BadRequestException('Error processing payment.');
    }
  }

  @Get('orders/:orderId/product-sales')
  async getProductSaleByOrderId(@Param('orderId') orderId: string) {
    const parsedOrderId = parseInt(orderId, 10);

    if (isNaN(parsedOrderId)) {
      throw new BadRequestException('Invalid orderId');
    }

    const productSales =
      await this.clientService.getProductSaleByOrderId(parsedOrderId);

    return { productSales }; // Return the list of product sales related to the order
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.findOne(id);
  }

  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientService.create(createClientDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientService.update(id, updateClientDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.remove(id);
  }
}
