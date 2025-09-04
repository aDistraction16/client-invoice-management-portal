ALTER TABLE "projects" ADD CONSTRAINT DF_projects_currency DEFAULT 'PHP' FOR "currency";
ALTER TABLE "invoices" ADD "currency" varchar(3) NOT NULL CONSTRAINT DF_invoices_currency DEFAULT 'PHP';