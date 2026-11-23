import { Box, Button, Container, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import NavBar from "../../NavBar/NavBar";

export default function PageNotFound() {
  return (
    <Box className="travelport-page">
      <NavBar />
      <Container sx={{ py: { xs: 8, md: 12 }, textAlign: "center" }}>
        <Typography sx={{ color: "var(--primary-color)", fontWeight: 800, fontSize: "5rem", lineHeight: 1 }}>404</Typography>
        <Typography component="h1" variant="h4" sx={{ mt: 3 }}>This page has taken a detour</Typography>
        <Typography color="text.secondary" sx={{ mt: 2, mb: 4 }}>The page may have moved. Let’s get you back to planning your trip.</Typography>
        <Button component={Link} to="/" variant="contained">Back to home</Button>
      </Container>
    </Box>
  );
}
