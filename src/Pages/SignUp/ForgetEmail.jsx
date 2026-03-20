import { Box, Button, Container, Typography } from "@mui/material";
import React from "react";
import { he } from "date-fns/locale";
import MailIcon from "@mui/icons-material/Email";
import BrandWordmark from "../../Shared/BrandWordmark/BrandWordmark";

const ForgetEmail = () => {
  return (
    <Box>
    <Box sx={{ bgcolor: "#EBF0F4" }}>
      <Container
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Box
          sx={{
            background: "#ffff",
            width: "450px",
            px: "20px",
            borderRadius: "5px",
            py: "15px",
          }}
        >
          <Box
            sx={{
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              my: "10px",
            }}
          >
            <BrandWordmark width={120} height={100} fontSize={30} />
          </Box>
          <Typography
            sx={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--primary-button)",
              textAlign: "center",
            }}
          >
          Forget Your Email?
          </Typography>
          <Typography
            sx={{
              fontSize: "14px",
              py: "10px",
              color: "var(--primary-button)",
              textAlign: "center",
              paddingBottom: "20px",
            }}
          >
         Please enter your email address and we'll send you
         a code to reset your password.
          </Typography>
          <form>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems:"center",
                width: "100%",

             
              
              }}
            >
              
              <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderBottom: "1px solid #D9D9D9",
                    width: "100%",
                  }}
                >
                  <MailIcon
                    sx={{ color: "var(--icons-color)", fontSize: 20 }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <input
                      required
                      placeholder="Enter Your Email"
                      type="email"
                      name="signInEmail"
                      // value={userSignInInfo?.signInEmail || ""}
                      // onChange={handleUserSignInInfo}
                      style={{
                        border: "none",
                        outline: "none",
                        color: "black",
                        padding: "8px 5px",
                        width: "100%",
                        fontSize: "14px",
                        backgroundColor: "transparent",
                      }}
                    />
                  </Box>
                </Box>
            </Box>

            <Button
              sx={{
                borderRadius: "6px",
                backgroundColor: "var(--primary-button)",
                color: "white",
                width: "100%",
                height: "40px",
                textTransform: "capitalize",
                fontSize: "15px",
                mt: "20px",
                ":hover": {
                  backgroundColor: "var(--primary-button)",
                },
              }}
              type="submit"
            >
              Send Email
            </Button>
            {/* <Typography
            //   onClick={handleResend}
            sx={{
              color: "red",
              cursor: "pointer",
              fontSize: "15px",
              my: "10px",
              textAlign: "right",
            }}
          >
            
          </Typography> */}
          </form>
        </Box>
      </Container>
    </Box>
  </Box>
  );
};

export default ForgetEmail;
