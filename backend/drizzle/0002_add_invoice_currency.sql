-- Add currency column to invoices table
ALTER TABLE invoices ADD currency VARCHAR(3) NOT NULL CONSTRAINT DF_invoices_currency DEFAULT 'USD';

-- Update existing invoices to have PHP currency (if any exist)
UPDATE invoices SET currency = 'PHP' WHERE currency = 'USD';
