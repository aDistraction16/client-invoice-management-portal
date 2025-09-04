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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { clientsAPI } from '../../services/api';
import { Client, ClientFormData } from '../../types';
import { formatDate } from '../../utils';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ClientFormData>({
    defaultValues: {
      clientName: '',
      contactPerson: '',
      email: '',
      phoneNumber: '',
      address: '',
    },
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientsAPI.getAll();
      setClients(response.clients);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpen = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      reset({
        clientName: client.clientName,
        contactPerson: client.contactPerson,
        email: client.email,
        phoneNumber: client.phoneNumber || '',
        address: client.address || '',
      });
    } else {
      setEditingClient(null);
      reset({
        clientName: '',
        contactPerson: '',
        email: '',
        phoneNumber: '',
        address: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingClient(null);
    reset();
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
      setSubmitting(true);
      if (editingClient) {
        await clientsAPI.update(editingClient.id, data);
      } else {
        await clientsAPI.create(data);
      }
      await fetchClients();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientsAPI.delete(id);
        await fetchClients();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete client');
      }
    }
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
        <Typography variant="h4">Clients</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Client
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    No clients found. Add your first client to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {client.clientName}
                    </Typography>
                    {client.address && (
                      <Typography variant="body2" color="text.secondary">
                        {client.address}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{client.contactPerson}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <EmailIcon fontSize="small" color="action" />
                      {client.email}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {client.phoneNumber ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <PhoneIcon fontSize="small" color="action" />
                        {client.phoneNumber}
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label="Active" 
                      color="success" 
                      variant="outlined" 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{formatDate(client.createdAt)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleOpen(client)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(client.id)}
                      color="error"
                      size="small"
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

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingClient ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Controller
                name="clientName"
                control={control}
                rules={{ required: 'Client name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Client Name"
                    fullWidth
                    error={!!errors.clientName}
                    helperText={errors.clientName?.message}
                  />
                )}
              />
              
              <Controller
                name="contactPerson"
                control={control}
                rules={{ required: 'Contact person is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Contact Person"
                    fullWidth
                    error={!!errors.contactPerson}
                    helperText={errors.contactPerson?.message}
                  />
                )}
              />
              
              <Controller
                name="email"
                control={control}
                rules={{ 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    type="email"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
              
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone Number"
                    fullWidth
                    error={!!errors.phoneNumber}
                    helperText={errors.phoneNumber?.message}
                  />
                )}
              />
              
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Address"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!errors.address}
                    helperText={errors.address?.message}
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
              {submitting ? <CircularProgress size={20} /> : (editingClient ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Clients;
