import { createTheme } from "@mui/material/styles";

export const flyjattTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0079AA",
      light: "#00A8E8",
      dark: "#00597D",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#0EA5A1",
      light: "#2DD4BF",
      dark: "#0F766E",
      contrastText: "#FFFFFF",
    },
    success: {
      main: "#1A7A41",
    },
    warning: {
      main: "#C77A09",
    },
    error: {
      main: "#C62828",
    },
    background: {
      default: "#EDF5FC",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#123550",
      secondary: "#5C748C",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily:
      '"Manrope", "Plus Jakarta Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    body1: { fontSize: "1rem", lineHeight: 1.65 },
    body2: { fontSize: "0.875rem", lineHeight: 1.6 },
    h1: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontWeight: 800,
    },
    h4: {
      fontWeight: 800,
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
      letterSpacing: "0.01em",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "::selection": {
          backgroundColor: "rgba(0, 121, 170, 0.18)",
          color: "#0B2C47",
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          "@media (min-width:900px)": {
            paddingLeft: 20,
            paddingRight: 20,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid rgba(7, 54, 98, 0.12)",
          boxShadow: "0 6px 24px rgba(6, 43, 79, 0.055)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid rgba(7, 54, 98, 0.12)",
          boxShadow: "0 6px 24px rgba(6, 43, 79, 0.055)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: "1px solid rgba(7, 54, 98, 0.18)",
          boxShadow: "0 30px 70px rgba(8, 28, 53, 0.24)",
          backgroundImage: "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 700,
          minHeight: 44,
        },
        contained: {
          boxShadow: "0 4px 12px rgba(0, 121, 170, 0.16)",
          background: "linear-gradient(120deg, #009AD6 0%, #0079AA 100%)",
        },
        containedPrimary: {
          ":hover": {
            background: "linear-gradient(120deg, #007FB2 0%, #005F87 100%)",
          },
        },
        outlined: {
          borderWidth: 1.5,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: "#FFFFFF",
          ":hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(0, 121, 170, 0.42)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: 1.5,
            borderColor: "#0079AA",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
          backgroundColor: "#0079AA",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 10,
          fontSize: 12,
          padding: "8px 10px",
        },
      },
    },
  },
});

