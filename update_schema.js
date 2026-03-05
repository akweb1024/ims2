const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
schema = schema.replace(
/  placeOfSupplyCode String\?/g,
`  placeOfSupplyCode String?
  companyStateCode  String?
  cgst              Float?        @default(0)
  sgst              Float?        @default(0)
  igst              Float?        @default(0)
  cgstRate          Float?        @default(0)
  sgstRate          Float?        @default(0)
  igstRate          Float?        @default(0)`
);
fs.writeFileSync('prisma/schema.prisma', schema);
