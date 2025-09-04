import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Send as SendIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  NotificationsActive as ReminderIcon,
  Undo as UndoIcon,
  ChangeCircle as ChangeStatusIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import api, { invoicesAPI, clientsAPI, timeEntriesAPI, projectsAPI } from '../../services/api';
import { Invoice, InvoiceFormData, InvoiceItemFormData, Client, TimeEntry, Project } from '../../types';
import { formatDate, formatCurrency } from '../../utils';
import PaymentLinkDialog from '../payments/PaymentLinkDialog';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [invoiceToChangeStatus, setInvoiceToChangeStatus] = useState<Invoice | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusChangeReason, setStatusChangeReason] = useState<string>('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<InvoiceFormData>({
    defaultValues: {
      clientId: 0,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const selectedClientId = watch('clientId');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const [invoicesRes, clientsRes, projectsRes, timeEntriesRes] = await Promise.all([
        invoicesAPI.getAll(),
        clientsAPI.getAll(),
        projectsAPI.getAll(),
        timeEntriesAPI.getAll()
      ]);
      setInvoices(invoicesRes.invoices);
      setClients(clientsRes.clients);
      setProjects(projectsRes.projects);
      setTimeEntries(timeEntriesRes.timeEntries);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleOpen = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      reset({
        clientId: invoice.clientId,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        items: invoice.items?.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice)
        })) || [{ description: '', quantity: 1, unitPrice: 0 }],
        notes: invoice.notes || '',
      });
    } else {
      setEditingInvoice(null);
      reset({
        clientId: 0,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ description: '', quantity: 1, unitPrice: 0 }],
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingInvoice(null);
    reset();
  };

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setSubmitting(true);
      if (editingInvoice) {
        // Exclude clientId from updates since it can't be changed
        const { clientId, ...updateData } = data;
        await invoicesAPI.update(editingInvoice.id, updateData);
      } else {
        await invoicesAPI.create(data);
      }
      await fetchInvoices();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoicesAPI.delete(id);
        await fetchInvoices();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete invoice');
      }
    }
  };

  const handleStatusUpdate = async (id: number, action: 'send' | 'pay') => {
    try {
      if (action === 'send') {
        await invoicesAPI.markAsSent(id);
      } else {
        await invoicesAPI.markAsPaid(id);
      }
      await fetchInvoices();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to mark invoice as ${action === 'send' ? 'sent' : 'paid'}`);
    }
  };

  const generateFromTimeEntries = () => {
    const clientTimeEntries = timeEntries.filter(
      entry => {
        const client = clients.find(c => c.id === selectedClientId);
        return client && entry.clientName === client.clientName;
      }
    );

    if (clientTimeEntries.length === 0) {
      setError('No time entries found for this client');
      return;
    }

    const items: InvoiceItemFormData[] = clientTimeEntries.map(entry => {
      // Find the project for this time entry to get the hourly rate
      const project = projects.find(p => p.id === entry.projectId);
      const hourlyRate = project ? parseFloat(project.hourlyRate) : 0;

      return {
        description: `${entry.projectName} - ${entry.description || 'Time entry'}`,
        quantity: parseFloat(entry.hoursLogged),
        unitPrice: hourlyRate,
      };
    });

    reset({
      clientId: selectedClientId,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items,
      notes: `Invoice for time entries from ${formatDate(clientTimeEntries[0]?.date)} to ${formatDate(clientTimeEntries[clientTimeEntries.length - 1]?.date)}`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'sent':
        return 'primary';
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.clientName || 'Unknown Client';
  };

  const getClientCurrency = (clientId: number) => {
    // Find the most common currency used by this client's projects
    const clientProjects = projects.filter(p => p.clientId === clientId);
    if (clientProjects.length === 0) return 'PHP'; // Default to PHP
    
    // Count currency usage
    const currencyCount: { [key: string]: number } = {};
    clientProjects.forEach(project => {
      const currency = project.currency || 'PHP';
      currencyCount[currency] = (currencyCount[currency] || 0) + 1;
    });
    
    // Return the most used currency
    return Object.keys(currencyCount).reduce((a, b) => 
      currencyCount[a] > currencyCount[b] ? a : b
    );
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handleDownloadPDF = async (invoiceId: number, invoiceNumber: string) => {
    try {
      console.log('🔍 Downloading PDF for invoice:', invoiceId);
      
      // Use the base api instance instead of invoicesAPI
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob', // Important for binary data
      });

      // Create blob from response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ PDF downloaded successfully');
    } catch (error: any) {
      console.error('❌ Error downloading PDF:', error);
      setError('Failed to download PDF. Please try again.');
    }
  };

  const handleSendReminder = async (invoiceId: number, invoiceNumber: string) => {
    try {
      console.log('📧 Sending payment reminder for invoice:', invoiceId);
      
      const response = await api.post(`/invoices/${invoiceId}/remind`);
      
      if (response.data) {
        setSuccess(`Payment reminder sent successfully for invoice ${invoiceNumber}`);
        console.log('✅ Payment reminder sent:', response.data);
      }
    } catch (error: any) {
      console.error('❌ Error sending reminder:', error);
      setError('Failed to send payment reminder. Please try again.');
    }
  };

  const handleStatusChange = (invoice: Invoice) => {
    setInvoiceToChangeStatus(invoice);
    setNewStatus(invoice.status);
    setStatusChangeReason('');
    setStatusChangeDialogOpen(true);
  };

  const handleStatusChangeSubmit = async () => {
    if (!invoiceToChangeStatus || !newStatus) return;

    try {
      const response = await invoicesAPI.updateStatus(
        invoiceToChangeStatus.id,
        newStatus,
        statusChangeReason || undefined
      );

      if (response) {
        setSuccess(`Invoice status updated from ${response.previousStatus} to ${newStatus}`);
        
        // Update the invoice in the local state
        setInvoices(prev => prev.map(inv => 
          inv.id === invoiceToChangeStatus.id 
            ? { ...inv, status: newStatus as any }
            : inv
        ));
        
        setStatusChangeDialogOpen(false);
        setInvoiceToChangeStatus(null);
      }
    } catch (error: any) {
      console.error('❌ Error updating status:', error);
      setError('Failed to update invoice status. Please try again.');
    }
  };

  const handleQuickStatusChange = async (invoice: Invoice, targetStatus: string) => {
    try {
      const response = await invoicesAPI.updateStatus(
        invoice.id,
        targetStatus,
        `Quick status change from ${invoice.status} to ${targetStatus}`
      );

      if (response) {
        setSuccess(`Invoice status updated to ${targetStatus}`);
        
        // Update the invoice in the local state
        setInvoices(prev => prev.map(inv => 
          inv.id === invoice.id 
            ? { ...inv, status: targetStatus as any }
            : inv
        ));
      }
    } catch (error: any) {
      console.error('❌ Error updating status:', error);
      setError('Failed to update invoice status. Please try again.');
    }
  };

  const handleCreatePaymentLink = (invoice: Invoice) => {
    setInvoiceForPayment(invoice);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    // Refresh invoices to get updated payment status
    fetchInvoices();
    setSuccess('Payment link created successfully!');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Invoices</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Create Invoice
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    No invoices found. Create your first invoice to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <ReceiptIcon fontSize="small" color="action" />
                      #{invoice.invoiceNumber || invoice.id}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon fontSize="small" color="action" />
                      {getClientName(invoice.clientId)}
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} 
                      color={getStatusColor(invoice.status) as any}
                      variant="outlined" 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {formatCurrency(invoice.totalAmount, getClientCurrency(invoice.clientId))}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleViewInvoice(invoice)}
                      color="primary"
                      size="small"
                      title="View Invoice"
                    >
                      <ViewIcon />
                    </IconButton>
                    {invoice.status === 'draft' && (
                      <IconButton
                        onClick={() => handleStatusUpdate(invoice.id, 'send')}
                        color="primary"
                        size="small"
                        title="Mark as Sent"
                      >
                        <SendIcon />
                      </IconButton>
                    )}
                    {invoice.status === 'sent' && (
                      <>
                        <IconButton
                          onClick={() => handleStatusUpdate(invoice.id, 'pay')}
                          color="success"
                          size="small"
                          title="Mark as Paid"
                        >
                          <PaymentIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleCreatePaymentLink(invoice)}
                          color="info"
                          size="small"
                          title="Create Payment Link"
                        >
                          <PaymentIcon sx={{ fontSize: '1.2rem' }} />
                        </IconButton>
                      </>
                    )}
                    <IconButton
                      onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                      color="secondary"
                      size="small"
                      title="Download PDF"
                    >
                      <PdfIcon />
                    </IconButton>
                    {invoice.status === 'sent' && (
                      <IconButton
                        onClick={() => handleSendReminder(invoice.id, invoice.invoiceNumber)}
                        color="warning"
                        size="small"
                        title="Send Payment Reminder"
                      >
                        <ReminderIcon />
                      </IconButton>
                    )}
                    {(invoice.status === 'paid' || invoice.status === 'cancelled') && (
                      <IconButton
                        onClick={() => handleQuickStatusChange(invoice, 'sent')}
                        color="info"
                        size="small"
                        title={`Revert to Sent (Undo ${invoice.status})`}
                      >
                        <UndoIcon />
                      </IconButton>
                    )}
                    <IconButton
                      onClick={() => handleStatusChange(invoice)}
                      color="default"
                      size="small"
                      title="Change Status"
                    >
                      <ChangeStatusIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleOpen(invoice)}
                      color="primary"
                      size="small"
                      title="Edit Invoice"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(invoice.id)}
                      color="error"
                      size="small"
                      title="Delete Invoice"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Invoice Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Controller
                  name="clientId"
                  control={control}
                  rules={{ required: 'Client is required', min: { value: 1, message: 'Please select a client' } }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.clientId}>
                      <InputLabel>Client</InputLabel>
                      <Select
                        {...field}
                        label="Client"
                      >
                        <MenuItem value={0}>Select a client</MenuItem>
                        {clients.map((client) => (
                          <MenuItem key={client.id} value={client.id}>
                            {client.clientName}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.clientId && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                          {errors.clientId.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

                {selectedClientId > 0 && (
                  <Button
                    variant="outlined"
                    onClick={generateFromTimeEntries}
                    size="small"
                  >
                    Generate from Time Entries
                  </Button>
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Controller
                  name="issueDate"
                  control={control}
                  rules={{ required: 'Issue date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Issue Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.issueDate}
                      helperText={errors.issueDate?.message}
                    />
                  )}
                />

                <Controller
                  name="dueDate"
                  control={control}
                  rules={{ required: 'Due date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Due Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.dueDate}
                      helperText={errors.dueDate?.message}
                    />
                  )}
                />
              </Box>

              <Typography variant="h6">Invoice Items</Typography>
              
              {fields.map((field, index) => (
                <Card key={field.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 2, alignItems: 'start' }}>
                      <Controller
                        name={`items.${index}.description`}
                        control={control}
                        rules={{ required: 'Description is required' }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Description"
                            fullWidth
                            error={!!errors.items?.[index]?.description}
                            helperText={errors.items?.[index]?.description?.message}
                          />
                        )}
                      />

                      <Controller
                        name={`items.${index}.quantity`}
                        control={control}
                        rules={{ required: 'Quantity is required', min: { value: 0.01, message: 'Must be greater than 0' } }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Quantity"
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                            fullWidth
                            error={!!errors.items?.[index]?.quantity}
                            helperText={errors.items?.[index]?.quantity?.message}
                          />
                        )}
                      />

                      <Controller
                        name={`items.${index}.unitPrice`}
                        control={control}
                        rules={{ required: 'Unit price is required', min: { value: 0.01, message: 'Must be greater than 0' } }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Unit Price"
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                            fullWidth
                            error={!!errors.items?.[index]?.unitPrice}
                            helperText={errors.items?.[index]?.unitPrice?.message}
                          />
                        )}
                      />

                      <IconButton
                        onClick={() => remove(index)}
                        color="error"
                        disabled={fields.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}

              <Button
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                variant="outlined"
                startIcon={<AddIcon />}
              >
                Add Item
              </Button>

              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notes"
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Additional notes or terms..."
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} /> : (editingInvoice ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Invoice #{selectedInvoice?.invoiceNumber || selectedInvoice?.id}
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="subtitle2">Client:</Typography>
                  <Typography>{getClientName(selectedInvoice.clientId)}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Status:</Typography>
                  <Chip 
                    label={selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)} 
                    color={getStatusColor(selectedInvoice.status) as any}
                    variant="outlined" 
                    size="small" 
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2">Issue Date:</Typography>
                  <Typography>{formatDate(selectedInvoice.issueDate)}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Due Date:</Typography>
                  <Typography>{formatDate(selectedInvoice.dueDate)}</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedInvoice.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(parseFloat(item.unitPrice), getClientCurrency(selectedInvoice.clientId))}</TableCell>
                        <TableCell align="right">{formatCurrency(parseFloat(item.quantity) * parseFloat(item.unitPrice), getClientCurrency(selectedInvoice.clientId))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Typography variant="h6">
                  Total: {formatCurrency(selectedInvoice.totalAmount, getClientCurrency(selectedInvoice.clientId))}
                </Typography>
              </Box>

              {selectedInvoice.notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2">Notes:</Typography>
                  <Typography>{selectedInvoice.notes}</Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusChangeDialogOpen} onClose={() => setStatusChangeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Change Invoice Status
          {invoiceToChangeStatus && (
            <Typography variant="subtitle2" color="textSecondary">
              Invoice #{invoiceToChangeStatus.invoiceNumber}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>New Status</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="New Status"
              >
                <MenuItem value="draft">
                  <Chip label="Draft" color="default" size="small" sx={{ mr: 1 }} />
                  Draft
                </MenuItem>
                <MenuItem value="sent">
                  <Chip label="Sent" color="info" size="small" sx={{ mr: 1 }} />
                  Sent
                </MenuItem>
                <MenuItem value="paid">
                  <Chip label="Paid" color="success" size="small" sx={{ mr: 1 }} />
                  Paid
                </MenuItem>
                <MenuItem value="overdue">
                  <Chip label="Overdue" color="error" size="small" sx={{ mr: 1 }} />
                  Overdue
                </MenuItem>
                <MenuItem value="cancelled">
                  <Chip label="Cancelled" color="default" size="small" sx={{ mr: 1 }} />
                  Cancelled
                </MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Reason (Optional)"
              multiline
              rows={3}
              value={statusChangeReason}
              onChange={(e) => setStatusChangeReason(e.target.value)}
              placeholder="Enter reason for status change..."
              helperText="This will be added to the invoice notes"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusChangeDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleStatusChangeSubmit}
            variant="contained"
            disabled={!newStatus || newStatus === invoiceToChangeStatus?.status}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Link Dialog */}
      <PaymentLinkDialog
        open={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false);
          setInvoiceForPayment(null);
        }}
        invoice={invoiceForPayment}
        onSuccess={handlePaymentSuccess}
      />
    </Box>
  );
};

export default Invoices;
