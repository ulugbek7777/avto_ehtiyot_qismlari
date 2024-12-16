import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ConfirmProductEntryDto,
  CreateClientDto,
  CreateClientOrderDto,
} from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all clients
  async findAll(search?: string) {
    const currentDate = new Date(); // Hozirgi sana

    const clients = await this.prisma.client.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {},
      select: {
        id: true,
        name: true,
        phone: true,
        clientOrders: {
          // where: {
          //   AND: [{ confirmed: false }],
          // },
          select: {
            balance: true,
            status: true,
            payday: true, // Payday ni tanlaymiz
            confirmed: true, // confirmed maydonini tanlaymiz
          },
        },
      },
    });

    return clients.map((client) => {
      let overdueDebt = 0;
      let confirmedFalseCount = 0; // confirmed: false ordersni sanash uchun

      const totalDebt = client.clientOrders.reduce((sum, order) => {
        // Agar payday hozirgi sanadan kichik bo'lsa, statusni 'overdue' qilib belgilaymiz
        if (order.payday && order.payday < currentDate) {
          overdueDebt += order.balance; // Overdue qarzni yig'amiz
        }

        // confirmed: false bo'lsa, countni oshiramiz
        if (!order.confirmed) {
          confirmedFalseCount++;
        }

        return sum + order.balance; // Jami qarzga qo'shamiz
      }, 0);

      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        totalDebt, // Jami qarz
        overdueDebt, // Overdue qarz
        confirmedFalseCount, // confirmed: false buyurtmalar soni
      };
    });
  }

  // services/client.service.ts
  async findAllClientActiveOrders(clientId: number) {
    const currentDate = new Date(); // Joriy sana

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        name: true, // Mijozning to'liq ismi
        clientOrders: {
          select: {
            id: true,
            balance: true,
            status: true,
            payday: true,
            totalAmount: true,
            confirmed: true,
          },
        },
      },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Faol buyurtmalarni olish: balance 0 bo'lmagan va confirmed bo'lmagan buyurtmalar
    const activeOrders = client.clientOrders.filter(
      (order) => order.balance > 0 || !order.confirmed,
    );

    // Faol buyurtmalarni qaytarish
    const orders = activeOrders.map((order) => ({
      id: order.id,
      balance: order.balance,
      status: order.status,
      payday: order.payday,
      totalAmount: order.totalAmount,
      confirmed: order.confirmed,
    }));

    return {
      orders, // Faol buyurtmalar
      fullname: client.name, // Mijozning to'liq ismi
    };
  }

  async deleteClientOrder(orderId: number) {
    // Find the order
    const order = await this.prisma.clientOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Заказ не найден.');
    }

    // Delete the order
    await this.prisma.clientOrder.delete({
      where: { id: orderId },
    });

    return { success: true, message: 'Заказ успешно удалён.' };
  }

  // services/client.service.ts
  async getProductSaleByOrderId(orderId: number) {
    const productSales = await this.prisma.productSale.findMany({
      where: { clientOrderId: orderId }, // Filter by orderId
      select: {
        id: true,
        totalAmount: true,
        quantity: true,
        productId: true,
        saleDate: true,
        clientOrderId: true,
        product: {
          select: {
            itemModelBrandRelation: {
              select: {
                item: {
                  select: {
                    name: true, // Item name
                  },
                },
                brand: {
                  select: {
                    name: true, // Brand name
                  },
                },
                model: {
                  select: {
                    name: true, // Model name
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!productSales || productSales.length === 0) {
      throw new Error('No product sales found for the provided orderId');
    }

    // Format the response to include itemName, brandName, and modelName but exclude the entire product object
    return productSales.map((sale) => ({
      id: sale.id,
      totalAmount: sale.totalAmount,
      quantity: sale.quantity,
      productId: sale.productId,
      saleDate: sale.saleDate,
      clientOrderId: sale.clientOrderId,
      itemName: sale.product.itemModelBrandRelation.item.name,
      brandName: sale.product.itemModelBrandRelation.brand.name,
      modelName: sale.product.itemModelBrandRelation.model.name,
    }));
  }

  // Create Client Order
  async createClientOrder(
    createClientOrderDto: CreateClientOrderDto,
    warehouseId: number,
  ) {
    const { type, paymentStatus, products, clientId, amountPaid, payday } =
      createClientOrderDto;

    // Step 1: Create the client order
    const order = await this.prisma.clientOrder.create({
      data: {
        warehouseId,
        orderDate: new Date(),
        totalAmount: 0, // Will calculate later
        amountPaid,
        balance: 0, // Will calculate later
        status: paymentStatus,
        clientId,
        payday,
        confirmed: false,
        type,
        productSales: {
          create: products.map(({ productId, quantity }) => ({
            productId,
            warehouseId,
            quantity,
            type,
            totalAmount: 0, // Will calculate later
          })),
        },
      },
      include: {
        productSales: true, // Include productSales to retrieve their IDs
      },
    });

    // Step 2: Calculate total amounts for each product sale
    const updatedOrders = await Promise.all(
      order.productSales.map(async (productSale) => {
        const product = await this.prisma.product.findUnique({
          where: { id: productSale.productId },
          include: {
            itemModelBrandRelation: true,
          },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${productSale.productId} not found`,
          );
        }

        const price =
          type === 'retail'
            ? product.itemModelBrandRelation.price
            : product.itemModelBrandRelation.wholesalePrice;

        const totalAmount = price * productSale.quantity;

        // Update the productSale with the calculated totalAmount
        await this.prisma.productSale.update({
          where: { id: productSale.id },
          data: { totalAmount },
        });

        return totalAmount;
      }),
    );

    // Step 3: Update the ClientOrder with the total amount and balance
    const orderTotalAmount = updatedOrders.reduce((sum, curr) => sum + curr, 0);

    return await this.prisma.clientOrder.update({
      where: { id: order.id },
      data: {
        totalAmount: orderTotalAmount,
        balance: paymentStatus === 'credit' ? orderTotalAmount : 0,
      },
    });
  }

  async confirmClientOrder(orderId: number) {
    // Найти заказ клиента и связанные продажи продуктов
    const order = await this.prisma.clientOrder.findUnique({
      where: { id: orderId },
      include: { productSales: true },
    });

    if (!order) {
      throw new NotFoundException(`Заказ клиента с ID ${orderId} не найден.`);
    }

    // Проверить, не был ли заказ уже подтвержден
    if (order.confirmed) {
      throw new Error(`Заказ с ID ${orderId} уже подтвержден.`);
    }

    // Проверить наличие достаточного количества продукта для всех продаж
    for (const productSale of order.productSales) {
      const product = await this.prisma.product.findUnique({
        where: { id: productSale.productId },
      });

      if (!product) {
        throw new NotFoundException(
          `Продукт с ID ${productSale.productId} не найден.`,
        );
      }

      // Проверка на достаточное количество
      if (product.quantity < productSale.quantity) {
        throw new Error(
          `Недостаточное количество для продукта с ID ${productSale.productId}. Доступно: ${product.quantity}, требуется: ${productSale.quantity}.`,
        );
      }
    }

    // Уменьшить количество продуктов и обновить ProductEntry
    for (const productSale of order.productSales) {
      let remainingQuantity = productSale.quantity;

      // Найти записи продуктов, отсортированные по дате
      const productEntries = await this.prisma.productEntry.findMany({
        where: {
          productId: productSale.productId,
          salled: false,
        },
        orderBy: { entryDate: 'asc' },
      });

      for (const entry of productEntries) {
        if (remainingQuantity <= 0) break;

        const availableQuantity = entry.quantity - entry.saledQuantity;
        const quantityToSell = Math.min(availableQuantity, remainingQuantity);

        // Обновить saledQuantity
        await this.prisma.productEntry.update({
          where: { id: entry.id },
          data: {
            saledQuantity: entry.saledQuantity + quantityToSell,
            salled: entry.saledQuantity + quantityToSell === entry.quantity,
          },
        });

        remainingQuantity -= quantityToSell;
      }

      if (remainingQuantity > 0) {
        throw new Error(
          `Невозможно выполнить заказ для продукта с ID ${productSale.productId}.`,
        );
      }

      // Обновить количество продукта
      await this.prisma.product.update({
        where: { id: productSale.productId },
        data: {
          quantity: {
            decrement: productSale.quantity,
          },
        },
      });
    }

    // Подтвердить заказ клиента
    const updatedOrder = await this.prisma.clientOrder.update({
      where: { id: orderId },
      data: {
        confirmed: true,
      },
    });

    return {
      message: `Заказ клиента с ID ${orderId} успешно подтвержден.`,
      order: updatedOrder,
    };
  }

  async clientPaidForOrder(
    orderId: number, // ID of the order to be paid
  ) {
    // Retrieve the order associated with the client
    const order = await this.prisma.clientOrder.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // If the order is already fully paid, return an error
    if (order.balance <= 0) {
      throw new BadRequestException('Order is already fully paid');
    }

    // Update the order: set balance to 0, set totalAmountPaid to totalAmount, and change status to 'PAID'
    const updatedOrder = await this.prisma.clientOrder.update({
      where: { id: orderId },
      data: {
        balance: 0, // Set balance to 0
        amountPaid: order.totalAmount,
        status: 'paid',
      },
    });

    return updatedOrder; // Return updated order
  }

  @Cron(CronExpression.EVERY_2_HOURS) // Runs every 2 hours
  async checkOverdueClientOrders() {
    const currentDate = new Date();

    // Find ClientOrders where payday has passed, payment is insufficient, and status is not overdue
    const overdueOrders = await this.prisma.clientOrder.findMany({
      where: {
        payday: {
          lt: currentDate, // Payday is in the past
        },
        amountPaid: {
          lt: this.prisma.clientOrder.fields.totalAmount, // Unpaid balance
        },
        status: {
          notIn: ['overdue', 'paid'], // Not already overdue
        },
        confirmed: {
          not: false,
        },
      },
    });

    // Update status to overdue for all matching orders
    const updates = overdueOrders.map((order) =>
      this.prisma.clientOrder.update({
        where: { id: order.id },
        data: { status: 'overdue' },
      }),
    );

    await Promise.all(updates);

    console.log(`${overdueOrders.length} client orders marked as overdue.`);
  }

  // Get a client by ID
  async findOne(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  async findByName(name: string) {
    const clients = await this.prisma.client.findMany({
      where: {
        name: {
          contains: name, // Performs a partial match
          mode: 'insensitive', // Case-insensitive search
        },
      },
    });

    if (!clients || clients.length === 0) {
      throw new NotFoundException(
        `No clients found with name containing "${name}"`,
      );
    }

    return clients;
  }

  // Create a new client
  async create(createClientDto: CreateClientDto) {
    const { name, phone } = createClientDto;

    const newClient = await this.prisma.client.create({
      data: {
        name,
        phone,
      },
    });

    return newClient;
  }

  // Update a client by ID
  async update(id: number, updateClientDto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    const updatedClient = await this.prisma.client.update({
      where: { id },
      data: updateClientDto,
    });

    return updatedClient;
  }

  // Delete a client by ID
  async remove(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    await this.prisma.client.delete({
      where: { id },
    });

    return { message: `Client with ID ${id} has been deleted` };
  }
}
