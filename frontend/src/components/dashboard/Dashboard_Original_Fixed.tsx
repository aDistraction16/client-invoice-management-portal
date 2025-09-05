import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  People,
  Work,
  AccessTime,
  Receipt,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { clientsAPI, projectsAPI, timeEntriesAPI, invoicesAPI } from '../../services/api';
import { formatCurrency } from '../../utils';

interface DashboardStats {
  totalClients: number;
  totalProjects: number;
  totalTimeEntries: number;
  totalInvoices: number;
  totalRevenue: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalProjects: 0,
    totalTimeEntries: 0,
    totalInvoices: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [clientsRes, projectsRes, timeEntriesRes, invoicesRes] = await Promise.all([
          clientsAPI.getAll(),
          projectsAPI.getAll(),
          timeEntriesAPI.getAll(),
          invoicesAPI.getAll(),
        ]);

        // Calculate total revenue from paid invoices
        const totalRevenue = invoicesRes.invoices
          .filter(invoice => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount), 0);

        setStats({
          totalClients: clientsRes.total,
          totalProjects: projectsRes.total,
          totalTimeEntries: timeEntriesRes.total,
          totalInvoices: invoicesRes.total,
          totalRevenue,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: People,
      color: '#1976d2',
    },
    {
      title: 'Active Projects',
      value: stats.totalProjects,
      icon: Work,
      color: '#388e3c',
    },
    {
      title: 'Time Entries',
      value: stats.totalTimeEntries,
      icon: AccessTime,
      color: '#f57c00',
    },
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: Receipt,
      color: '#7b1fa2',
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.contactPerson || user?.email}!
      </Typography>
      
      {user?.companyName && (
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {user.companyName}
        </Typography>
      )}

      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 3,
          mt: 2 
        }}
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      backgroundColor: card.color,
                      mr: 2,
                    }}
                  >
                    <Icon sx={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div">
                      {card.title === 'Total Revenue' 
                        ? formatCurrency(card.value as number, 'PHP')
                        : card.value
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Revenue Card */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: '#d32f2f',
                mr: 2,
              }}
            >
              <Receipt sx={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" component="div">
                {formatCurrency(stats.totalRevenue, 'PHP')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Revenue (Paid Invoices)
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
