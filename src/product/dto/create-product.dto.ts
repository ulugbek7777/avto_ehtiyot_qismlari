export class CreateProductDto {
  itemId: number;

  brandId: number;

  modelId: number;

  price: number;

  wholesalePrice: number;

  purchasePrice: number;

  quantity: number;

  warehouseId: number;
}
export class SearchItemDto {
  name?: string;
}
export class CreateItemDto {
  name: string;
}
