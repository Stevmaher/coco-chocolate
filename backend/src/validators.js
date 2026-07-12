const { z } = require('zod');

const CATEGORIES = ['dark', 'milk', 'white', 'truffles', 'caramel', 'gifts'];
const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const SOURCES = ['WEBSITE', 'WHATSAPP'];

const productInput = z.object({
  name: z.string().trim().min(1).max(120),
  nameAr: z.string().trim().min(1).max(120),
  desc: z.string().trim().max(500).optional().default(''),
  price: z.number().positive().max(1000000),
  category: z.enum(CATEGORIES),
  stock: z.number().int().min(0).max(1000000).optional().default(0),
  icon: z.string().trim().max(8).optional().default('🍫'),
  image: z.string().trim().max(2000).optional().default(''),
  bestseller: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
});

const productUpdate = productInput.partial();

const orderItemInput = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive().max(1000),
});

const orderCreateInput = z.object({
  customerName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(30),
  source: z.enum(SOURCES).optional().default('WEBSITE'),
  items: z.array(orderItemInput).min(1),
});

const orderStatusInput = z.object({
  status: z.enum(STATUSES),
});

const adminLoginInput = z.object({
  pin: z.string().min(4).max(12),
});

module.exports = {
  CATEGORIES,
  STATUSES,
  SOURCES,
  productInput,
  productUpdate,
  orderCreateInput,
  orderStatusInput,
  adminLoginInput,
};
