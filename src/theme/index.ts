import { createTheme } from '@mui/material/styles';

export const fontFamily = '"Montserrat", "Helvetica", "Arial", sans-serif';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1B5E20',
      light: '#4C8C4A',
      dark: '#003300',
    },
    secondary: {
      main: '#F57C00',
    },
    background: {
      default: '#F4F6F8',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1D21',
      secondary: '#5C6570',
    },
  },
  typography: {
    fontFamily,
    fontSize: 14,
    htmlFontSize: 16,
    allVariants: {
      fontFamily,
    },
    h1: { fontFamily, fontWeight: 700 },
    h2: { fontFamily, fontWeight: 700 },
    h3: { fontFamily, fontWeight: 700 },
    h4: { fontFamily, fontWeight: 700 },
    h5: { fontFamily, fontWeight: 600 },
    h6: { fontFamily, fontWeight: 600 },
    subtitle1: { fontFamily, fontWeight: 500 },
    subtitle2: { fontFamily, fontWeight: 500 },
    body1: { fontFamily },
    body2: { fontFamily },
    caption: { fontFamily },
    overline: { fontFamily },
    button: { fontFamily, fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          fontFamily,
        },
        body: {
          fontFamily,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '#root': {
          fontFamily,
        },
        button: {
          fontFamily,
        },
        input: {
          fontFamily,
        },
        textarea: {
          fontFamily,
        },
        select: {
          fontFamily,
        },
        '.recharts-text, .recharts-label, .recharts-legend-item-text': {
          fontFamily,
        },
        '.MuiDataGrid-root, .MuiDataGrid-columnHeaderTitle, .MuiDataGrid-cell': {
          fontFamily,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          fontFamily,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          fontFamily,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          fontFamily,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily,
        },
        input: {
          fontFamily,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontFamily,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontFamily },
        secondary: { fontFamily },
      },
    },
    MuiChip: {
      styleOverrides: {
        label: {
          fontFamily,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          fontFamily,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          fontFamily,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily,
        },
      },
    },
  },
});
