import iftarKit from "@/assets/iftar-kit.jpg";
import premiumDates from "@/assets/premium-dates.jpg";
import premiumNuts from "@/assets/premium-nuts.jpg";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  badge?: string;
  weight: string;
  rating: number;
  reviews: number;
}

export const products: Product[] = [
  {
    id: "iftar-kit-premium",
    name: "Ramadan Iftar Kit – Premium",
    description: "A luxurious curated selection of premium dates, dry fruits, and nuts. Perfect for breaking your fast with the finest quality ingredients.",
    price: 1499,
    originalPrice: 1999,
    image: iftarKit,
    category: "Iftar Kits",
    badge: "Best Seller",
    weight: "1.2 kg",
    rating: 4.9,
    reviews: 234,
  },
  {
    id: "medjool-dates-500g",
    name: "Premium Medjool Dates",
    description: "Hand-picked, naturally sweet Medjool dates sourced from the finest farms. Rich in fiber and natural energy.",
    price: 799,
    originalPrice: 999,
    image: premiumDates,
    category: "Dates",
    badge: "Ramadan Special",
    weight: "500g",
    rating: 4.8,
    reviews: 189,
  },
  {
    id: "mixed-nuts-premium",
    name: "Premium Mixed Nuts Collection",
    description: "A rich blend of almonds, cashews, pistachios, and walnuts. Roasted to perfection for the ultimate snacking experience.",
    price: 899,
    originalPrice: 1199,
    image: premiumNuts,
    category: "Dry Fruits",
    weight: "500g",
    rating: 4.7,
    reviews: 156,
  },
  {
    id: "ajwa-dates-250g",
    name: "Ajwa Dates – Holy Medina",
    description: "Authentic Ajwa dates from Medina. Known for their unique taste and spiritual significance during Ramadan.",
    price: 1299,
    image: premiumDates,
    category: "Dates",
    badge: "Premium",
    weight: "250g",
    rating: 5.0,
    reviews: 98,
  },
  {
    id: "iftar-kit-family",
    name: "Family Iftar Kit",
    description: "A generous family-sized kit with dates, nuts, dried fruits, and specialty items for the whole family.",
    price: 2499,
    originalPrice: 2999,
    image: iftarKit,
    category: "Iftar Kits",
    badge: "Family Pack",
    weight: "2.5 kg",
    rating: 4.8,
    reviews: 112,
  },
  {
    id: "cashew-roasted-500g",
    name: "Premium Roasted Cashews",
    description: "Perfectly roasted whole cashews with a light salt seasoning. Crunchy, creamy, and irresistible.",
    price: 699,
    image: premiumNuts,
    category: "Dry Fruits",
    weight: "500g",
    rating: 4.6,
    reviews: 201,
  },
];

export const categories = ["All", "Iftar Kits", "Dates", "Dry Fruits"];
