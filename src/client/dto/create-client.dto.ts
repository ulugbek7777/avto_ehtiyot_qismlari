class ProductOrderDto {
  productId: number;
  quantity: number;
}

export class CreateClientOrderDto {
  type: 'retail' | 'wholesale';
  paymentStatus: 'credit' | 'paid';
  products: ProductOrderDto[];
  clientId: number;
  amountPaid: number;
  payday: string; // Consider using a custom validator for date if needed
}

export class ConfirmProductEntryDto {
  productId: number;
  quantity: number;
}

export class CreateClientDto {
  name: string;
  phone: string;
}
