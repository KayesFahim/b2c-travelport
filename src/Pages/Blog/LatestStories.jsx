import React, { useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Button,
} from "@mui/material";
import banner2 from "../../asstes/img/tour/tourDetails/banner2.png";
import banner1 from "../../asstes/img/tour/tourDetails/banner1.png";
import banner3 from "../../asstes/img/tour/tourDetails/banner3.png";
import banner4 from "../../asstes/img/tour/tourDetails/banner4.png";
import best1 from "../../asstes/img/tour/destinataino/best1.png";
import best2 from "../../asstes/img/tour/destinataino/best2.png";
import best3 from "../../asstes/img/tour/destinataino/best3.png";
import best4 from "../../asstes/img/tour/destinataino/best4.png";

// Sample data for cards
const cards = [
  {
    id: 1,
    title: "Most Instagram-Friendly Places in Nepal",
    description: "Discover the best spots with Everest views.",
    date: "Dec 12, 2023",
    readTime: "5 min read",
    image: banner2,
    img: best1,
  },
  {
    id: 2,
    title: "Visit Kuala Lumpur within just 5 days",
    description: "Explore the iconic skyline of Malaysia.",
    date: "Jan 10, 2024",
    readTime: "6 min read",
    image: banner1,
    img: best2,
  },
  {
    id: 3,
    title: "Exploring Singapore's Hidden Gems",
    description: "Beyond the Marina Bay Sands experience.",
    date: "Feb 15, 2024",
    readTime: "4 min read",
    image: banner3,
    img: best3,
  },
  {
    id: 4,
    title: "Sydney Opera House and its Secrets",
    description: "An in-depth look into Sydney's cultural landmark.",
    date: "Mar 22, 2024",
    readTime: "5 min read",
    image: banner4,
    img: best4,
  },
];

const LatestStories = () => {
  const [selectedCard, setSelectedCard] = useState(cards[0]);

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };
  return (
    <Box
      sx={{
        // padding: "40px",
        // backgroundColor: "#f8f8f8",
        minHeight: "100vh",
      }}
    >
      <Grid container sx={{
        mb:4
      }}>
        <Grid item xs={12} md={8}>
          <Box>
            <Typography textAlign="left" variant="h4" fontWeight="bold">
              Explore our latest stories
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              // alignSelf: "flex-end"
              display: "flex",
              justifyContent: "end",
            }}
          >
            <Button
              size="medium"
              sx={{
                borderRadius: "8px",
                border: "1px solid gray",
                textTransform: "capitalize",
                color: "black",
                py:.5,
                fontSize:"13px"
              }}
            >
              Read More Articles
            </Button>
          </Box>
        </Grid>
      </Grid>
      <Box sx={{ display: "flex", justifyContent: "space-around" }}>
        {/* Heading */}

        {/* Read More Button */}
      </Box>

      {/* Layout */}
      <Grid container spacing={4}>
        {/* Left Featured Card */}
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <CardMedia
              component="img"
              height="400"
              image={selectedCard.image}
              alt={selectedCard.title}
            />
            <CardContent
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                color: "#fff",
                background:
                  "linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))",
                padding: "20px",
              }}
            >
              <Typography variant="h5" fontWeight="bold">
                {selectedCard.title}
              </Typography>
              <Typography variant="body2" sx={{ marginTop: "8px" }}>
                {selectedCard.date} - {selectedCard.readTime}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Small Cards */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            {cards.map((card) => (
              <Grid
                item
                xs={12}
                key={card.id}
                //   sx={{
                //     bgcolor:"var(--card-bg)"
                //   }}
              >
                <Box
                  sx={{
                    display: "flex",
                    borderRadius: "12px",
                    overflow: "hidden",
                    cursor: "pointer",
                    boxShadow:
                      selectedCard.id === card.id
                        ? "0 0 10px rgba(0,0,0,0.2)"
                        : "none",
                    border:
                      selectedCard.id === card.id
                        ? "2px solid #1976d2"
                        : "none",
                    bgcolor: "var(--card-bg)",
                    p: 1,
                    gap: 2,
                  }}
                  onClick={() => handleCardClick(card)}
                >
                  <CardMedia
                    component="img"
                    sx={{ width: "100px" }}
                    image={card.img}
                    alt={card.title}
                  />
                  <Box sx={{ flex: "1" }}>
                    <Typography variant="body2" fontWeight="bold">
                      {card.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.date} - {card.readTime}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LatestStories;
