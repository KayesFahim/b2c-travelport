import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    FormControl,
    Grid,
    MenuItem,
    Select,
    TextField,
    Typography,
} from "@mui/material";
import moment from "moment";
import React, { useMemo, useState } from "react";
import secureLocalStorage from "react-secure-storage";
import datas from "../../../Pages/fakeData/CountryList";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { saveTravelBuddy } from "../../../utils/travelBuddyApi";
import NavBar from "../../../Shared/NavBar/NavBar";
import PersonIcon from "@mui/icons-material/Person";
import FlightIcon from "@mui/icons-material/Flight";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import GroupIcon from "@mui/icons-material/Group";

const INITIAL_FORM = {
    title: "",
    firstName: "",
    lastName: "",
    paxtype: "",
    gender: "",
    nationility: "BD",
    dateOfBirth: "",
    passportNumber: "",
    passportExpireDate: "",
};

const ACCOUNT_NAV_ITEMS = [
    { label: "My Profile", path: "/myprofile", icon: PersonIcon },
    { label: "My Booking", path: "/my-account?tab=bookings", icon: FlightIcon },
    { label: "Add Deposit", path: "/myprofile/adddeposite", icon: AccountBalanceWalletIcon },
    { label: "Transaction List", path: "/myprofile/usertransctions", icon: ReceiptLongIcon },

];

