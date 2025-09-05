import React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';
import { SvgIconComponent } from '@mui/icons-material';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: SvgIconComponent;
  color?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color = '#1976d2',
  subtitle,
  trend,
}) => {
  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
        border: `1px solid ${color}20`,
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 25px ${color}25`,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: trend.isPositive ? 'success.main' : 'error.main',
                    fontWeight: 'medium',
                  }}
                >
                  {trend.isPositive ? '+' : '-'}
                  {Math.abs(trend.value)}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  from last month
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              backgroundColor: color,
              width: 56,
              height: 56,
            }}
          >
            <Icon sx={{ fontSize: 28 }} />
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
