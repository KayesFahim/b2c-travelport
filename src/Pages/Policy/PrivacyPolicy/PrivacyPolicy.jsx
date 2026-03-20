import { Box, Container, Divider, Typography } from "@mui/material";
import React from "react";
import NavBar from "../../../Shared/NavBar/NavBar";

const PrivacyPolicy = () => {
  return (
    <Box 
    sx={{ height: "100%" }}
    >
      <NavBar />
     <Box sx={{}}>
     <Container maxWidth="md" sx={{ my: 4 }}>
        <Box sx={{ 
          // bgcolor: "white", 
          // px: "30px", py: "50px", mt: "50px" 
          }}>
          <Box>
            <Typography
              gutterBottom
              sx={{ fontWeight: "bold", textAlign: "center", fontSize: "18px",
                color: "var(--primary-button)",
  
               }}
            >
              Privacy Policy
            </Typography>
            <Typography
            sx={{
              fontSize: "12px",
              textAlign: "center",
            }}
            gutterBottom
          >
            At FlyItSearch, we respect your privacy and recognize the need to
              protect the personally identifiable information (any information
              by which you can be identified, such as name, address, and
              telephone number) you share with us. We assure you that we adhere
              to appropriate standards to protect your privacy on our website.
          </Typography>

          <Divider sx={{ my: 2 }} />
           
          </Box>
          <Box sx={{ mt: "10px" }}>
            <Typography
              sx={{ fontSize: "14px", fontWeight: "bold", mb: 1,
                color: "var(--primary-button)",

       }}
            >
              Cookies and Information Collection
            </Typography>
            <Typography sx={{ fontSize: "11px", textAlign: "justify" }}>
              Some of our web pages use "cookies" to provide you with customized
              information when you return to our site. Cookies are identifiers
              sent to your browser to facilitate your next visit. You can set
              your browser to notify you when a cookie is sent, allowing you to
              decide whether or not to accept it. The information collected and
              analyzed through cookies is used to enhance our services to you.
            </Typography>
          </Box>
          <Box sx={{ mt: "10px" }}>
            <Typography
              sx={{ fontSize: "14px", fontWeight: "bold", mb: 1,
                color: "var(--primary-button)",

       }}
            >
              Third-Party Advertising
            </Typography>
            <Typography sx={{ fontSize: "11px", textAlign: "justify" }}>
              We use third-party service providers to serve ads on our behalf
              across the Internet, including on this site. These providers may
              collect anonymous information about your visits to our website and
              interactions with our services. They may also use data from your
              visits to this and other websites to target advertisements for
              goods and services. This anonymous data is gathered using a 'pixel
              tag,' an industry-standard technology used by most major websites.
              No personally identifiable information is collected or used in
              this process. Third parties do not have access to your name, phone
              number, address, email address, or other personally identifying
              information. For more information on this practice and your
              choices regarding its use, you may contact us. Information
              Collected for Booking/E-commerce Transactions When transacting
              through FlyItSearch, we collect the following personal sensitive
              information: Name and Sex Phone Number Billing Address Credit Card
              Details Date of Birth (in the case of a child)
            </Typography>
          </Box>
          <Box sx={{ mt: "10px" }}>
            <Typography
             sx={{ fontSize: "14px", fontWeight: "bold", mb: 1,
              color: "var(--primary-button)",

     }}
            >
              Use of Collected Information
            </Typography>
            <Typography sx={{ fontSize: "11px", textAlign: "justify" }}>
              FlyItSearch does not sell or trade your personal information
              without your consent. The information collected is used for the
              following purposes: Customer details, including name, address,
              phone number, traveler’s name, age, and passport image, are shared
              with service providers like airlines and hotels for reservations
              and bookings. Credit card and net banking details are generally
              collected by payment gateways and banks, not by FlyItSearch. If
              stored by us, the data is secured internally and never shared,
              except with private or government security agencies for fraud
              screening. Contact details like phone numbers and email addresses
              may be used for promotional purposes unless you have unsubscribed.
              Profile photos, if uploaded, are optional and not used or shared
              for any purpose.
            </Typography>
          </Box>
          <Box sx={{ mt: "10px" }}>
            <Typography
              sx={{ fontSize: "14px", fontWeight: "bold", mb: 1,
                color: "var(--primary-button)",

       }}
            >
              Use of Collected Information
            </Typography>
            <Typography sx={{ fontSize: "11px", textAlign: "justify" }}>
              FlyItSearch does not sell or trade your personal information
              without your consent. The information collected is used for the
              following purposes: Customer details, including name, address,
              phone number, traveler’s name, age, and passport image, are shared
              with service providers like airlines and hotels for reservations
              and bookings. Credit card and net banking details are generally
              collected by payment gateways and banks, not by FlyItSearch. If
              stored by us, the data is secured internally and never shared,
              except with private or government security agencies for fraud
              screening. Contact details like phone numbers and email addresses
              may be used for promotional purposes unless you have unsubscribed.
              Profile photos, if uploaded, are optional and not used or shared
              for any purpose.
            </Typography>
          </Box>
        </Box>
      </Container>
     </Box>
    </Box>
  );
};

export default PrivacyPolicy;
