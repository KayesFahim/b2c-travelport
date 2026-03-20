import React from "react";
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Grid,
  Container,
  styled,
} from "@mui/material";
import best2 from "../../asstes/img/tour/destinataino/best7.png";
import best3 from "../../asstes/img/tour/destinataino/best6.png";

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  position: "relative",
  cursor: "pointer",
  transition: "transform 0.3s ease-in-out",
  "&:hover": {
    transform: "scale(1.02)",
  },
  height: "100%",
}));

const ImageOverlay = styled(Box)({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  background:
    "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
  height: "100%",
});

const OverlayContent = styled(CardContent)({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "20px",
});

const BlogRecentpost = () => {
  const posts = [
    {
      id: 1,
      image: best3,
      title: "বিশ্ব ইতিহাস এর ৫ টি নির্ণায়ক স্থান",
      aspectRatio: "calc(100% * 2/3)",
    },
    {
      id: 2,
      image: best2,
      title: "চীন এর সব থেকে সুন্দর শহর এর একটা অভিজ্ঞতা",
      aspectRatio: "calc(100% * 2/3)",
    },
  ];
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 3, 
          fontWeight: 500,
          color: 'text.primary' 
        }}
      >
        Recent post
      </Typography>
      
      <Grid container spacing={3}>
        {posts.map((post) => (
          <Grid item xs={12} md={6} key={post.id}>
            <Box
              sx={{
                position: 'relative',
                paddingTop: post.aspectRatio,
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: 1,
                // transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                '&:hover': {
                //   transform: 'scale(1.02)',
                  boxShadow: 3,
                }
              }}
            >
              <Box
                component="img"
                src={post.image}
                alt={post.title}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '100%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: 2,
                }}
              >
                <Typography
                  sx={{
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {post.title}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default BlogRecentpost;