const AddTraveler = () => {
    const countryName = datas;
    const navigate = useNavigate();
    const [trvelInfo, setTravelInfo] = useState(INITIAL_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const token = secureLocalStorage.getItem("access_token");

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTravelInfo((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const getValidDateRange = () => {
        const currentDate = moment();
        let minDate;
        let maxDate;

        if (trvelInfo.paxtype === "Adult") {
            minDate = currentDate.clone().subtract(100, "years");
            maxDate = currentDate.clone().subtract(12, "years");
        } else if (trvelInfo.paxtype === "Child") {
            minDate = currentDate.clone().subtract(12, "years");
            maxDate = currentDate.clone().subtract(2, "years");
        } else if (trvelInfo.paxtype === "Infant") {
            minDate = currentDate.clone().subtract(2, "years");
            maxDate = currentDate;
        } else {
            minDate = currentDate.clone().subtract(100, "years");
            maxDate = currentDate;
        }

        return { minDate, maxDate };
    };

    const { minDate, maxDate } = useMemo(() => getValidDateRange(), [trvelInfo.paxtype]);

    const isDobWithinRange = (value) => {
        const selectedDate = moment(value);
        if (!selectedDate.isValid()) return false;
        return !selectedDate.isBefore(minDate, "day") && !selectedDate.isAfter(maxDate, "day");
    };

    const isPassportExpiryValid = (value) => {
        const selectedDate = moment(value);
        if (!selectedDate.isValid()) return false;
        return !selectedDate.isBefore(moment(), "day");
    };

    const validateForm = () => {
        if (!trvelInfo.title) return "Please select title.";
        if (!trvelInfo.paxtype) return "Please select passenger type.";
        if (!trvelInfo.firstName.trim()) return "First name is required.";
        if (!trvelInfo.lastName.trim()) return "Last name is required.";
        if (!trvelInfo.gender) return "Please select gender.";
        if (!trvelInfo.nationility) return "Please select nationality.";
        if (!trvelInfo.dateOfBirth) return "Date of birth is required.";
        if (!isDobWithinRange(trvelInfo.dateOfBirth)) {
            return `Date of birth must be between ${minDate.format("YYYY-MM-DD")} and ${maxDate.format("YYYY-MM-DD")}.`;
        }
        if (!trvelInfo.passportNumber.trim()) return "Passport number is required.";
        if (!trvelInfo.passportExpireDate) return "Passport expiry date is required.";
        if (!isPassportExpiryValid(trvelInfo.passportExpireDate)) {
            return "Passport expiry date cannot be before today.";
        }
        return "";
    };

    const handleAddTraveler = async (event) => {
        event.preventDefault();

        const errorText = validateForm();
        if (errorText) {
            setFormError(errorText);
            return;
        }

        setFormError("");
        setIsSubmitting(true);

        const body = {
            title: trvelInfo.title.trim(),
            firstName: trvelInfo.firstName.trim(),
            lastName: trvelInfo.lastName.trim(),
            gender: trvelInfo.gender,
            nationality: trvelInfo.nationility,
            dob: trvelInfo.dateOfBirth,
            passport: trvelInfo.passportNumber.trim(),
            passportexp: trvelInfo.passportExpireDate,
            paxtype: trvelInfo.paxtype,
        };

        try {
            await saveTravelBuddy({ token, payload: body });
            Swal.fire({
                title: "Success!",
                text: "Traveler added successfully.",
                icon: "success",
                confirmButtonText: "OK",
            });
            setTravelInfo(INITIAL_FORM);
            navigate("/myprofile/addtravler");
        } catch (error) {
            Swal.fire({
                title: "Error!",
                text: "There was an error adding the traveler. Please try again.",
                icon: "error",
                confirmButtonText: "OK",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background:
                    "radial-gradient(circle at 12% 0%, rgba(0,154,214,0.16), transparent 36%), radial-gradient(circle at 90% 0%, rgba(20,184,166,0.14), transparent 30%), #f1f7fc",
            }}
        >
            <NavBar />

            <Box sx={{ maxWidth: 1240, mx: "auto", px: { xs: 1.5, md: 2.5 }, py: { xs: 2, md: 3 } }}>
                <Card
                    elevation={0}
                    sx={{
                        border: "1px solid rgba(0, 154, 214, 0.2)",
                        borderRadius: "16px",
                        background:
                            "linear-gradient(140deg, rgba(12,57,96,0.96) 0%, rgba(0,154,214,0.88) 70%, rgba(23,188,164,0.82) 100%)",
                        color: "#fff",
                    }}
                >
                    <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
                        <Typography sx={{ fontSize: { xs: 23, md: 30 }, fontWeight: 800, color: "#fff" }}>
                            Add Traveler
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.88)", fontSize: 13 }}>
                            Save traveler profile once and reuse details during booking.
                        </Typography>
                    </Box>
                </Card>

                <Grid container spacing={2.5} sx={{ mt: 0.2 }}>
                    <Grid item xs={12} md={3}>
                        <Card
                            elevation={0}
                            sx={{
                                border: "1px solid rgba(0, 154, 214, 0.18)",
                                borderRadius: "16px",
                                p: 1,
                                boxShadow: "0 14px 26px rgba(10, 35, 60, 0.06)",
                            }}
                        >
                            <Box sx={{ display: "flex", flexDirection: { xs: "row", md: "column" }, overflowX: "auto", gap: 0.5 }}>
                                {ACCOUNT_NAV_ITEMS.map((item) => {
                                    const IconComponent = item.icon;
                                    return (
                                        <Box
                                            key={item.path}
                                            onClick={() => navigate(item.path)}
                                            sx={{
                                                px: 2,
                                                py: 1.4,
                                                borderRadius: "12px",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1.3,
                                                backgroundColor: "transparent",
                                                color: "#34516e",
                                                fontWeight: 600,
                                                whiteSpace: "nowrap",
                                                "&:hover": {
                                                    backgroundColor: "rgba(0, 154, 214, 0.08)",
                                                },
                                            }}
                                        >
                                            <IconComponent sx={{ fontSize: 20, color: "#607890" }} />
                                            <Typography sx={{ fontSize: 14, fontWeight: "inherit" }}>{item.label}</Typography>
                                        </Box>
                                    );
                                })}

                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1.4,
                                        borderRadius: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.3,
                                        backgroundColor: "#eef6fd",
                                        color: "#0f4b7d",
                                        fontWeight: 800,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    <GroupIcon sx={{ fontSize: 20, color: "#0f4b7d" }} />
                                    <Typography sx={{ fontSize: 14, fontWeight: "inherit" }}>Add Traveler</Typography>
                                </Box>
                            </Box>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={9}>
                        <Card
                            elevation={0}
                            sx={{
                                border: "1px solid #D8E3F2",
                                borderRadius: "16px",
                                background:
                                    "linear-gradient(180deg, #F7FBFF 0%, #FFFFFF 34%, #FFFFFF 100%)",
                                overflow: "hidden",
                                boxShadow: "0 14px 26px rgba(10, 35, 60, 0.06)",
                            }}
                        >
                            <Box
                                sx={{
                                    px: { xs: 2, md: 3 },
                                    py: 2,
                                    borderBottom: "1px solid #E3ECF8",
                                    background:
                                        "linear-gradient(90deg, rgba(19,64,107,0.09) 0%, rgba(15,88,122,0.04) 55%, rgba(255,255,255,0.1) 100%)",
                                }}
                            >
                                <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#123d66" }}>
                                    Traveler Details
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: "#5E738F", mt: 0.4 }}>
                                    Save traveler profile once and autofill during future bookings.
                                </Typography>
                            </Box>

                            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                <form onSubmit={handleAddTraveler}>
                                    {formError ? (
                                        <Alert severity="error" sx={{ mb: 2 }}>
                                            {formError}
                                        </Alert>
                                    ) : null}

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={4}>
                                            <FormControl fullWidth>
                                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#36577b", mb: 0.7 }}>
                                                    Title
                                                </Typography>
                                                <Select
                                                    name="title"
                                                    value={trvelInfo.title}
                                                    onChange={handleInputChange}
                                                    displayEmpty
                                                    size="small"
                                                >
                                                    <MenuItem value="">Select Title</MenuItem>
                                                    <MenuItem value="Mr">Mr</MenuItem>
                                                    <MenuItem value="Ms">Ms</MenuItem>
                                                    <MenuItem value="Mrs">Mrs</MenuItem>
                                                    <MenuItem value="Mstr">Mstr</MenuItem>
                                                    <MenuItem value="Miss">Miss</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} md={4}>
                                            <FormControl fullWidth>
                                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#36577b", mb: 0.7 }}>
                                                    Passenger Type
                                                </Typography>
                                                <Select
                                                    name="paxtype"
                                                    value={trvelInfo.paxtype}
                                                    onChange={handleInputChange}
                                                    displayEmpty
                                                    size="small"
                                                >
                                                    <MenuItem value="">Select Passenger Type</MenuItem>
                                                    <MenuItem value="Adult">Adult</MenuItem>
                                                    <MenuItem value="Child">Child</MenuItem>
                                                    <MenuItem value="Infant">Infant</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} md={4}>
                                            <FormControl fullWidth>
                                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#36577b", mb: 0.7 }}>
                                                    Gender
                                                </Typography>
                                                <Select
                                                    name="gender"
                                                    value={trvelInfo.gender}
                                                    onChange={handleInputChange}
                                                    displayEmpty
                                                    size="small"
                                                >
                                                    <MenuItem value="">Select Gender</MenuItem>
                                                    <MenuItem value="Male">Male</MenuItem>
                                                    <MenuItem value="Female">Female</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#36577b", mb: 0.7 }}>
                                                First Name
                                            </Typography>
                                            <TextField
                                                name="firstName"
                                                value={trvelInfo.firstName}
                                                onChange={handleInputChange}
                                                placeholder="Enter first name"
                                                size="small"
                                                fullWidth
                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#36577b", mb: 0.7 }}>
                                                Last Name
                                            </Typography>
                                            <TextField
                                                name="lastName"
                                                value={trvelInfo.lastName}
                                                onChange={handleInputChange}
                                                placeholder="Enter last name"
                                                size="small"
                                                fullWidth
                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <FormControl fullWidth>
                                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#36577b", mb: 0.7 }}>
                                                    Nationality
                                                </Typography>
                                                <Select
                                                    name="nationility"
                                                    value={trvelInfo.nationility || "BD"}
                                                    onChange={handleInputChange}
                                                    size="small"
                                                    MenuProps={{
                                                        PaperProps: {
                                                            sx: {
                                                                maxHeight: 260,
                                                            },
                                                        },
                                                    }}
                                                >
                                                    {countryName?.map((country, index) => (
                                                        <MenuItem key={`${country?.code || "country"}-${index}`} value={`${country?.code}`}>
                                                            {country.name} ({country.code})
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#36577b", mb: 0.7 }}>
                                                Date of Birth
                                            </Typography>
                                            <TextField
                                                name="dateOfBirth"
                                                type="date"
                                                value={trvelInfo.dateOfBirth}
                                                onChange={handleInputChange}
                                                size="small"
                                                fullWidth
                                                inputProps={{
                                                    min: minDate.format("YYYY-MM-DD"),
                                                    max: maxDate.format("YYYY-MM-DD"),
                                                }}
                                            />
                                            <Typography sx={{ mt: 0.6, fontSize: 11, color: "#7A8FA8" }}>
                                                Allowed range: {minDate.format("YYYY-MM-DD")} to {maxDate.format("YYYY-MM-DD")}
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#36577b", mb: 0.7 }}>
                                                Passport Number
                                            </Typography>
                                            <TextField
                                                name="passportNumber"
                                                value={trvelInfo.passportNumber}
                                                onChange={handleInputChange}
                                                placeholder="Enter passport number"
                                                size="small"
                                                fullWidth
                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#36577b", mb: 0.7 }}>
                                                Passport Expiry Date
                                            </Typography>
                                            <TextField
                                                name="passportExpireDate"
                                                type="date"
                                                value={trvelInfo.passportExpireDate}
                                                onChange={handleInputChange}
                                                size="small"
                                                fullWidth
                                                inputProps={{
                                                    min: moment().format("YYYY-MM-DD"),
                                                }}
                                            />
                                        </Grid>
                                    </Grid>

                                    <Box
                                        sx={{
                                            mt: 3,
                                            display: "flex",
                                            gap: 1,
                                            justifyContent: "flex-end",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            onClick={() => navigate("/myprofile/addtravler")}
                                            sx={{ textTransform: "none", borderRadius: "10px" }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disabled={isSubmitting}
                                            sx={{
                                                textTransform: "none",
                                                borderRadius: "10px",
                                                minWidth: 170,
                                                bgcolor: "var(--primary-button)",
                                                ":hover": { bgcolor: "var(--primary-button)" },
                                            }}
                                        >
                                            {isSubmitting ? "Saving..." : "Add This Traveler"}
                                        </Button>
                                    </Box>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default AddTraveler;
