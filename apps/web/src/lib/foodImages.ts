/**
 * Utility to map menu items and categories to real, authentic food photography assets.
 * Guarantees zero fake gradient placeholders or emoji illustrations.
 */

export interface ItemImageInput {
  name?: string;
  categoryName?: string;
  image_url?: string | null;
}

export function getFoodImage(item: ItemImageInput): string {
  // If the item has a valid custom image URL, use it
  if (item.image_url && item.image_url.trim().length > 0 && !item.image_url.includes('placeholder')) {
    return item.image_url;
  }

  const query = `${item.name || ''} ${item.categoryName || ''}`.toLowerCase();

  // Coffee / Espresso / Latte
  if (
    query.includes('coffee') ||
    query.includes('cappuccino') ||
    query.includes('espresso') ||
    query.includes('latte') ||
    query.includes('mocha') ||
    query.includes('filter') ||
    query.includes('coeeff')
  ) {
    return '/images/menu/filter_coffee.jpg';
  }

  // Bun Maska / Samosa / Vada Pav / Cutlet / Bakery / Bites
  if (
    query.includes('bun maska') ||
    query.includes('maskabun') ||
    query.includes('samosa') ||
    query.includes('cutlet') ||
    query.includes('vada pav') ||
    query.includes('pav bhaji') ||
    query.includes('bites') ||
    query.includes('snack') ||
    query.includes('poha')
  ) {
    return '/images/menu/bun_maska.jpg';
  }

  // Sandwiches / Toast / Grilled
  if (
    query.includes('sandwich') ||
    query.includes('toast') ||
    query.includes('grilled') ||
    query.includes('cheese') ||
    query.includes('paneer tikka')
  ) {
    return '/images/menu/grilled_sandwich.jpg';
  }

  // Maggi / Noodles
  if (
    query.includes('maggi') ||
    query.includes('noodle')
  ) {
    return '/images/menu/masala_maggi.jpg';
  }

  // Coolers / Mojito / Shikanji / Ice Tea / Soda
  if (
    query.includes('cooler') ||
    query.includes('mojito') ||
    query.includes('shikanji') ||
    query.includes('ice tea') ||
    query.includes('iced') ||
    query.includes('blue lagoon') ||
    query.includes('aam panna') ||
    query.includes('peach') ||
    query.includes('shake')
  ) {
    return '/images/menu/mint_mojito.jpg';
  }

  // Chai / Tea / Kulhad / Spiced (Default & primary)
  return '/images/menu/kulhad_chai.jpg';
}
