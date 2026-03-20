import React from "react";
import { Box, Button, Container, Typography } from "@mui/material";
import { useRef, useState } from "react";
import BrandWordmark from "../../Shared/BrandWordmark/BrandWordmark";

const OtpVerification = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([0, 1, 2, 3, 4, 5].map(() => React.createRef()));
  const [isLoading, setIsLoading] = useState(false);
  const handleOtpChange = (e, index) => {
    const newOtp = [...otp];
    newOtp[index] = e.target.value;
    setOtp(newOtp);

    // Move focus to the next input field
    if (index < otp.length - 1 && e.target.value !== "") {
      inputRefs.current[index + 1].current.focus();
    }
  };
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
                fontWeight: "500",
                color: "var(--primary-button)",
                textAlign: "center",
              }}
            >
              OTP Verification
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
              Enter the 6 digit ve code recived on your Email ID
            </Typography>
            <form>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "80%",
                  margin: "0 auto",
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    style={{
                      color: "var(--meta-black)",
                      outline: "none",
                      background: "none",
                      width: "35px",
                      textAlign: "center",
                      fontSize: "18px",
                      borderRadius: "5px",
                      padding: "10px 5px",
                      border: "2px solid var(--primary-button)",
                    }}
                    name={`otp${index}`}
                    value={otp[index]}
                    onChange={(e) => handleOtpChange(e, index)}
                    ref={inputRefs.current[index]}
                  />
                ))}
              </Box>

              <Button
                sx={{
                  borderRadius: "6px",
                  backgroundColor: "var(--primary-button)",
                  color: "white",
                  width: "100%",
                  height: "45px",
                  textTransform: "capitalize",
                  fontSize: "15px",
                  mt: "20px",
                  ":hover": {
                    backgroundColor: "var(--primary-button)",
                  },
                }}
                type="submit"
              >
                Verify OTP
              </Button>
              <Typography
                //   onClick={handleResend}
                sx={{
                  color: "red",
                  cursor: "pointer",
                  fontSize: "15px",
                  my: "10px",
                  textAlign: "right",
                }}
              >
                {isLoading ? "Please Wait..." : "  Resend OTP ?"}
              </Typography>
            </form>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default OtpVerification;
