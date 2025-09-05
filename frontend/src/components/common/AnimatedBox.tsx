import React from 'react';
import { Box, keyframes } from '@mui/material';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

interface AnimatedBoxProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideIn';
  delay?: number;
  duration?: number;
}

const AnimatedBox: React.FC<AnimatedBoxProps> = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 0.5,
  ...props
}) => {
  const selectedAnimation = animation === 'fadeIn' ? fadeIn : slideIn;

  return (
    <Box
      sx={{
        animation: `${selectedAnimation} ${duration}s ease-out ${delay}s both`,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default AnimatedBox;
