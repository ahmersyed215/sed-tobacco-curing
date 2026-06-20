import { Card, CardContent, Typography, Box, alpha, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
  accent?: string;
}

function resolveThemeColor(theme: Theme, color?: string): string {
  if (!color) return theme.palette.primary.main;

  if (color.startsWith('#') || color.startsWith('rgb')) {
    return color;
  }

  const [paletteKey, shade = 'main'] = color.split('.');
  const palette = theme.palette[paletteKey as keyof typeof theme.palette];

  if (palette && typeof palette === 'object' && shade in palette) {
    const value = (palette as { [key: string]: string | number })[shade];
    return typeof value === 'string' ? value : String(value);
  }

  return color;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'primary.main',
  accent,
}: Props) {
  const theme = useTheme();
  const accentColor = resolveThemeColor(theme, accent ?? color);
  const textColor = color.includes('.') ? color : accentColor;

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
        boxShadow: '0 10px 30px rgba(26, 29, 33, 0.06)',
        background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${alpha(
          theme.palette.primary.main,
          0.04,
        )} 100%)`,
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: accentColor,
        },
      }}
    >
      <CardContent sx={{ pt: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} color={textColor} sx={{ lineHeight: 1.2 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                bgcolor: alpha(accentColor, 0.12),
                borderRadius: 2.5,
                p: 1.4,
                color: accentColor,
                display: 'flex',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
