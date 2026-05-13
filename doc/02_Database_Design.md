# InBill ERP — Database Design & Schema

## Multi-Tenant Strategy
Every table includes a `business_id` foreign key. This enables data isolation in the cloud while maintaining a simple local structure.

---

## Core Schema (Prisma)

```prisma
model Business {
  id              String   @id @default(uuid())
  name            String
  gstin           String   @default("")
  businessType    String   @default("General")
  // ... address and contact info
}

model Product {
  id              String    @id @default(uuid())
  businessId      String
  name            String
  sku             String    @default("")
  barcode         String    @default("")
  categoryId      String?
  mrp             Float     @default(0)
  sellingPrice    Float     @default(0)
  taxRateId       String?
  unit            String    @default("pcs")
  quantity        Int       @default(0)
  customFields    Json      @default("{}")
}

model Sale {
  id              String    @id @default(uuid())
  businessId      String
  invoiceNumber   String
  invoiceDate     DateTime  @default(now())
  totalAmount     Float     @default(0)
  paymentMode     String    @default("Cash")
  items           SaleItem[]
}

model Party {
  id              String    @id @default(uuid())
  businessId      String
  name            String
  type            PartyType @default(CUSTOMER)
  currentBalance  Float     @default(0)
}
```

## Indexing Strategy
| Table | Index | Purpose |
|-------|-------|---------|
| `products` | `(business_id, barcode)` | POS barcode scan lookup |
| `products` | `(business_id, name)` | Search-as-you-type |
| `sales` | `(business_id, invoice_number)` | Invoice lookup |

## SQLite Sync Support
Every table in the local SQLite database will have a `sync_status` column (`local`, `synced`, `conflict`) and a `uuid` to match records with the cloud PostgreSQL database.
