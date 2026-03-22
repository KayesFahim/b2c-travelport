import { Box, Typography } from "@mui/material";
import React from "react";
import reactSvg from "../../../utils/reactSvg";
import _HeadPhoneIcons from "../../../asstes/img/hedpone.svg?react";
import _MsgIcons from "../../../asstes/img/msg.svg?react";

const HeadPhoneIcons = reactSvg(_HeadPhoneIcons);
const MsgIcons = reactSvg(_MsgIcons);

const Support = () => {
  return (
    <Box sx={{ bgcolor: "#FFFFFF", py: "15px", px: "10px" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <HeadPhoneIcons sx={{ fontSize: "15px" }} />
        <Typography sx={{ fontSize: "12px", color: "#71727C" }}>
          For any assistance visit{" "}
          {/* <Link style={{ color: "var(--primary-button)" }}>support center</Link> */}
        </Typography>
        <Box sx={{ color: "var(--primary-button)", fontSize: 12 }}>
          support center
        </Box>
      </Box>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: "10px", pt: "10px" }}
      >
        <MsgIcons sx={{ fontSize: "15px" }} />
        <Typography sx={{ fontSize: "12px", color: "#71727C" }}>
          write to us{" "}
        </Typography>
        <Box sx={{ color: "var(--primary-button)", fontSize: 12 }}>support</Box>
      </Box>
    </Box>
  );
};

export default Support;
