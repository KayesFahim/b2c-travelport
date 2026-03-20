import { Box, Button, Checkbox, Typography } from "@mui/material";
import React, { useState } from "react";
import GoogleIcon from "@mui/icons-material/Google";
import PersonIcon from "@mui/icons-material/Person";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import PhoneIcon from "@mui/icons-material/Phone";
import { CheckBox, Email, Password } from "@mui/icons-material";
import { Link } from "react-router-dom";

const SignUp = () => {
  const [userInfo, setUserInfo] = useState({
    userName: "",
    userEmail: "",
    userPass: "",
    userPhone: "",
  });


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prevUserInfo) => ({
      ...prevUserInfo,
      [name]: value,
    }));
  };

  const handleUserSignUp = async (e) => {
    e.preventDefault();
    let body = {
      name: userInfo.userName,
      email: userInfo.userEmail,
      password: userInfo.userPass,
      phone: userInfo?.userPhone,
    };
    try {
      const response = await fetch("http://192.168.10.91:3000/login/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo({
          userName: "",
          userEmail: "",
          userPass: "",
          userPhone: "",
        });
      } else {
        throw new Error("Sign up request failed");
      }
    } catch (error) {
      console.error("Error signing up:", error);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 0px",
      }}
    >
      <Box
        sx={{
          bgcolor: "rgba(255, 255, 255, 1)",
          boxShadow: "rgba(149, 157, 165, 0.2) 0px 8px 24px",
          // height: "",
          width: "450px",
          borderRadius: "5px",
          padding: "20px 60px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #D9D9D9",
            justifyContent: "center",
            height: "40px",
            borderRadius: "3px",
          }}
        >
          <GoogleIcon sx={{ color: "var(--primary-button)" }} />
          <Typography sx={{ color: "#5F6368", pl: "5px" }}>
            {" "}
            Login with Google
          </Typography>
        </Box>

        <Box sx={{ py: "20px" }}>
          <Typography
            sx={{
              color: "var(--primary-button)",
              fontWeight: 600,
              fontSize: "16px",
            }}
          >
            Sign Up
          </Typography>

          <form onSubmit={handleUserSignUp}>
            <Box sx={{ pt: "20px" }}>
              {/* name input 1 */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  borderBottom: "1px solid #D9D9D9",
                }}
              >
                <PersonIcon sx={{ color: "var(--icons-color)" }} />
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                  >
                    Your Name
                  </Typography>
                  <input
                    name="userName"
                    value={userInfo?.userName}
                    onChange={handleInputChange}
                    placeholder="Sakhwat Hosen"
                    style={{
                      border: "none",
                      outline: "none",
                      color: "black",
                      paddingTop: "5px",
                      paddingBottom: "8px",
                    }}
                  />
                </Box>
              </Box>
              {/* email input */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  pt: "20px",
                  gap: "20px",
                  borderBottom: "1px solid #D9D9D9",
                }}
              >
                <MailIcon sx={{ color: "var(--icons-color)" }} />
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                  >
                    Email
                  </Typography>
                  <input
                    placeholder="sakhwat@gmail.com"
                    type="email"
                    name="userEmail"
                    value={userInfo?.userEmail}
                    onChange={handleInputChange}
                    style={{
                      border: "none",
                      outline: "none",
                      color: "black",
                      paddingTop: "5px",
                      paddingBottom: "8px",
                    }}
                  />
                </Box>
              </Box>
              {/* password input */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  pt: "20px",
                  gap: "20px",
                  borderBottom: "1px solid #D9D9D9",
                }}
              >
                <LockIcon sx={{ color: "var(--icons-color)" }} />
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                  >
                    Password
                  </Typography>
                  <input
                    placeholder="**********"
                    type="password"
                    name="userPass"
                    value={userInfo?.userPass}
                    onChange={handleInputChange}
                    style={{
                      border: "none",
                      outline: "none",
                      color: "black",
                      paddingTop: "5px",
                      paddingBottom: "8px",
                    }}
                  />
                </Box>
              </Box>
              {/* Phone input */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  pt: "20px",
                  gap: "20px",
                  borderBottom: "1px solid #D9D9D9",
                }}
              >
                <PhoneIcon sx={{ color: "var(--icons-color)" }} />
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                  >
                    Mobile
                  </Typography>
                  <input
                    placeholder="+8801302086413"
                    type="text"
                    name="userPhone"
                    value={userInfo?.userPhone}
                    onChange={handleInputChange}
                    style={{
                      border: "none",
                      outline: "none",
                      color: "black",
                      paddingTop: "5px",
                      paddingBottom: "8px",
                    }}
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  pt: "20px",
                  gap: "20px",
                }}
              >
                <CheckBox checked sx={{ color: "var(--icons-color)" }} />
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-button)",
                      fontWeight: 600,
                    }}
                  >
                    By creating an account you agree to our Terms & Conditions
                  </Typography>
                </Box>
              </Box>
              <Button
                type="submit"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  bgcolor: "var(--primary-button)",
                  mt: "20px",
                  width: "100%",
                  textTransform: "capitalize",
                  fontSize: "16px",
                  height: "40px",
                  color: "var(--white)",
                  ":hover": {
                    bgcolor: "var(--primary-button)",
                    color: "var(--white)",
                  },
                }}
              >
                Sign Up
              </Button>
              <Box sx={{ pt: "10px" }}>
                <Typography
                  sx={{
                    color: "var(--primary-button)",
                    fontSize: "14px",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  Already have an Account?{" "}
                  <Link
                    to="/signIn"
                    style={{ textDecoration: "none", color: "#5F646C" }}
                  >
                    Sign In
                  </Link>
                </Typography>
              </Box>
            </Box>
          </form>
        </Box>
      </Box>
    </Box>
  );
};

export default SignUp;
