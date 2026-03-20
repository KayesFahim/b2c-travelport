import React from "react";
import Select from "react-select";
import { Box } from "@mui/material";

const SearchableDropDown = ({ handler, options, index, type, placeholder }) => {
  return (
    <Box
      sx={{
        ".css-1xc3v61-indicatorContainer": {
          color: "var(--primary-button) !important",
        },
        ".css-1jqq78o-placeholder": {
          color: "var(--primary-button) !important",
        },
        ".css-13cymwt-control": {
          borderColor: "var(--primary-button) !important",
          color: "var(--primary-button) !important",
        },
        ".css-1dimb5e-singleValue": {
          color: "var(--primary-button) !important",
          fontWeight: 500,
        },
        height: "40px",
        zIndex: 1000,
        position: "relative",
      }}
    >
      <Select
        onChange={(item) => handler(item.value, index, type)}
        options={options}
        placeholder={placeholder}
        styles={{
          control: (base) => ({
            ...base,
            minHeight: "40px",
            height: "40px",
          }),
          menu: (base) => ({
            ...base,
            maxHeight: "200px",
            overflowY: "auto", // Ensure scrolling works properly
          }),
          menuList: (base) => ({
            ...base,
            maxHeight: "200px", // Limit height of the dropdown
            padding: 0, // Remove extra padding
          }),
        }}
        menuPlacement="auto" // Optional: Adjust menu placement dynamically
      />
    </Box>
  );
};

export default SearchableDropDown;
