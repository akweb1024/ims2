import { calculateInvoiceTaxBreakdown } from './src/lib/invoice-tax';

const customer = {
  customerType: 'INDIVIDUAL',
  billingCountry: 'India',
  billingStateCode: '09', // UP
};

const company = {
  stateCode: '09', // UP
};

const items = [
  {
    id: 1,
    description: 'Journal Print Product 1',
    quantity: 1,
    price: 1000,
    productCategory: 'JOURNAL_SUBSCRIPTION',
    productAttributes: {
      subscriptionOptions: {
        mode: 'PRINT'
      }
    }
  },
  {
    id: 2,
    description: 'Journal Digital Product 1',
    quantity: 1,
    price: 1000,
    productCategory: 'JOURNAL_SUBSCRIPTION',
    productAttributes: {
      subscriptionOptions: {
        mode: 'DIGITAL'
      }
    }
  },
  {
      id: 3,
      description: 'Journal Print + Digital Product 1',
      quantity: 1,
      price: 1000,
      productCategory: 'JOURNAL_SUBSCRIPTION',
      productAttributes: {
        subscriptionOptions: {
          mode: 'PRINT_DIGITAL'
        }
      }
    }
];

const breakdown = calculateInvoiceTaxBreakdown({
  customer,
  company,
  items,
  defaultTaxRate: 18
});

console.log('Tax Breakdown:');
breakdown.lineItems.forEach(item => {
  console.log(`- ${item.description}: Rate=${item.taxRate}%, Tax=${item.taxAmount}, Label=${item.taxRuleLabel}, Mode=${item.productAttributes?.subscriptionOptions?.mode}`);
});

console.log(`Total Tax: ${breakdown.tax}`);
console.log(`Total Amount: ${breakdown.total}`);
