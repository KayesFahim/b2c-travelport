import { Box, Container, Grid, Typography } from "@mui/material";
import React from "react";
import expert1 from "../../../asstes/img/tour/Expert/Expert1.png";
import expert2 from "../../../asstes/img/tour/Expert/Expert2.png";
import DepPlane from "../../../asstes/img/tour/Expert/plan1.svg?react";
import ArrPlane from "../../../asstes/img/tour/Expert/palne2.svg?react";

const TourExpert = () => {
  return (
    <Box>
      <Container>
        <Grid container>
          <Grid item md={6} lg={6}>
            <Box sx={{ position: "relative" }}>
              <Box>
                <img src={expert1} />
              </Box>
              <Box sx={{ position: "absolute", bottom: "10%", right: "0.5%" }}>
                <DepPlane />
              </Box>

              <Box
                sx={{
                  clipPath:
                    "polygon(0% 0%, 100% 0%, 100% 75%, 100% 75%, 100% 100%, 84% 76%, 0% 75%)",
                  background: "var(--white)",
                  transform: "rotate(180deg)",
                  position: "absolute",
                  borderRadius: "5px",
                  top: "10%",
                  left: "5%",
                  width: "180px",
                  height: "130px",
                }}
              ></Box>
              <Box
                sx={{ position: "absolute", top: "20%", left: "7%", p: "5px" }}
              >
                <Typography sx={{ color: "#8A8781", fontSize: "16px" }}>
                  Siam Ahmend
                </Typography>
                <Typography
                  sx={{
                    color: "var(--filter-text-color)",
                    pt: "5px",
                    fontSize: "13px",
                  }}
                >
                  Lrmk namfa{" "}
                </Typography>
                <Typography
                  sx={{ color: "var(--filter-text-color)", fontSize: "13px" }}
                >
                  ikajfmafomoik mfjoaif
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item md={6} lg={6}>
            <Box sx={{ position: "relative" }}>
              <Box>
                <img src={expert2} />
              </Box>
              <Box sx={{ position: "absolute", top: "9%", left: "16%" }}>
                <ArrPlane />
              </Box>

              <Box
                sx={{
                  clipPath:
                    "polygon(0% 0%, 100% 0%, 100% 75%, 100% 75%, 100% 100%, 84% 76%, 0% 75%)",
                  background: "var(--white)",
                  transform: "rotate(180deg)",
                  position: "absolute",
                  borderRadius: "5px",
                  bottom: "10%",
                  right: "-10%",
                  width: "180px",
                  height: "130px",
                }}
              ></Box>
              <Box
                sx={{
                  position: "absolute",
                  bottom: "15%",
                  right: "-7%",
                  p: "5px",
                }}
              >
                <Typography sx={{ color: "#8A8781", fontSize: "16px" }}>
                  Siam Ahmend
                </Typography>
                <Typography
                  sx={{
                    color: "var(--filter-text-color)",
                    pt: "5px",
                    fontSize: "13px",
                  }}
                >
                  Lrmk namfa{" "}
                </Typography>
                <Typography
                  sx={{ color: "var(--filter-text-color)", fontSize: "13px" }}
                >
                  ikajfmafomoik mfjoaif
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default TourExpert;
