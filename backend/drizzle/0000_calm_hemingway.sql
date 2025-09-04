IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='clients' AND xtype='U')
CREATE TABLE [clients] (
	[id] int IDENTITY(1,1) PRIMARY KEY NOT NULL,
	[user_id] int NOT NULL,
	[client_name] varchar(255) NOT NULL,
	[contact_person] varchar(255),
	[email] varchar(255),
	[address] ntext,
	[phone_number] varchar(50),
	[created_at] datetime DEFAULT getdate() NOT NULL,
	[updated_at] datetime DEFAULT getdate() NOT NULL
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='invoice_items' AND xtype='U')
CREATE TABLE [invoice_items] (
	[id] int IDENTITY(1,1) PRIMARY KEY NOT NULL,
	[invoice_id] int NOT NULL,
	[description] varchar(500) NOT NULL,
	[quantity] decimal(10, 2) NOT NULL,
	[unit_price] decimal(10, 2) NOT NULL,
	[total] decimal(10, 2) NOT NULL,
	[created_at] datetime DEFAULT getdate() NOT NULL
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='invoices' AND xtype='U')
CREATE TABLE [invoices] (
	[id] int IDENTITY(1,1) PRIMARY KEY NOT NULL,
	[client_id] int NOT NULL,
	[user_id] int NOT NULL,
	[invoice_number] varchar(100) NOT NULL,
	[issue_date] date NOT NULL,
	[due_date] date NOT NULL,
	[total_amount] decimal(10, 2) NOT NULL,
	[status] varchar(50) DEFAULT 'draft' NOT NULL,
	[payment_link] varchar(500),
	[notes] ntext,
	[created_at] datetime DEFAULT getdate() NOT NULL,
	[updated_at] datetime DEFAULT getdate() NOT NULL,
	CONSTRAINT [invoices_invoice_number_unique] UNIQUE([invoice_number])
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='projects' AND xtype='U')
CREATE TABLE [projects] (
	[id] int IDENTITY(1,1) PRIMARY KEY NOT NULL,
	[client_id] int NOT NULL,
	[project_name] varchar(255) NOT NULL,
	[description] ntext,
	[hourly_rate] decimal(10, 2) NOT NULL,
	[status] varchar(50) DEFAULT 'active' NOT NULL,
	[created_at] datetime DEFAULT getdate() NOT NULL,
	[updated_at] datetime DEFAULT getdate() NOT NULL
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='time_entries' AND xtype='U')
CREATE TABLE [time_entries] (
	[id] int IDENTITY(1,1) PRIMARY KEY NOT NULL,
	[project_id] int NOT NULL,
	[user_id] int NOT NULL,
	[date] date NOT NULL,
	[hours_logged] decimal(5, 2) NOT NULL,
	[description] ntext,
	[created_at] datetime DEFAULT getdate() NOT NULL,
	[updated_at] datetime DEFAULT getdate() NOT NULL
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE [users] (
	[id] int IDENTITY(1,1) PRIMARY KEY NOT NULL,
	[email] varchar(255) NOT NULL,
	[password_hash] varchar(255) NOT NULL,
	[company_name] varchar(255),
	[contact_person] varchar(255),
	[created_at] datetime DEFAULT getdate() NOT NULL,
	[updated_at] datetime DEFAULT getdate() NOT NULL,
	CONSTRAINT [users_email_unique] UNIQUE([email])
);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'clients_user_id_users_id_fk')
BEGIN
	ALTER TABLE [clients] ADD CONSTRAINT [clients_user_id_users_id_fk] FOREIGN KEY ([user_id]) REFERENCES [users]([id]);
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'invoice_items_invoice_id_invoices_id_fk')
BEGIN
	ALTER TABLE [invoice_items] ADD CONSTRAINT [invoice_items_invoice_id_invoices_id_fk] FOREIGN KEY ([invoice_id]) REFERENCES [invoices]([id]);
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'invoices_client_id_clients_id_fk')
BEGIN
	ALTER TABLE [invoices] ADD CONSTRAINT [invoices_client_id_clients_id_fk] FOREIGN KEY ([client_id]) REFERENCES [clients]([id]);
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'invoices_user_id_users_id_fk')
BEGIN
	ALTER TABLE [invoices] ADD CONSTRAINT [invoices_user_id_users_id_fk] FOREIGN KEY ([user_id]) REFERENCES [users]([id]);
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'projects_client_id_clients_id_fk')
BEGIN
	ALTER TABLE [projects] ADD CONSTRAINT [projects_client_id_clients_id_fk] FOREIGN KEY ([client_id]) REFERENCES [clients]([id]);
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'time_entries_project_id_projects_id_fk')
BEGIN
	ALTER TABLE [time_entries] ADD CONSTRAINT [time_entries_project_id_projects_id_fk] FOREIGN KEY ([project_id]) REFERENCES [projects]([id]);
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'time_entries_user_id_users_id_fk')
BEGIN
	ALTER TABLE [time_entries] ADD CONSTRAINT [time_entries_user_id_users_id_fk] FOREIGN KEY ([user_id]) REFERENCES [users]([id]);
END
